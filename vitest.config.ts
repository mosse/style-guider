import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['lib/**/__tests__/**/*.test.ts', '__tests__/**/*.test.ts'],
    exclude: ['__tests__/evals/**'],
  },
  resolve: {
    alias: {
      '@lib': resolve(__dirname, 'lib'),
    },
  },
});
