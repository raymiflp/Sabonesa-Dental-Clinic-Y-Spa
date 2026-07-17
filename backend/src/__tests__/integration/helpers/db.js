import { PrismaClient } from '@prisma/client';
import express from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'betty-dev-secret';

/**
 * Create a PrismaClient pointing to the given database URL.
 *
 * @param {string} databaseUrl — Full PostgreSQL connection URI
 * @returns {import('@prisma/client').PrismaClient}
 */
export function createPrismaClient(databaseUrl) {
  return new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
}

/**
 * Create an isolated Express app for integration tests.
 *
 * @param {object} options
 * @param {import('express').Router} options.routes  — Router to mount (e.g. auth routes)
 * @param {object} options.prisma                   — Real PrismaClient injected via req.prisma
 * @returns {import('express').Express}
 */
export function createTestApp({ routes, prisma } = {}) {
  const app = express();

  app.use(express.json());

  // Inject real prisma into request
  app.use((req, res, next) => {
    req.prisma = prisma;
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
