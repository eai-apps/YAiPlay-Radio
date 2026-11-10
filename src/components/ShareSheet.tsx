import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, QrCode, Share2, RefreshCw } from 'lucide-react';
import { Station } from '../types/radio';
import { StationLogo } from './StationLogo';
import { checkSharePreview, shareTo, ShareTarget, canSystemShare, stationLink, stationShareText, playlistLink, playlistShareText } from '../services/share';

export type ShareSubject =
  | { kind: 'station'; station: Station }
  | { kind: 'playlist'; name: string; stations: Station[] };

const EVENT = 'YAi_share';
/** Открыть окно «Поделиться» из любого места сайта */
export const openShare = (s: ShareSubject) => window.dispatchEvent(new CustomEvent(EVENT, { detail: s }));

const TARGETS: { id: ShareTarget; label: string; bg: string; icon: React.ReactNode }[] = [
  { id: 'telegram', label: 'Telegram', bg: 'bg-[#229ED9]', icon: <span className="text-xl">✈️</span> },
  { id: 'whatsapp', label: 'WhatsApp', bg: 'bg-[#25D366]', icon: <span className="text-xl">💬</span> },
  { id: 'viber', label: 'Viber', bg: 'bg-[#7360F2]', icon: <span className="text-xl">📞</span> },
];

/** Окно «Поделиться»: станцией или плейлистом — с подписью-рекомендацией, мессенджерами, ссылкой и QR */
export const ShareSheet: React.FC = () => {
  const [subject, setSubject] = useState<ShareSubject | null>(null);
  const [variant, setVariant] = useState(0);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState(false);
  const [, setPreviewReady] = useState(false);
  useEffect(() => {
    if (subject) checkSharePreview().then(setPreviewReady);
  }, [subject]);
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const h = (e: Event) => {
      const s = (e as CustomEvent).detail as ShareSubject;
      setSubject(s);
      setVariant(0);
      setQr(false);
      setCopied(false);
    };
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, []);

  const url = !subject ? '' : subject.kind === 'station' ? stationLink(subject.station) : playlistLink(subject.name, subject.stations);
  useEffect(() => {
    if (!subject) return;
    setText(subject.kind === 'station' ? stationShareText(subject.station, variant) : playlistShareText(subject.name, subject.stations.length, variant));
  }, [subject, variant]);

  useEffect(() => {
    if (!qr || !canvas.current || !url) return;
    import('qrcode').then((QR) => QR.toCanvas(canvas.current!, url, { width: 220, margin: 1, color: { dark: '#09090b', light: '#ffffff' } }).catch(() => {}));
  }, [qr, url]);

  if (!subject) return null;
  const close = () => setSubject(null);
  const title = subject.kind === 'station' ? subject.station.name : `Плейлист «${subject.name}»`;

  const send = (t: ShareTarget) => {
    // без await перед вызовом — так требует Safari на iPhone
    const r = shareTo(t, text, url, title);
    Promise.resolve(r).then((ok) => {
      // «копировать» — или системное окно не открылось и мы скопировали текст вместо него
      if ((t === 'copy' && ok) || (t === 'system' && !ok)) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in" onClick={close}>
      <div
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-zinc-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-violet-400" /> Поделиться
          </h2>
          <button onClick={close} className="p-2 -mr-2 text-zinc-400 hover:text-white" aria-label="Закрыть">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Карточка того, чем делимся */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-violet-500/15 to-cyan-500/10 border border-violet-500/30 mb-4">
          {subject.kind === 'station' ? (
            <span className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
              <StationLogo favicon={subject.station.favicon} homepage={subject.station.homepage} name={subject.station.name} textClass="text-sm" />
            </span>
          ) : (
            <span className="relative w-14 h-14 shrink-0">
              {subject.stations.slice(0, 3).map((st, i) => (
                <span key={st.stationuuid} className="absolute w-10 h-10 rounded-lg overflow-hidden border-2 border-zinc-900" style={{ left: i * 7, top: i * 7 }}>
                  <StationLogo favicon={st.favicon} homepage={st.homepage} name={st.name} textClass="text-[10px]" />
                </span>
              ))}
            </span>
          )}
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-violet-300 uppercase tracking-wider">{subject.kind === 'station' ? '💚 Моя рекомендация' : `🎶 ${subject.stations.length} станций`}</div>
            <div className="text-sm font-extrabold text-white truncate">{title}</div>
          </div>
        </div>

        {/* Подпись — можно поправить */}
        <div className="relative mb-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="w-full text-sm rounded-2xl bg-zinc-950 border border-zinc-800 focus:border-violet-400 focus:outline-none p-3 pr-11 text-zinc-100 resize-none"
          />
          <button
            onClick={() => setVariant((v) => v + 1)}
            title="Другая подпись"
            className="absolute right-2 top-2 p-2 rounded-xl bg-zinc-800 text-violet-300 hover:bg-zinc-700"
            aria-label="Другая подпись"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          {TARGETS.map((t) => (
            <button key={t.id} onClick={() => send(t.id)} className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-zinc-800 active:scale-95">
              <span className={`w-12 h-12 rounded-full ${t.bg} flex items-center justify-center shadow-lg`}>{t.icon}</span>
              <span className="text-[11px] text-zinc-300 font-semibold">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {canSystemShare() && (
            <button onClick={() => send('system')} className="col-span-2 py-3 rounded-2xl bg-violet-500 text-zinc-950 text-sm font-extrabold flex items-center justify-center gap-2 active:scale-[0.98]">
              <Share2 className="w-4 h-4" /> Другие приложения и сообщения
            </button>
          )}
          <button onClick={() => send('copy')} className="py-3 rounded-2xl bg-zinc-800 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98]">
            {copied ? <Check className="w-4 h-4 text-violet-400" /> : <Copy className="w-4 h-4" />} {copied ? 'Скопировано — вставьте в чат' : 'Копировать'}
          </button>
          <button onClick={() => setQr((v) => !v)} className={`py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] ${qr ? 'bg-violet-500/20 text-violet-200' : 'bg-zinc-800 text-white'}`}>
            <QrCode className="w-4 h-4" /> QR-код
          </button>
        </div>

        {qr && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <canvas ref={canvas} className="rounded-2xl bg-white p-2" />
            <p className="text-xs text-zinc-400 text-center">Наведите камеру другого телефона — откроется YAi Radio{subject.kind === 'station' ? ' с этой станцией' : ' с этим плейлистом'}</p>
          </div>
        )}
        <p className="mt-4 text-[11px] text-zinc-500 text-center break-all">{url.length > 90 ? url.slice(0, 90) + '…' : url}</p>
      </div>
    </div>,
    document.body
  );
};
