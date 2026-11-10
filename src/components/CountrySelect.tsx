import React, { useState } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { COUNTRIES } from '../constants/countries';
import { CountryModal } from './CountryModal';

interface CountrySelectProps {
  selectedCountry: string;
  onSelectCountry: (countryCode: string) => void;
  className?: string;
  placeholder?: string;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  selectedCountry,
  onSelectCountry,
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedCountryObj =
    COUNTRIES.find((c) => c.code === selectedCountry) || {
      code: selectedCountry,
      name: selectedCountry ? `Страна (${selectedCountry})` : 'Все страны мира',
      flag: '🌍',
    };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-2 bg-zinc-900/90 hover:bg-zinc-800 text-xs font-semibold text-zinc-100 px-3 py-2 rounded-xl border border-zinc-800 hover:border-cyan-400/50 transition-all shadow-sm active:scale-95 group shrink-0 ${className}`}
        title="Выбрать страну вещания радиостанций"
      >
        <span className="text-base leading-none group-hover:scale-110 transition-transform">
          {selectedCountryObj.flag || '🌍'}
        </span>
        <span className="text-zinc-400 text-[11px] hidden sm:inline">Страна:</span>
        <span className="font-bold text-white max-w-[130px] truncate">
          {selectedCountryObj.name}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-cyan-400 ml-0.5 group-hover:translate-y-0.5 transition-transform" />
      </button>

      <CountryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedCountry={selectedCountry}
        onSelectCountry={onSelectCountry}
      />
    </>
  );
};
