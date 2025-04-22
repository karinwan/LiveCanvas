import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'tests': path.resolve(__dirname, './tests')
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: [             
      '**/tests/selenium/**',
      '**/node_modules/**'  
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'cobertura'],
      reportsDirectory: './coverage',
      all: true,
      include: [
        'src/**/*.{js,ts,vue}'
      ],
      // Exclude non-essential files/folders from coverage:
      exclude: [
        '**/src/main.ts',        
        '**/src/App.vue',        
        '**/src/i18n.ts',         // configuration files
        '**/src/theme.ts',        // theme configuration
        '**/src/pages/examples/**',  // example pages
        '**/src/router/**',       // router configuration
        '**/src/services/**',     // if don't want to cover API services
        '**/src/stores/**',       // if don't want to cover store modules
        '**/node_modules/**',
        '**/src/api/**',
        '**/src/components/ColorPicker.vue',
        '**/src/components/AuthDialog.vue',
        '**/src/components/ClearBoardDialog.vue'
      ]
    },
    deps: {
      inline: ['vuetify']
    },
    setupFiles: ['./tests/setup.ts']
  },
});