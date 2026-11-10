import React, { useEffect, useState } from 'react';
import { X, RotateCcw, Sliders, Timer, Waves } from 'lucide-react';
import { BUFFER_OPTIONS, EQ_PRESETS, SoundSettings, applySound, loadSound } from '../services/nativeAudio';
import { Visualizer } from './Visualizer';

/**
 * «Звук» — только в Android-приложении с нативным плеером (там эквалайзер действительно меняет звук):
 * 10-полосный эквалайзер, готовые настройки, усиление басов, буфер от обрывов, визуализация.
 */
const FREQ_LABELS = ['31', '62', '125', '250', '500', '1к', '2к', '4к', '8к', '16к'];

export const EqualizerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [s, setS] = useState<SoundSettings>(() => loadSound());

  useEffect(() => {
    applySound(s);
    window.dispatchEvent(new CustomEvent('yaiplayradio_sound_changed'));
  }, [s]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setGain = (i: number, v: number) =>
    setS((p) => ({ ...p, eqEnabled: true, preset: 'custom', gains: p.gains.map((g, j) => (j === i ? v : g)) }));
  const pickPreset = (id: string) => {
    const pr = EQ_PRESETS.find((x) => x.id === id);
    if (pr) setS((p) => ({ ...p, eqEnabled: id !== 'flat', preset: id, gains: [...pr.gains], bass: pr.bass }));
  };

  const sw = (on: boolean) => `relative w-11 h-6 rounded-full shrink-0 transition-colors ${on ? 'bg-violet-500' : 'bg-zinc-700'}`;
  const knob = (on: boolean) => `absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`;

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-zinc-950/95 border-b border-zinc-900">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-violet-400" /> Звук
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400" aria-label="Закрыть">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Живой спектр */}
          <div className="h-24 rounded-2xl bg-black/60 border border-zinc-900 overflow-hidden">
            <Visualizer className="w-full h-full" />
          </div>

          {/* Эквалайзер */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Эквалайзер · 10 полос</h3>
                <p className="text-xs text-zinc-500">Меняет звук сразу, на любой станции</p>
              </div>
              <button onClick={() => setS((p) => ({ ...p, eqEnabled: !p.eqEnabled }))} className={sw(s.eqEnabled)} aria-label="Включить эквалайзер">
                <span className={knob(s.eqEnabled)} />
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {EQ_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pickPreset(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border ${
                    s.preset === p.id ? 'bg-violet-500 text-zinc-950 border-violet-500' : 'bg-zinc-900 text-zinc-300 border-zinc-800'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <div className={`mt-3 grid grid-cols-10 gap-1 ${s.eqEnabled ? '' : 'opacity-40'}`}>
              {s.gains.map((g, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-mono text-violet-300 h-4">{g > 0 ? `+${g}` : g}</span>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={1}
                    value={g}
                    onChange={(e) => setGain(i, Number(e.target.value))}
                    aria-label={`${FREQ_LABELS[i]} Гц`}
                    className="accent-violet-400 h-36 w-6 [writing-mode:vertical-lr] [direction:rtl] cursor-pointer"
                  />
                  <span className="text-[10px] text-zinc-500">{FREQ_LABELS[i]}</span>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-300 font-semibold">Усиление басов</span>
                <span className="font-mono text-cyan-400">+{s.bass} дБ</span>
              </div>
              <input
                type="range"
                min={0}
                max={12}
                step={1}
                value={s.bass}
                onChange={(e) => setS((p) => ({ ...p, eqEnabled: true, bass: Number(e.target.value) }))}
                className="w-full accent-cyan-400"
                aria-label="Усиление басов"
              />
            </div>

            <button onClick={() => pickPreset('flat')} className="mt-3 text-xs text-zinc-400 hover:text-white flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Сбросить
            </button>
          </section>

          {/* Буфер */}
          <section>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Timer className="w-4 h-4 text-cyan-400" /> Защита от обрывов
            </h3>
            <p className="text-xs text-zinc-500 mb-3">
              Сколько эфира запасать заранее. Больше запас — меньше обрывов на слабой связи, но станция включается чуть дольше.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {BUFFER_OPTIONS.map((o) => (
                <button
                  key={o.ms}
                  onClick={() => setS((p) => ({ ...p, bufferMs: o.ms }))}
                  className={`p-3 rounded-xl text-left border ${s.bufferMs === o.ms ? 'bg-cyan-500/15 border-cyan-400/60' : 'bg-zinc-900 border-zinc-800'}`}
                >
                  <div className="text-sm font-bold text-white">{o.label}</div>
                  <div className="text-[11px] text-zinc-400">{o.hint}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Визуализация */}
          <section className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Waves className="w-4 h-4 text-fuchsia-400" /> Визуализация в плеере
              </h3>
              <p className="text-xs text-zinc-500">Живой спектр музыки вместо обложки в полноэкранном плеере и на ТВ</p>
            </div>
            <button onClick={() => setS((p) => ({ ...p, viz: !p.viz }))} className={sw(s.viz)} aria-label="Визуализация">
              <span className={knob(s.viz)} />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};
