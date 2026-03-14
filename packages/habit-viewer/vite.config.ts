import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/intersect/habits/viewer/',
  resolve: {
    alias: {
      '@ha-bits/workflow-canvas': path.resolve(__dirname, '../workflow-canvas/src/index.ts'),
      '@ha-bits/core': path.resolve(__dirname, '../core/src/index.ts'),
    },
  },
  server: {
    port: 3030,
  },
  build: {
    outDir: '../../dist/packages/habit-viewer',
    emptyOutDir: true,
  },
});
