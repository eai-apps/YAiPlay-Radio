/**
 * Связь с мини-сервером yaiplay-radio-api (Cloudflare Worker, папка worker/).
 * Адрес задаётся в админке (вкладка «Сервер») и хранится в content.json → apiUrl.
 * Пока адреса нет — функции, которым нужен сервер, просто скрыты.
 */
let apiBase = '';

export function setApiBase(url: string | undefined) {
  apiBase = (url || '').trim().replace(/\/+$/, '');
}
export const getApiBase = () => apiBase;
export const hasApi = () => !!apiBase;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; token?: string | null; base?: string } = {}): Promise<T> {
  const base = (opts.base ?? apiBase).replace(/\/+$/, '');
  if (!base) throw new ApiError('Сервер не настроен', 0);
  let res: Response;
  try {
    res = await fetch(base + path, {
      method: opts.method || (opts.body ? 'POST' : 'GET'),
      headers: {
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError('Нет связи с сервером', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data?.error || `Ошибка ${res.status}`, res.status);
  return data as T;
}

// ---- токены (хранятся только на этом устройстве) ----
const ADMIN_TOKEN = 'YAi_admin_token';
const USER_TOKEN = 'YAi_user_token';
const USER_LOGIN = 'YAi_user_login';
const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string | null) => {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {}
};
export const adminToken = {
  get: () => read(ADMIN_TOKEN),
  set: (t: string | null) => write(ADMIN_TOKEN, t),
};
export const userSession = {
  get: () => ({ token: read(USER_TOKEN), login: read(USER_LOGIN) }),
  set: (token: string | null, login: string | null) => {
    write(USER_TOKEN, token);
    write(USER_LOGIN, login);
  },
};
