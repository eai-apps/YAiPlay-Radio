import { WindyCams } from './WindyCams';
import React, { useState, useEffect, useRef } from 'react';
import { WebcamCity, CityWeather } from '../types/radio';
import { WEBCAMS_DATA } from '../constants/webcams';
import { loadCatalog } from '../services/catalogService';
import { Globe3DCanvas } from './Globe3DCanvas';
import { fetchCityWeather } from '../services/weatherService';
import { useAudio } from '../context/AudioPlayerContext';
import { useYAiSettings } from '../context/YAiSettingsContext';
import { hiddenCountrySet } from '../utils/visibility';
import {
  Video,
  Globe,
  Radio,
  Play,
  Volume2,
  Maximize2,
  Sparkles,
  MapPin,
  Clock,
  CloudSun,
  Flame,
  Tv,
  Eye,
  RefreshCw,
  Compass,
  Search,
  List,
  LayoutGrid,
  ExternalLink,
  Layers,
  Check,
  Plus,
} from 'lucide-react';

interface WebcamsViewProps {
  onOpenStationSearch?: () => void;
  onOpenAdmin?: () => void;
}

export const WebcamsView: React.FC<WebcamsViewProps> = ({ onOpenAdmin }) => {
  const { currentStation, isPlaying, togglePlayPause } = useAudio();
  const { settings } = useYAiSettings();

  // Нерабочие ссылки (по ежедневной проверке) скрываем
  const [dead, setDead] = useState<Set<string>>(new Set());
  React.useEffect(() => {
    loadCatalog().then((c) => setDead(new Set(c.deadLinks)));
  }, []);

  const hiddenCams = hiddenCountrySet(settings, 'webcams');
  // Combine default and custom webcams from CMS
  const allWebcams: WebcamCity[] = [...(settings.customWebcams || []), ...WEBCAMS_DATA].filter(
    (c) => (!c.directPortalUrl || !dead.has(c.directPortalUrl)) && !hiddenCams.has((c.countryCode || '').toUpperCase())
  );

  const [selectedCity, setSelectedCity] = useState<WebcamCity>(allWebcams[0]);
  // View mode: table (compact row list), cards (grid), or globe (3D Canvas)
  const [viewMode, setViewMode] = useState<'globe' | 'cards' | 'table'>('table');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeCountryFilter, setActiveCountryFilter] = useState<string>('all');
  const [weather, setWeather] = useState<CityWeather | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [autoRefreshActive, setAutoRefreshActive] = useState(true);
  const [mediaError, setMediaError] = useState(false);

  const playerRef = useRef<HTMLDivElement | null>(null);

  // Auto-refresh snapshot every 15 seconds to simulate live camera feed without YouTube
  useEffect(() => {
    if (!autoRefreshActive) return;
    const interval = setInterval(() => {
      setRefreshKey(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefreshActive]);

  // Load live weather for selected city
  useEffect(() => {
    let isMounted = true;
    setIsLoadingWeather(true);

    fetchCityWeather(selectedCity.name.split('(')[0].trim(), selectedCity.countryCode)
      .then((data) => {
        if (isMounted) {
          setWeather(data);
          setIsLoadingWeather(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingWeather(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCity]);

  // Categories list
  const categories = [
    { id: 'all', label: 'Все камеры', icon: Globe },
    { id: 'city', label: 'Мегаполисы', icon: Flame },
    { id: 'beach', label: 'Пляжи и Курорты', icon: Sparkles },
    { id: 'landmark', label: 'Достопримечательности', icon: MapPin },
    { id: 'nature', label: 'Природа и Горы', icon: Compass },
    { id: 'space', label: 'Космос МКС', icon: Tv },
  ];

  // Extract unique countries
  const countries = ['all', ...Array.from(new Set(allWebcams.map((w) => w.country)))];

  // Filtered list
  const filteredWebcams = allWebcams.filter((w) => {
    const matchesCat = activeCategory === 'all' || w.category === activeCategory;
    const matchesCountry = activeCountryFilter === 'all' || w.country === activeCountryFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.tagline.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesCountry && matchesSearch;
  });

  // Камеры показываются на официальных сайтах — открываем их в новой вкладке
  const handleSelectCity = (city: WebcamCity) => {
    setSelectedCity(city);
    const url = city.directPortalUrl || city.streamUrl;
    if (url && /^https?:\/\//.test(url) && !/unsplash\.com/.test(url)) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 pb-28 max-w-7xl mx-auto w-full">
      {/* Тысячи камер Windy (если на сервере задан ключ) */}
      <WindyCams />

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 text-zinc-950">
              <Video className="w-5 h-5 stroke-[2.5]" />
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
              ОТКРЫТЫЕ ВЕБ-КАМЕРЫ МИРА
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              ПРЯМОЙ ЭФИР
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Веб-камеры городов мира
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
            Открытые веб-камеры городов, курортов и природы. Трансляция открывается на официальном сайте камеры —
            а радио продолжает играть.
          </p>
        </div>

        {/* View Switcher: Table List vs Cards vs 3D Globe */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="p-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl flex items-center gap-1 shadow-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-gradient-to-r from-cyan-500 to-violet-400 text-zinc-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Построчный список</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'cards'
                  ? 'bg-gradient-to-r from-cyan-500 to-violet-400 text-zinc-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Карточки</span>
            </button>
            <button
              onClick={() => setViewMode('globe')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'globe'
                  ? 'bg-gradient-to-r from-cyan-500 to-violet-400 text-zinc-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>3D-Глобус</span>
            </button>
          </div>

          {/* Simultaneous Radio Playback status card */}
          {currentStation && (
            <div className="hidden sm:flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-900/80 border border-violet-500/30 shadow-lg shrink-0">
              <button
                onClick={togglePlayPause}
                className="w-8 h-8 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-400 text-zinc-950 flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
                title={isPlaying ? 'Поставить радио на паузу' : 'Возобновить радио'}
              >
                {isPlaying ? <Volume2 className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
              </button>
              <div className="min-w-0 pr-1">
                <div className="text-[9px] font-mono text-violet-400 uppercase tracking-wider font-bold">
                  {isPlaying ? 'Фоновое радио' : 'Радио пауза'}
                </div>
                <div className="text-xs font-bold text-white truncate max-w-[130px]">
                  {currentStation.name}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3D Rotating Globe - Desktop & Tablet Only when in 'globe' mode */}
      {viewMode === 'globe' && (
        <div className="hidden md:block mb-8">
          <Globe3DCanvas
            selectedCityId={selectedCity.id}
            onSelectCity={(city) => handleSelectCity(city)}
          />
        </div>
      )}

      {/* FILTER CONTROLS & SEARCH BAR */}
      <div className="space-y-3 mb-6">
        {/* Search & Header for Catalog */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Каталог веб-камер мира</span>
            </h2>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60">
              {filteredWebcams.length} {filteredWebcams.length === 1 ? 'камера' : 'камер'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск города или страны..."
                className="w-full bg-zinc-900/80 text-xs text-zinc-200 placeholder-zinc-500 pl-8 pr-3 py-1.5 rounded-xl border border-zinc-800 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                title="Добавить свою веб-камеру в Админке"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Своя камера</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-violet-400 text-zinc-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Country Filter Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 shrink-0 mr-1">
            Страна:
          </span>
          {countries.map((c) => {
            const isSelected = activeCountryFilter === c;
            return (
              <button
                key={c}
                onClick={() => setActiveCountryFilter(c)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-bold'
                    : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                }`}
              >
                {c === 'all' ? 'Все страны' : c}
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW: COMPACT ROW-BY-ROW TABLE LIST */}
      {viewMode === 'table' && (
        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/90 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Город & Локация</th>
                  <th className="py-3 px-4">Страна</th>
                  <th className="py-3 px-4 hidden md:table-cell">Категория</th>
                  <th className="py-3 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-xs text-zinc-300">
                {filteredWebcams.map((city) => {
                  const isSel = selectedCity.id === city.id;
                  return (
                    <tr
                      key={city.id}
                      onClick={() => handleSelectCity(city)}
                      className={`cursor-pointer transition-colors ${
                        isSel
                          ? 'bg-cyan-950/40 text-white font-medium'
                          : 'hover:bg-zinc-900/60'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl shrink-0">{city.flag}</span>
                          <div className="min-w-0">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{city.name}</span>
                              {city.isCustom && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  СВОЯ
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate max-w-xs sm:max-w-md">
                              {city.tagline}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] font-medium">
                          {city.country}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap hidden md:table-cell">
                        <span className="text-[11px] font-mono text-cyan-300 uppercase">
                          {city.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleSelectCity(city)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-400 text-zinc-950 font-bold text-xs flex items-center gap-1 shadow hover:brightness-110 active:scale-95 transition-all"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span className="hidden sm:inline">Открыть</span>
                          </button>
                          {city.directPortalUrl && (
                            <a
                              href={city.directPortalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                              title="Официальный прямой эфир"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: CARDS GRID (When not in table mode) */}
      {viewMode !== 'table' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredWebcams.map((city) => {
            const isSelected = selectedCity.id === city.id;
            return (
              <div
                key={city.id}
                onClick={() => handleSelectCity(city)}
                className={`group relative rounded-2xl overflow-hidden cursor-pointer border transition-all duration-300 ${
                  isSelected
                    ? 'bg-zinc-900 border-cyan-400 ring-2 ring-cyan-400/30 shadow-xl shadow-cyan-950/40'
                    : 'bg-zinc-950/80 hover:bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-950 via-zinc-900 to-violet-950 flex items-center justify-center text-5xl">
                    {city.flag}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />

                  {/* Badges on Thumbnail */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/70 text-zinc-200 shadow">
                      ВЕБ-КАМЕРА
                    </span>
                  </div>

                  <div className="absolute top-2.5 right-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-black/70 text-zinc-300 backdrop-blur-sm border border-white/10">
                      {city.country}
                    </span>
                  </div>

                  {/* Play button overlay on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                    <div className="w-12 h-12 rounded-full bg-cyan-400 text-zinc-950 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform font-bold">
                      <Play className="w-6 h-6 ml-1 fill-current" />
                    </div>
                  </div>
                </div>

                {/* Card Meta Content */}
                <div className="p-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{city.flag}</span>
                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                      {city.name}
                    </h3>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-1 mb-2">
                    {city.tagline}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-2 border-t border-zinc-800/80">
                    <span className="flex items-center gap-1 text-violet-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                      {city.category.toUpperCase()}
                    </span>
                    <span>официальный сайт ↗</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
