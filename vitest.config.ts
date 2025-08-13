import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts'
    ],
    reporters: 'default'
  },
  resolve: {
    alias: {
      $lib: path.resolve(__dirname, 'src/lib'),
      '@': path.resolve(__dirname, 'src')
    }
  }
});

