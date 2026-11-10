import { EqualizerPreset, EqualizerBand } from '../types/radio';

export const DEFAULT_EQ_BANDS: EqualizerBand[] = [
  { freq: 60, label: '60 Гц', gain: 0 },
  { freq: 230, label: '230 Гц', gain: 0 },
  { freq: 910, label: '910 Гц', gain: 0 },
  { freq: 4000, label: '4 кГц', gain: 0 },
  { freq: 14000, label: '14 кГц', gain: 0 },
];

export const EQUALIZER_PRESETS: EqualizerPreset[] = [
  {
    id: 'flat',
    name: 'Плоский (Студия)',
    iconName: 'Equalizer',
    gains: [0, 0, 0, 0, 0],
    bassBoost: 0,
  },
  {
    id: 'bass-boost',
    name: 'Усиление баса (Bass Boost)',
    iconName: 'Zap',
    gains: [8, 6, 1, 0, 1],
    bassBoost: 70,
  },
  {
    id: 'electronic',
    name: 'Клуб / Electronic',
    iconName: 'Radio',
    gains: [6, 4, -1, 3, 5],
    bassBoost: 50,
  },
  {
    id: 'rock',
    name: 'Рок и драйв',
    iconName: 'Flame',
    gains: [5, 3, -2, 4, 6],
    bassBoost: 40,
  },
  {
    id: 'vocal',
    name: 'Вокал и подкасты',
    iconName: 'Mic',
    gains: [-2, 1, 6, 4, 1],
    bassBoost: 10,
  },
  {
    id: 'jazz',
    name: 'Джаз и Лаунж',
    iconName: 'Music',
    gains: [4, 2, 1, 3, 3],
    bassBoost: 30,
  },
  {
    id: 'lofi',
    name: 'Lo-Fi Chill & Focus',
    iconName: 'Coffee',
    gains: [3, 4, 0, -2, -4],
    bassBoost: 35,
  },
];
