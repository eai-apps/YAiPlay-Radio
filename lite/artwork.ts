import { imagesEnabled } from './preferences';
import { fetchAlbumArtFromItunes as originalArt, splitTrack } from '../src/services/itunesService.ts';
import { stationCard as originalCard } from '../src/services/lockArtwork.ts';
import type { Station } from '../src/types/radio';
export { splitTrack };
export const fetchAlbumArtFromItunes = (query: string) => imagesEnabled() ? originalArt(query) : Promise.resolve(null);
export const stationCard = (station: Station) => imagesEnabled() ? originalCard(station) : Promise.resolve('');
