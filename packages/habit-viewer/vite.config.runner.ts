import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

/**
 * Vite config for building habit-viewer for habits-cortex (Tauri app)
 * Uses relative paths and no hashes for consistent asset names
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  resolve: {
    alias: {
      '@ha-bits/workflow-canvas': path.resolve(__dirname, '../workflow-canvas/src/index.ts'),
      '@ha-bits/core': path.resolve(__dirname, '../core/src/index.ts'),
    },
  },
  build: {
    outDir: '../../habits-cortex/www/habit-viewer',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Use consistent asset names without hashes
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
