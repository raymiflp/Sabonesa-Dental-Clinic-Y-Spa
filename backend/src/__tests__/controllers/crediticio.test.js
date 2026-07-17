import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { Router } from 'express';
import { createTestApp, createAuthToken } from '../helpers/setup.js';
import { authMiddleware } from '../../middleware/auth.js';
import crediticioRoutes from '../../routes/crediticio.js';

describe('Crediticio Controller', () => {
  let prismaMock;
  let app;
  let authToken;

  beforeEach(() => {
    prismaMock = {
      crediticio: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    authToken = createAuthToken();

    const router = Router();
    router.use('/api/crediticio', authMiddleware, crediticioRoutes);
    app = createTestApp({ routes: router, prismaMock });
  });

  // -----------------------------------------------------------------------
  // getAll
  // -----------------------------------------------------------------------
  describe('getAll', () => {
    it('GET /api/crediticio → lista todos los registros crediticios', async () => {
      const mockCrediticios = [
        {
          id: 1,
          pacienteId: 1,
          procedimiento: 'Limpieza',
          montoPagado: 100,
          montoAbonado: 50,
          descuento: 10,
          fecha: '2026-06-08',
          paciente: { id: 1, nombres: 'Juan', apellidos: 'Perez', cedula: '12345' },
        },
        {
          id: 2,
          pacienteId: 2,
          procedimiento: 'Extracción',
          montoPagado: 200,
          montoAbonado: 100,
          descuento: 20,
          fecha: '2026-06-07',
          paciente: { id: 2, nombres: 'Maria', apellidos: 'Lopez', cedula: '67890' },
        },
      ];
      prismaMock.crediticio.findMany.mockResolvedValue(mockCrediticios);

      const res = await request(app)
        .get('/api/crediticio')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockCrediticios);
      expect(prismaMock.crediticio.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('GET /api/crediticio?fecha=2026-06-08 → filtra por fecha', async () => {
      prismaMock.crediticio.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/crediticio?fecha=2026-06-08')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(prismaMock.crediticio.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ fecha: '2026-06-08' }),
        }),
      );
    });

    it('GET /api/crediticio sin auth → 401', async () => {
      const res = await request(app).get('/api/crediticio');
      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // getByPaciente
  // -----------------------------------------------------------------------
  describe('getByPaciente', () => {
    it('GET /api/crediticio/paciente/:pacienteId → lista crediticios del paciente', async () => {
      const mockCrediticios = [
        {
          id: 1,
          pacienteId: 1,
          procedimiento: 'Limpieza',
          montoPagado: 100,
          montoAbonado: 50,
          descuento: 10,
          fecha: '2026-06-08',
        },
      ];
      prismaMock.crediticio.findMany.mockResolvedValue(mockCrediticios);

      const res = await request(app)
        .get('/api/crediticio/paciente/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockCrediticios);
      expect(prismaMock.crediticio.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ pacienteId: 1 }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('POST /api/crediticio con datos válidos → 201', async () => {
      const nuevoCredito = {
        id: 3,
        pacienteId: 1,
        procedimiento: 'Blanqueamiento',
        montoPagado: 300,
        montoAbonado: 150,
        descuento: 30,
        fecha: '2026-06-10',
      };
      prismaMock.crediticio.create.mockResolvedValue(nuevoCredito);

      const res = await request(app)
        .post('/api/crediticio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pacienteId: 1,
          procedimiento: 'Blanqueamiento',
          montoPagado: 300,
          montoAbonado: 150,
          descuento: 30,
          fecha: '2026-06-10',
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(nuevoCredito);
    });

    it('POST /api/crediticio con datos mínimos → 201', async () => {
      const nuevoCredito = {
        id: 4,
        pacienteId: 1,
        procedimiento: null,
        montoPagado: null,
        montoAbonado: null,
        descuento: null,
        fecha: undefined,
      };
      prismaMock.crediticio.create.mockResolvedValue(nuevoCredito);

      const res = await request(app)
        .post('/api/crediticio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pacienteId: 1 });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(nuevoCredito);
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------
  describe('update', () => {
    it('PUT /api/crediticio/:id con datos válidos → 200', async () => {
      const updatedCredito = {
        id: 1,
        pacienteId: 1,
        procedimiento: 'Limpieza Profunda',
        montoPagado: 150,
        montoAbonado: 75,
        descuento: 15,
        fecha: '2026-06-08',
      };
      prismaMock.crediticio.update.mockResolvedValue(updatedCredito);

      const res = await request(app)
        .put('/api/crediticio/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ procedimiento: 'Limpieza Profunda', montoPagado: 150 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedCredito);
    });
  });

  // -----------------------------------------------------------------------
  // remove
  // -----------------------------------------------------------------------
  describe('remove', () => {
    it('DELETE /api/crediticio/:id → 200', async () => {
      prismaMock.crediticio.delete.mockResolvedValue({ id: 1 });

      const res = await request(app)
        .delete('/api/crediticio/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Registro crediticio eliminado correctamente' });
    });
  });
});
