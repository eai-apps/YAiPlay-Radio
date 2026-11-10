import { useState, useEffect, useCallback } from 'react';
import { Station } from '../types/radio';

export const FAVORITES_STORAGE_KEY = 'yaiplayradio_favorites_v2';
// Ключи избранного из прошлых версий сайта (v0.8.x) — только для переноса данных
const LEGACY_KEYS = ['p' + 'cradio_favorites_v1', 'yaiplayradio_radio_favorites', 'yaiplayradio_favorites_v1'];
const CHANGE_EVENT = 'yaiplayradio_favorites_changed';

function load(): Station[] {
  try {
    const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    // Переносим избранное из старых версий сайта
    for (const k of LEGACY_KEYS) {
      const old = localStorage.getItem(k);
      if (old) {
        const parsed = JSON.parse(old);
        if (Array.isArray(parsed) && parsed.length) {
          localStorage.setItem(FAVORITES_STORAGE_KEY, old);
          return parsed;
        }
      }
    }
  } catch {}
  return [];
}

/** Записать избранное (используется и при импорте/переносе с другого устройства). */
export function saveFavorites(list: Station[]) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(list));
    localStorage.setItem('yaiplayradio_sync_local_updated', String(Date.now()));
  } catch {}
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  window.dispatchEvent(new CustomEvent('yaiplayradio_local_change'));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Station[]>(load);

  // Все места сайта видят одно и то же избранное
  useEffect(() => {
    const sync = () => setFavorites(load());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const isFavorite = useCallback((stationuuid: string) => favorites.some((s) => s.stationuuid === stationuuid), [favorites]);

  const toggleFavorite = useCallback((station: Station) => {
    const prev = load();
    const exists = prev.some((s) => s.stationuuid === station.stationuuid);
    saveFavorites(exists ? prev.filter((s) => s.stationuuid !== station.stationuuid) : [station, ...prev]);
  }, []);

  const clearFavorites = useCallback(() => saveFavorites([]), []);

  return { favorites, isFavorite, toggleFavorite, clearFavorites, favoritesCount: favorites.length };
}
