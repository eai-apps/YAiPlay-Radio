/**
 * Автообновление приложения (Android/iOS): при запуске проверяем app/version.json на сайте.
 * Если код сайта новее — тихо скачиваем пакет (с проверкой SHA-256) и применяем при следующем запуске.
 * Серверы Capgo не используются: пакеты лежат на нашем GitHub Pages.
 */
import { isNativeApp, FEATURES } from '../utils/platform';

const VERSION_URL = 'https://eai-apps.github.io/YAiPlay-Radio/app/version.json';
const STATUS_KEY = 'YAi_update_status';

function saveStatus(text: string) {
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify({ text, at: Date.now() }));
  } catch {}
}
export function lastUpdateStatus(): { text: string; at: number } | null {
  try {
    return JSON.parse(localStorage.getItem(STATUS_KEY) || 'null');
  } catch {
    return null;
  }
}

export async function initAppUpdater() {
  if (!isNativeApp) return;
  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    // Обязательно: сообщаем, что эта версия запустилась нормально (иначе плагин откатит её назад)
    await CapacitorUpdater.notifyAppReady();
    // Версия из RuStore обновляется только через магазин
    if (!FEATURES.otaUpdates) return saveStatus('Обновления — через RuStore');

    const remote = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null));
    if (!remote?.version || !remote?.url) return saveStatus('Не удалось узнать версию на сайте');
    if (remote.version === __BUILD__) return saveStatus(`Актуально (${__BUILD__})`);

    // Уже скачан раньше? Тогда просто назначаем его следующим
    const { bundles } = await CapacitorUpdater.list();
    let bundle = bundles.find((b) => b.version === remote.version && b.status !== 'error');
    if (!bundle) {
      saveStatus(`Скачиваем ${remote.version}…`);
      bundle = await CapacitorUpdater.download({ url: remote.url, version: remote.version, checksum: remote.checksum || '' });
    }
    await CapacitorUpdater.next({ id: bundle.id });
    saveStatus(`Скачано ${remote.version} — включится при следующем запуске`);
    window.dispatchEvent(new CustomEvent('YAi_update_ready'));
  } catch (e: any) {
    saveStatus(`Ошибка: ${e?.message || e}`);
    console.warn('Автообновление не удалось', e);
  }
}

/** Версия установленного APK (например 1.0.7) */
export async function nativeVersion(): Promise<string> {
  if (!isNativeApp) return '';
  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    return (await CapacitorUpdater.current()).native || '';
  } catch {
    return '';
  }
}
