import React, { useMemo, useState } from 'react';
import { LiteImg } from './LiteImg';
import { useAudio } from '../context/AudioPlayerContext';
import { Station, RecognizedTrack, PlayedTrackHistory } from '../types/radio';
import {
  Clock,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Search,
  Radio,
  Sparkles,
  Music2,
  Disc3,
  Youtube,
  RadioTower,
  X,
} from 'lucide-react';

interface HistoryViewProps {
  onToggleFavorite: (station: Station) => void;
  isFavorite: (stationUuid: string) => boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onToggleFavorite, isFavorite }) => {
  const {
    history,
    clearHistory,
    recognizedTracks,
    clearRecognizedTracks,
    deleteRecognizedTrack,
    playStation,
    currentStation,
    isPlaying,
  } = useAudio();

  const [activeTab, setActiveTab] = useState<'shazam' | 'stations'>(() => {
    return recognizedTracks.length > 0 ? 'shazam' : 'stations';
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const shownTracks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recognizedTracks;
    return recognizedTracks.filter((t) => `${t.artist} ${t.title} ${t.stationName}`.toLowerCase().includes(q));
  }, [recognizedTracks, query]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Сегодня в ${timeStr}`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ` в ${timeStr}`;
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openSearch = (service: 'spotify' | 'youtube' | 'apple' | 'yandex', artist: string, title?: string) => {
    const fullQuery = title ? `${artist} - ${title}` : artist;
    const encoded = encodeURIComponent(fullQuery);
    let url = '';
    switch (service) {
      case 'youtube':
        url = `https://www.youtube.com/results?search_query=${encoded}`;
        break;
      case 'spotify':
        url = `https://open.spotify.com/search/${encoded}`;
        break;
      case 'apple':
        url = `https://music.apple.com/search?term=${encodeURIComponent(`${artist} ${title || ''}`)}`;
        break;
      case 'yandex':
        url = `https://music.yandex.ru/search?text=${encoded}`;
        break;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-cyan-400" />
            <span>Треки из эфира и история</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Песни, которые звучали в эфире у вас (если станция передаёт название), и история прослушанных станций
          </p>
        </div>

        {/* Clear buttons */}
        {activeTab === 'shazam' && recognizedTracks.length > 0 && (
          <button
            onClick={clearRecognizedTracks}
            className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-red-500/40 text-xs font-semibold text-zinc-400 hover:text-red-400 flex items-center gap-2 self-start sm:self-auto transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Очистить треки</span>
          </button>
        )}

        {activeTab === 'stations' && history.length > 0 && (
          <button
            onClick={clearHistory}
            className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-red-500/40 text-xs font-semibold text-zinc-400 hover:text-red-400 flex items-center gap-2 self-start sm:self-auto transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Очистить историю станций</span>
          </button>
        )}
      </div>

      {/* Segmented View Switcher: Shazam vs Stations */}
      <div className="flex items-center gap-2 p-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl w-fit shadow-lg">
        <button
          onClick={() => setActiveTab('shazam')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'shazam'
              ? 'bg-gradient-to-r from-cyan-500 to-violet-400 text-zinc-950 shadow-md shadow-cyan-500/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Треки из эфира</span>
          <span
            className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'shazam'
                ? 'bg-zinc-950/30 text-zinc-950'
                : 'bg-zinc-800 text-cyan-300'
            }`}
          >
            {recognizedTracks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('stations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'stations'
              ? 'bg-gradient-to-r from-cyan-500 to-violet-400 text-zinc-950 shadow-md shadow-cyan-500/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <RadioTower className="w-4 h-4" />
          <span>История станций</span>
          <span
            className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'stations'
                ? 'bg-zinc-950/30 text-zinc-950'
                : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            {history.length}
          </span>
        </button>
      </div>

      {/* TAB 1: RECOGNIZED SONGS (SHAZAM) */}
      {activeTab === 'shazam' && (
        <div className="space-y-3">
          {recognizedTracks.length > 0 && (
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Найти трек, исполнителя или станцию…"
                className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-cyan-500/50 outline-none text-sm text-white placeholder:text-zinc-500"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white" aria-label="Очистить поиск">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          {recognizedTracks.length > 0 && shownTracks.length === 0 && (
            <p className="text-sm text-zinc-500 py-6 text-center">Ничего не найдено по запросу «{query}»</p>
          )}
          {recognizedTracks.length === 0 ? (
            <div className="py-20 text-center text-zinc-400 bg-zinc-950/40 rounded-3xl border border-zinc-900">
              <Sparkles className="w-12 h-12 mx-auto text-cyan-500/50 mb-3" />
              <h3 className="text-base font-bold text-white mb-1">Пока нет треков</h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Включайте радио! Если станция передаёт название песни, оно само появится здесь — только настоящие песни с исполнителем, без рекламы и шума.
              </p>
            </div>
          ) : (
            shownTracks.map((track) => (
              <div
                key={track.id}
                className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/90 hover:border-cyan-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg group"
              >
                {/* Left: Artwork + Track Details */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shrink-0 bg-zinc-900 border border-white/10 shadow-md relative group-hover:scale-105 transition-transform">
                    {track.artworkUrl ? (
                      <LiteImg
                        src={track.artworkUrl}
                        alt={`${track.artist} - ${track.title}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-950 to-violet-950 text-cyan-400">
                        <Music2 className="w-7 h-7" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        В ЭФИРЕ
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {formatTime(track.detectedAt)}
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-extrabold text-white truncate group-hover:text-cyan-300 transition-colors">
                      {track.title}
                    </h4>

                    <div className="text-xs font-semibold text-violet-400 truncate">
                      {track.artist}
                    </div>

                    <div className="text-[11px] text-zinc-400 font-medium truncate mt-0.5 flex items-center gap-1.5">
                      <Radio className="w-3 h-3 text-zinc-500 shrink-0" />
                      <span>{track.stationName}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Search in 1-Click (YouTube, Spotify, Apple, Yandex) + Copy + Delete */}
                <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
                  {/* YouTube */}
                  <button
                    onClick={() => openSearch('youtube', track.artist, track.title)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-cyan-500/20 text-zinc-300 hover:text-cyan-400 border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Искать на YouTube"
                  >
                    <Youtube className="w-3.5 h-3.5 text-cyan-500" />
                    <span>YouTube</span>
                  </button>

                  {/* Яндекс Музыка */}
                  <button
                    onClick={() => openSearch('yandex', track.artist, track.title)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-yellow-500/20 text-zinc-300 hover:text-yellow-300 border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Искать в Яндекс Музыке"
                  >
                    <Music2 className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Яндекс</span>
                  </button>

                  {/* Spotify */}
                  <button
                    onClick={() => openSearch('spotify', track.artist, track.title)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-violet-500/20 text-zinc-300 hover:text-violet-400 border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Искать в Spotify"
                  >
                    <Disc3 className="w-3.5 h-3.5 text-violet-400" />
                    <span>Spotify</span>
                  </button>

                  {/* Apple Music */}
                  <button
                    onClick={() => openSearch('apple', track.artist, track.title)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-pink-500/20 text-zinc-300 hover:text-pink-400 border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Искать в Apple Music"
                  >
                    <Music2 className="w-3.5 h-3.5 text-pink-400" />
                    <span>Apple Music</span>
                  </button>

                  {/* Copy button */}
                  <button
                    onClick={() => handleCopy(track.id, `${track.artist} - ${track.title}`)}
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                    title="Скопировать название трека"
                  >
                    {copiedId === track.id ? (
                      <Check className="w-3.5 h-3.5 text-violet-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Delete from list */}
                  <button
                    onClick={() => deleteRecognizedTrack(track.id)}
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 border border-zinc-800 transition-colors"
                    title="Удалить из списка"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: PLAYED STATIONS HISTORY */}
      {activeTab === 'stations' && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="py-20 text-center text-zinc-400 bg-zinc-950/40 rounded-3xl border border-zinc-900">
              <Clock className="w-12 h-12 mx-auto text-zinc-600 mb-3 opacity-50" />
              <h3 className="text-base font-bold text-white mb-1">История станций пуста</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Здесь будут сохраняться радиостанции, которые вы слушали в эфире
              </p>
            </div>
          ) : (
            history.map((item) => {
              const isCurrent = currentStation?.stationuuid === item.stationUuid && isPlaying;
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isCurrent
                      ? 'bg-zinc-900/90 border-violet-500/40 shadow-lg shadow-violet-500/10'
                      : 'bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  {/* Left: Station info + Play button */}
                  <div className="flex items-center gap-4 min-w-0">
                    <button
                      onClick={() => {
                        const dummyStation: Station = {
                          stationuuid: item.stationUuid,
                          name: item.stationName,
                          url: '',
                          url_resolved: '',
                          favicon: item.stationFavicon,
                        };
                        playStation(dummyStation);
                      }}
                      className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/10 hover:bg-violet-500/20 text-white flex items-center justify-center shrink-0 transition-colors"
                    >
                      {isCurrent ? (
                        <Pause className="w-5 h-5 text-violet-400 fill-violet-400" />
                      ) : (
                        <Play className="w-5 h-5 text-cyan-400 fill-cyan-400 ml-0.5" />
                      )}
                    </button>

                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-black/50 border border-white/5">
                      {item.stationFavicon && item.stationFavicon.startsWith('http') ? (
                        <LiteImg
                          src={item.stationFavicon}
                          alt={item.stationName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500">
                          <Radio className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-bold text-white truncate">{item.stationName}</h4>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {formatTime(item.playedAt)}
                        </span>
                      </div>
                      <p className="text-xs text-violet-400 truncate font-mono">
                        {item.title || item.stationName}
                      </p>
                    </div>
                  </div>

                  {/* Right: Search on music services */}
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
                    <button
                      onClick={() => openSearch('youtube', item.title || item.stationName)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-cyan-500/20 text-zinc-300 hover:text-cyan-400 border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Искать трек в YouTube Music"
                    >
                      <Youtube className="w-3.5 h-3.5 text-cyan-500" />
                      <span>YouTube</span>
                    </button>

                    <button
                      onClick={() => openSearch('spotify', item.title || item.stationName)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-violet-500/20 text-zinc-300 hover:text-violet-400 border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Искать трек в Spotify"
                    >
                      <Disc3 className="w-3.5 h-3.5 text-violet-400" />
                      <span>Spotify</span>
                    </button>

                    <button
                      onClick={() => handleCopy(item.id, item.title || item.stationName)}
                      className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                      title="Скопировать название"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-violet-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
