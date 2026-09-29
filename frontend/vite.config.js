import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { staticPages } from './build/static-pages.js';

const publicDir = fileURLToPath(new URL('./public', import.meta.url));
// One .env at the repository root serves both Docker Compose and Vite.
const envDir = fileURLToPath(new URL('..', import.meta.url));

/** Where the site will live, e.g. https://you.github.io/nebula-atlas/ (always ends in "/"). */
function resolveSiteUrl(value) {
  const url = new URL(value || 'http://localhost:5173/');
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  url.search = '';
  url.hash = '';
  return url.href;
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, envDir, 'VITE_'), ...process.env };
  const siteUrl = resolveSiteUrl(env.VITE_SITE_URL);
  const buildId = mode === 'test' ? 'test' : Date.now().toString(36);

  return {
    // GitHub project pages live under /<repo>/, so every asset URL needs that prefix.
    base: new URL(siteUrl).pathname,
    publicDir,
    envDir,
    define: {
      __SITE_URL__: JSON.stringify(siteUrl),
      __BUILD_ID__: JSON.stringify(buildId),
    },
    plugins: [react(), tailwindcss(), staticPages({ siteUrl, publicDir, buildId })],
    server: {
      host: env.VITE_HOST || 'localhost',
      port: 5173,
      strictPort: true,
      // Docker Desktop on macOS/Windows doesn't forward file events into containers.
      watch: env.VITE_USE_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
    },
    preview: { port: 4173, strictPort: true },
    build: {
      target: 'es2022',
      cssTarget: ['chrome111', 'safari16.4', 'firefox128'],
      sourcemap: false,
      assetsInlineLimit: 0,
      reportCompressedSize: true,
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js'],
      include: ['src/**/*.test.{js,jsx}'],
      css: false,
      restoreMocks: true,
      unstubGlobals: true,
    },
  };
});
