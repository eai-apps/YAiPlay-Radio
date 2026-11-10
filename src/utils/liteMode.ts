import { useSyncExternalStore } from 'react';

/**
 * «Лёгкий режим»: без анимаций, размытия, картинок/логотипов, визуализации и 3D-глобуса.
 * Для слабых телефонов и медленного интернета. Хранится на устройстве; если не выбран вручную —
 * включается сам при «Экономии трафика» или сети 2G.
 */
const KEY = 'YAi_lite';
const listeners = new Set<() => void>();

function autoDefault(): boolean {
  try {
    const c = (navigator as any).connection;
    return !!c && (c.saveData === true || /(^|-)2g$/.test(c.effectiveType || ''));
  } catch {
    return false;
  }
}

export function isLiteMode(): boolean {
  try {
    const v = localStorage.getItem(KEY);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch {}
  return autoDefault();
}

function apply() {
  try {
    document.documentElement.classList.toggle('lite-mode', isLiteMode());
  } catch {}
}

export function setLiteMode(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {}
  apply();
  listeners.forEach((l) => l());
}

export function initLiteMode() {
  apply();
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useLiteMode(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, isLiteMode, () => false);
  return [on, setLiteMode];
}
