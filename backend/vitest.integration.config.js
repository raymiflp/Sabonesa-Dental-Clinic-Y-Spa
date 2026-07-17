import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    globalSetup: './src/__tests__/integration/globalSetup.js',
    include: ['src/**/*.integration.test.js'],
    testTimeout: 60000,
    hookTimeout: 60000,
    coverage: {
      enabled: false,
    },
  },
});
