import { CityWeather, Station } from '../types/radio';

// In-memory cache for weather results to minimize network calls
const weatherCache = new Map<string, { data: CityWeather; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Weather code mapping according to WMO standard
export const getWeatherInfoByCode = (code: number): { condition: string; icon: string } => {
  if (code === 0) return { condition: 'Ясно', icon: '☀️' };
  if (code === 1) return { condition: 'Преимущественно ясно', icon: '🌤️' };
  if (code === 2) return { condition: 'Переменная облачность', icon: '⛅' };
  if (code === 3) return { condition: 'Пасмурно', icon: '☁️' };
  if (code === 45 || code === 48) return { condition: 'Туман', icon: '🌫️' };
  if (code >= 51 && code <= 55) return { condition: 'Морось', icon: '🌦️' };
  if (code >= 61 && code <= 65) return { condition: 'Дождь', icon: '🌧️' };
  if (code >= 66 && code <= 67) return { condition: 'Ледяной дождь', icon: '🧊' };
  if (code >= 71 && code <= 77) return { condition: 'Снегопад', icon: '❄️' };
  if (code >= 80 && code <= 82) return { condition: 'Ливень', icon: '🌧️' };
  if (code >= 85 && code <= 86) return { condition: 'Снежные заряды', icon: '🌨️' };
  if (code >= 95 && code <= 99) return { condition: 'Гроза', icon: '⛈️' };
  return { condition: 'Умеренно', icon: '🌤️' };
};

// Known coordinates for top countries & cities to ensure instant offline-friendly fallback
const KNOWN_COORDINATES: Record<string, { lat: number; lon: number; city: string; timezone: string }> = {
  // Countries
  RU: { lat: 55.75, lon: 37.61, city: 'Москва', timezone: 'Europe/Moscow' },
  US: { lat: 40.71, lon: -74.00, city: 'Нью-Йорк', timezone: 'America/New_York' },
  GB: { lat: 51.50, lon: -0.12, city: 'Лондон', timezone: 'Europe/London' },
  DE: { lat: 52.52, lon: 13.40, city: 'Берлин', timezone: 'Europe/Berlin' },
  FR: { lat: 48.85, lon: 2.35, city: 'Париж', timezone: 'Europe/Paris' },
  IT: { lat: 41.90, lon: 12.49, city: 'Рим', timezone: 'Europe/Rome' },
  ES: { lat: 40.41, lon: -3.70, city: 'Мадрид', timezone: 'Europe/Madrid' },
  NL: { lat: 52.36, lon: 4.90, city: 'Амстердам', timezone: 'Europe/Amsterdam' },
  UA: { lat: 50.45, lon: 30.52, city: 'Киев', timezone: 'Europe/Kyiv' },
  BY: { lat: 53.90, lon: 27.56, city: 'Минск', timezone: 'Europe/Minsk' },
  KZ: { lat: 51.16, lon: 71.43, city: 'Астана', timezone: 'Asia/Almaty' },
  PL: { lat: 52.22, lon: 21.01, city: 'Варшава', timezone: 'Europe/Warsaw' },
  TR: { lat: 41.00, lon: 28.97, city: 'Стамбул', timezone: 'Europe/Istanbul' },
  JP: { lat: 35.68, lon: 139.69, city: 'Токио', timezone: 'Asia/Tokyo' },
  BR: { lat: -23.55, lon: -46.63, city: 'Сан-Паулу', timezone: 'America/Sao_Paulo' },
};

/**
 * Fetch weather from Open-Meteo free API without requiring any API key
 */
export async function fetchWeatherByCoordinates(
  lat: number,
  lon: number,
  cityName: string,
  countryName: string,
  timezone = 'auto'
): Promise<CityWeather | null> {
  const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=${encodeURIComponent(
      timezone
    )}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return null;

    const data = await response.json();
    const current = data.current_weather;
    if (!current) return null;

    const weatherInfo = getWeatherInfoByCode(current.weathercode);

    // Calculate local time for timezone
    let localTime = '--:--';
    const tz = data.timezone || timezone || 'UTC';
    try {
      localTime = new Intl.DateTimeFormat('ru-RU', {
        timeZone: tz === 'auto' ? undefined : tz,
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date());
    } catch {
      const now = new Date();
      localTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    const result: CityWeather = {
      city: cityName,
      country: countryName,
      temp: Math.round(current.temperature),
      weatherCode: current.weathercode,
      condition: weatherInfo.condition,
      icon: weatherInfo.icon,
      windSpeed: Math.round(current.windspeed),
      localTime,
      timezone: tz,
    };

    weatherCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.warn('Failed to fetch Open-Meteo weather:', err);
    return null;
  }
}

/**
 * Resolve weather for a given city and country
 */
export async function fetchCityWeather(
  cityName: string,
  countryCode?: string
): Promise<CityWeather | null> {
  const code = (countryCode || '').toUpperCase();

  // Try geocoding city
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      cityName
    )}&count=1&language=ru`;
    const res = await fetch(geoUrl, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const geoData = await res.json();
      if (geoData.results && geoData.results.length > 0) {
        const loc = geoData.results[0];
        return await fetchWeatherByCoordinates(
          loc.latitude,
          loc.longitude,
          loc.name || cityName,
          loc.country || countryCode || '',
          loc.timezone || 'auto'
        );
      }
    }
  } catch {}

  // Fallback to known coordinates
  if (code && KNOWN_COORDINATES[code]) {
    const known = KNOWN_COORDINATES[code];
    return await fetchWeatherByCoordinates(
      known.lat,
      known.lon,
      cityName || known.city,
      countryCode || code,
      known.timezone
    );
  }

  // Fallback default
  return await fetchWeatherByCoordinates(55.75, 37.61, cityName, countryCode || 'World', 'auto');
}

/**
 * Resolve weather for any radio station based on its state, countrycode, or country name
 */
export async function getStationWeather(station: Station): Promise<CityWeather | null> {
  const code = (station.countrycode || '').toUpperCase();
  const searchCity = station.state || station.country || '';

  // 1. Try Geocoding API if state/city is available and not too generic
  if (station.state && station.state.length > 2) {
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        station.state
      )}&count=1&language=ru`;
      const res = await fetch(geoUrl, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const geoData = await res.json();
        if (geoData.results && geoData.results.length > 0) {
          const loc = geoData.results[0];
          return await fetchWeatherByCoordinates(
            loc.latitude,
            loc.longitude,
            loc.name || station.state,
            loc.country || station.country || '',
            loc.timezone || 'auto'
          );
        }
      }
    } catch {
      // Fallback to coordinates below
    }
  }

  // 2. Match known coordinate fallback
  if (code && KNOWN_COORDINATES[code]) {
    const known = KNOWN_COORDINATES[code];
    return await fetchWeatherByCoordinates(
      known.lat,
      known.lon,
      station.state || known.city,
      station.country || code,
      known.timezone
    );
  }

  // 3. Fallback: Default to Moscow / Europe coordinates
  return await fetchWeatherByCoordinates(
    55.75,
    37.61,
    station.state || station.country || 'Эфир',
    station.country || 'Global',
    'Europe/Moscow'
  );
}
