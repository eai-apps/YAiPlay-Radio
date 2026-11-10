import React, { useState } from 'react';
import { X, Moon, Clock, Check, BellOff } from 'lucide-react';
import { useAudio } from '../context/AudioPlayerContext';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({ isOpen, onClose }) => {
  const { sleepTimerMinutes, sleepTimerRemainingSec, setSleepTimer } = useAudio();
  const [customInput, setCustomInput] = useState('');

  if (!isOpen) return null;

  const presets = [15, 30, 45, 60];

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCustomApply = () => {
    const parsed = parseInt(customInput, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 360) {
      setSleepTimer(parsed);
      setCustomInput('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-sm p-6 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-theme-subtle text-theme-accent rounded-xl">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Таймер сна</h2>
              <p className="text-xs text-zinc-400">Автовыключение музыки</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status if active */}
        {sleepTimerRemainingSec !== null && sleepTimerRemainingSec > 0 && (
          <div className="mt-4 p-3 bg-theme-subtle border border-theme-subtle rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-theme-accent animate-pulse" />
              <span className="text-xs text-zinc-300">До выключения:</span>
            </div>
            <span className="text-sm font-mono font-bold text-theme-accent tabular-nums">
              {formatRemaining(sleepTimerRemainingSec)}
            </span>
          </div>
        )}

        {/* Presets Grid */}
        <div className="grid grid-cols-2 gap-2.5 mt-5">
          {presets.map((mins) => {
            const isActive = sleepTimerMinutes === mins;
            return (
              <button
                key={mins}
                onClick={() => {
                  setSleepTimer(mins);
                  onClose();
                }}
                className={`py-3 px-4 rounded-2xl font-medium text-sm flex items-center justify-between border transition-all ${
                  isActive
                    ? 'bg-theme-accent border-theme-accent text-white shadow-lg shadow-theme-glow'
                    : 'bg-zinc-800/60 hover:bg-zinc-800 border-zinc-700/60 text-zinc-200'
                }`}
              >
                <span>{mins} минут</span>
                {isActive && <Check className="w-4 h-4 text-white" />}
              </button>
            );
          })}
        </div>

        {/* Custom Input */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80">
          <label className="text-xs text-zinc-400 block mb-2 font-medium">
            Своё время (в минутах):
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="360"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="например, 20"
              className="flex-1 bg-zinc-800/70 border border-zinc-700/60 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-theme-accent font-mono"
            />
            <button
              onClick={handleCustomApply}
              disabled={!customInput}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-sm font-medium rounded-xl text-white transition-colors"
            >
              Задать
            </button>
          </div>
        </div>

        {/* Turn off option if timer active */}
        {sleepTimerRemainingSec !== null && (
          <button
            onClick={() => {
              setSleepTimer(null);
              onClose();
            }}
            className="w-full mt-4 py-2.5 px-4 bg-zinc-800/40 hover:bg-red-950/30 border border-zinc-700/40 hover:border-red-900/40 text-red-400 hover:text-red-300 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <BellOff className="w-4 h-4" />
            Отключить таймер
          </button>
        )}
      </div>
    </div>
  );
};
