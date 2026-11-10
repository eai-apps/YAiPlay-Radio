import { isNativeApp } from '../utils/platform';
import { pickStream, lowerStream, isWeakMode, QUALITY_EVENT } from '../services/streamQuality';
import { loadCatalog } from '../services/catalogService';
import { setStream, loadHls, preloadHlsIfNeeded } from '../services/hlsAudio';
import { detectNativePlayer, NativeAudio, loadSound, applySound, getSystemVolume, setSystemVolume, hasNativeSession, setNativeMeta } from '../services/nativeAudio';
import { stationCard } from '../services/lockArtwork';
import { probeStream, markGeoBlocked, clearGeoBlocked, myNetwork } from '../services/streamCheck';
import { hasNative, nativeNowPlaying, nativeSetAlarm, nativeStopAlarm, nativeLaunchAction, onNative } from '../services/nativeBridge';

// Свежие данные эксклюзивных станций (битрейты и запасные потоки) — чинят старые копии в избранном/истории
const exclusiveById = new Map<string, Station>();
loadCatalog().then((c) => (c.exclusive || []).forEach((g) => g.stations.forEach((st) => exclusiveById.set(st.stationuuid, st))));
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Station, EqualizerBand, RecordedTrack, PlayedTrackHistory, RadioAlarm, RecognizedTrack } from '../types/radio';
import { registerStationClick } from '../services/radioApi';
import { DEFAULT_EQ_BANDS, EQUALIZER_PRESETS } from '../constants/equalizer';
import { quarantineStation } from '../services/quarantineService';
import { fetchLiveTrackTitle, parseAndValidateTrack, liveFallbackLabel, cleanTrackTitle } from '../services/rdsService';
import { fetchAlbumArtFromItunes } from '../services/itunesService';

const HISTORY_KEY = 'yaiplayradio_play_history_v1';
const RECENT_KEY = 'yaiplayradio_recent_stations_v1';
const RECOGNIZED_TRACKS_KEY = 'yaiplayradio_recognized_tracks_v1';
const RECORDINGS_KEY = 'yaiplayradio_recordings_v1';
const ALARM_KEY = 'yaiplayradio_alarm_settings_v1';
const EQ_SETTINGS_KEY = 'yaiplayradio_eq_settings_v1';

interface AudioContextType {
  currentStation: Station | null;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  volume: number;
  isMuted: boolean;
  playlist: Station[];
  playStation: (station: Station, contextPlaylist?: Station[]) => void;
  togglePlayPause: () => void;
  /** Android-приложение с нативным плеером: доступны эквалайзер, визуализация и буфер */
  nativeEngine: boolean;
  playNext: () => void;
  playPrevious: () => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  clearError: () => void;

  // Modals
  isFullScreenOpen: boolean;
  setIsFullScreenOpen: (open: boolean) => void;
  isCarModeOpen: boolean;
  setIsCarModeOpen: (open: boolean) => void;
  isEqualizerOpen: boolean;
  setIsEqualizerOpen: (open: boolean) => void;
  isRecorderOpen: boolean;
  setIsRecorderOpen: (open: boolean) => void;
  isAlarmOpen: boolean;
  setIsAlarmOpen: (open: boolean) => void;

  // Sleep timer
  sleepTimerMinutes: number | null;
  sleepTimerRemainingSec: number | null;
  setSleepTimer: (minutes: number | null) => void;

  // Equalizer & Audio FX
  isEqEnabled: boolean;
  setIsEqEnabled: (enabled: boolean) => void;
  eqBands: EqualizerBand[];
  setBandGain: (index: number, gain: number) => void;
  activePresetId: string;
  setEqualizerPreset: (presetId: string) => void;
  bassBoost: number;
  setBassBoost: (val: number) => void;
  surround3D: boolean;
  setSurround3D: (val: boolean) => void;
  getFrequencyData: () => Uint8Array | null;

  // Recorder
  isRecording: boolean;
  recordingDurationSec: number;
  startRecording: () => void;
  stopRecording: () => void;
  recordings: RecordedTrack[];
  deleteRecording: (id: string) => void;

  // Track & History
  currentTrackTitle: string;
  history: PlayedTrackHistory[];
  recentStations: Station[]; // «Продолжить слушать»
  clearHistory: () => void;
  recognizedTracks: RecognizedTrack[];
  clearRecognizedTracks: () => void;
  deleteRecognizedTrack: (id: string) => void;
  bookmarkCurrentTrack: () => boolean;

