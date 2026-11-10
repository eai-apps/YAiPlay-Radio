/**
 * Нативный плеер Android (Media3/ExoPlayer из YAiNativePlugin).
 *
 * NativeAudio ведёт себя как обычный <audio> (src, play(), pause(), volume, paused, readyState, события
 * playing / pause / waiting / error / canplay), поэтому остальной код плеера не меняется.
 * Включается только если в установленном APK есть нативный плеер (старые APK играют как раньше).
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { DATA_BASE } from '../utils/platform';

type State = 'playing' | 'paused' | 'buffering' | 'error' | 'idle';

interface PlayerPlugin {
  playerInfo(): Promise<{ version: number; bands: number[] }>;
  playerLoad(o: { url: string }): Promise<void>;
  playerPlay(): Promise<void>;
  playerPause(): Promise<void>;
  playerStop(): Promise<void>;
  playerVolume(o: { volume: number }): Promise<void>;
  playerMeta(o: { title: string; artist: string; artwork: string }): Promise<void>;
  getSystemVolume(): Promise<{ volume: number }>;
  setSystemVolume(o: { volume: number }): Promise<void>;
  playerEq(o: { enabled: boolean; gains: number[]; bass: number }): Promise<void>;
  playerBuffer(o: { ms: number }): Promise<void>;
  playerViz(o: { enabled: boolean }): Promise<void>;
  addListener(ev: 'player', cb: (d: { state: State; message?: string }) => void): Promise<{ remove: () => void }>;
  addListener(ev: 'playerTitle', cb: (d: { title: string }) => void): Promise<{ remove: () => void }>;
  addListener(ev: 'viz', cb: (d: { b: number[] }) => void): Promise<{ remove: () => void }>;
}

const P = registerPlugin<PlayerPlugin>('YAiNative');

let detected: Promise<number[] | null> | null = null;
let nativeVersion = 0;
/** Полосы эквалайзера, если нативный плеер есть; иначе null */
export function detectNativePlayer(): Promise<number[] | null> {
  if (!detected) {
    detected = (async () => {
      try {
        if (Capacitor.getPlatform() !== 'android' || !Capacitor.isPluginAvailable('YAiNative')) return null;
        const info = await P.playerInfo();
        if (!(info?.version >= 1 && Array.isArray(info.bands))) return null;
        nativeVersion = info.version;
        // Аварийный выключатель из админки (Видимость → «Нативный плеер Android»): все вернутся на старый плеер
        if (await nativeSwitchedOff()) return null;
        return info.bands;
      } catch {
        return null; // старый APK — метода нет
      }
    })();
  }
  return detected;
}

/** Громкость телефона 0…1 (null — в этом APK метода ещё нет) */
export async function getSystemVolume(): Promise<number | null> {
  try {
    const r = await P.getSystemVolume();
    return typeof r?.volume === 'number' ? r.volume : null;
  } catch {
    return null;
  }
}
export function setSystemVolume(volume: number): Promise<void> {
  return P.setSystemVolume({ volume }).catch(() => {});
}

/** В APK есть своя карточка плеера (шторка, экран блокировки) — версия 2 и новее */
export const hasNativeSession = () => nativeVersion >= 2;

/** Название, станция и обложка для карточки в шторке и на экране блокировки */
export function setNativeMeta(title: string, artist: string, artwork: string) {
  P.playerMeta({ title, artist, artwork: /^https?:|^data:/.test(artwork) ? artwork : '' }).catch(() => {});
}

async function nativeSwitchedOff(): Promise<boolean> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const c = await fetch(`${DATA_BASE}content.json?t=${Date.now()}`, { cache: 'no-store', signal: ctl.signal }).then((r) => (r.ok ? r.json() : null));
    clearTimeout(t);
    return Array.isArray(c?.hiddenSections) && c.hiddenSections.includes('nativeplayer');
  } catch {
    return false; // нет сети / сайт недоступен — нативный плеер работает
  }
}

/** Замена <audio>, управляющая нативным плеером */
export class NativeAudio extends EventTarget {
  private _src = '';
  private _volume = 1;
  paused = true;
  readyState = 0;
  error: { message: string } | null = null;
  preload = 'none';
  crossOrigin: string | null = null;
  private waiters: { ok: () => void; fail: (e: Error) => void }[] = [];

  constructor() {
    super();
    P.addListener('player', (d) => this.onState(d.state, d.message || '')).catch(() => {});
    P.addListener('playerTitle', (d) => {
      if (d?.title) window.dispatchEvent(new CustomEvent('YAi_native_title', { detail: d.title }));
    }).catch(() => {});
  }

  private fire(type: string) {
    this.dispatchEvent(new Event(type));
  }

  private settle(err?: Error) {
    const w = this.waiters;
    this.waiters = [];
    w.forEach((x) => (err ? x.fail(err) : x.ok()));
  }

  private onState(state: State, message: string) {
    if (state === 'playing') {
      this.paused = false;
      this.error = null;
      if (this.readyState < 4) {
        this.readyState = 4;
        this.fire('canplay');
      }
      this.fire('playing');
      this.settle();
    } else if (state === 'buffering') {
      if (this.readyState > 2) this.readyState = 2;
      if (!this.paused) this.fire('waiting');
    } else if (state === 'paused') {
      if (!this.paused) {
        this.paused = true; // поставила на паузу система: наушники, звонок, другое приложение
        this.fire('pause');
      }
    } else if (state === 'error') {
      this.error = { message: message || 'error' };
      this.readyState = 0;
      this.fire('error');
      this.settle(new Error(message || 'native player error'));
    }
  }

