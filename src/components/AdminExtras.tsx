import React, { useEffect, useState } from 'react';
import { Lock, Loader2, Server, CheckCircle, AlertTriangle, Trash2, Mail, RefreshCw, Plus, ExternalLink } from 'lucide-react';
import { api, adminToken, ApiError } from '../services/apiService';
import { PartnerLink, YAiSettings } from '../types/radio';

const input =
  'w-full text-sm py-2.5 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-violet-400 focus:outline-none text-white';

// ---------- пароль без сервера (запасной вариант) ----------
async function pbkdf2(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 150000 }, key, 256);
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}
const LOCAL_UNLOCK = 'yaiplayradio_admin_unlocked';

/** Экран входа в админку */
export const AdminLogin: React.FC<{
  settings: YAiSettings;
  onUnlocked: () => void;
  onSetLock: (lock: string) => void;
}> = ({ settings, onUnlocked, onSetLock }) => {
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const mode: 'server' | 'local' | 'create' = settings.apiUrl ? 'server' : settings.adminLock ? 'local' : 'create';

  // Уже входили на этом устройстве?
  useEffect(() => {
    (async () => {
      try {
        if (mode === 'server' && adminToken.get()) {
          await api('/admin/check', { token: adminToken.get() });
          onUnlocked();
          return;
        }
        if (mode === 'local' && sessionStorage.getItem(LOCAL_UNLOCK) === settings.adminLock) {
          onUnlocked();
          return;
        }
      } catch {
        adminToken.set(null);
      }
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'server') {
        const { token } = await api<{ token: string }>('/admin/login', { body: { password } });
        adminToken.set(token);
        onUnlocked();
      } else if (mode === 'local') {
        const [, salt, hash] = (settings.adminLock || '').split(':');
        if ((await pbkdf2(password, salt)) !== hash) throw new Error('Неверный пароль');
        sessionStorage.setItem(LOCAL_UNLOCK, settings.adminLock!);
        onUnlocked();
      } else {
        if (password.length < 8) throw new Error('Пароль: минимум 8 символов');
        if (password !== password2) throw new Error('Пароли не совпадают');
        const salt = crypto.getRandomValues(new Uint32Array(2)).join('');
        const lock = `pbkdf2:${salt}:${await pbkdf2(password, salt)}`;
        onSetLock(lock);
        sessionStorage.setItem(LOCAL_UNLOCK, lock);
        onUnlocked();
      }
    } catch (err: any) {
      setError(err instanceof ApiError || err?.message ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  if (checking && mode !== 'create') {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Проверяем вход…
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white">{mode === 'create' ? 'Придумайте пароль админки' : 'Вход в админку'}</h3>
        {mode === 'create' && (
          <p className="text-xs text-zinc-400 leading-relaxed">
            После этого опубликуйте content.json — пароль начнёт действовать для всех. Надёжнее всего — подключить мини-сервер
            (вкладка «Сервер»): тогда пароль хранится на сервере.
          </p>
        )}
        <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" className={input} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} />
        {mode === 'create' && (
          <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="Повторите пароль" className={input} autoComplete="new-password" />
        )}
        {error && <p className="text-xs text-cyan-400">{error}</p>}
        <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} {mode === 'create' ? 'Сохранить пароль' : 'Войти'}
        </button>
      </form>
    </div>
  );
};

// ---------- вкладка «Сервер» ----------
export const AdminServerTab: React.FC<{ apiUrl: string; onSave: (url: string) => void }> = ({ apiUrl, onSave }) => {
  const [url, setUrl] = useState(apiUrl);
  const [status, setStatus] = useState<null | { ok: boolean; text: string }>(null);
  const [busy, setBusy] = useState(false);

  const check = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const h = await api<any>('/health', { base: url.trim() });
      setStatus({
        ok: !!h.kv,
        text: `Сервер отвечает. Хранилище: ${h.kv ? 'да' : 'НЕТ (привяжите KV как DB)'} · Публикация: ${h.publish ? 'да' : 'нет'} · Telegram: ${h.telegram ? 'да' : 'нет'}`,
      });
    } catch (e: any) {
      setStatus({ ok: false, text: e?.message || 'Нет ответа' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 text-xs text-zinc-300 leading-relaxed">
        <b className="text-white flex items-center gap-2 mb-1">
          <Server className="w-4 h-4 text-cyan-400" /> Мини-сервер yaiplayradio-api (Cloudflare, бесплатно)
        </b>
        Нужен для: пароля админки на сервере, сообщений техподдержки, входа и синхронизации избранного, названий песен (RDS),
        определения страны, публикации одной кнопкой. Инструкция по размещению — в репозитории: <span className="font-mono">worker/README.md</span>.
      </div>
      <input className={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yaiplayradio-api.<логин>.workers.dev" />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={check} disabled={!url.trim() || busy} className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Проверить
        </button>
        <button type="button" onClick={() => onSave(url.trim())} className="px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-zinc-950 text-xs font-bold">
          Сохранить адрес
        </button>
      </div>
      {status && (
        <p className={`text-xs flex items-start gap-2 ${status.ok ? 'text-violet-300' : 'text-amber-300'}`}>
          {status.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />} {status.text}
        </p>
      )}
      <p className="text-[11px] text-zinc-500">После сохранения опубликуйте изменения — адрес сервера начнут использовать все посетители.</p>
      {apiUrl && <VkConnect />}
    </div>
  );
};

/** Подключение ВКонтакте для постов с картинками: вход администратора через VK ID, ключи остаются на сервере */
const VkConnect: React.FC = () => {
  const [st, setSt] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = async () => {
    setErr(null);
    try {
      setSt(await api('/admin/vk/status', { token: adminToken.get() }));
    } catch (e: any) {
      setErr(e?.message || 'Ошибка');
    }
  };
  useEffect(() => {
    load();
  }, []);
  const start = async () => {
    setErr(null);
    try {
      const r = await api<{ url?: string; error?: string }>('/admin/vk/start', { body: {}, token: adminToken.get() });
      if (r.url) window.open(r.url, '_blank');
      else setErr(r.error || 'Ошибка');
    } catch (e: any) {
      setErr(e?.message || 'Ошибка');
    }
  };
  return (
    <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-3">
      <b className="text-white text-sm block">ВКонтакте — посты с картинками</b>
      <p className="text-xs text-zinc-400 leading-relaxed">
        Вы входите через VK ID как администратор группы. Ключи хранятся только на сервере и обновляются автоматически; раз в полгода
        может понадобиться нажать кнопку снова.
      </p>
      {st && (
        <div className="text-xs space-y-1">
          <div className={st.connected ? 'text-violet-300' : 'text-amber-300'}>
            {st.connected ? `✅ Подключено${st.scope ? ` · права: ${st.scope}` : ''}${st.at ? ` · ${new Date(st.at * 1000).toLocaleString('ru')}` : ''}` : '⚪ Не подключено'}
          </div>
          {!st.configured && <div className="text-amber-300">На сервере нет VK_CLIENT_ID — см. worker/README.md, раздел «ВКонтакте».</div>}
          {!st.bridge && <div className="text-amber-300">На сервере нет VK_BRIDGE_KEY.</div>}
          {st.error && <div className="text-cyan-300">Последняя ошибка: {st.error}</div>}
        </div>
      )}
      {err && <p className="text-xs text-cyan-300">{err}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={start} disabled={!st?.configured} className="px-4 py-2.5 rounded-xl bg-[#0077ff] hover:bg-[#1a85ff] text-white text-xs font-bold disabled:opacity-50">
          {st?.connected ? 'Переподключить ВКонтакте' : 'Подключить ВКонтакте'}
        </button>
        <button type="button" onClick={load} className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Обновить статус
        </button>
      </div>
    </div>
  );
};

// ---------- вкладка «Сообщения» ----------
interface Msg {
  id: string;
  text: string;
  name?: string;
  contact?: string;
  topic?: string;
  page?: string;
  at: number;
}
export const AdminMessagesTab: React.FC<{ hasServer: boolean }> = ({ hasServer }) => {
  const [list, setList] = useState<Msg[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const r = await api<{ messages: Msg[] }>('/admin/messages', { token: adminToken.get() });
      setList(r.messages);
    } catch (e: any) {
      setError(e?.message || 'Ошибка');
    }
  };
  useEffect(() => {
    if (hasServer) load();
  }, [hasServer]);

  const remove = async (id: string) => {
    await api(`/admin/messages/${encodeURIComponent(id)}`, { method: 'DELETE', token: adminToken.get() }).catch(() => {});
    setList((l) => (l || []).filter((m) => m.id !== id));
  };

  if (!hasServer) return <p className="p-6 text-sm text-zinc-400">Сообщения техподдержки работают после подключения мини-сервера (вкладка «Сервер»).</p>;

  return (
    <div className="p-5 sm:p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Mail className="w-4 h-4 text-cyan-400" /> Сообщения от пользователей {list ? `(${list.length})` : ''}
        </h3>
        <button onClick={load} className="p-2 rounded-lg bg-zinc-800 text-zinc-200" title="Обновить">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {error && <p className="text-xs text-cyan-400">{error}</p>}
      {!list && !error && <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />}
      {list?.length === 0 && <p className="text-sm text-zinc-500">Пока нет сообщений.</p>}
      {list?.map((m) => (
        <div key={m.id} className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
            <span>
              {new Date(m.at).toLocaleString('ru-RU')} {m.topic ? `· ${m.topic}` : ''}
            </span>
            <button onClick={() => remove(m.id)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400" title="Удалить">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-white whitespace-pre-wrap">{m.text}</p>
          <p className="text-xs text-zinc-400">
            {m.name || 'Без имени'} {m.contact ? `· ${m.contact}` : ''}
          </p>
        </div>
      ))}
    </div>
  );
};

// ---------- вкладка «Партнёры / реклама» ----------
export const AdminPartnersTab: React.FC<{ partners: PartnerLink[]; onChange: (p: PartnerLink[]) => void }> = ({ partners, onChange }) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [isAd, setIsAd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !/^https:\/\//.test(url.trim())) return setError('Нужны название и https-ссылка');
    onChange([
      ...partners,
      { id: `p-${Date.now()}`, title: title.trim(), url: url.trim(), description: description.trim(), image: image.trim(), isAd },
    ]);
    setTitle('');
    setUrl('');
    setDescription('');
    setImage('');
    setIsAd(false);
    setError(null);
  };

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <p className="text-xs text-zinc-400 leading-relaxed">
        Блок «Рекомендуем» внизу главной и в разделе «О проекте». Если за размещение платят — отметьте «Реклама»: по закону ЕС
        рекламу нужно помечать.
      </p>
      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название *" />
        <input className={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Ссылка https://… *" />
        <input className={input} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Короткое описание" />
        <input className={input} value={image} onChange={(e) => setImage(e.target.value)} placeholder="Картинка https://… (необязательно)" />
        <label className="flex items-center gap-2 text-xs text-zinc-300">
          <input type="checkbox" checked={isAd} onChange={(e) => setIsAd(e.target.checked)} /> Это платная реклама
        </label>
        <button type="submit" className="py-2.5 rounded-xl bg-violet-500 text-zinc-950 text-xs font-bold flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Добавить
        </button>
        {error && <p className="text-xs text-cyan-400 sm:col-span-2">{error}</p>}
      </form>
      <div className="space-y-1.5">
        {partners.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                {p.isAd && <span className="text-amber-400 mr-1">[Реклама]</span>}
                {p.title}
              </div>
              <div className="text-[10px] text-zinc-500 truncate">{p.url}</div>
            </div>
            <a href={p.url} target="_blank" rel="noreferrer" className="p-2 text-zinc-400">
              <ExternalLink className="w-4 h-4" />
            </a>
            <button onClick={() => onChange(partners.filter((x) => x.id !== p.id))} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
