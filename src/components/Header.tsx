import { liveFallbackLabel } from '../services/rdsService';
import { getMyCountry } from '../services/geoService';
import { useViewMode } from '../hooks/useViewMode';
import { isSectionHidden } from '../utils/visibility';
import React, { useState, useRef } from 'react';
import { WeakNetToggle } from './QualityChip';
import {
  Search,
  X,
  RefreshCw,
  Settings,
  Share2,
  Sparkles,
  Radio,
  Volume2,
  Mic,
  MicOff,
  Mic2,
  Film,
} from 'lucide-react';
import { CountrySelect } from './CountrySelect';
import { BitrateFilter, Language, MainTab } from '../types/radio';
import { TRANSLATIONS } from '../i18n/translations';
import { useYAiSettings } from '../context/YAiSettingsContext';
import { useAudio } from '../context/AudioPlayerContext';
import { YAiLogo } from './YAiLogo';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCountry: string;
  onSelectCountry: (countryCode: string) => void;
  bitrateFilter: BitrateFilter;
  onSelectBitrate: (bitrate: BitrateFilter) => void;
  onRefresh: () => void;
  isLoading: boolean;
  language: Language;
  onSelectLanguage: (lang: Language) => void;
  /** Только в режиме владельца (#admin) */
  onOpenAdmin?: () => void;
  onOpenSync: () => void;
  onOpenAbout: () => void;
  currentTab?: MainTab;
  onSelectTab?: (tab: MainTab) => void;
  artistsCategory?: 'all' | 'cis' | 'world' | 'ost';
  onSelectArtistsCategory?: (cat: 'all' | 'cis' | 'world' | 'ost') => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  selectedCountry,
  onSelectCountry,
  bitrateFilter,
  onSelectBitrate,
  onRefresh,
  isLoading,
  language,
  onSelectLanguage,
  onOpenAdmin,
  onOpenSync,
  onOpenAbout,
  currentTab = 'popular',
  onSelectTab,
  artistsCategory = 'all',
  onSelectArtistsCategory,
}) => {
  const { settings } = useYAiSettings();
  const { mode: viewMode, setMode: setViewMode } = useViewMode();
  const { currentStation, currentTrackTitle, isPlaying } = useAudio();
  const t = TRANSLATIONS[language] || TRANSLATIONS.ru;
  const appVersion = settings.appVersion || 'v0.8.6';

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleVoiceSearch = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Голосовой ввод не поддерживается вашим браузером. Попробуйте Google Chrome, Edge или Яндекс Браузер.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = language === 'ru' ? 'ru-RU' : language === 'de' ? 'de-DE' : 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListening(true);

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          onSearchChange(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (e: any) => {
        console.warn('Voice recognition error:', e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-900/80 px-3 sm:px-6 py-2.5">
      <div className="flex flex-col gap-2 max-w-7xl mx-auto">
        {/* Top Header Row: WIDE Search Bar & Quick Actions on Desktop */}
        <div className="flex items-center justify-between gap-3">
          {/* WIDE Search Bar with Voice Input & Clear Button */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="🔍 Поиск радиостанции по названию, городу или жанру..."
              className="w-full bg-zinc-900/90 hover:bg-zinc-900 focus:bg-zinc-900 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 pl-10 pr-20 py-2.5 rounded-2xl border border-zinc-800 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 focus:outline-none transition-all shadow-inner"
            />

            {/* Action buttons inside the right side of the search input */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {/* Voice Search Button (Web Speech API) */}
              <button
                type="button"
                onClick={toggleVoiceSearch}
                title={isListening ? 'Идет прослушивание...' : 'Голосовой поиск (Web Speech API)'}
                className={`p-1.5 rounded-xl transition-all ${
                  isListening
                    ? 'bg-cyan-500 text-white animate-pulse shadow-md shadow-cyan-500/30'
                    : 'text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800'
                }`}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              {/* Clear button */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  title="Очистить поиск"
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Access Actions (Language, Version, Admin, Sync) - Desktop */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {/* Language Switcher RU | EN | DE */}
            <div className="flex items-center p-0.5 bg-zinc-900/90 border border-zinc-800 rounded-xl shrink-0">
              {(['ru', 'en', 'de'] as Language[]).map((lng) => {
                const isActive = language === lng;
                return (
                  <button
                    key={lng}
                    onClick={() => onSelectLanguage(lng)}
                    className={`px-2 py-1 text-[11px] font-mono font-bold rounded-lg uppercase transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500 to-violet-400 text-zinc-950 shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {lng}
                  </button>
                );
              })}
            </div>

            {/* Version Badge (Clickable -> AboutModal) */}
            <button
              onClick={onOpenAbout}
              title={t.navAbout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-mono font-bold text-violet-400 hover:text-violet-300 transition-colors shrink-0"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>{appVersion}</span>
            </button>

            {/* Profile / Sync Modal Button */}
            <button
              onClick={onOpenSync}
              title={t.navSync}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition-colors shrink-0"
            >
              <Share2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Вход</span>
            </button>

            {/* Admin button — owner mode only */}
            {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              title="Панель администратора"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-800 hover:from-zinc-800 hover:to-zinc-700 border border-violet-500/30 text-xs font-semibold text-violet-300 hover:text-white transition-all shrink-0 shadow-sm"
            >
              <Settings className="w-3.5 h-3.5 text-violet-400 animate-spin-slow" />
              <span>{t.navAdmin}</span>
            </button>
            )}
          </div>
        </div>

        {/* Matrix LED Running Marquee Ticker */}
        <div className={`relative overflow-hidden bg-black/90 border border-violet-500/30 rounded-xl px-2.5 py-1 ${currentStation ? 'flex' : 'hidden md:flex'} items-center gap-2 shadow-[inset_0_0_12px_rgba(96,65,216,0.15)]`}>
          <div className="flex items-center gap-1.5 shrink-0 px-1.5 py-0.5 rounded bg-violet-950/80 border border-violet-500/40 text-violet-400 font-mono text-[10px] font-bold uppercase tracking-wider">
            <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-violet-400 animate-ping' : 'bg-zinc-500'}`} />
            <span>LIVE:</span>
          </div>

          <div className="flex-1 overflow-hidden whitespace-nowrap">
            <div className="animate-matrix-ticker font-mono text-[11px] text-cyan-400 font-medium tracking-wide">
              {currentStation
                ? `♫ ${currentStation.name.toUpperCase()} » ${(currentTrackTitle || liveFallbackLabel(currentStation)).toUpperCase()} •`
                : `♫ YAi Radio ${appVersion} • РАДИО СО ВСЕГО МИРА • ЖАНРЫ, СТРАНЫ И НАСТРОЕНИЯ • БЕЗ РЕКЛАМЫ •`}
            </div>
          </div>

          {isPlaying && (
            <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-cyan-400 shrink-0">
              <Volume2 className="w-3 h-3 animate-pulse" />
              <span>320K</span>
            </div>
          )}
        </div>

        {/* Filters Group Row (Hidden on Webcams, TV, Info tabs to keep clear view) */}
        {!(currentTab === 'webcams' || currentTab === 'tv' || currentTab === 'info' || currentTab === 'apps' || currentTab === 'globe') && (
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 scrollbar-none animate-fade-in">
            <div className="flex items-center gap-2">
              {/* Country Selector with reliable modal */}
              <CountrySelect
                selectedCountry={selectedCountry}
                onSelectCountry={(code) => {
                  if (currentTab === 'artists') {
                    onSelectTab && onSelectTab('popular');
                  }
                  onSelectCountry(code);
                }}
                placeholder={t.searchCountry}
              />

              {/* Быстрый фильтр «моя страна» */}
              <button
                type="button"
                onClick={async () => {
                  const cc = await getMyCountry();
                  if (cc) {
                    if (currentTab === 'artists') onSelectTab && onSelectTab('popular');
                    onSelectCountry(selectedCountry === cc ? '' : cc);
                  }
                }}
                title="Показать станции моей страны"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border shrink-0 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-zinc-800 hover:border-cyan-400/40"
              >
                📍 <span>Моя страна</span>
              </button>

              {/* Вид станций: плитка / список — для всего сайта */}
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                title="Как показывать станции"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border shrink-0 ${viewMode === 'list' ? 'bg-violet-500/15 text-violet-200 border-violet-500/40' : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-zinc-800'}`}
              >
                {viewMode === 'list' ? '☰ Список' : '▦ Плитка'}
              </button>

              {/* Качество звука: максимальное или режим для слабого интернета */}
              <WeakNetToggle />

              {/* Глобус как radio.garden */}
              {!isSectionHidden(settings, 'globe') && (
                <button
                  type="button"
                  onClick={() => onSelectTab && onSelectTab('globe')}
                  title="Показать станции на глобусе"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border shrink-0 bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-violet-100 border-violet-500/40"
                >
                  🌍 <span>Глобус</span>
                </button>
              )}

              {/* Artists & Groups Selector Button */}
              {(() => {
                if (isSectionHidden(settings, 'artists')) return null;
                const isArtistsActive = currentTab === 'artists' && (!artistsCategory || artistsCategory !== 'ost');
                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (isArtistsActive) {
                        onSelectTab && onSelectTab('popular');
                      } else {
                        onSelectArtistsCategory && onSelectArtistsCategory('all');
                        onSelectTab && onSelectTab('artists');
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border shrink-0 ${
                      isArtistsActive
                        ? 'bg-gradient-to-r from-cyan-500 to-violet-400 text-zinc-950 border-cyan-400 font-bold shadow-sm'
                        : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-zinc-800 hover:border-cyan-400/40'
                    }`}
                    title={isArtistsActive ? 'Выключить и вернуться к радиостанциям' : 'Каталог дискографий групп и исполнителей 24/7'}
                  >
                    <Mic2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>🎤 Исполнители (A–Z)</span>
                  </button>
                );
              })()}

              {/* Soundtracks OST Selector Button */}
              {(() => {
                if (isSectionHidden(settings, 'artists')) return null;
                const isOstActive = currentTab === 'artists' && artistsCategory === 'ost';
                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (isOstActive) {
                        onSelectTab && onSelectTab('popular');
                      } else {
                        onSelectArtistsCategory && onSelectArtistsCategory('ost');
                        onSelectTab && onSelectTab('artists');
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border shrink-0 ${
                      isOstActive
                        ? 'bg-gradient-to-r from-violet-500 to-cyan-400 text-zinc-950 border-violet-400 font-bold shadow-sm'
                        : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-zinc-800 hover:border-violet-400/40'
                    }`}
                    title={isOstActive ? 'Выключить и вернуться к радиостанциям' : 'Культовые саундтреки из кино, игр и аниме 24/7'}
                  >
                    <Film className="w-3.5 h-3.5 text-violet-400" />
                    <span>🎬 Саундтреки</span>
                  </button>
                );
              })()}

              {/* Bitrate Filter Segmented Control */}
              <div className="flex items-center p-0.5 bg-zinc-900/90 border border-zinc-800 rounded-xl shrink-0">
                {(
                  [
                    { id: 'all' as BitrateFilter, label: t.allBitrates },
                    { id: '128' as BitrateFilter, label: '128+' },
                    { id: '320' as BitrateFilter, label: '320 kbps' },
                  ] as const
                ).map((opt) => {
                  const isActive = bitrateFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => onSelectBitrate(opt.id)}
                      className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500 to-violet-400 text-zinc-950 font-bold shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Refresh stations button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              aria-label={t.refreshTooltip}
              title={t.refreshTooltip}
              className="p-1.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
