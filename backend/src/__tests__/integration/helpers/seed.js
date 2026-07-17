import bcrypt from 'bcryptjs';

/**
 * Create a user in the database.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {object} [overrides]
 * @returns {Promise<object>} The created user
 */
export async function seedUser(prisma, overrides = {}) {
  const defaults = {
    nombre: 'Test User',
    email: `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@betty.com`,
    password: await bcrypt.hash('password123', 10),
    rol: 'admin',
    activo: true,
  };

  return prisma.usuario.create({
    data: { ...defaults, ...overrides },
  });
}

/**
 * Create a paciente in the database.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {object} [overrides]
 * @returns {Promise<object>} The created paciente
 */
export async function seedPaciente(prisma, overrides = {}) {
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const defaults = {
    nombres: 'Juan',
    apellidos: 'Perez',
    telefono: `809${uniqueSuffix.slice(0, 7)}`,
    cedula: `001${uniqueSuffix.slice(0, 11)}`,
  };

  return prisma.paciente.create({
    data: { ...defaults, ...overrides },
  });
}

/**
 * Create a cita in the database.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {object} [overrides]
 * @param {number} pacienteId — Required: the paciente this cita belongs to
 * @returns {Promise<object>} The created cita
 */
export async function seedCita(prisma, overrides = {}, pacienteId) {
  if (!pacienteId) {
    throw new Error('seedCita requires pacienteId');
  }

  const defaults = {
    pacienteId,
    fecha: '2026-06-15',
    hora: '10:00',
    procedimiento: 'Limpieza dental',
    estado: 'pendiente',
    origen: 'manual',
  };

  return prisma.cita.create({
    data: { ...defaults, ...overrides },
  });
}
