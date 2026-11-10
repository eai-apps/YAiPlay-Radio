import { FEATURES } from '../utils/platform';
import { LiteImg } from './LiteImg';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Tv, Play, ExternalLink, Search, Youtube, Globe, AlertTriangle, Loader2, X } from 'lucide-react';
import { loadCatalog, CatalogTvChannel } from '../services/catalogService';
import { useAudio } from '../context/AudioPlayerContext';
import { useYAiSettings } from '../context/YAiSettingsContext';
import { getMyCountry } from '../services/geoService';
import { hiddenCountrySet, tvChannelAllowed } from '../utils/visibility';
import { isRuStoreBuild, RUSTORE_TV_BLOCK } from '../utils/platform';

/**
 * Телеканалы мира.
 * 1) «Смотреть здесь» — открытые бесплатные HLS-трансляции, которые сами телеканалы
 *    разрешают показывать на сторонних сайтах. Список проверяется роботом каждый день.
 * 2) «Официальные эфиры» — каналы, которые показывают эфир только у себя или на YouTube:
 *    у нас только название и кнопки перехода на официальный сайт / YouTube-канал.
 */

interface OfficialLink {
  name: string;
  country: string; // ISO-код
  category: string;
  website: string;
  youtube?: string;
}

const ALL_OFFICIAL_LINKS: OfficialLink[] = [
  { name: 'Euronews (Русский)', country: 'EU', category: 'news', website: 'https://ru.euronews.com/live', youtube: 'https://www.youtube.com/@euronewsru/live' },
  { name: 'BBC News', country: 'GB', category: 'news', website: 'https://www.bbc.com/news', youtube: 'https://www.youtube.com/@BBCNews/live' },
  { name: 'DW News', country: 'DE', category: 'news', website: 'https://www.dw.com/en/live-tv/s-100825', youtube: 'https://www.youtube.com/@dwnews/live' },
  { name: 'France 24', country: 'FR', category: 'news', website: 'https://www.france24.com/en/live', youtube: 'https://www.youtube.com/@FRANCE24English/live' },
  { name: 'Al Jazeera English', country: 'QA', category: 'news', website: 'https://www.aljazeera.com/live/', youtube: 'https://www.youtube.com/@aljazeeraenglish/live' },
  { name: 'NHK World-Japan', country: 'JP', category: 'news', website: 'https://www3.nhk.or.jp/nhkworld/en/live/', youtube: 'https://www.youtube.com/@NHKWORLDJAPAN/live' },
  { name: 'Sky News', country: 'GB', category: 'news', website: 'https://news.sky.com/watch-live', youtube: 'https://www.youtube.com/@SkyNews/live' },
  { name: 'NASA', country: 'US', category: 'science', website: 'https://plus.nasa.gov/', youtube: 'https://www.youtube.com/@NASA/live' },
  { name: 'ESA (Европейское космическое агентство)', country: 'EU', category: 'science', website: 'https://www.esa.int/ESA_Multimedia/ESA_Web_TV', youtube: 'https://www.youtube.com/@EuropeanSpaceAgency/live' },
  { name: 'explore.org — живая природа', country: 'US', category: 'outdoor', website: 'https://explore.org/livecams', youtube: 'https://www.youtube.com/@exploreLiveNatureCams/live' },
  { name: 'Clubbing TV', country: 'FR', category: 'music', website: 'https://www.clubbingtv.com', youtube: 'https://www.youtube.com/@ClubbingTV/live' },
  { name: 'Qwest TV', country: 'FR', category: 'music', website: 'https://qwest.tv', youtube: 'https://www.youtube.com/@QwestTV/live' },
  { name: 'Europa Plus TV', country: 'RU', category: 'music', website: 'https://europaplustv.com' },
  { name: 'Bridge TV', country: 'RU', category: 'music', website: 'https://bridgetv.ru' },
  { name: 'Red Bull TV', country: 'AT', category: 'outdoor', website: 'https://www.redbull.com/tv', youtube: 'https://www.youtube.com/@redbull/live' },
  { name: 'Olympics', country: 'CH', category: 'sport', website: 'https://olympics.com/en/', youtube: 'https://www.youtube.com/@Olympics' },
];

