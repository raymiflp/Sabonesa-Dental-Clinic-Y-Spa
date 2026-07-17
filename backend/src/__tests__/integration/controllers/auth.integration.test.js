import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Router } from 'express';
import { createTestApp, createPrismaClient, createAuthToken } from '../helpers/db.js';
import { seedUser } from '../helpers/seed.js';
import { login, register, me } from '../../../controllers/auth.js';
import { authMiddleware } from '../../../middleware/auth.js';
import { requireRole } from '../../../middleware/roles.js';

// ---------------------------------------------------------------------------
// Conditional skip — if Docker is not available, skip all tests in this file
// ---------------------------------------------------------------------------
const describeIf = process.env.SKIP_INTEGRATION_TESTS
  ? describe.skip
  : describe;

describeIf('Auth — Integration', () => {
  let prisma;
  let appPublic;
  let appAdmin;
  let appMe;
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
    if (!databaseUrl) return;
    prisma = createPrismaClient(databaseUrl);
    await prisma.$connect();
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  beforeEach(async () => {
    if (!prisma) return;

    // Clean tables and create a fresh admin user for authenticated tests
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Cita", "Paciente", "Usuario" RESTART IDENTITY CASCADE');

    adminUser = await seedUser(prisma);
    adminToken = createAuthToken({
      id: adminUser.id,
      email: adminUser.email,
      rol: adminUser.rol,
    });

    // Rebuild apps for each test to get fresh middleware state
    // App for public routes (login)
    const publicRouter = Router();
    publicRouter.post('/login', login);
    appPublic = createTestApp({ routes: publicRouter, prisma });

    // App for admin-protected routes (register)
    const adminRouter = Router();
    adminRouter.post('/register', authMiddleware, requireRole('admin'), register);
    appAdmin = createTestApp({ routes: adminRouter, prisma });

    // App for authenticated routes (me)
    const meRouter = Router();
    meRouter.get('/me', authMiddleware, me);
    appMe = createTestApp({ routes: meRouter, prisma });
  });

  // -----------------------------------------------------------------------
  // POST /login
  // -----------------------------------------------------------------------
  describe('POST /login', () => {
    it('should return 400 when email or password is missing', async () => {
      const res = await request(appPublic)
        .post('/login')
        .send({ email: 'test@betty.com' }); // no password

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email y contraseña son requeridos');
    });

    it('should return 401 when user does not exist', async () => {
      const res = await request(appPublic)
        .post('/login')
        .send({ email: 'nobody@test.com', password: 'anypassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Credenciales inválidas');
    });

    it('should return 403 when user is disabled', async () => {
      // Create a disabled user
      const disabledUser = await seedUser(prisma, {
        email: `disabled_${Date.now()}@test.com`,
        activo: false,
      });

      const res = await request(appPublic)
        .post('/login')
        .send({ email: disabledUser.email, password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Usuario desactivado');
    });

    it('should return 200 with token and user on successful login', async () => {
      const res = await request(appPublic)
        .post('/login')
        .send({ email: adminUser.email, password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe('string');
      expect(res.body.user).toEqual({
        id: adminUser.id,
        nombre: adminUser.nombre,
        email: adminUser.email,
        rol: adminUser.rol,
        passwordChanged: adminUser.passwordChanged,
      });
    });

    it('should return 401 with wrong password', async () => {
      const res = await request(appPublic)
        .post('/login')
        .send({ email: adminUser.email, password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Credenciales inválidas');
    });
  });

  // -----------------------------------------------------------------------
  // POST /register
  // -----------------------------------------------------------------------
  describe('POST /register', () => {
    it('should return 400 when required fields are missing', async () => {
      const res = await request(appAdmin)
        .post('/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'Incomplete' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Todos los campos son requeridos');
    });

    it('should return 409 when email is already registered', async () => {
      const res = await request(appAdmin)
        .post('/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Duplicate',
          email: adminUser.email,
          password: 'password123',
          rol: 'doctor',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('El email ya está registrado');
    });

    it('should return 201 on successful registration', async () => {
      const newEmail = `new_${Date.now()}@test.com`;

      const res = await request(appAdmin)
        .post('/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'New User',
          email: newEmail,
          password: 'password123',
          rol: 'doctor',
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        nombre: 'New User',
        email: newEmail,
        rol: 'doctor',
      });
      expect(res.body.id).toBeDefined();

      // Verify the user actually exists in the database
      const saved = await prisma.usuario.findUnique({ where: { email: newEmail } });
      expect(saved).not.toBeNull();
    });

    it('should return 401 without auth token', async () => {
      const res = await request(appAdmin)
        .post('/register')
        .send({
          nombre: 'No Auth',
          email: 'noauth@test.com',
          password: 'password123',
          rol: 'doctor',
        });

      expect(res.status).toBe(401);
    });

    it('should return 400 when rol is invalid', async () => {
      const res = await request(appAdmin)
        .post('/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Bad Role',
          email: 'badrole@test.com',
          password: 'password123',
          rol: 'superadmin',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Rol inválido');
    });
  });

  // -----------------------------------------------------------------------
  // GET /me
  // -----------------------------------------------------------------------
  describe('GET /me', () => {
    it('should return current user data', async () => {
      const res = await request(appMe)
        .get('/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: adminUser.id,
        nombre: adminUser.nombre,
        email: adminUser.email,
        rol: adminUser.rol,
        activo: true,
      });
    });

    it('should return 401 without token', async () => {
      const res = await request(appMe).get('/me');
      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeToken = createAuthToken({ id: 99999, email: 'ghost@test.com' });

      const res = await request(appMe)
        .get('/me')
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Usuario no encontrado');
    });
  });
});
