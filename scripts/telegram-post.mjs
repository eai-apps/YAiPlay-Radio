/**
 * Автопостинг в Телеграм-канал YAiPlay Radio.
 *   node scripts/telegram-post.mjs <mode>
 *   mode: auto | day | station | news | release | ask | promo | setup
 * Тексты пишет нейросеть Google Gemini (бесплатный ключ); если она недоступна — шаблоны.
 * Нужны секреты: TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL (@имя_канала), GEMINI_API_KEY.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Posters from './posters.mjs';

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
const rustoreLine = () => `\n\n📥 <b>RuStore:</b> <a href="${RUSTORE_APP}">YAiPlay Radio</a> · нет RuStore? <a href="${RUSTORE_GET}">скачать RuStore</a>`;
const rustoreButtons = () => [[{ text: '📥 YAiPlay Radio в RuStore', url: RUSTORE_APP }], [{ text: '⬇️ Нет RuStore? Скачать', url: RUSTORE_GET }]];
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
const listenButton = (url, text = '▶️ Слушать в YAiPlay Radio') => ({ inline_keyboard: [[{ text, url }]] });

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
    `🎧 Слушать: <a href="${SITE}">в браузере</a> · <a href="${SITE}#apps">Android</a> · <a href="${SITE}#apps">iPhone/iPad</a>`
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

// Черновики для владельца: картинка + текст + кнопки в папке drafts/ (workflow выкладывает её как архив)
const DRAFTS = path.join(ROOT, 'drafts');
async function saveDraft({ photo, caption, buttons }) {
  try {
    await fs.mkdir(DRAFTS, { recursive: true });
    const name = `${new Date().toISOString().slice(0, 10)}-${process.argv[2] || 'auto'}`;
    let img = '';
    if (Buffer.isBuffer(photo)) {
      await fs.writeFile(path.join(DRAFTS, name + '.png'), photo);
      img = name + '.png';
    } else if (photo) img = photo;
    const kb = (buttons?.inline_keyboard || []).flat().map((b) => `<a class="btn" href="${b.url}">${esc(b.text)}</a>`).join('');
    await fs.writeFile(
      path.join(DRAFTS, name + '.html'),
      `<!doctype html><meta charset="utf-8"><body style="background:#0e1621;color:#fff;font:16px system-ui;max-width:560px;margin:20px auto">` +
        `<style>.btn{display:block;margin:6px 0;padding:10px;border-radius:10px;background:#2b5278;color:#fff;text-align:center;text-decoration:none}a{color:#6ab3f3}</style>` +
        (img ? `<img src="${img}" style="width:100%;border-radius:12px">` : '') +
        `<div style="white-space:pre-wrap;background:#182533;padding:14px;border-radius:12px;margin-top:6px">${caption}</div>${kb}</body>`
    );
    await fs.writeFile(path.join(DRAFTS, name + '.json'), JSON.stringify({ caption, buttons }, null, 1));
    log('черновик сохранён:', name);
  } catch (e) {
    log('черновик не сохранился:', e.message);
  }
}

async function postPhotoOrText({ photo, caption, buttons, preview = false, silent = false }) {
  if (DRY_RUN) {
    log('[DRY_RUN] Черновик Telegram-поста:', JSON.stringify({ channel: CHANNEL, caption, hasPhoto: !!photo, buttons, silent: SILENT || silent }));
    await saveDraft({ photo, caption, buttons });
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
    const flat = await sharp(buf).resize(380, 380, { fit: 'contain', background: { r: 20, g: 18, b: 46, alpha: 1 } }).flatten({ background: '#14122e' }).png().toBuffer();
    const st = await sharp(flat).stats();
    const spread = st.channels.slice(0, 3).reduce((a, c) => a + c.stdev, 0) / 3;
    if (spread < 12) return null; // почти однотонная — значит пустая/белая
    return flat;
  } catch {
    return null;
  }
}

async function makeCard({ label, title, subtitle, logoUrl, tags = [] }) {
  try {
    return await Posters.stationCard({ label, title, subtitle, tags, logoBuf: await stationLogo(logoUrl) });
  } catch (e) {
    log('карточка станции не собралась:', e.message);
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
  'Ты ведёшь Телеграм-канал YAiPlay Radio — бесплатного сайта и приложения с радиостанциями со всего мира. ' +
  'Пиши по-русски, живо и дружелюбно, коротко, 1–2 уместных эмодзи. Без хештегов, без markdown, без ссылок. ' +
  'НИКОГДА не выдумывай факты: используй только то, что дано. Если фактов мало — говори о жанре и настроении в общих словах.';

// ---------- 1. Станция дня ----------
const COUNTRY_RU = new Intl.DisplayNames(['ru'], { type: 'region' });
const ROTATION = ['DE', 'FR', 'IT', 'ES', 'GB', 'US', 'BR', 'JP', 'NL', 'PL', 'UA', 'KZ', 'GR', 'TR', 'MX', 'CA', 'AU', 'SE', 'CZ', 'PT', 'AR', 'IN', 'KR', 'CH', 'AT', 'IE', 'NO', 'FI', 'BE', 'IL', 'RS', 'GE', 'AM', 'BY', 'LT', 'LV', 'EE', 'RO', 'BG', 'HU'];

/** Поток играет на нашем сайте? (проверяем с адресом сайта — станции, запрещающие чужие сайты, отсеются) */
async function streamOk(url) {
  try {
    const r = await fetchT(url, { headers: { 'Icy-MetaData': '0', Referer: 'https://yaiplay-radio.pages.dev/', Origin: 'https://yaiplay-radio.pages.dev' } }, 10000);
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
    (await ai(STYLE, `Напиши пост «${isDay ? 'Станция дня' : 'Интересная станция'}» (3–4 предложения): чем она может понравиться и под какое настроение подходит. ${isDay ? 'Пост выходит днём — можно пожелать хорошего дня.' : ''}\nФакты:\n${facts}`)) ||
    [
      `Сегодня советуем послушать ${st.name}.${tags ? ` В эфире: ${tags}.` : ''} Включайте одним нажатием — бесплатно и без регистрации. Хорошего дня! ☀️`,
      `Наша находка дня — ${st.name}${country ? ` (${country})` : ''}.${tags ? ` Звучит: ${tags}.` : ''} Отличный фон для работы, дороги или вечера 🎧`,
      `${st.name} — станция, которую стоит добавить в избранное ❤️${tags ? ` В эфире: ${tags}.` : ''} Слушайте в браузере или в приложении YAiPlay Radio.`,
    ][state.stations.length % 3];
  const caption =
    `${isDay ? '☀️ <b>Станция дня' : '📻 <b>Интересная станция'}: ${esc(st.name)}</b>\n` +
    `${country ? `🌍 ${esc(country)}` : ''}${st.bitrate ? ` · 🎧 ${st.bitrate} kbps` : ''}${st.group ? ' · ⭐ Эксклюзив YAi' : ''}\n\n` +
    `${esc(body)}`;
  const photo =
    (await makeCard({ label: isDay ? 'СТАНЦИЯ ДНЯ' : 'ИНТЕРЕСНАЯ СТАНЦИЯ', title: st.name, subtitle: [country, st.bitrate ? `${st.bitrate} kbps` : '', st.group ? 'Эксклюзив YAi' : ''].filter(Boolean).join(' · '), logoUrl: st.favicon, tags: String(st.tags || '').split(',').map((t) => t.trim()).filter((t) => t && t.length < 18).slice(0, 4) })) ||
    BANNER;
  await postPhotoOrText({ photo, caption: await withFooter(caption), buttons: listenButton(`${SITE}#station=${st.stationuuid}`), silent: !isDay });
  state.stations.push(st.stationuuid);
  log('опубликована станция дня:', st.name);
}

// ---------- 1б. Веб-камера (Windy через наш сервер) ----------
const API = 'https://yaiplay-radio-api.yai-media-player.workers.dev';
// Дороги, трассы, парковки и стройки — не «взгляд на мир», такие камеры не берём
const BORING = /highway|freeway|interstate|\bI-\d|\broad\b|traffic|parking|motorway|autobahn|autostrada|\bDOT\b|\broute\b|street|construction|baustelle|шоссе|трасс|дорог|парковк/i;
const CAM_COUNTRIES = ['IT', 'ES', 'FR', 'DE', 'AT', 'CH', 'NO', 'IS', 'GR', 'PT', 'HR', 'NL', 'CZ', 'US', 'CA', 'JP', 'AU', 'NZ', 'GB', 'IE', 'SE', 'FI', 'PL', 'SI', 'MT', 'CY', 'TR', 'TH', 'MX', 'BR'];

async function makeCamCard(imgBuf, title, subtitle) {
  try {
    return await Posters.camCard({ imgBuf, title, subtitle, live: /эфир/.test(subtitle) });
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
  // Сначала страны, где сейчас светло (местное время 8–17): вечером по Берлину это Америка, утром — Азия и Австралия
  const OFF = { US: -6, CA: -5, MX: -6, BR: -3, JP: 9, AU: 10, NZ: 12, TH: 7, TR: 3, IS: 0, PT: 0, GB: 0, IE: 0, GR: 2, FI: 2, CY: 2 };
  const localHour = (cc) => (new Date().getUTCHours() + (OFF[cc] ?? 1) + 24) % 24;
  const order = CAM_COUNTRIES.map((_, i) => CAM_COUNTRIES[(start + i) % CAM_COUNTRIES.length]);
  const day = order.filter((c) => localHour(c) >= 8 && localHour(c) <= 17);
  const list = [...day, ...order.filter((c) => !day.includes(c))].slice(0, 10);
  for (let i = 0; i < list.length; i++) {
    const cc = list[i];
    if (hidden.has(cc)) continue;
    let cams = [];
    try {
      const j = await (await fetchT(`${API}/webcams?country=${cc}&lang=ru&offset=${Math.floor(Math.random() * 3) * 50}`, {}, 20000)).json();
      cams = (j.webcams || []).filter((c) => c.image && !posted.has(c.id) && !BORING.test(`${c.title} ${c.city || ''}`));
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
        if ((await sharp(img).metadata()).width < 600) continue; // мелкая картинка — будет мыльной
        if (st.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3 < 75) continue; // там сейчас ночь — темно, ищем светлую картинку
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
        )) || `Загляните в ${place} (${country}) прямо сейчас — живая картинка с веб-камеры. А под музыку YAiPlay Radio смотреть ещё приятнее!`;
      const caption =
        `📷 <b>Взгляд на мир: ${esc(place)}</b>\n🌍 ${esc(country)}${cam.live ? ' · 🔴 онлайн' : ''}\n\n${esc(body)}\n\n<i>Webcams provided by <a href="https://www.windy.com/">windy.com</a></i>`;
      await postPhotoOrText({
        photo: card || BANNER,
        caption: await withFooter(caption),
        buttons: { inline_keyboard: [[{ text: '📷 Смотреть камеру', url: cam.page }], [{ text: '🌍 Все камеры в YAiPlay Radio', url: SITE + '#webcams' }]] },
        silent: true,
      });
      state.cams.push(cam.id);
      state.cams = state.cams.slice(-500);
      state.camIndex = (CAM_COUNTRIES.indexOf(cc) + 1) % CAM_COUNTRIES.length;
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
    `🚀 <b>YAiPlay Radio обновлён до версии ${esc(r.version)}</b>\n${r.title ? `${esc(r.title)}\n` : ''}` +
    list('Что нового', merged('added'), '✨') +
    list('Улучшено', merged('improved'), '⚡') +
    list('Исправлено', merged('fixed'), '🛠') +
    list('Убрано', merged('removed'), '🗑') +
    `\nСайт обновится сам, приложение — при следующем запуске.`;
  await postPhotoOrText({ photo: BANNER, caption: await withFooter(caption), buttons: listenButton(SITE, '🚀 Открыть YAiPlay Radio') });
  state.releases.push(...fresh.map((x) => x.version));
  state.lastReleaseAt = Date.now();
  log('опубликован релиз', r.version);
}

// ---------- 4. Вопрос подписчикам ----------
const ASKS = [
  'Какие станции или жанры добавить в YAiPlay Radio? 🎧 Напишите нам через кнопку «Написать в поддержку» на сайте — читаем всё!',
  'Что слушаете сегодня? 📻 Поделитесь любимой станцией — лучшие попадут в рубрику «Станция дня».',
  'Есть идея, как сделать YAiPlay Radio удобнее? 💡 Кнопка «Написать в поддержку» на сайте и в приложении — ждём ваши предложения.',
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
  '📱 <b>YAiPlay Radio всегда под рукой</b>\n\n🤖 <b>Android:</b> скачайте приложение (APK) на сайте — раздел «Mobile Apps». Музыка играет даже при выключенном экране, обновления приходят сами.\n🍏 <b>iPhone и iPad:</b> откройте сайт в Safari → «Поделиться» → «На экран „Домой“» — и радио станет полноценным приложением.\n\n⏳ В Google Play и App Store — скоро. Как только выйдем, объявим здесь!',
  '🎧 <b>Слушаете радио в браузере?</b>\n\nПоставьте YAiPlay Radio как приложение — так удобнее:\n• Android — APK с нашего сайта (раздел «Mobile Apps»)\n• iPhone — Safari → «Поделиться» → «На экран „Домой“»\n\nСкоро — в Google Play и App Store. Следите за новостями канала!',
  '⭐ <b>Знаете ли вы?</b>\n\nВ YAiPlay Radio можно собрать <b>свой плейлист</b> — просто нажимайте ♥ у любимых станций. А Radio Record — 117 официальных каналов — уже в разделе «Эксклюзив».\n\n📱 Приложение для Android — на сайте, для iPhone — через «На экран „Домой“». Google Play и App Store — скоро!',
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
// План «А вы знали?» на 2 недели: по одной возможности в день, по порядку (state.featIndex).
// Только то, что реально работает на сайте. Android-функции (эквалайзер, «За рулём», будильник, запись, синхронизация)
// сюда добавлять только после проверки владельцем на устройстве.
const FEATS = [
  { id: 'globe', post: "<b>🌍 А вы знали? В YAiPlay Radio есть глобус радио</b>\n\nКрутите Землю пальцем или мышкой и нажимайте на любую светящуюся точку — сразу заиграет радио этого города. Токио, Рио, Рейкьявик или соседний город — всё в одно касание.\n\nНа глобусе уже больше 2 600 городов. Отличный способ найти радио, о котором вы никогда не слышали 🎧\n\n👉 Откройте глобус и отправьтесь в путешествие по эфирам мира.", name: 'Глобус радио', poster: 'yai-globe', link: '#globe', btn: '🌍 Открыть глобус', facts: 'Раздел «Глобус радио»: вращаешь Землю, нажимаешь на светящуюся точку — и играет радио этого города. На глобусе больше 2 600 городов.' },
  { id: 'webcams', post: "<b>📷 А вы знали? Радио можно слушать и смотреть на мир</b>\n\nВ разделе «Веб-камеры» — живые камеры городов, гор и пляжей. Выбираете страну и город, включаете любимую станцию — и смотрите, что происходит там прямо сейчас.\n\nУтренний кофе с видом на Альпы или вечер с огнями большого города — под свою музыку ☕\n\n👉 Загляните в раздел «Веб-камеры».", name: 'Веб-камеры мира', poster: 'yai-webcams', link: '#webcams', btn: '📷 Смотреть камеры', facts: 'Раздел «Веб-камеры»: живые камеры городов, гор и пляжей мира, выбор по стране и городу. Можно включить радио и смотреть камеру одновременно.' },
  { id: 'record', post: "<b>🔥 А вы знали? Radio Record — в одно нажатие</b>\n\nНа главной есть кнопка «Radio Record · эксклюзив YAi»: официальные каналы Radio Record собраны в одном месте. Танцевальная музыка, хиты, клубные сеты — выбирайте канал под настроение.\n\n👉 Включите Record и сделайте погромче 🎶", name: 'Radio Record — эксклюзив', poster: 'yai-record', link: '', btn: '🔥 Слушать Radio Record', facts: 'На главной — кнопка «Radio Record · эксклюзив YAi»: официальные каналы Radio Record в одном месте — танцевальная музыка, хиты, клубные сеты.' },
  { id: 'moods', post: "<b>✨ А вы знали? Радио можно выбрать под настроение</b>\n\nВ разделе «Настроение» станции собраны под занятие: для работы и фокуса, для бега и тренировок, для йоги и медитации, для отдыха и даже для глубокого сна.\n\nА на главной — «Подборки YAi»: готовые плейлисты, станции в них регулярно проверяются 💜\n\n👉 Какое у вас настроение сегодня?", name: 'Настроение', poster: 'yai-moods', link: '', btn: '✨ Выбрать настроение', facts: 'Раздел «Настроение»: радио под настроение и занятие — для работы и фокуса, бега и тренировок, йоги и медитации, отдыха, глубокого сна. И «Подборки YAi» на главной — готовые плейлисты, станции в них проверяются.' },
  { id: 'playlist', post: "<b>❤️ А вы знали? Любимые станции — всегда под рукой</b>\n\nНажмите ♥ у станции — и она попадёт в «Избранное». А в «Моих плейлистах» можно собрать свои списки: для дороги, для работы, для вечера.\n\nОдин раз собрали — дальше включаете в одно касание 🎧\n\n👉 Начните свой первый плейлист сегодня.", name: 'Мои плейлисты', poster: 'yai-playlist', link: '', btn: '❤️ Собрать плейлист', facts: 'Нажимаешь ♥ у станции — и она в «Избранном». А в «Моих плейлистах» можно собрать свои списки станций под любое настроение.' },
  { id: 'country', post: "<b>📍 А вы знали? Радио вашей страны — одной кнопкой</b>\n\nКнопка «Моя страна» сама показывает станции вашей страны. А если хочется сменить обстановку — выберите любую другую страну мира из списка 🌍\n\n👉 Нажмите «Моя страна» и послушайте, что звучит рядом.", name: 'Радио вашей страны', poster: 'yai-country', link: '', btn: '📍 Моя страна', facts: 'Кнопка «Моя страна» сама показывает станции вашей страны. Можно выбрать и любую другую страну мира из списка.' },
  { id: 'lucky', post: "<b>🎲 А вы знали? Есть кнопка «Мне повезёт»</b>\n\nНе знаете, что включить? Нажмите «Мне повезёт» — и заиграет случайная станция. Так легко найти радио, о котором вы бы никогда не узнали.\n\nА рядом — «В тренде»: что слушают прямо сейчас 📈\n\n👉 Испытайте удачу — что выпадет вам?", name: 'Мне повезёт', poster: 'yai-lucky', link: '', btn: '🎲 Мне повезёт', facts: 'Кнопка «Мне повезёт» на главной включает случайную станцию — так легко найти новое радио, о котором вы не знали. Рядом — «В тренде»: что слушают сейчас.' },
  { id: 'genres', post: "<b>🎵 А вы знали? Любой жанр — в два касания</b>\n\nВ разделе «Жанры» — рок, джаз, поп, электроника, классика, ретро, шансон и многое другое. Выбираете жанр — и слушаете станции со всего мира.\n\n👉 Выберите жанр и включите что-нибудь новое 🎸", name: 'Жанры', poster: 'yai-genres', link: '', btn: '🎵 Выбрать жанр', facts: 'Раздел «Жанры»: рок, джаз, электроника, поп, классика, шансон, ретро и многое другое — выбираешь жанр и слушаешь станции со всего мира.' },
  { id: 'history', post: "<b>🕘 А вы знали? YAiPlay Radio помнит, что вы слушали</b>\n\nВ «Истории эфиров» сохраняются станции, которые вы включали, и треки из эфира — если станция передаёт название песни. Услышали что-то классное, но не успели запомнить? Загляните в историю 🎶\n\n👉 Откройте «Историю эфиров» — там уже может быть ваша новая любимая песня.", name: 'История эфиров', poster: 'yai-history', link: '', btn: '🕘 Открыть историю', facts: 'Раздел «История эфиров» сам запоминает станции, которые вы слушали, и песни из эфира, если станция передаёт название. Понравилась песня — легко найти её потом.' },
  { id: 'sleep', post: "<b>🌙 А вы знали? Радио может выключиться само</b>\n\nНажмите «Сон» в плеере и выберите время — радио плавно затихнет и выключится. Можно спокойно засыпать под любимую музыку и не думать о телефоне 😴\n\n👉 Попробуйте сегодня вечером.", name: 'Таймер сна', poster: 'yai-sleep', link: '', btn: '🌙 Включить радио', facts: 'Кнопка «Сон» в плеере: выбираете время — и радио плавно затихнет и выключится само. Удобно засыпать под музыку.' },
  { id: 'search', post: "<b>🔍 А вы знали? Станцию можно найти за секунды</b>\n\nПоиск вверху экрана ищет по названию станции, городу или жанру. Тысячи станций со всего мира — просто начните печатать 🎧\n\n👉 Найдите радио своего города.", name: 'Поиск станций', poster: 'yai-search', link: '', btn: '🔍 Найти станцию', facts: 'Поиск по названию станции, городу или жанру прямо вверху экрана. Тысячи станций со всего мира — находите свою за секунды.' },
  { id: 'groups', post: "<b>📻 А вы знали? Все каналы одной станции — в одном месте</b>\n\nВ разделе «Группы (A–Z)» известные радиосети собраны вместе: все каналы одной станции рядом, по алфавиту. Удобно, когда у любимого радио много потоков 🎚\n\n👉 Откройте «Группы» и найдите свою.", name: 'Группы A–Z', poster: 'yai-groups', link: '', btn: '📻 Открыть группы', facts: 'Раздел «Группы (A–Z)»: известные радиосети собраны вместе — все каналы одной станции в одном месте, по алфавиту.' },
  { id: 'lite', post: "<b>📶 А вы знали? Радио работает даже на слабом интернете</b>\n\nВ меню есть «Лёгкий режим», а для совсем медленной связи — отдельная 2G-версия сайта. Она загружается быстро даже за городом, в дороге или на старом телефоне 🚗\n\n👉 Сохраните, чтобы не потерять.", name: 'Лёгкий режим и 2G', poster: 'yai-lite', link: '', btn: '📶 Слушать', facts: 'Слабый интернет или старый телефон? В меню есть «Лёгкий режим» и отдельная 2G-версия сайта — она грузится быстро даже на очень медленной связи.' },
  { id: 'free', post: "<b>💚 YAiPlay Radio — бесплатно и без регистрации</b>\n\nНикаких подписок, рекламы от нас и аккаунтов: открыли — и слушаете. Только официальные открытые потоки радиостанций со всего мира 🌍\n\n👉 Поделитесь каналом с другом, который любит музыку.", name: 'Бесплатно и без регистрации', poster: 'yai-free', link: '', btn: '▶️ Слушать бесплатно', facts: 'YAiPlay Radio — бесплатно, без рекламы от нас и без регистрации. Только официальные открытые потоки радиостанций со всего мира.' },
];
const STYLES = [
  'Начни с «А вы знаете, что…» и удиви одним фактом.',
  'Формат «Совет дня»: один полезный приём и как им воспользоваться за 10 секунд.',
  'Формат «Мало кто знает»: раскрой скрытую возможность.',
  'Начни с вопроса к читателю (например, «Хотите…?» / «Бывало, что…?») и дай ответ.',
  'Формат «3 причины попробовать» — короткий список из трёх пунктов.',
  'Формат «Попробуйте прямо сейчас»: пошагово 2–3 шага.',
  'Формат мини-истории: ситуация из жизни (утро, дорога, вечер, работа) и как тут помогает YAiPlay Radio.',
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
  // по плану: каждый день следующая возможность, через 2 недели круг повторяется
  const f = avail[(state.featIndex || 0) % avail.length];
  state.featIndex = (state.featIndex || 0) + 1;
  const si = (state.featStyle || 0) % STYLES.length;
  const cta = CTAS[(state.featCta || 0) % CTAS.length];
  // Текст поста написан заранее и сверен с сайтом; нейросеть — только если текста нет
  let text = f.post || null;
  if (!text) text = await ai(
    'Ты ведёшь Telegram-канал YAiPlay Radio (бесплатное легальное радио со всего мира: сайт и приложение). ' +
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
  const kb = f.need === 'rustore' ? rustoreButtons(!!f.tv) : [[{ text: f.btn, url: link }], ...(withStore ? rustoreButtons() : [])];
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
  `🎧 <b>YAiPlay Radio — весь мир музыки в одном месте</b>\n\nБесплатно, без регистрации, только официальные потоки:\n\n📻 <b>50 000+ радиостанций</b> со всего мира\n🌍 <b>Глобус радио</b> — крутите Землю и слушайте любой уголок мира\n🔥 <b>Radio Record</b> — 117 официальных каналов\n⭐ <b>Эксклюзив</b> — Radio Paradise, FIP, KEXP, NTS и другие\n🎵 <b>Жанры и настроения</b> — от джаза до транса\n📷 <b>Веб-камеры мира</b> в прямом эфире\n🎧 <b>Мой плейлист</b> из избранного\n🎛 <b>Супер-бас и эквалайзер</b> в Android-приложении\n⏰ Таймер сна, будильник, режим «За рулём»\n📱 Android, iPhone, iPad и прямо в Telegram\n\n👇 Перешлите друзьям — пусть тоже слушают бесплатно!`,
  `🌍 <b>Радио со всего мира — в кармане</b>\n\nЧто умеет YAiPlay Radio:\n\n• 50 000+ станций: ваша страна в один клик\n• 3D-глобус: нажали на город — играет его радио\n• Radio Record: 117 каналов танцевальной музыки\n• Эксклюзивные станции мира в высоком качестве\n• Веб-камеры городов, гор и пляжей\n• Плейлист из любимых станций, история, поиск\n• Таймер сна и будильник с любимой станцией\n• Играет при выключенном экране (Android)\n\n💚 Бесплатно, легально, без регистрации.\n📤 Поделитесь постом — это лучшая поддержка проекта!`,
  `📻 <b>Одно приложение — тысячи эфиров</b>\n\nYAiPlay Radio — это:\n\n✅ 50 000+ легальных радиостанций\n✅ Глобус радио и веб-камеры мира\n✅ Radio Record и эксклюзивы YAi\n✅ Жанры, настроения, умный поиск\n✅ Мой плейлист и «Продолжить слушать»\n✅ Таймер сна, будильник, режим «За рулём»\n✅ Сайт, Android, iPhone/iPad и Telegram\n\nВсё бесплатно и без регистрации.\n🔁 Отправьте этот пост другу или в свой канал!`,
];
async function postShowcase(state) {
  await footer();
  const i = (state.showIndex || 0) % SHOWCASES.length;
  const live = await rustoreLive();
  const text = SHOWCASES[i] + (live ? rustoreLine() : '');
  const img = await promoImg(['all', 'radiocam', 'all'][i] || 'all');
  const share = `https://t.me/share/url?url=${encodeURIComponent(SITE)}&text=${encodeURIComponent('YAiPlay Radio — 50 000+ радиостанций со всего мира бесплатно 🎧')}`;
  await postPhotoOrText({
    photo: img || BANNER,
    caption: await withFooter(text),
    buttons: { inline_keyboard: [[{ text: '▶️ Слушать бесплатно', url: SITE }], ...(live ? [[{ text: '📥 YAiPlay Radio в RuStore', url: RUSTORE_APP }]] : []), [{ text: '📱 Приложения', url: SITE + '#apps' }, { text: '📤 Поделиться', url: share }]] },
  });
  state.showIndex = i + 1;
  log('опубликован большой рекламный пост');
}

// ---------- 5. Настройка бота (кнопка «Слушать» в чате с ботом — мини-приложение) ----------
async function setup() {
  await tg('setChatMenuButton', { menu_button: { type: 'web_app', text: '🎧 Слушать', web_app: { url: SITE } } });
  await tg('setMyDescription', { description: 'YAiPlay Radio — тысячи радиостанций со всего мира бесплатно. Нажмите «🎧 Слушать», чтобы открыть радио прямо в Telegram.' });
  await tg('setMyShortDescription', { short_description: 'Радио со всего мира — бесплатно, без рекламы 📻' });
  await tg('setMyCommands', { commands: [{ command: 'start', description: 'Открыть YAiPlay Radio' }] });
  log('бот настроен: кнопка «Слушать» открывает сайт как мини-приложение');
}

// ---------- запуск ----------
// Расписание приходит из GitHub (строка cron), по ней понимаем, что публиковать
// Один пост в час, с 07 до 22 по Берлину (зимой UTC+1, летом UTC+2) — 16 постов в день:
// станции ×5 (с «станцией дня»), новости ×3, «фишки» с постерами ×4, веб-камеры ×3, большой рекламный пост ×1.
// В воскресенье вечером вместо станции — вопрос подписчикам.
// 3 поста в день, время по Берлину (летом и зимой одинаково):
// 10:07 — «А вы знали?» (возможность по плану), 14:07 — станция дня, 19:07 — веб-камера дня.
const BERLIN = { 10: 'feature', 14: 'day', 19: 'webcam' };
function autoMode() {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', hour12: false }).format(new Date()));
  return BERLIN[h] || 'none';
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
  await Posters.closeBrowser();
  state.aiError = AI_ERROR || undefined;
  if (!DRY_RUN) await saveState(state);
  else log('[DRY_RUN] Состояние публикаций не изменено.');
}
