/**
 * Автопостинг в Телеграм-канал YAi Radio.
 *   node scripts/telegram-post.mjs <mode>
 *   mode: auto | day | station | news | release | ask | promo | setup
 * Тексты пишет нейросеть Google Gemini (бесплатный ключ); если она недоступна — шаблоны.
 * Нужны секреты: TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL (@имя_канала), GEMINI_API_KEY.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE_FILE = path.join(ROOT, 'data', 'telegram-state.json');
// Адрес сайта в постах, кнопках и рекламе (зеркало Cloudflare; старый eai-apps.github.io/YAiPlay-Radio тоже работает)
const SITE = 'https://yaiplay-radio.pages.dev/';
const BANNER = SITE + 'telegram-card.png';

// ---------- RuStore ----------
// До одобрения модерацией RuStore в рекламе не упоминаем. Одобрили → в data/stores.json "rustore": true.
const RUSTORE_APP = 'https://www.rustore.ru/catalog/app/com.yaiplay.radio.rustore'; // наше приложение
const RUSTORE_GET = 'https://www.rustore.ru/download'; // скачать сам RuStore на телефон
let STORES = null;
async function stores() {
  if (!STORES) STORES = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'stores.json'), 'utf8').catch(() => '{}'));
  return STORES;
}
const rustoreLive = async () => !!(await stores()).rustore;
/** Строка для рекламных постов: наше приложение в RuStore + ссылка, где взять сам RuStore */
const rustoreLine = () => `\n\n📥 <b>RuStore:</b> <a href="${RUSTORE_APP}">YAi Radio</a> · нет RuStore? <a href="${RUSTORE_GET}">скачать RuStore</a>`;
const rustoreButtons = () => [[{ text: '📥 YAi Radio в RuStore', url: RUSTORE_APP }], [{ text: '⬇️ Нет RuStore? Скачать', url: RUSTORE_GET }]];
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL = process.env.TELEGRAM_CHANNEL || '@YAiPlayer';
const DRY_RUN = process.env.DRY_RUN !== 'false';
const UA = 'YAiPlayer-TelegramBot/1.0 (+https://github.com/eai-apps/YAiPlay-Radio)';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchT(url, opts = {}, ms = 15000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: c.signal, headers: { 'User-Agent': UA, ...(opts.headers || {}) } });
  } finally {
    clearTimeout(t);
  }
}

// ---------- состояние (что уже публиковали) ----------
async function loadState() {
  try {
    return JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
  } catch {
    return { stations: [], news: [], releases: [], askIndex: 0 };
  }
}
async function saveState(s) {
  s.stations = s.stations.slice(-400);
  s.news = s.news.slice(-400);
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(s, null, 2));
}

