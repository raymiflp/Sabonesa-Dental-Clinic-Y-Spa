import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { server } from './mocks/server';

// ---------------------------------------------------------------------------
// MSW — intercept fetch at network level
// ---------------------------------------------------------------------------
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Mock IndexedDB wrapper (lib/db) — no real browser IndexedDB needed
// ---------------------------------------------------------------------------
vi.mock('../lib/db', () => ({
  cachePut: vi.fn(() => Promise.resolve()),
  cacheGet: vi.fn(() => Promise.resolve(null)),
  queueAdd: vi.fn(() => Promise.resolve(1)),
  queueGetAll: vi.fn(() => Promise.resolve([])),
  queueRemove: vi.fn(() => Promise.resolve()),
  getPendingCount: vi.fn(() => Promise.resolve(0)),
  cacheClear: vi.fn(() => Promise.resolve()),
}));
