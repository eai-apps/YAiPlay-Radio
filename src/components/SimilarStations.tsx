import React, { useEffect, useState } from 'react';
import { Station } from '../types/radio';
import { fetchStations } from '../services/radioApi';
import { loadCatalog } from '../services/catalogService';
import { StationLogo } from './StationLogo';

const GENERIC = new Set(['radio', 'music', 'fm', 'internet', 'online', 'webradio', 'stereo', 'live', 'other', 'misc', 'variety', 'local', 'community']);
const cache = new Map<string, Station[]>();

/** Похожие станции: тот же жанр (сначала из той же страны) или соседи по эксклюзиву */
export async function findSimilar(st: Station): Promise<Station[]> {
  if (cache.has(st.stationuuid)) return cache.get(st.stationuuid)!;
  const norm = (n: string) => n.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  const seen = new Set([norm(st.name)]);
  const out: Station[] = [];
  const add = (l: Station[]) =>
    l.forEach((s) => {
      const k = norm(s.name);
      if (s.stationuuid !== st.stationuuid && k && !seen.has(k) && out.length < 10) {
        seen.add(k);
        out.push(s);
      }
    });
  if (st.stationuuid.startsWith('ex-')) {
    const c = await loadCatalog().catch(() => null);
    const g = (c?.exclusive || []).find((x) => x.stations.some((s) => s.stationuuid === st.stationuuid));
    if (g) add([...g.stations].sort(() => Math.random() - 0.5));
  }
  const tags = (st.tags || '').split(',').map((t) => t.trim().toLowerCase()).filter((t) => t.length > 1 && !GENERIC.has(t));
  const tag = tags[0];
  if (tag && out.length < 8) {
    const [local, world] = await Promise.all([
      st.countrycode ? fetchStations({ tag, countrycode: st.countrycode, limit: 12, order: 'votes' }).catch(() => []) : Promise.resolve([] as Station[]),
      fetchStations({ tag, limit: 16, order: 'votes' }).catch(() => [] as Station[]),
    ]);
    add(local.slice(0, 5));
    add(world);
  }
  cache.set(st.stationuuid, out);
  return out;
}

export const SimilarStations: React.FC<{ station: Station; onPlay: (s: Station, list: Station[]) => void }> = ({ station, onPlay }) => {
  const [list, setList] = useState<Station[]>([]);
  useEffect(() => {
    let alive = true;
    setList([]);
    const t = setTimeout(() => findSimilar(station).then((l) => alive && setList(l)), 600);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [station.stationuuid]);
  if (!list.length) return null;
  return (
    <div className="shrink-0 mt-1">
      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 px-0.5">Похожие станции</div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {list.map((s) => (
          <button key={s.stationuuid} onClick={() => onPlay(s, list)} className="shrink-0 w-[72px] text-left active:scale-95" title={s.name}>
            <span className="block w-[72px] h-[72px] rounded-2xl overflow-hidden border border-zinc-800">
              <StationLogo favicon={s.favicon} homepage={s.homepage} name={s.name} textClass="text-sm" />
            </span>
            <span className="block mt-1 text-[10px] leading-tight text-zinc-300 line-clamp-2">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
