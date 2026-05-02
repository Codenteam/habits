import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ha-bits/core': path.resolve(__dirname, '../../core/src/index.ts'),
      '@ha-bits/frontend-builder': path.resolve(__dirname, '../frontend-builder/src/index.ts'),
      '@ha-bits/workflow-canvas': path.resolve(__dirname, '../../workflow-canvas/src/index.ts'),
      '@habits/shared': path.resolve(__dirname, '../../core/src'),
    },
  },
  build: {
    outDir: '../../../dist/packages/base/ui',
    emptyOutDir: true,
  },
  base: '/habits/base/',
  publicDir: path.resolve(__dirname, 'public'),
  server: {
    port: 3001,
    proxy: {
      '/habits/base/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/habits\/base\/api/, '/api'),
      },
    },
  },
});
