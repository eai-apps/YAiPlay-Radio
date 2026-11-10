/**
 * Радио в формате HLS (.m3u8): Safari и Android играют сами, а Chrome/Edge на компьютере — только через hls.js.
 * Без этого такие станции на ПК выглядели «мёртвыми».
 */
type HlsCtor = any;
let Hls: HlsCtor | null = null;
let loading: Promise<HlsCtor | null> | null = null;
let current: any = null;

export const isHlsUrl = (u: string) => /\.m3u8(\?|#|$)/i.test(u || '');
const nativeHls = (a: HTMLMediaElement) => !!a.canPlayType('application/vnd.apple.mpegurl');

export function loadHls(): Promise<HlsCtor | null> {
  if (Hls) return Promise.resolve(Hls);
  if (!loading) loading = import('hls.js').then((m) => (Hls = m.default)).catch(() => null);
  return loading;
}

/** Заранее подгружаем hls.js там, где браузер сам HLS не умеет (компьютеры) */
export function preloadHlsIfNeeded() {
  try {
    const a = document.createElement('audio');
    if (!nativeHls(a)) {
      const idle = (window as any).requestIdleCallback || ((f: () => void) => setTimeout(f, 2500));
      idle(() => loadHls());
    }
  } catch {}
}

/**
 * Поставить поток в плеер. Возвращает false, если нужен hls.js, а он ещё грузится
 * (тогда вызывающий подождёт loadHls() и вызовет ещё раз).
 */
export function setStream(audio: HTMLAudioElement, url: string): boolean {
  if (current) {
    try {
      current.destroy();
    } catch {}
    current = null;
  }
  if (!isHlsUrl(url) || nativeHls(audio)) {
    audio.src = url;
    return true;
  }
  if (!Hls) return false;
  if (!Hls.isSupported()) {
    audio.src = url;
    return true;
  }
  const h = new Hls({ enableWorker: true, lowLatencyMode: false });
  h.on(Hls.Events.ERROR, (_: unknown, d: any) => {
    if (d?.fatal) audio.dispatchEvent(new Event('error'));
  });
  h.loadSource(url);
  h.attachMedia(audio);
  current = h;
  return true;
}