const OFFICIAL_LINKS = ALL_OFFICIAL_LINKS.filter(
  (l) => !isRuStoreBuild || (tvChannelAllowed({ country: l.country, categories: [l.category] }) && !RUSTORE_TV_BLOCK.officialNames.test(l.name))
);

const CATEGORY_RU: Record<string, string> = {
  general: 'Общие',
  all: 'Все',
  news: 'Новости',
  music: 'Музыка',
  documentary: 'Документальные',
  science: 'Наука и космос',
  weather: 'Погода',
  travel: 'Путешествия',
  outdoor: 'Природа и экстрим',
  education: 'Образование',
  culture: 'Культура',
  kids: 'Детские',
  business: 'Бизнес',
  religious: 'Религия',
  lifestyle: 'Стиль жизни',
  cooking: 'Кулинария',
  sport: 'Спорт',
};

let regionNames: Intl.DisplayNames | null = null;
try {
  regionNames = new Intl.DisplayNames(['ru'], { type: 'region' });
} catch {}
const countryName = (code: string) => {
  if (!code) return 'Мир';
  if (code === 'EU') return 'Европа';
  try {
    return regionNames?.of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
};
const flag = (cc: string) =>
  cc && cc.length === 2 && cc !== 'EU' ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))) : '🌍';

type Playable = CatalogTvChannel & { custom?: boolean };

