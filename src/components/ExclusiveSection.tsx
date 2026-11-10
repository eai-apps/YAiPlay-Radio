import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { loadCatalog, Catalog } from '../services/catalogService';
import { StationGrid } from './StationGrid';
import { useAudio } from '../context/AudioPlayerContext';
import { useFavorites } from '../hooks/useFavorites';

type Group = NonNullable<Catalog['exclusive']>[number];

/** «Эксклюзив YAi»: официальные станции с собственными открытыми потоками (проверяются роботом каждый день) */
export const ExclusiveSection: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [active, setActive] = useState('');
  const [showAll, setShowAll] = useState(false);
  const { currentStation, isPlaying, playStation } = useAudio();
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    loadCatalog().then((c) => {
      const g = (c.exclusive || []).filter((x) => x.id !== 'record'); // у Record своя витрина
      setGroups(g);
      if (g.length) setActive(g[0].id);
    });
  }, []);

  if (!groups.length) return null;
  const group = groups.find((g) => g.id === active) || groups[0];

  return (
    <section>
      <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
        <Star className="w-5 h-5 text-amber-400" /> Эксклюзив YAi
      </h2>
      <p className="text-xs text-zinc-400 mb-3">Официальные станции с собственными потоками: без рекламы, в высоком качестве.</p>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => {
              setActive(g.id);
              setShowAll(false);
            }}
            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold border ${g.id === group.id ? 'bg-amber-500/15 text-amber-200 border-amber-500/40' : 'bg-zinc-900 text-zinc-300 border-zinc-800'}`}
          >
            {g.name} <span className="text-zinc-500 font-semibold">{g.stations.length}</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-zinc-500 mb-3">{group.note}</p>
      <StationGrid
        stations={showAll ? group.stations : group.stations.slice(0, 8)}
        currentStation={currentStation}
        isPlaying={isPlaying}
        isLoading={false}
        isFavorite={isFavorite}
        onPlayStation={(st) => playStation(st, group.stations)}
        onToggleFavorite={toggleFavorite}
      />
      {group.stations.length > 8 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 text-sm font-semibold text-amber-200"
        >
          {showAll ? 'Свернуть' : `Показать все ${group.stations.length} станций ${group.name}`}
        </button>
      )}
    </section>
  );
};
