/**
 * Россия без VPN: Cloudflare (pages.dev, workers.dev) там часто заблокирован (владелец 17.11).
 * В Android-приложении запросы к нашим сервисам при ошибке повторяются через наши ретрансляторы
 * (нативно, YAiRelay.java). Хост, который пошёл через ретранслятор, 30 минут сразу идёт туда.
 * На сайте и iPhone ничего не меняется (браузер не доверяет сертификату ретранслятора без домена).
 */
import { hasNative, nativeRelayFetch } from './nativeBridge';

const RELAY_HOSTS = new Set(['yaiplay-radio.pages.dev', 'yaiplay-radio-api.yai-media-player.workers.dev', 'de1.api.radio-browser.info']);
const viaRelayUntil = new Map<string, number>();
const STICKY_MS = 30 * 60_000;

function headersOf(input: RequestInfo | URL, init?: RequestInit): Record<string, string> {
  const out: Record<string, string> = {};
  const h = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  h.forEach((v, k) => (out[k] = v));
  return out;
}

/**
 * Зеркало сайта для России (свой адрес *.duckdns.org на нашем сервере, владелец 18.11): сайт открыт с зеркала,
 * поэтому запросы к нашим сервисам на Cloudflare идут на то же зеркало по своим путям.
 */
const MIRROR_PATHS: Record<string, string> = { 'yaiplay-radio.pages.dev': '', 'yaiplay-radio-api.yai-media-player.workers.dev': '/radio-api', 'de1.api.radio-browser.info': '/radio-rb' };
function installMirrorFetch(): boolean {
  if (!/\.duckdns\.org$/.test(location.hostname)) return false;
  const orig = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const u = new URL(input instanceof Request ? input.url : String(input), location.href);
      const prefix = MIRROR_PATHS[u.host];
      if (prefix !== undefined) {
        const target = location.origin + prefix + u.pathname + u.search;
        return orig(input instanceof Request ? new Request(target, input) : target, init);
      }
    } catch {
      /* обычный запрос */
    }
    return orig(input, init);
  };
  return true;
}

/**
 * Сайт открыт с Cloudflare, а данные не грузятся, и часовой пояс российский — значит, Cloudflare заблокирован:
 * один раз за сеанс переходим на наше зеркало (там всё идёт без Cloudflare).
 */
const RU_MIRROR = 'https://yaiplay-radio.duckdns.org:8444';
const RU_TZ = /^(Europe\/(Moscow|Kaliningrad|Samara|Volgograd|Kirov|Astrakhan|Saratov|Ulyanovsk|Simferopol)|Asia\/(Yekaterinburg|Omsk|Novosibirsk|Barnaul|Tomsk|Novokuznetsk|Krasnoyarsk|Irkutsk|Chita|Yakutsk|Khandyga|Vladivostok|Ust-Nera|Magadan|Sakhalin|Srednekolymsk|Kamchatka|Anadyr))$/;
function installRuRedirectOnFailure(): void {
  if (!/\.pages\.dev$/.test(location.hostname)) return;
  let tz = '';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return;
  }
  if (!RU_TZ.test(tz)) return;
  const orig = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      return await orig(input, init);
    } catch (e) {
      try {
        const host = new URL(input instanceof Request ? input.url : String(input), location.href).host;
        if (RELAY_HOSTS.has(host) && navigator.onLine !== false && !sessionStorage.getItem('ruMirrorTried')) {
          sessionStorage.setItem('ruMirrorTried', '1');
          location.replace(RU_MIRROR + location.pathname + location.search + location.hash);
        }
      } catch {
        /* ничего */
      }
      throw e;
    }
  };
}

export function installRelayFetch(): void {
  if (installMirrorFetch()) return;
  if (!hasNative()) installRuRedirectOnFailure();
  if (!hasNative() || (window as unknown as { __yaiRelay?: boolean }).__yaiRelay) return;
  (window as unknown as { __yaiRelay?: boolean }).__yaiRelay = true;
  const orig = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let url: URL;
    try {
      url = new URL(input instanceof Request ? input.url : String(input), location.href);
    } catch {
      return orig(input, init);
    }
    if (!RELAY_HOSTS.has(url.host)) return orig(input, init);
    const sticky = (viaRelayUntil.get(url.host) ?? 0) > Date.now();
    let firstError: unknown = null;
    if (!sticky) {
      try {
        return await orig(input, init);
      } catch (e) {
        firstError = e; // сеть не ответила (или таймаут) — пробуем ретрансляторы
      }
    }
    const body = typeof init?.body === 'string' ? init.body : undefined;
    try {
      const r = await nativeRelayFetch({ url: url.href, method: (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase(), headers: headersOf(input, init), body });
      viaRelayUntil.set(url.host, Date.now() + STICKY_MS);
      return new Response(r.status === 204 ? null : r.body, { status: r.status, headers: r.contentType ? { 'content-type': r.contentType } : {} });
    } catch (e) {
      viaRelayUntil.delete(url.host);
      if (sticky) return orig(input, init);
      throw firstError ?? e;
    }
  };
}
