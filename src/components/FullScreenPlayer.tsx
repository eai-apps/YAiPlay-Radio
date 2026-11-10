import { Sparkles } from 'lucide-react';
import { LiteImg } from './LiteImg';
import { ListPlus as ListPlusIcon } from 'lucide-react';
import { openShare } from './ShareSheet';
import { openAddToPlaylist } from './PlaylistModals';
import { findSimilar } from './SimilarStations';
import { WeakNetToggle } from './QualityChip';
import { StationLogo } from './StationLogo';
import { FEATURES, CAN_SET_VOLUME } from '../utils/platform';
import { Visualizer } from './Visualizer';
import { loadSound } from '../services/nativeAudio';
import React, { useState, useEffect, useMemo } from 'react';
import { useAudio } from '../context/AudioPlayerContext';
import { useYAiSettings } from '../context/YAiSettingsContext';
import { StationFallbackIcon } from './StationFallbackIcon';
import { YAiLogo } from './YAiLogo';
import { SleepTimerModal } from './SleepTimerModal';
import { CityWeather, Station, GenreCategory } from '../types/radio';
import { getStationWeather } from '../services/weatherService';
import { fetchAlbumArtFromItunes } from '../services/itunesService';
import { liveFallbackLabel } from '../services/rdsService';
import { MusicLinks } from './MusicLinks';
import { fetchStations } from '../services/radioApi';
import { findArtistStations } from '../services/artistService';
import { loadCatalog, isCatalogReady } from '../services/catalogService';
import { GENRES } from '../constants/genres';
import { COUNTRIES } from '../constants/countries';
import { ARTISTS_DATA, ArtistItem } from '../constants/artists';
import {
  ChevronDown,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Volume1,
  VolumeX,
  Heart,
  Moon,
  Clock,
  ExternalLink,
  Sliders,
  Disc,
  Circle,
  Car,
  Bell,
  Bookmark,
  Check,
  Globe,
  Music2,
  ListMusic,
  Mic2,
  X,
  Loader2,
  Share2,
} from 'lucide-react';

interface FullScreenPlayerProps {
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

type SheetTab = 'similar' | 'stations' | 'country' | 'genre' | 'artists' | 'results';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({ isFavorite, onToggleFavorite }) => {
  const {
    currentStation,
    currentTrackTitle,
    isPlaying,
    isLoading,
    togglePlayPause,
    playNext,
    playPrevious,
    playStation,
    playlist,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    isFullScreenOpen,
    setIsFullScreenOpen,
    sleepTimerRemainingSec,
    setIsCarModeOpen,
    setIsEqualizerOpen,
    nativeEngine,
    setIsRecorderOpen,
    setIsAlarmOpen,
    isRecording,
    recordingDurationSec,
    stopRecording,
    bookmarkCurrentTrack,
  } = useAudio();
  const { settings } = useYAiSettings();

  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  // Визуализация на обложке (Android с нативным плеером — настоящий спектр, иначе анимация «в такт»)
  const [vizOn, setVizOn] = useState(() => loadSound().viz);
  useEffect(() => {
    const upd = () => setVizOn(loadSound().viz);
    window.addEventListener('YAi_sound_changed', upd);
    return () => window.removeEventListener('YAi_sound_changed', upd);
  }, []);
  const [weather, setWeather] = useState<CityWeather | null>(null);
  const [artwork, setArtwork] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Шторка быстрого выбора (не выходя из плеера)
  const [sheet, setSheet] = useState<SheetTab | null>(null);
  const [similar, setSimilar] = useState<Station[] | null>(null);
  useEffect(() => {
    if (sheet !== 'similar' || !currentStation) return;
    let alive = true;
    setSimilar(null);
    findSimilar(currentStation).then((l) => alive && setSimilar(l));
    return () => {
      alive = false;
    };
  }, [sheet, currentStation?.stationuuid]);
  const [sheetCountry, setSheetCountry] = useState('');
  const [sheetGenre, setSheetGenre] = useState<GenreCategory | null>(null);
  const [results, setResults] = useState<Station[]>([]);
  const [resultsTitle, setResultsTitle] = useState('');
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetMessage, setSheetMessage] = useState<string | null>(null);
  const [availableArtists, setAvailableArtists] = useState<Set<string> | null>(null);
  useEffect(() => {
    loadCatalog().then((c) => {
      if (isCatalogReady(c)) setAvailableArtists(new Set(Object.entries(c.artists).filter(([, l]) => l.length).map(([id]) => id)));
    });
  }, []);

