import React, { useEffect, useRef } from 'react';
import { useAudio } from '../context/AudioPlayerContext';
import { onSpectrum } from '../services/nativeAudio';
import { useLiteMode } from '../utils/liteMode';

/**
 * Визуализация музыки (столбики-спектр, отражение снизу, «пики»).
 *  — Android-приложение с нативным плеером: настоящий спектр звука (32 полосы ~30 раз в секунду);
 *  — сайт / iPhone: браузер не даёт анализировать чужой поток, поэтому плавная анимация «в такт эфиру»
 *    (честно: не настоящий спектр). На паузе столбики плавно опускаются.
 */
const BARS = 32;

const VisualizerInner: React.FC<{ className?: string; dense?: boolean }> = ({ className = '', dense = false }) => {
  const { isPlaying, nativeEngine } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const target = useRef<number[]>(new Array(BARS).fill(0));
  const playingRef = useRef(isPlaying);
  playingRef.current = isPlaying;

  // Настоящий спектр от нативного плеера
  useEffect(() => {
    if (!nativeEngine) return;
    return onSpectrum((b) => {
      if (b.length) target.current = b;
    });
  }, [nativeEngine]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const shown = new Array(BARS).fill(0);
    const peaks = new Array(BARS).fill(0);
    let raf = 0;
    const seeds = Array.from({ length: BARS }, (_, i) => 0.7 + ((i * 7919) % 97) / 160);

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(cv.clientWidth * dpr));
      const h = Math.max(1, Math.round(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== h) {
        cv.width = w;
        cv.height = h;
      }
      const playing = playingRef.current;
      let src = target.current;
      if (!nativeEngine) {
        // Анимация «в такт»: медленные волны + «удары» примерно 2 раза в секунду
        const beat = Math.pow(Math.max(0, Math.sin(t / 240)), 6);
        src = seeds.map((s, i) => {
          const x = i / BARS;
          const tilt = 1 - x * 0.55; // басы выше, верха ниже — как у настоящей музыки
          const wave = 0.35 + 0.25 * Math.sin(t / (520 * s) + i * 0.55) + 0.18 * Math.sin(t / (210 * s) + i * 1.7);
          return Math.max(0, Math.min(1, (wave + beat * 0.35 * (1 - x)) * tilt));
        });
      }
      for (let i = 0; i < BARS; i++) {
        const want = playing ? src[i] || 0 : 0;
        shown[i] = want > shown[i] ? shown[i] + (want - shown[i]) * 0.6 : shown[i] * 0.9 + want * 0.1;
        peaks[i] = Math.max(shown[i], peaks[i] - 0.008);
      }

      ctx.clearRect(0, 0, w, h);
      const gap = Math.max(1, Math.round((dense ? 2 : 4) * dpr));
      const bw = (w - gap * (BARS - 1)) / BARS;
      const base = h * 0.72; // ниже — отражение
      const grad = ctx.createLinearGradient(0, base, 0, 0);
      grad.addColorStop(0, '#6041d8');
      grad.addColorStop(0.55, '#1fcfeb');
      grad.addColorStop(1, '#22d3ee');
      for (let i = 0; i < BARS; i++) {
        const x = i * (bw + gap);
        const bh = Math.max(2 * dpr, shown[i] * base * 0.95);
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(52,211,153,0.55)';
        ctx.shadowBlur = 12 * dpr;
        roundRect(ctx, x, base - bh, bw, bh, Math.min(bw / 2, 6 * dpr));
        ctx.shadowBlur = 0;
        // пик
        ctx.fillStyle = 'rgba(236,252,203,0.9)';
        ctx.fillRect(x, base - peaks[i] * base * 0.95 - 3 * dpr, bw, 2 * dpr);
        // отражение
        ctx.fillStyle = 'rgba(96,65,216,0.16)';
        ctx.fillRect(x, base + 2 * dpr, bw, Math.min(h - base, bh * 0.35));
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [nativeEngine, dense]);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

/** В «Лёгком режиме» визуализации нет — холст и цикл анимации вообще не запускаются */
export const Visualizer: React.FC<{ className?: string; dense?: boolean }> = (props) => {
  const [lite] = useLiteMode();
  return lite ? null : <VisualizerInner {...props} />;
};
