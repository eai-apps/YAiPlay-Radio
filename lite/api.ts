export * from '../src/services/apiService.ts';
import { setApiBase as setOriginalBase, api as originalApi, ApiError } from '../src/services/apiService.ts';

const CANONICAL = 'https://yaiplay-radio-api.<account-subdomain>.workers.dev';
const isCanonical = (url: string | undefined) => url?.trim().replace(/\/+$/, '') === CANONICAL;
const proxyBase = () => `${location.origin}/api`;

// Public reads (probe, meta, rds, share links) go through the same-origin /api proxy.
// Keep settings.apiUrl canonical, including when the owner publishes content.json.
export function setApiBase(url: string | undefined) {
  setOriginalBase(isCanonical(url) ? proxyBase() : url);
}

// Account, admin and support calls go DIRECTLY to yaiplay-radio-api: its per-IP limits (login, registration,
// support) must see the visitor's own address. Through the proxy every 2G visitor shares the proxy's
// single Cloudflare address, and a few attempts would lock everyone out for an hour.
// The proxy is only a fallback while the server does not yet allow this origin (CORS → network error).
let directFailedAt = 0;
export async function api<T = any>(path: string, opts: Parameters<typeof originalApi>[1] = {}): Promise<T> {
  if (opts.base && !isCanonical(opts.base)) return originalApi<T>(path, opts);
  if (Date.now() - directFailedAt > 10 * 60_000) {
    try {
      return await originalApi<T>(path, { ...opts, base: CANONICAL });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 0) throw error;
      directFailedAt = Date.now();
    }
  }
  return originalApi<T>(path, { ...opts, base: proxyBase() });
}
