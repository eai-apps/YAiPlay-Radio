/**
 * Исследователь разрешений: обходит сайты тысяч радиостанций и ищет, что они пишут
 * о своих потоках — разрешают ли слушать их в сторонних приложениях/плеерах или запрещают.
 *
 * Результат:
 *   data/stream-permissions.json — все найденное (со ссылкой на страницу и цитатой)
 *   docs/STREAM-PERMISSIONS.md   — понятный отчёт для владельца
 *
 * Ничего не блокирует сам: владелец смотрит отчёт, запреты переносим в data/stream-policy.json вручную.
 * Вежливо: robots.txt, не больше 7 страниц на сайт, тайм-ауты, понятный User-Agent.
 * Запуск: GitHub → Actions → «Поиск разрешений станций» → Run workflow (или раз в месяц сам).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIMIT = Number(process.env.LIMIT || 3000);
const CONCURRENCY = Number(process.env.CONCURRENCY || 16);
const UA = 'YAiPlayerPermissionScanner/1.0 (+https://yaiplay-radio.pages.dev/; checks stream usage terms)';
const RB = ['https://de1.api.radio-browser.info', 'https://fi1.api.radio-browser.info', 'https://de2.api.radio-browser.info'];
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
// Сбой одного сайта (обрыв соединения и т. п.) не должен останавливать весь обход
process.on('unhandledRejection', (e) => log('пропущена ошибка:', String(e?.message || e).slice(0, 200)));
process.on('uncaughtException', (e) => log('пропущена ошибка:', String(e?.message || e).slice(0, 200)));

async function fetchText(url, ms = 12000, max = 1_500_000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,text/plain;q=0.9,*/*;q=0.5' }, redirect: 'follow', signal: ctl.signal });
    const ct = r.headers.get('content-type') || '';
    if (!r.ok || !/text|html|xml|json/i.test(ct)) {
      r.body?.cancel().catch(() => {});
      return { ok: false, status: r.status, url: r.url };
    }
    const buf = await r.arrayBuffer();
    return { ok: true, status: r.status, url: r.url, text: new TextDecoder('utf-8').decode(buf.slice(0, max)) };
  } catch (e) {
    return { ok: false, status: 0, error: String(e?.name || e) };
  } finally {
    clearTimeout(t);
  }
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k], k).catch((e) => ({ error: String(e) }));
      }
    })
  );
  return out;
}

