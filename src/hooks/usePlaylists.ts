import { useCallback, useEffect, useState } from 'react';
import { Station } from '../types/radio';

/** Свои плейлисты (кроме «Избранного»): создать, переименовать, поделиться, переносить станции между ними. */
export interface Playlist {
  id: string;
  name: string;
  stations: Station[];
  createdAt: number;
  updatedAt: number;
  from?: string; // если плейлист пришёл по ссылке от друга
}

export const PLAYLISTS_KEY = 'YAi_playlists_v1';
const EVENT = 'YAi_playlists_changed';
export const FAVORITES_ID = 'favorites';

function load(): Playlist[] {
  try {
    const v = JSON.parse(localStorage.getItem(PLAYLISTS_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function savePlaylists(list: Playlist[]) {
  try {
    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(list));
    localStorage.setItem('YAi_sync_local_updated', String(Date.now()));
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT));
  window.dispatchEvent(new CustomEvent('YAi_local_change'));
}

// Храним только нужное для воспроизведения
export const slim = (s: Station): Station => ({
  stationuuid: s.stationuuid,
  name: s.name,
  url: s.url,
  url_resolved: s.url_resolved,
  favicon: s.favicon,
  tags: s.tags,
  country: s.country,
  countrycode: s.countrycode,
  codec: s.codec,
  bitrate: s.bitrate,
  ...(s.alt ? { alt: s.alt } : {}),
});

const newId = () => 'pl-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>(load);
  useEffect(() => {
    const h = () => setPlaylists(load());
    window.addEventListener(EVENT, h);
    window.addEventListener('storage', h);
    return () => {
      window.removeEventListener(EVENT, h);
      window.removeEventListener('storage', h);
    };
  }, []);

  const update = (fn: (l: Playlist[]) => Playlist[]) => savePlaylists(fn(load()));

  const create = useCallback((name: string, stations: Station[] = [], from?: string): string => {
    const id = newId();
    const now = Date.now();
    update((l) => [...l, { id, name: name.trim().slice(0, 60) || 'Новый плейлист', stations: stations.map(slim), createdAt: now, updatedAt: now, ...(from ? { from } : {}) }]);
    return id;
  }, []);
  const rename = useCallback((id: string, name: string) => update((l) => l.map((p) => (p.id === id ? { ...p, name: name.trim().slice(0, 60) || p.name, updatedAt: Date.now() } : p))), []);
  const remove = useCallback((id: string) => update((l) => l.filter((p) => p.id !== id)), []);
  const has = useCallback((id: string, stationuuid: string) => !!load().find((p) => p.id === id)?.stations.some((s) => s.stationuuid === stationuuid), []);
  const addStation = useCallback(
    (id: string, st: Station) =>
      update((l) => l.map((p) => (p.id === id && !p.stations.some((s) => s.stationuuid === st.stationuuid) ? { ...p, stations: [...p.stations, slim(st)], updatedAt: Date.now() } : p))),
    []
  );
  const removeStation = useCallback(
    (id: string, stationuuid: string) => update((l) => l.map((p) => (p.id === id ? { ...p, stations: p.stations.filter((s) => s.stationuuid !== stationuuid), updatedAt: Date.now() } : p))),
    []
  );
  const toggleStation = useCallback((id: string, st: Station) => (has(id, st.stationuuid) ? removeStation(id, st.stationuuid) : addStation(id, st)), [has, addStation, removeStation]);

  return { playlists, create, rename, remove, has, addStation, removeStation, toggleStation };
}
