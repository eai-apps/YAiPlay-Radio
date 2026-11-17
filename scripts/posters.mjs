/**
 * Фирменные картинки YAiPlay Radio для Телеграма: постеры возможностей (1080×1080),
 * карточка «Станция дня» и карточка веб-камеры (1280×720).
 * Рисуются как HTML-страница в Chrome (puppeteer-core) — шрифт Manrope, как на сайте.
 * Chrome: переменная CHROME_PATH или /usr/bin/google-chrome (есть на ubuntu-latest в GitHub Actions).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONTS = path.join(ROOT, 'scripts', 'assets', 'fonts');
export const SITE_HOST = 'yaiplay-radio.pages.dev';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const b64 = async (file, mime) => `data:${mime};base64,${(await fs.readFile(file)).toString('base64')}`;
export const dataUrl = (buf, mime = 'image/png') => `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;

let CSS = null;
async function baseCss() {
  if (CSS) return CSS;
  const face = async (fam, file, weight, range) =>
    `@font-face{font-family:'${fam}';src:url(${await b64(path.join(FONTS, file), 'font/woff2')}) format('woff2');font-weight:${weight};unicode-range:${range};}`;
  const CYR = 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116';
  const LAT = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
  const LATX = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
  CSS =
    (await face('Manrope', 'manrope-cyrillic-wght-normal.woff2', '200 800', CYR)) +
    (await face('Manrope', 'manrope-latin-wght-normal.woff2', '200 800', LAT)) +
    (await face('Manrope', 'manrope-latin-ext-wght-normal.woff2', '200 800', LATX)) +
    (await face('Mono', 'jetbrains-mono-cyrillic-500-normal.woff2', 500, CYR)) +
    (await face('Mono', 'jetbrains-mono-latin-500-normal.woff2', 500, LAT)) +
    (await face('Mono', 'jetbrains-mono-cyrillic-700-normal.woff2', 700, CYR)) +
    (await face('Mono', 'jetbrains-mono-latin-700-normal.woff2', 700, LAT)) +
    `*{box-sizing:border-box;margin:0;padding:0}
     body{font-family:Manrope,sans-serif;color:#fff;background:#07061a;-webkit-font-smoothing:antialiased;overflow:hidden}
     .grad{background:linear-gradient(90deg,#b794ff 0%,#7c5cff 45%,#22d3ee 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
     .mono{font-family:Mono,monospace}
     .bg{position:absolute;inset:0;background:
        radial-gradient(60% 55% at 12% 8%,rgba(109,61,245,.55),transparent 70%),
        radial-gradient(55% 50% at 100% 100%,rgba(34,211,238,.28),transparent 70%),
        radial-gradient(40% 35% at 95% 5%,rgba(168,85,247,.22),transparent 70%),#07061a}
     .grid{position:absolute;inset:0;opacity:.07;background-image:linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px);background-size:54px 54px;
        -webkit-mask-image:radial-gradient(70% 70% at 30% 30%,#000,transparent 75%)}
     .brand{display:flex;align-items:center;gap:18px}
     .brand img{width:76px;height:76px;border-radius:22px;box-shadow:0 0 0 2px rgba(255,255,255,.08),0 12px 40px rgba(109,61,245,.55)}
     .brand b{font-size:38px;font-weight:800;letter-spacing:-.5px}
     .brand small{display:block;font-size:17px;color:#9b98c9;letter-spacing:2px;margin-top:2px}
     .pill{display:inline-flex;align-items:center;gap:10px;padding:10px 22px;border-radius:999px;font:700 22px Mono,monospace;letter-spacing:2px;
        background:rgba(124,92,255,.16);border:1.5px solid rgba(167,139,250,.55);color:#d6ccff}
     .live{background:#e11d48;border-color:#fb7185;color:#fff}
     .dot{width:12px;height:12px;border-radius:50%;background:#fff;box-shadow:0 0 12px #fff}`;
  return CSS;
}

let LOGO = null;
const logo = async () => (LOGO ||= await b64(path.join(ROOT, 'public', 'logo.png'), 'image/png'));

async function qrSvg(url) {
  try {
    const QR = (await import('qrcode')).default;
    return await QR.toString(url, { type: 'svg', margin: 1, color: { dark: '#0b0a1f', light: '#ffffff' } });
  } catch {
    return '';
  }
}

let browser = null;
async function getBrowser() {
  if (browser) return browser;
  const { default: puppeteer } = await import('puppeteer-core');
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    headless: 'shell',
    timeout: 60000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'],
  });
  return browser;
}
export async function closeBrowser() {
  if (browser) await browser.close().catch(() => {});
  browser = null;
}

/** HTML → PNG (Buffer) */
export async function render(bodyHtml, width, height) {
  const b = await getBrowser();
  const page = await b.newPage();
  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${await baseCss()}</style></head><body style="width:${width}px;height:${height}px;position:relative">${bodyHtml}</body></html>`, {
      waitUntil: 'load',
    });
    await page.evaluate(() => document.fonts.ready);
    return Buffer.from(await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width, height } }));
  } finally {
    await page.close();
  }
}

/**
 * Постер возможности 1080×1080.
 * p = { kicker, title, accent, sub, visual (HTML), qrUrl, cta, note }
 */
export async function featurePoster(p) {
  const qr = await qrSvg(p.qrUrl || `https://${SITE_HOST}/`);
  const html = `
  <div class="bg"></div><div class="grid"></div>
  ${p.visual || ''}
  <div style="position:absolute;left:72px;top:64px;right:72px;display:flex;justify-content:space-between;align-items:center">
    <div class="brand"><img src="${await logo()}"><div><b>YAiPlay <span class="grad">Radio</span></b><small class="mono">РАДИО СО ВСЕГО МИРА</small></div></div>
    ${p.kicker ? `<span class="pill ${p.live ? 'live' : ''}">${p.live ? '<span class="dot"></span>' : ''}${esc(p.kicker)}</span>` : ''}
  </div>
  <div style="position:absolute;left:72px;top:${p.titleTop || 230}px;width:${p.titleWidth || 820}px">
    <div style="font-size:${p.titleSize || 96}px;font-weight:800;line-height:1.02;letter-spacing:-2.5px;text-shadow:0 6px 40px rgba(0,0,0,.5)">${esc(p.title)}${p.accent ? `<br><span class="grad">${esc(p.accent)}</span>` : ''}</div>
    ${p.sub ? `<div style="margin-top:26px;font-size:34px;line-height:1.3;font-weight:500;color:#d2d0ee;max-width:${p.subWidth || 640}px;text-shadow:0 4px 24px rgba(0,0,0,.7)">${esc(p.sub)}</div>` : ''}
  </div>
  <div style="position:absolute;left:72px;bottom:64px;display:flex;align-items:center;gap:26px;padding:22px 34px 22px 22px;border-radius:30px;
      background:rgba(14,12,40,.82);border:1.5px solid rgba(167,139,250,.35);box-shadow:0 20px 60px rgba(0,0,0,.45);backdrop-filter:blur(8px)">
    <div style="width:132px;height:132px;border-radius:18px;background:#fff;padding:8px">${qr.replace('<svg', '<svg width="116" height="116"')}</div>
    <div>
      <div style="font-size:34px;font-weight:800">${esc(p.cta || 'Слушать бесплатно')}</div>
      <div class="mono" style="font-size:26px;color:#5eead4;margin-top:8px">${SITE_HOST}</div>
      <div style="font-size:21px;color:#9b98c9;margin-top:8px">${esc(p.note || 'Без регистрации · без рекламы')}</div>
    </div>
  </div>`;
  return render(html, 1080, 1080);
}

