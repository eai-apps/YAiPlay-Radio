import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { loadCatalog, CuratedList } from '../services/catalogService';
import { SharedPlaylistModal } from './PlaylistModals';
import { StationLogo } from './StationLogo';

/** «Подборки YAi» — готовые проверенные плейлисты под настроение (обновляются каждый день) */
export const CuratedSection: React.FC = () => {
  const [lists, setLists] = useState<CuratedList[]>([]);
  const [open, setOpen] = useState<CuratedList | null>(null);
  useEffect(() => {
    loadCatalog().then((c) => setLists(c.curated || []));
  }, []);
  if (!lists.length) return null;
  return (
    <section>
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-300" /> Подборки YAi
          </h2>
          <p className="text-xs text-zinc-400">Готовые плейлисты под настроение — проверяем станции каждый день</p>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {lists.map((l) => (
          <button
            key={l.id}
            onClick={() => setOpen(l)}
            className={`snap-start shrink-0 w-44 sm:w-52 h-52 rounded-3xl p-4 text-left bg-gradient-to-br ${l.gradient} relative overflow-hidden shadow-lg active:scale-[0.97] transition-transform`}
          >
            <span className="absolute -right-3 -top-3 text-7xl opacity-30 select-none">{l.emoji}</span>
            <span className="text-3xl">{l.emoji}</span>
            <span className="block mt-2 text-lg font-extrabold text-white leading-tight drop-shadow">{l.name}</span>
            <span className="block text-[11px] text-white/85 mt-1 leading-snug line-clamp-2">{l.note}</span>
            <span className="absolute left-4 bottom-4 flex items-center">
              {l.stations.slice(0, 4).map((st, i) => (
                <span key={st.stationuuid} className="w-8 h-8 rounded-lg overflow-hidden border-2 border-white/70 bg-zinc-900" style={{ marginLeft: i ? -8 : 0 }}>
                  <StationLogo favicon={st.favicon} homepage={st.homepage} name={st.name} textClass="text-[9px]" />
                </span>
              ))}
              <span className="ml-2 text-[11px] font-bold text-white/90">{l.stations.length} станций</span>
            </span>
          </button>
        ))}
      </div>
      {open && (
        <SharedPlaylistModal
          data={{ name: open.name, items: [] }}
          preset={open.stations}
          label={`${open.emoji} Подборка YAi`}
          note={open.note}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
};
