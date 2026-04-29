import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Served as static files from the main Next.js site at /gym-flow/ (single Vercel deployment). */
export default defineConfig({
  base: '/gym-flow/',
  build: {
    outDir: resolve(__dirname, '../public/gym-flow'),
    emptyOutDir: true,
  },
  server: {
    port: 5780,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
