/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AudioProvider, useAudio } from './context/AudioPlayerContext';
import { useFavorites } from './hooks/useFavorites';
import { useYAiSettings, YAiSettingsProvider } from './context/YAiSettingsContext';
import { isSectionHidden, hiddenCountrySet } from './utils/visibility';
import { FEATURES } from './utils/platform';
import { ContinueListening } from './components/ContinueListening';
import { ListFilters } from './components/ListFilters';
import { loadCatalog } from './services/catalogService';
import { ExclusiveSection } from './components/ExclusiveSection';
import { MyPlaylist, openPlaylist } from './components/MyPlaylist';
import { RecordSpotlight, openRecord } from './components/RecordSpotlight';
import { AppsView } from './components/AppsView';
const LiteGeography = React.lazy(() => import('../lite/Geography'));
const GlobeView = React.lazy(() => import('./components/GlobeView').then((m) => ({ default: m.GlobeView })));
import { UpdateBanner } from './components/UpdateBanner';
import { IntroSplash } from './components/IntroSplash';
import { useCustomStations } from './hooks/useCustomStations';
import { fetchStations, fetchGenreStations, fetchCatalogStats, fetchStationsByUuids } from './services/radioApi';
import { MobileHome } from './components/MobileHome';
import { syncNow } from './services/syncService';
import { getMyCountry } from './services/geoService';
import { SupportModal } from './components/SupportModal';
import { PartnersBlock } from './components/PartnersBlock';
import { Station, MainTab, BitrateFilter, GenreCategory } from './types/radio';
import { GENRES } from './constants/genres';
import { Sidebar } from './components/Sidebar';
import { useLiteMode } from './utils/liteMode';
import { BottomNav } from './components/BottomNav';
import { Header } from './components/Header';
import { GenreBar } from './components/GenreBar';
import { StationGrid } from './components/StationGrid';
import { BottomPlayer } from './components/BottomPlayer';
import { FullScreenPlayer } from './components/FullScreenPlayer';
import { SleepTimerModal } from './components/SleepTimerModal';
import { ProView } from './components/ProView';
import { InfoTelegramView } from './components/InfoTelegramView';
import { AdminModal } from './components/AdminModal';
import { isOwnerMode } from './utils/owner';
import { SuggestStationModal } from './components/SuggestStationModal';
import { YAiLogo } from './components/YAiLogo';
import { MoodsView } from './components/MoodsView';
import { HistoryView } from './components/HistoryView';
import { CarModeModal } from './components/CarModeModal';
import { EqualizerModal } from './components/EqualizerModal';
import { RecorderModal } from './components/RecorderModal';
import { AlarmModal } from './components/AlarmModal';
import { WebcamsView } from './components/WebcamsView';
import { SyncModal, importFavoritesFromLink } from './components/SyncModal';
import { AboutModal } from './components/AboutModal';
import { QualityChip } from './components/QualityChip';
import { hasNative, nativeSaveLibrary, LibItem } from './services/nativeBridge';
import { pickStream } from './services/streamQuality';
import { ShareSheet } from './components/ShareSheet';
import { AddToPlaylistModal, SharedPlaylistModal } from './components/PlaylistModals';
import { SharedPlaylist, parseSharedPlaylist, parseSharedStation, openInAppLink } from './services/share';
import { CuratedSection } from './components/CuratedSection';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ArtistsView } from './components/ArtistsView';
import { LiveTVView } from './components/LiveTVView';
import { COUNTRIES, getCountryFlag } from './constants/countries';
import {
  Flame,
  LayoutGrid,
  Search,
  Heart,
  Moon,
  Clock,
  ArrowLeft,
  Crown,
  Sparkles,
  Send,
  Play,
  Pause,
  Radio,
  Wifi,
  ShieldCheck,
  Car,
  X,
  ListMusic,
} from 'lucide-react';

