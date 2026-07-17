import { vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Mock PrismaClient — all models with vi.fn() stubs
// ---------------------------------------------------------------------------
vi.mock('@prisma/client', () => {
  const createMockModel = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  });

  return {
    PrismaClient: vi.fn(() => ({
      usuario: createMockModel(),
      cita: createMockModel(),
      paciente: createMockModel(),
      historialClinico: createMockModel(),
      crediticio: createMockModel(),
      categoriaProcedimiento: createMockModel(),
      procedimiento: createMockModel(),
      presupuesto: createMockModel(),
      insumo: createMockModel(),
      configuracion: createMockModel(),
      recordatorio: createMockModel(),
      $disconnect: vi.fn(),
    })),
  };
});

const JWT_SECRET = process.env.JWT_SECRET || 'betty-dev-secret';

/**
 * Create an isolated Express app for testing.
 *
 * @param {object} options
 * @param {import('express').Router} options.routes  — Router to mount (e.g. auth routes)
 * @param {object} options.prismaMock                — Mocked prisma object injected via req.prisma
 * @returns {import('express').Express}
 */
export function createTestApp({ routes, prismaMock } = {}) {
  const app = express();

  app.use(express.json());

  // Inject prisma mock into request
  app.use((req, res, next) => {
    req.prisma = prismaMock;
    next();
  });

  if (routes) {
    app.use(routes);
  }

  return app;
}

/**
 * Create a signed JWT token for testing.
 *
 * @param {object} [payload]  — Override default payload fields
 * @param {number} [payload.id]
 * @param {string} [payload.email]
 * @param {string} [payload.rol]
 * @returns {string} Signed JWT
 */
export function createAuthToken(payload = {}) {
  return jwt.sign(
    { id: 1, email: 'test@betty.com', rol: 'admin', ...payload },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}
