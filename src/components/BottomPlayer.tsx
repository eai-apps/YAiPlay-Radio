import { StationLogo } from './StationLogo';
import { FEATURES, CAN_SET_VOLUME } from '../utils/platform';
import { liveFallbackLabel } from '../services/rdsService';
import React, { useState, useEffect } from 'react';
import { useAudio } from '../context/AudioPlayerContext';
import { StationFallbackIcon } from './StationFallbackIcon';
import { SleepTimerModal } from './SleepTimerModal';
import { CityWeather } from '../types/radio';
import { getStationWeather } from '../services/weatherService';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Volume1,
  VolumeX,
  Maximize2,
  Heart,
  Moon,
  Clock,
  Sliders,
  Disc,
  Circle,
  Car,
  Bell,
  Bookmark,
  Check,
} from 'lucide-react';

interface BottomPlayerProps {
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export const BottomPlayer: React.FC<BottomPlayerProps> = ({
  isFavorite,
  onToggleFavorite,
}) => {
  const {
    currentStation,
    currentTrackTitle,
    isPlaying,
    isLoading,
    togglePlayPause,
    playNext,
    playPrevious,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    setIsFullScreenOpen,
    sleepTimerRemainingSec,
    setIsCarModeOpen,
    setIsEqualizerOpen,
    nativeEngine,
    setIsRecorderOpen,
    setIsAlarmOpen,
    isRecording,
    recordingDurationSec,
    startRecording,
    stopRecording,
    bookmarkCurrentTrack,
  } = useAudio();

  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);
  const [stationWeather, setStationWeather] = useState<CityWeather | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  // Fetch station weather
  useEffect(() => {
    if (!currentStation) {
      setStationWeather(null);
      return;
    }
    let cancelled = false;
    getStationWeather(currentStation).then((w) => {
      if (!cancelled && w) {
        setStationWeather(w);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentStation]);

  if (!currentStation) return null;

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const cleanGenre =
    currentStation.tags
      ?.split(',')[0]
      ?.trim()
      ?.replace(/^#/, '') ||
    currentStation.country ||
    'Radio';

  return (
    <>
      <div className="fixed left-0 right-0 z-40 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 bg-zinc-900/95 backdrop-blur-xl border-t border-violet-500/30 md:border-zinc-800/80 px-3 sm:px-6 py-2 md:py-2.5 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Station info + Cover + Weather badge */}
          <div
            className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial sm:w-88 cursor-pointer"
            onClick={() => setIsFullScreenOpen(true)}
          >
            {/* Station Icon / Cover - Spins ONLY when isPlaying is true */}
            <div className={`relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 shadow-md ${isPlaying ? 'shadow-[0_0_15px_rgba(96,65,216,0.4)] border-violet-500/50' : ''}`}>
              {currentStation ? (
                <StationLogo key={currentStation.stationuuid} favicon={currentStation.favicon} homepage={currentStation.homepage} name={currentStation.name || 'Радио'} />
              ) : (
                <StationFallbackIcon name="YAi Radio" className="w-full h-full p-2" />
              )}

              {isPlaying && (
                <div className="absolute inset-0 bg-violet-500/10 flex items-center justify-center pointer-events-none">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping" />
                </div>
              )}
            </div>

            {/* Station Titles + RDS LIVE */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white truncate hover:underline" title={currentStation?.name || 'Радио'}>
                  {currentStation?.name || 'Радиостанция'}
                </span>
                {currentStation?.bitrate && currentStation.bitrate > 0 ? (
                  <span className="hidden sm:inline-block px-1.5 py-0.2 bg-zinc-800 text-[10px] font-mono tabular-nums text-violet-400 font-bold rounded shrink-0">
                    {currentStation.playBitrate || currentStation.bitrate}k
                  </span>
                ) : null}
              </div>

              {/* Prominent RDS LIVE Track Banner */}
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-violet-400 font-semibold truncate">
                <span className="px-1.5 py-0.5 rounded-md bg-violet-500/20 text-[9px] font-mono font-bold text-violet-300 border border-violet-500/40 shrink-0 hidden sm:flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
                  <span>{currentTrackTitle ? '🎵 ПЕСНЯ:' : '📡 ЭФИР:'}</span>
                </span>
                <span className="truncate text-white font-medium hover:text-violet-300 transition-colors" title={currentTrackTitle || liveFallbackLabel(currentStation)}>
                  {currentTrackTitle || liveFallbackLabel(currentStation)}
                </span>
                {stationWeather && (
                  <span
                    className="hidden lg:inline-flex items-center gap-1 text-[10px] font-mono text-cyan-300 ml-1 shrink-0"
                    title={`${stationWeather.city}: ${stationWeather.condition}, местное время ${stationWeather.localTime}`}
                  >
                    <span>·</span>
                    <span>{stationWeather.icon}</span>
                    <span>{(stationWeather.temp ?? 0) > 0 ? `+${stationWeather.temp}` : stationWeather.temp}°C</span>
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons: Bookmark track + Favorite */}
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const ok = bookmarkCurrentTrack();
                  if (ok) {
                    setSavedNotice(true);
                    setTimeout(() => setSavedNotice(false), 2000);
                  }
                }}
                aria-label="Запомнить трек"
                title={savedNotice ? 'Трек сохранен в историю!' : 'Запомнить трек (RDS)'}
                className={`p-2 rounded-lg transition-colors ${
                  savedNotice ? 'text-cyan-400 bg-cyan-500/20' : 'text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800'
                }`}
              >
                {savedNotice ? <Check className="w-4 h-4 text-cyan-400" /> : <Bookmark className="w-4 h-4" />}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                aria-label={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
                className="p-2 text-zinc-400 hover:text-white transition-colors shrink-0"
              >
                <Heart
                  className={`w-5 h-5 ${isFavorite ? 'fill-cyan-500 text-cyan-500' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Center: Playback Controls */}
          <div
            className="flex items-center gap-2 sm:gap-4 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={playPrevious}
              aria-label="Предыдущая станция"
              className="hidden sm:flex w-9 h-9 rounded-full items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={togglePlayPause}
              disabled={isLoading}
              aria-label={isPlaying ? 'Пауза' : 'Слушать'}
              className="w-14 h-14 md:w-11 md:h-11 shrink-0 rounded-full bg-gradient-to-r from-cyan-500 via-violet-500 to-cyan-400 hover:brightness-110 text-zinc-950 flex items-center justify-center shadow-lg shadow-violet-500/25 transition-transform active:scale-95"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-6 h-6 md:w-5 md:h-5 fill-zinc-950" />
              ) : (
                <Play className="w-6 h-6 md:w-5 md:h-5 fill-zinc-950 ml-0.5" />
              )}
            </button>

            <button
              onClick={playNext}
              aria-label="Следующая станция"
              className="flex w-9 h-9 rounded-full items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Right: FX, Recorder, Car Mode, Sleep Timer, Volume, Fullscreen */}
          <div
            className="hidden md:flex items-center justify-end gap-2.5 flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Record Radio Stream Button */}
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-600/30 text-cyan-400 border border-cyan-500/50 text-xs font-mono font-bold animate-pulse"
                title="Остановить запись"
              >
                <Circle className="w-3 h-3 fill-cyan-500" />
                <span>REC {formatRemaining(recordingDurationSec)}</span>
              </button>
            ) : FEATURES.recorder ? (
              <button
                onClick={() => setIsRecorderOpen(true)}
                title="Запись эфира"
                className="p-2 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800/80 rounded-xl transition-colors"
              >
                <Disc className="w-4 h-4" />
              </button>
            ) : null}

            {/* Equalizer */}
            {nativeEngine && (
            <button
              onClick={() => setIsEqualizerOpen(true)}
              title="Эквалайзер YAi PRO"
              className="p-2 text-zinc-400 hover:text-violet-400 hover:bg-zinc-800/80 rounded-xl transition-colors"
            >
              <Sliders className="w-4 h-4" />
            </button>
            )}

            {/* Car Mode */}
            <button
              onClick={() => setIsCarModeOpen(true)}
              title="Режим «За рулем» (Car Mode)"
              className="p-2 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800/80 rounded-xl transition-colors"
            >
              <Car className="w-4 h-4" />
            </button>

            {/* Alarm Clock */}
            <button
              onClick={() => setIsAlarmOpen(true)}
              title="Радио-будильник"
              className="p-2 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800/80 rounded-xl transition-colors"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* Sleep Timer badge / trigger */}
            <button
              onClick={() => setIsSleepModalOpen(true)}
              title="Таймер сна"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                sleepTimerRemainingSec !== null
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {sleepTimerRemainingSec !== null ? (
                <>
                  <Clock className="w-3.5 h-3.5 animate-pulse text-violet-400" />
                  <span className="font-mono tabular-nums text-violet-300 font-bold">
                    {formatRemaining(sleepTimerRemainingSec)}
                  </span>
                </>
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {/* Volume slider */}
            <div className={`${CAN_SET_VOLUME ? 'flex' : 'hidden'} items-center gap-2`}>
              <button
                onClick={toggleMute}
                aria-label={isMuted ? 'Включить звук' : 'Без звука'}
                className="text-zinc-400 hover:text-white p-1"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                aria-label="Громкость"
                className="w-16 lg:w-24 h-1 accent-violet-400 cursor-pointer bg-zinc-700 rounded-lg"
              />
            </div>

            {/* Fullscreen Expand Button */}
            <button
              onClick={() => setIsFullScreenOpen(true)}
              title="Открыть на весь экран"
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <SleepTimerModal
        isOpen={isSleepModalOpen}
        onClose={() => setIsSleepModalOpen(false)}
      />
    </>
  );
};
