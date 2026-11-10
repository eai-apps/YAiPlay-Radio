import React, { useState } from 'react';
import { X, Send, Radio, Check, MessageSquare } from 'lucide-react';

interface SuggestStationModalProps {
  isOpen: boolean;
  onClose: () => void;
  telegramUrl: string;
}

export const SuggestStationModal: React.FC<SuggestStationModalProps> = ({
  isOpen,
  onClose,
  telegramUrl,
}) => {
  const [stationName, setStationName] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setStationName('');
      setStreamUrl('');
      setComment('');
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-md p-6 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-theme-subtle text-theme-accent rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Предложить радиостанцию</h2>
              <p className="text-xs text-zinc-400">Добавим в общий каталог YAi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="py-8 text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center mb-3">
              <Check className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">Спасибо за предложение!</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs">
              Мы проверим аудиопоток и добавим станцию в каталог в следующем обновлении.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 mt-4">
            <div>
              <label className="text-xs text-zinc-300 font-medium block mb-1">
                Название станции *:
              </label>
              <input
                type="text"
                required
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                placeholder="например, Record Chillout"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-theme-accent"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-300 font-medium block mb-1">
                URL аудиопотока (MP3 / AAC / HLS) *:
              </label>
              <input
                type="url"
                required
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="https://stream.radioserver.com/live"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-theme-accent"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-300 font-medium block mb-1">
                Жанр или комментарий разработчику:
              </label>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Жанр, город вещания, сайт..."
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-theme-accent"
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-theme-accent hover:opacity-90 text-white font-bold text-xs rounded-xl transition-all shadow-lg"
              >
                Отправить предложение
              </button>

              <a
                href={telegramUrl}
                target="_blank"
                rel="noreferrer"
                className="text-center text-xs text-zinc-400 hover:text-sky-400 transition-colors py-1"
              >
                Или напишите нам напрямую в Telegram →
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