  get src() {
    return this._src;
  }
  set src(v: string) {
    this._src = v || '';
    this.readyState = 0;
    this.error = null;
    this.settle(new Error('aborted'));
    P.playerLoad({ url: this._src }).catch(() => {});
    if (!this._src) this.paused = true;
  }

  get volume() {
    return this._volume;
  }
  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    P.playerVolume({ volume: this._volume }).catch(() => {});
  }

  play(): Promise<void> {
    if (!this._src) return Promise.reject(new Error('no source'));
    this.paused = false;
    const p = new Promise<void>((ok, fail) => this.waiters.push({ ok, fail }));
    P.playerPlay().catch(() => {});
    return p;
  }

  pause() {
    const was = this.paused;
    this.paused = true;
    P.playerPause().catch(() => {});
    if (!was) this.fire('pause');
  }

  load() {}
  removeAttribute(_n: string) {}
  setAttribute(_n: string, _v: string) {}
  /** ExoPlayer сам играет HLS (.m3u8), hls.js не нужен */
  canPlayType(_t: string) {
    return 'maybe';
  }
}

// ---------- Настройки звука (эквалайзер, басы, буфер, визуализация) ----------
export interface SoundSettings {
  eqEnabled: boolean;
  gains: number[]; // 10 полос, дБ
  bass: number; // 0…12 дБ
  preset: string;
  bufferMs: number;
  viz: boolean;
}

const SOUND_KEY = 'YAi_sound_v1';
export const BUFFER_OPTIONS = [
  { ms: 1000, label: 'Быстрый старт', hint: '1 с — включается мгновенно' },
  { ms: 2500, label: 'Обычный', hint: '2,5 с — по умолчанию' },
  { ms: 6000, label: 'Надёжный', hint: '6 с — для мобильного интернета' },
  { ms: 12000, label: 'В дороге', hint: '12 с — переживает тоннели и слабую связь' },
];

export const EQ_PRESETS: { id: string; name: string; gains: number[]; bass: number }[] = [
  { id: 'flat', name: 'Без изменений', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], bass: 0 },
  { id: 'bass', name: 'Мощный бас', gains: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0], bass: 6 },
  { id: 'dance', name: 'Танцевальная', gains: [5, 4, 2, 0, -1, 0, 1, 3, 4, 4], bass: 4 },
  { id: 'rock', name: 'Рок', gains: [4, 3, 2, 0, -2, -1, 2, 3, 4, 4], bass: 2 },
  { id: 'pop', name: 'Поп', gains: [-1, 1, 3, 4, 3, 1, 0, 1, 2, 2], bass: 0 },
  { id: 'jazz', name: 'Джаз', gains: [3, 2, 1, 2, -1, -1, 0, 1, 2, 3], bass: 1 },
  { id: 'classic', name: 'Классика', gains: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4], bass: 0 },
  { id: 'vocal', name: 'Голос и разговор', gains: [-3, -2, -1, 1, 4, 5, 4, 2, 0, -1], bass: 0 },
  { id: 'car', name: 'В машине', gains: [4, 3, 1, 0, 0, 1, 2, 3, 2, 1], bass: 3 },
  { id: 'night', name: 'Ночью тихо', gains: [-2, -1, 0, 1, 2, 2, 1, 0, -2, -3], bass: 0 },
];

const DEFAULTS: SoundSettings = { eqEnabled: false, gains: EQ_PRESETS[0].gains, bass: 0, preset: 'flat', bufferMs: 2500, viz: true };

export function loadSound(): SoundSettings {
  try {
    const s = JSON.parse(localStorage.getItem(SOUND_KEY) || 'null');
    if (s && Array.isArray(s.gains) && s.gains.length === 10) return { ...DEFAULTS, ...s };
  } catch {}
  return { ...DEFAULTS, gains: [...DEFAULTS.gains] };
}

export function applySound(s: SoundSettings, save = true) {
  if (save) {
    try {
      localStorage.setItem(SOUND_KEY, JSON.stringify(s));
    } catch {}
  }
  P.playerEq({ enabled: s.eqEnabled, gains: s.gains, bass: s.bass }).catch(() => {});
  P.playerBuffer({ ms: s.bufferMs }).catch(() => {});
}

/** Подписка на спектр (32 полосы 0…1). Пока есть подписчики — нативный плеер считает спектр. */
const vizSubs = new Set<(b: number[]) => void>();
let vizHandle: Promise<{ remove: () => void }> | null = null;
export function onSpectrum(cb: (b: number[]) => void): () => void {
  vizSubs.add(cb);
  if (!vizHandle) {
    vizHandle = P.addListener('viz', (d) => vizSubs.forEach((f) => f(d.b || [])));
    P.playerViz({ enabled: true }).catch(() => {});
  }
  return () => {
    vizSubs.delete(cb);
    if (!vizSubs.size && vizHandle) {
      const h = vizHandle;
      vizHandle = null;
      P.playerViz({ enabled: false }).catch(() => {});
      h.then((x) => x.remove()).catch(() => {});
    }
  };
}
