import { initAppUpdater } from './services/appUpdater';
import { initLiteMode } from './utils/liteMode';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
// Шрифты встроены в сайт (без запросов к Google — важно для GDPR)
import '@fontsource-variable/manrope';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import './index.css';

initLiteMode();
createRoot(document.getElementById('root')!).render(<App />);

// Service worker — только в собранной версии на https (не мешает разработке на localhost)
if ('serviceWorker' in navigator && import.meta.env.PROD && location.protocol === 'https:' && !(window as any).Capacitor) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// Приложение: тихое автообновление кода с сайта
initAppUpdater();
