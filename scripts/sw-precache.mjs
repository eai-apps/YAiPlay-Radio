// После сборки: вписывает в dist/sw.js список файлов, без которых приложение не нарисует первый экран
// (страница, главный JS и CSS, шрифт, логотип), и имя кэша по содержимому сборки.
// Зачем (владелец 17.11): на iPhone с экрана «Домой» ~5 с белый экран до заставки — при запуске
// главные файлы могли идти из сети. Теперь service worker кладёт их в кэш заранее, при установке.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const dist = new URL('../dist/', import.meta.url);
const html = readFileSync(new URL('index.html', dist), 'utf8');
const refs = [...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
const fonts = readdirSync(new URL('assets/', dist))
  .filter((f) => /^manrope-(cyrillic|latin)-wght-normal-.*\.woff2$/.test(f))
  .map((f) => `assets/${f}`);
const files = ['./', 'index.html', 'logo.png', 'logo-globe.png', 'manifest.webmanifest', ...refs, ...fonts];
const hash = createHash('sha1').update(html).update(files.join('|')).digest('hex').slice(0, 10);

const swUrl = new URL('sw.js', dist);
let sw = readFileSync(swUrl, 'utf8');
sw = sw.replace(/const CACHE = '[^']*';/, `const CACHE = 'YAi-shell-${hash}';`);
sw = sw.replace(/const PRECACHE = \[[^\]]*\];/, `const PRECACHE = ${JSON.stringify(files)};`);
writeFileSync(swUrl, sw);
console.log(`sw.js: cache YAi-shell-${hash}, ${files.length} files precached`);
