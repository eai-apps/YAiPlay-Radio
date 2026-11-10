import React, { useState } from 'react';
import { Plus, Trash2, Tv } from 'lucide-react';
import { LiveTvChannel } from '../types/radio';

interface Props {
  channels: LiveTvChannel[];
  onChange: (list: LiveTvChannel[]) => void;
}

const CATS: Array<[LiveTvChannel['category'], string]> = [
  ['news', 'Новости'],
  ['music', 'Музыка'],
  ['nature', 'Природа'],
  ['space', 'Космос'],
  ['fashion', 'Мода'],
  ['sport', 'Спорт'],
];

/** Админка → свои телеканалы (сохраняются в content.json) */
export const AdminTvTab: React.FC<Props> = ({ channels, onChange }) => {
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('RU');
  const [category, setCategory] = useState<LiveTvChannel['category']>('music');
  const [hls, setHls] = useState('');
  const [site, setSite] = useState('');
  const [yt, setYt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Укажите название');
    if (hls && !/^https:\/\/.+\.m3u8(\?.*)?$/i.test(hls.trim())) return setError('Поток должен быть https-ссылкой на .m3u8');
    if (!hls && !site) return setError('Нужен поток .m3u8 или ссылка на официальный сайт');
    const ch: LiveTvChannel = {
      id: `custom-tv-${Date.now()}`,
      name: name.trim(),
      logo: '',
      country: countryCode.toUpperCase(),
      countryCode: countryCode.toUpperCase(),
      flag: '',
      category,
      hlsStreamUrl: hls.trim() || undefined,
      officialSiteUrl: site.trim() || undefined,
      youtubeLiveUrl: yt.trim() || undefined,
    };
    onChange([ch, ...channels]);
    setName('');
    setHls('');
    setSite('');
    setYt('');
  };

  const input = 'w-full text-xs py-2.5 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-cyan-400 focus:outline-none text-white';

  return (
    <div className="p-5 sm:p-6 space-y-5 max-h-[70vh] overflow-y-auto">
      <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-zinc-300 leading-relaxed">
        <b className="text-white">Только официальные открытые потоки.</b> Добавляйте канал, только если сам телеканал публично раздаёт этот поток
        (ссылка есть на его официальном сайте). Если поток не открывается на сайте, у посетителя будет кнопка «Официальный сайт».
        YouTube-эфиры встроить нельзя — укажите ссылку на канал, будет кнопка «YouTube».
      </div>

      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input className={input} placeholder="Название канала *" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex gap-2">
          <input className={`${input} w-20`} placeholder="RU" maxLength={2} value={countryCode} onChange={(e) => setCountryCode(e.target.value)} />
          <select className={input} value={category} onChange={(e) => setCategory(e.target.value as any)}>
            {CATS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <input className={`${input} sm:col-span-2`} placeholder="Поток HLS: https://…/index.m3u8" value={hls} onChange={(e) => setHls(e.target.value)} />
        <input className={input} placeholder="Официальный сайт: https://…" value={site} onChange={(e) => setSite(e.target.value)} />
        <input className={input} placeholder="YouTube канал: https://youtube.com/@…/live" value={yt} onChange={(e) => setYt(e.target.value)} />
        {error && <p className="text-xs text-cyan-400 sm:col-span-2">{error}</p>}
        <button type="submit" className="sm:col-span-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Добавить канал
        </button>
      </form>

      <div className="space-y-1.5">
        {channels.length === 0 && <p className="text-xs text-zinc-500">Своих каналов пока нет.</p>}
        {channels.map((ch) => (
          <div key={ch.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
            <Tv className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{ch.name}</div>
              <div className="text-[10px] text-zinc-500 truncate">{ch.hlsStreamUrl || ch.officialSiteUrl}</div>
            </div>
            <button type="button" onClick={() => onChange(channels.filter((c) => c.id !== ch.id))} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400" title="Удалить">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
