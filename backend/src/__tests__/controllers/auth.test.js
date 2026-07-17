import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { Router } from 'express';
import { createTestApp, createAuthToken } from '../helpers/setup.js';
import { login, register } from '../../controllers/auth.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roles.js';

// Mock bcryptjs for deterministic password comparison.
// Factory MUST be self-contained — `vi.mock` is hoisted above all imports.
vi.mock('bcryptjs', () => {
  const hash = (password) => Promise.resolve(`hashed:${password}`);
  const compare = (password, hashVal) => Promise.resolve(hashVal === `hashed:${password}`);
  return { default: { hash, compare }, hash, compare };
});

describe('Auth Controllers', () => {
  describe('POST /api/auth/login', () => {
    let prismaMock;
    let app;

    beforeEach(() => {
      prismaMock = {
        usuario: { findUnique: vi.fn() },
      };
      const router = Router();
      router.post('/login', login);
      app = createTestApp({ routes: router, prismaMock });
    });

    it('should return 400 when email or password is missing', async () => {
      const res = await request(app)
        .post('/login')
        .send({ email: 'test@betty.com' }); // no password

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email y contraseña son requeridos');
    });

    it('should return 401 when user does not exist', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/login')
        .send({ email: 'nobody@test.com', password: 'anypassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Credenciales inválidas');
    });

    it('should return 403 when user is disabled', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 2,
        email: 'disabled@test.com',
        password: 'hashed:any',
        activo: false,
      });

      const res = await request(app)
        .post('/login')
        .send({ email: 'disabled@test.com', password: 'any' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Usuario desactivado');
    });

    it('should return 200 with token and user on successful login', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 1,
        nombre: 'Test User',
        email: 'test@betty.com',
        password: 'hashed:password123',
        rol: 'admin',
        activo: true,
        passwordChanged: true,
      });

      const res = await request(app)
        .post('/login')
        .send({ email: 'test@betty.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe('string');
      expect(res.body.user).toEqual({
        id: 1,
        nombre: 'Test User',
        email: 'test@betty.com',
        rol: 'admin',
        passwordChanged: true,
      });
    });
  });

  describe('POST /api/auth/register', () => {
    let prismaMock;
    let app;
    let adminToken;

    beforeEach(() => {
      prismaMock = {
        usuario: { findUnique: vi.fn(), create: vi.fn() },
      };
      adminToken = createAuthToken(); // admin by default
      const router = Router();
      router.post('/register', authMiddleware, requireRole('admin'), register);
      app = createTestApp({ routes: router, prismaMock });
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'Incomplete' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Todos los campos son requeridos');
    });

    it('should return 409 when email is already registered', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({ id: 99 });

      const res = await request(app)
        .post('/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Duplicate',
          email: 'existing@test.com',
          password: 'password123',
          rol: 'doctor',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('El email ya está registrado');
    });

    it('should return 201 on successful registration', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);
      prismaMock.usuario.create.mockResolvedValue({
        id: 10,
        nombre: 'New User',
        email: 'new@test.com',
        rol: 'doctor',
      });

      const res = await request(app)
        .post('/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'New User',
          email: 'new@test.com',
          password: 'password123',
          rol: 'doctor',
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: 10,
        nombre: 'New User',
        email: 'new@test.com',
        rol: 'doctor',
      });
    });
  });
});
