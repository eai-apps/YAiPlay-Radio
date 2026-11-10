import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const base = new URL('../dist-lite/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('.vite/manifest.json', base), 'utf8'));
const files = new Set(['index.html', 'core.json']);
const visited = new Set();
function visit(key) {
  if (visited.has(key)) return;
  visited.add(key);
  const item = manifest[key];
  assert.ok(item, `Missing manifest entry: ${key}`);
  files.add(item.file);
  for (const css of item.css || []) files.add(css);
  for (const dep of item.imports || []) visit(dep);
}
visit('index.html');
const app = Object.keys(manifest).find((key) => key.endsWith('App.tsx'));
assert.ok(app, 'Lazy bootstrap App exists');
visit(app);
let total = 0;
for (const file of files) {
  assert.ok(!/hls-|Globe|Webcams|Admin|\.woff/.test(file), `Heavy asset on startup: ${file}`);
  total += gzipSync(await readFile(new URL(file, base))).length;
}
assert.ok(total < 180_000, `Startup gzip budget exceeded: ${total}`);
const names = await readdir(new URL('assets/', base));
assert.ok(!names.some((name) => /\.woff|Globe3D|GlobeView|Visualizer/.test(name)), 'No fonts, WebGL globe or visualizer bundled');
const contextFile = names.find((name) => name.startsWith('AudioPlayerContext-'));
const player = await readFile(new URL(`assets/${contextFile}`, base), 'utf8');
assert.ok(player.includes('/core.json'), 'Player initializes from compact catalog');
assert.ok(!player.includes('requestIdleCallback'), 'No idle HLS preload');
const routes = JSON.parse(await readFile(new URL('_routes.json', base), 'utf8'));
assert.ok(routes.include.includes('/api/*'));
assert.ok(!routes.include.includes('/*'), 'Static shell does not invoke Functions');
const result = { startupGzipBytes: total, startupFiles: [...files], heavyFeatures: 'on demand', fonts: 0 };
await import('node:fs/promises').then(({ writeFile }) => writeFile(new URL('performance.json', base), JSON.stringify(result, null, 2)));
console.log(JSON.stringify(result, null, 2));