  // Alarm Clock
  alarm: RadioAlarm;
  setAlarm: (alarm: RadioAlarm) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem('yaiplayradio_volume') || '');
      return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.6;
    } catch {
      return 0.6;
    }
  });
  // Запоминаем громкость на устройстве
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem('yaiplayradio_volume', String(volume));
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [volume]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const isMutedRef = useRef(false);
  isMutedRef.current = isMuted;
  const [playlist, setPlaylist] = useState<Station[]>([]);

  // Modals state
  const [isFullScreenOpen, setIsFullScreenOpen] = useState<boolean>(false);
  const [isCarModeOpen, setIsCarModeOpen] = useState<boolean>(false);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState<boolean>(false);
  const [isRecorderOpen, setIsRecorderOpen] = useState<boolean>(false);
  const [isAlarmOpen, setIsAlarmOpen] = useState<boolean>(false);

  // Sleep timer states
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemainingSec, setSleepTimerRemainingSec] = useState<number | null>(null);

  // Equalizer states
  const [isEqEnabled, setIsEqEnabled] = useState<boolean>(true);
  const [eqBands, setEqBands] = useState<EqualizerBand[]>(DEFAULT_EQ_BANDS);
  const [activePresetId, setActivePresetId] = useState<string>('flat');
  const [bassBoost, setBassBoostState] = useState<number>(0);
  const [surround3D, setSurround3DState] = useState<boolean>(false);

  // Recorder states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDurationSec, setRecordingDurationSec] = useState<number>(0);
  const [recordings, setRecordings] = useState<RecordedTrack[]>(() => {
    try {
      const saved = localStorage.getItem(RECORDINGS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // History states
  const [recentStations, setRecentStations] = useState<Station[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      return Array.isArray(v) ? v.filter((x) => x && x.stationuuid && (x.url_resolved || x.url)).slice(0, 12) : [];
    } catch {
      return [];
    }
  });
  const [history, setHistory] = useState<PlayedTrackHistory[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [recognizedTracks, setRecognizedTracks] = useState<RecognizedTrack[]>(() => {
    try {
      const saved = localStorage.getItem(RECOGNIZED_TRACKS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentTrackTitle, setCurrentTrackTitle] = useState<string>('');
  /** Играет нативный плеер Android (есть эквалайзер, визуализация, буфер) */
  const [nativeEngine, setNativeEngine] = useState(false);

  // Alarm state
  const [alarm, setAlarmState] = useState<RadioAlarm>(() => {
    try {
      const saved = localStorage.getItem(ALARM_KEY);
      return saved
        ? JSON.parse(saved)
        : {
            enabled: false,
            time: '07:30',
            stationUuid: '',
            stationName: '',
            fadeDurationSec: 20,
            days: [1, 2, 3, 4, 5],
          };
    } catch {
      return {
        enabled: false,
        time: '07:30',
        stationUuid: '',
        stationName: '',
        fadeDurationSec: 20,
        days: [1, 2, 3, 4, 5],
      };
    }
  });

  // Refs for audio and Web Audio API
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Адаптивное качество: текущий адрес потока и «заикания» за последние 30 секунд
  const streamUrlRef = useRef<string>('');
  const stallsRef = useRef<number[]>([]);
  const startedRef = useRef(false);
  // Живой эфир после паузы: iPhone рвёт соединение со станцией, старый поток «мёртвый» —
  // запоминаем, когда поставили на паузу, и при «▶» подключаемся заново
  const pausedAtRef = useRef(0);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousVolumeRef = useRef<number>(0.85);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const biquadFiltersRef = useRef<BiquadFilterNode[]>([]);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);
  const connectTimeoutRef = useRef<any>(null);
  const currentStationRef = useRef<Station | null>(null);
  const playlistRef = useRef<Station[]>([]);

  useEffect(() => {
    currentStationRef.current = currentStation;
  }, [currentStation]);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  // Initialize Audio Element
  useEffect(() => {
    // Плеер: обычный <audio>, а в Android-приложении с нативным плеером — NativeAudio (см. ниже)
    let audio: HTMLAudioElement = new Audio();
    audio.preload = 'none';
    audioRef.current = audio;

    const clearConnectTimeout = () => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
    };

    // Режим «Слабый интернет»: 2 «заикания» за 30 секунд → переходим на поток полегче того же эфира.
    // В обычном режиме качество не скачет — всегда максимальное.
    const clearStallTimer = () => {
      if (stallTimerRef.current) {
        clearTimeout(stallTimerRef.current);
        stallTimerRef.current = null;
      }
    };
    const handleWaiting = () => {
      setIsLoading(true);
      // Звук завис дольше 12 секунд (часто после сворачивания на iPhone) — переподключаемся к эфиру
      if (startedRef.current && !stallTimerRef.current) {
        stallTimerRef.current = setTimeout(() => {
          stallTimerRef.current = null;
          const url = streamUrlRef.current;
          if (!audio.paused && url && audio.readyState < 3) {
            setStream(audio, url);
            audio.play().catch(() => {});
          }
        }, 12000);
      }
      if (!startedRef.current || !isWeakMode()) return;
      const now = Date.now();
      stallsRef.current = [...stallsRef.current.filter((t) => now - t < 30000), now];
      const st = currentStationRef.current;
      if (stallsRef.current.length >= 2 && st && st.alt?.length) {
        const lower = lowerStream(st, streamUrlRef.current);
        if (lower) {
          stallsRef.current = [];
          streamUrlRef.current = lower.url;
          setStream(audio, lower.url);
          audio.play().catch(() => {});
          const upd = { ...st, playBitrate: lower.bitrate };
          currentStationRef.current = upd;
          setCurrentStation(upd);
        }
      }
    };
    const handlePlaying = () => {
      startedRef.current = true;
      pausedAtRef.current = 0;
      clearStallTimer();
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
      if (currentStationRef.current) clearGeoBlocked(currentStationRef.current.stationuuid);
      clearConnectTimeout();
      setIsLoading(false);
      setIsPlaying(true);
      setError(null);
    };
    const handlePause = () => {
      if (!pausedAtRef.current) pausedAtRef.current = Date.now();
      clearStallTimer();
      setIsPlaying(false);
      setIsLoading(false);
    };
    const handleError = () => {
      clearConnectTimeout();
      const st = currentStationRef.current;
      if (st) {
        failureRef.current(st, streamUrlRef.current || st.url_resolved || st.url, 'Ошибка воспроизведения потока');
      } else {
        setError('Не удалось подключиться к аудиопотоку этой станции');
      }
    };
    const handleCanPlay = () => {
      clearConnectTimeout();
      setIsLoading(false);
    };

    const attach = (el: HTMLAudioElement, on: boolean) => {
      const f = on ? el.addEventListener.bind(el) : el.removeEventListener.bind(el);
      f('waiting', handleWaiting);
      f('playing', handlePlaying);
      f('pause', handlePause);
      f('error', handleError);
      f('canplay', handleCanPlay);
    };
    attach(audio, true);

    // Android-приложение с нативным плеером (Media3): http-станции, эквалайзер, визуализация, буфер.
    // Старые APK без него продолжают играть через <audio>.
    let disposed = false;
    detectNativePlayer().then((bands) => {
      if (disposed || !bands) return;
      if (!audio.paused || streamUrlRef.current) return; // уже что-то играет — не перебиваем
      const native = new NativeAudio() as unknown as HTMLAudioElement;
      attach(audio, false);
      audio.src = '';
      audio = native;
      audioRef.current = native;
      attach(native, true);
      applySound(loadSound(), false);
      setNativeEngine(true);
    });

    // Load saved EQ settings if any
    try {
      const savedEq = localStorage.getItem(EQ_SETTINGS_KEY);
      if (savedEq) {
        const parsed = JSON.parse(savedEq);
        if (parsed.eqBands) setEqBands(parsed.eqBands);
        if (parsed.activePresetId) setActivePresetId(parsed.activePresetId);
        if (parsed.bassBoost !== undefined) setBassBoostState(parsed.bassBoost);
        if (parsed.surround3D !== undefined) setSurround3DState(parsed.surround3D);
      }
    } catch {}

    return () => {
      disposed = true;
      clearConnectTimeout();
      clearStallTimer();
      attach(audio, false);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Initialize Web Audio API nodes safely on first play/interaction
  const initWebAudio = useCallback(() => {
    if (audioCtxRef.current || !audioRef.current) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      const ctx = new AudioCtxClass();
      audioCtxRef.current = ctx;

      // Source
      const source = ctx.createMediaElementSource(audioRef.current);
      sourceNodeRef.current = source;

      // 5 EQ Filters
      const filterTypes: BiquadFilterType[] = ['lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'];
      const filters = DEFAULT_EQ_BANDS.map((band, idx) => {
        const filter = ctx.createBiquadFilter();
        filter.type = filterTypes[idx];
        filter.frequency.value = band.freq;
        filter.gain.value = band.gain;
        return filter;
      });
      biquadFiltersRef.current = filters;

      // Bass Boost filter (lowshelf 80Hz)
      const bassBoostFilter = ctx.createBiquadFilter();
      bassBoostFilter.type = 'lowshelf';
      bassBoostFilter.frequency.value = 80;
      bassBoostFilter.gain.value = (bassBoost / 100) * 12; // 0 to 12 dB boost
      bassFilterRef.current = bassBoostFilter;

      // Analyser for visualizer
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Destination for recording
      const dest = ctx.createMediaStreamDestination();
      mediaDestRef.current = dest;

      // Connect graph:
      // source -> bassFilter -> filter0 -> filter1 -> filter2 -> filter3 -> filter4 -> analyser -> ctx.destination & dest
      let lastNode: AudioNode = source;
      lastNode.connect(bassBoostFilter);
      lastNode = bassBoostFilter;

      for (const filter of filters) {
        lastNode.connect(filter);
        lastNode = filter;
      }

      lastNode.connect(analyser);
      analyser.connect(ctx.destination);
      analyser.connect(dest);
    } catch (err) {
      console.warn('Web Audio API initialization note (fallback to direct audio):', err);
    }
  }, [bassBoost]);

  // Своя нативная карточка включилась — старую карточку плагина убираем, чтобы не было двух
  useEffect(() => {
    if (!nativeEngine || !hasNativeSession()) return;
    import('@capgo/capacitor-media-session')
      .then(({ MediaSession }) => MediaSession.setPlaybackState({ playbackState: 'none' }))
      .catch(() => {});
  }, [nativeEngine]);

  // Android с нативным плеером: ползунок = громкость телефона (звук самого плеера всегда 100 %)
  const sysVolRef = useRef(false);
  useEffect(() => {
    if (!nativeEngine) return;
    let alive = true;
    const pull = async () => {
      const v = await getSystemVolume();
      if (!alive || v === null) return;
      if (!sysVolRef.current) {
        sysVolRef.current = true;
        if (audioRef.current) audioRef.current.volume = isMutedRef.current ? 0 : 1;
      }
      setVolumeState((prev) => (Math.abs(prev - v) > 0.02 ? v : prev));
    };
    pull();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') pull();
    }, 1500);
    document.addEventListener('visibilitychange', pull);
    return () => {
      alive = false;
      sysVolRef.current = false;
      clearInterval(t);
      document.removeEventListener('visibilitychange', pull);
    };
  }, [nativeEngine]);

  // Update volume
  const setVolume = useCallback(
    (val: number) => {
      const clamped = Math.max(0, Math.min(1, val));
      setVolumeState(clamped);
      if (sysVolRef.current) {
        // Android (нативный плеер): ползунок двигает громкость телефона, как боковые кнопки
        setSystemVolume(clamped);
      } else if (audioRef.current) {
        audioRef.current.volume = clamped;
      }
      if (clamped > 0 && isMuted) {
        setIsMuted(false);
      }
    },
    [isMuted]
  );

  // Toggle Mute
  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    if (sysVolRef.current) {
      // Android: «без звука» — только у плеера, громкость телефона не трогаем
      audioRef.current.volume = isMuted ? 1 : 0;
      setIsMuted(!isMuted);
      return;
    }
    if (isMuted) {
      const restoreVol = previousVolumeRef.current || 0.85;
      audioRef.current.volume = restoreVol;
      setVolumeState(restoreVol);
      setIsMuted(false);
    } else {
      previousVolumeRef.current = volume;
      audioRef.current.volume = 0;
      setVolumeState(0);
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // Продолжить эфир после паузы (кнопка в приложении, экран блокировки, наушники).
  // Пауза дольше 3 секунд → подключаемся к станции заново: старое соединение iPhone уже закрыл,
  // а у живого радио всё равно нечего «досматривать». Не заиграло за 10 секунд — ещё одна попытка.
  const resumeLive = useCallback(() => {
    const a = audioRef.current;
    const url = streamUrlRef.current;
    if (!a || !url) return;
    setError(null);
    setIsLoading(true);
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    const stale = !pausedAtRef.current || Date.now() - pausedAtRef.current > 3000 || !!a.error || a.readyState === 0;
    const start = (attempt: number) => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = setTimeout(() => {
        resumeTimerRef.current = null;
        if (streamUrlRef.current !== url) return;
        if (attempt === 0) {
          setStream(a, url);
          start(1);
        } else {
          setIsLoading(false);
          setIsPlaying(false);
          setError('Не удалось продолжить эфир — нажмите ▶ ещё раз или выберите другую станцию');
        }
      }, 10000);
      a.play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn('Play failed:', err));
    };
    if (stale && !setStream(a, url)) {
      loadHls().then(() => {
        if (streamUrlRef.current !== url) return;
        setStream(a, url);
        start(0);
      });
      return;
    }
    start(0);
  }, []);

  // Toggle play / pause
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !currentStation) return;

    if (isPlaying) {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      resumeLive();
    }
  }, [isPlaying, currentStation, resumeLive]);

  // Вернулись в приложение (iPhone: из фона или после блокировки) — если эфир «завис», переподключаемся
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const a = audioRef.current;
      const url = streamUrlRef.current;
      if (a && url && !a.paused && startedRef.current && a.readyState < 3) {
        setStream(a, url);
        a.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
    };
  }, []);

  // Play station implementation with 4.5s timeout auto-quarantine and history recording
  const playStation = useCallback(
    (station: Station, contextPlaylist?: Station[]) => {
      if (!audioRef.current || !station) return;

      if (currentStation?.stationuuid === station.stationuuid) {
        togglePlayPause();
        return;
      }

      setError(null);
      setIsLoading(true);

      if (contextPlaylist && contextPlaylist.length > 0) {
        setPlaylist(contextPlaylist);
        playlistRef.current = contextPlaylist;
      } else if (playlist.length === 0) {
        setPlaylist([station]);
        playlistRef.current = [station];
      }

      // Старая копия эксклюзива (из избранного/истории) → берём свежие данные из каталога
      const fresh = exclusiveById.get(station.stationuuid);
      if (fresh) station = { ...station, ...fresh };
      if (station.playBitrate) station = { ...station, playBitrate: undefined };

      // Поток: максимальное качество, а в режиме «Слабый интернет» — лёгкий
      const picked = pickStream(station);
      const streamUrl = picked.url;
      streamUrlRef.current = streamUrl;
      stallsRef.current = [];
      startedRef.current = false;
      if (!streamUrl) {
        quarantineStation(station.stationuuid, station.name, '', 'Отсутствует адрес потока');
        setError('У станции отсутствует рабочий адрес потока');
        setIsLoading(false);
        return;
      }

      const shown = picked.bitrate && picked.bitrate !== station.bitrate ? { ...station, playBitrate: picked.bitrate } : station;
      setCurrentStation(shown);
      currentStationRef.current = shown;
      setCurrentTrackTitle('');

      // Clear existing connection timeout
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }

      // «Продолжить слушать» — полные данные станции, чтобы включить одним нажатием
      setRecentStations((prev) => {
        const updated = [station, ...prev.filter((p) => p.stationuuid !== station.stationuuid)].slice(0, 12);
        try {
          localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // Save to History
      setHistory((prev) => {
        const item: PlayedTrackHistory = {
          id: `${station.stationuuid}_${Date.now()}`,
          stationUuid: station.stationuuid,
          stationName: station.name || 'Радиостанция',
          stationFavicon: station.favicon,
          title: station.name || 'Радиостанция',
          playedAt: Date.now(),
        };
        const updated = [item, ...prev.filter((p) => p.stationUuid !== station.stationuuid)].slice(0, 50);
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // 9s connection timeout (мобильный интернет бывает медленным): quarantine & auto-skip to next station
      connectTimeoutRef.current = setTimeout(() => {
        if (!audioRef.current || audioRef.current.paused) {
          failureRef.current(station, streamUrl, 'Не ответила за 9 секунд');
        }
      }, 9000);

      try {
        // Direct stream loading without crossOrigin to prevent CORS rejection on Icecast/Shoutcast
        audioRef.current.removeAttribute('crossOrigin');
        audioRef.current.volume = isMuted ? 0 : sysVolRef.current ? 1 : volume;
        if (!setStream(audioRef.current, streamUrl)) {
          // HLS-поток на компьютере: ждём hls.js и запускаем
          const a = audioRef.current;
          loadHls().then(() => {
            if (streamUrlRef.current !== streamUrl) return;
            setStream(a, streamUrl);
            a.play().catch(() => {});
          });
          return;
        }

        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume().catch(() => {});
        }

        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              if (connectTimeoutRef.current) {
                clearTimeout(connectTimeoutRef.current);
                connectTimeoutRef.current = null;
              }
              setIsPlaying(true);
              setIsLoading(false);
              registerStationClick(station.stationuuid);
            })
            .catch((err) => {
              console.warn('Direct stream initial play warning:', err);
              // Do not immediately terminate; let the 4.5s timeout handle quarantine and smooth auto-skip
            });
        }
      } catch (err) {
        console.warn('Audio source initialization error:', err);
      }
    },
    [currentStation, togglePlayPause, volume, isMuted, playlist]
  );

  // Сеть стала хуже/лучше или пользователь сменил качество → подбираем поток заново
  useEffect(() => {
    const reselect = (e?: Event) => {
      const st = currentStationRef.current;
      const audio = audioRef.current;
      if (!st || !st.alt?.length || !audio || audio.paused) return;
      const userChoice = e?.type === QUALITY_EVENT;
      // Сеть сама по себе меняет поток только в режиме «Слабый интернет» и только вниз
      if (!userChoice && !isWeakMode()) return;
      const want = pickStream(st);
      if (want.url === streamUrlRef.current) return;
      if (!userChoice && want.bitrate > (st.playBitrate || st.bitrate || 0)) return;
      streamUrlRef.current = want.url;
      stallsRef.current = [];
      setStream(audio, want.url);
      audio.play().catch(() => {});
      const upd = { ...st, playBitrate: want.bitrate };
      currentStationRef.current = upd;
      setCurrentStation(upd);
    };
    const conn = (navigator as any).connection;
    conn?.addEventListener?.('change', reselect);
    window.addEventListener(QUALITY_EVENT, reselect);
    return () => {
      conn?.removeEventListener?.('change', reselect);
      window.removeEventListener(QUALITY_EVENT, reselect);
    };
  }, []);

  // Play next in playlist
  const playNext = useCallback(() => {
    const curr = currentStationRef.current || currentStation;
    const pl = playlistRef.current.length > 0 ? playlistRef.current : playlist;
    if (!curr || pl.length === 0) return;
    const currentIndex = pl.findIndex((s) => s.stationuuid === curr.stationuuid);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % pl.length : 0;
    if (pl[nextIndex].stationuuid === curr.stationuuid) return; // в списке одна станция — не ставим на паузу
    playStation(pl[nextIndex], pl);
  }, [currentStation, playlist, playStation]);

  // Play previous in playlist
  const playPrevious = useCallback(() => {
    const curr = currentStationRef.current || currentStation;
    const pl = playlistRef.current.length > 0 ? playlistRef.current : playlist;
    if (!curr || pl.length === 0) return;
    const currentIndex = pl.findIndex((s) => s.stationuuid === curr.stationuuid);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : pl.length - 1;
    if (pl[prevIndex].stationuuid === curr.stationuuid) return;
    playStation(pl[prevIndex], pl);
  }, [currentStation, playlist, playStation]);

  // Shazam / Recognized track registration (STRICT: only real songs with valid Artist & Title)
  const registerRecognizedSong = useCallback(
    async (rawTitle: string, station: Station) => {
      if (!rawTitle || !station) return null;
      const validated = parseAndValidateTrack(rawTitle, station.name);
      if (!validated) return null;

      // Avoid immediate duplicate of same artist & title
      const cacheKey = `${validated.artist.toLowerCase()} - ${validated.title.toLowerCase()}`;
      setRecognizedTracks((prev) => {
        if (
          prev.length > 0 &&
          `${prev[0].artist.toLowerCase()} - ${prev[0].title.toLowerCase()}` === cacheKey
        ) {
          return prev;
        }

        // Fetch artwork in background and update
        fetchAlbumArtFromItunes(`${validated.artist} - ${validated.title}`).then((art) => {
          if (art) {
            setRecognizedTracks((current) => {
              const updatedWithArt = current.map((t) =>
                t.artist.toLowerCase() === validated.artist.toLowerCase() &&
                t.title.toLowerCase() === validated.title.toLowerCase()
                  ? { ...t, artworkUrl: art }
                  : t
              );
              try {
                localStorage.setItem(RECOGNIZED_TRACKS_KEY, JSON.stringify(updatedWithArt));
              } catch {}
              return updatedWithArt;
            });
          }
        });

        const newTrack: RecognizedTrack = {
          id: `shazam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          artist: validated.artist,
          title: validated.title,
          rawTitle: validated.rawTitle,
          stationName: station.name,
          stationUuid: station.stationuuid,
          detectedAt: Date.now(),
        };

        const filtered = prev.filter(
          (t) =>
            !(
              t.artist.toLowerCase() === validated.artist.toLowerCase() &&
              t.title.toLowerCase() === validated.title.toLowerCase()
            )
        );
        const updated = [newTrack, ...filtered].slice(0, 200); // сервер синхронизации хранит до 200
        try {
          localStorage.setItem(RECOGNIZED_TRACKS_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      return validated;
    },
    []
  );

  // Нативный плеер сам читает название песни из потока (ICY) — сразу, без опроса сервера
  const nativeTitleAtRef = useRef(0);
  useEffect(() => {
    const onTitle = (e: Event) => {
      const st = currentStationRef.current;
      const t = cleanTrackTitle(String((e as CustomEvent).detail || ''), st?.name);
      if (!st || !t) return;
      nativeTitleAtRef.current = Date.now();
      setCurrentTrackTitle((prev) => {
        if (prev === t) return prev;
        registerRecognizedSong(t, st);
        return t;
      });
    };
    window.addEventListener('yaiplayradio_native_title', onTitle);
    return () => window.removeEventListener('yaiplayradio_native_title', onTitle);
  }, [registerRecognizedSong]);

  // Честный RDS: опрос реального названия трека каждые 15 секунд
  const missesRef = useRef(0);
  useEffect(() => {
    if (!currentStation || !isPlaying) return;

    let cancelled = false;
    missesRef.current = 0;

    const poll = async () => {
      if (Date.now() - nativeTitleAtRef.current < 90000) return; // название уже приходит из потока
      try {
        const liveTitle = await fetchLiveTrackTitle(currentStation);
        if (cancelled) return;
        if (!liveTitle) {
          // Станция перестала передавать название — после 2 пустых ответов честно убираем его
          missesRef.current += 1;
          if (missesRef.current >= 2) setCurrentTrackTitle('');
          return;
        }
        missesRef.current = 0;
        setCurrentTrackTitle((prevTitle) => {
          if (prevTitle === liveTitle) return prevTitle;
          setHistory((prev) => {
            const updated = prev.map((item) =>
              item.stationUuid === currentStation.stationuuid ? { ...item, title: liveTitle } : item
            );
            try {
              localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
            } catch {}
            return updated;
          });
          // В «Распознанные треки» попадают только настоящие песни (Исполнитель — Название)
          registerRecognizedSong(liveTitle, currentStation);
          return liveTitle;
        });
      } catch {}
    };

    poll();
    const interval = setInterval(poll, 20000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentStation?.stationuuid, isPlaying, registerRecognizedSong]);

  // Bookmark current track into saved list & history
  const bookmarkCurrentTrack = useCallback((): boolean => {
    if (!currentStation) return false;
    const titleToSave = currentTrackTitle || liveFallbackLabel(currentStation);
    const item: PlayedTrackHistory = {
      id: `saved_${Date.now()}_${currentStation.stationuuid}`,
      stationUuid: currentStation.stationuuid,
      stationName: currentStation.name || 'Радиостанция',
      stationFavicon: currentStation.favicon,
      title: titleToSave,
      playedAt: Date.now(),
    };
    setHistory((prev) => {
      const updated = [item, ...prev.filter((p) => p.id !== item.id)].slice(0, 50);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (currentTrackTitle) {
      registerRecognizedSong(currentTrackTitle, currentStation);
    }
    return true;
  }, [currentStation, currentTrackTitle, registerRecognizedSong]);

  // Delete individual recognized track
  const deleteRecognizedTrack = useCallback((id: string) => {
    setRecognizedTracks((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      try {
        localStorage.setItem(RECOGNIZED_TRACKS_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Clear all recognized tracks
  const clearRecognizedTracks = useCallback(() => {
    setRecognizedTracks([]);
    try {
      localStorage.removeItem(RECOGNIZED_TRACKS_KEY);
    } catch {}
  }, []);

  // Equalizer Gain control
  const setBandGain = useCallback((bandIndex: number, gain: number) => {
    setEqBands((prev) => {
      const updated = prev.map((b, i) => (i === bandIndex ? { ...b, gain } : b));
      try {
        localStorage.setItem(
          EQ_SETTINGS_KEY,
          JSON.stringify({ eqBands: updated, activePresetId: 'custom', bassBoost, surround3D })
        );
      } catch {}
      return updated;
    });
    setActivePresetId('custom');

    if (biquadFiltersRef.current[bandIndex]) {
      biquadFiltersRef.current[bandIndex].gain.value = gain;
    }
  }, [bassBoost, surround3D]);

  // Set Preset
  const setEqualizerPreset = useCallback((presetId: string) => {
    const preset = EQUALIZER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setActivePresetId(presetId);
    const updatedBands = DEFAULT_EQ_BANDS.map((band, idx) => ({
      ...band,
      gain: preset.gains[idx] ?? 0,
    }));
    setEqBands(updatedBands);

    if (preset.bassBoost !== undefined) {
      setBassBoostState(preset.bassBoost);
      if (bassFilterRef.current) {
        bassFilterRef.current.gain.value = (preset.bassBoost / 100) * 12;
      }
    }

    updatedBands.forEach((b, idx) => {
      if (biquadFiltersRef.current[idx]) {
        biquadFiltersRef.current[idx].gain.value = b.gain;
      }
    });

    try {
      localStorage.setItem(
        EQ_SETTINGS_KEY,
        JSON.stringify({ eqBands: updatedBands, activePresetId: presetId, bassBoost: preset.bassBoost ?? 0, surround3D })
      );
    } catch {}
  }, [surround3D]);

  // Set Bass Boost
  const setBassBoost = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setBassBoostState(clamped);
    if (bassFilterRef.current) {
      bassFilterRef.current.gain.value = (clamped / 100) * 12;
    }
  }, []);

  // Set Surround
  const setSurround3D = useCallback((val: boolean) => {
    setSurround3DState(val);
  }, []);

  // Frequency Data for visualizer
  const getFrequencyData = useCallback((): Uint8Array | null => {
    if (!analyserRef.current) return null;
    const array = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(array);
    return array;
  }, []);

  // RECORDING IMPLEMENTATION
  const startRecording = useCallback(() => {
    if (!currentStation || isRecording) return;

    try {
      recordedChunksRef.current = [];
      let stream: MediaStream | null = null;

      if (mediaDestRef.current) {
        stream = mediaDestRef.current.stream;
      } else if (audioRef.current && (audioRef.current as any).captureStream) {
        stream = (audioRef.current as any).captureStream();
      }

      if (!stream) {
        alert('Запись потока не поддерживается в текущем браузере для этой станции');
        return;
      }

      // Check supported mime types
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const sizeKb = Math.round(blob.size / 1024);
        const sizeFormatted = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} МБ` : `${sizeKb} КБ`;
        const now = new Date();
        const dateStr = now.toLocaleDateString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const cleanStation = currentStation.name.replace(/[^a-zA-Z0-9а-яА-Я_-]/g, '_');
        const fileName = `YAi_${cleanStation}_${Date.now()}.webm`;

        const newRec: RecordedTrack = {
          id: `rec_${Date.now()}`,
          stationName: currentStation.name,
          stationUuid: currentStation.stationuuid,
          date: dateStr,
          durationSec: recordingDurationSec || 1,
          blobUrl: url,
          fileSizeFormatted: sizeFormatted,
          fileName,
        };

        setRecordings((prev) => {
          const updated = [newRec, ...prev];
          try {
            localStorage.setItem(RECORDINGS_KEY, JSON.stringify(updated.slice(0, 30)));
          } catch {}
          return updated;
        });

        setIsRecording(false);
        setIsRecorderOpen(true);
      };

      recorder.start(1000);
      setIsRecording(true);
      setRecordingDurationSec(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordingDurationSec((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Ошибка запуска записи. Возможно, аудиопоток станции заблокирован политикой безопасности.');
    }
  }, [currentStation, isRecording, recordingDurationSec]);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, [isRecording]);

  const deleteRecording = useCallback((id: string) => {
    setRecordings((prev) => {
      const rec = prev.find((r) => r.id === id);
      if (rec?.blobUrl) {
        URL.revokeObjectURL(rec.blobUrl);
      }
      const updated = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem(RECORDINGS_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setRecentStations([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
      localStorage.removeItem(RECENT_KEY);
    } catch {}
  }, []);

  const setAlarm = useCallback((newAlarm: RadioAlarm) => {
    setAlarmState(newAlarm);
    try {
      localStorage.setItem(ALARM_KEY, JSON.stringify(newAlarm));
    } catch {}
    // Android-приложение: системный будильник — сработает, даже если приложение закрыто
    const [hh, mm] = (newAlarm.time || '07:30').split(':').map((x) => parseInt(x, 10) || 0);
    nativeSetAlarm({
      enabled: !!newAlarm.enabled && !!newAlarm.stationUrl,
      hour: hh,
      minute: mm,
      days: newAlarm.days || [],
      url: newAlarm.stationUrl || '',
      name: newAlarm.stationName || 'YAi Radio',
      fadeSec: newAlarm.fadeDurationSec || 20,
    });
  }, []);

  // ALARM CLOCK WATCHER (в Android-приложении будильник нативный — этот не нужен)
  useEffect(() => {
    if (!alarm.enabled || !alarm.time || hasNative()) return;

    const checkAlarm = () => {
      const now = new Date();
      const currentDay = now.getDay();
      if (!alarm.days.includes(currentDay)) return;

      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      if (currentTimeStr === alarm.time && now.getSeconds() === 0) {
        // Trigger alarm
        if (alarm.stationUuid) {
          const targetStation = playlist.find((s) => s.stationuuid === alarm.stationUuid) || currentStation;
          if (targetStation) {
            // Fade-in volume
            setVolume(0.05);
            playStation(targetStation);

            const steps = 10;
            const stepMs = ((alarm.fadeDurationSec || 20) * 1000) / steps;
            let currentStep = 1;

            const fadeInterval = setInterval(() => {
              currentStep++;
              const newVol = 0.05 + (0.85 - 0.05) * (currentStep / steps);
              setVolume(newVol);
              if (currentStep >= steps) {
                clearInterval(fadeInterval);
              }
            }, stepMs);
          }
        }
      }
    };

    const interval = setInterval(checkAlarm, 1000);
    return () => clearInterval(interval);
  }, [alarm, playlist, currentStation, playStation, setVolume]);

  useEffect(() => preloadHlsIfNeeded(), []);

  // ---- Станция не запустилась: повтор, проверка через сервер, понятное объяснение ----
  const retriedRef = useRef<Set<string>>(new Set());
  const failingRef = useRef('');
  const playStationRef = useRef(playStation);
  playStationRef.current = playStation;
  const failureRef = useRef<(st: Station, url: string, reason: string) => void>(() => {});
  failureRef.current = async (st: Station, url: string, reason: string) => {
    if (failingRef.current === st.stationuuid) return;
    failingRef.current = st.stationuuid;
    const stillThis = () => currentStationRef.current?.stationuuid === st.stationuuid;
    // Наши проверенные станции (эксклюзив) — сначала одна повторная попытка: часто это короткий сбой сети
    if (st.stationuuid.startsWith('ex-') && !retriedRef.current.has(st.stationuuid)) {
      retriedRef.current.add(st.stationuuid);
      setError(`«${st.name}»: переподключаемся…`);
      setTimeout(() => {
        failingRef.current = '';
        if (stillThis() && audioRef.current) {
          setStream(audioRef.current, url);
          audioRef.current.play().catch(() => {});
        }
      }, 1500);
      return;
    }
    setIsLoading(true);
    setError(`Проверяем «${st.name}»…`);
    const verdict = await probeStream(url);
    failingRef.current = '';
    if (!stillThis()) return;
    setIsLoading(false);
    setIsPlaying(false);
    if (verdict === 'ok') {
      // У нашего сервера станция играет — значит, она закрыта для страны/IP слушателя. Не прячем и не листаем.
      markGeoBlocked(st.stationuuid);
      const net = await myNetwork();
      const where = net?.country ? ` (страна: ${net.country}${net.ip ? `, ваш IP: ${net.ip}` : ''})` : '';
      setError(`🔒 «${st.name}» не открывается из вашей страны${where}. Это ограничение самой станции, а не YAi — попробуйте другую станцию.`);
      return;
    }
    quarantineStation(st.stationuuid, st.name, url, reason);
    setError(verdict === 'dead' ? `⚠️ «${st.name}» сейчас не работает — скрыли её у вас. Включаем следующую…` : `Поток «${st.name}» недоступен. Включаем следующую…`);
    const pl = playlistRef.current;
    if (pl && pl.length > 1) {
      const idx = pl.findIndex((x) => x.stationuuid === st.stationuuid);
      const next = pl[(idx + 1) % pl.length];
      if (next && next.stationuuid !== st.stationuuid) setTimeout(() => stillThis() && playStationRef.current(next, pl), 1500);
    }
  };

  // ---- Android: виджет и запуск с виджета / из будильника ----
  const nativeRef = useRef({ togglePlayPause: () => {}, playStation: (_s: Station) => {}, recent: [] as Station[], alarm });
  nativeRef.current = { togglePlayPause, playStation, recent: recentStations, alarm };
  useEffect(() => {
    if (!hasNative()) return;
    nativeNowPlaying(currentStation?.name || 'YAi Radio', currentStation?.country || '', isPlaying);
  }, [currentStation?.stationuuid, isPlaying]);
  useEffect(() => {
    if (!hasNative()) return;
    const handle = (action: string) => {
      const n = nativeRef.current;
      if (action.startsWith('open:')) {
        window.location.hash = action.slice(5);
        return;
      }
      if (action === 'toggle') return n.togglePlayPause();
      // «Дальше/назад» из шторки, с экрана блокировки, с наушников
      if (action === 'next') return controlsRef.current.playNext();
      if (action === 'prev') return controlsRef.current.playPrevious();
      if (action === 'alarm') {
        // будильник сработал, пользователь открыл приложение — продолжаем ту же станцию уже в приложении
        nativeStopAlarm();
        const a = n.alarm;
        const st =
          n.recent.find((s) => s.stationuuid === a.stationUuid) ||
          (a.stationUrl ? ({ stationuuid: a.stationUuid || 'alarm', name: a.stationName, url: a.stationUrl, url_resolved: a.stationUrl } as Station) : null);
        if (st) n.playStation(st);
        return;
      }
      if (action === 'play') {
        const cur = currentStationRef.current;
        if (cur) {
          if (audioRef.current?.paused) n.togglePlayPause();
        } else if (n.recent[0]) n.playStation(n.recent[0]);
      }
    };
    const off1 = onNative('remote', handle);
    const off2 = onNative('launchAction', handle);
    // приложение открыто с виджета/из уведомления будильника
    setTimeout(() => nativeLaunchAction().then((a) => a && handle(a)), 1200);
    return () => {
      off1();
      off2();
    };
  }, []);

  // Sleep timer interval with gentle fade-out in final 30 seconds
  useEffect(() => {
    if (sleepTimerRemainingSec === null) return;

    if (sleepTimerRemainingSec <= 0) {
      if (audioRef.current && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      setSleepTimerMinutes(null);
      setSleepTimerRemainingSec(null);
      return;
    }

    // Fade-out during last 20 seconds
    if (sleepTimerRemainingSec <= 20 && audioRef.current) {
      const fadeFactor = sleepTimerRemainingSec / 20;
      audioRef.current.volume = Math.max(0.02, (sysVolRef.current ? 1 : volume) * fadeFactor);
    }

    const interval = setInterval(() => {
      setSleepTimerRemainingSec((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimerRemainingSec, isPlaying, volume]);

  const setSleepTimer = useCallback((minutes: number | null) => {
    setSleepTimerMinutes(minutes);
    if (minutes === null) {
      setSleepTimerRemainingSec(null);
    } else {
      setSleepTimerRemainingSec(minutes * 60);
    }
  }, []);

  // Карточка «Сейчас играет» на экране блокировки, в шторке, на часах и в машине.
  // В приложении Android — через нативный модуль (он же держит звук при выключенном экране),
  // в браузере/на iPhone — через стандартный Media Session.
  const controlsRef = useRef({ playNext, playPrevious, resumeLive });
  controlsRef.current = { playNext, playPrevious, resumeLive };

  // Красивая картинка для экрана блокировки: обложка песни (iTunes) или фирменная карточка станции
  const [lockArt, setLockArt] = useState<{ src: string; sizes: string; type: string } | null>(null);
  useEffect(() => {
    const st = currentStation;
    if (!st) return;
    let cancelled = false;
    const hasTrack = !!currentTrackTitle && currentTrackTitle !== st.name;
    (async () => {
      const art = hasTrack ? await fetchAlbumArtFromItunes(currentTrackTitle).catch(() => null) : null;
      if (cancelled) return;
      if (art) return setLockArt({ src: art, sizes: '600x600', type: 'image/jpeg' });
      if (isNativeApp) return setLockArt(null); // в Android — логотип станции, как раньше
      const card = await stationCard(st).catch(() => '');
      if (!cancelled) setLockArt(card ? { src: card, sizes: '512x512', type: 'image/png' } : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentStation?.stationuuid, currentTrackTitle]);

  useEffect(() => {
    if (!currentStation) return;
    const tags = currentStation.tags ? currentStation.tags.split(',').slice(0, 2).join(', ') : 'Радио';
    const hasTrack = !!currentTrackTitle && currentTrackTitle !== currentStation.name;
    const meta = {
      title: hasTrack ? currentTrackTitle : currentStation.name,
      artist: hasTrack ? currentStation.name : `${currentStation.country || 'Радио'} · ${tags}`,
      album: 'YAi Radio',
      artwork: [
        lockArt ||
        (currentStation.favicon && /^https:\/\//.test(currentStation.favicon)
          ? { src: currentStation.favicon, sizes: '512x512', type: 'image/png' }
          : { src: 'https://eai-apps.github.io/YAiPlay-Radio/icons/icon-512.png', sizes: '512x512', type: 'image/png' }),
      ],
    };
    const state = isPlaying ? 'playing' : 'paused';
    const play = () => controlsRef.current.resumeLive();
    const pause = () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
      audioRef.current?.pause();
      setIsPlaying(false);
    };

    // Новый APK: своя нативная карточка — кнопки работают прямо с плеером, даже когда страница «спит»
    if (isNativeApp && nativeEngine && hasNativeSession()) {
      setNativeMeta(meta.title, meta.artist, meta.artwork[0]?.src || '');
      return;
    }

    if (isNativeApp) {
      import('@capgo/capacitor-media-session')
        .then(async ({ MediaSession }) => {
          await MediaSession.setMetadata(meta);
          await MediaSession.setPlaybackState({ playbackState: state });
          await MediaSession.setActionHandler({ action: 'play' }, play);
          await MediaSession.setActionHandler({ action: 'pause' }, pause);
          await MediaSession.setActionHandler({ action: 'stop' }, pause);
          await MediaSession.setActionHandler({ action: 'nexttrack' }, () => controlsRef.current.playNext());
          await MediaSession.setActionHandler({ action: 'previoustrack' }, () => controlsRef.current.playPrevious());
        })
        .catch((e) => console.warn('Нативная карточка плеера недоступна', e));
      return;
    }

    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata(meta);
      navigator.mediaSession.playbackState = state;
      navigator.mediaSession.setActionHandler('play', play);
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('stop', pause);
      navigator.mediaSession.setActionHandler('previoustrack', () => controlsRef.current.playPrevious());
      navigator.mediaSession.setActionHandler('nexttrack', () => controlsRef.current.playNext());
    } catch (e) {
      console.warn('MediaSession handler error:', e);
    }
  }, [currentStation, isPlaying, currentTrackTitle, lockArt, nativeEngine]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AudioContext.Provider
      value={{
        currentStation,
        isPlaying,
        isLoading,
        error,
        volume,
        isMuted,
        playlist,
        playStation,
        togglePlayPause,
        nativeEngine,
        playNext,
        playPrevious,
        setVolume,
        toggleMute,
        clearError,

        // Modals
        isFullScreenOpen,
        setIsFullScreenOpen,
        isCarModeOpen,
        setIsCarModeOpen,
        isEqualizerOpen,
        setIsEqualizerOpen,
        isRecorderOpen,
        setIsRecorderOpen,
        isAlarmOpen,
        setIsAlarmOpen,

        // Sleep timer
        sleepTimerMinutes,
        sleepTimerRemainingSec,
        setSleepTimer,

        // Equalizer & Audio FX
        isEqEnabled,
        setIsEqEnabled,
        eqBands,
        setBandGain,
        activePresetId,
        setEqualizerPreset,
        bassBoost,
        setBassBoost,
        surround3D,
        setSurround3D,
        getFrequencyData,

        // Recorder
        isRecording,
        recordingDurationSec,
        startRecording,
        stopRecording,
        recordings,
        deleteRecording,

        // Track & History
        currentTrackTitle,
        history,
        recentStations,
        clearHistory,
        recognizedTracks,
        clearRecognizedTracks,
        deleteRecognizedTrack,
        bookmarkCurrentTrack,

        // Alarm Clock
        alarm,
        setAlarm,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
