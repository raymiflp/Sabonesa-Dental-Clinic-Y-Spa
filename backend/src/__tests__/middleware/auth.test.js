import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Router } from 'express';
import { createTestApp, createAuthToken } from '../helpers/setup.js';
import { authMiddleware } from '../../middleware/auth.js';

describe('authMiddleware', () => {
  const router = Router();
  router.get('/protected', authMiddleware, (req, res) => {
    res.json({ user: req.user });
  });

  const app = createTestApp({ routes: router });

  it('should return 401 when no auth header is provided', async () => {
    const res = await request(app).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token no proporcionado');
  });

  it('should return 401 when header does not use Bearer scheme', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'InvalidToken');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token no proporcionado');
  });

  it('should return 401 when token is invalid/expired', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token inválido o expirado');
  });

  it('should call next() and set req.user when token is valid', async () => {
    const token = createAuthToken();

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: 1,
      email: 'test@betty.com',
      rol: 'admin',
    });
  });
});
