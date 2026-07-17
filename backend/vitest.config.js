import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // setup.js is imported by test files — not used as setupFiles
    // because vi.mock calls are scoped to the file they're called in.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 8,
        branches: 45,
        functions: 25,
        lines: 8,
      },
    },
    // Ensure ESM compatibility
    include: ['src/**/*.test.js'],
    exclude: ['src/**/*.integration.test.js', 'node_modules/**'],
  },
});
