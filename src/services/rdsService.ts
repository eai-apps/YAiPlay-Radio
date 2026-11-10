/**
 * Честный RDS: «что сейчас играет».
 *
 * Название песни показывается ТОЛЬКО если его реально передаёт станция:
 *  1. официальные API станций (SomaFM, laut.fm, Radio Record);
 *  2. страница статуса Icecast на сервере потока (status-json.xsl);
 *  3. метаданные внутри самого потока (ICY StreamTitle) — через наш маленький
 *     прокси на Cloudflare Workers (см. папку worker/), если он настроен.
 * Если ничего не найдено — возвращаем null, и интерфейс пишет «Прямой эфир».
 * Никаких выдуманных/случайных песен.
 */

import { Station } from '../types/radio';
import { METADATA_PROXY_URL } from '../config';
import { getApiBase } from './apiService';

/**
 * Clean up raw stream metadata / icy title:
 * Removes advertising, stream URLs, audio format tags, etc.
 */
export function cleanTrackTitle(raw: string, stationName?: string): string | null {
  if (!raw || typeof raw !== 'string') return null;

  let cleaned = raw
    .replace(/\s*[-–—]\s*(19|20)\d{2}\s*$/, '')
    .replace(/^[\s\-_:=]+|[\s\-_:=]+$/g, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\b(www\.\S+|listen live|stream online|radio station|bitrate:\s*\d+)\b/gi, '')
    .trim();

  // If identical to station name or too short, not a real song title
  if (cleaned.length < 3) return null;
  if (stationName && cleaned.toLowerCase() === stationName.toLowerCase()) return null;

  return cleaned;
}

const JUNK_PLACEHOLDERS = [
  'unknown',
  'stream',
  'live',
  'YAi',
  'radio',
  'non-stop',
  'various',
  'online',
  'track',
  'title',
  'broadcast',
  'air',
  'efir',
  'audio',
  'default',
  'station',
  '101.ru',
  'record',
  'sound',
  'mix',
  'fm',
  'mp3',
  'aac',
  'unnamed',
];

export interface ValidatedSong {
  artist: string;
  title: string;
  rawTitle: string;
}

/**
 * Strict song validator:
 * Confirms whether the metadata contains a legitimate Artist and Track Title.
 * Excludes station names, single words, junk placeholders, and URLs.
 */
export function parseAndValidateTrack(
  rawTrack: string,
  stationName?: string
): ValidatedSong | null {
  if (!rawTrack || typeof rawTrack !== 'string') return null;

  const cleaned = cleanTrackTitle(rawTrack, stationName);
  if (!cleaned) return null;

  // Delimiters between Artist and Song
  const delimiters = [' — ', ' - ', ' – ', ' // ', ' / '];
  let artist = '';
  let title = '';

  for (const d of delimiters) {
    if (cleaned.includes(d)) {
      const parts = cleaned.split(d);
      if (parts.length >= 2) {
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
        break;
      }
    }
  }

  if (!artist || !title) return null;

  // Clean leading numbers/track indexes (e.g. "01. Artist", "01 - Artist")
  artist = artist.replace(/^[0-9\s._\-:]+/, '').trim();
  title = title.replace(/\b(128|192|256|320)\s*k(bps)?\b/gi, '').trim();

  const normStation = (stationName || '').toLowerCase().trim();
  const normArtist = artist.toLowerCase().trim();
  const normTitle = title.toLowerCase().trim();

  // Rule 1: Neither artist nor title can match or be dominated by station name
  if (normStation) {
    if (normArtist === normStation || normTitle === normStation) return null;
    if (normStation.length >= 4 && (normArtist.includes(normStation) || normTitle.includes(normStation))) {
      return null;
    }
  }

  // Rule 2: Minimum character lengths
  if (artist.length < 2 || title.length < 2) return null;

  // Rule 3: Reject junk words and placeholders
  for (const junk of JUNK_PLACEHOLDERS) {
    if (normArtist === junk || normTitle === junk) return null;
  }

  // Rule 4: Reject web addresses
  if (
    normArtist.includes('http') ||
    normTitle.includes('http') ||
    normArtist.includes('.com') ||
    normTitle.includes('.com') ||
    normArtist.includes('.ru') ||
    normTitle.includes('.ru')
  ) {
    return null;
  }

  return {
    artist,
    title,
    rawTitle: `${artist} — ${title}`,
  };
}

type Fetcher = (station: Station, streamUrl: string) => Promise<string | null>;

async function getJson(url: string, timeout = 3500): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

const join = (artist?: string, title?: string) =>
  artist && title ? `${String(artist).trim()} — ${String(title).trim()}` : null;

