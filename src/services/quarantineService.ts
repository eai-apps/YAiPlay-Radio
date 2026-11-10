/**
 * Auto-quarantine service for unresponsive or failing radio streams.
 * If a station fails to connect or times out after 4.5 seconds, it is put into
 * local quarantine for 6 hours with automatic recovery.
 */

const QUARANTINE_KEY = 'YAi_quarantine_v1';
export const QUARANTINE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface QuarantineRecord {
  stationuuid: string;
  stationName?: string;
  timestamp: number;
  reason?: string;
  url?: string;
}

export function getQuarantinedMap(): Record<string, QuarantineRecord> {
  try {
    const raw = localStorage.getItem(QUARANTINE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const clean: Record<string, QuarantineRecord> = {};
    let changed = false;

    for (const [key, item] of Object.entries(parsed as Record<string, QuarantineRecord>)) {
      if (item && item.timestamp && now - item.timestamp < QUARANTINE_DURATION_MS) {
        clean[key] = item;
      } else {
        changed = true; // expired after 6 hours
      }
    }

    if (changed) {
      try {
        localStorage.setItem(QUARANTINE_KEY, JSON.stringify(clean));
      } catch {}
    }
    return clean;
  } catch {
    return {};
  }
}

export function isStationQuarantined(stationuuid: string): boolean {
  if (!stationuuid) return false;
  const map = getQuarantinedMap();
  return Boolean(map[stationuuid]);
}

export function quarantineStation(
  stationuuid: string,
  stationName?: string,
  url?: string,
  reason = 'Не отвечает > 9 сек или ошибка потока'
): void {
  if (!stationuuid || stationuuid.startsWith('fallback-')) return;
  const map = getQuarantinedMap();
  map[stationuuid] = {
    stationuuid,
    stationName,
    timestamp: Date.now(),
    reason,
    url,
  };
  try {
    localStorage.setItem(QUARANTINE_KEY, JSON.stringify(map));
  } catch {}
}

export function liftQuarantine(stationuuid: string): void {
  if (!stationuuid) return;
  const map = getQuarantinedMap();
  if (map[stationuuid]) {
    delete map[stationuuid];
    try {
      localStorage.setItem(QUARANTINE_KEY, JSON.stringify(map));
    } catch {}
  }
}

export function clearAllQuarantine(): void {
  try {
    localStorage.removeItem(QUARANTINE_KEY);
  } catch {}
}
