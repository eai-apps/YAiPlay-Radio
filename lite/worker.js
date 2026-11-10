// Deployed ONLY to the Pages branch alias 2g. No secrets or KV bindings here.
const SITE = 'https://yaiplay-radio.pages.dev';
const API = 'https://yaiplay-radio-api.<account-subdomain>.workers.dev';
const DATA = new Set(['content.json', 'catalog.json', 'geo.json', 'releases.json', 'app/version.json']);
const API_PATH = /^\/(?:health|meta|geo|probe|webcams|support|sync\/(?:register|login|data|account)|admin\/(?:check|login|publish|messages(?:\/[^/]+)?))\/?$/;
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'DELETE']);

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) {
        // Authentication remains with the existing Worker. Never cache accounts or forward cookies.
        const origin = request.headers.get('Origin');
        if (origin && origin !== url.origin) return json({ error: 'origin' }, 403);
        const path = url.pathname.slice(4);
        if (!API_PATH.test(path)) return json({ error: 'Маршрут не найден' }, 404);
        if (!METHODS.has(request.method)) return json({ error: 'Метод не разрешён' }, 405);
        if (path === '/geo' && request.cf?.country) return json({ country: request.cf.country, city: request.cf.city || '' });
        const headers = new Headers({ Origin: SITE, Accept: 'application/json' });
        for (const name of ['Authorization', 'Content-Type']) {
          const value = request.headers.get(name); if (value) headers.set(name, value);
        }
        const response = await fetch(API + path + url.search, {
          method: request.method, headers,
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
          redirect: 'manual',
        });
        const out = new Headers(response.headers);
        for (const name of ['Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials', 'Set-Cookie']) out.delete(name);
        out.set('Cache-Control', 'no-store');
        return new Response(response.body, { status: response.status, headers: out });
      }
      if (url.pathname.startsWith('/data/')) {
        const name = url.pathname.slice(6);
        if (!DATA.has(name)) return json({ error: 'Файл не найден' }, 404);
        if (!['GET', 'HEAD'].includes(request.method)) return json({ error: 'Метод не разрешён' }, 405);
        // Fixed public upstream: no arbitrary URLs, credentials, tokens or user query strings.
        // Workers supports manual/follow, but not the browser's redirect: 'error'.
        const response = await fetch(`${SITE}/${name}`, {
          method: request.method, redirect: 'manual',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        });
        if (response.status >= 300 && response.status < 400) return json({ error: 'Основной сайт перенаправил запрос. Попробуйте позже.' }, 502);
        const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': name === 'content.json' ? 'no-store' : 'public, max-age=300' });
        return new Response(request.method === 'HEAD' ? null : await response.text(), { status: response.status, headers });
      }
      // Existing components use these relative public paths.
      if (url.pathname === '/app/version.json' || url.pathname === '/releases.json') {
        return Response.redirect(`${SITE}${url.pathname}`, 302);
      }
      return env.ASSETS.fetch(request);
    } catch {
      return json({ error: 'Нет связи с основным сайтом. Попробуйте позже.' }, 502);
    }
  },
};
