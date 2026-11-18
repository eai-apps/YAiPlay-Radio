/**
 * Россия: Cloudflare там замедлен/заблокирован (владелец 18.11). Посетителя из РФ, открывшего страницу сайта,
 * сразу отправляем на наше зеркало без Cloudflare. Ответ-переадресация крошечный — он доходит даже при замедлении.
 * Только страницы (text/html): данные, обновления и приложение не трогаем. ?nomirror=1 — остаться здесь.
 */
const MIRROR = 'https://yaiplay-radio.duckdns.org:8444';
// Наши серверы (зеркало само забирает сайт отсюда — их не переадресуем, иначе будет петля)
const OUR_IPS = new Set(['194.26.203.2', '130.49.185.16', '143.246.223.135']);

export async function onRequest(ctx) {
  const req = ctx.request;
  try {
    const url = new URL(req.url);
    const country = req.cf && req.cf.country;
    const fromMirror = OUR_IPS.has(req.headers.get('CF-Connecting-IP') || '') || /duckdns\.org/.test(req.headers.get('X-Forwarded-Host') || '');
    const isPage = req.method === 'GET' && (req.headers.get('Accept') || '').includes('text/html');
    if (country === 'RU' && isPage && !fromMirror && !url.searchParams.has('nomirror')) {
      return Response.redirect(MIRROR + url.pathname + url.search, 302);
    }
  } catch {
    /* на всякий случай — просто показываем сайт */
  }
  return ctx.next();
}
