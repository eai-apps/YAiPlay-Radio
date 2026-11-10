import { setDeadStations } from './streamCheck';
import { DATA_BASE } from '../utils/platform';
/**
 * Проверенный каталог (public/catalog.json), который каждый день собирает робот GitHub
 * (scripts/build-catalog.mjs). Если файла ещё нет — сайт работает «вживую» без него.
 */
import { Station } from '../types/radio';

export interface CatalogTvChannel {
  id: string;
  name: string;
  country: string;
  categories: string[];
  website: string;
  logo: string;
  stream: string;
  quality: string;
}

/** Подборка YAi: готовый плейлист под настроение (собирает робот каталога) */
export interface CuratedList {
  id: string;
  name: string;
  emoji: string;
  note: string;
  gradient: string;
  stations: Station[];
}

export interface Catalog {
  generatedAt: string | null;
  artists: Record<string, Station[]>;
  series: Station[];
  tv: CatalogTvChannel[];
  deadLinks: string[];
  exclusive?: { id: string; name: string; note: string; stations: Station[] }[];
  curated?: CuratedList[];
  /** станции, которые робот ночью нашёл мёртвыми (прячем у всех) */
  dead?: string[];
}

const EMPTY: Catalog = { generatedAt: null, artists: {}, series: [], tv: [], deadLinks: [] };
let promise: Promise<Catalog> | null = null;

export function loadCatalog(): Promise<Catalog> {
  if (!promise) {
    promise = fetch(`${DATA_BASE}catalog.json?d=${new Date().toISOString().slice(0, 13)}`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : EMPTY))
      .then((j) => ({ ...EMPTY, ...j }))
      .then((c) => {
        if (Array.isArray(c.dead)) setDeadStations(c.dead);
        return c;
      })
      .catch(() => EMPTY);
  }
  return promise;
}

/** Каталог уже собирался роботом хотя бы раз */
export const isCatalogReady = (c: Catalog) => !!c.generatedAt;
