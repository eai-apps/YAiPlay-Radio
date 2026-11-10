import React, { useEffect, useRef, useState } from 'react';
import { X, Share2, Copy, Check, Download, Upload, QrCode, FileText, Heart, Music2, Smartphone } from 'lucide-react';
import { Station } from '../types/radio';
import { useFavorites, saveFavorites } from '../hooks/useFavorites';
import { useAudio } from '../context/AudioPlayerContext';
import { useYAiSettings } from '../context/YAiSettingsContext';
import { fetchStationsByUuids } from '../services/radioApi';
import { api, hasApi, userSession } from '../services/apiService';
import { syncNow, lastSyncAt } from '../services/syncService';
import { LogIn, LogOut, UserPlus, RefreshCw, Loader2, Trash2 } from 'lucide-react';

const RECOGNIZED_TRACKS_KEY = 'YAi_recognized_tracks_v1';
const IMPORT_HASH = 'fav=';

/** Ссылка, открыв которую на другом устройстве, получишь то же избранное. */
export function buildTransferLink(favorites: Station[]): string {
  const ids = favorites.map((s) => s.stationuuid).filter(Boolean);
  const base = window.location.href.split('#')[0];
  return `${base}#${IMPORT_HASH}${ids.join(',')}`;
}

/**
 * Вызывается один раз при запуске: если адрес содержит #fav=..., подтягивает станции
 * из каталога и добавляет их в избранное этого устройства.
 */
export async function importFavoritesFromLink(customStations: Station[]): Promise<number | null> {
  const hash = window.location.hash.slice(1);
  if (!hash.startsWith(IMPORT_HASH)) return null;
  const ids = decodeURIComponent(hash.slice(IMPORT_HASH.length)).split(',').filter(Boolean);
  history.replaceState(null, '', window.location.pathname + window.location.search);
  if (!ids.length) return 0;

  const found: Station[] = [];
  const custom = ids.map((id) => customStations.find((s) => s.stationuuid === id)).filter(Boolean) as Station[];
  found.push(...custom);
  try {
    found.push(...(await fetchStationsByUuids(ids)));
  } catch {}

  // Сохраняем порядок из ссылки и не дублируем уже имеющиеся
  let current: Station[] = [];
  try {
    current = JSON.parse(localStorage.getItem('YAi_favorites_v2') || '[]');
  } catch {}
  const have = new Set(current.map((s) => s.stationuuid));
  const ordered = ids.map((id) => found.find((s) => s.stationuuid === id)).filter((s): s is Station => !!s && !have.has(s.stationuuid));
  if (ordered.length) saveFavorites([...current, ...ordered]);
  return ordered.length;
}

