import React from 'react';
import { splitTrack } from '../services/itunesService';

/** Кнопки «открыть песню» в музыкальных сервисах (поиск по исполнителю и названию) */
export const MusicLinks: React.FC<{ track: string; compact?: boolean }> = ({ track, compact }) => {
  const parts = splitTrack(track);
  if (!parts) return null;
  const q = encodeURIComponent(`${parts.artist} ${parts.title}`);
  const services: Array<[string, string, string]> = [
    ['Spotify', `https://open.spotify.com/search/${q}`, 'bg-[#1DB954] text-black'],
    ['YouTube', `https://www.youtube.com/results?search_query=${q}`, 'bg-[#FF0000] text-white'],
    ['YT Music', `https://music.youtube.com/search?q=${q}`, 'bg-zinc-100 text-[#FF0000]'],
    ['Apple Music', `https://music.apple.com/search?term=${q}`, 'bg-gradient-to-r from-[#FA233B] to-[#FB5C74] text-white'],
    ['Яндекс Музыка', `https://music.yandex.ru/search?text=${q}`, 'bg-[#FFCC00] text-black'],
  ];
  return (
    <div className={`flex gap-1.5 overflow-x-auto scrollbar-none ${compact ? '' : 'flex-wrap justify-center'}`}>
      {services.map(([name, href, cls]) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap hover:brightness-110 active:scale-95 transition ${cls}`}
        >
          {name}
        </a>
      ))}
    </div>
  );
};
