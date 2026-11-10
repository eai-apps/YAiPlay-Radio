#!/usr/bin/env node
/**
 * YAiPlay Radio — ежедневная автопроверка каталога.
 *
 * Запускается роботом GitHub (см. .github/workflows/catalog.yml) раз в сутки
 * или вручную из админки. Результат — файл public/catalog.json, который читает сайт:
 *   • artists — рабочие станции каждого исполнителя / подборки саундтреков
 *     (артисты без рабочих станций на сайте скрываются);
 *   • series  — самообновляемый список станций «один исполнитель»;
 *   • tv      — открытые телеканалы с официальных источников, которые реально
 *     показываются во встроенном плеере сайта;
 *   • deadLinks — нерабочие ссылки (веб-камеры, свои станции из админки).
 *
 * Только открытые и бесплатные источники:
 *   Radio Browser (radio-browser.info), laut.fm, открытая база телеканалов iptv-org.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'catalog.json');
const UA = 'YAiPlayer-CatalogBot/1.0 (+https://github.com/eai-apps/YAiPlay-Radio)';
const RB = ['https://de1.api.radio-browser.info', 'https://de2.api.radio-browser.info', 'https://fi1.api.radio-browser.info', 'https://nl1.api.radio-browser.info'];
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const stats = {};
const data = JSON.parse(await fs.readFile(path.join(ROOT, 'src/data/artist-search.json'), 'utf8'));

// ---------- утилиты ----------
async function fetchWithTimeout(url, opts = {}, ms = 9000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal, headers: { 'User-Agent': UA, ...(opts.headers || {}) } });
  } finally {
    clearTimeout(t);
  }
}

async function getJson(url, ms = 30000) {
  const r = await fetchWithTimeout(url, {}, ms);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function rb(pathAndQuery) {
  let last;
  for (const s of RB) {
    try {
      return await getJson(s + pathAndQuery, 20000);
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        try {
          out[idx] = await fn(items[idx], idx);
        } catch {
          out[idx] = undefined;
        }
      }
    })
  );
  return out;
}

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}/]+/gu, ' ')
    .trim();
const ADULT_RE = /(?<![\p{L}])(xxx|porn\p{L}*|sex|sexy|erotic\p{L}*|nsfw|hentai|эрот\p{L}*|порн\p{L}*|секс\p{L}*)(?![\p{L}])/iu;
const familySafe = (s) => !ADULT_RE.test(`${s.name} ${s.tags || ''}`);
const nameMatches = (name, v) => ` ${norm(name)} `.includes(` ${norm(v)} `);

/** Поток жив: сервер отвечает и отдаёт аудио/плейлист */
async function audioAlive(url) {
  try {
    // Проверяем так же, как поток откроет наш сайт (с адресом сайта): станции, запрещающие чужие сайты, отсеются
    const r = await fetchWithTimeout(url, { headers: { 'Icy-MetaData': '0', Referer: 'https://eai-apps.github.io/', Origin: 'https://eai-apps.github.io' } }, 9000);
    const type = (r.headers.get('content-type') || '').toLowerCase();
    try {
      await r.body?.cancel();
    } catch {}
    return r.ok && /audio|mpeg|aac|ogg|octet|mpegurl|x-scpls|application\/pls/.test(type);
  } catch {
    return false;
  }
}

/** Видео-поток (HLS) жив И разрешён для показа на сайте (CORS) */
async function hlsPlayableInBrowser(url) {
  try {
    const r = await fetchWithTimeout(url, { headers: { Origin: 'https://eai-apps.github.io' } }, 9000);
    if (!r.ok) return false;
    const cors = r.headers.get('access-control-allow-origin');
    const text = (await r.text()).slice(0, 200);
    return text.startsWith('#EXTM3U') && (cors === '*' || cors === 'https://eai-apps.github.io');
  } catch {
    return false;
  }
}

async function linkAlive(url) {
  // «Мёртвой» считаем только страницу, которой точно нет (404/410).
  // Таймаут или блокировка по стране (многие сайты закрыты для зарубежных серверов) — не повод скрывать.
  try {
    const r = await fetchWithTimeout(url, { redirect: 'follow' }, 12000);
    try {
      await r.body?.cancel();
    } catch {}
    return !(r.status === 404 || r.status === 410);
  } catch {
    return true;
  }
}

const slim = (s) => ({
  stationuuid: s.stationuuid,
  name: String(s.name || '').trim(),
  url: s.url,
  url_resolved: s.url_resolved || s.url,
  homepage: s.homepage || '',
  favicon: (s.favicon || '').startsWith('https://') ? s.favicon : '',
  tags: s.tags || '',
  country: s.country || '',
  countrycode: s.countrycode || '',
  codec: s.codec || '',
  bitrate: s.bitrate || 0,
  clickcount: s.clickcount || 0,
});

