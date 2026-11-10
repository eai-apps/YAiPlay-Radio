import React, { useState } from 'react';
import { X, Send, Loader2, CheckCircle, LifeBuoy } from 'lucide-react';
import { api, hasApi } from '../services/apiService';

interface Props {
  onClose: () => void;
  telegramUrl?: string;
  contactEmail?: string;
  initialTopic?: string;
}

const TOPICS = ['Вопрос', 'Не работает станция', 'Предложить станцию', 'Идея / пожелание', 'Правообладателю', 'Другое'];

/** «Написать в поддержку»: сообщение попадает в админку (и в Telegram владельца, если настроено) */
export const SupportModal: React.FC<Props> = ({ onClose, telegramUrl, contactEmail, initialTopic }) => {
  const [topic, setTopic] = useState(initialTopic || TOPICS[0]);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const server = hasApi();

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 3) return setError('Напишите сообщение');
    setError(null);
    setState('sending');
    try {
      await api('/support', { body: { topic, text, name, contact, page: window.location.pathname } });
      setState('sent');
    } catch (err: any) {
      setError(err?.message || 'Не удалось отправить');
      setState('idle');
    }
  };

  const input = 'w-full text-sm py-2.5 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-violet-400 focus:outline-none text-white';

  return (
    <div onClick={onClose} className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-zinc-900 border border-zinc-800 p-5 pb-safe">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-violet-400" /> Написать в поддержку
          </h2>
          <button onClick={onClose} aria-label="Закрыть" className="p-2 text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {state === 'sent' ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle className="w-12 h-12 text-violet-400 mx-auto" />
            <p className="text-white font-semibold">Сообщение отправлено. Спасибо!</p>
            <p className="text-xs text-zinc-400">Если оставили контакт — ответим.</p>
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-zinc-800 text-white text-sm">
              Закрыть
            </button>
          </div>
        ) : server ? (
          <form onSubmit={send} className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {TOPICS.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTopic(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${topic === t ? 'bg-violet-500/20 text-violet-200 border-violet-500/40' : 'bg-zinc-950 text-zinc-300 border-zinc-800'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ваше сообщение…" className={input} maxLength={3000} />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя (необязательно)" className={input} maxLength={80} />
            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="E-mail или Telegram для ответа (необязательно)" className={input} maxLength={120} />
            {error && <p className="text-xs text-cyan-400">{error}</p>}
            <button type="submit" disabled={state === 'sending'} className="w-full py-3 rounded-xl bg-violet-500 hover:bg-violet-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2">
              {state === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Отправить
            </button>
            <p className="text-[11px] text-zinc-500">Отправляя сообщение, вы передаёте нам только то, что написали в этой форме.</p>
          </form>
        ) : (
          <div className="space-y-3 text-sm text-zinc-300">
            <p>Напишите нам:</p>
            {telegramUrl && (
              <a href={telegramUrl} target="_blank" rel="noreferrer" className="block w-full py-3 rounded-xl bg-sky-500 text-white font-bold text-center">
                Telegram
              </a>
            )}
            {contactEmail && (
              <a href={`mailto:${contactEmail}`} className="block w-full py-3 rounded-xl bg-zinc-800 text-white font-bold text-center">
                {contactEmail}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
