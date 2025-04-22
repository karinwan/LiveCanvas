// vitest.config.ts
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import path from 'path';

const resolve = (p: string) => path.resolve(__dirname, p);

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve('src'),
      // Explicitly add more path mappings if needed
      'tests': resolve('tests')
    }
  },
  server: {
    port: 4430
  },
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
    },
    deps: {
      inline: ['vuetify']
    },
    setupFiles: ['./tests/setup.ts']
  },
});