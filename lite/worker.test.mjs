import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';

const ORIGIN = 'https://2g.yaiplay-radio.pages.dev';
const env = { ASSETS: { fetch: async () => new Response('asset') } };
async function mockFetch(callback, run) {
  const original = globalThis.fetch;
  globalThis.fetch = callback;
  try { await run(); } finally { globalThis.fetch = original; }
}

test('only fixed public data files can be fetched; no forwarding auth/cookies/query', async () => {
  await mockFetch(async (url, opts) => {
    assert.equal(url, 'https://yaiplay-radio.pages.dev/content.json');
    assert.equal(opts.redirect, 'manual'); // Cloudflare Workers rejects redirect: 'error'.
    assert.equal(opts.headers.Authorization, undefined);
    assert.equal(opts.headers.Cookie, undefined);
    assert.equal(opts.headers['Cache-Control'], 'no-cache');
    return Response.json({ apiUrl: 'https://yaiplay-radio-api.<account-subdomain>.workers.dev', appTitle: 'YAi Radio' });
  }, async () => {
    const response = await worker.fetch(new Request(`${ORIGIN}/data/content.json?token=do-not-forward`, { headers: { Authorization: 'test', Cookie: 'test' } }), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).apiUrl, 'https://yaiplay-radio-api.<account-subdomain>.workers.dev');
  });
  assert.equal((await worker.fetch(new Request(`${ORIGIN}/data/secrets.json`), env)).status, 404);
  assert.equal((await worker.fetch(new Request(`${ORIGIN}/data/https://example.com`), env)).status, 404);
});

test('same account API, bearer and body pass through; private responses never cached', async () => {
  await mockFetch(async (url, opts) => {
    assert.equal(url, 'https://yaiplay-radio-api.<account-subdomain>.workers.dev/sync/data');
    assert.equal(opts.headers.get('Origin'), 'https://yaiplay-radio.pages.dev');
    assert.equal(opts.headers.get('Authorization'), 'Bearer test-value');
    assert.equal(opts.headers.get('Cookie'), null);
    assert.equal(await new Response(opts.body).text(), '{"favorites":[]}');
    return Response.json({ updatedAt: 1 }, { headers: { 'Access-Control-Allow-Origin': 'https://yaiplay-radio.pages.dev', 'Set-Cookie': 'test', 'Cache-Control': 'public' } });
  }, async () => {
    const response = await worker.fetch(new Request(`${ORIGIN}/api/sync/data`, { method: 'PUT', headers: { Origin: ORIGIN, Authorization: 'Bearer test-value', Cookie: 'test', 'Content-Type': 'application/json' }, body: '{"favorites":[]}' }), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  });
});

test('public-data redirects fail closed without following another upstream', async () => {
  let calls = 0;
  await mockFetch(async () => { calls++; return Response.redirect('https://unexpected.example/', 302); }, async () => {
    const response = await worker.fetch(new Request(`${ORIGIN}/data/catalog.json`), env);
    assert.equal(response.status, 502);
    assert.equal(calls, 1);
  });
});

test('cross-origin mutations and unsupported API routes fail before any upstream call', async () => {
  await mockFetch(() => { assert.fail('Must not fetch'); }, async () => {
    assert.equal((await worker.fetch(new Request(`${ORIGIN}/api/sync/register`, { method: 'POST', headers: { Origin: 'https://other.example' } }), env)).status, 403);
    for (const path of ['/api/vk/token', '/api/admin/secrets', '/api/https://example.com']) {
      const response = await worker.fetch(new Request(ORIGIN + path), env);
      assert.equal(response.status, 404);
    }
    assert.equal((await worker.fetch(new Request(`${ORIGIN}/api/health`, { method: 'PATCH' }), env)).status, 405);
  });
});

test('backend auth errors preserved, upstream failures give 502', async () => {
  await mockFetch(async () => Response.json({ error: 'auth' }, { status: 401 }), async () => {
    const response = await worker.fetch(new Request(`${ORIGIN}/api/admin/check`), env);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, 'auth');
  });
  await mockFetch(async () => { throw new Error('offline'); }, async () => {
    assert.equal((await worker.fetch(new Request(`${ORIGIN}/data/catalog.json`), env)).status, 502);
  });
});

test('geolocation uses visitor location at the lite edge', async () => {
  const request = new Request(`${ORIGIN}/api/geo`);
  Object.defineProperty(request, 'cf', { value: { country: 'DE', city: 'Berlin' } });
  await mockFetch(() => { assert.fail('No geolocation subrequest needed'); }, async () => {
    assert.deepEqual(await (await worker.fetch(request, env)).json(), { country: 'DE', city: 'Berlin' });
  });
});

test('static assets use ASSETS; version metadata redirects to primary site', async () => {
  assert.equal(await (await worker.fetch(new Request(`${ORIGIN}/assets/test.js`), env)).text(), 'asset');
  const response = await worker.fetch(new Request(`${ORIGIN}/app/version.json`), env);
  assert.equal(response.headers.get('location'), 'https://yaiplay-radio.pages.dev/app/version.json');
});
