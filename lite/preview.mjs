// Local production preview with the exact same fixed proxy routes as the Pages deployment.
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import worker from './worker.js';

const root = fileURLToPath(new URL('../dist-lite/', import.meta.url));
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, options = {}) => originalFetch(input, { ...options, ...(options.body instanceof ReadableStream ? { duplex: 'half' } : {}) });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const env = { ASSETS: { async fetch(request) {
  const pathname = decodeURIComponent(new URL(request.url).pathname);
  const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!target.startsWith(root) || /[\\/]_worker\.js$/.test(target)) return new Response('Not found', { status: 404 });
  try { return new Response(await readFile(target), { headers: { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' } }); }
  catch { return new Response('Not found', { status: 404 }); }
} } };
http.createServer(async (req, res) => {
  try {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const request = new Request(`http://127.0.0.1:3001${req.url}`, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
    const response = await worker.fetch(request, env);
    const headers = new Headers(response.headers);
    // Node fetch decompresses upstream bytes; Cloudflare's native fetch handles this itself.
    headers.delete('content-encoding'); headers.delete('content-length');
    res.writeHead(response.status, Object.fromEntries(headers));
    if (response.body) Readable.fromWeb(response.body).pipe(res); else res.end();
  } catch { res.writeHead(500); res.end('Preview error'); }
}).listen(3001, '127.0.0.1', () => console.log('2G preview: http://127.0.0.1:3001'));