export const LiveTVView: React.FC = () => {
  const { isPlaying, togglePlayPause } = useAudio();
  const { settings } = useYAiSettings();
  const [tab, setTab] = useState<'watch' | 'links'>(FEATURES.tvStreams ? 'watch' : 'links');
  const [channels, setChannels] = useState<Playable[] | null>(null);
  const [category, setCategory] = useState('all');
  const [country, setCountry] = useState('');
  const [q, setQ] = useState('');
  const [current, setCurrent] = useState<Playable | null>(null);
  const [videoState, setVideoState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const [shown, setShown] = useState(48);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any>(null);

  useEffect(() => {
    loadCatalog().then((c) => {
      const custom: Playable[] = (settings.customTvChannels || [])
        .filter((ch) => ch.hlsStreamUrl)
        .map((ch) => ({
          id: ch.id,
          name: ch.name,
          country: ch.countryCode || '',
          categories: [ch.category],
          website: ch.officialSiteUrl || '',
          logo: ch.logo || '',
          stream: ch.hlsStreamUrl!,
          quality: '',
          custom: true,
        }));
      const all = [...custom, ...c.tv].filter(tvChannelAllowed);
      setChannels(all);
      // Сначала показываем каналы страны пользователя, если они есть
      getMyCountry().then((mine) => {
        const hidden = hiddenCountrySet(settings, 'tv');
        if (mine && !hidden.has(mine) && all.some((ch) => ch.country === mine)) setCountry(mine);
      });
      if (!FEATURES.tvStreams || (!c.tv.length && !custom.length)) setTab('links');
    });
  }, [settings.customTvChannels]);

  // Остановка видео при уходе со страницы
  useEffect(() => () => hlsRef.current?.destroy?.(), []);

  const play = async (ch: Playable) => {
    setCurrent(ch);
    setVideoState('loading');
    if (isPlaying) togglePlayPause(); // радио на паузу, чтобы не было двух звуков
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const video = videoRef.current;
    if (!video) return;
    hlsRef.current?.destroy?.();
    hlsRef.current = null;
    try {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = ch.stream; // Safari / iPhone — встроенная поддержка
      } else {
        const { default: Hls } = await import('hls.js');
        if (!Hls.isSupported()) throw new Error('HLS not supported');
        const hls = new Hls({ maxBufferLength: 20 });
        hlsRef.current = hls;
        hls.on(Hls.Events.ERROR, (_e: any, data: any) => {
          if (data?.fatal) setVideoState('error');
        });
        hls.loadSource(ch.stream);
        hls.attachMedia(video);
      }
      try {
        await video.play();
        setVideoState('playing');
      } catch (err: any) {
        // Браузер запретил автозапуск — просто ждём нажатия ▶ в самом плеере
        setVideoState(err?.name === 'NotAllowedError' ? 'idle' : 'error');
      }
    } catch {
      setVideoState('error');
    }
  };

  const stop = () => {
    hlsRef.current?.destroy?.();
    hlsRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
    setCurrent(null);
    setVideoState('idle');
  };

  const hiddenTv = useMemo(() => hiddenCountrySet(settings, 'tv'), [settings.hiddenCountries]);
  const list = (channels || []).filter((c) => !hiddenTv.has((c.country || '').toUpperCase()));
  const countries = useMemo(() => {
    const m = new Map<string, number>();
    list.forEach((c) => m.set(c.country, (m.get(c.country) || 0) + 1));
    return [...m.entries()].sort((a, b) => countryName(a[0]).localeCompare(countryName(b[0]), 'ru'));
  }, [list]);
  const categories = useMemo(() => {
    const set = new Set<string>();
    list.forEach((c) => c.categories.forEach((x) => CATEGORY_RU[x] && set.add(x)));
    return ['all', ...[...set].sort((a, b) => CATEGORY_RU[a].localeCompare(CATEGORY_RU[b], 'ru'))];
  }, [list]);

  const filtered = list.filter(
    (c) =>
      (category === 'all' || c.categories.includes(category)) &&
      (!country || c.country === country) &&
      (!q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase()))
  );
  const links = OFFICIAL_LINKS.filter(
    (l) =>
      !hiddenTv.has(l.country) && (category === 'all' || l.category === category) && (!q.trim() || l.name.toLowerCase().includes(q.trim().toLowerCase()))
  );

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border ${
      active ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40' : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
    }`;

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <Tv className="w-6 h-6 text-cyan-400" /> Телеканалы мира
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Только открытые бесплатные трансляции, которые телеканалы сами распространяют публично. Список проверяется каждый день.
        </p>
      </div>

      {/* Встроенный плеер */}
      <div className={`${current ? '' : 'hidden'} rounded-3xl overflow-hidden border border-zinc-800 bg-black`}>
        <div className="relative aspect-video bg-black">
          <video ref={videoRef} className="w-full h-full" controls playsInline onPlaying={() => setVideoState('playing')} />
          {videoState === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-300 text-sm gap-2 pointer-events-none">
              <Loader2 className="w-5 h-5 animate-spin" /> Подключаемся к эфиру…
            </div>
          )}
          {videoState === 'error' && current && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6 bg-black/85">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
              <p className="text-sm text-zinc-200">Этот эфир сейчас недоступен на нашем сайте.</p>
              {current.website && (
                <a href={current.website} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-cyan-500 text-zinc-950 text-xs font-bold flex items-center gap-1.5">
                  Смотреть на официальном сайте <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
        {current && (
          <div className="flex items-center gap-3 p-3 bg-zinc-950">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-white truncate">{current.name}</div>
              <div className="text-[11px] text-zinc-400 truncate">
                {flag(current.country)} {countryName(current.country)} · {current.categories.map((c) => CATEGORY_RU[c]).filter(Boolean).join(', ')}
              </div>
            </div>
            {current.website && (
              <a href={current.website} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-zinc-800 text-zinc-200" title="Официальный сайт">
                <Globe className="w-4 h-4" />
              </a>
            )}
            <button onClick={stop} className="p-2 rounded-lg bg-zinc-800 text-zinc-200" title="Закрыть">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Вкладки */}
      <div className="inline-flex p-1 rounded-2xl bg-zinc-900 border border-zinc-800 self-start">
        {FEATURES.tvStreams && <button onClick={() => setTab('watch')} className={`px-4 py-2 rounded-xl text-xs font-bold ${tab === 'watch' ? 'bg-violet-500 text-zinc-950' : 'text-zinc-400'}`}>
          Смотреть здесь {channels ? `(${list.length})` : ''}
        </button>}
        <button onClick={() => setTab('links')} className={`px-4 py-2 rounded-xl text-xs font-bold ${tab === 'links' ? 'bg-violet-500 text-zinc-950' : 'text-zinc-400'}`}>
          Официальные эфиры ({OFFICIAL_LINKS.length})
        </button>
      </div>

      {/* Фильтры */}
      <div className="flex flex-col gap-2">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Название канала…"
            className="w-full bg-zinc-900 text-sm text-white pl-10 pr-4 py-2.5 rounded-2xl border border-zinc-800 focus:border-cyan-400 focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(tab === 'watch' ? categories : ['all', 'news', 'music', 'science', 'outdoor', 'sport']).map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={chip(category === c)}>
              {CATEGORY_RU[c]}
            </button>
          ))}
        </div>
        {tab === 'watch' && countries.length > 1 && (
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="self-start bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white px-3 py-2"
          >
            <option value="">🌍 Все страны</option>
            {countries.map(([cc, n]) => (
              <option key={cc} value={cc}>
                {flag(cc)} {countryName(cc)} ({n})
              </option>
            ))}
          </select>
        )}
      </div>

      {tab === 'watch' && (
        <>
          {!channels ? (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Загружаем список…
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-zinc-400">
              {list.length ? 'По этим фильтрам каналов нет.' : 'Проверенный список каналов появится после первой ежедневной проверки. Пока смотрите «Официальные эфиры».'}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.slice(0, shown).map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => play(ch)}
                  className={`group text-left p-3 rounded-2xl border transition-colors ${
                    current?.id === ch.id ? 'bg-cyan-950/40 border-cyan-400/60' : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/80'
                  }`}
                >
                  <div className="relative aspect-video rounded-xl bg-zinc-950 flex items-center justify-center overflow-hidden mb-2">
                    {ch.logo ? (
                      <LiteImg src={ch.logo} alt="" loading="lazy" referrerPolicy="no-referrer" className="max-w-[70%] max-h-[70%] object-contain" />
                    ) : (
                      <Tv className="w-8 h-8 text-zinc-600" />
                    )}
                    <span className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-cyan-500 text-zinc-950 flex items-center justify-center opacity-90 group-hover:scale-110 transition-transform">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white truncate">{ch.name}</div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {flag(ch.country)} {countryName(ch.country)}
                    {ch.quality ? ` · ${ch.quality}` : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
          {filtered.length > shown && (
            <button onClick={() => setShown((n) => n + 48)} className="self-center px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-200">
              Показать ещё ({filtered.length - shown})
            </button>
          )}
        </>
      )}

      {tab === 'links' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {links.map((l) => (
            <div key={l.name} className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-3">
              <div>
                <div className="text-sm font-bold text-white">{l.name}</div>
                <div className="text-[11px] text-zinc-400">
                  {flag(l.country)} {countryName(l.country)} · {CATEGORY_RU[l.category]}
                </div>
              </div>
              <div className="flex gap-2">
                <a href={l.website} target="_blank" rel="noreferrer" className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white flex items-center justify-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Официальный сайт
                </a>
                {l.youtube && (
                  <a href={l.youtube} target="_blank" rel="noreferrer" className="flex-1 py-2 rounded-xl bg-red-600/90 hover:bg-red-600 text-xs font-semibold text-white flex items-center justify-center gap-1.5">
                    <Youtube className="w-3.5 h-3.5" /> YouTube
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-zinc-500 leading-relaxed">
        Трансляции принадлежат их правообладателям и показываются с их официальных публичных серверов. YAi Radio не хранит и не
        ретранслирует видео. Каталог: открытая база iptv-org. Заметили проблему с каналом — напишите нам в Telegram, мы уберём его.
      </p>
    </div>
  );
};