// Станции, запретившие сторонние приложения, — не берём никуда (data/stream-policy.json)
const ALLOWED_BACK = new Set((JSON.parse(await fs.readFile(path.join(ROOT, 'public', 'content.json'), 'utf8').catch(() => '{}')).allowedStreamHosts || []).map((h) => String(h).toLowerCase()));
const BLOCKED_HOSTS = (JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'stream-policy.json'), 'utf8').catch(() => '{}')).blockedHosts || [])
  .map((h) => h.host.toLowerCase())
  .filter((h) => !ALLOWED_BACK.has(h)); // владелец вернул в админке
const blockedSource = (s) =>
  [s.url, s.url_resolved, s.homepage].some((u) => {
    try {
      const h = new URL(u).hostname.toLowerCase();
      return BLOCKED_HOSTS.some((b) => h === b || h.endsWith('.' + b));
    } catch {
      return false;
    }
  });

async function searchRB(params) {
  const q = new URLSearchParams({ hidebroken: 'true', is_https: 'true', order: 'clickcount', reverse: 'true', limit: '100', ...params });
  const list = await rb(`/json/stations/search?${q}`);
  return (Array.isArray(list) ? list : []).filter((s) => (s.url_resolved || s.url || '').startsWith('https://') && familySafe(s) && !blockedSource(s));
}

async function searchLaut(query) {
  try {
    const j = await getJson(`https://api.laut.fm/search/stations?query=${encodeURIComponent(query)}&limit=20`);
    return (j.results || [])
      .flatMap((r) => r.items || [])
      .map((it) => it.station)
      .filter((st) => st?.name)
      .map((st) => ({
        stationuuid: `lautfm-${st.name}`,
        name: st.display_name || st.name,
        url: `https://stream.laut.fm/${st.name}`,
        url_resolved: `https://stream.laut.fm/${st.name}`,
        homepage: st.page_url || `https://laut.fm/${st.name}`,
        favicon: st.images?.station_80x80 || '',
        tags: [...(st.genres || []), st.description || ''].filter(Boolean).join(','),
        country: 'Germany',
        countrycode: 'DE',
        codec: 'MP3',
        bitrate: 128,
        clickcount: 0,
      }));
  } catch {
    return [];
  }
}

