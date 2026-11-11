import React, { useEffect, useMemo, useState } from 'react';
import { LiteImg } from './LiteImg';
import { X, ExternalLink, Loader2, MapPin } from 'lucide-react';
import { api } from '../services/apiService';
import { getMyCountry } from '../services/geoService';
import { useYAiSettings } from '../context/YAiSettingsContext';
import { hiddenCountrySet } from '../utils/visibility';
import { useAudio } from '../context/AudioPlayerContext';

interface Cam {
  id: string;
  title: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  image: string;
  player: string;
  live: boolean;
  page: string;
}

const COUNTRY_CODES =
  'AD AE AL AM AR AT AU AZ BA BE BG BR BY CA CH CL CN CO CR CY CZ DE DK DO EC EE EG ES FI FR GB GE GR HR HU ID IE IL IN IS IT JP KR KZ LT LU LV MA MC ME MK MT MX MY NL NO NZ PE PH PL PT RO RS RU SE SG SI SK TH TR TW UA US UY VN ZA'.split(' ');
let ruNames: Intl.DisplayNames | null = null;
try {
  ruNames = new Intl.DisplayNames(['ru'], { type: 'region' });
} catch {}
const flag = (cc: string) => String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

const CATS = [
  ['', 'Все'],
  ['city', 'Города'],
  ['beach', 'Пляжи'],
  ['mountain', 'Горы'],
  ['lake', 'Озёра'],
  ['landscape', 'Природа'],
  ['traffic', 'Дороги'],
  ['harbor', 'Порты'],
  ['airport', 'Аэропорты'],
];

/** Тысячи веб-камер мира через официальный Windy Webcams API (через наш сервер, ключ скрыт) */
export const WindyCams: React.FC = () => {
  const { settings } = useYAiSettings();
  const { isPlaying, togglePlayPause } = useAudio();
  const hidden = hiddenCountrySet(settings, 'webcams');
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [cams, setCams] = useState<Cam[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<Cam | null>(null);

  useEffect(() => {
    if (!settings.apiUrl) return;
    let active = true;
    setEnabled(null);
    getMyCountry().then((cc) => {
      if (active) setCountry(cc && !hidden.has(cc) ? cc : 'DE');
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.apiUrl]);

  const load = async (offset: number) => {
    if (!country) return;
    setLoading(true);
    try {
      const page = (off: number) => {
        const q = new URLSearchParams({ country, offset: String(off) });
        if (category) q.set('category', category);
        return api<{ total: number; webcams: Cam[] }>(`/webcams?${q}`);
      };
      // Сразу 3 страницы (до 150 камер), чтобы список городов был полнее
      const offsets = offset ? [offset] : [0, 50, 100];
      const pages = await Promise.allSettled(offsets.map(page));
      const ok = pages.filter((p): p is PromiseFulfilledResult<{ total: number; webcams: Cam[] }> => p.status === 'fulfilled').map((p) => p.value);
      if (!ok.length) throw new Error('no data');
      setEnabled(true);
      setTotal(ok[0].total);
      const fresh = ok.flatMap((p) => p.webcams);
      setCams((prev) => {
        const all = offset ? [...prev, ...fresh] : fresh;
        const seen = new Set<string>();
        return all.filter((c) => !seen.has(c.id) && seen.add(c.id));
      });
    } catch {
      if (!offset) setEnabled(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCity('');
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, category, settings.apiUrl]);

  const cities = useMemo(() => {
    const m = new Map<string, number>();
    cams.forEach((c) => c.city && m.set(c.city, (m.get(c.city) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
  }, [cams]);

  if (!settings.apiUrl || enabled === false) return null;
  const shown = cams.filter((c) => !hidden.has(c.countryCode) && (!city || c.city === city));
  const countries = COUNTRY_CODES.filter((c) => !hidden.has(c)).sort((a, b) => (ruNames?.of(a) || a).localeCompare(ruNames?.of(b) || b, 'ru'));

  const openCam = (c: Cam) => {
    if (isPlaying) togglePlayPause(); // у некоторых камер есть звук
    setOpen(c);
  };

  return (
    <section className="mb-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white">🌍 Камеры мира онлайн</h2>
          <p className="text-xs text-zinc-400">Тысячи камер — смотрите прямо здесь. Выберите страну и город.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            aria-label="Страна"
            className="bg-zinc-900 text-sm font-semibold text-white px-3 py-2.5 rounded-xl border border-zinc-800 focus:border-violet-400 focus:outline-none"
          >
            {countries.map((c) => (
              <option key={c} value={c}>
                {flag(c)} {ruNames?.of(c) || c}
              </option>
            ))}
          </select>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            aria-label="Город"
            className="bg-zinc-900 text-sm font-semibold text-white px-3 py-2.5 rounded-xl border border-zinc-800 focus:border-violet-400 focus:outline-none max-w-[60vw] sm:max-w-[240px]"
          >
            <option value="">🏙 Все города ({cities.length})</option>
            {[...cities]
              .sort((a, b) => a[0].localeCompare(b[0], 'ru'))
              .map(([name, n]) => (
                <option key={name} value={name}>
                  {name} — {n}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setCategory(id)}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border ${category === id ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40' : 'bg-zinc-900 text-zinc-300 border-zinc-800'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && !cams.length ? (
        <div className="py-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
          {shown.map((c) => (
            <button key={c.id} onClick={() => openCam(c)} className="text-left rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 active:scale-[0.98] transition">
              <div className="relative aspect-video bg-zinc-800">
                {c.image && <LiteImg src={c.image} alt="" loading="lazy" className="w-full h-full object-cover" />}
                {c.live && <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-cyan-600 text-white text-[10px] font-bold">LIVE</span>}
              </div>
              <div className="p-2.5">
                <div className="text-xs font-semibold text-white line-clamp-2">{c.title}</div>
                <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 shrink-0" /> {c.city || c.region}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {cams.length < total && cams.length < 1000 && (
        <button onClick={() => load(cams.length)} disabled={loading} className="mt-4 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-semibold text-cyan-200">
          {loading ? 'Загружаем…' : `Показать ещё (всего ${total})`}
        </button>
      )}

      <p className="mt-3 text-[11px] text-zinc-500 text-right">
        Webcams provided by{' '}
        <a href="https://www.windy.com/" target="_blank" rel="noreferrer" className="underline hover:text-zinc-300">
          windy.com
        </a>{' '}
        —{' '}
        <a href="https://www.windy.com/webcams/add" target="_blank" rel="noreferrer" className="underline hover:text-zinc-300">
          add a webcam
        </a>
      </p>

      {open && (
        <div className="fixed inset-0 z-[65] bg-black/85 backdrop-blur-md flex items-center justify-center p-3" onClick={() => setOpen(null)}>
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">{open.title}</div>
                <div className="text-xs text-zinc-400 truncate">
                  {flag(open.countryCode)} {open.city}, {open.country}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={open.page} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-zinc-800 text-zinc-200" aria-label="Открыть на Windy">
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button onClick={() => setOpen(null)} className="p-2 rounded-xl bg-zinc-800 text-zinc-200" aria-label="Закрыть">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-zinc-800">
              {open.player ? (
                <iframe src={open.player} title={open.title} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen />
              ) : (
                <LiteImg src={open.image} alt="" className="w-full h-full object-contain" />
              )}
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">Webcams provided by windy.com</p>
          </div>
        </div>
      )}
    </section>
  );
};
