import { StationLogo } from './StationLogo';
import React from 'react';
import { History, Play, Pause } from 'lucide-react';
import { useAudio } from '../context/AudioPlayerContext';
import { StationFallbackIcon } from './StationFallbackIcon';

/** «Продолжить слушать»: последние станции, включаются одним нажатием */
export const ContinueListening: React.FC = () => {
  const { recentStations, currentStation, isPlaying, playStation, togglePlayPause } = useAudio();
  if (!recentStations.length) return null;

  return (
    <section>
      <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
        <History className="w-5 h-5 text-violet-400" /> Продолжить слушать
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x scrollbar-none">
        {recentStations.map((st) => {
          const active = currentStation?.stationuuid === st.stationuuid;
          return (
            <button
              key={st.stationuuid}
              onClick={() => (active ? togglePlayPause() : playStation(st, recentStations))}
              className={`snap-start shrink-0 w-28 sm:w-32 text-left rounded-2xl p-2 border transition-colors active:scale-95 ${active ? 'bg-violet-500/15 border-violet-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
            >
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-800 mb-2">
                <StationLogo favicon={st.favicon} homepage={st.homepage} name={st.name} textClass="text-2xl" />
                <span className="absolute bottom-1.5 right-1.5 w-8 h-8 rounded-full bg-violet-500 text-zinc-950 flex items-center justify-center shadow-lg">
                  {active && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </span>
              </div>
              <div className="text-xs font-semibold text-white line-clamp-2 leading-snug">{st.name}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
