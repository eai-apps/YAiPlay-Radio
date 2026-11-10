/**
 * Станции, которые сами запретили использовать свои потоки в сторонних приложениях
 * (правило владельца: только легальные потоки). Список — в data/stream-policy.json.
 */
import policy from '../../data/stream-policy.json';

export interface BlockedStation {
  host: string;
  name: string;
  reason: string;
}
/** Полный список (для админки) */
export const BLOCKED_STATIONS: BlockedStation[] = policy.blockedHosts || [];
let HOSTS: string[] = BLOCKED_STATIONS.map((h) => h.host.toLowerCase());

/** Владелец вернул часть станций в админке (Видимость → «Станции, запретившие…») */
export function setAllowedStreamHosts(allowed: string[]) {
  const ok = new Set((allowed || []).map((h) => h.toLowerCase()));
  HOSTS = BLOCKED_STATIONS.map((h) => h.host.toLowerCase()).filter((h) => !ok.has(h));
}

const hostOf = (u?: string) => {
  try {
    return u ? new URL(u).hostname.toLowerCase() : '';
  } catch {
    return '';
  }
};

/** true — станцию показывать нельзя (поток или сайт станции на запрещённом домене) */
export function isBlockedSource(st: { url?: string; url_resolved?: string; homepage?: string }): boolean {
  return [st.url, st.url_resolved, st.homepage].some((u) => {
    const h = hostOf(u);
    return !!h && HOSTS.some((b) => h === b || h.endsWith('.' + b));
  });
}
