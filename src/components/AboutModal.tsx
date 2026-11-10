import React from 'react';
import { YAiLogo } from './YAiLogo';
import { useYAiSettings } from '../context/YAiSettingsContext';
import {
  X,
  Sparkles,
  Send,
  Radio,
  Sliders,
  Disc,
  Video,
  CloudSun,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Heart,
  Globe,
  Award,
} from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  const { settings } = useYAiSettings();

  const versions = [
    {
      version: `${settings.appVersion} (Текущая)`,
      date: 'Октябрь 2026',
      isLatest: true,
      features: [
        '🎵 Честный RDS: название песни показывается, только если его реально передаёт станция. Иначе — «Прямой эфир • жанр • страна • битрейт»',
        '🔖 В «Распознанные треки» попадают только настоящие песни с исполнителем и названием',
        '📱 Полноэкранный плеер помещается в один экран на iPhone, Android и ПК + быстрый выбор страны, жанра, станции и исполнителя прямо из плеера',
        '🎤 Исполнители: только станции с именем артиста в названии — без подмены случайными станциями',
        '🔲 Переключатель вида: плитка или компактный список',
        '📲 Установка как приложение (iPhone/iPad — «На экран Домой», Android — «Установить»)',
        '🔁 Перенос избранного на другое устройство по QR-коду или ссылке, без регистрации',
        '🛡️ На защищённом сайте показываются только станции, которые браузер может воспроизвести (https)',
        '🌐 Логотип и контент сайта одинаковы для всех посетителей',
      ],
    },
    {
      version: 'v0.8.x',
      date: 'Октябрь 2026',
      isLatest: false,
      features: [
        'Первая версия, собранная в Google AI Studio: жанры, страны, настроения, избранное, эквалайзер, запись, будильник, таймер сна, веб-камеры и ТВ.',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="relative p-6 border-b border-zinc-800/80 bg-gradient-to-r from-cyan-950/40 via-zinc-950 to-violet-950/40 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <YAiLogo
                customLogoUrl={settings.customLogoUrl}
                size="md"
                allowUpload={false}
              />
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-violet-400 text-zinc-950 text-[9px] font-mono font-black rounded-full shadow">
                {settings.appVersion || 'v0.8.6'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">
                  {settings.appTitle || 'YAiPlay Radio'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  BETA EDITION
                </span>
              </div>
              <p className="text-xs text-violet-400 font-mono mt-0.5">
                Официальный медиа-хаб сообщества YAi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main Advantages */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-cyan-400" />
              <span>Преимущества платформы YAiPlay Radio</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-start gap-3">
                <Radio className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Десятки тысяч станций мира</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Каталог на базе Radio Browser с фильтрацией по 40+ странам и жанрам.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-start gap-3">
                <Video className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Live-камеры & 3D Глобус</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Круглосуточный видеопоток мировых столиц и курортов во время прослушивания.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-start gap-3">
                <Sliders className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Максимальное качество звука</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Всегда берём самый качественный поток станции, а при плохой связи — режим «Слабый интернет».
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-start gap-3">
                <CloudSun className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Живая погода & Время</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Определение погоды и местного времени прямо в студии радиовещания.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Version Changelog History */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>История версий и обновлений</span>
            </h3>
            <div className="space-y-4">
              {versions.map((ver, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border ${
                    ver.isLatest
                      ? 'bg-gradient-to-b from-cyan-950/20 to-zinc-900/80 border-cyan-500/30'
                      : 'bg-zinc-900/40 border-zinc-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{ver.version}</span>
                      {ver.isLatest && (
                        <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-violet-400/20 text-violet-300 rounded border border-violet-400/30">
                          НОВОЕ
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 font-mono">{ver.date}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {ver.features.map((feat, fIdx) => (
                      <li key={fIdx} className="text-xs text-zinc-300 flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Official Community Channels & Dynamic Links */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-cyan-500/20">
            <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
              <Send className="w-4 h-4 text-cyan-400" />
              <span>Официальные ссылки и контакты YAi</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {(settings.customLinks && settings.customLinks.length > 0
                ? settings.customLinks
                : [
                    { id: '1', title: 'Telegram Канал', url: settings.telegramUrl || 'https://t.me/YAiPlayer' },
                  ]
              ).map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-200 text-xs transition-colors border border-zinc-800"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Send className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="font-semibold truncate">{link.title}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
          <div className="text-[11px] text-zinc-500 font-mono">
            YAi Media Group © 2026. Made with <Heart className="w-3 h-3 inline text-cyan-500" /> for community
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