interface SyncModalProps {
  onClose: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ onClose }) => {
  const { favorites } = useFavorites();
  const { recognizedTracks } = useAudio();
  const { settings } = useYAiSettings();
  const [tab, setTab] = useState<'account' | 'link' | 'file'>(hasApi() ? 'account' : 'link');
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const link = buildTransferLink(favorites);
  const tooLongForQr = link.length > 2300;

  useEffect(() => {
    if (tab !== 'link' || !canvasRef.current || !favorites.length || tooLongForQr) return;
    import('qrcode')
      .then((QR) =>
        QR.toCanvas(canvasRef.current!, link, { width: 220, margin: 1, color: { dark: '#09090b', light: '#ffffff' } })
      )
      .catch(() => {});
  }, [tab, link, favorites.length, tooLongForQr]);

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 3500);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      flash('Не удалось скопировать — выделите ссылку вручную');
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${settings.appTitle}: моё избранное`, url: link });
      } catch {}
    } else copyLink();
  };

  const download = (content: string, name: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    download(
      JSON.stringify({ app: 'YAi Radio', type: 'user-backup', createdAt: new Date().toISOString(), favorites, recognizedTracks }, null, 2),
      `YAi-moi-dannye-${new Date().toISOString().slice(0, 10)}.json`,
      'application/json'
    );
    flash('Файл сохранён');
  };

  const exportM3U = () => {
    if (!favorites.length) return flash('В избранном пока нет станций');
    let m3u = '#EXTM3U\n';
    favorites.forEach((s) => {
      m3u += `#EXTINF:-1 tvg-logo="${s.favicon || ''}" group-title="${s.country || 'Radio'}",${s.name.replace(/[\r\n]/g, '')}\n`;
      m3u += `${s.url_resolved || s.url}\n`;
    });
    download(m3u, `YAi-izbrannoe.m3u`, 'audio/x-mpegurl;charset=utf-8');
    flash('Плейлист M3U скачан — его можно открыть в VLC, AIMP и т.п.');
  };

  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const favs: Station[] = Array.isArray(data.favorites) ? data.favorites : [];
        const have = new Set(favorites.map((s) => s.stationuuid));
        const merged = [...favorites, ...favs.filter((s) => s?.stationuuid && s?.name && !have.has(s.stationuuid))];
        saveFavorites(merged);
        if (Array.isArray(data.recognizedTracks)) {
          localStorage.setItem(RECOGNIZED_TRACKS_KEY, JSON.stringify(data.recognizedTracks));
        }
        flash(`Готово: в избранном ${merged.length} станций. Перезагрузка…`);
        setTimeout(() => window.location.reload(), 1200);
      } catch {
        flash('Ошибка: это не файл копии YAi Radio');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const tabBtn = (id: 'account' | 'link' | 'file', icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setTab(id)}
      className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
        tab === id ? 'bg-violet-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div onClick={onClose} className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
      >
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-400 text-zinc-950">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Синхронизация устройств</h2>
              <p className="text-xs text-zinc-400">Избранное на телефоне и компьютере одновременно</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Закрыть" className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mx-5 mt-4 p-1 rounded-2xl bg-zinc-900 border border-zinc-800 flex gap-1">
          {hasApi() && tabBtn('account', <LogIn className="w-4 h-4" />, 'Аккаунт')}
          {tabBtn('link', <QrCode className="w-4 h-4" />, 'QR / ссылка')}
          {tabBtn('file', <FileText className="w-4 h-4" />, 'Файл копии')}
        </div>

        {status && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-violet-500/15 border border-violet-500/40 text-violet-300 text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            {status}
          </div>
        )}

        <div className="p-5 overflow-y-auto space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex items-center gap-2.5">
              <Heart className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="text-lg font-bold text-white leading-none">{favorites.length}</div>
                <div className="text-[11px] text-zinc-400">в избранном</div>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex items-center gap-2.5">
              <Music2 className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="text-lg font-bold text-white leading-none">{recognizedTracks.length}</div>
                <div className="text-[11px] text-zinc-400">сохранённых треков</div>
              </div>
            </div>
          </div>

          {tab === 'account' && <AccountPanel onStatus={flash} />}

          {tab === 'link' && (
            <div className="space-y-4">
              {!favorites.length ? (
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Добавьте станции в избранное (❤️), и здесь появится QR-код для переноса на телефон.
                </p>
              ) : (
                <>
                  <p className="text-zinc-300 text-xs leading-relaxed flex gap-2">
                    <Smartphone className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    Наведите камеру телефона на код или отправьте себе ссылку — на том устройстве избранное добавится автоматически.
                  </p>
                  {tooLongForQr ? (
                    <p className="text-xs text-amber-300">Избранного слишком много для QR-кода — используйте ссылку или файл копии.</p>
                  ) : (
                    <div className="flex justify-center">
                      <canvas ref={canvasRef} className="rounded-2xl bg-white p-2" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={copyLink} className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center justify-center gap-2">
                      {copied ? <Check className="w-4 h-4 text-violet-400" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Скопировано' : 'Копировать ссылку'}
                    </button>
                    <button onClick={shareLink} className="flex-1 py-3 rounded-xl bg-violet-500 hover:bg-violet-400 text-zinc-950 text-xs font-bold flex items-center justify-center gap-2">
                      <Share2 className="w-4 h-4" />
                      Поделиться
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'file' && (
            <div className="space-y-3">
              <p className="text-zinc-400 text-xs leading-relaxed">
                Полная копия: избранное и сохранённые треки. Пригодится при смене телефона или очистке браузера.
              </p>
              <button onClick={exportJson} className="w-full py-3 rounded-xl bg-violet-500 hover:bg-violet-400 text-zinc-950 text-xs font-bold flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Сохранить файл копии (.json)
              </button>
              <input ref={fileRef} type="file" accept=".json,application/json" onChange={importJson} className="hidden" />
              <button onClick={() => fileRef.current?.click()} className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" />
                Загрузить файл копии
              </button>
              <button onClick={exportM3U} className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                Скачать избранное как плейлист M3U
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** Вход по логину и паролю: избранное одинаково на всех устройствах */
const AccountPanel: React.FC<{ onStatus: (m: string) => void }> = ({ onStatus }) => {
  const [session, setSession] = useState(userSession.get());
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = 'w-full text-sm py-2.5 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-violet-400 focus:outline-none text-white';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ token: string; login: string }>(mode === 'login' ? '/sync/login' : '/sync/register', { body: { login, password } });
      userSession.set(r.token, r.login);
      setSession({ token: r.token, login: r.login });
      await syncNow({ mergeFirst: true });
      onStatus(mode === 'login' ? 'Вход выполнен, избранное синхронизировано' : 'Аккаунт создан, избранное сохранено');
      setPassword('');
    } catch (err: any) {
      setError(err?.message || 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  if (session.token) {
    const last = lastSyncAt();
    return (
      <div className="space-y-3">
        <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/30">
          <div className="text-xs text-violet-300">Вы вошли как</div>
          <div className="text-lg font-bold text-white">{session.login}</div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Избранное синхронизируется автоматически. {last ? `Последняя синхронизация: ${new Date(last).toLocaleString('ru-RU')}` : ''}
          </div>
        </div>
        <button
          onClick={async () => {
            setBusy(true);
            try {
              const r = await syncNow();
              onStatus(r === 'pulled' ? 'Загружено с сервера' : 'Сохранено на сервере');
            } catch (e: any) {
              onStatus(e?.message || 'Ошибка синхронизации');
            } finally {
              setBusy(false);
            }
          }}
          className="w-full py-3 rounded-xl bg-violet-500 text-zinc-950 text-xs font-bold flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Синхронизировать сейчас
        </button>
        <button
          onClick={() => {
            userSession.set(null, null);
            setSession({ token: null, login: null });
          }}
          className="w-full py-3 rounded-xl bg-zinc-800 text-white text-xs font-bold flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Выйти (избранное останется на устройстве)
        </button>
        <button
          onClick={async () => {
            if (!confirm('Удалить аккаунт и все данные на сервере? Избранное на этом устройстве останется.')) return;
            try {
              await api('/sync/account', { method: 'DELETE', token: session.token });
              userSession.set(null, null);
              setSession({ token: null, login: null });
              onStatus('Аккаунт удалён');
            } catch (e: any) {
              onStatus(e?.message || 'Ошибка');
            }
          }}
          className="w-full py-2.5 rounded-xl text-cyan-300 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-cyan-500/10"
        >
          <Trash2 className="w-4 h-4" /> Удалить аккаунт
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-xs text-zinc-400 leading-relaxed">Без почты и телефона: придумайте логин и пароль. Войдите с тем же логином на другом устройстве — избранное появится там.</p>
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
        <button type="button" onClick={() => setMode('login')} className={`py-2 rounded-lg text-xs font-bold ${mode === 'login' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>
          Вход
        </button>
        <button type="button" onClick={() => setMode('register')} className={`py-2 rounded-lg text-xs font-bold ${mode === 'register' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>
          Регистрация
        </button>
      </div>
      <input className={input} value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Логин" autoComplete="username" autoCapitalize="none" />
      <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'register' ? 'Пароль (от 6 символов)' : 'Пароль'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
      {error && <p className="text-xs text-cyan-400">{error}</p>}
      <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-violet-500 text-zinc-950 text-sm font-bold flex items-center justify-center gap-2">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
        {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
      </button>
      <p className="text-[11px] text-zinc-500">Пароль хранится на сервере в зашифрованном виде (PBKDF2). Аккаунт можно удалить в любой момент.</p>
    </form>
  );
};
