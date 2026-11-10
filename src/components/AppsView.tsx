import React, { useEffect, useState } from 'react';
import { Smartphone, Tv, Apple, Download, Share, PlusSquare, Compass, Check, Clock } from 'lucide-react';
import { isNativeApp } from '../utils/platform';
import { nativeVersion, lastUpdateStatus } from '../services/appUpdater';

const REPO = 'https://github.com/eai-apps/YAiPlay-Radio';
const APK_PHONE = `${REPO}/releases/download/android-latest/YAiRadio.apk`;
// Одно универсальное приложение для телефонов, планшетов и Android TV
const APK_TV = APK_PHONE;
const SITE = 'https://yaiplay-radio.pages.dev/';

interface Versions {
  apk?: string;
  apkDate?: string;
  apkSize?: number;
  web?: string;
  webDate?: string;
}

const fmtDate = (iso?: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
};

/** Последние версии: APK (GitHub Releases) и веб-версия (она же — обновление для приложений и iPhone) */
function useVersions(): Versions {
  const [v, setV] = useState<Versions>({});
  useEffect(() => {
    fetch('https://api.github.com/repos/eai-apps/YAiPlay-Radio/releases/tags/android-latest', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((rel) => {
        if (!rel) return;
        const apk = String(rel.body || '').match(/native:\s*([\d.]+)/)?.[1];
        const size = rel.assets?.find((a: any) => a.name === 'YAiRadio.apk')?.size;
        setV((p) => ({ ...p, apk, apkDate: rel.published_at, apkSize: size }));
      })
      .catch(() => {});
    fetch(`./app/version.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setV((p) => ({ ...p, web: j.version, webDate: j.builtAt })))
      .catch(() => {});
  }, []);
  return v;
}

const VersionLine: React.FC<{ label: string; value?: string; date?: string; extra?: string }> = ({ label, value, date, extra }) => (
  <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-black/30 border border-white/5 text-xs">
    <span className="text-zinc-400">{label}</span>
    <span className="text-right">
      <b className="text-white font-mono">{value || '…'}</b>
      {(date || extra) && <span className="block text-[10px] text-zinc-500">{[date && fmtDate(date), extra].filter(Boolean).join(' · ')}</span>}
    </span>
  </div>
);

/** В приложении: что установлено сейчас (для проверки автообновления) */
const InstalledInfo: React.FC = () => {
  const [native, setNative] = useState('');
  const status = lastUpdateStatus();
  useEffect(() => {
    nativeVersion().then(setNative);
  }, []);
  return (
    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-violet-500/30 text-center text-xs text-zinc-300 space-y-1">
      <div className="text-sm font-bold text-white">У вас установлено 💚</div>
      <div>
        Приложение <b className="font-mono text-white">v{native || '…'}</b> · содержимое <b className="font-mono text-white">{__BUILD__}</b>
      </div>
      {status && <div className="text-zinc-400">Последняя проверка: {status.text}</div>}
      <div className="text-zinc-500">Если содержимое на сайте новее — оно скачается само и включится при следующем запуске.</div>
    </div>
  );
};

const Soon: React.FC<{ store: string }> = ({ store }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-200 border border-amber-500/30">
    <Clock className="w-3.5 h-3.5" /> Скоро в {store}
  </span>
);

const Step: React.FC<{ n: number; icon: React.ReactNode; children: React.ReactNode }> = ({ n, icon, children }) => (
  <li className="flex items-start gap-3">
    <span className="w-8 h-8 shrink-0 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-200 font-extrabold text-sm flex items-center justify-center">{n}</span>
    <span className="text-sm text-zinc-200 leading-relaxed pt-1">
      <span className="inline-flex align-middle mr-1.5 text-sky-300">{icon}</span>
      {children}
    </span>
  </li>
);

/** «Mobile Apps»: Android (телефон и ТВ), iPhone / iPad */
export const AppsView: React.FC = () => {
  const [qr, setQr] = useState('');
  const ver = useVersions();
  useEffect(() => {
    import('qrcode').then((QR) => QR.toDataURL(SITE, { margin: 1, width: 220, color: { dark: '#09090b', light: '#ffffff' } }).then(setQr)).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Шапка */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-violet-950 via-zinc-950 to-sky-950 border border-violet-500/25">
        <div className="absolute -top-16 -right-16 w-72 h-72 bg-violet-500/20 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-72 h-72 bg-sky-500/20 rounded-full blur-[90px] pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-violet-500/15 text-violet-200 border border-violet-500/30 mb-3">
              <Smartphone className="w-3.5 h-3.5" /> Mobile Apps
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">YAiPlay Radio в кармане</h1>
            <p className="text-sm text-zinc-300 mt-2 max-w-xl">
              Радио со всего мира на телефоне, планшете и телевизоре. Бесплатно, без рекламы и регистрации. Избранное переносится через «Вход и синхронизация».
            </p>
          </div>
          {qr && (
            <div className="hidden sm:flex flex-col items-center gap-2 shrink-0">
              <img src={qr} alt="QR-код сайта" className="w-36 h-36 rounded-2xl border-4 border-white shadow-xl" />
              <span className="text-[11px] text-zinc-400">Наведите камеру телефона</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Android */}
        <section className="rounded-3xl p-5 sm:p-6 bg-zinc-900/80 border border-violet-500/25 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Smartphone className="w-6 h-6 text-zinc-950" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-white">Android</h2>
              <p className="text-xs text-zinc-400">Одно приложение для телефона, планшета и Android TV · Android 7+</p>
            </div>
          </div>
          <a
            href={APK_PHONE}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-violet-500 hover:bg-violet-400 text-zinc-950 font-extrabold text-sm shadow-lg shadow-violet-500/30 active:scale-[0.98]"
          >
            <Download className="w-5 h-5" /> Скачать YAiPlay Radio для Android
          </a>
          <div className="space-y-1.5">
            <VersionLine label="Последняя версия APK" value={ver.apk ? `v${ver.apk}` : undefined} date={ver.apkDate} extra={ver.apkSize ? `${(ver.apkSize / 1048576).toFixed(1)} МБ` : ''} />
            <VersionLine label="RuStore" value="скоро" />
            <VersionLine label="Google Play" value="скоро" extra="будет та же версия" />
            <VersionLine label="Обновление содержимого" value={ver.web} date={ver.webDate} extra="приходит в приложение само" />
          </div>
          <ol className="space-y-2 text-xs text-zinc-400 list-decimal pl-5">
            <li>Скачайте файл и откройте его.</li>
            <li>Разрешите установку из браузера, если телефон спросит.</li>
            <li>Нажмите «Установить» (Play Защита может предупредить — это тестовая версия).</li>
          </ol>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            * Через APK-файл новые версии приходят намного быстрее: приложение обновляется «по воздуху», не дожидаясь проверки магазина.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Soon store="RuStore" />
            <Soon store="Google Play" />
          </div>
        </section>

        {/* Android TV */}
        <section className="rounded-3xl p-5 sm:p-6 bg-zinc-900/80 border border-violet-500/25 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Tv className="w-6 h-6 text-white" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-white">Android TV</h2>
              <p className="text-xs text-zinc-400">То же самое приложение — само подстраивается под телевизор и пульт</p>
            </div>
          </div>
          <a
            href={APK_TV}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-violet-500 hover:bg-violet-400 text-white font-extrabold text-sm shadow-lg shadow-violet-500/30 active:scale-[0.98]"
          >
            <Download className="w-5 h-5" /> Скачать для Android TV (тот же файл)
          </a>
          <VersionLine label="Последняя версия APK" value={ver.apk ? `v${ver.apk}` : undefined} date={ver.apkDate} />
          <ol className="space-y-2 text-xs text-zinc-400 list-decimal pl-5">
            <li>Установите на телевизор приложение-загрузчик (например, «Downloader») из Google Play.</li>
            <li>Откройте в нём ссылку на APK из этой кнопки и установите.</li>
            <li>YAiPlay Radio появится в списке приложений, управление — пультом.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <Soon store="RuStore" />
            <Soon store="Google Play" />
          </div>
        </section>
      </div>

      {/* Android Auto */}
      <section id="android-auto" className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-zinc-900 to-orange-950/40 border border-orange-500/25">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-orange-500/30 text-2xl">🚗</span>
          <div>
            <h2 className="text-lg font-extrabold text-white">Android Auto</h2>
            <p className="text-xs text-zinc-400">Избранное, недавние и Radio Record на экране машины. Переключение кнопками руля и голосом.</p>
          </div>
        </div>
        <ol className="space-y-2 text-xs text-zinc-300 list-decimal pl-5">
          <li>Установите приложение YAiPlay Radio для Android (кнопка выше) и добавьте станции в избранное ♥.</li>
          <li>Пока мы не в Google Play, Android Auto нужно разрешить «неизвестные источники»: откройте <b>Android Auto → Настройки</b>, нажмите 10 раз на строку <b>«Версия»</b> — включится режим разработчика.</li>
          <li>Меню <b>⋮ → «Для разработчиков»</b> → включите <b>«Неизвестные источники»</b>.</li>
          <li>Подключите телефон к машине — YAiPlay Radio появится среди музыкальных приложений.</li>
        </ol>
      </section>

      {/* iPhone / iPad */}
      <section className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-zinc-900 to-sky-950/60 border border-sky-500/25">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
              <Apple className="w-6 h-6 text-white" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-white">iPhone и iPad</h2>
              <p className="text-xs text-zinc-400">Полноценное приложение на экране «Домой» — без App Store</p>
            </div>
          </div>
          <Soon store="App Store" />
        </div>
        <div className="grid sm:grid-cols-2 gap-1.5 mb-5">
          <VersionLine label="Версия для iPhone / iPad (через Safari)" value={ver.web} date={ver.webDate} extra="обновляется сама" />
          <VersionLine label="App Store" value="скоро" />
        </div>
        <ol className="grid sm:grid-cols-2 gap-4">
          <Step n={1} icon={<Compass className="w-4 h-4" />}>
            Откройте <b className="text-white">yaiplay-radio.pages.dev</b> именно в <b className="text-white">Safari</b>.
          </Step>
          <Step n={2} icon={<Share className="w-4 h-4" />}>
            Нажмите кнопку <b className="text-white">«Поделиться»</b> — квадрат со стрелкой вверх (внизу на iPhone, вверху на iPad).
          </Step>
          <Step n={3} icon={<PlusSquare className="w-4 h-4" />}>
            Прокрутите и выберите <b className="text-white">«На экран „Домой“»</b>, затем «Добавить».
          </Step>
          <Step n={4} icon={<Check className="w-4 h-4" />}>
            Запускайте YAiPlay Radio с иконки: на весь экран, без адресной строки, со звуком на экране блокировки.
          </Step>
        </ol>
      </section>

      {isNativeApp && <InstalledInfo />}
    </div>
  );
};
