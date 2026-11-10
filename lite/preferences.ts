import { useSyncExternalStore } from 'react';

const KEY = 'YAi_lite_images';
const EVENT = 'YAi_lite_preferences';
export function imagesEnabled(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}
export function setImagesEnabled(value: boolean) {
  try { localStorage.setItem(KEY, value ? '1' : '0'); } catch {}
  window.dispatchEvent(new Event(EVENT));
}
export function useImagesEnabled() {
  return useSyncExternalStore((onChange) => {
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, imagesEnabled);
}
