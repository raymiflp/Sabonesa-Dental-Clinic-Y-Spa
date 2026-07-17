import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { Router } from 'express';
import { createTestApp, createPrismaClient, createAuthToken } from '../helpers/db.js';
import { seedUser, seedPaciente, seedCita } from '../helpers/seed.js';
import { authMiddleware } from '../../../middleware/auth.js';
import agendaRoutes from '../../../routes/agenda.js';

// Mock recordatorioService — these fire off real WhatsApp calls in production
vi.mock('../../../services/recordatorioService.js', () => ({
  sendConfirmacionCita: vi.fn().mockResolvedValue({}),
  sendCancelacionCita: vi.fn().mockResolvedValue({}),
}));

// ---------------------------------------------------------------------------
// Conditional skip — if Docker is not available, skip all tests in this file
// ---------------------------------------------------------------------------
const describeIf = process.env.SKIP_INTEGRATION_TESTS
  ? describe.skip
  : describe;

describeIf('Agenda — Integration', () => {
  let prisma;
  let app;
  let authToken;
  let paciente;

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

    // Clean tables and create fresh data
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Cita", "Paciente", "Usuario" RESTART IDENTITY CASCADE');
    const user = await seedUser(prisma);
    authToken = createAuthToken({
      id: user.id,
      email: user.email,
      rol: user.rol,
    });

    // Create a paciente that citas will reference
    paciente = await seedPaciente(prisma);

    const router = Router();
    router.use('/api/agenda', authMiddleware, agendaRoutes);
    app = createTestApp({ routes: router, prisma });
  });

  // -----------------------------------------------------------------------
  // GET /api/agenda
  // -----------------------------------------------------------------------
  describe('GET /api/agenda', () => {
    it('should return an empty list when no citas exist', async () => {
      const res = await request(app)
        .get('/api/agenda')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return all citas with paciente info', async () => {
      const cita = await seedCita(prisma, {}, paciente.id);

      const res = await request(app)
        .get('/api/agenda')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(cita.id);
      expect(res.body[0].paciente).toMatchObject({
        id: paciente.id,
        nombres: paciente.nombres,
        apellidos: paciente.apellidos,
      });
    });

    it('should filter by fecha', async () => {
      await seedCita(prisma, { fecha: '2026-06-10' }, paciente.id);
      await seedCita(prisma, { fecha: '2026-06-15' }, paciente.id);

      const res = await request(app)
        .get('/api/agenda?fecha=2026-06-10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].fecha).toBe('2026-06-10');
    });

    it('should filter by estado', async () => {
      await seedCita(prisma, { estado: 'pendiente' }, paciente.id);
      await seedCita(prisma, { estado: 'confirmada' }, paciente.id);

      const res = await request(app)
        .get('/api/agenda?estado=confirmada')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].estado).toBe('confirmada');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/agenda');
      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/agenda
  // -----------------------------------------------------------------------
  describe('POST /api/agenda', () => {
    it('should create a cita with valid data', async () => {
      const data = {
        pacienteId: paciente.id,
        fecha: '2026-06-20',
        hora: '09:00',
        procedimiento: 'Limpieza',
      };

      const res = await request(app)
        .post('/api/agenda')
        .set('Authorization', `Bearer ${authToken}`)
        .send(data);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        pacienteId: paciente.id,
        fecha: '2026-06-20',
        hora: '09:00',
        procedimiento: 'Limpieza',
        estado: 'pendiente',
        origen: 'manual',
      });
      expect(res.body.id).toBeDefined();

      // Verify it persisted
      const saved = await prisma.cita.findUnique({ where: { id: res.body.id } });
      expect(saved).not.toBeNull();
    });

    it('should return 409 for automatic duplicate cita', async () => {
      // Create an existing cita
      await seedCita(prisma, {
        pacienteId: paciente.id,
        fecha: '2026-06-20',
        hora: '09:00',
        procedimiento: 'Limpieza',
        origen: 'automatico',
      });

      // Try to create the same automatic cita
      const res = await request(app)
        .post('/api/agenda')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pacienteId: paciente.id,
          fecha: '2026-06-20',
          hora: '09:00',
          procedimiento: 'Limpieza',
          origen: 'automatico',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Ya existe una cita automática con estos datos');
    });
  });

  // -----------------------------------------------------------------------
  // PUT /api/agenda/:id
  // -----------------------------------------------------------------------
  describe('PUT /api/agenda/:id', () => {
    it('should update a cita estado to confirmada', async () => {
      const cita = await seedCita(prisma, { estado: 'pendiente' }, paciente.id);

      const res = await request(app)
        .put(`/api/agenda/${cita.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ estado: 'confirmada' });

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('confirmada');
      expect(res.body.id).toBe(cita.id);
    });

    it('should update a cita other fields', async () => {
      const cita = await seedCita(prisma, {}, paciente.id);

      const res = await request(app)
        .put(`/api/agenda/${cita.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ hora: '14:00', notas: 'Reprogramada' });

      expect(res.status).toBe(200);
      expect(res.body.hora).toBe('14:00');
      expect(res.body.notas).toBe('Reprogramada');
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /api/agenda/:id
  // -----------------------------------------------------------------------
  describe('DELETE /api/agenda/:id', () => {
    it('should delete a cita', async () => {
      const cita = await seedCita(prisma, {}, paciente.id);

      const res = await request(app)
        .delete(`/api/agenda/${cita.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Cita eliminada correctamente' });

      // Verify deletion
      const saved = await prisma.cita.findUnique({ where: { id: cita.id } });
      expect(saved).toBeNull();
    });
  });
});
