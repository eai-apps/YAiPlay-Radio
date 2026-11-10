import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// base: './' — сайт работает и на GitHub Pages (eai-apps.github.io/YAiPlay-Radio/),
// и на своём домене, и внутри мобильного приложения (Capacitor).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // Номер сборки (коммит) — приложение сравнивает его с последним APK и предлагает обновиться
  define: { __BUILD__: JSON.stringify((process.env.BUILD_ID || process.env.GITHUB_SHA || 'dev').slice(0, 7)) },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