function RadioApp() {
  const [liteOn] = useLiteMode();
  const {
    currentStation,
    isPlaying,
    playStation,
    sleepTimerRemainingSec,
    error,
    clearError,
    isCarModeOpen,
    setIsCarModeOpen,
    isEqualizerOpen,
    setIsEqualizerOpen,
    nativeEngine,
    isRecorderOpen,
    setIsRecorderOpen,
    isAlarmOpen,
    setIsAlarmOpen,
    setIsFullScreenOpen,
    togglePlayPause,
    isLoading: isAudioLoading,
  } = useAudio();

  const { favorites, isFavorite, toggleFavorite, favoritesCount } = useFavorites();
  // Android Auto: избранное, недавние и Radio Record — в нативную часть приложения
  const { recentStations } = useAudio();
  useEffect(() => {
    if (!hasNative()) return;
    const item = (st: Station): LibItem => ({ id: st.stationuuid, name: st.name, url: pickStream(st).url, subtitle: [st.country, (st.tags || '').split(',')[0]].filter(Boolean).join(' · ') });
    loadCatalog().then((c) => {
      const record = (c.exclusive || []).find((g) => g.id === 'record')?.stations || [];
      nativeSaveLibrary({ fav: favorites.slice(0, 100).map(item), recent: recentStations.slice(0, 20).map(item), record: record.map(item) });
    });
  }, [favorites, recentStations]);
  const { settings, updateSettings, togglePro, setTheme, resetLogo, setLanguage } = useYAiSettings();
  const { customStations, addCustomStation, deleteCustomStation } = useCustomStations();

  const [currentTab, setCurrentTab] = useState<MainTab>('popular');
  const [selectedGenre, setSelectedGenre] = useState<GenreCategory>(GENRES[0]);
  const [activeGenreDetail, setActiveGenreDetail] = useState<GenreCategory | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [bitrateFilter, setBitrateFilter] = useState<BitrateFilter>('all');
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [artistsCategory, setArtistsCategory] = useState<'all' | 'cis' | 'world' | 'ost'>('all');

  // Modals state
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [catalogCount, setCatalogCount] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Автосинхронизация избранного (если пользователь вошёл в аккаунт)
  useEffect(() => {
    let timer: any;
    const t0 = setTimeout(() => syncNow().catch(() => {}), 1500);
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => syncNow().catch(() => {}), 2000);
    };
    const onFocus = () => syncNow().catch(() => {});
    window.addEventListener('YAi_local_change', onChange);
    window.addEventListener('focus', onFocus);
    return () => {
      clearTimeout(t0);
      clearTimeout(timer);
      window.removeEventListener('YAi_local_change', onChange);
      window.removeEventListener('focus', onFocus);
    };
  }, [settings.apiUrl]);

  const [isSupportOpen, setIsSupportOpen] = useState(false);
  useEffect(() => {
    const open = () => setIsSupportOpen(true);
    const openSync = () => setIsSyncModalOpen(true);
    window.addEventListener('YAi_open_support', open);
    window.addEventListener('YAi_open_sync', openSync);
    return () => {
      window.removeEventListener('YAi_open_support', open);
      window.removeEventListener('YAi_open_sync', openSync);
    };
  }, []);

  // Набрали #admin в адресе без перезагрузки страницы — включаем режим владельца
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash.toLowerCase().includes('admin') && !isOwnerMode) {
        try {
          localStorage.setItem('YAi_owner_mode', '1');
        } catch {}
        window.location.reload();
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Прямые ссылки на разделы: #apps (из Телеграм-канала «Скачать приложение»)
  useEffect(() => {
    const h = window.location.hash;
    if (h === '#apps' || h === '#webcams' || h === '#globe') {
      setCurrentTab(h.slice(1) as MainTab);
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  // Ссылки «поделиться»: #station=<id>, #st=<станция целиком>, #pl=<плейлист>
  const [sharedStation, setSharedStation] = useState<Station | null>(null);
  const [sharedPlaylist, setSharedPlaylist] = useState<SharedPlaylist | null>(null);
  const [appLink, setAppLink] = useState<string | null>(null);
  useEffect(() => {
    const handle = () => {
      const h = window.location.hash;
      const ms = /#station=([0-9a-z-]{8,80})/i.exec(h);
      const mst = /#st=([A-Za-z0-9_-]+)/.exec(h);
      const mpl = /#pl=([A-Za-z0-9_-]+)/.exec(h);
      if (!ms && !mst && !mpl) return;
      setAppLink(openInAppLink(h));
      history.replaceState(null, '', window.location.pathname + window.location.search);
      if (mpl) {
        const pl = parseSharedPlaylist(mpl[1]);
        if (pl) setSharedPlaylist(pl);
        return;
      }
      if (mst) {
        const st = parseSharedStation(mst[1]);
        if (st) setSharedStation(st);
        return;
      }
      const id = ms![1];
      // Эксклюзив (Record, FIP…) ищем в нашем каталоге, остальные — в Radio Browser
      if (id.startsWith('ex-')) {
        loadCatalog()
          .then((c) => {
            const st = (c.exclusive || []).flatMap((g) => g.stations).find((x) => x.stationuuid === id);
            if (st) setSharedStation(st);
          })
          .catch(() => {});
      } else {
        fetchStationsByUuids([id]).then((l) => l[0] && setSharedStation(l[0])).catch(() => {});
      }
    };
    handle();
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, []);

  // Размер каталога для главной + перенос избранного по ссылке/QR (#fav=...)
  useEffect(() => {
    fetchCatalogStats().then((st) => st?.stations && setCatalogCount(Number(st.stations)));
    importFavoritesFromLink(customStations).then((n) => {
      if (n === null) return;
      setNotice(n > 0 ? `Добавлено в избранное: ${n} станций` : 'Эти станции уже есть в избранном');
      setTimeout(() => setNotice(null), 4000);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load stations based on active tab and parameters
  const loadStations = useCallback(async () => {
    if (
      currentTab === 'favorites' ||
      currentTab === 'pro' ||
      currentTab === 'info' ||
      currentTab === 'moods' ||
      currentTab === 'history' ||
      currentTab === 'webcams' ||
      currentTab === 'apps' ||
      currentTab === 'globe'
    ) {
      return;
    }

    setIsLoadingStations(true);
    try {
      let tagToUse: string | undefined = undefined;
      let nameToUse: string | undefined = undefined;

      if (currentTab === 'genres') {
        const targetGenre = activeGenreDetail || selectedGenre;
        tagToUse = targetGenre.tag || undefined;
      } else if (currentTab === 'search') {
        nameToUse = searchQuery.trim() || undefined;
      }

      // If user typed in search bar regardless of current tab, prioritize search
      if (searchQuery.trim().length > 1) {
        nameToUse = searchQuery.trim();
      }

      const genreObj = currentTab === 'genres' ? activeGenreDetail || selectedGenre : null;
      const results =
        genreObj && genreObj.tag
          ? await fetchGenreStations(genreObj, { name: nameToUse, countrycode: selectedCountry || undefined, limit: 80 })
          : await fetchStations({
              tag: tagToUse,
              name: nameToUse,
              countrycode: selectedCountry || undefined,
              limit: selectedCountry ? 150 : 80,
            });

      setStations(results);
    } catch (err) {
      console.error('Failed to load stations:', err);
    } finally {
      setIsLoadingStations(false);
    }
  }, [currentTab, activeGenreDetail, selectedGenre, searchQuery, selectedCountry]);

  // Trigger stations load on dependencies change with debounce for search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadStations();
    }, searchQuery ? 350 : 0);

    return () => clearTimeout(timer);
  }, [loadStations, searchQuery]);

  // Filter stations and prepend custom stations on top ("YAi Choice")
  const displayedStations = useMemo(() => {
    let list: Station[] = [];

    if (currentTab === 'favorites') {
      list = [...favorites];
    } else {
      // Prepend matching custom stations at the very beginning
      const activeCustom = customStations.filter((s) => {
        if (selectedCountry && s.countrycode?.toUpperCase() !== selectedCountry.toUpperCase()) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            s.name.toLowerCase().includes(q) ||
            s.tags?.toLowerCase().includes(q) ||
            s.country?.toLowerCase().includes(q)
          );
        }
        if (currentTab === 'genres' && (activeGenreDetail || selectedGenre).tag) {
          const tag = (activeGenreDetail || selectedGenre).tag.toLowerCase();
          return s.tags?.toLowerCase().includes(tag) || s.tags?.toLowerCase().includes('exclusive');
        }
        return true;
      });

      list = [...activeCustom, ...stations];
    }

    // Apply country filter for favorites
    if (currentTab === 'favorites' && selectedCountry) {
      list = list.filter(
        (s) => s.countrycode?.toUpperCase() === selectedCountry.toUpperCase()
      );
    }

    // Apply search query for favorites
    if (currentTab === 'favorites' && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.tags?.toLowerCase().includes(q) ||
          s.country?.toLowerCase().includes(q)
      );
    }

    // Apply bitrate filter
    if (bitrateFilter === '128') {
      list = list.filter((s) => (s.bitrate || 0) >= 128);
    } else if (bitrateFilter === '320') {
      list = list.filter((s) => (s.bitrate || 0) >= 256);
    }

    return list;
  }, [
    currentTab,
    favorites,
    stations,
    customStations,
    selectedCountry,
    searchQuery,
    bitrateFilter,
    activeGenreDetail,
    selectedGenre,
  ]);

  const handleSelectTab = (tab: MainTab) => {
    setCurrentTab(tab);
    if (tab === 'popular') {
      setSelectedGenre(GENRES[0]);
      setActiveGenreDetail(null);
    }
  };

  const handleSelectGenre = (genre: GenreCategory) => {
    setSelectedGenre(genre);
    setActiveGenreDetail(genre);
    setCurrentTab('genres');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToGenresList = () => {
    setActiveGenreDetail(null);
    setSelectedGenre(GENRES[0]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCountry('');
    setBitrateFilter('all');
    if (currentTab === 'search') {
      setCurrentTab('popular');
    }
  };

  const featured = settings.featuredStation || null;

  const handlePlayFirstStation = () => {
    if (featured) {
      playStation(featured, [featured, ...displayedStations.filter((s) => s.stationuuid !== featured.stationuuid)]);
      setIsFullScreenOpen(true);
    } else if (displayedStations.length > 0) {
      playStation(displayedStations[0], displayedStations);
    }
  };

  const [userCountry, setUserCountry] = useState('');
  useEffect(() => {
    getMyCountry().then((cc) => cc && setUserCountry(cc));
  }, [settings.apiUrl]);

  const playList = (list: Station[]) => {
    if (!list.length) {
      setNotice('Сейчас не удалось получить станции. Попробуйте ещё раз.');
      setTimeout(() => setNotice(null), 3500);
      return;
    }
    playStation(list[0], list);
  };
  const handleRandom = async () => playList(await fetchStations({ order: 'random', limit: 40 }));
  const handleTrending = async () => playList(await fetchStations({ order: 'clicktrend', limit: 60 }));
  const handleMyCountry = async () => {
    const cc = userCountry || (await getMyCountry());
    if (!cc) return;
    setUserCountry(cc);
    setSelectedCountry(cc);
    setTimeout(() => document.getElementById('station-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  // Раздел выключен владельцем в админке → возвращаемся на главную
  useEffect(() => {
    if (isSectionHidden(settings, currentTab)) setCurrentTab('popular');
  }, [currentTab, settings.hiddenSections]);

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="relative min-h-screen bg-[#06080d] text-neutral-100 flex flex-col md:flex-row antialiased overflow-x-hidden">
      {/* YAi Atmospheric Brand Ambient Radial Glows (Cyan & Lime) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-36 left-1/4 w-[550px] h-[550px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute -top-28 right-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px]" />
        <div className="absolute top-1/2 right-10 w-[450px] h-[450px] bg-violet-500/10 rounded-full blur-[160px]" />
      </div>

      {/* Desktop / iPad Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        selectedGenreId={activeGenreDetail?.id || selectedGenre.id}
        onSelectGenre={(genreId) => {
          const g = GENRES.find((item) => item.id === genreId);
          if (g) handleSelectGenre(g);
        }}
        favoritesCount={favoritesCount}
        onOpenSleepTimer={() => setIsSleepModalOpen(true)}
        settings={settings}
        onUploadLogo={(base64) => updateSettings({ customLogoUrl: base64 })}
        onOpenAdmin={isOwnerMode ? () => setIsAdminModalOpen(true) : undefined}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenAbout={() => setIsAboutModalOpen(true)}
        onSelectLanguage={setLanguage}
      />

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 pb-48 md:pb-28">
        {/* Mobile Top Header */}
        <div className="md:hidden flex items-center justify-between px-4 pb-3 pt-safe-3 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900 sticky top-0 z-30">
          <div className="flex items-center gap-2.5 min-w-0">
            <YAiLogo
              customLogoUrl={settings.customLogoUrl}
              size="sm"
              allowUpload={false}
              isSpinning={false}
            />
            <div className="min-w-0">
              <span className="text-sm font-extrabold tracking-tight text-white block truncate">
                {settings.appTitle || 'YAi Radio'}
              </span>
              <span className="text-[10px] font-medium text-violet-400 block truncate font-mono">
                {settings.appSubtitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Telegram / Info quick link on mobile */}
            <button
              onClick={() => setCurrentTab('info')}
              aria-label="О проекте"
              className={`p-2 rounded-full border transition-colors ${
                currentTab === 'info'
                  ? 'bg-theme-subtle text-theme-accent border-theme-subtle'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>

            {/* Качество звука (мобильная шапка) */}
            <QualityChip hasVariants />

            {/* Sleep timer button on mobile */}
            <button
              onClick={() => setIsSleepModalOpen(true)}
              aria-label="Таймер сна"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                sleepTimerRemainingSec !== null
                  ? 'bg-theme-subtle text-theme-accent border border-theme-subtle'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}
            >
              {sleepTimerRemainingSec !== null ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-theme-accent animate-pulse" />
                  <span className="font-mono tabular-nums text-theme-accent">
                    {formatRemaining(sleepTimerRemainingSec)}
                  </span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>Сон</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Search and Filter Bar */}
        {currentTab !== 'pro' && currentTab !== 'info' && (
          <Header
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              if (q.trim() && currentTab !== 'search' && currentTab !== 'favorites') {
                setCurrentTab('search');
              }
            }}
            selectedCountry={selectedCountry}
            onSelectCountry={(countryCode) => {
              setSelectedCountry(countryCode);
              if (currentTab === 'artists') {
                setCurrentTab('popular');
              }
            }}
            bitrateFilter={bitrateFilter}
            onSelectBitrate={setBitrateFilter}
            onRefresh={loadStations}
            isLoading={isLoadingStations}
            language={settings.language || 'ru'}
            onSelectLanguage={setLanguage}
            onOpenAdmin={isOwnerMode ? () => setIsAdminModalOpen(true) : undefined}
            onOpenSync={() => setIsSyncModalOpen(true)}
            onOpenAbout={() => setIsAboutModalOpen(true)}
            currentTab={currentTab}
            onSelectTab={handleSelectTab}
            artistsCategory={artistsCategory}
            onSelectArtistsCategory={setArtistsCategory}
          />
        )}

        {sharedStation && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-2xl bg-gradient-to-r from-violet-950/80 to-cyan-950/60 border border-violet-500/40 flex items-center gap-3">
            <button
              onClick={() => {
                playStation(sharedStation, [sharedStation]);
                setIsFullScreenOpen(true);
                setSharedStation(null);
              }}
              className="w-12 h-12 shrink-0 rounded-full bg-violet-400 text-zinc-950 flex items-center justify-center"
              aria-label="Слушать"
            >
              <Play className="w-6 h-6 fill-current ml-0.5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-violet-300">💚 Вам рекомендуют станцию</div>
              <div className="text-sm font-bold text-white truncate">{sharedStation.name}</div>
            </div>
            {appLink && (
              <a href={appLink} className="shrink-0 px-3 py-2 rounded-xl bg-zinc-900/80 border border-violet-500/40 text-[11px] font-bold text-violet-200">
                Открыть в приложении
              </a>
            )}
            <button onClick={() => setSharedStation(null)} className="p-2 text-zinc-400" aria-label="Закрыть">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {sharedPlaylist && appLink && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[67] px-4 py-2.5 rounded-2xl bg-zinc-900 border border-violet-500/40 shadow-2xl">
            <a href={appLink} className="text-xs font-bold text-violet-200">📱 Открыть в приложении YAi</a>
          </div>
        )}
        {sharedPlaylist && <SharedPlaylistModal data={sharedPlaylist} onClose={() => setSharedPlaylist(null)} />}
        <ShareSheet />
        <AddToPlaylistModal />

        {notice && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-violet-950/60 border border-violet-700/60 rounded-2xl text-xs text-violet-200 font-semibold">
            ✓ {notice}
          </div>
        )}

        {/* Error notification bar if stream error occurs */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-950/60 border border-red-900/60 rounded-2xl flex items-center justify-between text-xs text-red-300">
            <span>{error}</span>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-white underline font-medium ml-2"
            >
              Закрыть
            </button>
          </div>
        )}

        {/* Dynamic Page Views */}
        <IntroSplash />
        <UpdateBanner />

        <main className="flex-1 px-4 sm:px-6 py-6 max-w-7xl w-full mx-auto">
          {/* Active Combo Filters Banner: Country + Genre (hidden on webcams, tv, info, artists) */}
          {!(currentTab === 'webcams' || currentTab === 'tv' || currentTab === 'info' || currentTab === 'artists' || currentTab === 'apps' || currentTab === 'globe') &&
            (selectedCountry || (currentTab === 'genres' && activeGenreDetail)) && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-zinc-900/95 via-zinc-900/80 to-violet-950/40 border border-cyan-500/30 shadow-lg animate-fade-in mb-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5 uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Активные фильтры:
                </span>

                {selectedCountry && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-cyan-500/15 text-cyan-200 border border-cyan-400/40 shadow-sm">
                    <span>{getCountryFlag(selectedCountry)}</span>
                    <span>
                      Страна: {COUNTRIES.find((c) => c.code.toUpperCase() === selectedCountry.toUpperCase())?.name || selectedCountry}
                    </span>
                    <button
                      onClick={() => setSelectedCountry('')}
                      className="hover:text-white p-0.5 rounded ml-1 transition-colors"
                      title="Сбросить страну"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {currentTab === 'genres' && activeGenreDetail && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-violet-500/15 text-violet-200 border border-violet-400/40 shadow-sm">
                    <span>🎵 Жанр: {activeGenreDetail?.name}</span>
                    <button
                      onClick={handleBackToGenresList}
                      className="hover:text-white p-0.5 rounded ml-1 transition-colors"
                      title="Сбросить жанр"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>

              <button
                onClick={() => {
                  setSelectedCountry('');
                  handleBackToGenresList();
                }}
                className="px-3 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Сбросить всё</span>
              </button>
            </div>
          )}

          {/* TAB: POPULAR */}
          {currentTab === 'popular' && (
            <div className="flex flex-col gap-8">
              <MobileHome
                title={settings.appTitle}
                featured={featured}
                currentStation={currentStation}
                isPlaying={isPlaying}
                isLoading={isAudioLoading}
                userCountry={userCountry}
                onPlayMain={handlePlayFirstStation}
                onTogglePlay={togglePlayPause}
                onOpenPlayer={() => setIsFullScreenOpen(true)}
                onRandom={handleRandom}
                onTrending={handleTrending}
                onMyCountry={handleMyCountry}
              />

              {/* BRAND CYBER HERO BANNER IN YAi COLORS */}
              <div className="hidden md:block relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-950 via-[#040e1a] to-[#03150e] border border-cyan-500/25 shadow-[0_10px_35px_-10px_rgba(6,182,212,0.3)]">
                {/* Glow accents */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-400/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-cyan-500/15 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Hero Left: Unified YAiLogo + Title & Badges */}
                  <div className="flex items-start sm:items-center gap-5 sm:gap-6 min-w-0">
                    <YAiLogo
                      size="xl"
                      allowUpload={false}
                      isSpinning={false}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full shadow-[0_0_35px_rgba(96,65,216,0.5)] border-2 border-violet-400/50 shrink-0"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                          FREE RADIO
                        </span>
                        {catalogCount ? (
                          <span className="text-xs text-cyan-300 font-mono font-semibold flex items-center gap-1">
                            <Wifi className="w-3.5 h-3.5 text-cyan-400" /> {catalogCount.toLocaleString('ru-RU')} станций в каталоге
                          </span>
                        ) : null}
                      </div>

                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                        {settings.heroTitle || 'YAi Radio'}
                      </h1>
                      <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-xl leading-relaxed">
                        {settings.heroSubtitle ||
                          'Тысячи бесплатных радиостанций со всего мира: жанры, страны, подборки по настроению. Без рекламы и регистрации.'}
                      </p>

                      {/* Micro badges */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3 text-[11px] text-zinc-400 font-mono">
                        <span className="px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-zinc-300">
                          Без рекламы
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-zinc-300">
                          Экран блокировки
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-zinc-300">
                          Sleep Timer
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-violet-400 font-bold">
                          Бесплатно
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Hero Quick Actions */}
                  <div className="flex sm:flex-col gap-2.5 shrink-0">
                    <button
                      onClick={handlePlayFirstStation}
                      className="flex-1 sm:flex-none px-6 py-3.5 rounded-2xl bg-theme-accent text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-theme-glow hover:brightness-110 active:scale-95 transition-all"
                    >
                      <Play className="w-4 h-4 fill-zinc-950" />
                      <span>{featured ? `Слушать ${settings.appTitle}` : 'Включить топ-эфир'}</span>
                    </button>

                    <button
                      onClick={openPlaylist}
                      className="px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-500/25 to-cyan-400/20 hover:from-violet-500/35 text-white font-bold text-xs border border-violet-400/50 flex items-center justify-center gap-2 transition-colors"
                    >
                      <ListMusic className="w-4 h-4 text-violet-300" />
                      <span>Мои плейлисты{favoritesCount ? ` · ${favoritesCount}` : ''}</span>
                    </button>

                    <button
                      onClick={() => {
                        setCurrentTab('genres');
                        setActiveGenreDetail(null);
                      }}
                      className="px-5 py-3 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 text-white font-semibold text-xs border border-cyan-500/30 flex items-center justify-center gap-2 transition-colors"
                    >
                      <LayoutGrid className="w-4 h-4 text-cyan-400" />
                      <span>Каталог жанров</span>
                    </button>

                    <button
                      onClick={handleRandom}
                      className="px-5 py-3 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 text-white font-semibold text-xs border border-cyan-500/30 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>Мне повезёт</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Под баннером: мой плейлист, Radio Record, эксклюзив, затем «Продолжить слушать» */}
              <MyPlaylist onGoFavorites={() => setCurrentTab('favorites')} />

              <CuratedSection />

              <RecordSpotlight />

              <ExclusiveSection />

              <ContinueListening />

              {/* Quick Horizontal Genre Carousel */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Жанровые коллекции YAi</span>
                  </span>
                  <button
                    onClick={() => {
                      setCurrentTab('genres');
                      setActiveGenreDetail(null);
                    }}
                    className="text-xs font-semibold text-cyan-400 hover:underline transition-colors"
                  >
                    Все 30+ жанров →
                  </button>
                </div>
                <GenreBar
                  selectedGenreId={selectedGenre.id}
                  onSelectGenre={handleSelectGenre}
                  layout="carousel"
                />
              </div>

              {/* Station Grid */}
              <div className="mt-2 scroll-mt-24" id="station-list">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <span className="text-base font-bold text-white">
                    {selectedCountry
                      ? `${getCountryFlag(selectedCountry)} Станции: ${COUNTRIES.find((c) => c.code.toUpperCase() === selectedCountry.toUpperCase())?.name || selectedCountry}`
                      : '🌍 Популярные станции мира'}{' '}
                    <span className="text-zinc-400 font-semibold text-sm">({displayedStations.length})</span>
                  </span>
                  <ListFilters
                    country={selectedCountry}
                    onCountry={setSelectedCountry}
                    query={searchQuery}
                    onQuery={setSearchQuery}
                    onGenre={(g) => g && handleSelectGenre(g)}
                  />
                </div>

                <StationGrid
                  stations={displayedStations}
                  currentStation={currentStation}
                  isPlaying={isPlaying}
                  isLoading={isLoadingStations}
                  isFavorite={isFavorite}
                  onPlayStation={playStation}
                  onToggleFavorite={toggleFavorite}
                  onResetFilters={handleResetFilters}
                />
              </div>
            </div>
          )}

          {/* TAB: GENRES */}
          {currentTab === 'genres' && (
            <div className="flex flex-col gap-6">
              {!activeGenreDetail ? (
                <>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                      <LayoutGrid className="w-6 h-6 text-cyan-400" />
                      <span>Категории и жанры</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                      Выберите жанр для мгновенного перехода к радиостанциям
                    </p>
                  </div>

                  {/* Full 12 Genres Grid */}
                  <GenreBar
                    selectedGenreId={selectedGenre.id}
                    onSelectGenre={handleSelectGenre}
                    layout="grid"
                  />
                </>
              ) : (
                /* Dedicated Genre Stations View with Back Button */
                <div className="flex flex-col gap-6 animate-fade-in">
                  {/* Genre Hero Banner */}
                  <div
                    className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r ${activeGenreDetail.gradient} shadow-2xl border border-cyan-500/30`}
                  >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

                    <div className="relative z-10 flex flex-col gap-4">
                      <button
                        onClick={handleBackToGenresList}
                        className="self-start px-3.5 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-xs font-semibold text-white flex items-center gap-1.5 transition-transform active:scale-95 border border-white/10"
                      >
                        <ArrowLeft className="w-4 h-4 text-cyan-400" />
                        <span>Назад ко всем жанрам</span>
                      </button>

                      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                        <div>
                          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                            {activeGenreDetail.name}
                          </h1>
                          <p className="text-sm text-zinc-200 mt-1 max-w-lg">
                            {activeGenreDetail.subTitle}
                          </p>
                        </div>

                        <span className="text-xs font-mono font-semibold px-3 py-1 bg-black/60 rounded-full text-cyan-300 self-start sm:self-auto border border-cyan-400/30">
                          {displayedStations.length} станций найдено
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Фильтры над списком: страна + другой жанр */}
                  <ListFilters
                    country={selectedCountry}
                    onCountry={setSelectedCountry}
                    query={searchQuery}
                    onQuery={setSearchQuery}
                    genreId={activeGenreDetail.id}
                    onGenre={(g) => (g ? handleSelectGenre(g) : (handleBackToGenresList(), setCurrentTab('popular')))}
                  />

                  {/* Stations in this genre */}
                  <StationGrid
                    stations={displayedStations}
                    currentStation={currentStation}
                    isPlaying={isPlaying}
                    isLoading={isLoadingStations}
                    isFavorite={isFavorite}
                    onPlayStation={playStation}
                    onToggleFavorite={toggleFavorite}
                    onResetFilters={handleResetFilters}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB: ARTISTS & BANDS (A-Z) & SOUNDTRACKS */}
          {currentTab === 'artists' && (
            <ArtistsView
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
              initialCategory={artistsCategory}
              onCategoryChange={setArtistsCategory}
            />
          )}

          {/* TAB: SEARCH */}
          {currentTab === 'search' && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Search className="w-6 h-6 text-cyan-400" />
                  <span>Поиск радиостанций</span>
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                  {searchQuery
                    ? `Результаты по запросу: "${searchQuery}"`
                    : 'Поиск по названию станции в мировом каталоге Radio Browser'}
                </p>
              </div>

              <StationGrid
                stations={displayedStations}
                currentStation={currentStation}
                isPlaying={isPlaying}
                isLoading={isLoadingStations}
                isFavorite={isFavorite}
                onPlayStation={playStation}
                onToggleFavorite={toggleFavorite}
                emptyTitle="Ничего не найдено"
                emptySubtitle="Попробуйте изменить поисковое слово или фильтр страны"
                onResetFilters={handleResetFilters}
              />
            </div>
          )}

          {/* TAB: FAVORITES */}
          {currentTab === 'favorites' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Heart className="w-6 h-6 text-theme-accent fill-theme-accent" />
                    <span>Избранные радиостанции</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                    Ваша персональная коллекция, сохранённая на этом устройстве
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
                  {favoritesCount} сохранено
                </span>
              </div>

              <StationGrid
                stations={displayedStations}
                currentStation={currentStation}
                isPlaying={isPlaying}
                isLoading={false}
                isFavorite={isFavorite}
                onPlayStation={playStation}
                onToggleFavorite={toggleFavorite}
                emptyTitle="В избранном пока пусто"
                emptySubtitle="Нажимайте на сердечко у любой радиостанции, чтобы добавить её в этот список"
                onResetFilters={handleResetFilters}
              />
            </div>
          )}

          {/* TAB: MOODS & ACTIVITIES */}
          {currentTab === 'moods' && (
            <MoodsView
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
              selectedCountry={selectedCountry}
            />
          )}

          {/* TAB: WEBCAMS (LIVE CAMS) */}
          {currentTab === 'webcams' && (
            <WebcamsView />
          )}

          {/* TAB: LIVE TV (WORLD TELEVISION) */}
          {currentTab === 'tv' && (
            <LiveTVView />
          )}

          {/* TAB: HISTORY & TRACKS */}
          {currentTab === 'history' && (
            <HistoryView
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
            />
          )}

          {/* TAB: PRO */}
          {currentTab === 'pro' && (
            <ProView
              isPro={settings.isPro}
              onTogglePro={togglePro}
              activeTheme={settings.activeTheme}
              onSelectTheme={setTheme}
            />
          )}

          {/* TAB: INFO & TELEGRAM */}
          {currentTab === 'apps' && <AppsView />}

          {currentTab === 'globe' && (
            <React.Suspense fallback={<div className="py-20 text-center text-zinc-400">Загружаем глобус…</div>}>
              {liteOn ? <LiteGeography /> : <GlobeView />}
            </React.Suspense>
          )}

          {currentTab === 'info' && (
            <InfoTelegramView
              telegramUrl={settings.telegramUrl}
              onOpenAdmin={isOwnerMode ? () => setIsAdminModalOpen(true) : undefined}
              onSuggestStation={() => setIsSupportOpen(true)}
            />
          )}
          {(currentTab === 'popular' || currentTab === 'info') && <PartnersBlock partners={settings.partners} />}

          <footer className="mt-12 pt-5 border-t border-zinc-900 text-[11px] text-zinc-500 flex flex-wrap gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} {settings.appTitle}</span>
            <a href="./privacy.html" className="hover:text-zinc-300 underline-offset-2 hover:underline">Политика конфиденциальности</a>
            <button onClick={() => setIsSupportOpen(true)} className="hover:text-zinc-300 underline-offset-2 hover:underline">Написать в поддержку</button>
            <span>Каталог станций: Radio Browser · laut.fm</span>
            <span>Эфиры принадлежат их правообладателям</span>
          </footer>
        </main>
      </div>

      {/* Fixed Bottom Player */}
      <BottomPlayer
        isFavorite={currentStation ? isFavorite(currentStation.stationuuid) : false}
        onToggleFavorite={() => {
          if (currentStation) toggleFavorite(currentStation);
        }}
      />

      {/* Full-Screen Now Playing Modal */}
      <FullScreenPlayer
        isFavorite={currentStation ? isFavorite(currentStation.stationuuid) : false}
        onToggleFavorite={() => {
          if (currentStation) toggleFavorite(currentStation);
        }}
      />

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        favoritesCount={favoritesCount}
      />

      {/* Car Mode HUD Modal */}
      {isCarModeOpen && (
        <CarModeModal
          onClose={() => setIsCarModeOpen(false)}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          isFavorite={isFavorite}
        />
      )}

      {/* Equalizer & Audio FX Modal */}
      {isEqualizerOpen && nativeEngine && (
        <EqualizerModal onClose={() => setIsEqualizerOpen(false)} />
      )}

      {/* Stream Recorder Modal */}
      {isRecorderOpen && (
        <RecorderModal onClose={() => setIsRecorderOpen(false)} />
      )}

      {/* Radio Alarm Clock Modal */}
      {isAlarmOpen && (
        <AlarmModal
          onClose={() => setIsAlarmOpen(false)}
          favorites={favorites}
        />
      )}

      {/* Sleep Timer Preset Selector Modal */}
      <SleepTimerModal
        isOpen={isSleepModalOpen}
        onClose={() => setIsSleepModalOpen(false)}
      />

      {/* Admin Panel Modal */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        onResetLogo={resetLogo}
        customStations={customStations}
        onAddCustomStation={addCustomStation}
        onDeleteCustomStation={deleteCustomStation}
      />

      {/* Suggest Station Modal */}
      <SuggestStationModal
        isOpen={isSuggestModalOpen}
        onClose={() => setIsSuggestModalOpen(false)}
        telegramUrl={settings.telegramUrl}
      />

      {/* Sync Profile Modal */}
      {isSyncModalOpen && (
        <SyncModal onClose={() => setIsSyncModalOpen(false)} />
      )}

      {isSupportOpen && (
        <SupportModal onClose={() => setIsSupportOpen(false)} telegramUrl={settings.telegramUrl} contactEmail={settings.contactEmail} />
      )}

      {/* About & Changelog Modal */}
      {isAboutModalOpen && (
        <AboutModal onClose={() => setIsAboutModalOpen(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <YAiSettingsProvider>
        <AudioProvider>
          <RadioApp />
        </AudioProvider>
      </YAiSettingsProvider>
    </ErrorBoundary>
  );
}
