import React from 'react';
import { GENRES } from '../constants/genres';
import { GenreCategory } from '../types/radio';
import {
  Flame,
  Sparkles,
  Guitar,
  Disc3,
  Disc,
  Zap,
  Coffee,
  Music2,
  Piano,
  Mic,
  Radio,
  CassetteTape,
  Moon,
  Activity,
  Layers,
  Heart,
  Sun,
  Film,
  Smile,
  Newspaper,
  LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Flame,
  Sparkles,
  Guitar,
  Disc3,
  Disc,
  Zap,
  Coffee,
  Music2,
  Piano,
  Mic,
  Radio,
  CassetteTape,
  Moon,
  Activity,
  Layers,
  Heart,
  Sun,
  Film,
  Smile,
  Newspaper,
};

interface GenreBarProps {
  selectedGenreId: string;
  onSelectGenre: (genre: GenreCategory) => void;
  layout?: 'grid' | 'carousel';
}

export const GenreBar: React.FC<GenreBarProps> = ({
  selectedGenreId,
  onSelectGenre,
  layout = 'grid',
}) => {
  return (
    <div
      className={
        layout === 'carousel'
          ? 'flex gap-3 overflow-x-auto pb-2 scrollbar-none'
          : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4'
      }
    >
      {GENRES.map((genre) => {
        const IconComponent = iconMap[genre.iconName] || Radio;
        const isSelected = selectedGenreId === genre.id;

        return (
          <button
            key={genre.id}
            onClick={() => onSelectGenre(genre)}
            className={`group relative overflow-hidden rounded-2xl p-4 sm:p-5 text-left transition-all duration-300 select-none border ${
              layout === 'carousel' ? 'shrink-0 w-44 sm:w-52' : 'w-full'
            } ${
              isSelected
                ? 'border-cyan-400 shadow-[0_0_25px_rgba(31,206,235,0.35)] scale-[1.02]'
                : 'border-cyan-500/20 hover:border-cyan-400/60 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(6,182,212,0.25)]'
            }`}
          >
            {/* Background Cyber Gradient with Glassmorphism */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${genre.gradient} opacity-85 group-hover:opacity-100 transition-opacity`}
            />

            {/* Dark glass overlay for contrast and depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

            {/* Watermark Icon in background */}
            <IconComponent
              className="absolute -bottom-2 -right-2 w-20 h-20 text-white/10 pointer-events-none transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
              aria-hidden="true"
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col justify-between h-24 sm:h-28">
              <div className="w-9 h-9 rounded-xl bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center text-white shadow-sm group-hover:border-cyan-400/40 transition-colors">
                <IconComponent className="w-5 h-5 text-cyan-300" />
              </div>

              <div>
                <h3 className="font-bold text-white text-base sm:text-lg leading-tight drop-shadow-sm">
                  {genre.name}
                </h3>
                <p className="text-xs text-zinc-300 line-clamp-1 mt-0.5 font-medium">
                  {genre.subTitle}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
