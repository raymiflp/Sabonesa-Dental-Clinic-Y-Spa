import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { Router } from 'express';
import { createTestApp, createAuthToken } from '../helpers/setup.js';
import { authMiddleware } from '../../middleware/auth.js';
import insumosRoutes from '../../routes/insumos.js';

describe('Insumos Controller', () => {
  let prismaMock;
  let app;
  let authToken;

  beforeEach(() => {
    prismaMock = {
      insumo: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    authToken = createAuthToken();

    const router = Router();
    router.use('/api/insumos', authMiddleware, insumosRoutes);
    app = createTestApp({ routes: router, prismaMock });
  });

  // -----------------------------------------------------------------------
  // getAll
  // -----------------------------------------------------------------------
  describe('getAll', () => {
    it('GET /api/insumos → lista todos los insumos', async () => {
      const mockInsumos = [
        { id: 1, nombre: 'Guantes', descripcion: 'Caja x100', cantidad: 10, precioUnitario: 50, proveedor: 'Proveedor A' },
        { id: 2, nombre: 'Jeringas', descripcion: '5ml', cantidad: 100, precioUnitario: 5, proveedor: 'Proveedor B' },
      ];
      prismaMock.insumo.findMany.mockResolvedValue(mockInsumos);

      const res = await request(app)
        .get('/api/insumos')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockInsumos);
    });

    it('GET /api/insumos sin auth → 401', async () => {
      const res = await request(app).get('/api/insumos');
      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // getById
  // -----------------------------------------------------------------------
  describe('getById', () => {
    it('GET /api/insumos/:id con ID existente → 200', async () => {
      const mockInsumo = { id: 1, nombre: 'Guantes', descripcion: 'Caja x100', cantidad: 10, precioUnitario: 50, proveedor: 'Proveedor A' };
      prismaMock.insumo.findUnique.mockResolvedValue(mockInsumo);

      const res = await request(app)
        .get('/api/insumos/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockInsumo);
    });

    it('GET /api/insumos/:id con ID inexistente → 404', async () => {
      prismaMock.insumo.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/insumos/999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Insumo no encontrado');
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('POST /api/insumos con datos válidos → 201', async () => {
      const nuevoInsumo = {
        id: 3,
        nombre: 'Barbijos',
        descripcion: 'Caja x50',
        cantidad: 20,
        precioUnitario: 25,
        proveedor: 'Proveedor C',
      };
      prismaMock.insumo.create.mockResolvedValue(nuevoInsumo);

      const res = await request(app)
        .post('/api/insumos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nombre: 'Barbijos',
          descripcion: 'Caja x50',
          cantidad: 20,
          precioUnitario: 25,
          proveedor: 'Proveedor C',
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(nuevoInsumo);
    });

    it('POST /api/insumos con solo nombre → 201 (el resto toma defaults)', async () => {
      const nuevoInsumo = {
        id: 4,
        nombre: 'Algodón',
        descripcion: null,
        cantidad: 0,
        precioUnitario: null,
        proveedor: null,
      };
      prismaMock.insumo.create.mockResolvedValue(nuevoInsumo);

      const res = await request(app)
        .post('/api/insumos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ nombre: 'Algodón' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(nuevoInsumo);
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------
  describe('update', () => {
    it('PUT /api/insumos/:id con datos válidos → 200', async () => {
      const existingInsumo = { id: 1, nombre: 'Guantes', cantidad: 10 };
      const updatedInsumo = {
        id: 1,
        nombre: 'Guantes Actualizados',
        descripcion: 'Caja x200',
        cantidad: 15,
        precioUnitario: 55,
        proveedor: 'Proveedor A',
      };
      prismaMock.insumo.findUnique.mockResolvedValue(existingInsumo);
      prismaMock.insumo.update.mockResolvedValue(updatedInsumo);

      const res = await request(app)
        .put('/api/insumos/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nombre: 'Guantes Actualizados',
          descripcion: 'Caja x200',
          cantidad: 15,
          precioUnitario: 55,
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedInsumo);
    });

    it('PUT /api/insumos/:id con ID inexistente → 404', async () => {
      prismaMock.insumo.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/insumos/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ nombre: 'Inexistente' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Insumo no encontrado');
      expect(prismaMock.insumo.update).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // remove
  // -----------------------------------------------------------------------
  describe('remove', () => {
    it('DELETE /api/insumos/:id → 200', async () => {
      prismaMock.insumo.delete.mockResolvedValue({ id: 1 });

      const res = await request(app)
        .delete('/api/insumos/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Insumo eliminado correctamente' });
    });
  });
});
