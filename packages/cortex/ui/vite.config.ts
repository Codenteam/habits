import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  base: '/manage/',
  build: {
    outDir: '../../../dist/packages/cortex/ui',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      '/manage/executions': 'http://localhost:3000',
      '/manage/workflows': 'http://localhost:3000',
      '/manage/execution': 'http://localhost:3000',
    },
  },
});
