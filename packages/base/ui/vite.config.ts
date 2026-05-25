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
      '@ha-bits/cortex-core/ui/compileUiSpec': path.resolve(__dirname, '../../cortex/core/src/ui/compileUiSpec.ts'),
      '@ha-bits/cortex-core/ui/parseSpec': path.resolve(__dirname, '../../cortex/core/src/ui/parseSpec.ts'),
      '@ha-bits/cortex-core/ui/types': path.resolve(__dirname, '../../cortex/core/src/ui/types.ts'),
      '@ha-bits/cortex-core/ui/icons': path.resolve(__dirname, '../../cortex/core/src/ui/icons.ts'),
      '@ha-bits/cortex-core/ui': path.resolve(__dirname, '../../cortex/core/src/ui/index.ts'),
      '@ha-bits/cortex-lab/graph': path.resolve(__dirname, '../../cortex/lab/src/graph/index.ts'),
      '@ha-bits/cortex-lab': path.resolve(__dirname, '../../cortex/lab/src/index.ts'),
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
      '/habits/base/showcase-remote': {
        target: 'https://codenteam.com/intersect/habits',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/habits\/base\/showcase-remote/, ''),
      },
    },
  },
});
