import react from '@vitejs/plugin-react';
import {readFileSync} from 'node:fs';
import path from 'path';
import {defineConfig} from 'vitest/config';

// Mirrors the define in vite.config.ts, so a component that prints the version
// renders under test the same way it renders in the browser.
const {version} = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'),
);

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    restoreMocks: true,
  },
});
