import React, { useEffect, useState } from 'react';
import type { Station } from '../src/types/radio';
import { openShare } from '../src/components/ShareSheet';
import { openAddToPlaylist } from '../src/components/PlaylistModals';
import { useAudio } from '../src/context/AudioPlayerContext';
import { pickStream } from '../src/services/streamQuality';

export function StationGrid({ stations, currentStation, isPlaying, isLoading, isFavorite, onPlayStation, onToggleFavorite,
  emptyTitle = 'Станции не найдены', emptySubtitle, onResetFilters }: {
  stations: Station[]; currentStation: Station | null; isPlaying: boolean; isLoading: boolean;
  isFavorite: (id: string) => boolean; onPlayStation: (station: Station, list?: Station[]) => void;
  onToggleFavorite: (station: Station) => void; emptyTitle?: string; emptySubtitle?: string; onResetFilters?: () => void;
}) {
  const [shown, setShown] = useState(20);
  const { togglePlayPause } = useAudio();
  useEffect(() => setShown(20), [stations]);
  if (isLoading) return <p role="status">Загружаем станции…</p>;
  if (!stations.length) return <div className="lite-empty"><p>{emptyTitle}</p>{emptySubtitle && <p>{emptySubtitle}</p>}{onResetFilters && <button onClick={onResetFilters}>Сбросить фильтры</button>}</div>;
  return <><ul className="lite-stations">{stations.slice(0, shown).map((station) => {
    const current = currentStation?.stationuuid === station.stationuuid;
    return <li key={station.stationuuid} aria-current={current || undefined}>
      <button className="lite-station-play" onClick={() => current ? togglePlayPause() : onPlayStation(station, stations)} aria-label={`${current && isPlaying ? 'Пауза' : 'Слушать'} ${station.name}`}>
        <span aria-hidden>{current && isPlaying ? 'Ⅱ' : '▶'}</span><span><strong title={station.name}>{station.name}</strong><small>{[station.country, pickStream(station).bitrate ? `${pickStream(station).bitrate} кбит/с` : '', station.tags?.split(',')[0]].filter(Boolean).join(' · ')}</small></span>
      </button>
      <button aria-label={`Избранное: ${station.name}`} aria-pressed={isFavorite(station.stationuuid)} onClick={() => onToggleFavorite(station)}>{isFavorite(station.stationuuid) ? '♥' : '♡'}</button>
      <details className="lite-row-more"><summary aria-label={`Действия: ${station.name}`}>⋯</summary><div>
        <button onClick={() => openShare({ kind: 'station', station })}>Поделиться</button>
        <button onClick={() => openAddToPlaylist(station)}>В плейлист</button>
      </div></details>
    </li>;
  })}</ul>{shown < stations.length && <button onClick={() => setShown(shown + 20)}>Ещё 20 ({stations.length - shown})</button>}</>;
}
