/**
 * Мост к нативной части Android-приложения (виджет, будильник, Android Auto).
 * На сайте и на iPhone все функции просто ничего не делают.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

interface YAiNativePlugin {
  getLaunchAction(): Promise<{ action?: string | null }>;
  updateNowPlaying(o: { title: string; subtitle: string; playing: boolean }): Promise<void>;
  saveLibrary(o: Record<string, unknown>): Promise<void>;
  setAlarm(o: Record<string, unknown>): Promise<{ exact: boolean; next: number }>;
  stopAlarm(): Promise<void>;
  openExactAlarmSettings(): Promise<void>;
  share(o: { title: string; text: string }): Promise<void>;
  addListener(event: 'remote' | 'launchAction', cb: (d: { action?: string }) => void): Promise<{ remove: () => void }>;
}

const Native = registerPlugin<YAiNativePlugin>('YAiNative');

export const hasNative = (): boolean => {
  try {
    return Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('YAiNative');
  } catch {
    return false;
  }
};

const safe = async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
  if (!hasNative()) return undefined;
  try {
    return await fn();
  } catch {
    return undefined;
  }
};

export const nativeNowPlaying = (title: string, subtitle: string, playing: boolean) =>
  safe(() => Native.updateNowPlaying({ title, subtitle, playing }));

export interface LibItem {
  id: string;
  name: string;
  url: string;
  subtitle?: string;
}
let lastLib = '';
export const nativeSaveLibrary = (lib: { fav: LibItem[]; recent: LibItem[]; record: LibItem[] }) => {
  const s = JSON.stringify(lib);
  if (s === lastLib) return;
  lastLib = s;
  return safe(() => Native.saveLibrary(lib as any));
};

export const nativeSetAlarm = (o: { enabled: boolean; hour: number; minute: number; days: number[]; url: string; name: string; fadeSec: number }) =>
  safe(() => Native.setAlarm(o as any));
export const nativeStopAlarm = () => safe(() => Native.stopAlarm());
export const nativeOpenExactAlarmSettings = () => safe(() => Native.openExactAlarmSettings());
export const nativeLaunchAction = async (): Promise<string | null> => (await safe(() => Native.getLaunchAction()))?.action || null;
export const onNative = (event: 'remote' | 'launchAction', cb: (action: string) => void): (() => void) => {
  if (!hasNative()) return () => {};
  let h: { remove: () => void } | null = null;
  let gone = false;
  Native.addListener(event, (d) => d?.action && cb(d.action))
    .then((x) => (gone ? x.remove() : (h = x)))
    .catch(() => {});
  return () => {
    gone = true;
    h?.remove();
  };
};

/** Системное окно «Поделиться» Android (в приложении у WebView нет navigator.share) */
export const nativeShare = async (title: string, text: string): Promise<boolean> => {
  if (!hasNative()) return false;
  try {
    await Native.share({ title, text });
    return true;
  } catch {
    return false; // старый APK без этой функции
  }
};
