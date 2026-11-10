import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Check, Heart, Play, Pause, ListPlus, Save, Loader2, Share2 } from 'lucide-react';
import { openShare } from './ShareSheet';
import { Station } from '../types/radio';
import { usePlaylists } from '../hooks/usePlaylists';
import { useFavorites } from '../hooks/useFavorites';
import { useAudio } from '../context/AudioPlayerContext';
import { StationLogo } from './StationLogo';
import { SharedPlaylist, unpack } from '../services/share';
import { fetchStationsByUuids } from '../services/radioApi';
import { loadCatalog } from '../services/catalogService';

const ADD_EVENT = 'YAi_add_to_playlist';
export const openAddToPlaylist = (st: Station) => window.dispatchEvent(new CustomEvent(ADD_EVENT, { detail: st }));

/** «В плейлист…»: отметить, в каких плейлистах станция, или создать новый */
export const AddToPlaylistModal: React.FC = () => {
  const [st, setSt] = useState<Station | null>(null);
  const [name, setName] = useState('');
  const { playlists, create, toggleStation } = usePlaylists();
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    const h = (e: Event) => {
      setSt((e as CustomEvent).detail);
      setName('');
    };
    window.addEventListener(ADD_EVENT, h);
    return () => window.removeEventListener(ADD_EVENT, h);
  }, []);
  if (!st) return null;
  const close = () => setSt(null);
  const fav = isFavorite(st.stationuuid);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in" onClick={close}>
      <div className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-zinc-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-violet-400" /> В плейлист
          </h2>
          <button onClick={close} className="p-2 -mr-2 text-zinc-400" aria-label="Закрыть">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-sm text-zinc-400 mb-3 truncate">«{st.name}»</div>
        <div className="space-y-2">
          <button onClick={() => toggleFavorite(st)} className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left ${fav ? 'bg-cyan-500/15 border-cyan-500/40' : 'bg-zinc-950/60 border-zinc-800'}`}>
            <Heart className={`w-5 h-5 ${fav ? 'text-cyan-400 fill-cyan-400' : 'text-zinc-500'}`} />
            <span className="flex-1 font-semibold">Избранное</span>
            {fav && <Check className="w-5 h-5 text-cyan-300" />}
          </button>
          {playlists.map((p) => {
            const on = p.stations.some((s) => s.stationuuid === st.stationuuid);
            return (
              <button key={p.id} onClick={() => toggleStation(p.id, st)} className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left ${on ? 'bg-violet-500/15 border-violet-500/40' : 'bg-zinc-950/60 border-zinc-800'}`}>
                <span className="text-lg">🎶</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold truncate">{p.name}</span>
                  <span className="block text-[11px] text-zinc-500">{p.stations.length} станций</span>
                </span>
                {on && <Check className="w-5 h-5 text-violet-300" />}
              </button>
            );
          })}
        </div>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            create(name, [st]);
            setName('');
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Новый плейлист: «В дорогу», «Для работы»…" className="flex-1 min-w-0 text-sm py-3 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-violet-400 focus:outline-none" />
          <button type="submit" disabled={!name.trim()} className="px-4 rounded-xl bg-violet-500 text-zinc-950 font-extrabold disabled:opacity-40" aria-label="Создать">
            <Plus className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

/** Станции из ссылки-плейлиста: id из общего каталога/эксклюзива или полная запись */
export async function resolveShared(pl: SharedPlaylist): Promise<Station[]> {
  const items = pl.items.map(unpack);
  const uuids = items.filter((x) => !x.station && !x.id.startsWith('ex-')).map((x) => x.id);
  const byId = new Map<string, Station>();
  items.forEach((x) => x.station && byId.set(x.id, x.station));
  if (items.some((x) => x.id.startsWith('ex-'))) {
    const c = await loadCatalog().catch(() => null);
    (c?.exclusive || []).flatMap((g) => g.stations).forEach((s) => byId.set(s.stationuuid, s));
  }
  for (let i = 0; i < uuids.length; i += 25) {
    const part = await fetchStationsByUuids(uuids.slice(i, i + 25)).catch(() => [] as Station[]);
    part.forEach((s) => byId.set(s.stationuuid, s));
  }
  return items.map((x) => byId.get(x.id)).filter((s): s is Station => !!s);
}

