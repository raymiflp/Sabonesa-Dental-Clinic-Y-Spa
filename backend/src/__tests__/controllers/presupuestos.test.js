import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { Router } from 'express';
import { createTestApp, createAuthToken } from '../helpers/setup.js';
import { authMiddleware } from '../../middleware/auth.js';
import presupuestosRoutes from '../../routes/presupuestos.js';

describe('Presupuestos Controller', () => {
  let prismaMock;
  let app;
  let authToken;

  beforeEach(() => {
    prismaMock = {
      presupuesto: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    authToken = createAuthToken();

    const router = Router();
    router.use('/api/presupuestos', authMiddleware, presupuestosRoutes);
    app = createTestApp({ routes: router, prismaMock });
  });

  // -----------------------------------------------------------------------
  // getByPaciente
  // -----------------------------------------------------------------------
  describe('getByPaciente', () => {
    it('GET /api/presupuestos/paciente/1 → lista presupuestos del paciente', async () => {
      const mockPresupuestos = [
        { id: 1, pacienteId: 1, fecha: '2026-06-01', montoTotal: 1500, estado: 'pendiente' },
        { id: 2, pacienteId: 1, fecha: '2026-06-05', montoTotal: 2500, estado: 'aprobado' },
      ];
      prismaMock.presupuesto.findMany.mockResolvedValue(mockPresupuestos);

      const res = await request(app)
        .get('/api/presupuestos/paciente/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockPresupuestos);
      expect(prismaMock.presupuesto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { pacienteId: 1 },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('GET /api/presupuestos/paciente/1 sin auth → 401', async () => {
      const res = await request(app).get('/api/presupuestos/paciente/1');
      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('POST /api/presupuestos con datos válidos → 201', async () => {
      const nuevoPresupuesto = {
        id: 1,
        pacienteId: 1,
        fecha: '2026-06-10',
        items: [{ procedimiento: 'Limpieza', precio: 500 }],
        montoTotal: 500,
        estado: 'pendiente',
        notas: null,
      };
      prismaMock.presupuesto.create.mockResolvedValue(nuevoPresupuesto);

      const res = await request(app)
        .post('/api/presupuestos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pacienteId: 1,
          fecha: '2026-06-10',
          items: [{ procedimiento: 'Limpieza', precio: 500 }],
          montoTotal: 500,
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(nuevoPresupuesto);
      // Se espera el default estado → 'pendiente'
      expect(prismaMock.presupuesto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pacienteId: 1,
            fecha: '2026-06-10',
            estado: 'pendiente',
            montoTotal: 500,
          }),
        }),
      );
    });

    it('POST /api/presupuestos sin pacienteId → 400', async () => {
      const res = await request(app)
        .post('/api/presupuestos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ fecha: '2026-06-10' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Paciente y fecha son requeridos');
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------
  describe('update', () => {
    it('PUT /api/presupuestos/1 con estado "aprobado" → 200', async () => {
      const updatedPresupuesto = {
        id: 1,
        pacienteId: 1,
        fecha: '2026-06-10',
        montoTotal: 500,
        estado: 'aprobado',
        notas: null,
      };
      prismaMock.presupuesto.update.mockResolvedValue(updatedPresupuesto);

      const res = await request(app)
        .put('/api/presupuestos/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ estado: 'aprobado' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedPresupuesto);
      expect(prismaMock.presupuesto.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { estado: 'aprobado' },
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // remove
  // -----------------------------------------------------------------------
  describe('remove', () => {
    it('DELETE /api/presupuestos/1 → 200', async () => {
      prismaMock.presupuesto.delete.mockResolvedValue({ id: 1 });

      const res = await request(app)
        .delete('/api/presupuestos/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Presupuesto eliminado correctamente' });
    });
  });
});
