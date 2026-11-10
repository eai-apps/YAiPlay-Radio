import React, { useState } from 'react';
import { useAudio } from '../context/AudioPlayerContext';
import { Station, RadioAlarm } from '../types/radio';
import { Bell, X, Check, Volume2, Calendar, Radio, Sparkles, Clock } from 'lucide-react';
import { pickStream } from '../services/streamQuality';
import { hasNative } from '../services/nativeBridge';

interface AlarmModalProps {
  onClose: () => void;
  favorites: Station[];
}

const DAYS_OF_WEEK = [
  { day: 1, label: 'Пн' },
  { day: 2, label: 'Вт' },
  { day: 3, label: 'Ср' },
  { day: 4, label: 'Чт' },
  { day: 5, label: 'Пт' },
  { day: 6, label: 'Сб' },
  { day: 0, label: 'Вс' },
];

export const AlarmModal: React.FC<AlarmModalProps> = ({ onClose, favorites }) => {
  const { alarm, setAlarm, currentStation, playlist } = useAudio();

  const [enabled, setEnabled] = useState<boolean>(alarm.enabled);
  const [time, setTime] = useState<string>(alarm.time || '07:30');
  const [stationUuid, setStationUuid] = useState<string>(
    alarm.stationUuid || currentStation?.stationuuid || ''
  );
  const [fadeDurationSec, setFadeDurationSec] = useState<number>(alarm.fadeDurationSec || 20);
  const [selectedDays, setSelectedDays] = useState<number[]>(alarm.days || [1, 2, 3, 4, 5]);

  const toggleDay = (d: number) => {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((item) => item !== d) : [...prev, d]
    );
  };

  const handleSave = () => {
    const targetStation =
      favorites.find((s) => s.stationuuid === stationUuid) ||
      playlist.find((s) => s.stationuuid === stationUuid) ||
      currentStation;

    const newAlarm: RadioAlarm = {
      enabled,
      time,
      stationUuid,
      stationName: targetStation?.name || 'Радио YAi',
      stationUrl: targetStation ? pickStream(targetStation).url : undefined,
      fadeDurationSec,
      days: selectedDays,
    };

    setAlarm(newAlarm);
    onClose();
  };

  // Combine stations available for selection
  const stationOptions = [
    ...(currentStation ? [currentStation] : []),
    ...favorites.filter((f) => f.stationuuid !== currentStation?.stationuuid),
  ];

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden text-zinc-100 my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-400/10 text-cyan-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Радио-будильник YAi</span>
                {enabled && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                    АКТИВЕН
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-400">
                {hasNative()
                  ? 'Сработает, даже если приложение закрыто'
                  : 'Просыпайтесь под любимую станцию с мягким звуком (сайт должен быть открыт)'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Main Toggle */}
          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-white">Включить будильник</div>
              <div className="text-xs text-zinc-400 mt-0.5">
                Автоматически начнет вещание в назначенное время
              </div>
            </div>

            <button
              onClick={() => setEnabled(!enabled)}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 ${
                enabled ? 'bg-gradient-to-r from-violet-500 to-cyan-400' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Time Picker */}
          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 flex flex-col items-center">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-3">
              Время пробуждения
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="px-6 py-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-3xl sm:text-4xl font-mono font-bold text-cyan-400 focus:outline-none focus:border-cyan-400 text-center tracking-widest"
            />
          </div>

          {/* Days of week */}
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2.5">
              Повторять по дням
            </label>
            <div className="grid grid-cols-7 gap-2">
              {DAYS_OF_WEEK.map((item) => {
                const isSelected = selectedDays.includes(item.day);
                return (
                  <button
                    key={item.day}
                    onClick={() => toggleDay(item.day)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-cyan-400 text-zinc-950 shadow-md font-extrabold'
                        : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Station Selection */}
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">
              Станция для пробуждения
            </label>
            {stationOptions.length === 0 ? (
              <div className="p-3 text-xs text-zinc-400 bg-zinc-950/40 rounded-xl border border-zinc-800">
                Выберите и включите станцию в приложении
              </div>
            ) : (
              <select
                value={stationUuid}
                onChange={(e) => setStationUuid(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-zinc-950/80 border border-zinc-700 text-sm text-white focus:outline-none focus:border-cyan-400"
              >
                {stationOptions.map((st) => (
                  <option key={st.stationuuid} value={st.stationuuid}>
                    {st.name} ({st.country || 'Эфир'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Fade-In Volume */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> Мягкое нарастание звука (Fade-In)
              </label>
              <span className="font-mono text-xs text-violet-400 font-bold">
                {fadeDurationSec} сек
              </span>
            </div>
            <div className="flex gap-2">
              {[10, 20, 30, 60].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setFadeDurationSec(sec)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    fadeDurationSec === sec
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                  }`}
                >
                  {sec} сек
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs text-zinc-400 hover:text-white font-medium"
          >
            Отмена
          </button>

          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-violet-500 to-cyan-400 text-zinc-950 font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Сохранить будильник</span>
          </button>
        </div>
      </div>
    </div>
  );
};
