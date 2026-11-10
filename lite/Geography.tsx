import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchStations, fetchStationsByUuids, deduplicateStations } from '../src/services/radioApi';
import { useAudio } from '../src/context/AudioPlayerContext';
import { useFavorites } from '../src/hooks/useFavorites';
import { useYAiSettings } from '../src/context/YAiSettingsContext';
import { COUNTRIES } from '../src/constants/countries';
import { StationGrid } from './StationGrid';
import type { Station } from '../src/types/radio';
import { DATA_BASE } from '../src/utils/platform';

// Same geographic catalog as the main globe. A static point map needs no WebGL or textures.
type Point = [number, number, number, string, string, string[]?];
export default function Geography() {
  const [points, setPoints] = useState<Point[]>([]);
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [selection, setSelection] = useState<Point | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const audio = useAudio();
  const { settings } = useYAiSettings();
  const { isFavorite, toggleFavorite } = useFavorites();
  const requestId = useRef(0);
  useEffect(() => {
    const abort = new AbortController();
    fetch(`${DATA_BASE}geo.json`, { signal: abort.signal }).then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setPoints(data.points || [])).catch((e) => { if (e.name !== 'AbortError') setError('Не удалось загрузить города. Обновите страницу.'); });
    return () => abort.abort();
  }, []);
  const filtered = useMemo(() => points.filter((p) => !(settings.hiddenCountries?.radio || []).includes(p[3]) &&
    (!country || p[3] === country) && (!city || `${p[4]} ${p[3]}`.toLowerCase().includes(city.toLowerCase()))), [points, country, city, settings.hiddenCountries]);
  const choose = async (point: Point) => {
    const id = ++requestId.current;
    setSelection(point); setBusy(true); setError('');
    try {
      const list = point[4] ? await fetchStations({ countrycode: point[3], state: point[4], limit: 30 }) : await fetchStationsByUuids(point[5] || []);
      if (id === requestId.current) setStations(deduplicateStations(list));
    } catch { if (id === requestId.current) setError('Станции не загрузились. Выберите город ещё раз.'); }
    finally { if (id === requestId.current) setBusy(false); }
  };
  return <section><p className="lite-muted">Та же география, что на глобусе основного сайта. Статичная карта и поиск по городам.</p>
    <div className="lite-filters"><label>Страна<select value={country} onChange={(e) => setCountry(e.target.value)}><option value="">Весь мир</option>{COUNTRIES.filter((c) => !(settings.hiddenCountries?.radio || []).includes(c.code)).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label><label>Город / регион<input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Berlin" /></label></div>
    <svg className="lite-map" viewBox="0 0 360 180" role="img" aria-label="Статичная карта расположения радиостанций"><rect width="360" height="180" fill="#172b22" />{[30,60,90,120,150].map((y) => <path key={y} d={`M0 ${y}H360`} stroke="#2b4136" />)}{filtered.map((p, i) => <circle key={i} cx={p[1] + 180} cy={90 - p[0]} r={selection === p ? 3 : 1.1} fill={selection === p ? '#fff' : '#81d8a4'} />)}</svg>
    <label>Город с радиостанциями<select value={selection ? String(points.indexOf(selection)) : ''} onChange={(e) => { if (e.target.value !== '') void choose(points[Number(e.target.value)]); }}><option value="">Выберите город ({filtered.length})</option>{filtered.map((p) => <option key={points.indexOf(p)} value={points.indexOf(p)}>{p[4] || COUNTRIES.find((c) => c.code === p[3])?.name || p[3]} · {p[3]} · {p[2]} станций</option>)}</select></label>
    {error && <p role="alert">{error}</p>}
    {selection && <><h2>{selection[4] || selection[3]}</h2><StationGrid stations={deduplicateStations(stations)} currentStation={audio.currentStation} isPlaying={audio.isPlaying} isLoading={busy} isFavorite={isFavorite} onPlayStation={audio.playStation} onToggleFavorite={toggleFavorite} /></>}
  </section>;
}
