export type Language = 'ru' | 'en' | 'de';

export interface Translations {
  // Navigation
  navPopular: string;
  navGenres: string;
  navMoods: string;
  navWebcams: string;
  navSearch: string;
  navFavorites: string;
  navHistory: string;
  navPro: string;
  navInfo: string;
  navAdmin: string;
  navSync: string;
  navAbout: string;

  // Header & Controls
  searchPlaceholder: string;
  allCountries: string;
  searchCountry: string;
  allBitrates: string;
  refreshTooltip: string;
  carMode: string;
  equalizer: string;
  recorder: string;
  recordingActive: string;
  alarmClock: string;
  sleepTimer: string;
  sleepTimerActive: string;
  sleepTimerRemaining: string;
  sleepTimerDesc: string;

  // General
  live: string;
  stations: string;
  playingNow: string;
  addToFavorites: string;
  removeFromFavorites: string;
  shareStation: string;
  copyLink: string;
  copied: string;
  noStationsFound: string;
  loading: string;
  version: string;
  studioAndTools: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  ru: {
    navPopular: 'Популярное (Топ)',
    navGenres: 'Жанры',
    navMoods: 'Настроение (Moods)',
    navWebcams: 'Веб-камеры (Live Cams)',
    navSearch: 'Поиск и страны',
    navFavorites: 'Избранное',
    navHistory: 'История эфиров',
    navPro: 'YAi PRO',
    navInfo: 'Информация',
    navAdmin: 'Админка',
    navSync: 'Профиль / Sync',
    navAbout: 'О сайте & История версий',

    searchPlaceholder: 'Поиск радиостанций по названию или исполнителю...',
    allCountries: 'Все страны',
    searchCountry: 'Поиск страны...',
    allBitrates: 'Все',
    refreshTooltip: 'Обновить список станций',
    carMode: 'Авто',
    equalizer: 'EQ',
    recorder: 'Запись',
    recordingActive: 'REC',
    alarmClock: 'Будильник',
    sleepTimer: 'Таймер сна',
    sleepTimerActive: 'Таймер активен',
    sleepTimerRemaining: 'Осталось',
    sleepTimerDesc: 'Плавное автовыключение',

    live: 'В ЭФИРЕ',
    stations: 'станций',
    playingNow: 'Сейчас играет',
    addToFavorites: 'В избранное',
    removeFromFavorites: 'Удалить из избранного',
    shareStation: 'Поделиться',
    copyLink: 'Скопировать ссылку',
    copied: 'Скопировано!',
    noStationsFound: 'Станции не найдены',
    loading: 'Загрузка...',
    version: 'v0.8.3',
    studioAndTools: 'Студия и Режимы',
  },
  en: {
    navPopular: 'Popular (Top)',
    navGenres: 'Genres',
    navMoods: 'Mood & Activities',
    navWebcams: 'World Webcams (Live)',
    navSearch: 'Search & Countries',
    navFavorites: 'Favorites',
    navHistory: 'Play History',
    navPro: 'YAi PRO',
    navInfo: 'Information',
    navAdmin: 'Admin',
    navSync: 'Profile / Sync',
    navAbout: 'About & Changelog',

    searchPlaceholder: 'Search radio stations by name or artist...',
    allCountries: 'All Countries',
    searchCountry: 'Search country...',
    allBitrates: 'All',
    refreshTooltip: 'Refresh station list',
    carMode: 'Car',
    equalizer: 'EQ',
    recorder: 'Record',
    recordingActive: 'REC',
    alarmClock: 'Alarm',
    sleepTimer: 'Sleep Timer',
    sleepTimerActive: 'Timer active',
    sleepTimerRemaining: 'Remaining',
    sleepTimerDesc: 'Gradual fade-out',

    live: 'LIVE',
    stations: 'stations',
    playingNow: 'Now playing',
    addToFavorites: 'Add to favorites',
    removeFromFavorites: 'Remove from favorites',
    shareStation: 'Share',
    copyLink: 'Copy link',
    copied: 'Copied!',
    noStationsFound: 'No stations found',
    loading: 'Loading...',
    version: 'v0.8.3',
    studioAndTools: 'Studio & Tools',
  },
  de: {
    navPopular: 'Beliebt (Top)',
    navGenres: 'Genres',
    navMoods: 'Stimmung & Aktivitäten',
    navWebcams: 'Webcams weltweit (Live)',
    navSearch: 'Suche & Länder',
    navFavorites: 'Favoriten',
    navHistory: 'Verlauf',
    navPro: 'YAi PRO',
    navInfo: 'Information',
    navAdmin: 'Admin',
    navSync: 'Profil / Sync',
    navAbout: 'Über uns & Versionen',

    searchPlaceholder: 'Radiosender nach Name или Interpret suchen...',
    allCountries: 'Alle Länder',
    searchCountry: 'Land suchen...',
    allBitrates: 'Alle',
    refreshTooltip: 'Senderliste aktualisieren',
    carMode: 'Auto',
    equalizer: 'EQ',
    recorder: 'Aufnahme',
    recordingActive: 'REC',
    alarmClock: 'Wecker',
    sleepTimer: 'Schlaf-Timer',
    sleepTimerActive: 'Timer aktiv',
    sleepTimerRemaining: 'Verbleibend',
    sleepTimerDesc: 'Sanftes Ausschalten',

    live: 'LIVE',
    stations: 'Sender',
    playingNow: 'Läuft gerade',
    addToFavorites: 'Zu Favoriten',
    removeFromFavorites: 'Aus Favoriten entfernen',
    shareStation: 'Teilen',
    copyLink: 'Link kopieren',
    copied: 'Kopiert!',
    noStationsFound: 'Keine Sender gefunden',
    loading: 'Laden...',
    version: 'v0.8.3',
    studioAndTools: 'Studio & Modi',
  },
};
