/**
 * Режим владельца сайта.
 * Админ-панель показывается только если открыть сайт с #admin в адресе
 * (например https://eai-apps.github.io/YAiPlay-Radio/#admin). После этого браузер
 * запоминает режим. Выйти: открыть сайт с #user.
 *
 * Это не защита (в браузере её не бывает) — защита в том, что опубликовать
 * изменения можно только через ваш аккаунт GitHub. Админка лишь готовит файл content.json.
 */
const OWNER_KEY = 'YAi_owner_mode';

export function detectOwnerMode(): boolean {
  try {
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('admin')) localStorage.setItem(OWNER_KEY, '1');
    if (hash.includes('user')) localStorage.removeItem(OWNER_KEY);
    return localStorage.getItem(OWNER_KEY) === '1';
  } catch {
    return window.location.hash.toLowerCase().includes('admin');
  }
}

export const isOwnerMode = detectOwnerMode();
