import React, { useState, useEffect } from 'react';
import { MOOD_CATEGORIES } from '../constants/moods';
import { MoodCategory, Station } from '../types/radio';
import { fetchStationsByMultipleTags } from '../services/radioApi';
import { useAudio } from '../context/AudioPlayerContext';
import { StationCard } from './StationCard';
import { Car, Sparkles, Play, RefreshCw, Volume2, Globe } from 'lucide-react';
import { COUNTRIES, getCountryFlag } from '../constants/countries';

interface MoodsViewProps {
  onToggleFavorite: (station: Station) => void;
  isFavorite: (stationUuid: string) => boolean;
  selectedCountry?: string;
}

export const MoodsView: React.FC<MoodsViewProps> = ({
  onToggleFavorite,
  isFavorite,
  selectedCountry = '',
}) => {
  const { playStation, currentStation, isPlaying, setIsCarModeOpen } = useAudio();
  const [selectedMood, setSelectedMood] = useState<MoodCategory>(MOOD_CATEGORIES[0]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    fetchStationsByMultipleTags(selectedMood.tags, 25, selectedCountry || undefined)
      .then((data) => {
        if (!isCancelled) {
          setStations(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedMood, selectedCountry]);

  const handlePlayFirstInMood = () => {
    if (stations.length > 0) {
      playStation(stations[0], stations);
    }
  };

  const countryObj = selectedCountry
    ? COUNTRIES.find((c) => c.code.toUpperCase() === selectedCountry.toUpperCase())
    : null;

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-16">
      {/* CAR MODE PROMO HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-gradient-to-r from-slate-950 via-zinc-900 to-[#041a14] border border-cyan-500/30 shadow-[0_10px_30px_-10px_rgba(6,182,212,0.3)]">
        <div className="absolute top-0 right-0 w-72 h-72 bg-violet-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 p-0.5 shrink-0 shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center">
              <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center text-cyan-400">
                <Car className="w-7 h-7 text-cyan-400" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                  YAi AUTO
                </span>
                <span className="text-xs text-zinc-400 font-mono">Безопасное вождение</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Автомобильный режим (Car Mode)
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-lg">
                Огромные кнопки управления в 1 касание, большие часы, погода за бортом и быстрый доступ к вашим любимым радиостанциям за рулём.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCarModeOpen(true)}
            className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 via-violet-500 to-cyan-400 text-zinc-950 font-extrabold text-sm rounded-2xl shadow-lg shadow-violet-500/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2.5 shrink-0"
          >
            <Car className="w-5 h-5 fill-zinc-950" />
            <span>Включить «За рулем»</span>
          </button>
        </div>
      </div>

      {/* SECTION HEADER & PINNED QUICK CATEGORIES BAR */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-cyan-400" />
              <span>Подборки по настроению и занятиям</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Музыкальные потоки для спорта, отдыха, медитации, работы и сна
            </p>
          </div>

          {stations.length > 0 && (
            <button
              onClick={handlePlayFirstInMood}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-800 border border-violet-500/40 text-xs font-bold text-white flex items-center gap-2 self-start sm:self-auto hover:brightness-110 shadow transition-all"
            >
              <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
              <span>Включить «{selectedMood.name}»</span>
            </button>
          )}
        </div>

        {/* PINNED HORIZONTAL MOOD PILLS (STICKY / FIXED ACCESS) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
          {MOOD_CATEGORIES.map((m) => {
            const isCurrent = selectedMood.id === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMood(m)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all select-none border shrink-0 ${
                  isCurrent
                    ? 'bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-cyan-500/10 text-cyan-300 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400/50'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
                }`}
              >
                <span className="text-base">{m.emoji}</span>
                <span>{m.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 8 DETAILED MOOD CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {MOOD_CATEGORIES.map((mood) => {
          const isSelected = selectedMood.id === mood.id;
          return (
            <button
              key={mood.id}
              onClick={() => setSelectedMood(mood)}
              className={`text-left p-4 rounded-2xl transition-all relative overflow-hidden group border ${
                isSelected
                  ? 'bg-zinc-900 border-violet-400 shadow-[0_0_25px_rgba(96,65,216,0.25)] ring-1 ring-violet-400/40'
                  : 'bg-zinc-950/70 border-zinc-800/80 hover:bg-zinc-900/80 hover:border-zinc-700'
              }`}
            >
              {/* Subtle gradient background on hover/active */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${mood.gradient} opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity`}
              />

              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl sm:text-3xl p-2 rounded-xl bg-zinc-900/90 border border-white/5 shadow-inner">
                    {mood.emoji}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-white group-hover:text-violet-300 transition-colors">
                      {mood.name}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-medium">{mood.subTitle}</p>
                  </div>
                </div>

                {isSelected && (
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse mt-1 shrink-0" />
                )}
              </div>

              <p className="relative z-10 text-xs text-zinc-400 mt-2.5 line-clamp-2 leading-relaxed">
                {mood.description}
              </p>

              {/* Tag previews */}
              <div className="relative z-10 flex flex-wrap gap-1 mt-2.5">
                {mood.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900/90 border border-white/5 text-zinc-300 font-mono"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* STATIONS SECTION FOR SELECTED MOOD */}
      <div className="mt-2 pt-4 border-t border-zinc-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{selectedMood.emoji}</span>
            <h3 className="text-lg font-bold text-white">
              Потоки для: <span className="text-violet-400">{selectedMood.name}</span>
            </h3>
            <span className="text-xs text-zinc-400 font-mono">({stations.length} станций)</span>
          </div>

          {selectedCountry && countryObj && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-mono">
              <span>{countryObj.flag}</span>
              <span>Фильтр: {countryObj.name}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-sm font-medium">Загрузка эфиров для «{selectedMood.name}»...</p>
          </div>
        ) : stations.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 bg-zinc-950/40 rounded-2xl border border-zinc-900">
            <p className="text-sm">Станции по данным тегам временно недоступны</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {stations.map((station) => {
              const isCurrent = currentStation?.stationuuid === station.stationuuid;
              return (
                <StationCard
                  key={station.stationuuid}
                  station={station}
                  isCurrent={isCurrent}
                  isPlaying={isPlaying && isCurrent}
                  onPlay={() => playStation(station, stations)}
                  isFavorite={isFavorite(station.stationuuid)}
                  onToggleFavorite={() => onToggleFavorite(station)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
