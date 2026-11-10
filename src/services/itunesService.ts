/**
 * Обложка песни из iTunes Search API.
 * Берём обложку только если исполнитель в результате совпадает с исполнителем из эфира —
 * иначе лучше показать логотип станции, чем чужую обложку.
 */
const cache = new Map<string, string>();

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\b(feat|ft|featuring)\b.*$/i, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** «Double Key - We Love To Love - 1990» → { artist: 'Double Key', title: 'We Love To Love' } */
export function splitTrack(raw: string): { artist: string; title: string } | null {
  const cleaned = raw
    .replace(/\s*[-–—]\s*(19|20)\d{2}\s*$/, '') // год в конце
    .replace(/\s*[\[(](19|20)\d{2}[\])]\s*$/, '')
    .trim();
  const m = cleaned.split(/\s+[-–—]\s+/);
  if (m.length < 2) return null;
  const artist = m[0].trim();
  const title = m.slice(1).join(' - ').trim();
  return artist && title ? { artist, title } : null;
}

export async function fetchAlbumArtFromItunes(query: string): Promise<string | null> {
  const parts = splitTrack(query);
  if (!parts) return null;
  const key = `${norm(parts.artist)}|${norm(parts.title)}`;
  if (cache.has(key)) return cache.get(key) || null;

  try {
    const term = `${parts.artist} ${parts.title.replace(/[\[(].*?[\])]/g, '')}`;
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=10`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const wantArtist = norm(parts.artist);
    const hit = (data.results || []).find((r: any) => {
      const a = norm(r.artistName || '');
      return a && (a.includes(wantArtist) || wantArtist.includes(a));
    });
    const art = hit?.artworkUrl100 ? String(hit.artworkUrl100).replace('100x100bb', '600x600bb') : '';
    cache.set(key, art);
    return art || null;
  } catch {
    return null;
  }
}
