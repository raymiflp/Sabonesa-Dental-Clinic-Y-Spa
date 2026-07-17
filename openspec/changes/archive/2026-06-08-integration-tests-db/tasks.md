# Tasks: Integration Tests — Base de Datos Real

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~365 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Infra + helpers + global setup | PR 1 | base: main; foundation for all tests |
| 2 | Tests + CI config | PR 1 | same PR; depends on Unit 1 |

## Phase 1: Dependencias y Config

- [x] 1.1 Instalar `testcontainers` como devDep en `backend/package.json`
- [x] 1.2 Agregar script `"test:integration"` en `backend/package.json`
- [x] 1.3 Crear `backend/vitest.integration.config.js` con globalSetup, globalTeardown, include, timeouts

## Phase 2: Helpers de Integración

- [x] 2.1 Crear `backend/src/__tests__/integration/helpers/containers.js` — `startPostgres()`, `stopPostgres()`, `isDockerAvailable()`
- [x] 2.2 Crear `backend/src/__tests__/integration/helpers/db.js` — `createPrismaClient()`, `withTransaction()`, `createTestApp()`
- [x] 2.3 Crear `backend/src/__tests__/integration/helpers/seed.js` — `seedUser()`, `seedPaciente()`, `seedCita()`

## Phase 3: Global Setup/Teardown

- [x] 3.1 Crear `backend/src/__tests__/integration/globalSetup.js` — detecta Docker, levanta container, corre `prisma db push`, setea env vars
- [x] 3.2 Crear `backend/src/__tests__/integration/globalTeardown.js` — detiene container, limpia recursos

## Phase 4: Tests de Integración

- [x] 4.1 Crear `backend/src/__tests__/integration/controllers/auth.integration.test.js` — register, login, me con BD real
- [x] 4.2 Crear `backend/src/__tests__/integration/controllers/pacientes.integration.test.js` — CRUD completo, cédula duplicada 409
- [x] 4.3 Crear `backend/src/__tests__/integration/controllers/agenda.integration.test.js` — crear cita, filtrar, estados, duplicado 409

## Phase 5: CI

- [x] 5.1 Modificar `.github/workflows/test.yml` — job `test-integration-backend` con servicio PostgreSQL

## Phase 6: Verificación

- [x] 6.1 Correr unitarios: `cd backend && npx vitest run` → **67 passed, 0 failed**
- [x] 6.2 Correr integración: `cd backend && npx vitest run --config vitest.integration.config.js` → **34 skipped (Docker no disponible)**
- [x] 6.3 Correr build frontend: `cd frontend && npx vite build` → **build exitoso**
