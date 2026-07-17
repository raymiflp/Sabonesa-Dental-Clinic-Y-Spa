import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { Router } from 'express';
import { createTestApp, createAuthToken } from '../helpers/setup.js';
import { authMiddleware } from '../../middleware/auth.js';
import agendaRoutes from '../../routes/agenda.js';

// ---------------------------------------------------------------------------
// Mock recordatorioService — these fire off real WhatsApp calls in production
// ---------------------------------------------------------------------------
vi.mock('../../services/recordatorioService.js', () => ({
  sendConfirmacionCita: vi.fn().mockResolvedValue({}),
  sendCancelacionCita: vi.fn().mockResolvedValue({}),
}));

describe('Agenda Controller', () => {
  let prismaMock;
  let app;
  let authToken;

  beforeEach(() => {
    prismaMock = {
      cita: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    authToken = createAuthToken();

    const router = Router();
    router.use('/api/agenda', authMiddleware, agendaRoutes);
    app = createTestApp({ routes: router, prismaMock });
  });

  // -----------------------------------------------------------------------
  // getAll
  // -----------------------------------------------------------------------
  describe('getAll', () => {
    it('GET /api/agenda sin filtros → lista todas las citas', async () => {
      const mockCitas = [
        {
          id: 1,
          fecha: '2026-06-08',
          hora: '10:00',
          estado: 'pendiente',
          paciente: { id: 1, nombres: 'Juan', apellidos: 'Perez', telefono: '123' },
        },
        {
          id: 2,
          fecha: '2026-06-09',
          hora: '11:00',
          estado: 'confirmada',
          paciente: { id: 2, nombres: 'Maria', apellidos: 'Lopez', telefono: '456' },
        },
      ];
      prismaMock.cita.findMany.mockResolvedValue(mockCitas);

      const res = await request(app)
        .get('/api/agenda')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockCitas);
      expect(prismaMock.cita.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('GET /api/agenda?fecha=2026-06-08 → filtra por fecha', async () => {
      prismaMock.cita.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/agenda?fecha=2026-06-08')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(prismaMock.cita.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ fecha: '2026-06-08' }),
        }),
      );
    });

    it('GET /api/agenda?estado=pendiente → filtra por estado', async () => {
      prismaMock.cita.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/agenda?estado=pendiente')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(prismaMock.cita.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ estado: 'pendiente' }),
        }),
      );
    });

    it('GET /api/agenda sin auth → 401', async () => {
      const res = await request(app).get('/api/agenda');
      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('POST /api/agenda con datos válidos → 201 con la cita creada', async () => {
      const nuevaCita = {
        id: 3,
        pacienteId: 1,
        fecha: '2026-06-10',
        hora: '09:00',
        procedimiento: 'Limpieza',
        estado: 'pendiente',
        notas: null,
        origen: 'manual',
      };
      prismaMock.cita.create.mockResolvedValue(nuevaCita);

      const res = await request(app)
        .post('/api/agenda')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pacienteId: 1,
          fecha: '2026-06-10',
          hora: '09:00',
          procedimiento: 'Limpieza',
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(nuevaCita);
      // Se esperan los defaults: estado→pendiente, origen→manual
      expect(prismaMock.cita.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pacienteId: 1,
            estado: 'pendiente',
            origen: 'manual',
          }),
        }),
      );
    });

    it('POST /api/agenda sin pacienteId → 400', async () => {
      const res = await request(app)
        .post('/api/agenda')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ fecha: '2026-06-10' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Paciente y fecha son requeridos');
    });

    it('POST /api/agenda con origen=automatico y duplicado → 409', async () => {
      prismaMock.cita.findFirst.mockResolvedValue({ id: 99 });

      const res = await request(app)
        .post('/api/agenda')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pacienteId: 1,
          fecha: '2026-06-10',
          hora: '09:00',
          procedimiento: 'Limpieza',
          origen: 'automatico',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Ya existe una cita automática con estos datos');
      // create no debe ejecutarse si ya existía duplicado
      expect(prismaMock.cita.create).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------
  describe('update', () => {
    it('PUT /api/agenda/:id con estado confirmada → 200, cita actualizada', async () => {
      const oldCita = { id: 1, estado: 'pendiente' };
      const updatedCita = {
        id: 1,
        pacienteId: 1,
        fecha: '2026-06-10',
        hora: '09:00',
        estado: 'confirmada',
        notas: null,
        origen: 'manual',
      };
      prismaMock.cita.findUnique.mockResolvedValue(oldCita);
      prismaMock.cita.update.mockResolvedValue(updatedCita);

      const res = await request(app)
        .put('/api/agenda/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ estado: 'confirmada' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedCita);
    });

    it('PUT /api/agenda/:id que no existe → 500', async () => {
      prismaMock.cita.findUnique.mockResolvedValue(null);
      prismaMock.cita.update.mockRejectedValue(new Error('Registro no encontrado'));

      const res = await request(app)
        .put('/api/agenda/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ estado: 'confirmada' });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });

  // -----------------------------------------------------------------------
  // remove
  // -----------------------------------------------------------------------
  describe('remove', () => {
    it('DELETE /api/agenda/:id → 200, cita eliminada', async () => {
      prismaMock.cita.delete.mockResolvedValue({ id: 1 });

      const res = await request(app)
        .delete('/api/agenda/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Cita eliminada correctamente' });
    });
  });
});
