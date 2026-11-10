import React, { useEffect, useRef, useState } from 'react';
import { Heart, Play, Shuffle, ChevronDown, ListMusic, Pause, Share2, Plus, Pencil, Trash2, ListPlus, X, Check } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { usePlaylists, FAVORITES_ID } from '../hooks/usePlaylists';
import { useAudio } from '../context/AudioPlayerContext';
import { StationLogo } from './StationLogo';
import { openShare } from './ShareSheet';
import { openAddToPlaylist } from './PlaylistModals';

export const openPlaylist = () => window.dispatchEvent(new CustomEvent('yaiplayradio_open_playlist'));

/**
 * «Мои плейлисты»: «Избранное» (станции с ♥) и свои плейлисты.
 * Любым можно поделиться ссылкой, станции — переносить между плейлистами.
 */
export const MyPlaylist: React.FC<{ onGoFavorites: () => void }> = ({ onGoFavorites }) => {
  const { favorites, toggleFavorite } = useFavorites();
  const { playlists, create, rename, remove, removeStation } = usePlaylists();
  const { playStation, currentStation, isPlaying, togglePlayPause } = useAudio();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string>(FAVORITES_ID);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const h = () => {
      setOpen(true);
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    };
    window.addEventListener('yaiplayradio_open_playlist', h);
    return () => window.removeEventListener('yaiplayradio_open_playlist', h);
  }, []);

  const current = sel === FAVORITES_ID ? null : playlists.find((p) => p.id === sel) || null;
  useEffect(() => {
    if (sel !== FAVORITES_ID && !current) setSel(FAVORITES_ID);
  }, [sel, current]);
  const list = current ? current.stations : favorites;
  const listName = current ? current.name : 'Избранное';
  const total = favorites.length + playlists.reduce((n, p) => n + p.stations.length, 0);

  const playAll = (shuffle = false) => {
    if (!list.length) return;
    const l = shuffle ? [...list].sort(() => Math.random() - 0.5) : list;
    playStation(l[0], l);
  };
  const newPlaylist = () => {
    const id = create(`Плейлист ${playlists.length + 1}`);
    setSel(id);
    setEditing(id);
    setDraft(`Плейлист ${playlists.length + 1}`);
  };

  const pill = (id: string, label: React.ReactNode, count: number) => (
    <button
      key={id}
      onClick={() => {
        setSel(id);
        setEditing(null);
        setConfirmDel(false);
      }}
      className={`shrink-0 px-3.5 py-2 rounded-xl text-sm font-bold border flex items-center gap-1.5 ${sel === id ? 'bg-violet-500 text-zinc-950 border-violet-400' : 'bg-zinc-950/60 text-zinc-200 border-zinc-800'}`}
    >
      {label} <span className={`text-xs ${sel === id ? 'text-zinc-800' : 'text-zinc-500'}`}>{count}</span>
    </button>
  );

  return (
    <section ref={ref} className="scroll-mt-24">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-4 p-4 sm:p-5 rounded-3xl text-left border transition-all active:scale-[0.99] ${
          open ? 'bg-gradient-to-r from-violet-500/25 via-cyan-500/15 to-cyan-400/20 border-violet-400/50' : 'bg-gradient-to-r from-violet-500/15 via-zinc-900 to-zinc-900 border-violet-500/30 hover:border-violet-400/60'
        }`}
      >
        <span className="relative w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-violet-400 via-cyan-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-500/30">
          <ListMusic className="w-7 h-7 text-zinc-950" />
          {total > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-6 h-6 px-1.5 rounded-full bg-cyan-500 text-white text-xs font-extrabold flex items-center justify-center border-2 border-zinc-950">
              {playlists.length + 1}
            </span>
          )}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-lg font-extrabold text-white">Мои плейлисты</span>
          <span className="block text-xs text-zinc-300">
            {total ? `Избранное и ${playlists.length} ${playlists.length === 1 ? 'плейлист' : 'плейлистов'} · делитесь с друзьями` : 'Нажимайте ♥ у станций и собирайте свои плейлисты'}
          </span>
        </span>
        <ChevronDown className={`w-6 h-6 text-violet-300 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className={`grid transition-all duration-500 ease-out ${open ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="p-3 sm:p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            {/* Выбор плейлиста */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 -mx-1 px-1">
              {pill(FAVORITES_ID, <><Heart className="w-4 h-4" /> Избранное</>, favorites.length)}
              {playlists.map((p) => pill(p.id, <>🎶 {p.name}</>, p.stations.length))}
              <button onClick={newPlaylist} className="shrink-0 px-3.5 py-2 rounded-xl text-sm font-bold border border-dashed border-violet-500/50 text-violet-300 flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Новый
              </button>
            </div>

            {/* Название (переименование) */}
            {current && editing === current.id ? (
              <form
                className="flex gap-2 mb-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  rename(current.id, draft);
                  setEditing(null);
                }}
              >
                <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="flex-1 min-w-0 text-sm py-2.5 px-3 rounded-xl bg-zinc-950 border border-violet-500/50 focus:outline-none" />
                <button type="submit" className="px-3 rounded-xl bg-violet-500 text-zinc-950" aria-label="Сохранить">
                  <Check className="w-5 h-5" />
                </button>
              </form>
            ) : current?.from ? (
              <div className="text-[11px] text-cyan-300 mb-2">🎁 Плейлист от: {current.from}</div>
            ) : null}

            {/* Действия */}
            <div className="flex flex-wrap gap-2 mb-3">
              <button disabled={!list.length} onClick={() => playAll(false)} className="px-4 py-2.5 rounded-xl bg-violet-500 text-zinc-950 text-sm font-extrabold flex items-center gap-2 active:scale-95 disabled:opacity-40">
                <Play className="w-4 h-4 fill-zinc-950" /> Слушать всё
              </button>
              <button disabled={!list.length} onClick={() => playAll(true)} className="px-3.5 py-2.5 rounded-xl bg-zinc-800 text-white text-sm font-bold flex items-center gap-2 active:scale-95 disabled:opacity-40">
                <Shuffle className="w-4 h-4 text-cyan-400" /> Перемешать
              </button>
              <button
                disabled={!list.length}
                onClick={() => openShare({ kind: 'playlist', name: listName === 'Избранное' ? 'Моё избранное' : listName, stations: list })}
                className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/30 to-violet-500/30 border border-violet-500/40 text-white text-sm font-bold flex items-center gap-2 active:scale-95 disabled:opacity-40"
              >
                <Share2 className="w-4 h-4 text-violet-300" /> Поделиться
              </button>
              {current ? (
                <>
                  <button
                    onClick={() => {
                      setEditing(current.id);
                      setDraft(current.name);
                    }}
                    className="px-3 py-2.5 rounded-xl bg-zinc-800 text-zinc-200 text-sm font-bold flex items-center gap-1.5"
                    aria-label="Переименовать"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (!confirmDel) return setConfirmDel(true);
                      remove(current.id);
                      setConfirmDel(false);
                    }}
                    className={`px-3 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 ${confirmDel ? 'bg-cyan-500 text-white' : 'bg-zinc-800 text-zinc-300'}`}
                  >
                    <Trash2 className="w-4 h-4" /> {confirmDel ? 'Точно удалить?' : ''}
                  </button>
                </>
              ) : (
                <button onClick={onGoFavorites} className="px-3.5 py-2.5 rounded-xl bg-zinc-800 text-white text-sm font-bold flex items-center gap-2 active:scale-95">
                  <Heart className="w-4 h-4 text-cyan-400" /> Изменить
                </button>
              )}
            </div>

            {list.length === 0 ? (
              <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-sm text-zinc-300 text-center">
                {current ? (
                  <>
                    Плейлист пуст. В плеере нажмите <b className="text-white">＋ В плейлист</b> — и станция появится здесь.
                  </>
                ) : (
                  <>
                    <Heart className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                    Нажмите <b className="text-white">♥</b> у любой станции — в жанрах, эксклюзиве, поиске или в плеере.
                  </>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto pr-1">
                {list.map((st, i) => {
                  const active = currentStation?.stationuuid === st.stationuuid;
                  return (
                    <div
                      key={st.stationuuid}
                      style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                      className={`animate-fade-in flex items-center gap-2 p-2 rounded-xl border ${active ? 'bg-violet-500/15 border-violet-500/40' : 'bg-zinc-950/60 border-zinc-800'}`}
                    >
                      <button onClick={() => (active ? togglePlayPause() : playStation(st, list))} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                        <span className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                          <StationLogo favicon={st.favicon} homepage={st.homepage} name={st.name} textClass="text-xs" />
                        </span>
                        <span className="flex-1 min-w-0 text-sm font-semibold text-white truncate">{st.name}</span>
                        {active && isPlaying ? <Pause className="w-4 h-4 text-violet-300 shrink-0" /> : <Play className="w-4 h-4 text-zinc-500 shrink-0" />}
                      </button>
                      <button onClick={() => openAddToPlaylist(st)} className="p-1.5 text-zinc-400 hover:text-violet-300" title="В другой плейлист" aria-label="В другой плейлист">
                        <ListPlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => (current ? removeStation(current.id, st.stationuuid) : toggleFavorite(st))}
                        className="p-1.5 text-zinc-500 hover:text-cyan-400"
                        title="Убрать отсюда"
                        aria-label="Убрать"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
