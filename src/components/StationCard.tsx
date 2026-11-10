import { StationLogo } from './StationLogo';
import React, { useState } from 'react';
import { useGeoBlocked } from '../services/streamCheck';
import { Station } from '../types/radio';
import { Play, Pause, Heart, Sparkles } from 'lucide-react';
import { StationFallbackIcon } from './StationFallbackIcon';
import { getCountryFlag } from '../constants/countries';

interface StationCardProps {
  station: Station;
  isPlaying: boolean;
  isCurrent: boolean;
  isFavorite: boolean;
  onPlay: (station: Station) => void;
  onToggleFavorite: (station: Station) => void;
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  isPlaying,
  isCurrent,
  isFavorite,
  onPlay,
  onToggleFavorite,
}) => {
  const [imageError, setImageError] = useState(false);

  const cleanTags = station?.tags
    ? station.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t.length < 20)
        .slice(0, 2)
        .join(' · ')
    : 'Онлайн радио';

  const isActivelyPlaying = Boolean(isCurrent && isPlaying);
  const flag = getCountryFlag(station?.countrycode || '');
  const countryName = station?.country || station?.countrycode || 'Мир';
  const bitrateText = station?.bitrate && station.bitrate > 0 ? `${station.bitrate} kbps` : '';
  const geoBlocked = useGeoBlocked(station?.stationuuid || '');

  return (
    <div
      onClick={() => onPlay(station)}
      className={`group relative flex flex-col p-3 rounded-2xl transition-all duration-200 cursor-pointer text-left select-none ${
        isCurrent
          ? 'bg-gradient-to-b from-cyan-950/40 via-zinc-900 to-violet-950/40 border border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
          : 'bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-zinc-700/80'
      }`}
    >
      {/* Artwork container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-950/80 mb-2.5 flex items-center justify-center">
        <StationLogo
          favicon={station?.favicon}
          homepage={station?.homepage}
          name={station?.name || 'Радио'}
          textClass="text-3xl"
          className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${isActivelyPlaying ? 'scale-105' : ''}`}
        />

        {/* Custom Station "YAi Choice" badge */}
        {station.isCustom && (
          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-theme-accent text-white shadow-lg flex items-center gap-1">
            <Sparkles className="w-3 h-3 fill-white" />
            <span>YAi Choice</span>
          </div>
        )}

        {/* Playing animated equalizer overlay */}
        {isActivelyPlaying && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center gap-1 z-10">
            <span className="w-1 bg-white rounded-full animate-eq-1" />
            <span className="w-1 bg-white rounded-full animate-eq-2" />
            <span className="w-1 bg-white rounded-full animate-eq-3" />
            <span className="w-1 bg-white rounded-full animate-eq-4" />
          </div>
        )}

        {/* Hover / Active Play-Pause Button Overlay */}
        <div
          className={`absolute bottom-2 right-2 z-20 transition-all duration-200 ${
            isCurrent
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay(station);
            }}
            aria-label={isActivelyPlaying ? 'Пауза' : 'Слушать'}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-violet-400 hover:brightness-110 text-zinc-950 font-bold flex items-center justify-center shadow-lg transition-transform active:scale-95"
          >
            {isActivelyPlaying ? (
              <Pause className="w-5 h-5 fill-zinc-950" />
            ) : (
              <Play className="w-5 h-5 fill-zinc-950 ml-0.5" />
            )}
          </button>
        </div>

        {/* Favorite Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(station);
          }}
          aria-label={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
          className={`absolute top-2 right-2 z-20 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
            isFavorite
              ? 'bg-cyan-500 text-white shadow-md'
              : 'bg-black/50 text-zinc-300 hover:text-white hover:bg-black/80 opacity-0 group-hover:opacity-100'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-white' : ''}`} />
        </button>

        {/* Закрыта для страны слушателя (проверено нашим сервером) */}
        {geoBlocked && (
          <div title="Станция не открывается из вашей страны — это ограничение самой станции, не YAi" className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/90 text-zinc-950">
            🔒 не в вашей стране
          </div>
        )}

        {/* Bitrate Badge on Image corner */}
        <div className="absolute bottom-2 left-2 z-10 px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums font-bold bg-black/75 backdrop-blur-sm text-cyan-300 border border-white/10">
          {bitrateText}
        </div>
      </div>

      {/* Station Info: Name + Country + City/Region + Genre */}
      <div className="flex flex-col min-w-0 gap-1">
        <h3
          className={`text-sm font-bold truncate leading-tight ${
            isCurrent ? 'text-cyan-300' : 'text-zinc-100 group-hover:text-white'
          }`}
          title={station.name}
        >
          {station.name}
        </h3>

        {/* Country Flag & Country Name & City/Region */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-300 truncate">
          <span className="text-sm shrink-0" title={countryName}>
            {flag}
          </span>
          <span className="truncate font-semibold text-[11px] text-zinc-200">
            {countryName}
          </span>
          {station.state && (
            <>
              <span className="text-zinc-600 text-[10px]">•</span>
              <span className="truncate text-[11px] text-zinc-400 font-medium" title={station.state}>
                {station.state}
              </span>
            </>
          )}
        </div>

        {/* Genre / Tags */}
        <div className="flex items-center gap-1 text-[11px] text-cyan-400/90 font-mono truncate">
          <span className="text-zinc-500">#</span>
          <span className="truncate text-zinc-400">{cleanTags}</span>
        </div>
      </div>
    </div>
  );
};
