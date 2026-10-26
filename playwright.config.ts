import {defineConfig, devices} from '@playwright/test';

/**
 * End-to-end tests run against the production build, not the dev server.
 *
 * The app registers a service worker, and in development that worker happily
 * serves a stale bundle — which is exactly the kind of thing these tests exist
 * to catch rather than suffer from. `vite preview` serves what a user would
 * actually be given.
 */
export default defineConfig({
  testDir: './e2e',
  // Every spec writes to the same IndexedDB origin, so they share a browser
  // profile and must not run at the same time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', {open: 'never'}]] : [['list']],

  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'desktop',
      use: {...devices['Desktop Chrome'], viewport: {width: 1280, height: 900}},
    },
    {
      // The register is filled in on a phone, standing in front of a class.
      name: 'mobile',
      use: {...devices['Pixel 7']},
    },
  ],

  webServer: {
    command: 'npm run build && npm run preview -- --port=4173 --host=127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
