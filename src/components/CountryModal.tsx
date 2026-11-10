import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Globe, Check, Sparkles } from 'lucide-react';
import { CountryOption } from '../types/radio';
import { COUNTRIES, fetchDynamicCountries } from '../constants/countries';
import { useYAiSettings } from '../context/YAiSettingsContext';
import { hiddenCountrySet } from '../utils/visibility';

interface CountryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCountry: string;
  onSelectCountry: (countryCode: string) => void;
}

export const CountryModal: React.FC<CountryModalProps> = ({
  isOpen,
  onClose,
  selectedCountry,
  onSelectCountry,
}) => {
  const [filterText, setFilterText] = useState('');
  const [countriesList, setCountriesList] = useState<CountryOption[]>(COUNTRIES);
  const { settings } = useYAiSettings();
  const hiddenRadio = hiddenCountrySet(settings, 'radio');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchDynamicCountries().then((loaded) => {
      if (loaded && loaded.length > 0) {
        setCountriesList(loaded);
      }
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setFilterText('');
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const priorityCodes = new Set([
    '',
    'RU',
    'UA',
    'DE',
    'KZ',
    'BY',
    'US',
    'GB',
    'TR',
    'FR',
    'IT',
    'ES',
    'PL',
  ]);

  const filteredCountries = countriesList.filter((c) => {
    if (c.code && hiddenRadio.has(c.code.toUpperCase())) return false;
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  });

  const priorityCountries = filteredCountries.filter((c) =>
    priorityCodes.has(c.code.toUpperCase())
  );
  const otherCountries = filteredCountries.filter(
    (c) => !priorityCodes.has(c.code.toUpperCase())
  );

  const handleSelect = (code: string) => {
    onSelectCountry(code);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-400 text-zinc-950 font-bold">
              <Globe className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Выбрать страну вещания
              </h2>
              <p className="text-xs text-zinc-400">
                Радиостанции по странам и регионам
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-3 sm:p-4 border-b border-zinc-800/80 bg-zinc-950">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Быстрый поиск страны (напр. Россия, Германия, US)..."
              className="w-full bg-zinc-900/90 text-xs sm:text-sm text-white placeholder-zinc-500 pl-10 pr-9 py-2.5 rounded-xl border border-zinc-800 focus:border-cyan-400 focus:outline-none"
            />
            {filterText && (
              <button
                type="button"
                onClick={() => setFilterText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Countries Scroll Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 custom-scrollbar">
          {/* Priority Countries Section */}
          {priorityCountries.length > 0 && (
            <div>
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5 px-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Приоритетные страны</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {priorityCountries.map((c) => {
                  const isSelected = selectedCountry === c.code;
                  return (
                    <button
                      key={c.code || 'all'}
                      onClick={() => handleSelect(c.code)}
                      className={`flex items-center justify-between p-3 rounded-2xl text-xs sm:text-sm transition-all text-left group ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-cyan-500/10 border border-cyan-400/60 text-cyan-200 font-bold shadow-md shadow-cyan-500/10'
                          : 'bg-zinc-900/60 hover:bg-zinc-800/90 border border-zinc-800/80 text-zinc-200 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">
                          {c.flag}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-semibold text-sm text-white group-hover:text-cyan-300 transition-colors">
                            {c.name}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400">
                            {c.stationcount ? `${c.stationcount.toLocaleString()} радиостанций` : 'Эфир онлайн'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {c.code && (
                          <span className="text-[11px] font-mono font-bold text-zinc-400 group-hover:text-cyan-300 uppercase px-2 py-0.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
                            {c.code}
                          </span>
                        )}
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-cyan-400/20 border border-cyan-400 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-cyan-400" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Other Countries Section */}
          {otherCountries.length > 0 && (
            <div>
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2 px-1">
                Все страны мира ({otherCountries.length})
              </div>
              <div className="flex flex-col gap-1.5">
                {otherCountries.map((c) => {
                  const isSelected = selectedCountry === c.code;
                  return (
                    <button
                      key={c.code}
                      onClick={() => handleSelect(c.code)}
                      className={`flex items-center justify-between p-3 rounded-2xl text-xs sm:text-sm transition-all text-left group ${
                        isSelected
                          ? 'bg-cyan-500/20 border border-cyan-400/60 text-cyan-200 font-bold'
                          : 'bg-zinc-900/40 hover:bg-zinc-800/80 border border-zinc-800/60 text-zinc-300 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">
                          {c.flag}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-medium text-sm text-zinc-200 group-hover:text-white">
                            {c.name}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400">
                            {c.stationcount ? `${c.stationcount.toLocaleString()} станций` : 'Эфир онлайн'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-mono text-zinc-400 uppercase px-2 py-0.5 rounded-lg bg-zinc-950/80 border border-zinc-800/60">
                          {c.code}
                        </span>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-cyan-400/20 border border-cyan-400 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-cyan-400" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredCountries.length === 0 && (
            <div className="p-8 text-center text-zinc-500 text-xs">
              Страна не найдена. Попробуйте изменить поисковый запрос.
            </div>
          )}
        </div>

        {/* Modal Footer with explicit close button */}
        <div className="p-3 sm:p-4 border-t border-zinc-800/80 bg-zinc-900/50 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
            Всего доступно: {countriesList.length} стран
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-bold transition-all shadow active:scale-95 flex items-center justify-center gap-2 ml-auto"
          >
            <X className="w-4 h-4" />
            <span>✕ Закрыть окно (Esc)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
