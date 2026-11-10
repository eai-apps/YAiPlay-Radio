import { FEATURES, isNativeApp } from '../utils/platform';
import { LITE_URL } from './BottomNav';
import { useLiteMode } from '../utils/liteMode';
import React from 'react';
import { MainTab, YAiSettings, Language } from '../types/radio';
import {
  Flame,
  LayoutGrid,
  Search,
  Heart,
  Moon,
  Clock,
  Sparkles,
  Crown,
  Send,
  Radio,
  Car,
  Sliders,
  Disc,
  Bell,
  Compass,
  Video,
  Share2,
  Settings,
  Info,
  Mic2,
  Tv,
  Smartphone,
  Globe2,
} from 'lucide-react';
import { useAudio } from '../context/AudioPlayerContext';
import { YAiLogo } from './YAiLogo';
import { TRANSLATIONS } from '../i18n/translations';
import { isSectionHidden } from '../utils/visibility';

interface SidebarProps {
  currentTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  selectedGenreId: string;
  onSelectGenre: (genreId: string) => void;
  favoritesCount: number;
  onOpenSleepTimer: () => void;
  settings: YAiSettings;
  onUploadLogo?: (base64: string) => void;
  /** Только в режиме владельца (#admin) */
  onOpenAdmin?: () => void;
  onOpenSync: () => void;
  onOpenAbout: () => void;
  onSelectLanguage: (lang: Language) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  favoritesCount,
  onOpenSleepTimer,
  settings,
  onUploadLogo,
  onOpenAdmin,
  onOpenSync,
  onOpenAbout,
  onSelectLanguage,
}) => {
  const {
    sleepTimerRemainingSec,
    setIsCarModeOpen,
    setIsEqualizerOpen,
    nativeEngine,
    setIsRecorderOpen,
    setIsAlarmOpen,
    isRecording,
  } = useAudio();
  const [lite, setLite] = useLiteMode();

  const lang = settings.language || 'ru';
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ru;

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const navItems = [
    { id: 'popular' as MainTab, label: t.navPopular, icon: Flame },
    { id: 'artists' as MainTab, label: 'Группы (A–Z)', icon: Mic2, badgeText: '24/7' },
    { id: 'genres' as MainTab, label: t.navGenres, icon: LayoutGrid },
    { id: 'globe' as MainTab, label: 'Глобус радио', icon: Globe2, badgeText: '3D' },
    { id: 'moods' as MainTab, label: t.navMoods, icon: Sparkles, badgeText: 'NEW' },
    { id: 'webcams' as MainTab, label: t.navWebcams, icon: Video, badgeText: 'LIVE' },
    { id: 'tv' as MainTab, label: 'Телеканалы мира (TV)', icon: Tv, badgeText: 'LIVE' },
    { id: 'search' as MainTab, label: t.navSearch, icon: Search },
    {
      id: 'favorites' as MainTab,
      label: t.navFavorites,
      icon: Heart,
      badge: favoritesCount > 0 ? favoritesCount : undefined,
    },
    { id: 'history' as MainTab, label: t.navHistory, icon: Clock },
    {
      id: 'pro' as MainTab,
      label: t.navPro,
      icon: Crown,
      isProBadge: true,
    },
    { id: 'apps' as MainTab, label: 'Mobile Apps', icon: Smartphone, badgeText: 'APK' },
    {
      id: 'info' as MainTab,
      label: t.navInfo,
      icon: Info,
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 h-screen sticky top-0 bg-zinc-950 border-r border-zinc-900/80 px-4 py-4 shrink-0 z-20 overflow-y-auto custom-scrollbar">
      {/* Brand Wordmark & Static Logo (Spinning is reserved for active player only) */}
      <div className="flex items-center gap-3 px-2 mb-3">
        <div className="relative shrink-0">
          <YAiLogo
            customLogoUrl={settings.customLogoUrl}
            size="lg"
            allowUpload={false}
            isSpinning={false}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-extrabold tracking-tight text-white truncate block">
              {settings.appTitle || 'YAi Radio'}
            </span>
          </div>
          <span className="text-[11px] font-medium text-violet-400 font-mono truncate block">
            {settings.appSubtitle}
          </span>
        </div>
      </div>

      {/* Language Quick Switcher */}
      <div className="flex items-center justify-between px-2 py-1.5 mb-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Язык / Lang:</span>
        <div className="flex items-center gap-1">
          {(['ru', 'en', 'de'] as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => onSelectLanguage(l)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-colors ${
                lang === l
                  ? 'bg-gradient-to-r from-cyan-500 to-violet-400 text-zinc-950 font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Main Navigation Items */}
      <nav className="flex flex-col gap-1 mb-3">
        {navItems.filter((item) => !isSectionHidden(settings, item.id)).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center justify-between px-3.5 py-2 rounded-2xl font-medium text-xs sm:text-sm transition-all text-left ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500 via-violet-500 to-cyan-400 text-zinc-950 font-bold shadow-md shadow-violet-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-zinc-950 stroke-[2.5]'
                      : item.id === 'pro'
                      ? 'text-amber-400'
                      : item.id === 'moods'
                      ? 'text-cyan-400'
                      : item.id === 'webcams'
                      ? 'text-cyan-400'
                      : 'text-zinc-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                    isActive ? 'bg-black/30 text-zinc-950 font-extrabold' : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {item.badgeText && !isActive && (
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    item.badgeText === 'LIVE'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse'
                      : 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30'
                  }`}
                >
                  {item.badgeText}
                </span>
              )}

              {item.isProBadge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    isActive
                      ? 'bg-black/20 text-zinc-950 font-extrabold'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {settings.isPro ? 'PRO' : 'VIP'}
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={() => setLite(!lite)}
          aria-pressed={lite}
          title="Без анимаций, размытия и картинок — для слабого компьютера и медленного интернета"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors text-left"
        >
          <span className="w-5 text-center">🍃</span>
          <span className="flex-1">Лёгкий режим</span>
          <span className={`text-[10px] font-bold ${lite ? 'text-violet-400' : 'text-zinc-600'}`}>{lite ? 'ВКЛ' : 'ВЫКЛ'}</span>
        </button>
        {!isNativeApp && (
          <a href={LITE_URL} title="Лёгкая версия: без анимации и картинок, для медленного интернета" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors">
            <span className="w-5 text-center">📶</span>
            <span>2G-версия для слабого интернета</span>
          </a>
        )}
      </nav>

      {/* QUICK LAUNCH TOOLS HUB (Car Mode, EQ, REC, Alarm) */}
      <div className="p-2.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 mb-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1 mb-2 flex items-center justify-between">
          <span>{t.studioAndTools}</span>
          <span className="text-[9px] font-mono text-violet-400">PRO TOOLS</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => setIsCarModeOpen(true)}
            title="Автомобильный режим «За рулем»"
            className="p-2 rounded-xl bg-zinc-950/80 hover:bg-zinc-800 hover:text-white text-zinc-400 flex flex-col items-center gap-1 transition-colors"
          >
            <Car className="w-4 h-4 text-cyan-400" />
            <span className="text-[9px] font-medium">{t.carMode}</span>
          </button>

          {nativeEngine && (
          <button
            onClick={() => setIsEqualizerOpen(true)}
            title="Эквалайзер YAi"
            className="p-2 rounded-xl bg-zinc-950/80 hover:bg-zinc-800 hover:text-white text-zinc-400 flex flex-col items-center gap-1 transition-colors"
          >
            <Sliders className="w-4 h-4 text-violet-400" />
            <span className="text-[9px] font-medium">{t.equalizer}</span>
          </button>
          )}

          {FEATURES.recorder && (
          <button
            onClick={() => setIsRecorderOpen(true)}
            title="Запись прямого эфира"
            className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-colors ${
              isRecording
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 animate-pulse'
                : 'bg-zinc-950/80 hover:bg-zinc-800 hover:text-white border-transparent text-zinc-400'
            }`}
          >
            <Disc className="w-4 h-4 text-cyan-400" />
            <span className="text-[9px] font-medium">{isRecording ? t.recordingActive : t.recorder}</span>
          </button>
          )}

          <button
            onClick={() => setIsAlarmOpen(true)}
            title="Радио-будильник"
            className="p-2 rounded-xl bg-zinc-950/80 hover:bg-zinc-800 hover:text-white text-zinc-400 flex flex-col items-center gap-1 transition-colors"
          >
            <Bell className="w-4 h-4 text-cyan-400" />
            <span className="text-[9px] font-medium">{t.alarmClock}</span>
          </button>
        </div>
      </div>

      {/* Sleep Timer Card */}
      <div className="px-0.5 mb-3">
        <button
          onClick={onOpenSleepTimer}
          className={`w-full p-2.5 rounded-2xl border transition-all text-left flex items-center justify-between ${
            sleepTimerRemainingSec !== null
              ? 'bg-violet-500/20 border-violet-500/40 text-white'
              : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-800/80 text-zinc-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {sleepTimerRemainingSec !== null ? (
              <Clock className="w-4 h-4 text-violet-400 animate-pulse" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-400" />
            )}
            <div>
              <div className="text-xs font-semibold text-zinc-200">
                {sleepTimerRemainingSec !== null ? t.sleepTimerActive : t.sleepTimer}
              </div>
              <div className="text-[10px] text-zinc-400 font-mono tabular-nums">
                {sleepTimerRemainingSec !== null
                  ? `${t.sleepTimerRemaining}: ${formatRemaining(sleepTimerRemainingSec)}`
                  : t.sleepTimerDesc}
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* PERMANENT SIDEBAR ACTIONS: ADMIN & SYNC & ABOUT */}
      <div className="pt-2 border-t border-zinc-800/80 space-y-1.5 mt-auto">
        {/* Sync Profile */}
        <button
          onClick={onOpenSync}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Share2 className="w-4 h-4 text-cyan-400" />
            <span>{t.navSync}</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">SLY-SYNC</span>
        </button>

        {/* Admin Panel — owner mode only */}
        {onOpenAdmin && (
        <button
          onClick={onOpenAdmin}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-violet-300 hover:text-white bg-zinc-900/60 hover:bg-zinc-900 border border-violet-500/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-violet-400" />
            <span>⚙️ {t.navAdmin}</span>
          </div>
          <span className="text-[10px] font-mono text-violet-400">OWNER</span>
        </button>
        )}

        {/* About & Version v0.8 Beta */}
        <button
          onClick={onOpenAbout}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[11px] font-mono text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-zinc-500" />
            <span>{t.navAbout}</span>
          </div>
          <span className="text-violet-400 font-bold">{settings.appVersion || t.version}</span>
        </button>
      </div>
    </aside>
  );
};
