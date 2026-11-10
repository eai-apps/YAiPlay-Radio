/**
 * Картинка для экрана блокировки iPhone/iPad, «Пункта управления» и часов (Media Session).
 * Если известна песня — обложка альбома из iTunes (600×600).
 * Иначе — фирменная карточка YAi 512×512: логотип станции (или её инициалы), название, «LIVE».
 * Карточка рисуется прямо на устройстве и запоминается для каждой станции.
 */
import { Station } from '../types/radio';
import { initials } from '../components/StationLogo';

const cache = new Map<string, string>();

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
const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

function loadImage(src: string, cors: boolean): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    const t = setTimeout(() => res(null), 4000);
    img.onload = () => {
      clearTimeout(t);
      res(img.naturalWidth >= 48 ? img : null);
    };
    img.onerror = () => {
      clearTimeout(t);
      res(null);
    };
    img.src = src;
  });
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Перенос названия на 1–2 строки с уменьшением шрифта */
function fitName(ctx: CanvasRenderingContext2D, text: string, maxW: number): { lines: string[]; size: number } {
  for (const size of [46, 40, 34, 30]) {
    ctx.font = `800 ${size}px 'Manrope Variable', system-ui, -apple-system, sans-serif`;
    if (ctx.measureText(text).width <= maxW) return { lines: [text], size };
    const words = text.split(/\s+/);
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      if (ctx.measureText(a).width <= maxW && ctx.measureText(b).width <= maxW) return { lines: [a, b], size };
    }
  }
  ctx.font = `800 30px 'Manrope Variable', system-ui, sans-serif`;
  let t = text;
  while (t.length > 3 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return { lines: [t + '…'], size: 30 };
}

export async function stationCard(st: Station): Promise<string> {
  const key = st.stationuuid;
  if (cache.has(key)) return cache.get(key)!;
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const ctx = cv.getContext('2d');
  if (!ctx) return '';
  const name = (st.name || 'Радио').trim();
  const [c1, c2] = PALETTE[hash(name) % PALETTE.length];

  // Фон: тёмный с цветным свечением станции
  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, S, S);
  let g = ctx.createRadialGradient(S * 0.85, S * 0.05, 10, S * 0.85, S * 0.05, S * 0.9);
  g.addColorStop(0, c1 + 'aa');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  g = ctx.createRadialGradient(S * 0.05, S, 10, S * 0.05, S, S * 0.85);
  g.addColorStop(0, c2 + '88');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  try {
    await (document as any).fonts?.load?.("800 40px 'Manrope Variable'");
  } catch {}

  // Логотип станции (только если сервер разрешает его рисовать) или инициалы
  const tile = 220;
  const tx = (S - tile) / 2;
  const ty = 72;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 40;
  rr(ctx, tx, ty, tile, tile, 44);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
  let drewLogo = false;
  const fav = (st.favicon || '').replace(/^http:\/\//, 'https://');
  if (/^https:\/\//.test(fav)) {
    const img = await loadImage(fav, true);
    // Сначала пробуем на отдельном холсте: если сервер не разрешает использовать картинку, основной не «портим»
    let ok = false;
    if (img) {
      try {
        const t = document.createElement('canvas');
        t.width = t.height = 8;
        const tc = t.getContext('2d');
        tc?.drawImage(img, 0, 0, 8, 8);
        tc?.getImageData(0, 0, 1, 1);
        ok = !!tc;
      } catch {
        ok = false;
      }
    }
    if (img && ok) {
      ctx.save();
      rr(ctx, tx, ty, tile, tile, 44);
      ctx.clip();
      const pad = 18;
      const k = Math.min((tile - pad * 2) / img.naturalWidth, (tile - pad * 2) / img.naturalHeight);
      const w = img.naturalWidth * k;
      const h = img.naturalHeight * k;
      ctx.drawImage(img, tx + (tile - w) / 2, ty + (tile - h) / 2, w, h);
      ctx.restore();
      drewLogo = true;
    }
  }
  if (!drewLogo) {
    ctx.save();
    rr(ctx, tx, ty, tile, tile, 44);
    const lg = ctx.createLinearGradient(tx, ty, tx + tile, ty + tile);
    lg.addColorStop(0, c1);
    lg.addColorStop(1, c2);
    ctx.fillStyle = lg;
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `800 96px 'Manrope Variable', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials(name), S / 2, ty + tile / 2 + 4);
    ctx.restore();
  }

  // Название станции
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const { lines, size } = fitName(ctx, name, S - 72);
  ctx.fillStyle = '#ffffff';
  const top = lines.length === 1 ? 370 : 352;
  lines.forEach((l, i) => ctx.fillText(l, S / 2, top + i * (size + 6)));

  // «YAi Radio · LIVE»
  ctx.font = `700 24px 'Manrope Variable', system-ui, sans-serif`;
  const brand = 'YAi Radio';
  const bw = ctx.measureText(brand).width;
  const live = 'LIVE';
  ctx.font = `800 18px 'Manrope Variable', system-ui, sans-serif`;
  const lw = ctx.measureText(live).width + 26;
  const total = bw + 14 + lw;
  const bx = (S - total) / 2;
  const by = 462;
  ctx.font = `700 24px 'Manrope Variable', system-ui, sans-serif`;
  const tg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  tg.addColorStop(0, '#1fcfeb');
  tg.addColorStop(1, '#1fcfeb');
  ctx.fillStyle = tg;
  ctx.textAlign = 'left';
  ctx.fillText(brand, bx, by);
  rr(ctx, bx + bw + 14, by - 22, lw, 30, 15);
  ctx.fillStyle = '#ef4444';
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `800 18px 'Manrope Variable', system-ui, sans-serif`;
  ctx.fillText(live, bx + bw + 14 + 13, by - 1);

  let url = '';
  try {
    url = cv.toDataURL('image/png');
  } catch {
    url = '';
  }
  if (url) cache.set(key, url);
  return url;
}
