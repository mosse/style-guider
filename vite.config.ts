import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'content/content-script': resolve(__dirname, 'extension/content/content-script.ts'),
        'background/service-worker': resolve(__dirname, 'extension/background/service-worker.ts'),
        'sidepanel/index': resolve(__dirname, 'extension/sidepanel/index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'shared/[name]-[hash].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
  resolve: {
    alias: {
      '@lib': resolve(__dirname, 'lib'),
      '@extension': resolve(__dirname, 'extension'),
    },
  },
});
