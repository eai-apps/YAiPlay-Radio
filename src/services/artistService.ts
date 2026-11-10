/**
 * Поиск станций конкретного исполнителя / подборок саундтреков.
 *
 * Правило: для исполнителя показываем ТОЛЬКО станции, в названии которых есть имя
 * исполнителя целым словом (например «Rammstein Radio», «Кино FM»). Никаких
 * подстановок случайных станций по общему тегу «rock». Если подходящих нет — честно
 * возвращаем пустой список.
 */
import { Station } from '../types/radio';
import { ArtistItem } from '../constants/artists';
import { fetchStations, fetchStationsByMultipleTags, deduplicateStations } from './radioApi';
import { loadCatalog, isCatalogReady } from './catalogService';

import searchData from '../data/artist-search.json';

/** Варианты имён и теги подборок — общий файл с роботом автопроверки (src/data/artist-search.json) */
const NAME_VARIANTS: Record<string, string[]> = searchData.nameVariants;
const OST_TAGS: Record<string, string[]> = searchData.ostTags;
const SERIES: string[] = searchData.series;

function variantsFor(artist: ArtistItem): string[] {
  const explicit = NAME_VARIANTS[artist.id];
  if (explicit) return explicit;
  const base = artist.name.replace(/\s*\(.*?\)\s*/g, '').trim();
  return [base];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}/]+/gu, ' ')
    .trim();

/** Имя встречается в названии станции целым словом/фразой */
export function nameMatches(stationName: string, variant: string): boolean {
  const hay = ` ${norm(stationName)} `;
  const needle = ` ${norm(variant)} `;
  return hay.includes(needle);
}

const cache = new Map<string, Station[]>();

export async function findArtistStations(artist: ArtistItem): Promise<Station[]> {
  const cached = cache.get(artist.id);
  if (cached) return cached;

  // Проверенные роботом станции (обновляются каждый день)
  const catalog = await loadCatalog();
  if (isCatalogReady(catalog) && catalog.artists[artist.id]) {
    cache.set(artist.id, catalog.artists[artist.id]);
    return catalog.artists[artist.id];
  }

  let result: Station[] = [];

  if (artist.category === 'ost') {
    const tags = OST_TAGS[artist.tag] || [artist.tag];
    result = await fetchStationsByMultipleTags(tags, 30);
  } else {
    const variants = variantsFor(artist);
    const lists = await Promise.allSettled(variants.map((v) => fetchStations({ name: v, limit: 40 })));
    const seen = new Set<string>();
    for (const r of lists) {
      if (r.status !== 'fulfilled') continue;
      for (const st of r.value) {
        if (seen.has(st.stationuuid)) continue;
        if (variants.some((v) => nameMatches(st.name, v))) {
          seen.add(st.stationuuid);
          result.push(st);
        }
      }
    }
    // Второй источник — laut.fm (лицензированные в Германии пользовательские станции)
    try {
      for (const st of await searchLautFm(variants[0])) {
        if (!seen.has(st.stationuuid) && variants.some((v) => nameMatches(st.name, v) || nameMatches(st.tags || '', v))) {
          seen.add(st.stationuuid);
          result.push(st);
        }
      }
    } catch {}
    result.sort((a, b) => (b.clickcount || 0) - (a.clickcount || 0));
  }

  cache.set(artist.id, result);
  return result;
}

/** Поиск станций на laut.fm (открытый API, без ключа). Поток: https://stream.laut.fm/<name> */
export async function searchLautFm(query: string): Promise<Station[]> {
  const res = await fetch(`https://api.laut.fm/search/stations?query=${encodeURIComponent(query)}&limit=20`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return [];
  const json = await res.json();
  const items: any[] = (json?.results || []).flatMap((r: any) => r?.items || []);
  return items
    .map((it) => it?.station)
    .filter((st: any) => st?.name)
    .map(
      (st: any): Station => ({
        stationuuid: `lautfm-${st.name}`,
        name: st.display_name || st.name,
        url: `https://stream.laut.fm/${st.name}`,
        url_resolved: `https://stream.laut.fm/${st.name}`,
        homepage: st.page_url || `https://laut.fm/${st.name}`,
        favicon: st.images?.station_80x80 || st.images?.station || '',
        tags: [...(st.genres || []), st.description || ''].filter(Boolean).join(','),
        country: 'Germany',
        countrycode: 'DE',
        codec: 'MP3',
        bitrate: 128,
      })
    );
}

/**
 * Самообновляемый каталог «станций одного исполнителя»: в открытом каталоге есть целые
 * серии таких станций («Exclusively …», «101.ru …», «Radio Maximum – …», «Best of Rock FM – …»).
 * Новые станции появляются здесь автоматически, без правок кода.
 */
let seriesCache: Promise<Station[]> | null = null;

export function fetchArtistSeriesStations(): Promise<Station[]> {
  if (!seriesCache) {
    seriesCache = loadCatalog().then((c) => (isCatalogReady(c) && c.series.length ? c.series : liveSeries()));
  }
  return seriesCache;
}

function liveSeries(): Promise<Station[]> {
  {
    return Promise.allSettled(SERIES.map((n) => fetchStations({ name: n, limit: 400 })))
      .then((lists) => {
        const all = lists.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
        const onlySeries = all.filter((st) => SERIES.some((n) => norm(st.name).startsWith(norm(n))));
        // Одна станция на исполнителя (копии-ретрансляции отбрасываем, оставляем популярную)
        const byArtist = new Map<string, Station>();
        for (const st of deduplicateStations(onlySeries)) {
          const key = norm(artistLabel(st.name));
          const prev = byArtist.get(key);
          if (!prev || (st.clickcount || 0) > (prev.clickcount || 0)) byArtist.set(key, st);
        }
        return [...byArtist.values()].sort((a, b) => artistLabel(a.name).localeCompare(artistLabel(b.name)));
      })
      .catch(() => {
        seriesCache = null;
        return [];
      });
  }
}

/** «Exclusively - Metallica» → «Metallica» */
export function artistLabel(stationName: string): string {
  return stationName
    .replace(/^[^\p{L}\p{N}]*(exclusively|exclusive radio|101\.ru|radio maximum|best of rock\.?\s?fm)\s*[-–—:]?\s*/iu, '')
    .replace(/\((mp3|aac)[^)]*\)/gi, '')
    .trim() || stationName;
}
