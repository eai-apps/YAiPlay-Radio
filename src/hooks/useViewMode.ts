import { useEffect, useState, useCallback } from 'react';
import { isNativeApp } from '../utils/platform';

export type ViewMode = 'grid' | 'list';
const KEY = 'yaiplayradio_view_mode';
const EVENT = 'yaiplayradio_view_mode_changed';

let siteDefault: ViewMode = 'grid';
/** Вид по умолчанию для всех посетителей (задаётся в админке) */
export function setDefaultViewMode(m?: string) {
  const next: ViewMode = m === 'list' ? 'list' : 'grid';
  if (next === siteDefault) return;
  siteDefault = next;
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** В приложении и на телефоне по умолчанию удобнее список, на компьютере — как задано в админке */
function deviceDefault(): ViewMode {
  if (isNativeApp) return 'list';
  try {
    if (window.matchMedia('(max-width: 640px)').matches) return 'list';
  } catch {}
  return siteDefault;
}

function read(): ViewMode {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'list' || v === 'grid' ? v : deviceDefault();
  } catch {
    return deviceDefault();
  }
}

/** Вид списка станций: плитка или компактный список (запоминается на устройстве). */
export function useViewMode() {
  const [mode, setModeState] = useState<ViewMode>(read);
  useEffect(() => {
    const sync = () => setModeState(read());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const setMode = useCallback((m: ViewMode) => {
    try {
      localStorage.setItem(KEY, m);
    } catch {}
    setModeState(m);
    window.dispatchEvent(new CustomEvent(EVENT));
  }, []);
  return { mode, setMode };
}
