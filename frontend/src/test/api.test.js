import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';

// The lib/db mock is applied globally in setup.js

describe('api client', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('api.login() sends POST /api/auth/login with correct JSON', async () => {
    const { api } = await import('../api');

    const result = await api.login('test@betty.com', 'password123');

    expect(result.token).toBe('fake-jwt-token');
    expect(result.user).toMatchObject({
      email: 'test@betty.com',
      rol: 'admin',
    });
  });

  it('api.getMe() uses token from localStorage in Authorization header', async () => {
    localStorage.setItem('token', 'my-test-token');

    const { api } = await import('../api');

    const result = await api.getMe();

    expect(result.email).toBe('test@betty.com');
  });

  it('401 from API clears token from localStorage', async () => {
    localStorage.setItem('token', 'token-to-clear');

    // Override MSW handler to always return 401 for this test
    server.use(
      http.get('*/api/auth/me', () =>
        HttpResponse.json({ error: 'No autenticado' }, { status: 401 }),
      ),
    );

    const { api } = await import('../api');

    await expect(api.getMe()).rejects.toThrow();

    expect(localStorage.getItem('token')).toBeNull();
  });

  it('offline methods (cache/queue) are mocked', async () => {
    // The lib/db module is mocked in setup.js, so these imports should not
    // attempt real IndexedDB operations.
    const { cachePut, cacheGet, queueAdd } = await import('../lib/db');

    // All should be vi.fn() stubs
    expect(typeof cachePut).toBe('function');
    expect(typeof cacheGet).toBe('function');
    expect(typeof queueAdd).toBe('function');

    // They should resolve without error
    await expect(cachePut('GET', '/test', {})).resolves.toBeUndefined();
    await expect(cacheGet('GET', '/test')).resolves.toBeNull();
    await expect(queueAdd('POST', '/test', '{}')).resolves.toBe(1);
  });
});
