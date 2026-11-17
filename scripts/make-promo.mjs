/**
 * Постеры рубрики «А вы знали?» → public/promo/<имя>.jpg (1080×1080).
 *   node scripts/make-promo.mjs [имя ...]
 * Картинки для постеров лежат в scripts/poster-src/ (снимки экрана сайта).
 * Нужны: npm i --no-save puppeteer-core qrcode sharp, Chrome (CHROME_PATH).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import * as P from './posters.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'scripts', 'poster-src');
const OUT = path.join(ROOT, 'public', 'promo');
const img = async (f) => P.dataUrl(await fs.readFile(path.join(SRC, f)));
const URL = 'https://yaiplay-radio.pages.dev/';

const globeVisual = async () => `
  <div style="position:absolute;right:-250px;top:250px;width:1000px;height:1000px;border-radius:50%;box-shadow:0 0 160px rgba(124,92,255,.5)"></div>
  <img src="${await img('globe.png')}" style="position:absolute;right:-290px;top:210px;width:1080px;height:1080px;-webkit-mask-image:radial-gradient(circle at 50% 50%,#000 46%,transparent 50%)">`;
const phoneRight = async (file) => P.phone(await img(file), 'right:-40px;top:200px;width:440px;height:952px;transform:rotate(-4deg)');

const POSTERS = {
  'yai-tip': async () => ({ kicker: 'ФИШКА ДНЯ', title: 'А вы', accent: 'знали?', titleSize: 118, sub: 'Что ещё умеет YAiPlay Radio — каждый день новая возможность', subWidth: 520, visual: await globeVisual(), cta: 'Слушать бесплатно', note: 'Радио со всего мира' }),
  'yai-globe': async () => ({ kicker: 'А ВЫ ЗНАЛИ?', title: 'Глобус', accent: 'радио', sub: 'Крутите Землю и нажимайте на точку — заиграет радио этого города', subWidth: 520, visual: await globeVisual(), cta: 'Открыть глобус', note: '2 600+ городов на карте', qrUrl: URL + '#globe' }),
};

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(POSTERS);
await fs.mkdir(OUT, { recursive: true });
for (const n of names) {
  if (!POSTERS[n]) {
    console.log('нет такого постера:', n);
    continue;
  }
  const png = await P.featurePoster(await POSTERS[n]());
  await fs.writeFile(path.join(OUT, n + '.jpg'), await sharp(png).jpeg({ quality: 88, mozjpeg: true }).toBuffer());
  console.log('готов', n);
}
await P.closeBrowser();