/** Телефон со скриншотом (для постеров) */
export function phone(imgUrl, style) {
  return `<div style="position:absolute;${style};border-radius:64px;padding:14px;background:linear-gradient(160deg,#3b3363,#14112c);
    box-shadow:0 40px 120px rgba(0,0,0,.65),0 0 0 2px rgba(255,255,255,.08),0 0 90px rgba(124,92,255,.35)">
    <div style="width:100%;height:100%;border-radius:52px;overflow:hidden;background:#000"><img src="${imgUrl}" style="width:100%;display:block"></div></div>`;
}

/** Карточка «Станция дня» 1280×720. logo — Buffer или null */
export async function stationCard({ label = 'СТАНЦИЯ ДНЯ', title, subtitle = '', tags = [], logoBuf = null }) {
  const lg = logoBuf ? dataUrl(logoBuf) : await logo();
  const size = title.length <= 16 ? 84 : title.length <= 26 ? 68 : 54;
  const html = `
  <div class="bg"></div><div class="grid"></div>
  <div style="position:absolute;left:84px;top:150px;width:420px;height:420px;border-radius:56px;padding:4px;background:linear-gradient(135deg,#b794ff,#7c5cff 50%,#22d3ee);
      box-shadow:0 30px 100px rgba(124,92,255,.55)">
    <div style="width:100%;height:100%;border-radius:52px;background:#14122e;display:flex;align-items:center;justify-content:center;overflow:hidden">
      <img src="${lg}" style="${logoBuf ? 'max-width:80%;max-height:80%;border-radius:18px' : 'width:100%;height:100%'}"></div>
    <div style="position:absolute;right:-26px;bottom:-26px;width:110px;height:110px;border-radius:50%;background:linear-gradient(135deg,#7c5cff,#22d3ee);
      display:flex;align-items:center;justify-content:center;box-shadow:0 12px 40px rgba(34,211,238,.5);border:6px solid #07061a">
      <div style="width:0;height:0;border-left:36px solid #fff;border-top:22px solid transparent;border-bottom:22px solid transparent;margin-left:10px"></div></div>
  </div>
  <div style="position:absolute;left:580px;top:150px;right:72px">
    <span class="pill">${esc(label)}</span>
    <div style="margin-top:30px;font-size:${size}px;font-weight:800;line-height:1.05;letter-spacing:-1.5px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(title)}</div>
    <div style="margin-top:20px;font-size:32px;color:#c9c6ea;font-weight:600">${esc(subtitle)}</div>
    <div style="margin-top:22px;display:flex;flex-wrap:wrap;gap:10px">${tags
      .slice(0, 4)
      .map((t) => `<span style="padding:8px 18px;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);font-size:22px;color:#e4e2ff">${esc(t)}</span>`)
      .join('')}</div>
  </div>
  <div style="position:absolute;left:580px;bottom:64px;right:72px;display:flex;align-items:center;justify-content:space-between">
    <div class="brand"><img src="${await logo()}" style="width:60px;height:60px;border-radius:18px"><div><b style="font-size:32px">YAiPlay <span class="grad">Radio</span></b></div></div>
    <span class="mono" style="font-size:22px;color:#5eead4">${SITE_HOST}</span>
  </div>`;
  return render(html, 1280, 720);
}

