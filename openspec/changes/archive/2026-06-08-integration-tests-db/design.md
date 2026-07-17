# Design: Integration Tests — Base de Datos Real

## Technical Approach

Usar `testcontainers` (npm) para levantar un contenedor PostgreSQL descartable por sesión de test. `globalSetup` de Vitest inicia el container, espera readiness, corre `prisma db push` y expone `DATABASE_URL` vía variable de entorno. Cada test se aísla con transacción + rollback. `globalTeardown` mata el container al finalizar. Los tests de integración viven en `src/__tests__/integration/` con config Vitest separada para no interferir con los unitarios existentes.

## Architecture Decisions

| Option | Tradeoffs | Decision |
|--------|-----------|----------|
| **Testcontainers vs BD local** | Testcontainers portátil, no requiere config manual de BD; overhead ~30s startup | **Testcontainers** — consistencia CI/local |
| **Transacción rollback vs truncate tables** | Rollback más rápido, no requiere orden de tablas ni reset de secuencias | **Rollback via `$transaction`** — cada test envuelto en callback que hace rollback al final |
| **globalSetup/globalTeardown vs beforeAll en cada file** | Global evita repetir código, un solo container para toda la sesión | **globalSetup + globalTeardown** — Vitest nativo, container reusable |
| **Config separada vs misma vitest.config** | Separar permite exclude mutuo y evitar contaminar unitarios | **vitest.integration.config.js** — include solo `integration/`, sin coverage thresholds |
| **Docker check vs fallback silencioso** | Si Docker no está, test falla confusamente | **Skip automático** — globalSetup detecta ausencia de Docker y skips todos los tests via `process.env.SKIP_INTEGRATION` |

## Data Flow

```
globalSetup.js
    │
    ├── PostgreSqlContainer.start()  ──→ Puerto aleatorio
    ├── Espera readiness (health check)
    ├── Setea process.env.DATABASE_URL = postgres://...
    └── npx prisma db push            ──→ Crea schema en container

Cada test file (ej. auth.integration.test.js)
    │
    ├── beforeAll: PrismaClient( DATABASE_URL )
    ├── beforeEach: Inicia transacción via $transaction([...])
    ├── Test: Request HTTP → Controller → Prisma real → BD real
    ├── afterEach: Rollback explícito (no commit)
    └── afterAll: PrismaClient.$disconnect()

globalTeardown.js
    └── PostgreSqlContainer.stop() + { prune: true }
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/__tests__/integration/helpers/containers.js` | Create | Factory que levanta `PostgreSqlContainer` con imagen default, expone `getConnectionUri()` |
| `backend/src/__tests__/integration/helpers/db.js` | Create | Crea `PrismaClient` apuntando a `DATABASE_URL`; helper `withTransaction(fn)` que ejecuta callback dentro de `$transaction` y hace rollback |
| `backend/src/__tests__/integration/helpers/seed.js` | Create | Funciones factory: `buildUsuario()`, `buildPaciente()`, `buildCita()` con defaults sensatos |
| `backend/vitest.integration.config.js` | Create | Config Vitest separada con `globalSetup`, `globalTeardown`, `include: ['src/__tests__/integration/**/*.test.js']`, sin coverage |
| `backend/src/__tests__/integration/globalSetup.js` | Create | Levanta container, corre `npx prisma db push`, setea `DATABASE_URL` y `SKIP_INTEGRATION` si Docker no disponible |
| `backend/src/__tests__/integration/globalTeardown.js` | Create | Detiene container con `{ prune: true }` |
| `backend/src/__tests__/integration/controllers/auth.integration.test.js` | Create | Tests de auth: register + login + me con flujo real de BD |
| `backend/src/__tests__/integration/controllers/pacientes.integration.test.js` | Create | Tests de pacientes: CRUD completo, validación cédula duplicada, cascade |
| `backend/src/__tests__/integration/controllers/agenda.integration.test.js` | Create | Tests de agenda: crear cita, filtrar por fecha/estado, cambio de estado, duplicado automático |
| `backend/package.json` | Modify | +script `"test:integration": "vitest run --config vitest.integration.config.js"`, +devDep `"testcontainers": "^10"` |
| `.github/workflows/test.yml` | Modify | +job `test-integration-backend` con servicio Docker |

## Interfaces / Contracts

```js
// containers.js — Factory de contenedor PostgreSQL
export async function startContainer() {
  const container = await new PostgreSqlContainer()
    .withDatabase('betty_test')
    .withUsername('test')
    .withPassword('test')
    .start();
  return container;
}

// db.js — PrismaClient factory + transacción con rollback
export function createTestPrisma(databaseUrl) {
  return new PrismaClient({ datasources: { db: { url: databaseUrl } } });
}

// La transacción se aborta porque NUNCA llamamos $transaction.commit.
// Cada test ejecuta dentro de un callback que Vitest descarta al finalizar.
export async function withRollback(prisma, fn) {
  return prisma.$transaction(async (tx) => {
    await fn(tx);
    throw new Error('ROLLBACK'); // Vitest captura, no hay commit
  });
}

// seed.js — Factories con valores por defecto
export function buildUsuario(overrides = {}) {
  return {
    nombre: 'Test User',
    email: `test_${Date.now()}@betty.com`,
    password: bcrypt.hashSync('password123', 10),
    rol: 'admin',
    activo: true,
    ...overrides,
  };
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Integration | `POST /api/auth/register` + `POST /api/auth/login` + `GET /api/auth/me` | Crear usuario real, login devuelve token, me devuelve datos. Validar hash real de bcrypt, unique constraint de email |
| Integration | `GET/POST/PUT/DELETE /api/pacientes` | CRUD completo con datos reales. Validar unique de cédula, cascade delete, include de relaciones (historial, citas) |
| Integration | `GET/POST/PUT/DELETE /api/agenda` | Crear cita vinculada a paciente real, filtrar por fecha/estado, cambiar estados, duplicado con origen automático |

## Migration / Rollout

No migration required. Tests de integración corren solo al invocar `npm run test:integration`. No modifican código de producción ni afectan los 55 tests unitarios existentes. Rollout inmediato sin feature flags.

## Open Questions

- [ ] Ninguna — las decisiones están cubiertas por la propuesta y validadas contra la codebase actual.
