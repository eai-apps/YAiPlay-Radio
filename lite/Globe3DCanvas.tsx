import React from 'react';
import { WEBCAMS_DATA } from '../src/constants/webcams';
import { useYAiSettings } from '../src/context/YAiSettingsContext';
import { hiddenCountrySet } from '../src/utils/visibility';
import type { WebcamCity } from '../src/types/radio';
export function Globe3DCanvas({ selectedCityId, onSelectCity, className }: { selectedCityId: string | null; onSelectCity: (city: WebcamCity) => void; className?: string }) {
  const { settings } = useYAiSettings();
  const hidden = hiddenCountrySet(settings, 'webcams');
  return <div className={className}><label>Камера на карте<select value={selectedCityId || ''} onChange={(e) => {
    const city = WEBCAMS_DATA.find((c) => c.id === e.target.value); if (city) onSelectCity(city);
  }}><option value="">Выберите город</option>{WEBCAMS_DATA.filter((c) => !hidden.has((c.countryCode || '').toUpperCase())).map((c) => <option key={c.id} value={c.id}>{c.name} · {c.country}</option>)}</select></label></div>;
}