  // Обложка из iTunes — только для настоящей песни (а не по названию станции)
  useEffect(() => {
    setArtwork(null);
    if (!currentTrackTitle) return;
    let cancelled = false;
    fetchAlbumArtFromItunes(currentTrackTitle).then((art) => {
      if (!cancelled && art) setArtwork(art);
    });
    return () => {
      cancelled = true;
    };
  }, [currentTrackTitle]);

  useEffect(() => {
    if (!currentStation || !isFullScreenOpen) return;
    let cancelled = false;
    setWeather(null);
    getStationWeather(currentStation).then((w) => {
      if (!cancelled && w) setWeather(w);
    });
    return () => {
      cancelled = true;
    };
  }, [currentStation?.stationuuid, isFullScreenOpen]);

  useEffect(() => setImageError(false), [currentStation?.stationuuid]);

  // Esc закрывает шторку, затем плеер
  useEffect(() => {
    if (!isFullScreenOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (sheet) setSheet(null);
      else setIsFullScreenOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullScreenOpen, sheet, setIsFullScreenOpen]);

  const tags = useMemo(
    () =>
      (currentStation?.tags || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 4),
    [currentStation?.tags]
  );

  if (!isFullScreenOpen || !currentStation) return null;

  const coverSrc = artwork || (currentStation.favicon && !imageError ? currentStation.favicon : '');

  const runSearch = async (country: string, genre: GenreCategory | null) => {
    setSheet('results');
    setSheetLoading(true);
    setSheetMessage(null);
    const cName = COUNTRIES.find((c) => c.code === country);
    setResultsTitle([cName && country ? `${cName.flag} ${cName.name}` : '🌍 Весь мир', genre?.tag ? genre.name : 'Все жанры'].join(' · '));
    try {
      const list = await fetchStations({ countrycode: country || undefined, tag: genre?.tag || undefined, limit: 80 });
      setResults(list);
      if (!list.length) setSheetMessage('По этому сочетанию станций не найдено. Попробуйте другой жанр или страну.');
    } catch {
      setResults([]);
      setSheetMessage('Каталог сейчас недоступен. Попробуйте ещё раз.');
    } finally {
      setSheetLoading(false);
    }
  };

  const openArtist = async (artist: ArtistItem) => {
    setSheet('results');
    setSheetLoading(true);
    setSheetMessage(null);
    setResultsTitle(`🎤 ${artist.name}`);
    try {
      const list = await findArtistStations(artist);
      setResults(list);
      if (!list.length) setSheetMessage(`Отдельной станции «${artist.name}» пока нет в открытом каталоге.`);
    } catch {
      setResults([]);
      setSheetMessage('Каталог сейчас недоступен. Попробуйте ещё раз.');
    } finally {
      setSheetLoading(false);
    }
  };

  const onShare = () => openShare({ kind: 'station', station: currentStation });

  const onBookmark = () => {
    const ok = bookmarkCurrentTrack();
    if (!ok) return;
    setSavedNotice(currentTrackTitle ? 'Трек сохранён' : 'Станция без названия песни — сохранено в историю');
    setTimeout(() => setSavedNotice(null), 2200);
  };

  const toolBtn = 'flex-1 min-w-0 py-2 rounded-xl border flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors';
  const toolIdle = 'bg-zinc-900/80 hover:bg-zinc-800 border-white/5 text-zinc-300';
  const quickBtn =
    'flex-1 min-w-0 py-2 px-1 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-cyan-500/20 text-[11px] font-semibold text-zinc-200 flex items-center justify-center gap-1.5 truncate';

  const stationRow = (st: Station, list: Station[]) => {
    const active = st.stationuuid === currentStation.stationuuid;
    return (
      <button
        key={st.stationuuid}
        onClick={() => {
          playStation(st, list);
          setSheet(null);
        }}
        className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors ${
          active ? 'bg-violet-500/15 border border-violet-500/40' : 'hover:bg-zinc-800/80 border border-transparent'
        }`}
      >
        <span className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center">
          <StationLogo favicon={st.favicon} homepage={st.homepage} name={st.name} textClass="text-xs" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white truncate">{st.name}</span>
          <span className="block text-[11px] text-zinc-400 truncate">
            {[st.country, (st.tags || '').split(',')[0], st.bitrate ? `${st.bitrate} kbps` : ''].filter(Boolean).join(' · ')}
          </span>
        </span>
        {active && isPlaying && <span className="text-[10px] font-bold text-violet-400 shrink-0">В ЭФИРЕ</span>}
      </button>
    );
  };

  return (
    <>
      <div className="pt-safe fixed inset-0 z-[56] h-[100dvh] overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-black select-none animate-fade-in">
        {coverSrc && (
          <div
            className="absolute inset-0 bg-cover bg-center blur-3xl opacity-25 scale-125 pointer-events-none"
            style={{ backgroundImage: `url("${coverSrc.replace(/"/g, '')}")` }}
          />
        )}