function dedupeByUrl(list) {
  const seen = new Set();
  return list.filter((s) => {
    const k = (s.url_resolved || s.url).replace(/[?#].*$/, '').toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ---------- 1. Исполнители и саундтреки ----------
async function buildArtists() {
  const result = {};
  for (const a of data.artists) {
    let candidates = [];
    if (a.category === 'ost') {
      const tags = data.ostTags[a.tag] || [a.tag];
      for (const t of tags) candidates.push(...(await searchRB({ tag: t, limit: '40' }).catch(() => [])));
    } else {
      const variants = data.nameVariants[a.id] || [a.name.replace(/\s*\(.*?\)\s*/g, '').trim()];
      for (const v of variants) {
        const found = await searchRB({ name: v, limit: '60' }).catch(() => []);
        candidates.push(...found.filter((s) => variants.some((x) => nameMatches(s.name, x))));
      }
      const laut = await searchLaut(variants[0]);
      candidates.push(...laut.filter((s) => variants.some((x) => nameMatches(s.name, x) || nameMatches(s.tags, x))));
    }
    candidates = dedupeByUrl(candidates.map(slim)).sort((x, y) => y.clickcount - x.clickcount).slice(0, 15);
    const alive = await pool(candidates, 8, (s) => audioAlive(s.url_resolved));
    result[a.id] = candidates.filter((_, i) => alive[i]);
    log(`артист ${a.name}: ${result[a.id].length}/${candidates.length}`);
  }
  return result;
}

// ---------- 2. Серии «один исполнитель» ----------
function artistLabel(name) {
  return (
    String(name)
      .replace(/^[^\p{L}\p{N}]*(exclusively|exclusive radio|101\.ru|radio maximum|best of rock\.?\s?fm)\s*[-–—:]?\s*/iu, '')
      .replace(/\((mp3|aac)[^)]*\)/gi, '')
      .trim() || name
  );
}

async function buildSeries() {
  const all = [];
  for (const n of data.series) {
    const found = await searchRB({ name: n, limit: '500' }).catch(() => []);
    all.push(...found.filter((s) => norm(s.name).startsWith(norm(n))));
  }
  const byArtist = new Map();
  for (const s of all.map(slim)) {
    const k = norm(artistLabel(s.name));
    if (!k) continue;
    const prev = byArtist.get(k);
    if (!prev || s.clickcount > prev.clickcount) byArtist.set(k, s);
  }
  const list = [...byArtist.values()];
  stats.seriesChecked = list.length;
  const alive = await pool(list, 25, (s) => audioAlive(s.url_resolved));
  const ok = list.filter((_, i) => alive[i]).sort((a, b) => artistLabel(a.name).localeCompare(artistLabel(b.name)));
  log(`серии: ${ok.length}/${list.length} рабочих`);
  return ok;
}

// ---------- 3. Телеканалы ----------
// Только тематики, которые обычно вещаются открыто и легально (без фильмов/спорта по подписке)
const TV_CATEGORIES = new Set(['news', 'music', 'documentary', 'science', 'weather', 'travel', 'outdoor', 'education', 'culture', 'kids', 'business', 'religious', 'lifestyle', 'cooking']);
// Крупные CDN, через которые вещают сами телеканалы
const OFFICIAL_CDN = ['akamaized.net', 'akamaihd.net', 'akamai.net', 'edgesuite.net', 'edgekey.net', 'cloudfront.net', 'llnwi.net', 'llnwd.net', 'fastly.net', 'b-cdn.net', 'cdn77.org', 'cdnvideo.ru', 'ngenix.net', 'amagi.tv', 'wurl.tv', 'wurl.com', 'pluto.tv', 'tubi.video', 'brightcove.net', 'jwplayer.com', 'dailymotion.com', 'vimeocdn.com', 'cdn.jwplayer.com', 'ottera.tv', 'samsungtvplus.com'];

function regDomain(host) {
  const p = host.toLowerCase().split('.');
  if (p.length >= 3 && /^(co|com|org|net|gov|ac|edu)$/.test(p[p.length - 2]) && p[p.length - 1].length === 2) return p.slice(-3).join('.');
  return p.slice(-2).join('.');
}

function looksOfficial(streamUrl, website) {
  try {
    const s = new URL(streamUrl);
    if (s.protocol !== 'https:' || (s.port && s.port !== '443')) return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(s.hostname)) return false;
    if (OFFICIAL_CDN.some((c) => s.hostname === c || s.hostname.endsWith('.' + c))) return true;
    if (website) {
      const w = new URL(website);
      return regDomain(w.hostname) === regDomain(s.hostname);
    }
  } catch {}
  return false;
}


// ---------- 3b. Free-TV/IPTV: курируемый список только бесплатных официальных каналов ----------
const ISO_CODES = 'AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FO FR GA GB GD GE GH GL GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NZ OM PA PE PG PH PK PL PR PS PT PY QA RO RS RU RW SA SC SD SE SG SI SK SL SM SN SO SR SS SV SY SZ TD TG TH TJ TL TM TN TR TT TW TZ UA UG US UY UZ VA VE VN XK YE ZA ZM ZW'.split(' ');
const EN_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });
const COUNTRY_BY_NAME = new Map(ISO_CODES.map((c) => [EN_NAMES.of(c).toLowerCase(), c]));
COUNTRY_BY_NAME.set('usa', 'US').set('uk', 'GB').set('united states of america', 'US').set('south korea', 'KR').set('russia', 'RU');

async function freeTvCandidates() {
  const r = await fetchWithTimeout('https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8', {}, 30000);
  if (!r.ok) throw new Error('Free-TV ' + r.status);
  const lines = (await r.text()).split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.startsWith('#EXTINF')) continue;
    const url = (lines[i + 1] || '').trim();
    if (!url.startsWith('https://') || !/\.m3u8(\?|$)/i.test(url)) continue;
    const attr = (k) => (l.match(new RegExp(k + '="([^"]*)"')) || [])[1] || '';
    const name = l.split(',').pop().trim().replace(/\s*[Ⓖ Ⓨ Ⓢ]+\s*$/u, '').trim();
    if (/Ⓖ|Ⓨ/u.test(l)) continue; // Ⓖ — гео-блок, Ⓨ — только YouTube
    const group = attr('group-title').toLowerCase();
    const tvgId = attr('tvg-id');
    const cc = COUNTRY_BY_NAME.get(group) || (tvgId.match(/\.([a-z]{2})(@|$)/i)?.[1] || '').toUpperCase();
    out.push({
      id: 'freetv-' + (tvgId || name).replace(/[^\w.-]+/g, '_'),
      name,
      country: cc,
      categories: ['general'],
      website: '',
      logo: attr('tvg-logo').startsWith('https://') ? attr('tvg-logo') : '',
      stream: url,
      quality: '',
    });
  }
  return out;
}