const hostOf = (u) => {
  try {
    return new URL(u).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
};

// ---------- 1. Станции и их сайты ----------
async function loadStations() {
  for (const h of RB) {
    try {
      const q = new URLSearchParams({ hidebroken: 'true', order: 'clickcount', reverse: 'true', limit: String(LIMIT) });
      const r = await fetch(`${h}/json/stations/search?${q}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(90000) });
      if (r.ok) return r.json();
    } catch (e) {
      log('Radio Browser', h, e.message);
    }
  }
  throw new Error('Radio Browser недоступен');
}

// ---------- 2. Что ищем в тексте ----------
// Ссылки на страницы, где обычно пишут про потоки и условия
const LINK_RE =
  /listen|stream|player|\bapps?\b|webradio|internet-?radio|terms|conditions|legal|faq|help|nutzungsbedingungen|agb|hören|hoeren|empfang|empfangen|слуша|плеер|поток|приложен|соглашен|правила|écouter|ecouter|conditions-generales|ascolta|escuchar|oir/i;

const S = '[^.!?\\n]{0,90}';
// Слова целиком (иначе «knapp» находит «app»)
const APPWORD = '(?<![\\p{L}])(third[- ]party|apps?|applications?|players?|clients?|directories|aggregators?|Drittanbieter\\p{L}*|Anwendungen|сторонн\\p{L}*|приложени\\p{L}*|плеер\\p{L}*|агрегатор\\p{L}*|applications? tierces?|lecteurs?)(?![\\p{L}])';
const STREAMWORD = '(?<![\\p{L}])(streams?|feeds?|Stream-?URLs?|Streamadressen?|Livestreams?|поток\\p{L}*|трансляци\\p{L}*|flux)(?![\\p{L}])';
// Запрет засчитываем, только если речь именно о потоках или о сторонних приложениях
const ABOUT_STREAMS = new RegExp(STREAMWORD + '|(?<![\\p{L}])(re-?stream|re-?broadcast|retransmi|embed|third[- ]party|Drittanbieter|сторонн)', 'iu');
const NEG = [
  new RegExp(`(can'?t|cannot|can not|won'?t|do not|don'?t|not)${S}(grant|permit|allow|authori[sz]e|approv)${S}${APPWORD}`, 'iu'),
  new RegExp(`${APPWORD}${S}(not (permitted|allowed|authori[sz]ed)|prohibited|forbidden|without (our )?(prior |explicit )?(written )?(permission|consent|authori[sz]ation))`, 'iu'),
  new RegExp(`(re-?stream\\p{L}*|re-?broadcast\\p{L}*|retransmi\\p{L}*|embed\\p{L}*)${S}(without|not|prohibited|forbidden)`, 'iu'),
  new RegExp(`(nicht gestattet|nicht erlaubt|untersagt|verboten|ohne (vorherige |ausdrückliche )?(schriftliche )?(Zustimmung|Genehmigung|Erlaubnis))${S}${APPWORD}|${APPWORD}${S}(nicht gestattet|nicht erlaubt|untersagt|verboten)`, 'iu'),
  new RegExp(`(запрещ\\p{L}*|не допуска\\p{L}*|без (письменного |предварительного )?(разрешени|согласи)\\p{L}*)${S}${APPWORD}|${APPWORD}${S}(запрещ\\p{L}*|не допуска\\p{L}*)`, 'iu'),
];
const POS = [
  new RegExp(`(feel free|you are welcome|you'?re welcome|you may|you can|are allowed|is allowed|permitted|happy for you)${S}(use|add|include|link|embed|play)${S}${STREAMWORD}`, 'iu'),
  new RegExp(`${STREAMWORD}${S}(may|can|is free to|are free to)${S}(be used|use)${S}${APPWORD}`, 'iu'),
  new RegExp(`${APPWORD}${S}(welcome|are allowed|is allowed|may use|can use|free to use)`, 'iu'),
  new RegExp(`(gerne|dürfen|darf|erlaubt)${S}${STREAMWORD}${S}(einbinden|nutzen|verwenden|verlinken)|${STREAMWORD}${S}(gerne|dürfen|darf)${S}(einbinden|nutzen|verwenden|verlinken)`, 'iu'),
  new RegExp(`(можно|разреша\\p{L}*|не против|свободно)${S}(использ\\p{L}*|добав\\p{L}*|вставл\\p{L}*|встраива\\p{L}*)${S}${STREAMWORD}|${STREAMWORD}${S}(можно|разреша\\p{L}*)${S}(использ\\p{L}*|добав\\p{L}*)`, 'iu'),
];
// Станция сама даёт адрес потока «для вашего плеера»
const STREAM_URL_RE = /https?:\/\/[^\s"'<>]+?(\.mp3|\.aac|\.m3u8?|\.pls|\/stream|\/live|icecast|shoutcast|:\d{4}\/)/i;
const PLAYER_RE = /(VLC|Winamp|foobar|iTunes|WLAN|Wi-?Fi radio|internet ?radio|Internetradio|media ?player|Mediaplayer|eigenen Player|your (own |favou?rite )?player|other players|Sonos|плеер|AIMP|ваш(ем|его)? плеер)/i;

function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|li|div|h\d|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&apos;/g, "'")
    .replace(/[ \t]+/g, ' ');
}
const sentences = (t) => t.split(/(?<=[.!?])\s+|\n+/).map((x) => x.trim()).filter((x) => x.length > 20 && x.length < 600);

function linksOf(html, base) {
  const out = new Map();
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)) {
    try {
      const u = new URL(m[1], base);
      if (!/^https?:$/.test(u.protocol) || hostOf(u.href) !== hostOf(base)) continue;
      const label = m[2].replace(/<[^>]+>/g, ' ');
      if (LINK_RE.test(u.pathname) || LINK_RE.test(label)) out.set(u.href.replace(/#.*$/, ''), label.trim().slice(0, 60));
    } catch {}
  }
  return [...out.keys()].slice(0, 6);
}

async function robotsAllows(origin) {
  const r = await fetchText(origin + '/robots.txt', 6000, 200_000);
  if (!r.ok) return true;
  let applies = false;
  for (const line of r.text.split('\n')) {
    const [k, ...v] = line.split(':');
    const key = (k || '').trim().toLowerCase();
    const val = v.join(':').trim();
    if (key === 'user-agent') applies = val === '*' || /YAi/i.test(val);
    else if (applies && key === 'disallow' && val === '/') return false;
  }
  return true;
}

async function scanSite(site) {
  const res = { domain: site.domain, home: site.home, stations: site.names.slice(0, 5), stationCount: site.names.length, status: 'unknown', evidence: [] };
  const origin = new URL(site.home).origin;
  if (!(await robotsAllows(origin))) return { ...res, status: 'robots' };
  const home = await fetchText(site.home);
  if (!home.ok) return { ...res, status: 'unreachable' };
  const pages = [{ url: home.url || site.home, html: home.text }];
  for (const u of linksOf(home.text, home.url || site.home)) {
    const p = await fetchText(u);
    if (p.ok) pages.push({ url: p.url || u, html: p.text });
  }
  let neg = [], pos = [], links = [];
  for (const p of pages) {
    const txt = textOf(p.html);
    for (const s of sentences(txt)) {
      if (NEG.some((re) => re.test(s)) && ABOUT_STREAMS.test(s)) neg.push({ url: p.url, text: s.slice(0, 300) });
      else if (POS.some((re) => re.test(s))) pos.push({ url: p.url, text: s.slice(0, 300) });
    }
    if (STREAM_URL_RE.test(p.html) && PLAYER_RE.test(txt)) {
      const m = txt.match(new RegExp(`[^.\\n]{0,160}${PLAYER_RE.source}[^.\\n]{0,160}`, 'i'));
      links.push({ url: p.url, text: (m ? m[0] : 'на странице есть адреса потоков для плееров').trim().slice(0, 300) });
    }
  }
  const uniq = (a) => [...new Map(a.map((x) => [x.text, x])).values()].slice(0, 3);
  if (neg.length) return { ...res, status: 'no', evidence: uniq(neg) };
  if (pos.length) return { ...res, status: 'yes', evidence: uniq(pos) };
  if (links.length) return { ...res, status: 'player-links', evidence: uniq(links) };
  return { ...res, pagesChecked: pages.length };
}

// ---------- 3. Запуск ----------
const list = await loadStations();
log(`станций: ${list.length}`);
const sites = new Map();
for (const s of list) {
  const home = (s.homepage || '').trim();
  const d = hostOf(home);
  if (!d || /facebook|instagram|twitter|x\.com|youtube|t\.me|tiktok|google|wikipedia|linktr|radio-browser|tunein|radio\.net|onlineradiobox|streema|mytuner/i.test(d)) continue;
  if (!sites.has(d)) sites.set(d, { domain: d, home: /^https?:\/\//.test(home) ? home : 'https://' + home, names: [] });
  sites.get(d).names.push(s.name);
}
const todo = [...sites.values()];
log(`сайтов к проверке: ${todo.length}`);
let done = 0;
const results = await pool(todo, CONCURRENCY, async (site) => {
  const r = await scanSite(site);
  if (++done % 100 === 0) log(`проверено ${done}/${todo.length}`);
  return r;
});

const by = (st) => results.filter((r) => r && r.status === st);
const summary = {
  generatedAt: new Date().toISOString(),
  stationsChecked: list.length,
  sitesChecked: todo.length,
  counts: Object.fromEntries(['yes', 'no', 'player-links', 'unknown', 'unreachable', 'robots'].map((k) => [k, by(k).length])),
};
await fs.writeFile(path.join(ROOT, 'data', 'stream-permissions.json'), JSON.stringify({ ...summary, results: results.filter(Boolean) }, null, 1));

const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\s+/g, ' ');
const table = (rows, n = 400) =>
  rows.length
    ? '| Сайт | Станции | Цитата (страница) |\n|---|---|---|\n' +
      rows
        .slice(0, n)
        .map((r) => `| ${r.domain} | ${esc(r.stations.join(', '))}${r.stationCount > 5 ? ` и ещё ${r.stationCount - 5}` : ''} | «${esc(r.evidence[0]?.text || '')}» ([страница](${r.evidence[0]?.url || r.home})) |`)
        .join('\n')
    : '_нет_';
const md = `# Что станции пишут о своих потоках

Отчёт робота \`scripts/permission-scan.mjs\` от ${summary.generatedAt.slice(0, 10)}.
Проверено станций: ${summary.stationsChecked}, их сайтов: ${summary.sitesChecked}.

| Итог | Сайтов |
|---|---|
| ✅ Прямо разрешают сторонние приложения/плееры | ${summary.counts.yes} |
| ❌ Прямо запрещают (кандидаты в data/stream-policy.json) | ${summary.counts.no} |
| 🟡 Сами дают адрес потока «для вашего плеера» | ${summary.counts['player-links']} |
| ❓ Ничего не написано | ${summary.counts.unknown} |
| — Сайт не открылся / закрыт для роботов | ${summary.counts.unreachable + summary.counts.robots} |

> Робот ищет фразы автоматически и может ошибаться — перед решением открывайте страницу по ссылке.
> Запреты в приложении не применяются сами: проверяем и переносим в \`data/stream-policy.json\`.

## ❌ Запрещают
${table(by('no'))}

## ✅ Разрешают
${table(by('yes'))}

## 🟡 Дают адрес потока для плееров
${table(by('player-links'), 300)}
`;
await fs.writeFile(path.join(ROOT, 'docs', 'STREAM-PERMISSIONS.md'), md);
log('готово', JSON.stringify(summary.counts));
