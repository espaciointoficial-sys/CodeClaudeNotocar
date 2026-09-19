import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

// electron-vite no minifica por defecto. Activarlo reduce el paquete y, sobre todo, el trabajo
// que Chromium tiene que hacer al analizar el bundle en cada arranque. Solo afecta a `build`:
// en `dev` se sigue sirviendo el código sin transformar.
const minify = 'esbuild' as const;

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
      },
    },
    build: { minify },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
      },
    },
    build: { minify },
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@': resolve('src/renderer'),
      },
    },
    build: {
      minify,
      rollupOptions: {
        input: resolve('src/renderer/index.html'),
      },
    },
  },
});
