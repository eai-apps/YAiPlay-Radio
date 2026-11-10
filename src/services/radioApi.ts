import { isBlockedSource } from '../constants/streamPolicy';
import { Station } from '../types/radio';

const SERVERS = [
  'https://de1.api.radio-browser.info',
  'https://de2.api.radio-browser.info',
  'https://fi1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];

let currentServerIndex = Math.floor(Math.random() * SERVERS.length);

/**
 * На https-сайте (GitHub Pages) браузер блокирует http-потоки («смешанный контент»),
 * поэтому показываем только https-станции. В мобильном приложении (Capacitor) это ограничение снимается.
 */
export const HTTPS_ONLY =
  typeof window !== 'undefined' &&
  window.location.protocol === 'https:' &&
  !(window as any).Capacitor?.isNativePlatform?.();

/** Фильтр «18+»: такие станции не показываем (требование рейтинга в App Store / Google Play) */
const ADULT_RE = /(?<![\p{L}])(xxx|porn\p{L}*|sex|sexy|erotic\p{L}*|nsfw|hentai|эрот\p{L}*|порн\p{L}*|секс\p{L}*)(?![\p{L}])/iu;
export function isFamilySafe(st: Station): boolean {
  return !ADULT_RE.test(`${st.name} ${st.tags || ''}`);
}

/** Страны, скрытые владельцем в админке (для радио) */
let hiddenRadio = new Set<string>();
export function setHiddenRadioCountries(list: string[]) {
  hiddenRadio = new Set(list.map((c) => c.toUpperCase()));
}
export const isRadioCountryHidden = (cc?: string) => !!cc && hiddenRadio.has(cc.toUpperCase());

export function isPlayableHere(st: Station): boolean {
  const u = st.url_resolved || st.url || '';
  if (!u) return false;
  return HTTPS_ONLY ? u.startsWith('https://') : /^https?:\/\//.test(u);
}

// Curated high-reliability fallback stations in case network/CORS issues occur
export const FALLBACK_STATIONS: Station[] = [
  {
    stationuuid: 'fallback-dance-wave',
    name: 'Dance Wave Online',
    url: 'https://dancewave.online/dance.mp3',
    url_resolved: 'https://dancewave.online/dance.mp3',
    homepage: 'https://dancewave.online',
    favicon: 'https://dancewave.online/favicon.ico',
    tags: 'dance,electronic,club,house',
    country: 'Hungary',
    countrycode: 'HU',
    codec: 'MP3',
    bitrate: 192,
    clickcount: 78210,
    votes: 2190,
  },
  {
    stationuuid: 'fallback-radio-paradise',
    name: 'Radio Paradise (Main Mix)',
    url: 'https://stream.radioparadise.com/mp3-192',
    url_resolved: 'https://stream.radioparadise.com/mp3-192',
    homepage: 'https://radioparadise.com',
    favicon: 'https://radioparadise.com/favicon-32x32.png',
    tags: 'rock,eclectic,pop,alternative',
    country: 'United States',
    countrycode: 'US',
    codec: 'MP3',
    bitrate: 192,
    clickcount: 89430,
    votes: 4120,
  },
  {
    stationuuid: 'fallback-swiss-jazz',
    name: 'Radio Swiss Jazz',
    url: 'https://stream.srg-ssr.ch/m/rsj/mp3_128',
    url_resolved: 'https://stream.srg-ssr.ch/m/rsj/mp3_128',
    homepage: 'https://www.radioswissjazz.ch',
    favicon: '',
    tags: 'jazz,swing,blues,bebop',
    country: 'Switzerland',
    countrycode: 'CH',
    codec: 'MP3',
    bitrate: 128,
    clickcount: 53200,
    votes: 1840,
  },
  {
    stationuuid: 'fallback-swiss-classic',
    name: 'Radio Swiss Classic',
    url: 'https://stream.srg-ssr.ch/m/rsc_de/mp3_128',
    url_resolved: 'https://stream.srg-ssr.ch/m/rsc_de/mp3_128',
    homepage: 'https://www.radioswissclassic.ch',
    favicon: '',
    tags: 'classical,symphony,piano,opera',
    country: 'Switzerland',
    countrycode: 'CH',
    codec: 'MP3',
    bitrate: 128,
    clickcount: 48900,
    votes: 1620,
  },
  {
    stationuuid: 'fallback-nightwave-plaza',
    name: 'Nightwave Plaza - Synthwave & Vaporwave',
    url: 'https://radio.plaza.one/mp3',
    url_resolved: 'https://radio.plaza.one/mp3',
    homepage: 'https://plaza.one',
    favicon: 'https://plaza.one/favicon.ico',
    tags: 'synthwave,vaporwave,retro,80s,chill',
    country: 'United States',
    countrycode: 'US',
    codec: 'MP3',
    bitrate: 128,
    clickcount: 67120,
    votes: 2980,
  },
  {
    stationuuid: 'fallback-fip',
    name: 'FIP (Radio France)',
    url: 'https://icecast.radiofrance.fr/fip-hifi.aac',
    url_resolved: 'https://icecast.radiofrance.fr/fip-hifi.aac',
    homepage: 'https://www.radiofrance.fr/fip',
    favicon: 'https://www.radiofrance.fr/favicon.ico',
    tags: 'eclectic,jazz,world,electronic',
    country: 'France',
    countrycode: 'FR',
    codec: 'AAC',
    bitrate: 192,
    clickcount: 50000,
    votes: 2000,
  },
];

async function requestWithFailover(path: string): Promise<Response> {
  const attempts = SERVERS.length;
  let lastError: Error | null = null;

  for (let i = 0; i < attempts; i++) {
    const server = SERVERS[(currentServerIndex + i) % SERVERS.length];
    const fullUrl = `${server}${path}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(fullUrl, { signal: controller.signal });

      clearTimeout(timeoutId);

      if (response.ok) {
        currentServerIndex = (currentServerIndex + i) % SERVERS.length;
        return response;
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // continue to next server in pool
    }
  }

  throw lastError || new Error('All Radio Browser mirrors failed to respond');
}

export interface FetchOptions {
  tag?: string;
  name?: string;
  countrycode?: string;
  /** регион/штат (для глобуса) */
  state?: string;
  limit?: number;
  /** clickcount (по умолчанию), clicktrend — «в тренде», random — случайные */
  order?: 'clickcount' | 'clicktrend' | 'random' | 'votes';
}

import { isStationQuarantined } from './quarantineService';
import { isGloballyDead } from './streamCheck';

/**
 * Normalizes station name to catch duplicate streams like:
 * "DFM 101.2 FM", "DFM [128k]", "DFM Club", "dfm online"
 */
export function normalizeStationName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[\[\(].*?[\]\)]/g, '') // strip brackets e.g. [128k], (320kbps)
    .replace(/\b(fm|am|online|radio|stream|live|hd|hq|aac|mp3|\d+\.?\d*\s*fm)\b/gi, '')
    .replace(/[^a-zа-я0-9]/gi, '')
    .trim();
}

/**
 * Deduplicate stations:
 * Keeps only one stream with the highest bitrate, filters out broken/quarantined ones.
 */
export function deduplicateStations(stations: Station[]): Station[] {
  if (!Array.isArray(stations)) return [];
  const map = new Map<string, Station>();

  for (const st of stations) {
    if (!st || !st.stationuuid) continue;
    if (!st.isCustom && !isPlayableHere(st)) continue;
    if (!st.isCustom && !isFamilySafe(st)) continue;
    if (isBlockedSource(st)) continue; // станция запретила сторонние приложения
    if (!st.isCustom && isRadioCountryHidden(st.countrycode)) continue;
    if (isStationQuarantined(st.stationuuid)) continue;
    if (isGloballyDead(st.stationuuid)) continue;

    // Normalizing stream host and path
    let streamKey = '';
    try {
      const u = new URL(st.url_resolved || st.url || '');
      streamKey = `${u.hostname}${u.pathname}`.toLowerCase();
    } catch {
      streamKey = (st.url_resolved || st.url || '').toLowerCase();
    }

    const normName = normalizeStationName(st.name);
    // Combine normalized name + country code
    const key = normName.length >= 3 ? `${st.countrycode || ''}_${normName}` : `stream_${streamKey}`;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, st);
    } else {
      // Keep stream with higher bitrate or higher clickcount
      const currBitrate = st.bitrate || 0;
      const existBitrate = existing.bitrate || 0;
      if (currBitrate > existBitrate) {
        map.set(key, st);
      } else if (currBitrate === existBitrate && (st.clickcount || 0) > (existing.clickcount || 0)) {
        map.set(key, st);
      }
    }
  }

  return Array.from(map.values());
}

export async function fetchStations(options: FetchOptions = {}): Promise<Station[]> {
  const { tag, name, countrycode, state, limit = 120, order = 'clickcount' } = options;
  const query = new URLSearchParams({
    hidebroken: 'true',
    order,
    reverse: 'true',
    // Берём с запасом: часть отсеется как дубли/http
    limit: String(Math.min(Math.round(limit * 1.6), 400)),
  });
  if (HTTPS_ONLY) query.set('is_https', 'true');
  if (countrycode && countrycode.trim()) query.set('countrycode', countrycode.trim().toUpperCase());
  if (tag && tag.trim()) query.set('tag', tag.trim().toLowerCase());
  if (name && name.trim()) query.set('name', name.trim());
  if (state && state.trim()) {
    query.set('state', state.trim());
    query.set('stateExact', 'true');
  }
  const path = `/json/stations/search?${query.toString()}`;

  try {
    const res = await requestWithFailover(path);
    const data: Station[] = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return deduplicateStations(data).slice(0, limit);
    }
    return [];
  } catch (error) {
    console.warn('Radio Browser API fetch failed, using fallback list:', error);
    // Filter fallback stations locally to match query
    let filtered = [...FALLBACK_STATIONS];
    if (tag) {
      filtered = filtered.filter(s => s.tags?.toLowerCase().includes(tag.toLowerCase()));
      if (filtered.length === 0) filtered = FALLBACK_STATIONS;
    }
    if (name) {
      filtered = filtered.filter(s => s.name.toLowerCase().includes(name.toLowerCase()));
    }
    if (countrycode) {
      filtered = filtered.filter(s => s.countrycode?.toUpperCase() === countrycode.toUpperCase());
    }
    return deduplicateStations(filtered);
  }
}

export async function fetchStationsByMultipleTags(tags: string[], limitPerTag = 20, countrycode?: string): Promise<Station[]> {
  try {
    const promises = tags.slice(0, 3).map(tag => fetchStations({ tag, countrycode, limit: limitPerTag }));
    const results = await Promise.allSettled(promises);
    const combined: Station[] = [];
    const seenUuids = new Set<string>();

    for (const res of results) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        for (const st of res.value) {
          if (!seenUuids.has(st.stationuuid)) {
            seenUuids.add(st.stationuuid);
            combined.push(st);
          }
        }
      }
    }

    if (combined.length > 0) {
      // Sort by votes/clickcount
      return combined.sort((a, b) => (b.clickcount || b.votes || 0) - (a.clickcount || a.votes || 0));
    }
  } catch (err) {
    console.warn('Failed to fetch multiple tags:', err);
  }

  // Fallback to first tag
  return fetchStations({ tag: tags[0] || 'ambient', countrycode, limit: 40 });
}

export async function registerStationClick(stationuuid: string): Promise<void> {
  if (!stationuuid || stationuuid.startsWith('fallback-')) return;
  try {
    const server = SERVERS[currentServerIndex];
    await fetch(`${server}/json/url/${stationuuid}`, {
      method: 'GET',
      mode: 'no-cors',
    });
  } catch {
    // non-blocking
  }
}


/** Станции по списку идентификаторов (для переноса избранного по ссылке / QR-коду). */
export async function fetchStationsByUuids(uuids: string[]): Promise<Station[]> {
  const clean = uuids.filter((u) => /^[0-9a-f-]{36}$/i.test(u)).slice(0, 200);
  if (!clean.length) return [];
  const res = await requestWithFailover(`/json/stations/byuuid?uuids=${clean.join(',')}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** Общая статистика каталога (кол-во станций и т.д.) */
export async function fetchCatalogStats(): Promise<{ stations?: number } | null> {
  try {
    const res = await requestWithFailover('/json/stats');
    return await res.json();
  } catch {
    return null;
  }
}

/** Страна пользователя по языку браузера (ru-RU → RU, de-DE → DE) */
export function guessUserCountry(): string {
  try {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const l of langs) {
      const m = /[-_]([A-Za-z]{2})$/.exec(l || '');
      if (m) return m[1].toUpperCase();
    }
    const base = (langs[0] || '').slice(0, 2).toLowerCase();
    return ({ ru: 'RU', uk: 'UA', de: 'DE', be: 'BY', kk: 'KZ', fr: 'FR', it: 'IT', es: 'ES', pl: 'PL', tr: 'TR', en: 'US' } as Record<string, string>)[base] || '';
  } catch {
    return '';
  }
}

/** Станции жанра: основной тег + синонимы (в т.ч. русские подписи) + станции без жанра, у которых жанр в названии */
export async function fetchGenreStations(
  genre: { tag: string; tags?: string[] },
  opts: { countrycode?: string; name?: string; limit?: number } = {}
): Promise<Station[]> {
  const limit = opts.limit || 80;
  const tags = [genre.tag, ...(genre.tags || [])].filter(Boolean).slice(0, 7);
  const byTag = tags.map((t, i) =>
    fetchStations({ tag: t, countrycode: opts.countrycode, name: opts.name, limit: i === 0 ? limit : Math.ceil(limit / 2) })
  );
  // Жанр в названии («Rock FM», «Радио Шансон») — только если ищем без своего текста
  const nameWords = opts.name ? [] : tags.filter((t) => t.length >= 4 && !/\d/.test(t)).slice(0, 3);
  const byName = nameWords.map((w) =>
    fetchStations({ name: w, countrycode: opts.countrycode, limit: 40 }).then((list) =>
      list.filter((st) => new RegExp(`(^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'iu').test(st.name))
    )
  );
  const lists = await Promise.allSettled([...byTag, ...byName]);
  const all = lists.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  const lower = tags.map((t) => t.toLowerCase());
  return deduplicateStations(all)
    .map((st) => {
      // Подходящий жанр показываем первым в подписи станции
      const list = (st.tags || '').split(',').map((x) => x.trim()).filter(Boolean);
      const hit = list.filter((x) => lower.some((t) => x.toLowerCase().includes(t)));
      const tagsOut = hit.length ? [...hit, ...list.filter((x) => !hit.includes(x))] : [genre.tag, ...list];
      return { ...st, tags: tagsOut.join(',') };
    })
    .sort((a, b) => (b.clickcount || 0) - (a.clickcount || 0))
    .slice(0, opts.countrycode ? limit * 2 : limit);
}
