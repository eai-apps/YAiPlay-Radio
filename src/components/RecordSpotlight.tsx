import React, { useEffect, useState } from 'react';
import { Flame, Play, Pause, ChevronRight } from 'lucide-react';
import { loadCatalog } from '../services/catalogService';
import { Station } from '../types/radio';
import { useAudio } from '../context/AudioPlayerContext';
import { StationLogo } from './StationLogo';

export const openRecord = () => window.dispatchEvent(new CustomEvent('YAi_open_record'));

/** Radio Record — главный эксклюзив YAi: яркая витрина с каналами */
export const RecordSpotlight: React.FC = () => {
  const [list, setList] = useState<Station[]>([]);
  const [all, setAll] = useState(false);
  const ref = React.useRef<HTMLElement | null>(null);
  const { playStation, currentStation, isPlaying, togglePlayPause } = useAudio();

  useEffect(() => {
    loadCatalog().then((c) => setList(c.exclusive?.find((g) => g.id === 'record')?.stations || []));
    const h = () => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.addEventListener('YAi_open_record', h);
    return () => window.removeEventListener('YAi_open_record', h);
  }, []);

  if (!list.length) return null;
  const shown = all ? list : list.slice(0, 12);

  return (
    <section ref={ref} className="scroll-mt-24 relative overflow-hidden rounded-3xl p-4 sm:p-6 border border-orange-500/40 bg-gradient-to-br from-[#2a0d05] via-zinc-950 to-[#1f0a14]">
      <div className="absolute -top-24 -right-16 w-80 h-80 bg-orange-500/25 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-10 w-72 h-72 bg-fuchsia-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-orange-500 text-zinc-950 mb-2">
            <Flame className="w-3.5 h-3.5" /> ЭКСКЛЮЗИВ YAi
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Radio Record</h2>
          <p className="text-xs sm:text-sm text-orange-100/80">{list.length} официальных каналов: танцевальная музыка, хиты, клубные сеты — 320 kbps</p>
        </div>
        <button
          onClick={() => playStation(list[0], list)}
          className="self-start sm:self-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-cyan-500 text-white font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-orange-500/30 active:scale-95"
        >
          <Play className="w-4 h-4 fill-white" /> Слушать Record
        </button>
      </div>
      <div className="relative grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {shown.map((st) => {
          const active = currentStation?.stationuuid === st.stationuuid;
          return (
            <button
              key={st.stationuuid}
              onClick={() => (active ? togglePlayPause() : playStation(st, list))}
              className={`group text-left rounded-2xl p-2 border transition active:scale-95 ${active ? 'bg-orange-500/20 border-orange-400/60' : 'bg-black/40 border-white/5 hover:border-orange-400/40'}`}
            >
              <span className="relative block aspect-square rounded-xl overflow-hidden mb-1.5">
                <StationLogo favicon={st.favicon} name={st.name.replace(/^Record — /, '')} textClass="text-xl" />
                <span className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  {active && isPlaying ? <Pause className="w-7 h-7 text-white" /> : <Play className="w-7 h-7 text-white fill-white" />}
                </span>
              </span>
              <span className="block text-[11px] sm:text-xs font-semibold text-white truncate">{st.name.replace(/^Record — /, '')}</span>
            </button>
          );
        })}
      </div>
      {list.length > 12 && (
        <button onClick={() => setAll((v) => !v)} className="relative mt-3 text-sm font-bold text-orange-200 flex items-center gap-1">
          {all ? 'Свернуть' : `Все ${list.length} каналов`} <ChevronRight className={`w-4 h-4 transition-transform ${all ? '-rotate-90' : ''}`} />
        </button>
      )}
    </section>
  );
};
