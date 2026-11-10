import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const lite = (file: string) => path.join(root, 'lite', file).replaceAll('\\', '/');

// Build-time adapters let us reuse features without changing any main-site source.
// Imports ending in .ts/.tsx explicitly refer to the original implementation.
function liteAdapters(): Plugin {
  return {
    name: 'YAi-lite-adapters', enforce: 'pre',
    resolveId(id) {
      if (/\/utils\/platform$/.test(id)) return lite('platform.ts');
      if (/\/services\/apiService$/.test(id)) return lite('api.ts');
      if (/(^|\/)(StationLogo|StationGrid|Visualizer|Globe3DCanvas)$/.test(id)) return lite(`${id.split('/').pop()}.tsx`);
      if (/\/services\/(itunesService|lockArtwork)$/.test(id)) return lite('artwork.ts');
      return null;
    },
    transform(code, id) {
      if (!id.replaceAll('\\', '/').includes('/src/')) return;
      if (id.endsWith('AudioPlayerContext.tsx')) {
        code = code.replace("import { loadCatalog } from '../services/catalogService';", `import { loadPlaybackCatalog as loadCatalog } from ${JSON.stringify(lite('catalog.ts'))};`);
        code = code.replace('exclusiveById.set(st.stationuuid, st))));', 'exclusiveById.set(st.stationuuid, st)))).catch(() => {});');
      }
      if (id.endsWith('hlsAudio.ts')) code = code.replace(/export function preloadHlsIfNeeded\(\) \{[\s\S]*?\n\}/, 'export function preloadHlsIfNeeded() {}');
      if (id.endsWith('WebcamsView.tsx')) code = code.replace('useState(true)', 'useState(false)');
      if (id.endsWith('FullScreenPlayer.tsx')) {
        code = code.replace(/style=\{\{ backgroundImage:.*?\}\}/g, '')
          .replace('fixed inset-0 z-[56] h-[100dvh]', 'lite-full-player fixed inset-0 z-[56] h-[100dvh]')
          .replace('flex-1 min-h-[96px] my-2 flex items-center justify-center', 'lite-player-cover flex-1 min-h-[96px] my-2 flex items-center justify-center')
          .replace('className="flex items-center gap-2 shrink-0"', 'className="lite-now-playing flex items-center gap-2 shrink-0"');
      }
      code = code.replaceAll("behavior: 'smooth'", "behavior: 'auto'");
      if (/<img\b/.test(code)) {
        code = `import { LiteImage } from ${JSON.stringify(lite('Image.tsx'))};\n` + code.replace(/<img\b/g, '<LiteImage');
      }
      return { code, map: null };
    },
  };
}
export default defineConfig({
  root: path.join(root, 'lite'), base: '/', publicDir: false,
  plugins: [liteAdapters(), react(), tailwindcss()],
  define: { __BUILD__: JSON.stringify((process.env.BUILD_ID || process.env.GITHUB_SHA || 'dev').slice(0, 7)) },
  resolve: { alias: { '@': root } },
  build: { outDir: path.join(root, 'dist-lite'), emptyOutDir: true, manifest: true },
  server: { host: '127.0.0.1', port: 3001, fs: { allow: [root] } },
});