// ---------- Telegram ----------
// Все посты канала выходят без звука уведомления (так попросил владелец канала)
const SILENT = true;
async function tg(method, body) {
  if (DRY_RUN) {
    log('[DRY_RUN] Telegram API вызов пропущен:', method, JSON.stringify(body));
    return method === 'getMe' ? { username: 'YAiPlayer_bot' } : { message_id: 0 };
  }
  if (/^send/.test(method)) body = { ...body, disable_notification: SILENT };
  // Если до Telegram не достучались (соединение не установилось) — пробуем ещё до 3 раз.
  // Повтор безопасен: сообщение в этом случае точно не ушло.
  let r;
  for (let attempt = 1; ; attempt++) {
    try {
      r = await fetchT(`https://api.telegram.org/bot${TOKEN}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      break;
    } catch (e) {
      const codes = [e?.cause?.code, ...(e?.cause?.errors || []).map((x) => x.code)];
      const connectFail = codes.some((c) => ['ETIMEDOUT', 'ENETUNREACH', 'ECONNREFUSED', 'EAI_AGAIN'].includes(c));
      if (!connectFail || attempt >= 3) throw e;
      await new Promise((ok) => setTimeout(ok, 5000 * attempt));
    }
  }
  const j = await r.json();
  if (!j.ok) throw new Error(`${method}: ${j.description}`);
  return j.result;
}
const listenButton = (url, text = '▶️ Слушать в YAi Radio') => ({ inline_keyboard: [[{ text, url }]] });

// Подпись под каждым постом: канал, сайт, приложения, бот (ссылки спрятаны под названия)
let BOT_USERNAME = '';
async function footer() {
  if (!BOT_USERNAME) {
    try {
      BOT_USERNAME = (await tg('getMe', {})).username || '';
    } catch {}
  }
  const ch = CHANNEL.startsWith('@') ? CHANNEL.slice(1) : 'YAiPlayer';
  return (
    `\n\n➖➖➖\n` +
    `📢 Подписывайтесь: <a href="https://t.me/${ch}">Telegram @${ch}</a>\n` +
    `🎧 Слушать: <a href="${SITE}">в браузере</a> · <a href="${SITE}#apps">Android</a> · <a href="${SITE}#apps">iPhone/iPad</a>` +
    (BOT_USERNAME ? ` · <a href="https://t.me/${BOT_USERNAME}?startapp">в Telegram</a>` : '')
  );
}
const CAPTION_MAX = 1024;
/** Текст + подпись, с обрезкой основной части, чтобы влезть в лимит Telegram */
async function withFooter(text, limit = CAPTION_MAX) {
  const f = await footer();
  // Telegram считает лимит по видимому тексту (без HTML-разметки)
  const vis = (x) => x.replace(/<[^>]+>/g, '').replace(/&(lt|gt|amp|quot);/g, '_').length;
  const room = limit - vis(f) - 5;
  let t = text;
  if (vis(t) > room) {
    t = t.slice(0, room + (t.length - vis(t))).replace(/<[^>]*$/, '').replace(/\s+\S*$/, '') + '…';
    // закрываем оборванный <b>
    if ((t.match(/<b>/g) || []).length > (t.match(/<\/b>/g) || []).length) t += '</b>';
  }
  return t + f;
}

async function postPhotoOrText({ photo, caption, buttons, preview = false, silent = false }) {
  if (DRY_RUN) {
    log('[DRY_RUN] Черновик Telegram-поста:', JSON.stringify({ channel: CHANNEL, caption, hasPhoto: !!photo, buttons, silent: SILENT || silent }));
    return { message_id: 0 };
  }
  // photo: Buffer (наша карточка), URL или null
  if (photo && Buffer.isBuffer(photo)) {
    try {
      const fd = new FormData();
      fd.append('chat_id', CHANNEL);
      fd.append('caption', caption);
      fd.append('parse_mode', 'HTML');
      if (silent || SILENT) fd.append('disable_notification', 'true');
      if (buttons) fd.append('reply_markup', JSON.stringify(buttons));
      fd.append('photo', new Blob([photo], { type: 'image/png' }), 'YAi.png');
      const r = await fetchT(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, { method: 'POST', body: fd }, 30000);
      const j = await r.json();
      if (j.ok) return j.result;
      log('фото-карточка не отправилась:', j.description);
    } catch (e) {
      log('фото-карточка не отправилась:', e.message);
    }
    photo = BANNER;
  }
  if (photo) {
    try {
      return await tg('sendPhoto', { chat_id: CHANNEL, photo, caption, parse_mode: 'HTML', reply_markup: buttons, disable_notification: silent });
    } catch (e) {
      log('фото не отправилось, шлём текстом:', e.message);
    }
  }
  return tg('sendMessage', {
    chat_id: CHANNEL,
    text: caption,
    parse_mode: 'HTML',
    reply_markup: buttons,
    disable_notification: silent,
    link_preview_options: { is_disabled: !preview },
  });
}

// ---------- фирменная картинка поста (рисуем сами, чтобы не было белых/битых картинок) ----------
let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  log('sharp не установлен — картинки будут баннером');
}
const xmlEsc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Логотип станции: скачиваем, проверяем размер и «не однотонность», кладём на тёмную подложку */
async function stationLogo(url) {
  if (!sharp || !/^https:\/\//.test(url || '')) return null;
  try {
    const r = await fetchT(url, {}, 10000);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const img = sharp(buf, { failOn: 'none' });
    const meta = await img.metadata();
    if (!meta.width || meta.width < 64 || meta.height < 64) return null;
    const flat = await sharp(buf).resize(380, 380, { fit: 'contain', background: { r: 24, g: 24, b: 27, alpha: 1 } }).flatten({ background: '#18181b' }).png().toBuffer();
    const st = await sharp(flat).stats();
    const spread = st.channels.slice(0, 3).reduce((a, c) => a + c.stdev, 0) / 3;
    if (spread < 12) return null; // почти однотонная — значит пустая/белая
    return flat;
  } catch {
    return null;
  }
}

async function makeCard({ label, title, subtitle, logoUrl }) {
  if (!sharp) return null;
  try {
    const globe = await sharp(path.join(ROOT, 'public', 'logo-globe.png')).resize(380, 380).png().toBuffer();
    const logo = (await stationLogo(logoUrl)) || globe;
    // Название: 1–2 строки, шрифт подбираем под длину (ширина поля ~640px)
    const words = String(title).split(/\s+/);
    const lines = [];
    const maxChars = title.length <= 20 ? 20 : 24;
    for (const w of words) {
      const last = lines[lines.length - 1];
      if (last && (last + ' ' + w).length <= maxChars) lines[lines.length - 1] = last + ' ' + w;
      else lines.push(w);
    }
    if (lines.length > 2) lines.splice(1, lines.length - 1, (lines.slice(1).join(' ').slice(0, maxChars - 1) + '…'));
    const fs1 = lines.length === 1 && title.length <= 20 ? 56 : 44;
    const titleSvg = lines
      .map((l, i) => `<text x="580" y="${lines.length === 1 ? 330 : 312 + i * 52}" font-family="DejaVu Sans, sans-serif" font-size="${fs1}" font-weight="bold" fill="#ffffff">${xmlEsc(l.length > maxChars + 2 ? l.slice(0, maxChars) + '…' : l)}</text>`)
      .join('');
    const subY = lines.length === 1 ? 395 : 420;
    const svg = `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g1" cx="25%" cy="50%" r="55%"><stop offset="0" stop-color="#065f46" stop-opacity=".9"/><stop offset="1" stop-color="#09090b" stop-opacity="0"/></radialGradient>
        <radialGradient id="g2" cx="90%" cy="0%" r="60%"><stop offset="0" stop-color="#0e7490" stop-opacity=".7"/><stop offset="1" stop-color="#09090b" stop-opacity="0"/></radialGradient>
        <linearGradient id="acc" x1="0" x2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset=".5" stop-color="#6041d8"/><stop offset="1" stop-color="#1fcfeb"/></linearGradient>
      </defs>
      <rect width="1280" height="720" fill="#09090b"/><rect width="1280" height="720" fill="url(#g1)"/><rect width="1280" height="720" fill="url(#g2)"/>
      <rect x="96" y="150" width="420" height="420" rx="48" fill="#18181b" stroke="url(#acc)" stroke-width="4"/>
      <text x="580" y="240" font-family="DejaVu Sans, sans-serif" font-size="34" font-weight="bold" fill="#1fcfeb">${xmlEsc(label)}</text>
      ${titleSvg}
      <text x="580" y="${subY}" font-family="DejaVu Sans, sans-serif" font-size="30" fill="#a1a1aa">${xmlEsc(subtitle || '')}</text>
      <rect x="580" y="465" width="420" height="6" rx="3" fill="url(#acc)"/>
      <text x="580" y="530" font-family="DejaVu Sans, sans-serif" font-size="34" font-weight="bold" fill="#ffffff">YAi <tspan fill="#1fcfeb">Radio</tspan></text>
      <text x="580" y="575" font-family="DejaVu Sans, sans-serif" font-size="24" fill="#71717a">Радио со всего мира · бесплатно</text>
    </svg>`;
    return await sharp(Buffer.from(svg))
      .composite([{ input: logo, left: 116, top: 170 }])
      .png()
      .toBuffer();
  } catch (e) {
    log('карточка не собралась:', e.message);
    return null;
  }
}

// ---------- нейросеть (Google Gemini) ----------
let AI_ERROR = '';
async function ai(system, user, maxTokens = 700) {
  // Google Gemini (бесплатный ключ из Google AI Studio → секрет GEMINI_API_KEY)
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    AI_ERROR = 'нет секрета GEMINI_API_KEY';
    return null;
  }
  for (const model of ['gemini-flash-latest', 'gemini-2.5-flash']) {
    try {
      const r = await fetchT(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: maxTokens + 1500 },
          }),
        },
        60000
      );
      const raw = await r.text();
      let j = null;
      try {
        j = JSON.parse(raw);
      } catch {}
      const text = (j?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
      if (text) {
        AI_ERROR = '';
        return text;
      }
      AI_ERROR = `${model} HTTP ${r.status}: ${raw.slice(0, 300)}`;
      log('нейросеть не ответила:', AI_ERROR);
    } catch (e) {
      AI_ERROR = `${model}: ${e.message}`;
      log('нейросеть недоступна:', AI_ERROR);
    }
  }
  return null;
}
const STYLE =
  'Ты ведёшь Телеграм-канал YAi Radio — бесплатного сайта и приложения с радиостанциями со всего мира. ' +
  'Пиши по-русски, живо и дружелюбно, коротко, 1–2 уместных эмодзи. Без хештегов, без markdown, без ссылок. ' +
  'НИКОГДА не выдумывай факты: используй только то, что дано. Если фактов мало — говори о жанре и настроении в общих словах.';

// ---------- 1. Станция дня ----------
const COUNTRY_RU = new Intl.DisplayNames(['ru'], { type: 'region' });
const ROTATION = ['DE', 'FR', 'IT', 'ES', 'GB', 'US', 'BR', 'JP', 'NL', 'PL', 'UA', 'KZ', 'GR', 'TR', 'MX', 'CA', 'AU', 'SE', 'CZ', 'PT', 'AR', 'IN', 'KR', 'CH', 'AT', 'IE', 'NO', 'FI', 'BE', 'IL', 'RS', 'GE', 'AM', 'BY', 'LT', 'LV', 'EE', 'RO', 'BG', 'HU'];

/** Поток играет на нашем сайте? (проверяем с адресом сайта — станции, запрещающие чужие сайты, отсеются) */
async function streamOk(url) {
  try {
    const r = await fetchT(url, { headers: { 'Icy-MetaData': '0', Referer: 'https://eai-apps.github.io/', Origin: 'https://eai-apps.github.io' } }, 10000);
    const type = (r.headers.get('content-type') || '').toLowerCase();
    try {
      await r.body?.cancel();
    } catch {}
    return r.ok && /audio|mpeg|aac|ogg|octet|mpegurl/.test(type);
  } catch {
    return false;
  }
}

async function pickStation(state) {
  for (let i = 0; i < 8; i++) {
    const st = await pickStationOnce(state);
    if (!st) return null;
    if (await streamOk(st.url_resolved || st.url)) return st;
    log('станция не играет на сайте, пропускаем:', st.name);
    state.stations.push(st.stationuuid); // больше не предлагать
  }
  return null;
}

async function pickStationOnce(state) {
  const catalog = JSON.parse(await fs.readFile(path.join(ROOT, 'public', 'catalog.json'), 'utf8'));
  const content = JSON.parse(await fs.readFile(path.join(ROOT, 'public', 'content.json'), 'utf8').catch(() => '{}'));
  const hidden = new Set((content.hiddenCountries?.radio || []).map((c) => c.toUpperCase()));
  const posted = new Set(state.stations);

  // Чередуем: эксклюзив YAi ↔ популярная станция другой страны
  const useExclusive = state.stations.length % 3 === 0; // каждая третья — эксклюзив
  if (useExclusive) {
    const groups = catalog.exclusive || [];
    const pool = groups.flatMap((g) => g.stations.map((s) => ({ ...s, group: g.name, groupNote: g.note }))).filter((s) => !posted.has(s.stationuuid));
    if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
  }
  const start = state.stations.length % ROTATION.length;
  for (let i = 0; i < ROTATION.length; i++) {
    const cc = ROTATION[(start + i) % ROTATION.length];
    if (hidden.has(cc)) continue;
    try {
      const r = await fetchT(`https://de1.api.radio-browser.info/json/stations/search?countrycode=${cc}&order=votes&reverse=true&limit=40&hidebroken=true&is_https=true`);
      const list = (await r.json()).filter((s) => !posted.has(s.stationuuid) && !/(xxx|porn|sex|erotic|nsfw)/i.test(`${s.name} ${s.tags}`));
      if (list.length) return list[Math.floor(Math.random() * Math.min(list.length, 15))];
    } catch (e) {
      log('Radio Browser:', e.message);
    }
  }
  return null;
}

async function postStation(state, isDay = false) {
  const st = await pickStation(state);
  if (!st) return log('станция не найдена');
  const country = st.countrycode ? COUNTRY_RU.of(st.countrycode.toUpperCase()) : st.country || '';
  const tags = String(st.tags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 5).join(', ');
  const facts = [
    `Название: ${st.name}`,
    country && `Страна: ${country}`,
    tags && `Жанры/теги: ${tags}`,
    st.bitrate && `Качество: ${st.bitrate} kbps ${st.codec || ''}`,
    st.group && `Это эксклюзив YAi из подборки «${st.group}» (${st.groupNote})`,
    st.homepage && `Официальный сайт: ${st.homepage}`,
  ]
    .filter(Boolean)
    .join('\n');
  const body =
    (await ai(STYLE, `Напиши пост «${isDay ? 'Станция дня' : 'Интересная станция'}» (3–4 предложения): чем она может понравиться и под какое настроение подходит. ${isDay ? 'Это утренний пост — можно пожелать хорошего дня.' : ''}\nФакты:\n${facts}`)) ||
    `${st.name} — ${country ? `радио из страны ${country}` : 'радио со всего мира'}${tags ? `, в эфире: ${tags}` : ''}. Включайте и слушайте бесплатно, без рекламы и регистрации.`;
  const caption =
    `${isDay ? '🌅 <b>Станция дня' : '📻 <b>Интересная станция'}: ${esc(st.name)}</b>\n` +
    `${country ? `🌍 ${esc(country)}` : ''}${st.bitrate ? ` · 🎧 ${st.bitrate} kbps` : ''}${st.group ? ' · ⭐ Эксклюзив YAi' : ''}\n\n` +
    `${esc(body)}`;
  const photo =
    (await makeCard({ label: isDay ? 'СТАНЦИЯ ДНЯ' : 'ИНТЕРЕСНАЯ СТАНЦИЯ', title: st.name, subtitle: [country, st.bitrate ? `${st.bitrate} kbps` : '', st.group ? 'Эксклюзив YAi' : ''].filter(Boolean).join(' · '), logoUrl: st.favicon })) ||
    BANNER;
  await postPhotoOrText({ photo, caption: await withFooter(caption), buttons: listenButton(`${SITE}#station=${st.stationuuid}`), silent: !isDay });
  state.stations.push(st.stationuuid);
  log('опубликована станция дня:', st.name);
}

// ---------- 1б. Веб-камера (Windy через наш сервер) ----------
const API = 'https://yaiplay-radio-api.<account-subdomain>.workers.dev';
const CAM_COUNTRIES = ['IT', 'ES', 'FR', 'DE', 'AT', 'CH', 'NO', 'IS', 'GR', 'PT', 'HR', 'NL', 'CZ', 'US', 'CA', 'JP', 'AU', 'NZ', 'GB', 'IE', 'SE', 'FI', 'PL', 'SI', 'MT', 'CY', 'TR', 'TH', 'MX', 'BR'];

async function makeCamCard(imgBuf, title, subtitle) {
  if (!sharp) return null;
  try {
    const bg = await sharp(imgBuf).resize(1280, 720, { fit: 'cover' }).modulate({ brightness: 0.9 }).png().toBuffer();
    const svg = `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></linearGradient></defs>
      <rect width="1280" height="720" fill="url(#sh)"/>
      <rect x="48" y="44" width="260" height="52" rx="26" fill="#e11d48"/>
      <text x="178" y="79" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="24" font-weight="bold" fill="#fff">● ВЕБ-КАМЕРА</text>
      <text x="56" y="600" font-family="DejaVu Sans, sans-serif" font-size="56" font-weight="bold" fill="#fff">${xmlEsc(title.length > 34 ? title.slice(0, 33) + '…' : title)}</text>
      <text x="56" y="652" font-family="DejaVu Sans, sans-serif" font-size="30" fill="#d4d4d8">${xmlEsc(subtitle)}</text>
      <text x="1232" y="680" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="26" font-weight="bold" fill="#fff">YAi <tspan fill="#1fcfeb">Radio</tspan></text>
      <text x="1232" y="706" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="16" fill="#a1a1aa">Webcams provided by windy.com</text>
    </svg>`;
    return await sharp(bg).composite([{ input: Buffer.from(svg) }]).png().toBuffer();
  } catch (e) {
    log('карточка камеры не собралась:', e.message);
    return null;
  }
}

async function postWebcam(state) {
  const content = JSON.parse(await fs.readFile(path.join(ROOT, 'public', 'content.json'), 'utf8').catch(() => '{}'));
  if ((content.hiddenSections || []).includes('webcams')) {
    log('раздел веб-камер выключен на сайте — вместо камеры станция');
    return postStation(state);
  }
  const hidden = new Set((content.hiddenCountries?.webcams || []).map((c) => c.toUpperCase()));
  state.cams = state.cams || [];
  const posted = new Set(state.cams);
  const start = (state.camIndex || 0) % CAM_COUNTRIES.length;
  for (let i = 0; i < 6; i++) {
    const cc = CAM_COUNTRIES[(start + i) % CAM_COUNTRIES.length];
    if (hidden.has(cc)) continue;
    let cams = [];
    try {
      const j = await (await fetchT(`${API}/webcams?country=${cc}&lang=ru&offset=${Math.floor(Math.random() * 3) * 50}`, {}, 20000)).json();
      cams = (j.webcams || []).filter((c) => c.image && !posted.has(c.id));
    } catch (e) {
      log('камеры недоступны:', e.message);
      continue;
    }
    cams.sort((a, b) => Number(b.live) - Number(a.live));
    for (const cam of cams.slice(0, 8)) {
      // Проверяем, что картинка настоящая (не пустая) и страница камеры открывается
      let img = null;
      try {
        const r = await fetchT(cam.image, {}, 15000);
        if (r.ok) img = Buffer.from(await r.arrayBuffer());
      } catch {}
      if (!img || !sharp) continue;
      try {
        const st = await sharp(img).stats();
        if (st.channels.slice(0, 3).reduce((a, c) => a + c.stdev, 0) / 3 < 15) continue; // однотонная — камера «спит»
      } catch {
        continue;
      }
      try {
        const pr = await fetchT(cam.page, { method: 'GET' }, 15000);
        try {
          await pr.body?.cancel();
        } catch {}
        if (pr.status === 404 || pr.status === 410) continue;
      } catch {}
      const country = COUNTRY_RU.of(cam.countryCode || cc) || cam.country;
      const place = cam.city || cam.region || country;
      const card = await makeCamCard(img, place, `${country}${cam.live ? ' · прямой эфир' : ''}`);
      const body =
        (await ai(
          STYLE,
          `Напиши короткий пост (2–3 предложения) для рубрики «Взгляд на мир»: приглашение посмотреть на это место через веб-камеру прямо сейчас. Можно одну-две общеизвестные черты места, без выдуманных подробностей.\nМесто: ${place}, ${country}\nНазвание камеры: ${cam.title}`
        )) || `Загляните в ${place} (${country}) прямо сейчас — живая картинка с веб-камеры. А под музыку YAi Radio смотреть ещё приятнее!`;
      const caption =
        `📷 <b>Взгляд на мир: ${esc(place)}</b>\n🌍 ${esc(country)}${cam.live ? ' · 🔴 онлайн' : ''}\n\n${esc(body)}\n\n<i>Webcams provided by <a href="https://www.windy.com/">windy.com</a></i>`;
      await postPhotoOrText({
        photo: card || BANNER,
        caption: await withFooter(caption),
        buttons: { inline_keyboard: [[{ text: '📷 Смотреть камеру', url: cam.page }], [{ text: '🌍 Все камеры на YAi', url: SITE + '#webcams' }]] },
        silent: true,
      });
      state.cams.push(cam.id);
      state.cams = state.cams.slice(-500);
      state.camIndex = (start + i + 1) % CAM_COUNTRIES.length;
      log('опубликована камера:', place, country);
      return;
    }
  }
  log('подходящей камеры не нашлось — вместо неё станция');
  return postStation(state);
}

// ---------- 2. Новости музыки ----------
const FEEDS = [
  ['Billboard', 'https://www.billboard.com/feed/'],
  ['NME', 'https://www.nme.com/news/music/feed'],
  ['Pitchfork', 'https://pitchfork.com/feed/feed-news/rss'],
  ['Rolling Stone', 'https://www.rollingstone.com/music/music-news/feed/'],
  ['Consequence', 'https://consequence.net/category/music/feed/'],
  ['Stereogum', 'https://www.stereogum.com/feed/'],
  ['InterMedia', 'https://www.intermedia.ru/rss/news'],
  ['Радио Record', 'https://www.radiorecord.ru/news/rss/'],
];

const strip = (s) =>
  String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function readFeed([source, url]) {
  const r = await fetchT(url);
  if (!r.ok) throw new Error(`${source} ${r.status}`);
  const xml = await r.text();
  const items = xml.split(/<item[\s>]/).slice(1).map((chunk) => {
    const tag = (t) => (chunk.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || '';
    return {
      source,
      title: strip(tag('title')),
      link: strip(tag('link')) || (chunk.match(/<guid[^>]*>(https?:[^<]+)<\/guid>/) || [])[1] || '',
      desc: strip(tag('description')).slice(0, 600),
      date: new Date(strip(tag('pubDate')) || Date.now()),
    };
  });
  return items.filter((i) => i.title && /^https?:\/\//.test(i.link));
}

async function postNews(state) {
  const posted = new Set(state.news);
  const all = (await Promise.allSettled(FEEDS.map(readFeed))).flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  const fresh = all
    .filter((i) => !posted.has(i.link) && Date.now() - i.date.getTime() < 2 * 86400000)
    .sort((a, b) => b.date - a.date);
  if (!fresh.length) return log('свежих новостей нет — в этот час пропускаем (станции и так выходят каждый час)');
  // Пробуем самые свежие (чередуя источники): нейросеть пишет по-русски и отбрасывает не-музыкальное
  const lastSource = state.lastNewsSource;
  const ordered = [...fresh.filter((i) => i.source !== lastSource), ...fresh.filter((i) => i.source === lastSource)].slice(0, 4);
  let item = null;
  let title = '';
  let body = '';
  for (const cand of ordered) {
    const text = await ai(
      STYLE,
      `Ниже анонс новости. Если она НЕ про музыку (исполнители, группы, альбомы, песни, концерты, радио, музыкальная индустрия, шоу-бизнес вокруг музыки), ответь одним словом: НЕ_МУЗЫКА.\n` +
        `Иначе перескажи её своими словами ПО-РУССКИ (имена и названия можно оставить в оригинале). Формат строго:\nЗАГОЛОВОК: <короткий заголовок по-русски>\nТЕКСТ: <2–3 предложения пересказа по-русски>\n` +
        `Опирайся только на заголовок и анонс, ничего не добавляй от себя.\n\nЗаголовок: ${cand.title}\nАнонс: ${cand.desc}`
    );
    if (!text) {
      state.news.push(cand.link); // не смогли перевести — не публикуем на английском
      continue;
    }
    if (/НЕ_МУЗЫКА/.test(text)) {
      state.news.push(cand.link);
      continue;
    }
    title = (text.match(/ЗАГОЛОВОК:\s*(.+)/) || [])[1]?.trim() || '';
    body = (text.match(/ТЕКСТ:\s*([\s\S]+)/) || [])[1]?.trim() || '';
    if (title && body && /[а-яё]/i.test(body)) {
      item = cand;
      break;
    }
    state.news.push(cand.link);
  }
  if (!item) return log('подходящей музыкальной новости нет — в этот час пропускаем');
  const caption = await withFooter(
    `🎵 <b>${esc(title)}</b>\n\n${esc(body)}\n\n🔗 Источник: <a href="${esc(item.link)}">${esc(item.source)}</a>`,
    4000
  );
  await tg('sendMessage', {
    chat_id: CHANNEL,
    text: caption,
    parse_mode: 'HTML',
    link_preview_options: { url: item.link, prefer_large_media: true },
  });
  state.news.push(item.link);
  state.lastNewsSource = item.source;
  log('опубликована новость:', item.source, item.title);
}

// ---------- 3. Обновление сайта/приложения ----------
async function postRelease(state) {
  // Не чаще раза в сутки: все непубликованные версии собираем в один пост
  const releases = JSON.parse(await fs.readFile(path.join(ROOT, 'public', 'releases.json'), 'utf8').catch(() => '[]'));
  const fresh = releases.filter((r) => !state.releases.includes(r.version));
  if (!fresh.length) return log('новых релизов для публикации нет');
  const merged = (k) => [...new Set(fresh.flatMap((r) => r[k] || []))];
  const r = fresh[0];
  // Свой пост и картинка для крупного обновления (поля post и image в releases.json)
  if (r.post) {
    const img = r.image ? await fs.readFile(path.join(ROOT, 'public', r.image)).catch(() => null) : null;
    await postPhotoOrText({
      photo: img || BANNER,
      caption: await withFooter(r.post),
      buttons: { inline_keyboard: r.buttons?.length ? r.buttons.map((b) => [{ text: b.text, url: b.url }]) : [[{ text: '📲 Скачать новую версию', url: SITE + '#apps' }], [{ text: '▶️ Слушать сейчас', url: SITE }]] },
    });
    state.releases.push(...fresh.map((x) => x.version));
    state.lastReleaseAt = Date.now();
    return log('опубликован релиз', r.version);
  }
  const list = (title, arr, icon) => (arr?.length ? `\n<b>${title}</b>\n${arr.map((x) => `${icon} ${esc(x)}`).join('\n')}\n` : '');
  const caption =
    `🚀 <b>YAi Radio обновлён до версии ${esc(r.version)}</b>\n${r.title ? `${esc(r.title)}\n` : ''}` +
    list('Что нового', merged('added'), '✨') +
    list('Улучшено', merged('improved'), '⚡') +
    list('Исправлено', merged('fixed'), '🛠') +
    list('Убрано', merged('removed'), '🗑') +
    `\nСайт обновится сам, приложение — при следующем запуске.`;
  await postPhotoOrText({ photo: BANNER, caption: await withFooter(caption), buttons: listenButton(SITE, '🚀 Открыть YAi Radio') });
  state.releases.push(...fresh.map((x) => x.version));
  state.lastReleaseAt = Date.now();
  log('опубликован релиз', r.version);
}

// ---------- 4. Вопрос подписчикам ----------
const ASKS = [
  'Какие станции или жанры добавить в YAi Radio? 🎧 Напишите нам через кнопку «Написать в поддержку» на сайте — читаем всё!',
  'Что слушаете сегодня? 📻 Поделитесь любимой станцией — лучшие попадут в рубрику «Станция дня».',
  'Есть идея, как сделать YAi Radio удобнее? 💡 Кнопка «Написать в поддержку» на сайте и в приложении — ждём ваши предложения.',
  'Нашли станцию, которая не играет? 🛠 Сообщите через «Написать в поддержку» — починим или заменим.',
];
async function postAsk(state) {
  const i = (state.askIndex || 0) % ASKS.length;
  await postPhotoOrText({ photo: null, caption: await withFooter(ASKS[i], 4000), buttons: listenButton(SITE, '✍️ Открыть сайт') });
  state.askIndex = i + 1;
  log('опубликован вопрос подписчикам');
}

// ---------- 4б. Напоминание о приложениях ----------
const PROMOS = [
  '📱 <b>YAi Radio всегда под рукой</b>\n\n🤖 <b>Android:</b> скачайте приложение (APK) на сайте — раздел «Mobile Apps». Музыка играет даже при выключенном экране, обновления приходят сами.\n🍏 <b>iPhone и iPad:</b> откройте сайт в Safari → «Поделиться» → «На экран „Домой“» — и радио станет полноценным приложением.\n\n⏳ В Google Play и App Store — скоро. Как только выйдем, объявим здесь!',
  '🎧 <b>Слушаете радио в браузере?</b>\n\nПоставьте YAi Radio как приложение — так удобнее:\n• Android — APK с нашего сайта (раздел «Mobile Apps»)\n• iPhone — Safari → «Поделиться» → «На экран „Домой“»\n\nСкоро — в Google Play и App Store. Следите за новостями канала!',
  '⭐ <b>Знаете ли вы?</b>\n\nВ YAi Radio можно собрать <b>свой плейлист</b> — просто нажимайте ♥ у любимых станций. А Radio Record — 117 официальных каналов — уже в разделе «Эксклюзив».\n\n📱 Приложение для Android — на сайте, для iPhone — через «На экран „Домой“». Google Play и App Store — скоро!',
];
async function postPromo(state) {
  const i = (state.promoIndex || 0) % PROMOS.length;
  const live = await rustoreLive();
  const text = PROMOS[i] + (live ? rustoreLine() : '');
  const kb = [[{ text: '📱 Скачать / установить', url: SITE + '#apps' }], [{ text: '▶️ Слушать сейчас', url: SITE }]];
  await postPhotoOrText({ photo: BANNER, caption: await withFooter(text), buttons: { inline_keyboard: live ? [...rustoreButtons(), ...kb] : kb } });
  state.promoIndex = i + 1;
  log('опубликовано напоминание о приложениях');
}

// ---------- 4в. Возможности сайта: «а вы знаете?» (каждые 3–4 часа) и большой рекламный пост (раз в день) ----------
// ВАЖНО: телевидение в рекламе не упоминаем никогда. Только то, что реально есть на сайте и в приложении.
const PROMO_DIR = path.join(ROOT, 'public', 'promo');
const FEATS = [
  { id: 'globe', name: 'Глобус радио', poster: 'globe', link: '#globe', btn: '🌍 Открыть глобус', facts: 'Раздел «Глобус радио»: вращаешь 3D-Землю, нажимаешь на любую точку — и слушаешь радио этого места. Тысячи станций по всему миру, зелёные точки — города с эфиром.' },
  { id: 'webcams', name: 'Веб-камеры мира', poster: 'webcams', link: '#webcams', btn: '📷 Смотреть камеры', facts: 'Раздел «Веб-камеры»: живые камеры городов, гор и пляжей мира. Выбор по стране и городу списком. Можно включить радио и смотреть камеру одновременно.' },
  { id: 'record', name: 'Radio Record — эксклюзив', poster: 'record', link: '', btn: '🔥 Слушать Radio Record', facts: '117 официальных каналов Radio Record собраны в одном месте: танцевальная музыка, хиты, клубные сеты. Качество само подстраивается под интернет.' },
  { id: 'exclusive', name: 'Эксклюзив YAi', poster: 'all', link: '', btn: '⭐ Слушать эксклюзив', facts: 'Подборка «Эксклюзив YAi»: Radio Paradise, FIP (Радио Франции), KEXP, NTS, Nightride и другие известные станции мира — официальные потоки в высоком качестве.' },
  { id: 'genres', name: 'Жанры и настроения', poster: 'all', link: '', btn: '🎵 Выбрать жанр', facts: 'Десятки жанров (рок, джаз, электроника, диско, транс, кантри, фолк, K-pop, детское, новогоднее и др.) и подборки под настроение. Станции без тегов находятся по названию.' },
  { id: 'playlist', name: 'Мой плейлист', poster: 'all', link: '', btn: '🎧 Собрать плейлист', facts: 'Нажимаешь ♥ у любимых станций — и они собираются в «Мой плейлист» на главной. Можно войти и синхронизировать избранное между телефоном и компьютером.' },
  { id: 'search', name: 'Поиск и фильтры', poster: 'all', link: '', btn: '🔍 Найти станцию', facts: 'Поиск по названию станции и фильтры рядом со списком: страна, жанр, название. Вид — плиткой или списком.' },
  { id: 'country', name: 'Радио вашей страны', poster: 'radiocam', link: '', btn: '📻 Моя страна', facts: 'Кнопка «Моя страна» сама определяет, где вы, и показывает местные станции. Более 50 000 радиостанций из почти всех стран мира.' },
  { id: 'android', name: 'Приложение для Android', poster: 'all', link: '#apps', btn: '🤖 Скачать для Android', rustore: true, facts: 'Приложение для Android (APK с нашего сайта, раздел «Mobile Apps»): радио играет при выключенном экране, управление с экрана блокировки, эквалайзер на 10 полос и мощный бас, обновления приходят сами. Работает и на Android TV.' },
  { id: 'iphone', name: 'YAi на iPhone и iPad', poster: 'iphone', link: '#apps', btn: '🍏 Как установить на iPhone', facts: 'На iPhone и iPad ничего не нужно скачивать из App Store: открыть сайт в Safari → «Поделиться» → «На экран „Домой“» — и YAi Radio работает как приложение, бесплатно. На экране блокировки — обложка песни, которая сейчас играет.' },
  { id: 'bass', name: 'Супер-бас и эквалайзер', poster: 'bass', link: '#apps', btn: '🎛 Скачать для Android', rustore: true, facts: 'В Android-приложении YAi Radio: эквалайзер на 10 полос, 10 готовых настроек («Мощный бас», «Танцевальная», «В машине», «Ночью тихо» и другие) и усиление басов до +12 дБ без перегруза. Звук меняется сразу, на любой станции.' },
  { id: 'viz', name: 'Визуализация музыки', poster: 'viz', link: '', btn: '🌈 Включить радио', facts: 'В плеере на обложке — живая визуализация музыки. В Android-приложении это настоящий спектр звука (столбики двигаются в такт песне), на сайте и iPhone — плавная анимация в такт эфиру.' },
  { id: 'tracks', name: 'Треки из эфира', poster: 'tracks', link: '', btn: '🎵 Открыть YAi', facts: 'Раздел «Треки из эфира» (Ещё → История) сам сохраняет песни, которые звучали в эфире, если станция передаёт название. Есть поиск по истории и кнопки: открыть песню в YouTube, Яндекс Музыке, Spotify или Apple Music.' },
  { id: 'car', name: 'В дороге без обрывов', poster: 'car', link: '#apps', btn: '🚗 Скачать для Android', rustore: true, facts: 'Режим «За рулём» с крупными кнопками и часами, поддержка Android Auto. В Android-приложении — защита от обрывов: запас эфира до 12 секунд и автоматическое переподключение, если связь пропала (тоннель, трасса, метро).' },
  { id: 'rustore', name: 'YAi Radio в RuStore', poster: 'rustore', link: '', btn: '', need: 'rustore', facts: 'Приложение YAi Radio теперь есть в RuStore: установка и обновления в один тап, для телефонов и планшетов на Android. Если RuStore ещё нет — его можно скачать с официального сайта rustore.ru.' },
  { id: 'bigscreen', name: 'Радио на Android TV', poster: 'bigscreen', link: '', btn: '', need: 'rustore', tv: true, facts: 'YAi Radio работает на Android TV и смарт-приставках: управление пультом, крупный интерфейс, тысячи радиостанций на большом экране. Устанавливается из RuStore для Android TV.' },
  { id: 'telegram', name: 'Радио прямо в Telegram', poster: 'all', link: 'tg', btn: '💬 Открыть в Telegram', facts: 'Наш бот открывает YAi Radio прямо внутри Telegram — кнопка «🎧 Слушать» в чате с ботом. Ничего устанавливать не нужно.' },
  { id: 'tools', name: 'Таймер сна, будильник и режим «За рулём»', poster: 'all', link: '', btn: '⏰ Попробовать', facts: 'В плеере есть таймер сна (радио само выключится), будильник с любимой станцией и режим «За рулём» с крупными кнопками.' },
  { id: 'quality', name: 'Слабый интернет — не проблема', poster: 'record', link: '', btn: '📶 Слушать', facts: 'Качество звука подстраивается под интернет: на слабой связи станция переключается на лёгкий поток и не прерывается. Можно выбрать режим «экономия трафика».' },
  { id: 'free', name: 'Бесплатно и легально', poster: 'radiocam', link: '', btn: '▶️ Слушать бесплатно', facts: 'Всё бесплатно, без рекламы от нас и без регистрации. Только официальные открытые потоки радиостанций.' },
  { id: 'history', name: 'Продолжить слушать', poster: 'all', link: '', btn: '🕘 Открыть', facts: 'На главной есть «Продолжить слушать» — последние станции в один клик, и раздел «История».' },
];
const STYLES = [
  'Начни с «А вы знаете, что…» и удиви одним фактом.',
  'Формат «Совет дня»: один полезный приём и как им воспользоваться за 10 секунд.',
  'Формат «Мало кто знает»: раскрой скрытую возможность.',
  'Начни с вопроса к читателю (например, «Хотите…?» / «Бывало, что…?») и дай ответ.',
  'Формат «3 причины попробовать» — короткий список из трёх пунктов.',
  'Формат «Попробуйте прямо сейчас»: пошагово 2–3 шага.',
  'Формат мини-истории: ситуация из жизни (утро, дорога, вечер, работа) и как тут помогает YAi Radio.',
  'Формат «Лайфхак для меломана».',
];
const CTAS = [
  'Подпишитесь на канал, чтобы не пропустить новые фишки.',
  'Поделитесь постом с другом, который любит музыку.',
  'Установите приложение — так ещё удобнее.',
  'Сохраните пост, чтобы не потерять.',
  'Расскажите в комментариях, что слушаете вы.',
];
const NO_TV_RE = /телевид|телеканал|\bТВ\b|\bTV\b|iptv|сериал|фильм/i;
// «Android TV» — это устройство (можно), а телеканалы и ТВ-трансляции в рекламе не упоминаем никогда
const NO_TV = { test: (t) => NO_TV_RE.test(String(t).replace(/Android\s*TV/gi, '')) };
const cleanHtml = (t) => String(t).replace(/<(?!\/?(b|i)>)[^>]*>/g, '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').trim();
const featLink = (f) => (f.link === 'tg' ? (BOT_USERNAME ? `https://t.me/${BOT_USERNAME}?startapp` : SITE) : SITE + (f.link || ''));
const promoImg = async (name) => fs.readFile(path.join(PROMO_DIR, name + '.jpg')).catch(() => null);

async function postFeature(state) {
  await footer(); // узнаём имя бота для ссылок
  const recent = state.featRecent || [];
  const live = await rustoreLive();
  const avail = FEATS.filter((f) => f.need !== 'rustore' || live);
  const pool = avail.filter((f) => !recent.includes(f.id));
  const f = (pool.length ? pool : avail)[Math.floor(Math.random() * (pool.length || avail.length))];
  const si = (state.featStyle || 0) % STYLES.length;
  const cta = CTAS[(state.featCta || 0) % CTAS.length];
  let text = await ai(
    'Ты ведёшь Telegram-канал YAi Radio (бесплатное легальное радио со всего мира: сайт, Android, iPhone, Telegram). ' +
      'Пиши по-русски, живо и дружелюбно, как будто общаешься с подписчиками, 350–650 символов, 2–4 уместных эмодзи. ' +
      'Первая строка — цепляющий заголовок в <b>…</b>. Разметка: только <b> и <i>, без Markdown, без ссылок и хэштегов. ' +
      'Пиши ТОЛЬКО о том, что дано в фактах, ничего не выдумывай. Никогда не упоминай телевидение, телеканалы, фильмы и сериалы (Android TV как устройство упоминать можно, только если оно есть в фактах). ' +
      'В конце — один призыв к действию.',
    `Возможность: ${f.name}.\nФакты: ${f.facts}\nПодача: ${STYLES[si]}\nПризыв в конце: ${cta}`,
    500
  );
  if (text) text = cleanHtml(text);
  if (!text || text.length < 120 || NO_TV.test(text)) {
    text = `<b>${['А вы знаете? 🤔', 'Совет дня 💡', 'Мало кто знает 👀', 'Попробуйте сегодня ✨'][si % 4]} ${f.name}</b>\n\n${f.facts}\n\n${cta}`;
  }
  // Ссылки RuStore — в постах про RuStore/Android TV и в рекламе Android-приложения (когда оно уже в RuStore)
  const withStore = live && (f.need === 'rustore' || f.rustore);
  if (withStore) text += rustoreLine(!!f.tv);
  const link = f.need === 'rustore' ? RUSTORE_APP : featLink(f);
  const img = await promoImg(f.poster);
  const kb = f.need === 'rustore' ? rustoreButtons(!!f.tv) : [[{ text: f.btn, url: link }], ...(withStore ? rustoreButtons() : [[{ text: '📱 Приложения', url: SITE + '#apps' }]])];
  await postPhotoOrText({
    photo: img || BANNER,
    caption: await withFooter(text),
    buttons: { inline_keyboard: kb },
    silent: true,
  });
  state.featRecent = [...recent, f.id].slice(-Math.min(8, FEATS.length - 1));
  state.featStyle = si + 1;
  state.featCta = (state.featCta || 0) + 1;
  log('опубликована возможность сайта:', f.name);
}

const SHOWCASES = [
  `🎧 <b>YAi Radio — весь мир музыки в одном месте</b>\n\nБесплатно, без регистрации, только официальные потоки:\n\n📻 <b>50 000+ радиостанций</b> со всего мира\n🌍 <b>Глобус радио</b> — крутите Землю и слушайте любой уголок мира\n🔥 <b>Radio Record</b> — 117 официальных каналов\n⭐ <b>Эксклюзив</b> — Radio Paradise, FIP, KEXP, NTS и другие\n🎵 <b>Жанры и настроения</b> — от джаза до транса\n📷 <b>Веб-камеры мира</b> в прямом эфире\n🎧 <b>Мой плейлист</b> из избранного\n🎛 <b>Супер-бас и эквалайзер</b> в Android-приложении\n⏰ Таймер сна, будильник, режим «За рулём»\n📱 Android, iPhone, iPad и прямо в Telegram\n\n👇 Перешлите друзьям — пусть тоже слушают бесплатно!`,
  `🌍 <b>Радио со всего мира — в кармане</b>\n\nЧто умеет YAi Radio:\n\n• 50 000+ станций: ваша страна в один клик\n• 3D-глобус: нажали на город — играет его радио\n• Radio Record: 117 каналов танцевальной музыки\n• Эксклюзивные станции мира в высоком качестве\n• Веб-камеры городов, гор и пляжей\n• Плейлист из любимых станций, история, поиск\n• Таймер сна и будильник с любимой станцией\n• Играет при выключенном экране (Android)\n\n💚 Бесплатно, легально, без регистрации.\n📤 Поделитесь постом — это лучшая поддержка проекта!`,
  `📻 <b>Одно приложение — тысячи эфиров</b>\n\nYAi Radio — это:\n\n✅ 50 000+ легальных радиостанций\n✅ Глобус радио и веб-камеры мира\n✅ Radio Record и эксклюзивы YAi\n✅ Жанры, настроения, умный поиск\n✅ Мой плейлист и «Продолжить слушать»\n✅ Таймер сна, будильник, режим «За рулём»\n✅ Сайт, Android, iPhone/iPad и Telegram\n\nВсё бесплатно и без регистрации.\n🔁 Отправьте этот пост другу или в свой канал!`,
];
async function postShowcase(state) {
  await footer();
  const i = (state.showIndex || 0) % SHOWCASES.length;
  const live = await rustoreLive();
  const text = SHOWCASES[i] + (live ? rustoreLine() : '');
  const img = await promoImg(['all', 'radiocam', 'all'][i] || 'all');
  const share = `https://t.me/share/url?url=${encodeURIComponent(SITE)}&text=${encodeURIComponent('YAi Radio — 50 000+ радиостанций со всего мира бесплатно 🎧')}`;
  await postPhotoOrText({
    photo: img || BANNER,
    caption: await withFooter(text),
    buttons: { inline_keyboard: [[{ text: '▶️ Слушать бесплатно', url: SITE }], ...(live ? [[{ text: '📥 YAi Radio в RuStore', url: RUSTORE_APP }]] : []), [{ text: '📱 Приложения', url: SITE + '#apps' }, { text: '📤 Поделиться', url: share }]] },
  });
  state.showIndex = i + 1;
  log('опубликован большой рекламный пост');
}

// ---------- 5. Настройка бота (кнопка «Слушать» в чате с ботом — мини-приложение) ----------
async function setup() {
  await tg('setChatMenuButton', { menu_button: { type: 'web_app', text: '🎧 Слушать', web_app: { url: SITE } } });
  await tg('setMyDescription', { description: 'YAi Radio — тысячи радиостанций со всего мира бесплатно. Нажмите «🎧 Слушать», чтобы открыть радио прямо в Telegram.' });
  await tg('setMyShortDescription', { short_description: 'Радио со всего мира — бесплатно, без рекламы 📻' });
  await tg('setMyCommands', { commands: [{ command: 'start', description: 'Открыть YAi Radio' }] });
  log('бот настроен: кнопка «Слушать» открывает сайт как мини-приложение');
}

// ---------- запуск ----------
// Расписание приходит из GitHub (строка cron), по ней понимаем, что публиковать
// Один пост в час, с 07 до 22 по Берлину (зимой UTC+1, летом UTC+2) — 16 постов в день:
// станции ×5 (с «станцией дня»), новости ×3, «фишки» с постерами ×4, веб-камеры ×3, большой рекламный пост ×1.
// В воскресенье вечером вместо станции — вопрос подписчикам.
const HOURLY = { 11: 'day', 19: 'news' };
function autoMode() {
  const now = new Date();
  const h = now.getUTCHours();
  if (now.getUTCDay() === 0 && h === 18) return 'ask';
  return HOURLY[h] || 'none';
}

const mode = (process.argv[2] || 'auto') === 'auto' ? autoMode() : process.argv[2];
if (mode === 'none') {
  log('в этот час пост не запланирован');
  process.exit(0);
}

if (!DRY_RUN && !TOKEN) {
  log('Не задан TELEGRAM_BOT_TOKEN — реальную отправку пропускаю.');
  process.exit(0);
}
const state = await loadState();
try {
  if (mode === 'day') await postStation(state, true);
  else if (mode === 'station') await postStation(state);
  else if (mode === 'promo') await postPromo(state);
  else if (mode === 'feature') await postFeature(state);
  else if (mode === 'showcase') await postShowcase(state);
  else if (mode === 'webcam') await postWebcam(state);
  else if (mode === 'news') await postNews(state);
  else if (mode === 'release') await postRelease(state);
  else if (mode === 'ask') await postAsk(state);
  else if (mode === 'setup') await setup();
  else log('неизвестный режим', mode);
} finally {
  state.aiError = AI_ERROR || undefined;
  if (!DRY_RUN) await saveState(state);
  else log('[DRY_RUN] Состояние публикаций не изменено.');
}
