import { DATA_BASE } from '../utils/platform';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { YAiSettings, ThemeId } from '../types/radio';
import { isOwnerMode } from '../utils/owner';
import { setApiBase } from '../services/apiService';
import { setHiddenRadioCountries } from '../services/radioApi';
import { setAllowedStreamHosts } from '../constants/streamPolicy';
import { setDefaultViewMode } from '../hooks/useViewMode';

/** Личные настройки посетителя (тема, язык) — хранятся только на его устройстве. */
export const SETTINGS_KEY = 'YAi_user_prefs_v3';
/** Черновик владельца: правки из Админ-панели до публикации content.json. */
export const ADMIN_DRAFT_KEY = 'YAi_admin_draft_v1';

/** Поля контента сайта. Источник — файл public/content.json (одинаков для всех посетителей). */
export const SITE_FIELDS = [
  'appTitle',
  'appSubtitle',
  'customLogoUrl',
  'telegramUrl',
  'customLinks',
  'customWebcams',
  'customStations',
  'customTvChannels',
  'featuredStation',
  'contactEmail',
  'apiUrl',
  'hiddenSections',
  'hiddenCountries',
  'allowedStreamHosts',
  'defaultViewMode',
  'partners',
  'adminLock',
  'legalContact',
  'heroTitle',
  'heroSubtitle',
  'appVersion',
  'versionChangelog',
  'dmcaPolicy',
] as const;
type SiteField = (typeof SITE_FIELDS)[number];
export type SiteContent = Partial<Pick<YAiSettings, SiteField>>;

const USER_FIELDS = ['isPro', 'activeTheme', 'language'] as const;

export const APP_VERSION = 'v0.9.0';

export const DEFAULT_SETTINGS: YAiSettings = {
  appTitle: 'YAi Radio',
  appSubtitle: 'Радио со всего мира',
  customLogoUrl: './logo.png',
  telegramUrl: 'https://t.me/YAiPlayer',
  customLinks: [
    { id: '1', title: 'Telegram Канал', url: 'https://t.me/YAiPlayer' },
    { id: '2', title: 'Чат / Поддержка', url: 'https://t.me/YAi_support' },
  ],
  customWebcams: [],
  customStations: [],
  customTvChannels: [],
  hiddenSections: [],
  hiddenCountries: { radio: [], tv: ['RU'], webcams: [] },
  isPro: false,
  activeTheme: 'YAi-original',
  language: 'ru',
  heroTitle: 'YAi Radio',
  appVersion: APP_VERSION,
  versionChangelog: '',
  dmcaPolicy:
    'YAi Radio — программный интернет-тюнер и каталог публичных радиопотоков и открытых веб-камер. Приложение не хранит, не ретранслирует и не изменяет аудио- и видеоматериалы: все потоки воспроизводятся напрямую с серверов вещателей, каталог станций — открытая база Radio Browser.\n\nВаши настройки (избранное, тема, язык) хранятся только на вашем устройстве.\n\nЕсли вы правообладатель или представитель вещателя и хотите изменить или удалить поток, напишите нам через официальный Telegram-канал.',
};

