import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Router } from 'express';
import { createTestApp, createPrismaClient, createAuthToken } from '../helpers/db.js';
import { seedUser, seedPaciente } from '../helpers/seed.js';
import { authMiddleware } from '../../../middleware/auth.js';
import pacientesRoutes from '../../../routes/pacientes.js';

// ---------------------------------------------------------------------------
// Conditional skip — if Docker is not available, skip all tests in this file
// ---------------------------------------------------------------------------
const describeIf = process.env.SKIP_INTEGRATION_TESTS
  ? describe.skip
  : describe;

describeIf('Pacientes — Integration', () => {
  let prisma;
  let app;
  let authToken;

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

    // Clean tables and create a fresh user for authentication
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Cita", "Paciente", "Usuario" RESTART IDENTITY CASCADE');
    const user = await seedUser(prisma);
    authToken = createAuthToken({
      id: user.id,
      email: user.email,
      rol: user.rol,
    });

    const router = Router();
    router.use('/api/pacientes', authMiddleware, pacientesRoutes);
    app = createTestApp({ routes: router, prisma });
  });

  // -----------------------------------------------------------------------
  // GET /api/pacientes
  // -----------------------------------------------------------------------
  describe('GET /api/pacientes', () => {
    it('should return an empty list when no pacientes exist', async () => {
      const res = await request(app)
        .get('/api/pacientes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return all pacientes ordered by createdAt desc', async () => {
      const p1 = await seedPaciente(prisma, { nombres: 'Alice', apellidos: 'A' });
      const p2 = await seedPaciente(prisma, { nombres: 'Bob', apellidos: 'B' });

      const res = await request(app)
        .get('/api/pacientes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      // Ordered by createdAt desc — p2 was created second, so it should be first
      expect(res.body[0].id).toBe(p2.id);
      expect(res.body[1].id).toBe(p1.id);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/pacientes');
      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/pacientes/:id
  // -----------------------------------------------------------------------
  describe('GET /api/pacientes/:id', () => {
    it('should return a paciente by ID with relations', async () => {
      const paciente = await seedPaciente(prisma);

      const res = await request(app)
        .get(`/api/pacientes/${paciente.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(paciente.id);
      expect(res.body.nombres).toBe(paciente.nombres);
      expect(res.body.apellidos).toBe(paciente.apellidos);
      // Relations should be present (empty arrays)
      expect(res.body.historialClinico).toBeNull();
      expect(res.body.crediticios).toEqual([]);
      expect(res.body.citas).toEqual([]);
      expect(res.body.presupuestos).toEqual([]);
    });

    it('should return 404 for non-existent paciente', async () => {
      const res = await request(app)
        .get('/api/pacientes/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Paciente no encontrado');
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/pacientes
  // -----------------------------------------------------------------------
  describe('POST /api/pacientes', () => {
    it('should create a paciente with valid data', async () => {
      const data = {
        nombres: 'Carlos',
        apellidos: 'Garcia',
        telefono: '8091234567',
      };

      const res = await request(app)
        .post('/api/pacientes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(data);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject(data);
      expect(res.body.id).toBeDefined();

      // Verify it persisted
      const saved = await prisma.paciente.findUnique({ where: { id: res.body.id } });
      expect(saved).not.toBeNull();
      expect(saved.nombres).toBe('Carlos');
    });

    it('should return 409 when cedula is already registered', async () => {
      const paciente = await seedPaciente(prisma);

      const res = await request(app)
        .post('/api/pacientes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nombres: 'Otro',
          apellidos: 'Paciente',
          cedula: paciente.cedula,
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('La cédula ya está registrada');
    });
  });

  // -----------------------------------------------------------------------
  // PUT /api/pacientes/:id
  // -----------------------------------------------------------------------
  describe('PUT /api/pacientes/:id', () => {
    it('should update a paciente', async () => {
      const paciente = await seedPaciente(prisma);

      const res = await request(app)
        .put(`/api/pacientes/${paciente.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ nombres: 'Juan Updated' });

      expect(res.status).toBe(200);
      expect(res.body.nombres).toBe('Juan Updated');
      expect(res.body.id).toBe(paciente.id);
    });

    it('should return 409 when updating to an existing cedula', async () => {
      const p1 = await seedPaciente(prisma, { cedula: '0011111111' });
      const p2 = await seedPaciente(prisma, { cedula: '0022222222' });

      const res = await request(app)
        .put(`/api/pacientes/${p2.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ cedula: p1.cedula });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('La cédula ya está registrada');
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /api/pacientes/:id
  // -----------------------------------------------------------------------
  describe('DELETE /api/pacientes/:id', () => {
    it('should delete a paciente', async () => {
      const paciente = await seedPaciente(prisma);

      const res = await request(app)
        .delete(`/api/pacientes/${paciente.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Paciente eliminado correctamente' });

      // Verify deletion
      const saved = await prisma.paciente.findUnique({ where: { id: paciente.id } });
      expect(saved).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // PostgreSQL UNIQUE constraint on cedula
  // -----------------------------------------------------------------------
  describe('PostgreSQL unique constraint on cedula', () => {
    it('should enforce unique cedula at database level', async () => {
      // Use a unique cedula value
      const cedula = `UNIQUE_TEST_${Date.now()}`;
      await seedPaciente(prisma, { cedula });

      // Try to create another paciente with the same cedula directly via Prisma
      // This should fail with P2002 (unique constraint violation)
      await expect(
        prisma.paciente.create({
          data: {
            nombres: 'Duplicate',
            apellidos: 'Cedula',
            cedula,
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
    });
  });
});
