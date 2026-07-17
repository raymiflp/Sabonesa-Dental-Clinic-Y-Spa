import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { Router } from 'express';
import { createTestApp, createAuthToken } from '../helpers/setup.js';
import { authMiddleware } from '../../middleware/auth.js';
import pacientesRoutes from '../../routes/pacientes.js';

describe('Pacientes Controller', () => {
  let prismaMock;
  let app;
  let authToken;

  beforeEach(() => {
    prismaMock = {
      paciente: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    authToken = createAuthToken();

    const router = Router();
    router.use('/api/pacientes', authMiddleware, pacientesRoutes);
    app = createTestApp({ routes: router, prismaMock });
  });

  // -----------------------------------------------------------------------
  // getAll
  // -----------------------------------------------------------------------
  describe('getAll', () => {
    it('GET /api/pacientes → lista todos los pacientes', async () => {
      const mockPacientes = [
        { id: 1, nombres: 'Juan', apellidos: 'Perez', cedula: '12345' },
        { id: 2, nombres: 'Maria', apellidos: 'Lopez', cedula: '67890' },
      ];
      prismaMock.paciente.findMany.mockResolvedValue(mockPacientes);

      const res = await request(app)
        .get('/api/pacientes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockPacientes);
    });

    it('GET /api/pacientes sin auth → 401', async () => {
      const res = await request(app).get('/api/pacientes');
      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // getById
  // -----------------------------------------------------------------------
  describe('getById', () => {
    it('GET /api/pacientes/:id con ID existente → 200 con datos del paciente', async () => {
      const mockPaciente = {
        id: 1,
        nombres: 'Juan',
        apellidos: 'Perez',
        cedula: '12345',
        historialClinico: [],
        crediticios: [],
        citas: [],
        presupuestos: [],
      };
      prismaMock.paciente.findUnique.mockResolvedValue(mockPaciente);

      const res = await request(app)
        .get('/api/pacientes/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockPaciente);
    });

    it('GET /api/pacientes/:id con ID inexistente → 404', async () => {
      prismaMock.paciente.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/pacientes/999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Paciente no encontrado');
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('POST /api/pacientes con datos válidos sin cédula → 201', async () => {
      const nuevoPaciente = {
        id: 3,
        nombres: 'Carlos',
        apellidos: 'Garcia',
        telefono: '123456789',
      };
      prismaMock.paciente.create.mockResolvedValue(nuevoPaciente);

      const res = await request(app)
        .post('/api/pacientes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nombres: 'Carlos',
          apellidos: 'Garcia',
          telefono: '123456789',
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(nuevoPaciente);
    });

    it('POST /api/pacientes con cédula no duplicada → 201', async () => {
      const nuevoPaciente = {
        id: 4,
        nombres: 'Ana',
        apellidos: 'Martinez',
        cedula: '99999',
      };
      prismaMock.paciente.findUnique.mockResolvedValue(null); // cédula no registrada
      prismaMock.paciente.create.mockResolvedValue(nuevoPaciente);

      const res = await request(app)
        .post('/api/pacientes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nombres: 'Ana',
          apellidos: 'Martinez',
          cedula: '99999',
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(nuevoPaciente);
    });

    it('POST /api/pacientes con cédula duplicada → 409', async () => {
      prismaMock.paciente.findUnique.mockResolvedValue({ id: 1 });

      const res = await request(app)
        .post('/api/pacientes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nombres: 'Otro',
          apellidos: 'Paciente',
          cedula: '12345',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('La cédula ya está registrada');
      expect(prismaMock.paciente.create).not.toHaveBeenCalled();
    });

    it('POST /api/pacientes sin nombres → 400', async () => {
      const res = await request(app)
        .post('/api/pacientes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ apellidos: 'Test' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Nombres y apellidos son requeridos');
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------
  describe('update', () => {
    it('PUT /api/pacientes/:id con datos válidos → 200', async () => {
      const updatedPaciente = {
        id: 1,
        nombres: 'Juan Updated',
        apellidos: 'Perez',
        cedula: '12345',
      };
      // sin cédula en el body → no se consulta findUnique
      prismaMock.paciente.update.mockResolvedValue(updatedPaciente);

      const res = await request(app)
        .put('/api/pacientes/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ nombres: 'Juan Updated' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedPaciente);
    });

    it('PUT /api/pacientes/:id con cédula no duplicada → 200', async () => {
      const updatedPaciente = {
        id: 2,
        nombres: 'Maria',
        apellidos: 'Lopez',
        cedula: 'nueva-cedula',
      };
      prismaMock.paciente.findUnique.mockResolvedValue(null); // cédula libre
      prismaMock.paciente.update.mockResolvedValue(updatedPaciente);

      const res = await request(app)
        .put('/api/pacientes/2')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ cedula: 'nueva-cedula' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedPaciente);
    });

    it('PUT /api/pacientes/:id con cédula de otro paciente → 409', async () => {
      prismaMock.paciente.findUnique.mockResolvedValue({ id: 99 }); // otro paciente usa esa cédula

      const res = await request(app)
        .put('/api/pacientes/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ cedula: 'cedula-de-otro' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('La cédula ya está registrada');
    });
  });

  // -----------------------------------------------------------------------
  // remove
  // -----------------------------------------------------------------------
  describe('remove', () => {
    it('DELETE /api/pacientes/:id → 200', async () => {
      prismaMock.paciente.delete.mockResolvedValue({ id: 1 });

      const res = await request(app)
        .delete('/api/pacientes/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Paciente eliminado correctamente' });
    });
  });
});