/** SomaFM: https://ice1.somafm.com/groovesalad-128-mp3 → канал groovesalad */
const somaFm: Fetcher = async (_s, url) => {
  if (!/somafm\.com/i.test(url)) return null;
  const m = url.match(/somafm\.com\/([a-z0-9]+?)(?:-\d+)?(?:-(?:mp3|aac|aacp))?(?:[/?.]|$)/i);
  if (!m) return null;
  const json = await getJson(`https://somafm.com/songs/${m[1]}.json`);
  const cur = json?.songs?.[0];
  return join(cur?.artist, cur?.title);
};

/** laut.fm: https://stream.laut.fm/<station> */
const lautFm: Fetcher = async (_s, url) => {
  const m = url.match(/laut\.fm\/([a-z0-9_-]+)/i);
  if (!m) return null;
  const json = await getJson(`https://api.laut.fm/station/${m[1].toLowerCase()}/current_song`);
  const artist = json?.artist?.name;
  return join(artist, json?.title);
};

/** Radio Record: сопоставляем поток со станцией по её «prefix» */
let recordStations: Promise<Array<{ id: number; prefix: string }>> | null = null;
const radioRecord: Fetcher = async (_s, url) => {
  if (!/radiorecord|hostingradio\.ru/i.test(url)) return null;
  if (!recordStations) {
    recordStations = getJson('https://www.radiorecord.ru/api/stations/')
      .then((j) => (j?.result?.stations || []).map((x: any) => ({ id: x.id, prefix: String(x.prefix || '') })))
      .catch(() => []);
  }
  const list = await recordStations;
  const st = list.find((x) => x.prefix && new RegExp(`/${x.prefix}\\d*\\.`, 'i').test(url));
  if (!st) return null;
  const now = await getJson('https://www.radiorecord.ru/api/stations/now/');
  const item = (now?.result || []).find((x: any) => x.id === st.id);
  return join(item?.track?.artist, item?.track?.song);
};

/** Icecast: /status-json.xsl на сервере потока (у многих серверов открыт для браузера) */
const failedIcecastHosts = new Set<string>();
const icecastStatus: Fetcher = async (station, url) => {
  const u = new URL(url);
  if (failedIcecastHosts.has(u.host)) return null;
  try {
    const json = await getJson(`${u.protocol}//${u.host}/status-json.xsl`, 3000);
    const src = json?.icestats?.source;
    const list: any[] = Array.isArray(src) ? src : src ? [src] : [];
    // Берём именно наш mountpoint, если на сервере несколько потоков
    const mine = list.find((x) => x?.listenurl && new URL(x.listenurl).pathname === u.pathname) || (list.length === 1 ? list[0] : null);
    if (!mine) return null;
    const raw = mine.artist && mine.title ? `${mine.artist} - ${mine.title}` : mine.title || mine.yp_currently_playing || '';
    return cleanTrackTitle(raw, station.name);
  } catch (e) {
    failedIcecastHosts.add(u.host);
    throw e;
  }
};

/** ICY-метаданные потока через прокси на Cloudflare Workers (если настроен) */
// Станции без названий в потоке запоминаем, чтобы не тратить лимит сервера (100 000 запросов/сутки)
const icyMisses = new Map<string, number>();
const icyProxy: Fetcher = async (station, url) => {
  if ((icyMisses.get(url) || 0) >= 2) return null;
  if (typeof document !== 'undefined' && document.hidden) return null;
  const base = getApiBase() ? `${getApiBase()}/meta` : METADATA_PROXY_URL;
  if (!base) return null;
  const json = await getJson(`${base}?url=${encodeURIComponent(url)}`, 6000);
  const title = cleanTrackTitle(json?.title || '', station.name);
  icyMisses.set(url, title ? 0 : (icyMisses.get(url) || 0) + 1);
  return title;
};

const FETCHERS: Fetcher[] = [somaFm, lautFm, radioRecord, icecastStatus, icyProxy];

/**
 * Реальное название текущего трека или null, если станция его не передаёт.
 */
export async function fetchLiveTrackTitle(station: Station): Promise<string | null> {
  if (!station) return null;
  const streamUrl = station.url_resolved || station.url;
  if (!streamUrl || !/^https?:/i.test(streamUrl)) return null;

  for (const f of FETCHERS) {
    try {
      const title = await f(station, streamUrl);
      if (title && parseAndValidateTrack(title, station.name)) return title;
    } catch {
      // источник недоступен — пробуем следующий
    }
  }
  return null;
}

/** Подпись, когда станция не передаёт название песни: «Прямой эфир • Рок • Германия • 128 kbps» */
export function liveFallbackLabel(station: Station | null | undefined): string {
  if (!station) return 'Прямой эфир';
  const genre = (station.tags || '').split(',').map((t) => t.trim()).filter(Boolean)[0];
  const parts = [
    'Прямой эфир',
    genre ? genre.charAt(0).toUpperCase() + genre.slice(1) : '',
    station.country || '',
    station.bitrate ? `${station.bitrate} kbps` : '',
  ].filter(Boolean);
  return parts.join(' • ');
}
