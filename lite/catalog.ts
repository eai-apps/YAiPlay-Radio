import type { Catalog } from '../src/services/catalogService';
import { setDeadStations } from '../src/services/streamCheck';
export interface LiteCatalog extends Catalog { sourceCommit: string }
let pending: Promise<LiteCatalog> | undefined;
export function loadPlaybackCatalog(): Promise<LiteCatalog> {
  if (!pending) pending = fetch('/core.json', { cache: 'no-cache' }).then(async (r) => {
    if (!r.ok) throw new Error('Не удалось загрузить каталог. Проверьте интернет и обновите страницу.');
    const catalog: LiteCatalog = await r.json();
    setDeadStations(catalog.dead || []);
    return catalog;
  }).catch((error) => { pending = undefined; throw error; });
  return pending;
}
