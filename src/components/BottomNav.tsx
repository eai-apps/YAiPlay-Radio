import React, { useState } from 'react';
import { MainTab } from '../types/radio';
import { useYAiSettings } from '../context/YAiSettingsContext';
import { isSectionHidden } from '../utils/visibility';
import { isNativeApp } from '../utils/platform';
import { useLiteMode } from '../utils/liteMode';

export const LITE_URL = 'https://2g.yaiplay-radio.pages.dev/';
import { Flame, LayoutGrid, Sparkles, Search, Heart, Clock, Video, Mic2, Tv, Smartphone, Globe2, MoreHorizontal, X, Crown, Info } from 'lucide-react';

interface BottomNavProps {
  currentTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  favoritesCount: number;
}

/** Нижнее меню телефона: 5 крупных кнопок + «Ещё» со всеми остальными разделами */
export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab, favoritesCount }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [lite, setLite] = useLiteMode();
  const { settings } = useYAiSettings();
  const visible = (t: { id: string }) => !isSectionHidden(settings, t.id);

  const main = [
    { id: 'popular' as MainTab, label: 'Главная', icon: Flame },
    { id: 'genres' as MainTab, label: 'Жанры', icon: LayoutGrid },
    { id: 'artists' as MainTab, label: 'Артисты', icon: Mic2 },
    { id: 'favorites' as MainTab, label: 'Избранное', icon: Heart, badge: favoritesCount || undefined },
  ].filter(visible);
  const more = [
    { id: 'globe' as MainTab, label: 'Глобус', icon: Globe2 },
    { id: 'search' as MainTab, label: 'Поиск', icon: Search },
    { id: 'moods' as MainTab, label: 'Настроение', icon: Sparkles },
    { id: 'webcams' as MainTab, label: 'Веб-камеры', icon: Video },
    { id: 'tv' as MainTab, label: 'Телеканалы', icon: Tv },
    { id: 'history' as MainTab, label: 'История', icon: Clock },
    { id: 'pro' as MainTab, label: 'Оформление', icon: Crown },
    { id: 'apps' as MainTab, label: 'Приложения', icon: Smartphone },
    { id: 'info' as MainTab, label: 'О проекте', icon: Info },
  ].filter(visible);
  const moreActive = more.some((t) => t.id === currentTab);

  const go = (tab: MainTab) => {
    setMoreOpen(false);
    onSelectTab(tab);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm" onClick={() => setMoreOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 right-0 bottom-0 rounded-t-3xl bg-zinc-950 border-t border-zinc-800 p-4 pb-safe animate-fade-in"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-bold text-white">Все разделы</span>
              <button onClick={() => setMoreOpen(false)} aria-label="Закрыть" className="p-2 text-zinc-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={() => {
                  setMoreOpen(false);
                  window.dispatchEvent(new CustomEvent('yaiplayradio_open_sync'));
                }}
                className="py-3 rounded-2xl bg-violet-500/15 border border-violet-500/40 text-violet-200 text-sm font-bold"
              >
                👤 Вход и синхронизация
              </button>
              <button
                onClick={() => {
                  setMoreOpen(false);
                  window.dispatchEvent(new CustomEvent('yaiplayradio_open_support'));
                }}
                className="py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm font-bold"
              >
                ✉️ Поддержка
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {more.map((t) => {
                const Icon = t.icon;
                const active = currentTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => go(t.id)}
                    className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl border ${
                      active ? 'bg-violet-500/15 border-violet-500/40 text-violet-300' : 'bg-zinc-900 border-zinc-800 text-zinc-200'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-semibold">{t.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setLite(!lite)}
              aria-pressed={lite}
              className={`w-full flex items-center justify-between gap-2 py-3 px-4 mb-2 rounded-2xl border text-sm font-bold ${
                lite ? 'bg-violet-500/15 border-violet-500/40 text-violet-200' : 'bg-zinc-900 border-zinc-800 text-zinc-200'
              }`}
            >
              <span>🍃 Лёгкий режим</span>
              <span className="text-xs font-semibold opacity-80">{lite ? 'включён — без анимаций и картинок' : 'выключен'}</span>
            </button>
            {!isNativeApp && (
              <a
                href={LITE_URL}
                className="flex items-center justify-center gap-2 py-3 mb-1 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm font-bold"
              >
                📶 2G-версия для слабого интернета
              </a>
            )}
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/80 pb-safe">
        <div className="grid grid-cols-5 h-16 items-stretch">
          {[...main, { id: '__more' as MainTab, label: 'Ещё', icon: MoreHorizontal }].map((tab: any) => {
            const Icon = tab.icon;
            const isMore = tab.id === '__more';
            const isActive = isMore ? moreActive || moreOpen : currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => (isMore ? setMoreOpen((v) => !v) : go(tab.id))}
                className="relative flex flex-col items-center justify-center gap-1 touch-manipulation"
              >
                <span className="relative">
                  <Icon className={`w-6 h-6 ${isActive ? 'text-violet-400' : 'text-zinc-400'}`} />
                  {tab.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[16px] h-4 bg-cyan-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </span>
                <span className={`text-[11px] leading-none ${isActive ? 'text-violet-400 font-bold' : 'text-zinc-400 font-medium'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