/** Плейлист, присланный другом: послушать, сохранить себе целиком или выбрать понравившиеся станции */
export const SharedPlaylistModal: React.FC<{ data: SharedPlaylist; onClose: () => void; preset?: Station[]; label?: string; note?: string }> = ({ data, onClose, preset, label, note }) => {
  const [stations, setStations] = useState<Station[] | null>(null);
  const [saved, setSaved] = useState(false);
  const { create } = usePlaylists();
  const { isFavorite, toggleFavorite, favorites } = useFavorites();
  const { playStation, currentStation, isPlaying, togglePlayPause } = useAudio();

  useEffect(() => {
    if (preset) setStations(preset);
    else resolveShared(data).then(setStations);
  }, [data, preset]);

  const allFav = () => stations?.forEach((s) => !isFavorite(s.stationuuid) && toggleFavorite(s));
  const favCount = stations?.filter((s) => favorites.some((f) => f.stationuuid === s.stationuuid)).length || 0;

  return createPortal(
    <div className="fixed inset-0 z-[66] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full sm:max-w-lg max-h-[90vh] flex flex-col bg-zinc-900 border border-violet-500/30 rounded-t-3xl sm:rounded-3xl text-zinc-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 pb-3 bg-gradient-to-br from-violet-500/20 via-cyan-500/10 to-transparent rounded-t-3xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-violet-300">{label || '🎁 Вам прислали плейлист'}</div>
              <h2 className="text-xl font-extrabold text-white truncate">{data.name}</h2>
              <div className="text-xs text-zinc-400">{note ? `${note} · ` : ''}{stations ? `${stations.length} станций` : 'Загружаем станции…'}{data.by ? ` · от ${data.by}` : ''}</div>
            </div>
            <button onClick={onClose} className="p-2 -mr-2 text-zinc-400" aria-label="Закрыть">
              <X className="w-5 h-5" />
            </button>
          </div>
          {stations && stations.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => {
                  playStation(stations[0], stations);
                  onClose(); // закрываем окно — внизу сразу виден плеер
                }}
                className="px-4 py-2.5 rounded-xl bg-violet-500 text-zinc-950 text-sm font-extrabold flex items-center gap-2 active:scale-95"
              >
                <Play className="w-4 h-4 fill-zinc-950" /> Слушать
              </button>
              <button
                onClick={() => {
                  create(data.name, stations, data.by || 'друг');
                  setSaved(true);
                }}
                disabled={saved}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 text-white text-sm font-bold flex items-center gap-2 active:scale-95 disabled:opacity-60"
              >
                {saved ? <Check className="w-4 h-4 text-violet-400" /> : <Save className="w-4 h-4 text-cyan-300" />} {saved ? 'Сохранён в «Мои плейлисты»' : 'Сохранить себе'}
              </button>
              <button onClick={allFav} className="px-4 py-2.5 rounded-xl bg-zinc-800 text-white text-sm font-bold flex items-center gap-2 active:scale-95">
                <Heart className="w-4 h-4 text-cyan-400" /> {favCount === stations.length ? 'Все в избранном' : 'Всё в избранное'}
              </button>
              <button onClick={() => openShare({ kind: 'playlist', name: data.name, stations })} className="px-4 py-2.5 rounded-xl bg-zinc-800 text-white text-sm font-bold flex items-center gap-2 active:scale-95">
                <Share2 className="w-4 h-4 text-violet-300" /> Поделиться
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {!stations && (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            </div>
          )}
          {stations?.length === 0 && <div className="p-6 text-center text-sm text-zinc-400">Станции из этой ссылки сейчас недоступны.</div>}
          {stations?.map((st) => {
            const active = currentStation?.stationuuid === st.stationuuid;
            const fav = isFavorite(st.stationuuid);
            return (
              <div key={st.stationuuid} className={`flex items-center gap-3 p-2 rounded-xl border ${active ? 'bg-violet-500/15 border-violet-500/40' : 'bg-zinc-950/60 border-zinc-800'}`}>
                <button onClick={() => (active ? togglePlayPause() : playStation(st, stations))} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <span className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                    <StationLogo favicon={st.favicon} homepage={st.homepage} name={st.name} textClass="text-xs" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white truncate">{st.name}</span>
                    <span className="block text-[11px] text-zinc-500 truncate">{st.country}</span>
                  </span>
                  {active && isPlaying ? <Pause className="w-4 h-4 text-violet-300 ml-auto shrink-0" /> : <Play className="w-4 h-4 text-zinc-500 ml-auto shrink-0" />}
                </button>
                <button onClick={() => toggleFavorite(st)} className="p-2" aria-label="В избранное">
                  <Heart className={`w-5 h-5 ${fav ? 'text-cyan-400 fill-cyan-400' : 'text-zinc-500'}`} />
                </button>
                <button onClick={() => openAddToPlaylist(st)} className="p-2" aria-label="В плейлист">
                  <ListPlus className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};