async function buildTv() {
  const base = 'https://iptv-org.github.io/api';
  const [channels, streams, logos, blocklist] = await Promise.all(['channels', 'streams', 'logos', 'blocklist'].map((n) => getJson(`${base}/${n}.json`, 60000)));
  const blocked = new Set(blocklist.map((b) => b.channel));
  const chMap = new Map(channels.map((c) => [c.id, c]));
  const logoMap = new Map();
  for (const l of logos) if (l.url?.startsWith('https://') && !logoMap.has(l.channel)) logoMap.set(l.channel, l.url);

  const bestStream = new Map();
  for (const s of streams) {
    const ch = chMap.get(s.channel);
    if (!ch || blocked.has(ch.id) || ch.is_nsfw || ch.closed || ch.replaced_by) continue;
    if (!ch.categories?.some((c) => TV_CATEGORIES.has(c))) continue;
    if (s.referrer || s.user_agent) continue; // требует подмены заголовков — не для нас
    if ((s.labels || []).some((l) => /geo|not 24/i.test(l))) continue;
    if (!s.url?.startsWith('https://') || !/\.m3u8(\?|$)/i.test(s.url)) continue;
    if (!looksOfficial(s.url, ch.website)) continue;
    const q = parseInt(s.quality || '0', 10) || 0;
    const prev = bestStream.get(ch.id);
    if (!prev || q > prev.q) bestStream.set(ch.id, { url: s.url, quality: s.quality || '', q });
  }

  const cand = [...bestStream.entries()].map(([id, st]) => {
    const ch = chMap.get(id);
    return {
      id,
      name: ch.name,
      country: ch.country || '',
      categories: ch.categories || [],
      website: ch.website || '',
      logo: logoMap.get(id) || '',
      stream: st.url,
      quality: st.quality,
    };
  });
  // Второй источник — Free-TV (если недоступен, просто пропускаем)
  try {
    const seen = new Set(cand.map((c) => c.stream));
    const seenName = new Set(cand.map((c) => `${c.country}|${c.name.toLowerCase()}`));
    const extra = (await freeTvCandidates()).filter((c) => !seen.has(c.stream) && !seenName.has(`${c.country}|${c.name.toLowerCase()}`));
    stats.tvFreeTv = extra.length;
    cand.push(...extra);
  } catch (e) {
    log('Free-TV пропущен:', e.message);
  }
  stats.tvCandidates = cand.length;
  log(`ТВ: кандидатов ${cand.length}, проверяем…`);
  const ok = await pool(cand, 30, (c) => hlsPlayableInBrowser(c.stream));
  const tv = cand.filter((_, i) => ok[i]).sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name));
  log(`ТВ: работают на сайте ${tv.length}`);
  return tv;
}

