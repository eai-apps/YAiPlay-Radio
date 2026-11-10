import React, { useState } from 'react';
import { Play, Pause, Shuffle, TrendingUp, MapPin, Loader2, Flame, ListMusic } from 'lucide-react';
import { openPlaylist } from './MyPlaylist';
import { openRecord } from './RecordSpotlight';
import { useFavorites } from '../hooks/useFavorites';
import { Station } from '../types/radio';
import { YAiLogo } from './YAiLogo';
import { getCountryFlag, COUNTRIES } from '../constants/countries';

interface Props {
  title: string;
  featured: Station | null;
  currentStation: Station | null;
  isPlaying: boolean;
  isLoading: boolean;
  userCountry: string;
  onPlayMain: () => void;
  onTogglePlay: () => void;
  onOpenPlayer: () => void;
  onRandom: () => Promise<void>;
  onTrending: () => Promise<void>;
  onMyCountry: () => void;
}

/** Главная на телефоне: одна большая кнопка «Слушать» и три быстрых действия */
export const MobileHome: React.FC<Props> = ({
  title,
  featured,
  currentStation,
  isPlaying,
  isLoading,
  userCountry,
  onPlayMain,
  onTogglePlay,
  onOpenPlayer,
  onRandom,
  onTrending,
  onMyCountry,
}) => {
  const [busy, setBusy] = useState<'random' | 'trend' | null>(null);
  const { favoritesCount } = useFavorites();
  const playing = !!currentStation && isPlaying;
  const countryName = COUNTRIES.find((c) => c.code === userCountry)?.name;

  const run = async (kind: 'random' | 'trend', fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="md:hidden flex flex-col items-center text-center pt-2 pb-4">
      {/* Большая кнопка */}
      <div className="relative my-3">
        {playing && <span className="absolute inset-0 rounded-full bg-violet-400/30 animate-ping" />}
        <button
          onClick={currentStation ? onTogglePlay : onPlayMain}
          aria-label={playing ? 'Пауза' : 'Слушать'}
          className="relative w-44 h-44 rounded-full active:scale-95 transition-transform"
        >
          {/* Логотип YAi: крутится, пока играет радио */}
          <YAiLogo size="2xl" isSpinning={playing} className="!w-44 !h-44 shadow-[0_0_60px_rgba(96,65,216,0.45)]" />
          <span className="absolute -bottom-1 -right-1 w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 via-violet-500 to-cyan-400 text-zinc-950 flex items-center justify-center border-4 border-zinc-950 shadow-lg">
            {isLoading ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : playing ? (
              <Pause className="w-7 h-7 fill-zinc-950" />
            ) : (
              <Play className="w-7 h-7 fill-zinc-950 ml-1" />
            )}
          </span>
        </button>
      </div>

      <button onClick={currentStation ? onOpenPlayer : onPlayMain} className="max-w-full px-4">
        <div className="text-xl font-extrabold text-white truncate">
          {currentStation ? currentStation.name : featured ? featured.name : `Слушать ${title}`}
        </div>
        <div className="text-xs text-zinc-400 mt-1">
          {currentStation ? (playing ? 'В эфире — нажмите, чтобы открыть плеер' : 'На паузе') : 'Нажмите — и радио заиграет'}
        </div>
      </button>

      {/* Быстрые действия */}
      <div className="grid grid-cols-3 gap-2 w-full mt-5">
        <button
          onClick={() => run('random', onRandom)}
          className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 active:scale-95"
        >
          {busy === 'random' ? <Loader2 className="w-6 h-6 animate-spin text-cyan-400" /> : <Shuffle className="w-6 h-6 text-cyan-400" />}
          <span className="text-xs font-semibold text-zinc-200">Мне повезёт</span>
        </button>
        <button
          onClick={() => run('trend', onTrending)}
          className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 active:scale-95"
        >
          {busy === 'trend' ? <Loader2 className="w-6 h-6 animate-spin text-cyan-400" /> : <TrendingUp className="w-6 h-6 text-cyan-400" />}
          <span className="text-xs font-semibold text-zinc-200">В тренде</span>
        </button>
        <button onClick={onMyCountry} className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 active:scale-95">
          <MapPin className="w-6 h-6 text-cyan-400" />
          <span className="text-xs font-semibold text-zinc-200 truncate max-w-full px-1">Моя страна</span>
        </button>
      </div>

      {/* Эксклюзив и свой плейлист — крупно */}
      <div className="grid grid-cols-2 gap-2 w-full mt-2">
        <button
          onClick={openRecord}
          className="relative overflow-hidden flex items-center gap-2.5 p-3 rounded-2xl text-left bg-gradient-to-br from-orange-500 to-cyan-600 active:scale-95 shadow-lg shadow-orange-500/20"
        >
          <Flame className="w-7 h-7 text-white shrink-0" />
          <span className="min-w-0">
            <span className="block text-sm font-extrabold text-white leading-tight">Radio Record</span>
            <span className="block text-[10px] font-bold text-orange-100 uppercase tracking-wide">Эксклюзив YAi</span>
          </span>
        </button>
        <button
          onClick={openPlaylist}
          className="relative flex items-center gap-2.5 p-3 rounded-2xl text-left bg-gradient-to-br from-violet-500 to-cyan-600 active:scale-95 shadow-lg shadow-violet-500/20"
        >
          <ListMusic className="w-7 h-7 text-zinc-950 shrink-0" />
          <span className="min-w-0">
            <span className="block text-sm font-extrabold text-zinc-950 leading-tight">Мои плейлисты</span>
            <span className="block text-[10px] font-bold text-zinc-900/80 uppercase tracking-wide">{favoritesCount ? `${favoritesCount} станций` : 'Собрать свой'}</span>
          </span>
        </button>
      </div>

      <div className="flex items-center gap-2 mt-5 text-[11px] text-zinc-500">
        <YAiLogo size="xs" className="w-4 h-4" isSpinning={false} /> Бесплатно · без рекламы · без регистрации
      </div>
    </section>
  );
};
