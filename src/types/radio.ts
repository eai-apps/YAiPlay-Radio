export interface Station {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage?: string;
  favicon?: string;
  tags?: string;
  country?: string;
  countrycode?: string;
  state?: string;
  language?: string;
  votes?: number;
  codec?: string;
  bitrate?: number;
  clickcount?: number;
  isCustom?: boolean; // Added manually via YAi Admin
  playBitrate?: number; // битрейт потока, который играет сейчас (может отличаться от bitrate)
  alt?: { bitrate: number; url: string; codec?: string }[]; // тот же эфир в другом качестве (для слабой сети)
}

export interface GenreCategory {
  id: string;
  name: string;
  tag: string;
  tags?: string[]; // синонимы тега (в т.ч. по-русски) — станции подписаны по-разному
  subTitle: string;
  gradient: string;
  iconName: string;
}

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  stationcount?: number;
}

export type BitrateFilter = 'all' | '128' | '320';

export type MainTab =
  | 'popular'
  | 'genres'
  | 'moods'
  | 'artists'
  | 'tv'
  | 'webcams'
  | 'search'
  | 'favorites'
  | 'history'
  | 'pro'
  | 'apps'
  | 'globe'
  | 'info';

export interface RecognizedTrack {
  id: string;
  artist: string;
  title: string;
  rawTitle: string;
  stationName: string;
  stationUuid: string;
  artworkUrl?: string;
  detectedAt: number;
}

export interface LiveTvChannel {
  id: string;
  name: string;
  logo: string;
  country: string;
  countryCode: string;
  flag: string;
  category: 'music' | 'news' | 'nature' | 'space' | 'fashion' | 'sport';
  hlsStreamUrl?: string;
  officialSiteUrl?: string;
  youtubeLiveUrl?: string;
  description?: string;
}

export interface ArtistStation {
  id: string;
  name: string;
  category: 'cis' | 'world' | 'ost';
  tag: string;
  description: string;
  avatar: string;
  fallbackStreamUrl?: string;
}

export interface MoodCategory {
  id: string;
  name: string;
  subTitle: string;
  emoji: string;
  gradient: string;
  accentColor: string;
  tags: string[];
  description: string;
}

export interface CityWeather {
  city: string;
  country: string;
  temp: number;
  weatherCode: number;
  condition: string;
  icon: string;
  windSpeed: number;
  localTime: string;
  timezone: string;
}

export interface EqualizerBand {
  freq: number;
  label: string;
  gain: number; // -12 to +12 dB
}

export interface EqualizerPreset {
  id: string;
  name: string;
  iconName: string;
  gains: number[]; // 5 bands
  bassBoost?: number; // 0-100
}

export interface RecordedTrack {
  id: string;
  stationName: string;
  stationUuid: string;
  date: string;
  durationSec: number;
  blobUrl: string;
  fileSizeFormatted: string;
  fileName: string;
}

export interface PlayedTrackHistory {
  id: string;
  stationUuid: string;
  stationName: string;
  stationFavicon?: string;
  title: string;
  playedAt: number;
}

export interface RadioAlarm {
  enabled: boolean;
  time: string; // "07:30"
  stationUuid: string;
  stationName: string;
  stationUrl?: string; // поток для нативного будильника Android (играет при закрытом приложении)
  fadeDurationSec: number; // 10, 30, 60
  days: number[]; // 0=Sun, 1=Mon, etc.
}

export type ThemeId =
  | 'YAi-original'
  | 'cyber-red'
  | 'neon-purple'
  | 'deep-ocean'
  | 'gold-vip';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  hex: string;
  hoverHex: string;
  previewGradient: string;
  badge: string;
}

export type Language = 'ru' | 'en' | 'de';

export interface WebcamCity {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  flag: string;
  lat: number;
  lng: number;
  tagline: string;
  videoType: 'hls' | 'stream' | 'live-snapshot';
  streamUrl: string; // Direct stream or live auto-updating snapshot URL
  directPortalUrl?: string; // Official portal 24/7 stream link without restrictions
  thumbnail: string;
  category: 'city' | 'beach' | 'space' | 'nature' | 'landmark';
  liveViews?: string;
  isCustom?: boolean;
}

export interface PartnerLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  image?: string;
  isAd?: boolean; // платная реклама → помечается «Реклама» (требование закона ЕС)
}

export interface CustomSocialLink {
  id: string;
  title: string;
  url: string;
}

export interface YAiSettings {
  appTitle: string;
  appSubtitle: string;
  customLogoUrl: string; // Base64 or direct URL, empty if using vector YAi logo
  telegramUrl: string; // @YAi_radio
  customLinks?: CustomSocialLink[]; // Dynamic social/community links configured in CMS
  customWebcams?: WebcamCity[]; // Webcams added via Admin (content.json)
  customStations?: Station[]; // Stations added via Admin (content.json)
  customTvChannels?: LiveTvChannel[]; // TV channels added via Admin (content.json)
  featuredStation?: Station | null;
  apiUrl?: string;
  defaultViewMode?: 'grid' | 'list'; // вид станций по умолчанию для всех
  hiddenSections?: string[]; // скрытые разделы сайта (webcams, tv, moods, artists, history, pro)
  hiddenCountries?: { radio?: string[]; tv?: string[]; webcams?: string[] }; // скрытые страны по разделам
  allowedStreamHosts?: string[]; // станции из data/stream-policy.json, которые владелец вернул вручную
  partners?: PartnerLink[]; // блок «Рекомендуем / Партнёры»
  adminLock?: string; // отпечаток пароля админки (если сервер не настроен)
  contactEmail?: string; // e-mail для связи (политика конфиденциальности, магазины)
  legalContact?: string; // Impressum / контактные данные владельца // «Станция YAiPlay Radio» — назначается в админке
  isPro: boolean;
  activeTheme: ThemeId;
  language: Language;
  heroTitle?: string;
  heroSubtitle?: string;
  appVersion?: string; // e.g. 'v0.8.3'
  versionChangelog?: string;
  dmcaPolicy?: string;
}


