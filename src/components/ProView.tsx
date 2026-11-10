import React from 'react';
import { Crown, Check, Sparkles, Zap, ShieldCheck, Moon, Palette } from 'lucide-react';
import { THEMES } from '../constants/themes';
import { ThemeId } from '../types/radio';
import { YAiLogo } from './YAiLogo';

interface ProViewProps {
  isPro: boolean;
  onTogglePro: () => void;
  activeTheme: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
}

export const ProView: React.FC<ProViewProps> = ({
  isPro,
  onTogglePro,
  activeTheme,
  onSelectTheme,
}) => {
  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto py-4">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-10 border border-theme-subtle bg-gradient-to-br from-zinc-900 via-zinc-950 to-black shadow-2xl">
        {/* Ambient atmospheric glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-theme-subtle rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <YAiLogo
                size="lg"
                className="w-16 h-16 rounded-full border-2 border-amber-400/60 shadow-[0_0_25px_rgba(245,158,11,0.4)]"
              />
              <div className="absolute -bottom-1 -right-1 p-1 bg-gradient-to-tr from-amber-500 to-yellow-300 text-zinc-950 rounded-full shadow-md">
                <Crown className="w-3.5 h-3.5 fill-zinc-950" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  YAi PRO
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {isPro ? 'АКТИВЕН' : 'PREMIUM'}
                </span>
              </div>
              <p className="text-sm text-zinc-400 mt-1 max-w-lg">
                Сейчас все функции YAi Radio бесплатны. Здесь можно выбрать тему оформления. Платная версия с дополнительными возможностями появится позже.
              </p>
            </div>
          </div>

          <button
            onClick={onTogglePro}
            className={`px-6 py-3.5 rounded-2xl font-bold text-sm transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-2 shrink-0 ${
              isPro
                ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-zinc-950 hover:brightness-110 shadow-amber-500/30'
            }`}
          >
            {isPro ? (
              <>
                <Check className="w-5 h-5 text-violet-400" />
                <span>Бета-тестер PRO (выключить)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 fill-zinc-950" />
                <span>Стать бета-тестером PRO</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Perks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            icon: Zap,
            title: 'Фильтр по качеству звука',
            desc: 'Показывайте только станции 128+ или 256–320 kbps — фильтр в верхней панели.',
          },
          {
            icon: ShieldCheck,
            title: 'Абсолютно без рекламы',
            desc: 'Чистое прослушивание без навязчивых баннеров, всплывающих окон и пауз.',
          },
          {
            icon: Moon,
            title: 'Таймер сна',
            desc: 'Автовыключение радио через заданное время.',
          },
          {
            icon: Palette,
            title: '5 Эксклюзивных тем YAi',
            desc: 'Мгновенное переключение неоновых цветовых схем во всем приложении.',
          },
        ].map((perk, i) => {
          const Icon = perk.icon;
          return (
            <div
              key={i}
              className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-start gap-4"
            >
              <div className="p-2.5 rounded-xl bg-theme-subtle text-theme-accent shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">{perk.title}</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{perk.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Themes Selection (Exclusive PRO Feature) */}
      <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-theme-accent" />
              <span>Эксклюзивные темы оформления YAi</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isPro
                ? 'Выберите тему — цвета кнопок, эквалайзера и свечения обновятся мгновенно'
                : 'Активируйте PRO выше, чтобы разблокировать переключение тем'}
            </p>
          </div>
          {isPro && (
            <span className="text-xs font-mono text-violet-400 flex items-center gap-1 font-semibold">
              <Check className="w-4 h-4" /> Доступ открыт
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {THEMES.map((theme) => {
            const isSelected = activeTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => {
                  if (isPro) {
                    onSelectTheme(theme.id);
                  } else {
                    onTogglePro(); // Auto activate PRO on theme click
                    onSelectTheme(theme.id);
                  }
                }}
                className={`p-4 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between ${
                  isSelected
                    ? 'bg-zinc-800/90 border-theme-accent shadow-lg shadow-theme-glow ring-1 ring-theme-accent'
                    : 'bg-zinc-900/90 hover:bg-zinc-800/70 border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${theme.previewGradient} shadow-md shrink-0`}
                  />
                  <div>
                    <div className="text-sm font-bold text-white">{theme.name}</div>
                    <div className="text-[11px] text-zinc-400">{theme.badge}</div>
                  </div>
                </div>

                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-theme-accent flex items-center justify-center text-white shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <span className="text-xs text-zinc-500 font-medium">Выбрать</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
