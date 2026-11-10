import React, { useEffect, useState } from 'react';
import { Download, X, RefreshCw } from 'lucide-react';
import { isNativeApp, FEATURES } from '../utils/platform';
import { nativeVersion } from '../services/appUpdater';

const APK = 'https://github.com/eai-apps/YAiPlay-Radio/releases/download/android-latest/YAiRadio.apk';
const num = (v: string) => parseInt(v.split('.').pop() || '0', 10) || 0;

/**
 * В приложении:
 *  — обновление кода скачивается само → короткая подсказка «применится при следующем запуске»;
 *  — если вышел новый APK (редко: нативные изменения) → предлагаем скачать.
 */
export const UpdateBanner: React.FC = () => {
  const [apk, setApk] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isNativeApp) return;
    const onReady = () => setReady(true);
    window.addEventListener('YAi_update_ready', onReady);
    if (!FEATURES.apkLinks) return () => window.removeEventListener('YAi_update_ready', onReady);
    Promise.all([
      nativeVersion(),
      fetch('https://api.github.com/repos/eai-apps/YAiPlay-Radio/releases/tags/android-latest', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([mine, rel]) => {
        const latest = String(rel?.body || '').match(/native:\s*([\d.]+)/)?.[1] || '';
        let dismissed = '';
        try {
          dismissed = localStorage.getItem('YAi_apk_dismissed') || '';
        } catch {}
        if (mine && latest && num(latest) > num(mine) && latest !== dismissed) setApk(true);
      })
      .catch(() => {});
    return () => window.removeEventListener('YAi_update_ready', onReady);
  }, []);

  if (apk) {
    return (
      <div className="mx-4 mt-3 p-3 rounded-2xl bg-violet-500/15 border border-violet-500/40 flex items-center gap-3">
        <Download className="w-5 h-5 text-violet-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white">Доступна новая версия приложения</div>
          <div className="text-xs text-violet-100/80">Скачайте и установите поверх — избранное сохранится.</div>
        </div>
        <a href={APK} className="px-3 py-2 rounded-xl bg-violet-500 text-zinc-950 text-xs font-extrabold shrink-0">
          Скачать
        </a>
        <button
          aria-label="Позже"
          onClick={() => {
            setApk(false);
            fetch('https://api.github.com/repos/eai-apps/YAiPlay-Radio/releases/tags/android-latest')
              .then((r) => r.json())
              .then((rel) => {
                const v = String(rel?.body || '').match(/native:\s*([\d.]+)/)?.[1];
                try {
                  if (v) localStorage.setItem('YAi_apk_dismissed', v);
                } catch {}
              })
              .catch(() => {});
          }}
          className="p-1 text-zinc-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (ready) {
    return (
      <div className="mx-4 mt-3 p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-3">
        <RefreshCw className="w-5 h-5 text-cyan-300 shrink-0" />
        <div className="flex-1 text-xs text-cyan-100">Обновление загружено — применится при следующем запуске приложения.</div>
        <button aria-label="Закрыть" onClick={() => setReady(false)} className="p-1 text-zinc-400">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }
  return null;
};
