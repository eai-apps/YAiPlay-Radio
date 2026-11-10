import { useCallback } from 'react';
import { Station } from '../types/radio';
import { useYAiSettings } from '../context/YAiSettingsContext';

/**
 * Свои станции владельца сайта. Хранятся в content.json (поле customStations),
 * поэтому их видят все посетители после публикации.
 */
export function useCustomStations() {
  const { settings, updateSettings } = useYAiSettings();
  const customStations: Station[] = (settings.customStations || []).map((s) => ({ ...s, isCustom: true }));

  const addCustomStation = useCallback(
    (station: {
      name: string;
      url: string;
      tags?: string;
      country?: string;
      countrycode?: string;
      bitrate?: number;
      codec?: string;
      favicon?: string;
    }) => {
      const newStation: Station = {
        stationuuid: `custom-${Date.now()}`,
        name: station.name.trim(),
        url: station.url.trim(),
        url_resolved: station.url.trim(),
        tags: station.tags?.trim() || '',
        country: station.country?.trim() || '',
        countrycode: (station.countrycode?.trim() || '').toUpperCase().slice(0, 2),
        bitrate: station.bitrate || 0,
        codec: station.codec || '',
        favicon: station.favicon?.trim() || '',
        isCustom: true,
      };
      updateSettings({ customStations: [newStation, ...(settings.customStations || [])] });
      return newStation;
    },
    [settings.customStations, updateSettings]
  );

  const deleteCustomStation = useCallback(
    (stationuuid: string) => {
      updateSettings({ customStations: (settings.customStations || []).filter((s) => s.stationuuid !== stationuuid) });
    },
    [settings.customStations, updateSettings]
  );

  return { customStations, addCustomStation, deleteCustomStation };
}