function pick<T extends object>(obj: any, keys: readonly string[]): Partial<T> {
  const out: any = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

function readJson(key: string): any {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

/** Только проверенные поля из content.json, чтобы битый файл не уронил сайт. */
export function sanitizeSiteContent(raw: any): SiteContent {
  const c: any = pick(raw, SITE_FIELDS as unknown as string[]);
  if (c.hiddenCountries && typeof c.hiddenCountries !== 'object') delete c.hiddenCountries;
  for (const k of ['customLinks', 'customWebcams', 'customStations', 'customTvChannels', 'partners', 'hiddenSections', 'allowedStreamHosts']) {
    if (c[k] !== undefined && !Array.isArray(c[k])) delete c[k];
  }
  for (const k of ['apiUrl', 'adminLock', 'contactEmail', 'legalContact', 'appTitle', 'appSubtitle', 'customLogoUrl', 'telegramUrl', 'heroTitle', 'heroSubtitle', 'appVersion', 'versionChangelog', 'dmcaPolicy']) {
    if (c[k] !== undefined && typeof c[k] !== 'string') delete c[k];
  }
  const fs = c.featuredStation;
  if (fs !== undefined && fs !== null && !(typeof fs === 'object' && fs.name && (fs.url_resolved || fs.url))) delete c.featuredStation;
  // Версию задаёт код, а не файл контента
  delete c.appVersion;
  return c;
}

/** Собирает content.json из текущих настроек (для кнопки «Скачать content.json»). */
export function buildSiteContent(settings: YAiSettings): SiteContent {
  const c = pick<SiteContent>(settings, SITE_FIELDS as unknown as string[]);
  delete (c as any).appVersion;
  return c;
}

export function optimizeImageFile(file: File, maxDim = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        reject(new Error('Failed to read file'));
        return;
      }
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim && file.size < 250 * 1024) {
          resolve(src);
          return;
        }
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/png', 0.92);
        resolve(dataUrl);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

interface YAiSettingsContextType {
  settings: YAiSettings;
  customLogoUrl: string;
  updateSettings: (updates: Partial<YAiSettings>) => void;
  updateLogo: (base64OrUrl: string) => void;
  resetLogo: () => void;
  /** Контент сайта из опубликованного content.json (без черновика владельца) */
  publishedContent: SiteContent;
  /** Есть ли неопубликованные правки владельца */
  hasDraft: boolean;
  discardDraft: () => void;
  markPublished: () => void;
  togglePro: () => void;
  setTheme: (themeId: ThemeId) => void;
  setLanguage: (lang: import('../types/radio').Language) => void;
}

const YAiSettingsContext = createContext<YAiSettingsContextType | null>(null);

export const YAiSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [published, setPublished] = useState<SiteContent>({});
  const [draft, setDraft] = useState<SiteContent>(() =>
    isOwnerMode ? sanitizeSiteContent(readJson(ADMIN_DRAFT_KEY)) : {}
  );
  const [userPrefs, setUserPrefs] = useState<Partial<YAiSettings>>(() =>
    pick<YAiSettings>(readJson(SETTINGS_KEY), USER_FIELDS as unknown as string[])
  );

  // Опубликованный контент сайта
  useEffect(() => {
    let cancelled = false;
    fetch(`${DATA_BASE}content.json?v=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((json) => {
        if (cancelled) return;
        const pub = sanitizeSiteContent(json);
        setPublished(pub);
        // Из черновика убираем то, что уже опубликовано (совпадает с сайтом)
        setDraft((d) => {
          const left = Object.fromEntries(
            Object.entries(d).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify((pub as any)[k]))
          );
          return Object.keys(left).length === Object.keys(d).length ? d : left;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const settings: YAiSettings = {
    ...DEFAULT_SETTINGS,
    ...published,
    ...draft,
    ...userPrefs,
    appVersion: APP_VERSION,
  } as YAiSettings;
  if (!settings.customLogoUrl) settings.customLogoUrl = DEFAULT_SETTINGS.customLogoUrl;
  setApiBase(settings.apiUrl);
  setHiddenRadioCountries(settings.hiddenCountries?.radio || []);
  setAllowedStreamHosts(settings.allowedStreamHosts || []);
  setDefaultViewMode(settings.defaultViewMode);

  // Тема
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.activeTheme || 'YAi-original');
  }, [settings.activeTheme]);

  // Сохраняем только личные настройки
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(userPrefs));
    } catch {}
  }, [userPrefs]);

  // Черновик владельца
  useEffect(() => {
    if (!isOwnerMode) return;
    try {
      if (Object.keys(draft).length) localStorage.setItem(ADMIN_DRAFT_KEY, JSON.stringify(draft));
      else localStorage.removeItem(ADMIN_DRAFT_KEY);
    } catch (e) {
      console.warn('Черновик слишком большой для хранилища браузера', e);
    }
  }, [draft]);

  const updateSettings = useCallback((updates: Partial<YAiSettings>) => {
    const user = pick<YAiSettings>(updates, USER_FIELDS as unknown as string[]);
    const site = pick<SiteContent>(updates, SITE_FIELDS as unknown as string[]);
    delete (site as any).appVersion;
    if (Object.keys(user).length) setUserPrefs((p) => ({ ...p, ...user }));
    // Контент сайта меняет только владелец (и только в своём черновике)
    if (isOwnerMode && Object.keys(site).length) setDraft((p) => ({ ...p, ...site }));
  }, []);

  const updateLogo = useCallback(
    (base64OrUrl: string) => updateSettings({ customLogoUrl: base64OrUrl || DEFAULT_SETTINGS.customLogoUrl }),
    [updateSettings]
  );

  const resetLogo = useCallback(() => updateSettings({ customLogoUrl: DEFAULT_SETTINGS.customLogoUrl }), [updateSettings]);

  const discardDraft = useCallback(() => setDraft({}), []);
  /** После успешной публикации: черновик стал опубликованной версией */
  const markPublished = useCallback(() => {
    setPublished((p) => ({ ...p, ...draft }));
    setDraft({});
  }, [draft]);

  const togglePro = useCallback(() => {
    setUserPrefs((prev) => ({ ...prev, isPro: !prev.isPro }));
  }, []);

  const setTheme = useCallback((themeId: ThemeId) => {
    setUserPrefs((prev) => ({ ...prev, activeTheme: themeId }));
  }, []);

  const setLanguage = useCallback((language: import('../types/radio').Language) => {
    setUserPrefs((prev) => ({ ...prev, language }));
  }, []);

  return (
    <YAiSettingsContext.Provider
      value={{
        settings,
        customLogoUrl: settings.customLogoUrl,
        updateSettings,
        updateLogo,
        resetLogo,
        publishedContent: published,
        hasDraft: Object.keys(draft).length > 0,
        discardDraft,
        markPublished,
        togglePro,
        setTheme,
        setLanguage,
      }}
    >
      {children}
    </YAiSettingsContext.Provider>
  );
};

export function useYAiSettings() {
  const context = useContext(YAiSettingsContext);
  if (!context) {
    return {
      settings: { ...DEFAULT_SETTINGS },
      customLogoUrl: DEFAULT_SETTINGS.customLogoUrl,
      updateSettings: () => {},
      updateLogo: () => {},
      resetLogo: () => {},
      publishedContent: {},
      hasDraft: false,
      discardDraft: () => {},
      markPublished: () => {},
      togglePro: () => {},
      setTheme: () => {},
      setLanguage: () => {},
    } as YAiSettingsContextType;
  }
  return context;
}
