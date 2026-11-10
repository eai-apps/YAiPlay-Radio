import { CAN_SET_VOLUME } from '../utils/platform';
import { LiteImg } from './LiteImg';
import React, { useState, useEffect } from 'react';
import { useAudio } from '../context/AudioPlayerContext';
import { Station, CityWeather } from '../types/radio';
import { getStationWeather } from '../services/weatherService';
import { StationFallbackIcon } from './StationFallbackIcon';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  X,
  Heart,
  Radio,
  Clock,
  Compass,
  CloudSun,
  ShieldCheck,
  Moon,
  Sun,
  Flame,
} from 'lucide-react';

interface CarModeModalProps {
  onClose: () => void;
  favorites: Station[];
  onToggleFavorite: (station: Station) => void;
  isFavorite: (stationUuid: string) => boolean;
}

export const CarModeModal: React.FC<CarModeModalProps> = ({
  onClose,
  favorites,
  onToggleFavorite,
  isFavorite,
}) => {
  const {
    currentStation,
    isPlaying,
    isLoading,
    togglePlayPause,
    playNext,
    playPrevious,
    playStation,
    volume,
    setVolume,
    toggleMute,
    isMuted,
  } = useAudio();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentSeconds, setCurrentSeconds] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [weather, setWeather] = useState<CityWeather | null>(null);
  const [nightMode, setNightMode] = useState<boolean>(true);

  // Live Digital Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      );
      setCurrentSeconds(String(now.getSeconds()).padStart(2, '0'));
      setCurrentDate(
        now.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch weather for current station or default
  useEffect(() => {
    if (!currentStation) return;
    let isCancelled = false;
    getStationWeather(currentStation).then((res) => {
      if (!isCancelled && res) {
        setWeather(res);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [currentStation]);

  return (
    <div
      className={`fixed inset-0 z-[65] flex flex-col p-4 sm:p-8 select-none transition-colors duration-500 overflow-y-auto ${
        nightMode
          ? 'bg-black text-white'
          : 'bg-zinc-950 text-white'
      }`}
    >
      {/* Top HUD: Big Clock + Weather + HUD Controls */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        {/* Clock & Date */}
        <div className="flex items-baseline gap-3">
          <div className="font-mono text-4xl sm:text-6xl font-black tracking-tight text-white flex items-baseline">
            <span>{currentTime}</span>
            <span className="text-xl sm:text-2xl text-cyan-400 font-bold ml-1.5 opacity-80">
              :{currentSeconds}
            </span>
          </div>
          <span className="text-sm sm:text-base font-semibold text-zinc-400 capitalize hidden sm:inline">
            {currentDate}
          </span>
        </div>

        {/* Center: Live Station Weather & Timezone */}
        {weather && (
          <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-lg">
            <span className="text-2xl">{weather.icon}</span>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white font-mono">
                  {weather.temp > 0 ? `+${weather.temp}` : weather.temp}°C
                </span>
                <span className="text-xs text-violet-400 font-medium">{weather.condition}</span>
              </div>
              <div className="text-[11px] text-zinc-400">
                {weather.city} · местное {weather.localTime}
              </div>
            </div>
          </div>
        )}

        {/* HUD Quick Toggles */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setNightMode(!nightMode)}
            className="p-3 sm:px-4 sm:py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white flex items-center gap-2 text-xs font-bold"
          >
            {nightMode ? <Moon className="w-5 h-5 text-cyan-400" /> : <Sun className="w-5 h-5 text-amber-400" />}
            <span className="hidden sm:inline">{nightMode ? 'Ночной HUD' : 'Дневной'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-3 sm:px-5 sm:py-2.5 rounded-2xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 flex items-center gap-2 text-xs sm:text-sm font-bold transition-all"
          >
            <X className="w-6 h-6 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Выйти из авто-режима</span>
          </button>
        </div>
      </div>

      {/* Main Car Driving Section: Giant Controls & Now Playing */}
      <div className="flex-1 flex flex-col justify-center max-w-4xl w-full mx-auto my-auto py-2">
        {/* Station Info Banner */}
        <div className="flex items-center gap-5 p-5 sm:p-6 rounded-3xl bg-zinc-900/80 border border-white/10 shadow-2xl mb-8">
          <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 bg-black/60 border border-white/10 shadow-lg">
            {currentStation?.favicon && currentStation.favicon.startsWith('http') ? (
              <LiteImg
                src={currentStation.favicon}
                alt={currentStation.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <StationFallbackIcon className="w-full h-full p-4" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" /> ЭФИР В МАШИНЕ
              </span>
              {currentStation?.bitrate && (
                <span className="text-xs font-mono text-zinc-400">
                  {currentStation.playBitrate || currentStation.bitrate} kbps
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white truncate tracking-tight">
              {currentStation?.name || 'Выберите станцию'}
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 truncate mt-1">
              {currentStation?.country || 'YAi Global Radio'} {currentStation?.state ? `· ${currentStation.state}` : ''}
            </p>
          </div>

          {currentStation && (
            <button
              onClick={() => onToggleFavorite(currentStation)}
              className="p-4 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 text-white shrink-0"
            >
              <Heart
                className={`w-8 h-8 ${
                  isFavorite(currentStation.stationuuid)
                    ? 'fill-cyan-500 text-cyan-500'
                    : 'text-zinc-400'
                }`}
              />
            </button>
          )}
        </div>

        {/* GIANT PLAYBACK CONTROLS FOR DRIVING */}
        <div className="grid grid-cols-3 gap-4 sm:gap-6 items-center mb-8">
          <button
            onClick={playPrevious}
            className="h-24 sm:h-32 rounded-3xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 active:scale-95 transition-all flex flex-col items-center justify-center gap-1 text-zinc-200"
          >
            <SkipBack className="w-10 h-10 sm:w-14 sm:h-14" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Назад</span>
          </button>

          <button
            onClick={togglePlayPause}
            className="h-28 sm:h-40 rounded-3xl bg-gradient-to-tr from-cyan-500 via-violet-500 to-cyan-400 text-zinc-950 shadow-[0_0_40px_rgba(96,65,216,0.5)] active:scale-95 transition-all flex flex-col items-center justify-center gap-1.5"
          >
            {isLoading ? (
              <div className="w-12 h-12 border-4 border-zinc-950 border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-14 h-14 sm:w-20 sm:h-20 fill-zinc-950" />
            ) : (
              <Play className="w-14 h-14 sm:w-20 sm:h-20 fill-zinc-950 ml-1.5" />
            )}
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-zinc-950">
              {isPlaying ? 'Пауза' : 'Играть'}
            </span>
          </button>

          <button
            onClick={playNext}
            className="h-24 sm:h-32 rounded-3xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 active:scale-95 transition-all flex flex-col items-center justify-center gap-1 text-zinc-200"
          >
            <SkipForward className="w-10 h-10 sm:w-14 sm:h-14" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Вперед</span>
          </button>
        </div>

        {/* VOLUME BAR */}
        <div className={`${CAN_SET_VOLUME ? 'flex' : 'hidden'} items-center gap-4 px-6 py-4 rounded-2xl bg-zinc-900/60 border border-white/10 mb-8`}>
          <button onClick={toggleMute} className="text-zinc-400 hover:text-white">
            {isMuted || volume === 0 ? (
              <VolumeX className="w-7 h-7 text-red-400" />
            ) : (
              <Volume2 className="w-7 h-7 text-cyan-400" />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="flex-1 h-3 accent-violet-400 cursor-pointer bg-zinc-800 rounded-lg"
          />

          <span className="text-sm font-mono font-bold text-zinc-300 w-12 text-right">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>

        {/* 1-TOUCH FAVORITE STATIONS GRID */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Heart className="w-4 h-4 text-cyan-500 fill-cyan-500" />
              <span>Быстрые станции в 1 касание ({favorites.length})</span>
            </h3>
            <span className="text-xs text-zinc-400">Нажмите на плитку для мгновенного переключения</span>
          </div>

          {favorites.length === 0 ? (
            <div className="p-5 text-center text-zinc-400 rounded-2xl bg-zinc-900/40 border border-zinc-800">
              Добавьте станции в «Избранное» (сердечком), чтобы переключать их за рулем в 1 тап.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-48 overflow-y-auto pr-1">
              {favorites.map((st) => {
                const isCurrent = currentStation?.stationuuid === st.stationuuid;
                return (
                  <button
                    key={st.stationuuid}
                    onClick={() => playStation(st, favorites)}
                    className={`p-3.5 rounded-2xl text-left border flex items-center gap-3 transition-all ${
                      isCurrent
                        ? 'bg-violet-500/20 border-violet-400 text-white shadow-lg'
                        : 'bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-black/50 border border-white/5 flex items-center justify-center">
                      {st.favicon && st.favicon.startsWith('http') ? (
                        <LiteImg src={st.favicon} alt={st.name} className="w-full h-full object-cover" />
                      ) : (
                        <Radio className="w-5 h-5 text-zinc-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs truncate">{st.name}</div>
                      <div className="text-[10px] text-zinc-400 truncate">{st.country || 'Эфир'}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
