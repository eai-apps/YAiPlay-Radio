import { YAiSettings } from '../types/radio';
import { isRuStoreBuild, isStoreBuild, RUSTORE_TV_BLOCK } from './platform';

/** Разделы, которые владелец может выключить в админке («Видимость») */
export const TOGGLABLE_SECTIONS: { id: string; label: string }[] = [
  { id: 'artists', label: '🎤 Артисты и саундтреки' },
  { id: 'genres', label: '🎵 Жанры' },
  { id: 'globe', label: '🌍 Глобус радио' },
  { id: 'moods', label: '✨ Настроение' },
  { id: 'webcams', label: '📷 Веб-камеры' },
  { id: 'tv', label: '📺 Телеканалы' },
  { id: 'tv@rustore', label: '📺 Телеканалы — в приложении RuStore' },
  { id: 'search', label: '🔍 Поиск' },
  { id: 'history', label: '🕘 История' },
  { id: 'pro', label: '👑 Оформление' },
  { id: 'apps', label: '📱 Mobile Apps' },
  { id: 'nativeplayer', label: '🎛 Нативный плеер Android (эквалайзер, визуализация, http-станции)' },
];

export const isSectionHidden = (s: Pick<YAiSettings, 'hiddenSections'>, id: string) => {
  const h = s.hiddenSections || [];
  if (h.includes(id)) return true;
  // Google Play / App Store — ТВ нет вообще
  if (id === 'tv' && isStoreBuild) return true;
  // Только в приложении из RuStore: отдельный переключатель «… — в приложении RuStore»
  if (isRuStoreBuild && h.includes(`${id}@rustore`)) return true;
  // Разделы «@rustore» и «Mobile Apps» (ссылки на APK) в магазинных версиях не показываем
  if ((isRuStoreBuild || isStoreBuild) && id === 'apps') return true;
  return false;
};

export type CountryScope = 'radio' | 'tv' | 'webcams';
export const hiddenCountrySet = (s: Pick<YAiSettings, 'hiddenCountries'>, scope: CountryScope) => {
  const set = new Set((s.hiddenCountries?.[scope] || []).map((c) => c.toUpperCase()));
  if (scope === 'tv' && isRuStoreBuild) RUSTORE_TV_BLOCK.countries.forEach((c) => set.add(c));
  return set;
};

/** ТВ-канал разрешён в текущей версии (в RuStore — без новостей, религии и каналов РФ/Украины) */
export const tvChannelAllowed = (ch: { country?: string; categories?: string[]; name?: string }) => {
  if (!isRuStoreBuild) return true;
  const cc = (ch.country || '').toUpperCase();
  if (RUSTORE_TV_BLOCK.countries.includes(cc)) return false;
  if ((ch.categories || []).some((c) => RUSTORE_TV_BLOCK.categories.includes(c))) return false;
  if (ch.name && RUSTORE_TV_BLOCK.newsNames.test(ch.name)) return false;
  return true;
};
