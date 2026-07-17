// @ts-check
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 30000,

  outputDir: './test-results',

  reporter: [
    ['html', { outputFolder: './playwright-report' }],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 720 },
    trace: 'on-first-retry',
    storageState: './e2e/.auth/admin.json',
  },

  globalSetup: './global-setup.js',
});
