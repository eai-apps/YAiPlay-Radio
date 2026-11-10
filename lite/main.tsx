import { createRoot } from 'react-dom/client';
import './style.css';

// Before importing the player: its first stream must already use weak-network mode.
try {
  if (!localStorage.getItem('YAi_quality')) localStorage.setItem('YAi_quality', 'weak');
  if (!localStorage.getItem('YAi_view_mode')) localStorage.setItem('YAi_view_mode', 'list');
} catch {}

import('./App').then(({ default: App }) => createRoot(document.getElementById('root')!).render(<App />));

if ('serviceWorker' in navigator && import.meta.env.PROD && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