        {/* Всё содержимое — строго в один экран */}
        <div
          className="relative z-10 h-full max-w-md mx-auto flex flex-col px-4"
          style={{
            paddingTop: 'max(10px, env(safe-area-inset-top))',
            paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
          }}
        >
          {/* Верхняя панель */}
          <div className="flex items-center justify-between shrink-0">
            <button
              onClick={() => setIsFullScreenOpen(false)}
              aria-label="Свернуть плеер"
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/5"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center min-w-0">
              <span className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase">Сейчас играет</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <YAiLogo size="xs" className="w-4 h-4" isSpinning={isPlaying} />
                <span className="text-xs text-theme-accent font-bold">YAi Radio</span>
              </div>
            </div>
            <button
              onClick={() => setIsSleepModalOpen(true)}
              aria-label="Таймер сна"
              className={`h-10 min-w-10 px-2 flex items-center justify-center gap-1 rounded-2xl border ${
                sleepTimerRemainingSec !== null
                  ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                  : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-white/5'
              }`}
            >
              {sleepTimerRemainingSec !== null ? (
                <>
                  <Clock className="w-4 h-4" />
                  <span className="text-[11px] font-mono tabular-nums">{formatTime(sleepTimerRemainingSec)}</span>
                </>
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Погода в городе станции (только на высоких экранах) */}
          {weather && (
            <div className="hidden [@media(min-height:760px)]:flex self-center mt-2 px-3 py-1 rounded-xl bg-zinc-900/80 border border-white/10 items-center gap-2 text-[11px] text-zinc-300 shrink-0">
              <span>{weather.icon}</span>
              <span className="font-bold text-white font-mono">{(weather.temp ?? 0) > 0 ? `+${weather.temp}` : weather.temp}°C</span>
              <span className="text-cyan-400 truncate max-w-[160px]">
                {weather.city} · {weather.localTime}
              </span>
            </div>
          )}

          {/* Обложка: сама подстраивается под оставшееся место */}
          <div className="flex-1 min-h-[96px] my-2 flex items-center justify-center" style={{ containerType: 'size' }}>
            <div
              className="relative rounded-3xl overflow-hidden shadow-2xl border border-zinc-800/80 bg-zinc-950"
              style={{ width: 'min(100cqw, 100cqh, 320px)', height: 'min(100cqw, 100cqh, 320px)' }}
            >
              {coverSrc ? (
                <LiteImg
                  src={coverSrc}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => (artwork ? setArtwork(null) : setImageError(true))}
                  className="w-full h-full object-cover bg-white/5"
                />
              ) : (
                <StationFallbackIcon name={currentStation.name} size="xl" className="!w-full !h-full rounded-3xl" />
              )}
              {vizOn && (
                <div
                  className={`absolute inset-x-0 bottom-0 h-[42%] pointer-events-none transition-opacity duration-700 ${isPlaying ? 'opacity-100' : 'opacity-0'}`}
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0.35) 60%, transparent)' }}
                >
                  <Visualizer className="absolute inset-x-3 bottom-1 h-[88%] w-[calc(100%-1.5rem)]" dense />
                </div>
              )}
              {isPlaying && (
                <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/10">
                  <span className="w-1 h-2.5 bg-violet-400 rounded-full animate-bounce" />
                  <span className="w-1 h-3.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:120ms]" />
                  <span className="w-1 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:240ms]" />
                  <span className="text-[10px] font-mono font-bold text-white ml-0.5">LIVE</span>
                </div>
              )}
            </div>
          </div>

          {/* Название станции + закладка + избранное */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-extrabold tracking-tight text-white truncate">{currentStation.name}</h2>
              <p className="text-[11px] text-zinc-400 truncate">
                {[currentStation.country, (currentStation.playBitrate || currentStation.bitrate) ? `${currentStation.playBitrate || currentStation.bitrate} kbps` : '', currentStation.codec].filter(Boolean).join(' · ')}
              </p>
              <WeakNetToggle className="mt-2" />
            </div>
            <button
              onClick={onShare}
              aria-label="Поделиться станцией"
              title="Поделиться станцией"
              className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => openAddToPlaylist(currentStation)}
              aria-label="В плейлист"
              title="Добавить в плейлист"
              className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300"
            >
              <ListPlusIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onBookmark}
              aria-label="Сохранить трек"
              title="Сохранить трек"
              className={`w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 ${
                savedNotice ? 'bg-cyan-500/30 text-cyan-300' : 'bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300'
              }`}
            >
              {savedNotice ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
            <button
              onClick={onToggleFavorite}
              aria-label={isFavorite ? 'Удалить из избранного' : 'В избранное'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 ${
                isFavorite ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300'
              }`}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-cyan-500 text-cyan-500' : ''}`} />
            </button>
          </div>

          {/* Что сейчас играет (честный RDS) */}
          <div className="mt-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-950/80 via-zinc-900/90 to-cyan-950/80 border border-violet-500/40 flex items-center gap-2 overflow-hidden shrink-0">
            <span className="text-[10px] font-mono font-bold text-violet-400 shrink-0">{currentTrackTitle ? '🎵 ПЕСНЯ' : '📡 ЭФИР'}</span>
            <div className="flex-1 overflow-hidden whitespace-nowrap">
              <div className="truncate text-xs sm:text-sm font-bold text-white" title={currentTrackTitle || liveFallbackLabel(currentStation)}>
                {currentTrackTitle || liveFallbackLabel(currentStation)}
              </div>
            </div>
          </div>
          {savedNotice && <p className="text-[11px] text-cyan-300 text-center mt-1 shrink-0">{savedNotice}</p>}

          {/* Открыть песню в музыкальных сервисах — только когда название настоящее */}
          {currentTrackTitle && (
            <div className="mt-1.5 shrink-0">
              <MusicLinks track={currentTrackTitle} compact />
            </div>
          )}

          {/* Жанры/теги станции */}
          {tags.length > 0 && (
            <div className="hidden [@media(min-height:700px)]:flex flex-wrap gap-1.5 mt-2 shrink-0 max-h-6 overflow-hidden">
              {tags.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded-lg bg-zinc-800/70 text-[10px] text-zinc-300">
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Управление: крупная кнопка Play по центру */}
          <div className="flex items-center justify-center gap-6 my-2 [@media(min-height:740px)]:my-3 shrink-0">
            <button
              onClick={playPrevious}
              aria-label="Предыдущая станция"
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-zinc-200 bg-zinc-900 border border-white/5 active:scale-95"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={togglePlayPause}
              aria-label={isPlaying ? 'Пауза' : 'Слушать'}
              className="w-[72px] h-[72px] [@media(min-height:740px)]:w-20 [@media(min-height:740px)]:h-20 rounded-full bg-gradient-to-br from-cyan-400 via-violet-500 to-cyan-400 text-zinc-950 flex items-center justify-center shadow-xl shadow-violet-500/30 active:scale-95 hover:scale-105 transition-transform"
            >
              {isLoading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-8 h-8 fill-zinc-950" />
              ) : (
                <Play className="w-8 h-8 fill-zinc-950 ml-1" />
              )}
            </button>
            <button
              onClick={playNext}
              aria-label="Следующая станция"
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-zinc-200 bg-zinc-900 border border-white/5 active:scale-95"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Громкость (на iPhone её меняют только боковые кнопки) */}
          {!CAN_SET_VOLUME && (
            <div className="flex items-center justify-center gap-2 shrink-0 text-[11px] text-zinc-500">
              <Volume2 className="w-3.5 h-3.5" /> Громкость — кнопками сбоку телефона
            </div>
          )}
          <div className={`${CAN_SET_VOLUME ? 'flex' : 'hidden'} items-center gap-2 shrink-0`}>
            <button onClick={toggleMute} aria-label={isMuted ? 'Включить звук' : 'Без звука'} className="text-zinc-400 hover:text-white p-1">
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : volume < 0.5 ? <Volume1 className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              aria-label="Громкость"
              className="flex-1 h-1.5 accent-violet-400 cursor-pointer"
            />
            <span className="text-[11px] font-mono text-zinc-300 w-9 text-right">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
          </div>

          {/* Инструменты */}
          <div className="flex gap-1.5 mt-2 shrink-0">
            {nativeEngine && (
            <button onClick={() => setIsEqualizerOpen(true)} className={`${toolBtn} ${toolIdle}`}>
              <Sliders className="w-4 h-4 text-violet-400" />
              <span>Эквалайзер</span>
            </button>
            )}
            {FEATURES.recorder && (
            <button
              onClick={() => (isRecording ? stopRecording() : setIsRecorderOpen(true))}
              className={`${toolBtn} ${isRecording ? 'bg-cyan-600/30 border-cyan-500/50 text-cyan-300' : toolIdle}`}
            >
              {isRecording ? <Circle className="w-4 h-4 fill-cyan-500 text-cyan-500" /> : <Disc className="w-4 h-4 text-cyan-400" />}
              <span>{isRecording ? formatTime(recordingDurationSec) : 'Запись'}</span>
            </button>
            )}
            <button
              onClick={() => {
                setIsFullScreenOpen(false);
                setIsCarModeOpen(true);
              }}
              className={`${toolBtn} ${toolIdle}`}
            >
              <Car className="w-4 h-4 text-cyan-400" />
              <span>За рулём</span>
            </button>
            <button onClick={() => setIsAlarmOpen(true)} className={`${toolBtn} ${toolIdle}`}>
              <Bell className="w-4 h-4 text-cyan-400" />
              <span>Будильник</span>
            </button>
            <button
              onClick={() => setIsSleepModalOpen(true)}
              className={`${toolBtn} ${sleepTimerRemainingSec !== null ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : toolIdle}`}
            >
              <Moon className="w-4 h-4 text-violet-300" />
              <span>{sleepTimerRemainingSec !== null ? formatTime(sleepTimerRemainingSec) : 'Сон'}</span>
            </button>
          </div>

          {/* Горячие кнопки: выбор без выхода из плеера */}
          <div className="flex gap-1.5 mt-1.5 shrink-0">
            <button onClick={() => setSheet('similar')} className={quickBtn}>
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">Похожие</span>
            </button>
            <button onClick={() => setSheet('country')} className={quickBtn}>
              <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">{sheetCountry ? COUNTRIES.find((c) => c.code === sheetCountry)?.flag : 'Страна'}</span>
            </button>
            <button onClick={() => setSheet('genre')} className={quickBtn}>
              <Music2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span className="truncate">{sheetGenre?.tag ? sheetGenre.name : 'Жанр'}</span>
            </button>
            <button onClick={() => setSheet('stations')} className={quickBtn}>
              <ListMusic className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">Станции</span>
            </button>
          </div>

          {/* Сайт станции */}
          {currentStation.homepage && /^https?:\/\//.test(currentStation.homepage) && (
            <a
              href={currentStation.homepage}
              target="_blank"
              rel="noreferrer"
              className="self-center mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-white shrink-0"
            >
              Сайт радиостанции <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Шторка быстрого выбора */}
        {sheet && (
          <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/60 backdrop-blur-sm" onClick={() => setSheet(null)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-auto max-h-[78dvh] flex flex-col rounded-t-3xl bg-zinc-950 border-t border-x border-zinc-800 shadow-2xl animate-fade-in"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="flex items-center gap-1 p-2 border-b border-zinc-800 shrink-0 overflow-x-auto scrollbar-none">
                {(
                  [
                    ['similar', '✨ Похожие'],
                    ['country', 'Страна'],
                    ['genre', 'Жанр'],
                    ['stations', 'Станции'],
                    ['artists', 'Артисты/OST'],
                  ] as Array<[SheetTab, string]>
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setSheet(id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
                      sheet === id ? 'bg-violet-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button onClick={() => setSheet(null)} aria-label="Закрыть" className="ml-auto p-2 text-zinc-400 hover:text-white shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-3">
                {sheet === 'country' && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {COUNTRIES.filter((c) => !(settings.hiddenCountries?.radio || []).includes(c.code.toUpperCase())).map((c) => (
                      <button
                        key={c.code || 'all'}
                        onClick={() => {
                          setSheetCountry(c.code);
                          runSearch(c.code, sheetGenre);
                        }}
                        className={`px-3 py-2.5 rounded-xl text-left text-xs font-semibold truncate ${
                          sheetCountry === c.code ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40' : 'bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                        }`}
                      >
                        {c.flag} {c.name}
                      </button>
                    ))}
                  </div>
                )}

                {sheet === 'genre' && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {GENRES.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => {
                          const genre = g.tag ? g : null;
                          setSheetGenre(genre);
                          runSearch(sheetCountry, genre);
                        }}
                        className={`px-3 py-2.5 rounded-xl text-left text-xs font-semibold truncate ${
                          (sheetGenre?.id || 'popular') === g.id ? 'bg-violet-500/20 text-violet-200 border border-violet-500/40' : 'bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                        }`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                )}

                {sheet === 'similar' && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-zinc-500 px-1 pb-1">Похожие на «{currentStation.name}»</p>
                    {similar === null ? (
                      <p className="text-xs text-zinc-400 p-2">Подбираем станции…</p>
                    ) : similar.length ? (
                      similar.map((st) => stationRow(st, similar))
                    ) : (
                      <p className="text-xs text-zinc-400 p-2">Похожих станций не нашлось — попробуйте «Жанр».</p>
                    )}
                  </div>
                )}

                {sheet === 'stations' && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-zinc-500 px-1 pb-1">Текущий список ({playlist.length})</p>
                    {playlist.length ? playlist.map((st) => stationRow(st, playlist)) : <p className="text-xs text-zinc-400 p-2">Список пуст — выберите страну или жанр.</p>}
                  </div>
                )}

                {sheet === 'artists' && (
                  <div className="space-y-3">
                    {(
                      [
                        ['cis', '🇷🇺 СНГ'],
                        ['world', '🌍 Мировые'],
                        ['ost', '🎬 Саундтреки'],
                      ] as const
                    ).map(([cat, label]) => (
                      <div key={cat}>
                        <p className="text-[11px] font-bold text-zinc-400 px-1 pb-1">{label}</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {ARTISTS_DATA.filter((a) => a.category === cat && (!availableArtists || availableArtists.has(a.id))).map((a) => (
                            <button key={a.id} onClick={() => openArtist(a)} className="px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-left text-xs font-semibold text-zinc-200 truncate">
                              {a.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {sheet === 'results' && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white px-1 pb-1">{resultsTitle}</p>
                    {sheetLoading ? (
                      <div className="flex items-center gap-2 text-xs text-zinc-400 p-3">
                        <Loader2 className="w-4 h-4 animate-spin" /> Ищем станции…
                      </div>
                    ) : sheetMessage ? (
                      <p className="text-xs text-amber-300 p-2">{sheetMessage}</p>
                    ) : (
                      results.map((st) => stationRow(st, results))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <SleepTimerModal isOpen={isSleepModalOpen} onClose={() => setIsSleepModalOpen(false)} />
    </>
  );
};
