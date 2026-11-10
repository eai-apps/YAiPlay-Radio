/**
 * Почему станция не играет: «мёртвая» или закрыта для страны/IP слушателя.
 *  • ночью робот каталога проверяет станции жанров → список мёртвых для всех (catalog.dead);
 *  • если станция не запустилась у человека, наш сервер пробует её из другой точки:
 *    играет у сервера → это ограничение станции для страны слушателя (🔒), станцию не прячем;
 *    не играет и у сервера → станция не работает, прячем.
 */
import { useEffect, useState } from 'react';
import { getApiBase } from './apiService';

// ---------- мёртвые станции (общий список от робота) ----------
let dead = new Set<string>();
export const setDeadStations = (ids: string[]) => (dead = new Set(ids));
export const isGloballyDead = (id: string) => dead.has(id);

// ---------- закрыты для этого слушателя (по стране / IP) ----------
const GEO_KEY = 'yaiplayradio_geo_blocked_v1';
const GEO_TTL = 7 * 86400000;
const GEO_EVENT = 'yaiplayradio_geo_blocked_changed';
let geoCache: Record<string, number> | null = null;
function geoMap(): Record<string, number> {
  if (geoCache) return geoCache;
  try {
    const m = JSON.parse(localStorage.getItem(GEO_KEY) || '{}') as Record<string, number>;
    const now = Date.now();
    geoCache = Object.fromEntries(Object.entries(m).filter(([, t]) => now - t < GEO_TTL));
  } catch {
    geoCache = {};
  }
  return geoCache!;
}
export const isGeoBlocked = (id: string) => !!id && !!geoMap()[id];
export function markGeoBlocked(id: string) {
  const m = { ...geoMap(), [id]: Date.now() };
  geoCache = m;
  try {
    localStorage.setItem(GEO_KEY, JSON.stringify(m));
  } catch {}
  window.dispatchEvent(new CustomEvent(GEO_EVENT));
}
export function clearGeoBlocked(id: string) {
  const m = { ...geoMap() };
  if (!m[id]) return;
  delete m[id];
  geoCache = m;
  try {
    localStorage.setItem(GEO_KEY, JSON.stringify(m));
  } catch {}
  window.dispatchEvent(new CustomEvent(GEO_EVENT));
}
/** Перерисовать карточку, когда меняется список закрытых станций */
export function useGeoBlocked(id: string): boolean {
  const [v, setV] = useState(() => isGeoBlocked(id));
  useEffect(() => {
    const h = () => setV(isGeoBlocked(id));
    h();
    window.addEventListener(GEO_EVENT, h);
    return () => window.removeEventListener(GEO_EVENT, h);
  }, [id]);
  return v;
}

// ---------- проверка через наш сервер ----------
let health: Promise<any> | null = null;
const serverHealth = () => {
  const b = getApiBase();
  if (!b) return Promise.resolve(null);
  if (!health) health = fetch(b + '/health', { cache: 'no-store' }).then((r) => r.json()).catch(() => null);
  return health;
};

/** 'ok' — у сервера поток играет; 'dead' — не играет и у сервера; 'unknown' — проверить не удалось */
export async function probeStream(url: string): Promise<'ok' | 'dead' | 'unknown'> {
  const b = getApiBase();
  if (!b || !url) return 'unknown';
  const h = await serverHealth();
  if (!h?.probe) return 'unknown';
  try {
    const r = await fetch(`${b}/probe?u=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(12000) });
    const j = await r.json();
    if (j.ok) return 'ok';
    // 401/403/451 — сервер станции не пустил и нас: это ограничение, а не поломка
    if ([401, 403, 451].includes(j.status)) return 'unknown';
    return 'dead';
  } catch {
    return 'unknown';
  }
}

/** IP и страна слушателя (для пояснения «закрыто для вашей страны») */
let who: Promise<{ ip?: string; country?: string } | null> | null = null;
export const myNetwork = () => {
  const b = getApiBase();
  if (!b) return Promise.resolve(null);
  if (!who) who = fetch(b + '/geo', { cache: 'no-store' }).then((r) => r.json()).catch(() => null);
  return who;
};
