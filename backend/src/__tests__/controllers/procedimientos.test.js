import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { Router } from 'express';
import { createTestApp, createAuthToken } from '../helpers/setup.js';
import { authMiddleware } from '../../middleware/auth.js';
import procedimientosRoutes from '../../routes/procedimientos.js';

describe('Procedimientos Controller', () => {
  let prismaMock;
  let app;
  let authToken;

  beforeEach(() => {
    prismaMock = {
      procedimiento: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      categoriaProcedimiento: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    authToken = createAuthToken();

    const router = Router();
    router.use('/api/procedimientos', authMiddleware, procedimientosRoutes);
    app = createTestApp({ routes: router, prismaMock });
  });

  // -----------------------------------------------------------------------
  // getAll
  // -----------------------------------------------------------------------
  describe('getAll', () => {
    it('GET /api/procedimientos → lista todos los procedimientos con categorías', async () => {
      const mockProcedimientos = [
        {
          id: 1,
          nombre: 'Limpieza Dental',
          precioSugerido: 500,
          categoria: { id: 1, nombre: 'Limpiezas' },
        },
        {
          id: 2,
          nombre: 'Blanqueamiento',
          precioSugerido: 1500,
          categoria: { id: 2, nombre: 'Estética' },
        },
      ];
      prismaMock.procedimiento.findMany.mockResolvedValue(mockProcedimientos);

      const res = await request(app)
        .get('/api/procedimientos')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockProcedimientos);
      expect(prismaMock.procedimiento.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { categoria: true },
          orderBy: { nombre: 'asc' },
        }),
      );
    });

    it('GET /api/procedimientos sin auth → 401', async () => {
      const res = await request(app).get('/api/procedimientos');
      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // getCategorias
  // -----------------------------------------------------------------------
  describe('getCategorias', () => {
    it('GET /api/procedimientos/categorias → lista categorías con procedimientos', async () => {
      const mockCategorias = [
        {
          id: 1,
          nombre: 'Limpiezas',
          descripcion: 'Procedimientos de limpieza',
          procedimientos: [
            { id: 1, nombre: 'Limpieza Dental', precioSugerido: 500 },
          ],
        },
        {
          id: 2,
          nombre: 'Estética',
          descripcion: 'Procedimientos estéticos',
          procedimientos: [
            { id: 2, nombre: 'Blanqueamiento', precioSugerido: 1500 },
          ],
        },
      ];
      prismaMock.categoriaProcedimiento.findMany.mockResolvedValue(mockCategorias);

      const res = await request(app)
        .get('/api/procedimientos/categorias')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockCategorias);
      expect(prismaMock.categoriaProcedimiento.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { procedimientos: true },
          orderBy: { nombre: 'asc' },
        }),
      );
    });

    it('GET /api/procedimientos/categorias sin auth → 401', async () => {
      const res = await request(app).get('/api/procedimientos/categorias');
      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // create (procedimiento)
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('POST /api/procedimientos con datos válidos → 201', async () => {
      const nuevoProcedimiento = {
        id: 3,
        nombre: 'Extracción',
        categoriaId: 1,
        precioSugerido: 800,
        descripcion: 'Extracción de muela',
      };
      prismaMock.procedimiento.create.mockResolvedValue(nuevoProcedimiento);

      const res = await request(app)
        .post('/api/procedimientos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nombre: 'Extracción',
          categoriaId: 1,
          precioSugerido: 800,
          descripcion: 'Extracción de muela',
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(nuevoProcedimiento);
      expect(prismaMock.procedimiento.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nombre: 'Extracción',
            categoriaId: 1,
            precioSugerido: 800,
            descripcion: 'Extracción de muela',
          }),
        }),
      );
    });

    it('POST /api/procedimientos sin nombre → 400', async () => {
      const res = await request(app)
        .post('/api/procedimientos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ categoriaId: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Nombre y categoría son requeridos');
    });
  });

  // -----------------------------------------------------------------------
  // update (procedimiento)
  // -----------------------------------------------------------------------
  describe('update', () => {
    it('PUT /api/procedimientos/1 → 200', async () => {
      const updatedProcedimiento = {
        id: 1,
        nombre: 'Limpieza Dental Profunda',
        categoriaId: 1,
        precioSugerido: 600,
      };
      prismaMock.procedimiento.update.mockResolvedValue(updatedProcedimiento);

      const res = await request(app)
        .put('/api/procedimientos/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ nombre: 'Limpieza Dental Profunda', precioSugerido: 600 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedProcedimiento);
      expect(prismaMock.procedimiento.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { nombre: 'Limpieza Dental Profunda', precioSugerido: 600 },
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // remove (procedimiento)
  // -----------------------------------------------------------------------
  describe('remove', () => {
    it('DELETE /api/procedimientos/1 → 200', async () => {
      prismaMock.procedimiento.delete.mockResolvedValue({ id: 1 });

      const res = await request(app)
        .delete('/api/procedimientos/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Procedimiento eliminado correctamente' });
    });
  });

  // -----------------------------------------------------------------------
  // createCategoria
  // -----------------------------------------------------------------------
  describe('createCategoria', () => {
    it('POST /api/procedimientos/categorias → 201', async () => {
      const nuevaCategoria = { id: 3, nombre: 'Cirugía', descripcion: 'Procedimientos quirúrgicos' };
      prismaMock.categoriaProcedimiento.create.mockResolvedValue(nuevaCategoria);

      const res = await request(app)
        .post('/api/procedimientos/categorias')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ nombre: 'Cirugía', descripcion: 'Procedimientos quirúrgicos' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(nuevaCategoria);
      expect(prismaMock.categoriaProcedimiento.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { nombre: 'Cirugía', descripcion: 'Procedimientos quirúrgicos' },
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // updateCategoria
  // -----------------------------------------------------------------------
  describe('updateCategoria', () => {
    it('PUT /api/procedimientos/categorias/1 → 200', async () => {
      const updatedCategoria = { id: 1, nombre: 'Limpiezas Avanzadas', descripcion: 'Limpiezas profundas' };
      prismaMock.categoriaProcedimiento.update.mockResolvedValue(updatedCategoria);

      const res = await request(app)
        .put('/api/procedimientos/categorias/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ nombre: 'Limpiezas Avanzadas' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedCategoria);
      expect(prismaMock.categoriaProcedimiento.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { nombre: 'Limpiezas Avanzadas' },
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // deleteCategoria
  // -----------------------------------------------------------------------
  describe('deleteCategoria', () => {
    it('DELETE /api/procedimientos/categorias/1 → 200', async () => {
      prismaMock.categoriaProcedimiento.delete.mockResolvedValue({ id: 1 });

      const res = await request(app)
        .delete('/api/procedimientos/categorias/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Categoría eliminada correctamente' });
    });
  });
});
