import React, { useState, useMemo } from 'react';
import { LiteImg } from './LiteImg';
import { ARTISTS_DATA, ArtistItem } from '../constants/artists';
import { Station } from '../types/radio';
import { useAudio } from '../context/AudioPlayerContext';
import { findArtistStations, fetchArtistSeriesStations, artistLabel } from '../services/artistService';
import { StationRow } from './StationRow';
import { useViewMode } from '../hooks/useViewMode';
import { LayoutGrid, List, ChevronDown } from 'lucide-react';
import { loadCatalog, isCatalogReady } from '../services/catalogService';
import {
  Mic2,
  Play,
  Pause,
  Search,
  Sparkles,
  Heart,
  Volume2,
  Film,
  Globe,
  Radio,
  Flame,
  Check,
} from 'lucide-react';

interface ArtistsViewProps {
  onToggleFavorite: (station: Station) => void;
  isFavorite: (stationUuid: string) => boolean;
  initialCategory?: 'all' | 'cis' | 'world' | 'ost';
  onCategoryChange?: (category: 'all' | 'cis' | 'world' | 'ost') => void;
}


export const ArtistsView: React.FC<ArtistsViewProps> = ({
  onToggleFavorite,
  isFavorite,
  initialCategory = 'all',
  onCategoryChange,
}) => {
  const { currentStation, isPlaying, playStation, togglePlayPause, currentTrackTitle } = useAudio();



  const [activeCategory, setActiveCategory] = useState<'all' | 'cis' | 'world' | 'ost'>(initialCategory);
  const [selectedLetter, setSelectedLetter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadingArtistId, setLoadingArtistId] = useState<string | null>(null);
  // Самообновляемый каталог станций исполнителей из открытой базы
  const [series, setSeries] = useState<Station[] | null>(null);
  React.useEffect(() => {
    fetchArtistSeriesStations().then(setSeries);
  }, []);
  const seriesFiltered = useMemo(() => {
    if (!series) return [];
    const q = searchQuery.trim().toLowerCase();
    return q ? series.filter((s) => s.name.toLowerCase().includes(q)) : series;
  }, [series, searchQuery]);
  const [seriesShown, setSeriesShown] = useState(60);

  // Sync when initialCategory prop changes from external buttons (e.g. Header)
  React.useEffect(() => {
    if (initialCategory && initialCategory !== activeCategory) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory]);

  const handleCategorySelect = (cat: 'all' | 'cis' | 'world' | 'ost') => {
    setActiveCategory(cat);
    setSelectedLetter('all');
    if (onCategoryChange) {
      onCategoryChange(cat);
    }
  };

  // Extract unique alphabet letters present in the dataset
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    ARTISTS_DATA.forEach((item) => {
      if (item.alphabetLetter) {
        letters.add(item.alphabetLetter.toUpperCase());
      }
    });
    return Array.from(letters).sort((a, b) => a.localeCompare(b, 'ru'));
  }, []);

  // Артисты без рабочих станций скрываются (по данным ежедневной проверки)
  const [available, setAvailable] = useState<Set<string> | null>(null);
  React.useEffect(() => {
    loadCatalog().then((c) => {
      if (isCatalogReady(c)) {
        setAvailable(new Set(Object.entries(c.artists).filter(([, l]) => l.length > 0).map(([id]) => id)));
        setFound((prev) => ({ ...c.artists, ...prev }));
      }
    });
  }, []);

  // Filter artists
  const filteredArtists = useMemo(() => {
    return ARTISTS_DATA.filter((artist) => {
      if (available && !available.has(artist.id)) return false;
      // Category filter
      if (activeCategory !== 'all' && artist.category !== activeCategory) {
        return false;
      }

      // Letter filter
      if (selectedLetter !== 'all' && artist.alphabetLetter.toUpperCase() !== selectedLetter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          artist.name.toLowerCase().includes(q) ||
          artist.description.toLowerCase().includes(q) ||
          artist.genre.toLowerCase().includes(q) ||
          artist.query.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [activeCategory, selectedLetter, searchQuery, available]);

  // Найденные станции по каждому исполнителю (только с его именем в названии)
  const [found, setFound] = useState<Record<string, Station[]>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const { mode, setMode } = useViewMode();

  // «Дальше / назад» идут по всем артистам в том порядке, как они показаны на экране (а не по станциям одного артиста)
  const queueFor = (artistId: string, own: Station[]) => {
    const seen = new Set<string>();
    const out: Station[] = [];
    for (const a of filteredArtists) {
      for (const st of a.id === artistId ? own : found[a.id] || []) {
        if (!seen.has(st.stationuuid)) {
          seen.add(st.stationuuid);
          out.push(st);
        }
      }
    }
    for (const st of own) if (!seen.has(st.stationuuid)) out.push(st);
    return out;
  };

  const stationList = (artist: ArtistItem) => {
    const list = found[artist.id] || [];
    return (
      <div className="flex flex-col gap-1 p-2 pt-0 max-h-64 overflow-y-auto">
        {list.map((st) => (
          <StationRow
            key={st.stationuuid}
            station={st}
            isCurrent={currentStation?.stationuuid === st.stationuuid}
            isPlaying={isPlaying}
            isFavorite={isFavorite(st.stationuuid)}
            trackTitle={currentTrackTitle}
            onPlay={() => playStation(st, queueFor(artist.id, list))}
            onToggleFavorite={() => onToggleFavorite(st)}
          />
        ))}
      </div>
    );
  };

  const isArtistPlaying = (artistId: string) =>
    !!currentStation && (found[artistId] || []).some((s) => s.stationuuid === currentStation.stationuuid);

  const handlePlayArtist = async (artist: ArtistItem) => {
    if (isArtistPlaying(artist.id)) {
      togglePlayPause();
      return;
    }
    setLoadingArtistId(artist.id);
    setNotice(null);
    try {
      const list = await findArtistStations(artist);
      setFound((prev) => ({ ...prev, [artist.id]: list }));
      if (list.length) {
        playStation(list[0], queueFor(artist.id, list));
      } else {
        setNotice(
          artist.category === 'ost'
            ? `Сейчас нет доступных станций подборки «${artist.name}». Попробуйте позже.`
            : `Пока нет отдельной станции «${artist.name}» в открытом каталоге. Мы не подменяем её случайной.`
        );
        setTimeout(() => setNotice(null), 5000);
      }
    } catch {
      setNotice('Каталог станций сейчас недоступен. Попробуйте ещё раз.');
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setLoadingArtistId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-16">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-950 via-[#07131e] to-[#041d13] border border-cyan-500/30 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-gradient-to-r from-cyan-500/20 to-violet-400/20 text-cyan-300 border border-cyan-400/30">
                ИСПОЛНИТЕЛИ & OST
              </span>
              <span className="text-xs text-violet-400 font-mono font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                Только станции с именем артиста
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-400 text-zinc-950 shadow-lg shadow-cyan-500/30">
                <Mic2 className="w-7 h-7 stroke-[2.5]" />
              </span>
              <span>Исполнители & Саундтреки</span>
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 mt-2 max-w-2xl leading-relaxed">
              Станции, посвящённые конкретным исполнителям (ищем по имени в названии станции), и подборки саундтреков из кино, игр и аниме. Если отдельной станции нет — так и скажем, без подмены.
            </p>
          </div>

          {/* Quick Counter */}
          <div className="flex items-center gap-3 bg-zinc-950/70 border border-zinc-800 px-4 py-3 rounded-2xl shrink-0 self-start md:self-auto">
            <Radio className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-lg font-bold font-mono text-white">
                {filteredArtists.length}
              </div>
              <div className="text-[10px] font-mono uppercase text-zinc-400">
                в каталоге
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Category Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-zinc-900/90 border border-zinc-800 rounded-2xl w-fit shadow-lg">
        {[
          { id: 'all', label: 'Все', icon: Flame },
          { id: 'cis', label: '🇷🇺 СНГ / Рок и Поп', icon: Mic2 },
          { id: 'world', label: '🌍 Мировые группы & Легенды', icon: Globe },
          { id: 'ost', label: '🎬 Саундтреки (OST)', icon: Film },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleCategorySelect(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500 to-violet-400 text-zinc-950 shadow-md shadow-cyan-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end -mb-2">
        <div className="inline-flex p-1 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <button onClick={() => setMode('grid')} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${mode === 'grid' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>
            <LayoutGrid className="w-3.5 h-3.5" /> Плитка
          </button>
          <button onClick={() => setMode('list')} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${mode === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>
            <List className="w-3.5 h-3.5" /> Список
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 font-medium">{notice}</div>
      )}

      {/* Search & Alphabet Filter Row */}
      <div className="flex flex-col gap-3">
        {/* Search Bar */}
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск исполнителя, группы или саундтрека..."
            className="w-full bg-zinc-900/90 hover:bg-zinc-900 focus:bg-zinc-900 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 pl-10 pr-4 py-2.5 rounded-2xl border border-zinc-800 focus:border-cyan-400 focus:outline-none transition-all shadow-inner"
          />
        </div>

        {/* Alphabet (A-Z, А-Я) Selector Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedLetter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold font-mono transition-all shrink-0 ${
              selectedLetter === 'all'
                ? 'bg-cyan-400 text-zinc-950 shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Все (A–Z)
          </button>

          {availableLetters.map((letter) => {
            const isSel = selectedLetter === letter;
            return (
              <button
                key={letter}
                onClick={() => setSelectedLetter(letter)}
                className={`w-8 h-8 rounded-xl text-xs font-bold font-mono flex items-center justify-center transition-all shrink-0 ${
                  isSel
                    ? 'bg-violet-400 text-zinc-950 shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Artists & OST Stations Grid */}
      {filteredArtists.length === 0 ? (
        <div className="py-20 text-center text-zinc-400 bg-zinc-950/40 rounded-3xl border border-zinc-900">
          <Mic2 className="w-12 h-12 mx-auto text-zinc-600 mb-3 opacity-50" />
          <h3 className="text-base font-bold text-white mb-1">Ничего не найдено</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Попробуйте изменить поисковый запрос или выбрать другую букву алфавита
          </p>
        </div>
      ) : mode === 'list' ? (
        <div className="flex flex-col gap-1.5">
          {filteredArtists.map((artist) => {
            const list = found[artist.id];
            const playingThis = isArtistPlaying(artist.id) && isPlaying;
            return (
              <div key={artist.id} className={`rounded-2xl border ${playingThis ? 'border-violet-500/50 bg-violet-950/20' : 'border-zinc-800 bg-zinc-900/50'}`}>
                <div className="flex items-center gap-3 p-2.5">
                  <button
                    onClick={() => handlePlayArtist(artist)}
                    className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-violet-400 text-zinc-950 flex items-center justify-center shrink-0"
                    aria-label="Слушать"
                  >
                    {loadingArtistId === artist.id ? (
                      <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    ) : playingThis ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white truncate">{artist.name}</div>
                    <div className="text-[11px] text-zinc-400 truncate">{artist.genre}</div>
                  </div>
                  {list && list.length > 0 && (
                    <button onClick={() => setOpenId(openId === artist.id ? null : artist.id)} className="px-2.5 py-1.5 rounded-lg bg-zinc-800 text-[11px] font-semibold text-zinc-200 flex items-center gap-1 shrink-0">
                      {list.length} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openId === artist.id ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
                {openId === artist.id && stationList(artist)}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredArtists.map((artist) => {
            const isPlayingThis = isArtistPlaying(artist.id) && isPlaying;
            const foundList = found[artist.id];

            return (
              <div
                key={artist.id}
                className={`group relative overflow-hidden rounded-3xl border transition-all duration-300 flex flex-col justify-between ${
                  ''
                }${
                  isPlayingThis
                    ? 'bg-gradient-to-b from-zinc-900 to-violet-950/40 border-violet-500 shadow-xl shadow-violet-500/10'
                    : 'bg-zinc-950/70 border-zinc-800/80 hover:border-cyan-500/40 hover:bg-zinc-900/60 shadow-lg'
                }`}
              >
                {/* Top Image Banner */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-900">
                  <LiteImg
                    src={artist.avatar}
                    alt={artist.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />

                  {/* Сколько станций найдено */}
                  {foundList && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono font-bold text-cyan-300 shadow">
                      {foundList.length ? `${foundList.length} станц.` : 'нет станции'}
                    </div>
                  )}

                  {/* Floating Play Button */}
                  <button
                    onClick={() => handlePlayArtist(artist)}
                    disabled={loadingArtistId === artist.id}
                    className="absolute bottom-3 right-3 w-12 h-12 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-400 hover:brightness-110 text-zinc-950 flex items-center justify-center shadow-xl shadow-cyan-500/30 group-hover:scale-110 transition-transform active:scale-95"
                    title={isPlayingThis ? 'Пауза' : 'Найти и включить'}
                  >
                    {loadingArtistId === artist.id ? (
                      <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    ) : isPlayingThis ? (
                      <Pause className="w-6 h-6 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    )}
                  </button>

                  {/* Genre badge bottom left */}
                  <div className="absolute bottom-3 left-3 max-w-[65%]">
                    <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-medium text-violet-300 border border-violet-500/30 truncate block">
                      {artist.genre}
                    </span>
                  </div>
                </div>

                {/* Content body */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors truncate">
                        {artist.name}
                      </h3>
                      {isPlayingThis && (
                        <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/30 shrink-0">
                          <Volume2 className="w-3 h-3 animate-pulse" />
                          В ЭФИРЕ
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {artist.description}
                    </p>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                    {foundList && foundList.length > 0 ? (
                      <button
                        onClick={() => setOpenId(openId === artist.id ? null : artist.id)}
                        className="text-[11px] font-semibold text-zinc-300 hover:text-white flex items-center gap-1"
                      >
                        Станции: {foundList.length}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openId === artist.id ? 'rotate-180' : ''}`} />
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-500">{artist.category === 'ost' ? 'Подборка' : 'Исполнитель'}</span>
                    )}

                    <button
                      onClick={() => handlePlayArtist(artist)}
                      className="text-xs font-bold text-cyan-400 hover:text-violet-300 transition-colors flex items-center gap-1"
                    >
                      <span>{isPlayingThis ? 'Пауза' : 'Слушать'}</span>
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                </div>
                {openId === artist.id && stationList(artist)}
              </div>
            );
          })}
        </div>
      )}
      {activeCategory !== 'ost' && (
        <section className="flex flex-col gap-3 mt-4">
          <div>
            <h2 className="text-lg font-bold text-white">Ещё исполнители — каталог обновляется сам</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Станции, где звучит один исполнитель: серии «Exclusively», «101.ru», «Radio Maximum», «Best of Rock FM». Новые появляются автоматически.
              {series ? ` Сейчас: ${series.length}.` : ' Загружаем…'}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            {seriesFiltered.slice(0, seriesShown).map((st) => (
              <StationRow
                key={st.stationuuid}
                station={{ ...st, name: artistLabel(st.name), tags: st.name }}
                isCurrent={currentStation?.stationuuid === st.stationuuid}
                isPlaying={isPlaying}
                isFavorite={isFavorite(st.stationuuid)}
                trackTitle={currentTrackTitle}
                onPlay={() => playStation(st, seriesFiltered)}
                onToggleFavorite={() => onToggleFavorite(st)}
              />
            ))}
          </div>
          {seriesFiltered.length > seriesShown && (
            <button onClick={() => setSeriesShown((n) => n + 60)} className="self-center px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-200 hover:bg-zinc-800">
              Показать ещё ({seriesFiltered.length - seriesShown})
            </button>
          )}
        </section>
      )}
    </div>
  );
};
