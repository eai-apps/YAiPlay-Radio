import React, { useState } from 'react';
import { useLiteMode } from '../utils/liteMode';

/** Цвета «буквенной» обложки — стабильные для каждой станции */
const PALETTE = [
  ['#6041d8', '#0e7490'],
  ['#6366f1', '#0ea5e9'],
  ['#f43f5e', '#f97316'],
  ['#a855f7', '#ec4899'],
  ['#1fcfeb', '#6041d8'],
  ['#f59e0b', '#ef4444'],
  ['#06b6d4', '#3b82f6'],
  ['#14b8a6', '#65a30d'],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** «Русское Радио: Русский Рок» → «РР», «DFM - Party» → «DP» */
export function initials(name: string) {
  const words = (name || '?')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !/^(radio|радио|fm|the)$/i.test(w));
  const pick = words.length ? words : (name || '?').split(/\s+/);
  return (pick[0]?.[0] || '?').toUpperCase() + (pick[1]?.[0] || pick[0]?.[1] || '').toUpperCase();
}

/** Значок сайта станции (если в каталоге нет логотипа) — сервис значков Google по домену сайта */
export function siteIconUrl(homepage?: string): string {
  try {
    if (!homepage || !/^https?:\/\//.test(homepage)) return '';
    const host = new URL(homepage).hostname.replace(/^www\./, '');
    if (!host || /^(\d+\.){3}\d+$/.test(host) || host === 'localhost') return '';
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  } catch {
    return '';
  }
}

/**
 * Логотип станции: 1) логотип из каталога; 2) если его нет или он не грузится — значок сайта станции
 * (берём, только если он крупный: мелкий «глобус по умолчанию» не показываем); 3) цветной значок с буквами.
 */
export const StationLogo: React.FC<{ favicon?: string; homepage?: string; name: string; className?: string; textClass?: string }> = ({
  favicon,
  homepage,
  name,
  className = 'w-full h-full',
  textClass = 'text-sm',
}) => {
  // На https-странице http-картинки блокируются — пробуем https-версию
  const primary = favicon && /^https?:\/\//.test(favicon) ? favicon.replace(/^http:\/\//, 'https://') : '';
  const sources = [primary, siteIconUrl(homepage)].filter(Boolean);
  const [step, setStep] = useState(0);
  const [lite] = useLiteMode();
  const src = lite ? undefined : sources[step];

  if (src) {
    const isSiteIcon = src !== primary;
    return (
      <img
        key={src}
        src={src}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setStep((n) => n + 1)}
        onLoad={(e) => {
          // Сервис значков отдаёт маленький серый глобус, если у сайта нет иконки, — такой не нужен
          if (isSiteIcon && e.currentTarget.naturalWidth < 48) setStep((n) => n + 1);
        }}
        className={`${className} ${isSiteIcon ? 'object-contain bg-white p-[12%]' : 'object-cover'}`}
      />
    );
  }
  const [a, b] = PALETTE[hash(name || '') % PALETTE.length];
  return (
    <span
      className={`${className} flex items-center justify-center font-extrabold text-white select-none ${textClass}`}
      style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
};
