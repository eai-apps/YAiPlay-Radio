import React from 'react';
import {
  Send,
  Radio,
  ShieldCheck,
  Lock,
  MessageSquare,
  Globe,
  CheckCircle,
  ExternalLink,
  FileText,
  Mail,
  Sparkles,
  Share2,
} from 'lucide-react';
import { YAiLogo } from './YAiLogo';
import { useYAiSettings } from '../context/YAiSettingsContext';

interface InfoTelegramViewProps {
  telegramUrl: string;
  /** Только в режиме владельца (#admin) */
  onOpenAdmin?: () => void;
  onSuggestStation: () => void;
}

export const InfoTelegramView: React.FC<InfoTelegramViewProps> = ({
  telegramUrl,
  onOpenAdmin,
  onSuggestStation,
}) => {
  const { settings } = useYAiSettings();

  const links = settings.customLinks && settings.customLinks.length > 0
    ? settings.customLinks
    : [
        { id: '1', title: 'Telegram Канал', url: telegramUrl || 'https://t.me/YAiPlayer' },
        { id: '2', title: 'Чат / Поддержка', url: 'https://t.me/YAi_support' },
      ];

  const primaryLink = links[0] || {
    id: '1',
    title: 'Telegram Канал',
    url: telegramUrl || 'https://t.me/YAiPlayer',
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto py-4">
      {/* Community Hero Card */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-cyan-950/60 via-zinc-900 to-zinc-950 border border-cyan-800/40 shadow-2xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-600/10 rounded-full blur-[90px] pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <YAiLogo
                customLogoUrl={settings.customLogoUrl}
                size="lg"
                className="w-14 h-14 rounded-full border border-cyan-400/50 shadow-[0_0_25px_rgba(6,182,212,0.4)]"
              />
              <div className="absolute -bottom-1 -right-1 p-1 bg-cyan-500 text-zinc-950 rounded-full shadow-md font-bold">
                <Send className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                  {settings.appTitle || 'YAi Radio'} Community
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {settings.appVersion || 'v0.8.1'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-lg leading-relaxed">
                Присоединяйтесь к официальному сообществу YAi: эксклюзивные радиопотоки, обновления приложения и чат любителей хорошей музыки и веб-камер.
              </p>
            </div>
          </div>

          <a
            href={primaryLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 transition-transform active:scale-95 shrink-0"
          >
            <span>{primaryLink.title}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Dynamic Community & Social Links Grid */}
      <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Share2 className="w-4 h-4 text-cyan-400" />
            <span>Социальные сети и полезные ссылки</span>
          </h2>
          <span className="text-[11px] font-mono text-zinc-500">
            {links.length} {links.length === 1 ? 'ссылка' : 'ссылок'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/80 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-cyan-500/40 text-zinc-200 hover:text-white transition-all group shadow-sm"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 group-hover:scale-105 transition-all shrink-0">
                  <Send className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-white truncate">{link.title}</div>
                  <div className="text-[10px] font-mono text-zinc-500 truncate">{link.url}</div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400 shrink-0 ml-2 transition-colors" />
            </a>
          ))}
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Suggest station button */}
        <button
          onClick={onSuggestStation}
          className="p-5 rounded-2xl bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800/80 text-left transition-all flex items-start gap-4 group"
        >
          <div className="p-3 rounded-xl bg-theme-subtle text-theme-accent shrink-0 group-hover:scale-105 transition-transform">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-theme-accent transition-colors">
              Предложить радиостанцию / Написать разработчику
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Знаете крутую станцию или веб-камеру, которой нет в каталоге? Отправьте нам ссылку.
            </p>
          </div>
        </button>

        {/* Admin Panel Entry */}
        {onOpenAdmin && (
        <button
          onClick={onOpenAdmin}
          className="p-5 rounded-2xl bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800/80 text-left transition-all flex items-start gap-4 group"
        >
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                Админ-панель YAi
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Управление ссылками, редактирование Политики DMCA, добавление радиостанций и сканер потоков.
            </p>
          </div>
        </button>
        )}
      </div>

      {/* Database & Architecture info */}
      <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800/80">
        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-3">
          <Globe className="w-5 h-5 text-theme-accent" />
          <span>О глобальной базе YAi Radio & Live Cams</span>
        </h2>
        <div className="space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
          <p>
            YAi Radio агрегирует <strong>десятки тысяч живых радиостанций</strong> со всех уголков мира. Каталог синхронизируется через отказоустойчивую сеть серверов Radio Browser (зеркала в Германии, Австрии и Нидерландах) с автоматическим переключением при сбоях.
          </p>
          <p>
            Раздел «Веб-камеры мира» объединяет круглосуточные трансляции крупнейших городов Земли, курортов, горных пиков и МКС для одновременного просмотра и прослушивания музыки.
          </p>
        </div>
      </div>

      {/* Dynamic Privacy Policy & DMCA (100% from CMS settings) */}
      <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800/60">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold text-zinc-200">Политика конфиденциальности & DMCA Notice</h2>
        </div>

        <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line bg-zinc-950/70 p-4 rounded-2xl border border-zinc-800/80 font-sans">
          {settings.dmcaPolicy ||
            'YAi Radio является свободным программным интернет-тюнером и агрегатором публичных радиовещательных потоков и открытых веб-камер. Приложение не хранит, не ретранслирует и не изменяет аудио- и видеоматериалы на своих серверах. Все аудиопотоки воспроизводятся напрямую из открытой базы Radio Browser API.\n\nВсе персональные настройки (избранные станции, кастомный логотип, темы) сохраняются исключительно в локальном хранилище вашего браузера (localStorage).\n\nЕсли вы являетесь правообладателем или представителем вещателя и хотите обновить метаданные или удалить поток из каталога, направьте официальный запрос разработчикам YAi Radio через наш официальный Telegram-канал.'}
        </div>
      </div>
    </div>
  );
};
