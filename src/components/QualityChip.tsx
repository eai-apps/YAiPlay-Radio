import React, { useEffect, useState } from 'react';
import { getQualityMode, setQualityMode, QualityMode, QUALITY_EVENT } from '../services/streamQuality';

function useQuality(): [QualityMode, () => void] {
  const [mode, setMode] = useState<QualityMode>(getQualityMode);
  useEffect(() => {
    const h = () => setMode(getQualityMode());
    window.addEventListener(QUALITY_EVENT, h);
    return () => window.removeEventListener(QUALITY_EVENT, h);
  }, []);
  return [mode, () => setQualityMode(mode === 'weak' ? 'high' : 'weak')];
}

/** Маленький значок качества рядом с битрейтом */
export const QualityChip: React.FC<{ hasVariants: boolean }> = () => {
  const [mode, toggle] = useQuality();
  return (
    <button
      onClick={toggle}
      title={mode === 'weak' ? 'Режим для слабого интернета: лёгкий поток' : 'Максимальное качество'}
      className={`px-2.5 py-1.5 rounded-full text-xs font-bold border ${
        mode === 'weak' ? 'bg-amber-500/15 text-amber-200 border-amber-500/40' : 'bg-cyan-500/15 text-cyan-200 border-cyan-500/40'
      }`}
    >
      {mode === 'weak' ? '📶 Слабый' : '🎧 HQ'}
    </button>
  );
};

/** Переключатель «Слабый интернет» — в шапке сайта и в полноэкранном плеере */
export const WeakNetToggle: React.FC<{ size?: 'sm' | 'lg'; className?: string }> = ({ size = 'sm', className = '' }) => {
  const [mode, toggle] = useQuality();
  const on = mode === 'weak';
  const big = size === 'lg';
  return (
    <button
      onClick={toggle}
      aria-pressed={on}
      title={on ? 'Включён режим для слабого интернета — звук легче и не прерывается' : 'Максимальное качество звука. Нажмите, если интернет слабый (мобильная сеть, дорога)'}
      className={`flex items-center gap-2 rounded-xl border font-semibold shrink-0 transition-colors ${big ? 'px-4 py-2.5 text-sm' : 'px-3 py-2 text-xs'} ${
        on ? 'bg-amber-500/15 text-amber-200 border-amber-500/40' : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-zinc-800'
      } ${className}`}
    >
      <span>{on ? '📶' : '🎧'}</span>
      <span>{on ? 'Слабый интернет' : 'Высокое качество'}</span>
      <span className={`relative w-8 h-[18px] rounded-full ${on ? 'bg-amber-400' : 'bg-zinc-700'}`}>
        <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all ${on ? 'left-[16px]' : 'left-[2px]'}`} />
      </span>
    </button>
  );
};
