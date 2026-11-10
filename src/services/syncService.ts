/**
 * Синхронизация избранного и сохранённых треков между устройствами через мини-сервер.
 * Правило: побеждает более свежая версия (так корректно переносятся и удаления).
 */
import { api, hasApi, userSession } from './apiService';
import { FAVORITES_STORAGE_KEY } from '../hooks/useFavorites';
import { PLAYLISTS_KEY } from '../hooks/usePlaylists';

const TRACKS_KEY = 'yaiplayradio_recognized_tracks_v1';
export const LOCAL_UPDATED_KEY = 'yaiplayradio_sync_local_updated';
const LAST_SYNC_KEY = 'yaiplayradio_sync_last';

const readArr = (k: string) => {
  try {
    const v = JSON.parse(localStorage.getItem(k) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const num = (k: string) => {
  try {
    return Number(localStorage.getItem(k) || 0);
  } catch {
    return 0;
  }
};

export function markLocalChanged() {
  try {
    localStorage.setItem(LOCAL_UPDATED_KEY, String(Date.now()));
  } catch {}
}

export async function syncNow(opts: { mergeFirst?: boolean } = {}): Promise<'pulled' | 'pushed' | 'merged' | 'skip'> {
  const { token } = userSession.get();
  if (!hasApi() || !token) return 'skip';
  const server = await api<{ favorites?: any[]; recognizedTracks?: any[]; playlists?: any[]; updatedAt?: number }>('/sync/data', { token });
  const localPl = readArr(PLAYLISTS_KEY);
  const localFav = readArr(FAVORITES_STORAGE_KEY);
  const localTracks = readArr(TRACKS_KEY);
  const localUpdated = num(LOCAL_UPDATED_KEY);
  const serverUpdated = server.updatedAt || 0;

  const apply = (fav: any[], tracks: any[], pls?: any[]) => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(fav));
    localStorage.setItem(TRACKS_KEY, JSON.stringify(tracks));
    // плейлисты: только если сервер их уже хранит (старая версия сервера их не знает — локальные не трогаем)
    if (Array.isArray(pls)) localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(pls));
    window.dispatchEvent(new CustomEvent('yaiplayradio_favorites_changed'));
    window.dispatchEvent(new CustomEvent('yaiplayradio_playlists_changed'));
  };
  const push = async (fav: any[], tracks: any[], pls: any[] = readArr(PLAYLISTS_KEY)) => {
    const r = await api<{ updatedAt: number }>('/sync/data', { method: 'PUT', body: { favorites: fav, recognizedTracks: tracks, playlists: pls }, token });
    localStorage.setItem(LOCAL_UPDATED_KEY, String(r.updatedAt));
  };

  let result: 'pulled' | 'pushed' | 'merged';
  if (opts.mergeFirst) {
    // Первый вход на устройстве: объединяем, ничего не теряя
    const uniq = (arr: any[], key: (x: any) => string) => {
      const seen = new Set<string>();
      return arr.filter((x) => x && !seen.has(key(x)) && seen.add(key(x)));
    };
    const fav = uniq([...(server.favorites || []), ...localFav], (s) => s.stationuuid);
    const tracks = uniq([...(server.recognizedTracks || []), ...localTracks], (t) => `${t.artist}|${t.title}`.toLowerCase());
    const pls = uniq([...(server.playlists || []), ...localPl], (p) => p.id);
    apply(fav, tracks, pls);
    await push(fav, tracks, pls);
    result = 'merged';
  } else if (serverUpdated > localUpdated) {
    apply(server.favorites || [], server.recognizedTracks || [], server.playlists);
    localStorage.setItem(LOCAL_UPDATED_KEY, String(serverUpdated));
    result = 'pulled';
  } else {
    await push(localFav, localTracks);
    result = 'pushed';
  }
  localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  return result;
}

export const lastSyncAt = () => num(LAST_SYNC_KEY);