/** Карточка веб-камеры 1280×720 по снимку камеры */
export async function camCard({ imgBuf, title, subtitle = '', live = true }) {
  const html = `
  <img src="${dataUrl(imgBuf, 'image/jpeg')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(1.08) brightness(.92)">
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,6,26,.55) 0%,rgba(7,6,26,0) 28%,rgba(7,6,26,0) 45%,rgba(7,6,26,.92) 100%)"></div>
  <div style="position:absolute;inset:0;background:radial-gradient(50% 60% at 0% 100%,rgba(109,61,245,.45),transparent 70%)"></div>
  <div style="position:absolute;left:56px;top:48px;right:56px;display:flex;justify-content:space-between;align-items:center">
    <span class="pill live"><span class="dot"></span>${live ? 'ВЕБ-КАМЕРА · LIVE' : 'ВЕБ-КАМЕРА'}</span>
    <div class="brand"><img src="${await logo()}" style="width:58px;height:58px;border-radius:17px"><b style="font-size:30px">YAiPlay <span class="grad">Radio</span></b></div>
  </div>
  <div style="position:absolute;left:56px;bottom:56px;right:56px">
    <div class="mono" style="font-size:22px;letter-spacing:3px;color:#5eead4">ВЗГЛЯД НА МИР</div>
    <div style="font-size:${title.length > 24 ? 60 : 76}px;font-weight:800;letter-spacing:-1.5px;line-height:1.05;margin-top:8px;text-shadow:0 6px 30px rgba(0,0,0,.6)">${esc(title)}</div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:12px">
      <div style="font-size:32px;color:#e4e2ff;font-weight:600">${esc(subtitle)}</div>
      <div style="font-size:16px;color:#a5a3c9">Webcams provided by windy.com</div>
    </div>
  </div>`;
  return render(html, 1280, 720);
}
