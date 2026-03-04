import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Use './' for Electron (loads from file system), '/' for web deployment
  base: mode === 'web' ? '/' : './',
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: mode === 'web' ? 'dist-web' : 'dist-renderer',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
    },
  },
}));
