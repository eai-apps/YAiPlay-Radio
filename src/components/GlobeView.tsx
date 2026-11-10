import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Loader2, Play, Pause, Globe2, LocateFixed, RotateCw } from 'lucide-react';
import { Station } from '../types/radio';
import { fetchStations, fetchStationsByUuids } from '../services/radioApi';
import { useAudio } from '../context/AudioPlayerContext';
import { useYAiSettings } from '../context/YAiSettingsContext';
import { hiddenCountrySet } from '../utils/visibility';
import { getMyCountry } from '../services/geoService';
import { StationLogo } from './StationLogo';
import { DATA_BASE } from '../utils/platform';

/** Точка: [lat, lon, кол-во станций, страна, регион, (ids без региона)] */
type Point = [number, number, number, string, string, string[]?];

let ruNames: Intl.DisplayNames | null = null;
try {
  ruNames = new Intl.DisplayNames(['ru'], { type: 'region' });
} catch {}
const countryName = (cc: string) => (cc ? ruNames?.of(cc) || cc : '');
const flag = (cc: string) => (/^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '🌍');

/** Глобус как в radio.garden: крутите Землю, нажимайте на точку — слушайте местное радио */
export const GlobeView: React.FC = () => {
  const box = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<any>(null);
  const [points, setPoints] = useState<Point[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [sel, setSel] = useState<Point | null>(null);
  const [list, setList] = useState<Station[] | null>(null);
  const [rotate, setRotate] = useState(true);
  const { settings } = useYAiSettings();
  const { playStation, currentStation, isPlaying, togglePlayPause } = useAudio();
  const hidden = useMemo(() => hiddenCountrySet(settings, 'radio'), [settings.hiddenCountries]);

  // Данные точек (собирает робот каталога раз в день)
  useEffect(() => {
    fetch(`${DATA_BASE}geo.json?d=${new Date().toISOString().slice(0, 10)}`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        const small = window.innerWidth < 768;
        setPoints((j.points as Point[]).filter((p) => !hidden.has(p[3])).slice(0, small ? 2500 : 4500));
      })
      .catch(() => setFailed(true));
  }, [hidden]);

  // Сам глобус (библиотека грузится только здесь)
  useEffect(() => {
    if (!points || !box.current) return;
    let disposed = false;
    let ro: ResizeObserver | null = null;
    import('globe.gl').then(({ default: Globe }) => {
      if (disposed || !box.current) return;
      const el = box.current;
      const choose = (d: Point) => {
        setSel(d);
        g.pointOfView({ lat: d[0], lng: d[1], altitude: Math.min(g.pointOfView().altitude || 2, 1.1) }, 900);
        g.controls().autoRotate = false;
        setRotate(false);
      };
      const g = new (Globe as any)(el, { animateIn: true })
        .globeImageUrl('./globe/earth-night.jpg')
        .backgroundColor('rgba(0,0,0,0)')
        .showAtmosphere(true)
        .atmosphereColor('#6041d8')
        .atmosphereAltitude(0.2)
        .pointsData(points)
        .pointLat((d: Point) => d[0])
        .pointLng((d: Point) => d[1])
        .pointColor((d: Point) => (d[2] >= 50 ? '#1fcfeb' : d[2] >= 10 ? '#1fcfeb' : '#22d3ee'))
        .pointAltitude(0.002)
        .pointRadius((d: Point) => 0.16 + Math.min(0.55, Math.log10(d[2] + 1) * 0.17))
        .pointResolution(12)
        .pointLabel(
          (d: Point) =>
            `<div style="background:rgba(9,9,11,.9);border:1px solid rgba(96,65,216,.5);padding:6px 10px;border-radius:10px;font:600 12px Manrope,sans-serif;color:#fff">${flag(d[3])} ${
              d[4] || countryName(d[3])
            }<br><span style="color:#6ee7b7">${d[2]} станц.</span></div>`
        )
        .onPointClick((d: Point) => choose(d))
        // Точки мелкие — нажатие рядом выбирает ближайшую (в пределах ~4° при текущем масштабе)
        .onGlobeClick(({ lat, lng }: { lat: number; lng: number }) => {
          const alt = g.pointOfView().altitude || 2;
          const maxDeg = Math.max(0.6, Math.min(6, alt * 2.2));
          let best: Point | null = null;
          let bestD = Infinity;
          for (const p of points) {
            const dLat = p[0] - lat;
            const dLon = (((p[1] - lng + 540) % 360) - 180) * Math.cos((lat * Math.PI) / 180);
            const dd = Math.hypot(dLat, dLon);
            if (dd < bestD) {
              bestD = dd;
              best = p;
            }
          }
          if (best && bestD <= maxDeg) choose(best);
        })
        .width(el.clientWidth)
        .height(el.clientHeight);
      g.controls().autoRotate = true;
      g.controls().autoRotateSpeed = 0.35;
      globeRef.current = g;
      ro = new ResizeObserver(() => g.width(el.clientWidth).height(el.clientHeight));
      ro.observe(el);
      // Начинаем со своей страны
      getMyCountry().then((cc) => {
        const p = points.find((x) => x[3] === cc);
        if (p && !disposed) g.pointOfView({ lat: p[0], lng: p[1], altitude: el.clientWidth < 600 ? 2.8 : 2.2 }, 1500);
      });
    });
    return () => {
      disposed = true;
      ro?.disconnect();
      try {
        globeRef.current?._destructor?.();
      } catch {}
      globeRef.current = null;
      if (box.current) box.current.innerHTML = '';
    };
  }, [points]);

  // Станции выбранной точки
  useEffect(() => {
    if (!sel) return;
    setList(null);
    const [, , , cc, state, ids] = sel;
    const req = state ? fetchStations({ countrycode: cc, state, limit: 60 }) : fetchStationsByUuids(ids || []);
    req.then(setList).catch(() => setList([]));
  }, [sel]);

  const toggleRotate = () => {
    const g = globeRef.current;
    if (!g) return;
    g.controls().autoRotate = !rotate;
    setRotate(!rotate);
  };
  const toMe = () =>
    getMyCountry().then((cc) => {
      const p = points?.find((x) => x[3] === cc);
      if (p) globeRef.current?.pointOfView({ lat: p[0], lng: p[1], altitude: 1.2 }, 1200);
    });

  return (
    <div className="relative -mx-4 sm:-mx-6 -my-6 h-[calc(100dvh-9rem)] md:h-[calc(100dvh-4rem)] overflow-hidden bg-[radial-gradient(ellipse_at_center,#061a14_0%,#030507_60%,#000_100%)]">
      {/* звёзды */}
      <div className="absolute inset-0 opacity-60 pointer-events-none" style={{ backgroundImage: 'radial-gradient(1px 1px at 20% 30%,#fff,transparent),radial-gradient(1px 1px at 70% 80%,#fff,transparent),radial-gradient(1px 1px at 40% 70%,#9ff,transparent),radial-gradient(1px 1px at 85% 20%,#fff,transparent),radial-gradient(1px 1px at 10% 85%,#cfc,transparent)', backgroundSize: '320px 320px' }} />
      <div ref={box} className="absolute inset-0" />

      {/* Заголовок и кнопки */}
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto px-3 py-2 rounded-2xl bg-black/60 backdrop-blur border border-violet-500/30">
          <div className="text-sm font-extrabold text-white flex items-center gap-1.5">
            <Globe2 className="w-4 h-4 text-violet-400" /> Радио на глобусе
          </div>
          <div className="text-[11px] text-zinc-400">
            {points ? `${points.length.toLocaleString('ru-RU')} мест · крутите и нажимайте на точки` : 'Загружаем карту…'}
          </div>
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button onClick={toMe} title="Моя страна" className="p-2.5 rounded-xl bg-black/60 backdrop-blur border border-zinc-700 text-white">
            <LocateFixed className="w-5 h-5" />
          </button>
          <button onClick={toggleRotate} title="Вращение" className={`p-2.5 rounded-xl backdrop-blur border ${rotate ? 'bg-violet-500/30 border-violet-400/60 text-violet-100' : 'bg-black/60 border-zinc-700 text-white'}`}>
            <RotateCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {!points && !failed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      )}
      {failed && <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400 px-6 text-center">Карта станций ещё готовится. Загляните чуть позже.</div>}

      {/* Панель выбранного места */}
      {sel && (
        <div className="absolute left-2 right-2 bottom-2 md:left-auto md:right-3 md:top-20 md:bottom-3 md:w-96 max-h-[55%] md:max-h-none flex flex-col rounded-3xl bg-zinc-950/90 backdrop-blur-xl border border-violet-500/30 shadow-2xl animate-fade-in">
          <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
            <span className="text-2xl">{flag(sel[3])}</span>
            <div className="flex-1 min-w-0">
              <div className="text-base font-extrabold text-white truncate">{sel[4] || countryName(sel[3])}</div>
              <div className="text-xs text-zinc-400 truncate">
                {sel[4] ? `${countryName(sel[3])} · ` : ''}
                {sel[2]} станц.
              </div>
            </div>
            <button onClick={() => setSel(null)} className="p-2 text-zinc-400" aria-label="Закрыть">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {!list ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              </div>
            ) : list.length === 0 ? (
              <div className="p-6 text-center text-sm text-zinc-400">Здесь пока нет станций, которые работают на сайте.</div>
            ) : (
              list.map((st) => {
                const active = currentStation?.stationuuid === st.stationuuid;
                return (
                  <button
                    key={st.stationuuid}
                    onClick={() => (active ? togglePlayPause() : playStation(st, list))}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl text-left ${active ? 'bg-violet-500/15' : 'hover:bg-zinc-900'}`}
                  >
                    <span className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                      <StationLogo favicon={st.favicon} homepage={st.homepage} name={st.name} textClass="text-xs" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-white truncate">{st.name}</span>
                      <span className="block text-[11px] text-zinc-500 truncate">{(st.tags || '').split(',').slice(0, 2).join(', ') || 'радио'}{st.bitrate ? ` · ${st.bitrate} kbps` : ''}</span>
                    </span>
                    {active && isPlaying ? <Pause className="w-5 h-5 text-violet-300" /> : <Play className="w-5 h-5 text-zinc-400" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
