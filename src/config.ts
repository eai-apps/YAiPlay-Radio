/**
 * Настройки сборки YAiPlay Radio.
 */

/**
 * Адрес прокси метаданных (Cloudflare Worker из папки worker/).
 * Пока пусто — названия песен берутся только из открытых источников станций.
 * После развёртывания воркера впишите сюда его адрес, например:
 *   'https://YAi-meta.<ваш-логин>.workers.dev'
 * или задайте переменную окружения VITE_METADATA_PROXY при сборке.
 */
export const METADATA_PROXY_URL: string = (import.meta.env.VITE_METADATA_PROXY as string | undefined) || '';