// ---------- 4. Ссылки веб-камер и свои станции ----------
async function buildDeadLinks() {
  const src = await fs.readFile(path.join(ROOT, 'src/constants/webcams.ts'), 'utf8');
  const urls = [...new Set([...src.matchAll(/directPortalUrl:\s*'([^']+)'/g)].map((m) => m[1]))];
  let custom = [];
  try {
    const content = JSON.parse(await fs.readFile(path.join(ROOT, 'public/content.json'), 'utf8'));
    custom = (content.customStations || []).map((s) => s.url_resolved || s.url).filter(Boolean);
    for (const c of content.customWebcams || []) if (c.directPortalUrl) urls.push(c.directPortalUrl);
  } catch {}
  const linkOk = await pool(urls, 15, linkAlive);
  const audioOk = await pool(custom, 10, audioAlive);
  const dead = [...urls.filter((_, i) => !linkOk[i]), ...custom.filter((_, i) => !audioOk[i])];
  log(`ссылки: нерабочих ${dead.length} из ${urls.length + custom.length}`);
  return dead;
}


// ---------- 5. Эксклюзив: официальные станции с собственными открытыми потоками ----------
const exStation = (src, id, name, url, extra = {}) => ({
  stationuuid: `ex-${src}-${id}`,
  name,
  url,
  url_resolved: url,
  homepage: extra.homepage || '',
  favicon: (extra.favicon || '').startsWith('https://') ? extra.favicon : '',
  tags: extra.tags || '',
  country: extra.country || '',
  countrycode: extra.countrycode || '',
  codec: extra.codec || 'MP3',
  bitrate: extra.bitrate || 128,
  clickcount: 0,
  ...(extra.alt ? { alt: extra.alt } : {}),
});

const STATIC_GROUPS = [
  {
    id: 'radioparadise', name: 'Radio Paradise', note: 'Без рекламы, живые ведущие · Калифорния',
    stations: [
      ['main', 'Radio Paradise — Main Mix', 'https://stream.radioparadise.com/aac-320', 'eclectic,rock,indie', 320, 'AAC'],
      ['mellow', 'Radio Paradise — Mellow Mix', 'https://stream.radioparadise.com/mellow-320', 'chillout,mellow', 320, 'AAC'],
      ['rock', 'Radio Paradise — Rock Mix', 'https://stream.radioparadise.com/rock-320', 'rock', 320, 'AAC'],
      ['global', 'Radio Paradise — Global Mix', 'https://stream.radioparadise.com/global-320', 'world,eclectic', 320, 'AAC'],
    ].map(([id, n, u, t, b, c]) => exStation('rp', id, n, u, { tags: t, bitrate: b, codec: c, homepage: 'https://radioparadise.com', country: 'The United States Of America', countrycode: 'US',
      alt: [128, 64].map((br) => ({ bitrate: br, codec: 'AAC', url: u.replace(/320$/, String(br)) })) })),
  },
  {
    id: 'fip', name: 'FIP (Radio France)', note: 'Государственное радио Франции · без рекламы',
    stations: [
      ['fip', 'FIP', 'fip'], ['rock', 'FIP Rock', 'fiprock'], ['jazz', 'FIP Jazz', 'fipjazz'], ['groove', 'FIP Groove', 'fipgroove'],
      ['world', 'FIP Monde', 'fipworld'], ['new', 'FIP Nouveautés', 'fipnouveautes'], ['reggae', 'FIP Reggae', 'fipreggae'],
      ['electro', 'FIP Electro', 'fipelectro'], ['metal', 'FIP Metal', 'fipmetal'], ['hiphop', 'FIP Hip-Hop', 'fiphiphop'], ['pop', 'FIP Pop', 'fippop'],
    ].map(([id, n, k]) => exStation('fip', id, n, `https://icecast.radiofrance.fr/${k}-hifi.aac`, { tags: 'eclectic,' + id, bitrate: 192, codec: 'AAC', homepage: 'https://www.radiofrance.fr/fip', country: 'France', countrycode: 'FR',
      alt: [{ bitrate: 128, codec: 'MP3', url: `https://icecast.radiofrance.fr/${k}-midfi.mp3` }, { bitrate: 32, codec: 'MP3', url: `https://icecast.radiofrance.fr/${k}-lofi.mp3` }] })),
  },
  {
    id: 'swiss', name: 'Radio Swiss (SRG SSR)', note: 'Общественное радио Швейцарии · без рекламы и болтовни',
    stations: [
      ['jazz', 'Radio Swiss Jazz', 'rsj', 'jazz'], ['classic', 'Radio Swiss Classic', 'rsc_de', 'classical'], ['pop', 'Radio Swiss Pop', 'rsp', 'pop,easy listening'],
    ].map(([id, n, k, t]) => exStation('swiss', id, n, `https://stream.srg-ssr.ch/m/${k}/mp3_128`, { tags: t, homepage: 'https://www.radioswiss' + id + '.ch', country: 'Switzerland', countrycode: 'CH' })),
  },
  {
    id: 'indie', name: 'Независимые станции мира', note: 'Известные некоммерческие станции с открытыми потоками',
    stations: [
      exStation('kexp', 'main', 'KEXP 90.3 Seattle', 'https://kexp.streamguys1.com/kexp160.aac', { tags: 'indie,alternative', bitrate: 160, codec: 'AAC', homepage: 'https://www.kexp.org', country: 'The United States Of America', countrycode: 'US' }),
      exStation('nts', '1', 'NTS Radio 1 (London)', 'https://stream-relay-geo.ntslive.net/stream', { tags: 'eclectic,underground', homepage: 'https://www.nts.live', country: 'The United Kingdom', countrycode: 'GB' }),
      exStation('nts', '2', 'NTS Radio 2 (London)', 'https://stream-relay-geo.ntslive.net/stream2', { tags: 'eclectic,underground', homepage: 'https://www.nts.live', country: 'The United Kingdom', countrycode: 'GB' }),
      ...['nightride', 'chillsynth', 'darksynth', 'datawave', 'spacesynth', 'horrorsynth'].map((k) =>
        exStation('nightride', k, `Nightride FM — ${k[0].toUpperCase() + k.slice(1)}`, `https://stream.nightride.fm/${k}.mp3`, { tags: 'synthwave,retrowave', bitrate: 320, homepage: 'https://nightride.fm' })
      ),
    ],
  },
];

async function somaGroup() {
  const j = await getJson('https://api.somafm.com/channels.json');
  const stations = (j.channels || []).map((c) =>
    exStation('soma', c.id, `SomaFM — ${c.title}`, `https://ice1.somafm.com/${c.id}-128-mp3`, {
      alt: [{ bitrate: 64, codec: 'AAC', url: `https://ice1.somafm.com/${c.id}-64-aac` }, { bitrate: 32, codec: 'AAC', url: `https://ice1.somafm.com/${c.id}-32-aac` }],
      tags: c.genre || '', favicon: c.largeimage || c.image || '', homepage: `https://somafm.com/${c.id}/`, country: 'The United States Of America', countrycode: 'US',
    })
  );
  return { id: 'somafm', name: 'SomaFM', note: 'Слушательское радио без рекламы · Сан-Франциско', stations };
}

async function recordGroup() {
  const j = await getJson('https://www.radiorecord.ru/api/stations/');
  const list = j?.result?.stations || j?.stations || [];
  const stations = list
    .map((c) => {
      const url = c.stream_320 || c.stream_128 || c.stream_64;
      if (!url || !String(url).startsWith('https://')) return null;
      return exStation('record', c.prefix || c.id, `Record — ${c.title}`, url, {
        tags: ['dance', ...(c.genre || []).map((g) => g.name)].join(',').toLowerCase(),
        // Реальные битрейты Record: поля stream_320/128/64 — это AAC+ 96/64/32 kbps
        favicon: c.icon_fill_colored || c.icon_fill_white || '', homepage: 'https://www.radiorecord.ru', bitrate: c.stream_320 ? 96 : 64, codec: 'AAC+',
        alt: [[64, c.stream_128], [32, c.stream_64]].filter(([, u]) => u && u !== url && String(u).startsWith('https://')).map(([b, u]) => ({ bitrate: b, codec: 'AAC+', url: u })),
        country: 'Russia', countrycode: 'RU',
      });
    })
    .filter(Boolean);
  return { id: 'record', name: 'Радио Record', note: 'Официальные каналы Radio Record (танцевальная музыка)', stations };
}

async function buildExclusive() {
  const groups = [...STATIC_GROUPS];
  // SomaFM убран: станция запрещает сторонние приложения (data/stream-policy.json)
  for (const [name, fn] of [['Record', recordGroup]]) {
    try {
      groups.push(await fn());
    } catch (e) {
      log(`эксклюзив: ${name} пропущен — ${e.message}`);
    }
  }
  const all = groups.flatMap((g) => g.stations);
  log(`эксклюзив: проверяем ${all.length} потоков…`);
  const ok = await pool(all, 20, (s) => audioAlive(s.url));
  const alive = new Set(all.filter((_, i) => ok[i]).map((s) => s.stationuuid));
  // Запасные битрейты тоже проверяем — оставляем только рабочие
  // Record публикует запасные потоки в своём официальном списке, а их сервер ограничивает частые подключения —
  // им доверяем без проверки (основной поток того же сервера уже проверен)
  const alts = all.filter((s) => alive.has(s.stationuuid) && !s.stationuuid.startsWith('ex-record-')).flatMap((s) => (s.alt || []).map((a) => [s, a]));
  // Медленнее и с повтором: серверы станций не любят много одновременных запросов
  const altOk = await pool(alts, 4, async ([, a]) => (await audioAlive(a.url)) || (await audioAlive(a.url)));
  const bad = new Set(alts.filter((_, i) => !altOk[i]).map(([, a]) => a.url));
  for (const s of all) if (s.alt) s.alt = s.alt.filter((a) => !bad.has(a.url));
  stats.exclusiveAlt = alts.length - bad.size;
  const result = groups
    .map((g) => ({ ...g, stations: g.stations.filter((s) => alive.has(s.stationuuid)) }))
    .filter((g) => g.stations.length);
  stats.exclusive = result.reduce((n, g) => n + g.stations.length, 0);
  log(`эксклюзив: работают ${stats.exclusive}`);
  return result;
}

// ---------- 6. Глобус: точки станций по регионам (как radio.garden) ----------
async function buildGeo() {
  let all = null;
  for (const host of RB) {
    try {
      all = await getJson(host + '/json/stations/search?has_geo_info=true&hidebroken=true&is_https=true&order=clickcount&reverse=true&limit=40000', 120000);
      break;
    } catch (e) {
      log('глобус:', host, e.message);
    }
  }
  if (!all) throw new Error('Radio Browser недоступен');
  const groups = new Map();
  for (const s of all) {
    if (!familySafe(s) || blockedSource(s)) continue;
    const lat = Number(s.geo_lat), lon = Number(s.geo_long);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0) || Math.abs(lat) > 85) continue;
    const cc = String(s.countrycode || '').toUpperCase();
    const state = String(s.state || '').trim();
    // Группа: страна + регион; без региона — по клетке ~0.5°
    const key = state ? `${cc}|${state.toLowerCase()}` : `${cc}|@${Math.round(lat * 2)}:${Math.round(lon * 2)}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { cc, state, lat: 0, lon: 0, n: 0, ids: [] }));
    g.lat += lat;
    g.lon += lon;
    g.n++;
    if (!state && g.ids.length < 15) g.ids.push(s.stationuuid);
  }
  const points = [...groups.values()]
    .map((g) => [+(g.lat / g.n).toFixed(2), +(g.lon / g.n).toFixed(2), g.n, g.cc, g.state, ...(g.state ? [] : [g.ids])])
    .sort((a, b) => b[2] - a[2])
    .slice(0, 6000);
  stats.geoPoints = points.length;
  stats.geoStations = points.reduce((n, p) => n + p[2], 0);
  log(`глобус: ${points.length} точек, ${stats.geoStations} станций`);
  await fs.writeFile(path.join(ROOT, 'public', 'geo.json'), JSON.stringify({ generatedAt: new Date().toISOString(), points }));
}

// ---------- 7. Подборки YAi: готовые проверенные плейлисты под настроение ----------
const CURATED = [
  { id: 'morning', name: 'Доброе утро', emoji: '☀️', note: 'Лёгкие хиты, чтобы проснуться с улыбкой', gradient: 'from-amber-400 via-orange-500 to-cyan-500', tags: ['pop', 'adult contemporary', 'easy listening', 'hits'], ex: [/Radio Paradise — Main Mix/, /Radio Swiss Pop/, /FIP Pop/] },
  { id: 'drive', name: 'В дорогу', emoji: '🚗', note: 'Рок и драйв для поездок', gradient: 'from-sky-500 via-indigo-500 to-violet-600', tags: ['classic rock', 'rock', 'hits', 'dance'], ex: [/Radio Paradise — Rock Mix/, /FIP Rock/, /Record — Rock$/, /Record — Big Hits/] },
  { id: 'focus', name: 'Работа без слов', emoji: '🎧', note: 'Спокойный фон для учёбы и работы', gradient: 'from-violet-500 via-teal-500 to-cyan-600', tags: ['ambient', 'lounge', 'classical', 'instrumental', 'lofi'], ex: [/Radio Paradise — Mellow/, /Radio Swiss Classic/, /Nightride FM — Chillsynth/, /Record — Chill-Out/] },
  { id: 'friday', name: 'Вечер пятницы', emoji: '🪩', note: 'Танцевальные хиты и клубные сеты', gradient: 'from-fuchsia-500 via-pink-500 to-cyan-500', tags: ['dance', 'house', 'disco', 'edm'], ex: [/Record — Record$/, /Record — Party 24\/7/, /Record — Summer Dance/, /Record — Megamix/, /FIP Electro/] },
  { id: 'chill', name: 'Чилл и лаунж', emoji: '🌙', note: 'Для вечера и хорошего настроения', gradient: 'from-indigo-600 via-purple-600 to-slate-800', tags: ['chillout', 'chill', 'lounge', 'downtempo'], ex: [/Record — Chill House/, /Record — Deep$/, /FIP Groove/, /Radio Paradise — Global/] },
  { id: 'jazz', name: 'Джаз-кафе', emoji: '🎷', note: 'Джаз, соул и боссанова', gradient: 'from-yellow-600 via-amber-700 to-stone-800', tags: ['jazz', 'smooth jazz', 'bossa nova', 'soul'], ex: [/FIP Jazz/, /Radio Swiss Jazz/] },
  { id: 'retro', name: 'Хиты 80-х и 90-х', emoji: '📼', note: 'Легендарные песни, которые знают все', gradient: 'from-pink-500 via-purple-500 to-cyan-500', tags: ['80s', '90s', 'oldies', 'retro'], ex: [/Record — Супердискотека 90-х/, /Record — Record 80-х/, /Record — Хиты всех времен/] },
  { id: 'ru', name: 'Русские хиты', emoji: '🎤', note: 'Популярная музыка на русском', gradient: 'from-red-500 via-cyan-600 to-blue-700', tags: ['russian pop', 'русская музыка', 'russian'], cc: 'RU', ex: [/Record — Russian Mix/, /Record — Russian Hits/, /Record — Russian Gold/] },
];

// Имена, которые в подборки не берём: торрент-трекеры, «ТВ»-станции, IPTV
const CURATED_BAN = /kinozal|torrent|rutor|rutracker|iptv|\.tv\b|\btv\b|телеканал|soloviev|соловь|звезда|zvezda|anon\.fm|news|новост|talk/i;
async function buildCurated(exclusive) {
  const exAll = (exclusive || []).flatMap((g) => g.stations);
  const out = [];
  for (const c of CURATED) {
    const picked = [];
    const seen = new Set();
    // ключ похожести: первые 12 букв названия без «HD», цифр и знаков (убирает почти-дубли)
    const key = (n) => norm(n).replace(/\bhd\b|\d+/g, '').replace(/\s+/g, '').slice(0, 12);
    const add = (s) => {
      const k = key(s.name);
      if (!k || seen.has(k) || CURATED_BAN.test(s.name)) return;
      seen.add(k);
      picked.push(s);
    };
    for (const re of c.ex) exAll.filter((s) => re.test(s.name)).slice(0, 1).forEach(add);
    const cand = [];
    for (const tag of c.tags) {
      try {
        const list = await searchRB({ tag, order: 'votes', limit: '40', ...(c.cc ? { countrycode: c.cc } : {}) });
        cand.push(...list.filter((s) => (s.bitrate || 0) >= 96 || !s.bitrate).map(slim));
      } catch (e) {
        log(`подборки: ${c.id}/${tag} — ${e.message}`);
      }
    }
    const uniq = [];
    const seenC = new Set([...seen]);
    for (const s of cand) {
      const k = key(s.name);
      if (!k || seenC.has(k) || CURATED_BAN.test(s.name)) continue;
      seenC.add(k);
      uniq.push(s);
    }
    const ok = await pool(uniq.slice(0, 30), 10, (s) => audioAlive(s.url_resolved || s.url));
    uniq.slice(0, 30).filter((_, i) => ok[i]).forEach(add);
    if (picked.length >= 5) out.push({ id: c.id, name: c.name, emoji: c.emoji, note: c.note, gradient: c.gradient, stations: picked.slice(0, 14) });
  }
  stats.curated = out.length;
  log(`подборки: ${out.map((c) => `${c.name} ${c.stations.length}`).join(', ')}`);
  if (out.length < 3) throw new Error('слишком мало подборок');
  return out;
}

// ---------- 8. Ночная проверка станций жанров: мёртвые прячем у всех ----------
// «Мёртвая» = сервер не отвечает, ссылки нет (404/410), ошибка сервера или вместо звука страница.
// Ответ «доступ запрещён» (401/403/451) — это ограничение по стране/IP, такие станции НЕ прячем.
async function streamStatus(url) {
  try {
    const r = await fetchWithTimeout(url, { headers: { 'Icy-MetaData': '0', Referer: 'https://eai-apps.github.io/', Origin: 'https://eai-apps.github.io' } }, 10000);
    const type = (r.headers.get('content-type') || '').toLowerCase();
    try {
      await r.body?.cancel();
    } catch {}
    if (r.ok && /audio|mpeg|aac|ogg|octet|mpegurl|x-scpls|pls|video\/mp2t/.test(type)) return 'ok';
    if ([401, 403, 451].includes(r.status)) return 'blocked';
    return 'dead';
  } catch {
    return 'dead';
  }
}

async function buildDead() {
  const src = await fs.readFile(path.join(ROOT, 'src', 'constants', 'genres.ts'), 'utf8');
  const tags = [...new Set([...src.matchAll(/\btag: '([^']+)'/g)].map((m) => m[1]).filter(Boolean))];
  const byId = new Map();
  for (const tag of tags) {
    try {
      const list = await searchRB({ tag, limit: '80' });
      for (const s of list) if (!byId.has(s.stationuuid)) byId.set(s.stationuuid, s.url_resolved || s.url);
    } catch (e) {
      log(`проверка станций: ${tag} — ${e.message}`);
    }
  }
  const ids = [...byId.keys()];
  log(`проверка станций: ${tags.length} жанров, ${ids.length} станций…`);
  const first = await pool(ids, 24, (id) => streamStatus(byId.get(id)));
  // повторно проверяем «упавшие» — медленнее, чтобы не спутать с кратким сбоем
  const retry = ids.filter((_, i) => first[i] === 'dead');
  const second = await pool(retry, 8, (id) => streamStatus(byId.get(id)));
  const dead = retry.filter((_, i) => second[i] === 'dead');
  stats.checkedStations = ids.length;
  stats.deadStations = dead.length;
  stats.blockedStations = first.filter((x) => x === 'blocked').length;
  log(`проверка станций: мёртвых ${dead.length}, закрыты по стране/IP ${stats.blockedStations}`);
  if (ids.length && dead.length > ids.length * 0.6) throw new Error('подозрительно много мёртвых — сеть робота?');
  return dead;
}

// ---------- запуск ----------
const prev = await fs.readFile(OUT, 'utf8').then(JSON.parse).catch(() => ({}));
const safe = async (name, fn, fallback) => {
  try {
    return await fn();
  } catch (e) {
    log(`⚠ ${name}: ${e.message} — оставляю прошлые данные`);
    return fallback;
  }
};

const catalog = {
  generatedAt: new Date().toISOString(),
  sources: ['Radio Browser (radio-browser.info)', 'laut.fm', 'iptv-org (открытая база телеканалов)', 'Free-TV/IPTV', 'Radio Paradise', 'Radio France (FIP)', 'SRG SSR (Radio Swiss)', 'KEXP', 'NTS', 'Nightride FM', 'Radio Record'],
  artists: await safe('артисты', buildArtists, prev.artists || {}),
  series: await safe('серии', buildSeries, prev.series || []),
  tv: await safe('ТВ', buildTv, prev.tv || []),
  deadLinks: await safe('ссылки', buildDeadLinks, prev.deadLinks || []),
  exclusive: await safe('эксклюзив', buildExclusive, prev.exclusive || []),
};
catalog.curated = await safe('подборки', () => buildCurated(catalog.exclusive), prev.curated || []);
catalog.dead = await safe('проверка станций', buildDead, prev.dead || []);
await safe('глобус', buildGeo, null);
catalog.stats = stats;

await fs.writeFile(OUT, JSON.stringify(catalog));
log(`готово: ${OUT} (${(JSON.stringify(catalog).length / 1024).toFixed(0)} КБ)`);
