/** Страна посетителя: через наш сервер (данные Cloudflare по IP). Угадывание по языку — только запасной вариант. */
import { api, hasApi } from './apiService';
import { guessUserCountry } from './radioApi';

const KEY = 'yaiplayradio_geo_v2';

export async function getMyCountry(): Promise<string> {
  try {
    const cached = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (cached && Date.now() - cached.at < 6 * 3600000 && cached.cc) return cached.cc;
  } catch {}
  if (hasApi()) {
    try {
      const cc = ((await api<{ country: string }>('/geo')).country || '').toUpperCase();
      if (/^[A-Z]{2}$/.test(cc) && cc !== 'XX' && cc !== 'T1') {
        try {
          localStorage.setItem(KEY, JSON.stringify({ cc, at: Date.now() }));
        } catch {}
        return cc;
      }
    } catch {}
  }
  return guessUserCountry(); // не кэшируем — при следующем запросе снова спросим сервер
}
