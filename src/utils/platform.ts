/**
 * Где запущен сайт: в браузере или внутри мобильного приложения (Capacitor).
 * В приложениях для App Store / Google Play отключаем то, что запрещают правила магазинов.
 */
export const isNativeApp: boolean =
  typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();

/**
 * Сборка для Google Play / App Store помечается строкой «YAi-Store» в User-Agent
 * (capacitor.config → appendUserAgent). APK с нашего сайта — без пометки.
 */
export const isStoreBuild: boolean =
  isNativeApp && typeof navigator !== 'undefined' && /YAi-Store/.test(navigator.userAgent || '');

/**
 * Отдельная сборка для RuStore (метка «YAi-RuStore» в User-Agent, пакет com.yaiplayradio.radio.rustore).
 * В ней ТВ есть, но без российских и украинских каналов и без новостных/религиозных
 * (правила модерации RuStore и законы РФ о СМИ). Владелец может выключить ТВ только в RuStore — в админке.
 * Код в ней не обновляется «по воздуху» и нет ссылок на APK: обновления — только через RuStore.
 */
export const isRuStoreBuild: boolean =
  isNativeApp && typeof navigator !== 'undefined' && /YAi-RuStore/.test(navigator.userAgent || '');

/** Что убираем из ТВ в версии для RuStore */
export const RUSTORE_TV_BLOCK = {
  countries: ['RU', 'UA'],
  categories: ['news', 'religious', 'legislative', 'public'],
  /** Новостные каналы без категории «news» — по названию */
  newsNames: /news|новост|вести|haber|noticias|nachrichten|notizie|nieuws|infos?\b|actualit|журнал|24\s?h|parliament|senate/i,
  /** «Официальные эфиры» (ссылки) — по названию */
  officialNames: /euronews|bbc|dw news|france 24|al jazeera|nhk|sky news|europa plus|bridge tv/i,
};

export const FEATURES = {
  /** Ссылки на APK с сайта и проверка «вышел новый APK» — в магазинных версиях запрещено */
  apkLinks: !isStoreBuild && !isRuStoreBuild,
  /** Автообновление кода приложения с сайта (в RuStore обновления идут только через магазин) */
  otaUpdates: !isRuStoreBuild,
  /** Запись эфира в файл: Apple 5.2.3 / Google Play запрещают сохранять чужие трансляции */
  recorder: !isNativeApp,
  /**
   * Прямые ТВ-трансляции: Google Play и App Store массово удаляют IPTV-приложения,
   * поэтому в версиях из магазинов — только ссылки на официальные сайты/YouTube каналов.
   * На сайте и в APK с нашего сайта трансляции есть.
   */
  tvStreams: !isStoreBuild,
};

/** Откуда брать свежие content.json / catalog.json: в приложении — с сайта (чтобы обновлялись без новой версии приложения) */
export const DATA_BASE = isNativeApp ? 'https://eai-apps.github.io/YAiPlay-Radio/' : './';

/** iPhone/iPad: сайт не может менять громкость (её меняют только боковые кнопки) — ползунок в плеере прячем */
export const CAN_SET_VOLUME: boolean = (() => {
  try {
    const ua = navigator.userAgent || '';
    const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return !ios;
  } catch {
    return true;
  }
})();
