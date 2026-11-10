import React, { useState } from 'react';
import { LiteImg } from './LiteImg';
import { Search, Radio, X, Loader2, Play } from 'lucide-react';
import { Station } from '../types/radio';
import { fetchStations } from '../services/radioApi';
import { GENRES } from '../constants/genres';
import { COUNTRIES } from '../constants/countries';
import { useAudio } from '../context/AudioPlayerContext';

interface Props {
  value: Station | null | undefined;
  customStations: Station[];
  onChange: (st: Station | null) => void;
}

/** Админка: выбор «Станции YAiPlay Radio» — главной кнопки на сайте */
export const FeaturedStationPicker: React.FC<Props> = ({ value, customStations, onChange }) => {
  const { playStation } = useAudio();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState('');
  const [genre, setGenre] = useState('');

  const browse = async () => {
    setLoading(true);
    try {
      setResults(await fetchStations({ countrycode: country || undefined, tag: genre || undefined, limit: 60 }));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = q.trim();
    if (!query) return;
    setLoading(true);
    try {
      const own = customStations.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));
      const found = await fetchStations({ name: query, limit: 30 });
      setResults([...own, ...found]);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const pick = (st: Station) => {
    // Сохраняем только нужные поля, чтобы content.json оставался компактным
    const { stationuuid, name, url, url_resolved, favicon, tags, country, countrycode, bitrate, codec, homepage, isCustom } = st;
    onChange({ stationuuid, name, url, url_resolved, favicon, tags, country, countrycode, bitrate, codec, homepage, isCustom });
    setResults([]);
    setQ('');
  };

  return (
    <div className="p-4 rounded-2xl bg-zinc-950/70 border border-violet-500/30 space-y-3">
      <div>
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Radio className="w-4 h-4 text-violet-400" /> Станция «YAiPlay Radio» (главная кнопка на сайте)
        </h4>
        <p className="text-[11px] text-zinc-400 mt-1">
          Найдите станцию в каталоге или среди своих станций и нажмите «Назначить». Кнопка на главной будет включать именно её.
        </p>
      </div>

      {value ? (
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30">
          <span className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 flex items-center justify-center shrink-0">
            {value.favicon ? <LiteImg src={value.favicon} alt="" className="w-full h-full object-cover" /> : <Radio className="w-4 h-4 text-zinc-500" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-white truncate">{value.name}</div>
            <div className="text-[11px] text-zinc-400 truncate">{value.url_resolved || value.url}</div>
          </div>
          <button type="button" onClick={() => playStation(value)} className="p-2 rounded-lg bg-zinc-800 text-white" title="Проверить звук">
            <Play className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onChange(null)} className="p-2 rounded-lg bg-zinc-800 text-zinc-300" title="Убрать">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <p className="text-xs text-amber-300">Не назначена — кнопка включает самую популярную станцию.</p>
      )}

      <form onSubmit={search} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Название станции…"
          className="flex-1 text-xs py-2.5 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-violet-400 focus:outline-none text-white"
        />
        <button type="submit" className="px-4 rounded-xl bg-violet-500 text-zinc-950 text-xs font-bold flex items-center gap-1.5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Найти
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <select value={country} onChange={(e) => setCountry(e.target.value)} className="flex-1 min-w-[140px] text-xs py-2.5 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white">
          {COUNTRIES.map((c) => (
            <option key={c.code || 'all'} value={c.code}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
        <select value={genre} onChange={(e) => setGenre(e.target.value)} className="flex-1 min-w-[140px] text-xs py-2.5 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white">
          {GENRES.map((g) => (
            <option key={g.id} value={g.tag}>
              {g.tag ? g.name : 'Все жанры'}
            </option>
          ))}
        </select>
        <button type="button" onClick={browse} className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold">
          Показать список
        </button>
      </div>

      {results.length > 0 && (
        <div className="max-h-64 overflow-y-auto space-y-1">
          {results.map((st) => (
            <div key={st.stationuuid} className="flex items-center gap-2 p-2 rounded-xl bg-zinc-900/70">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate">
                  {st.isCustom ? '⭐ ' : ''}
                  {st.name}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">{[st.country, st.bitrate ? `${st.bitrate} kbps` : ''].filter(Boolean).join(' · ')}</div>
              </div>
              <button type="button" onClick={() => playStation(st)} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-200" title="Прослушать">
                <Play className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => pick(st)} className="px-2.5 py-1.5 rounded-lg bg-violet-500 text-zinc-950 text-[11px] font-bold">
                Назначить
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
