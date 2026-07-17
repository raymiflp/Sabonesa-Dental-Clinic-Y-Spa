# Proposal: Integration Tests — Base de Datos Real

## Intent

Agregar tests de integración con PostgreSQL real vía Testcontainers para validar controllers contra la misma BD que producción. Cierra el gap de confianza de los unitarios con Prisma mock — queries, constraints y cascade reales.

## Scope

### In Scope

- Helpers de Testcontainers: globalSetup, fábrica de contenedores PostgreSQL, limpieza/semilla entre tests
- Configuración Vitest separada (`vitest.integration.config.js`) con setup específico
- Tests iniciales: autenticación (3 escenarios), pacientes (3 escenarios), agenda/citas (3 escenarios)
- Scripts en `backend/package.json` (`test:integration`, `pretest:integration`)
- Actualización de `.github/workflows/test.yml` para incluir job de integración

### Out of Scope

- Migración de tests unitarios existentes a integración
- Modificación de código de producción (controllers, services, routes)
- Nuevos umbrales de coverage o configuración de reporting
- Tests de frontend

## Capabilities

### New Capabilities

None — infraestructura de testing pura, no introduce nuevas capacidades de negocio.

### Modified Capabilities

None — ninguna especificación de comportamiento existente cambia.

## Approach

Usar `testcontainers` (npm) para levantar un contenedor PostgreSQL descartable por sesión de test. `globalSetup` de Vitest inicia el container, espera a que esté healthy, corre migraciones de Prisma y expone la URL de conexión vía variable de entorno. Cada test usa `PrismaClient` real con limpieza entre casos. `globalTeardown` mata el container al finalizar. Sin cambios en schema, seed ni código de producción.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/package.json` | Modified | Script `test:integration`, dependencia `testcontainers` |
| `backend/vitest.integration.config.js` | New | Config Vitest separada con globalSetup/globalTeardown |
| `backend/src/__tests__/integration/` | New | Helpers (db.ts) + tests (auth, pacientes, agenda) |
| `.github/workflows/test.yml` | Modified | Nuevo job de integración con Docker |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Docker no disponible en CI/local | Low | Skip automático si no hay Docker; documentar prerequisito |
| Overhead ~30s levantar container | Med | Tests comparten un solo container; globalSetup cachea la instancia |
| Incompatibilidad Node/testcontainers | Low | Usar versión LTS de testcontainers probada con Node 22 |

## Rollback Plan

1. `npm uninstall testcontainers @types/testcontainers`
2. Eliminar `backend/vitest.integration.config.js`
3. Eliminar `backend/src/__tests__/integration/`
4. Revertir `backend/package.json` (scripts)
5. Revertir `.github/workflows/test.yml`
6. `git checkout` archivos afectados

## Dependencies

- Docker (local y CI)
- npm: `testcontainers`

## Success Criteria

- [ ] Tests de integración con BD real pasan en local
- [ ] Tests de integración pasan en GitHub Actions
- [ ] Tests unitarios existentes siguen pasando sin cambios
- [ ] `npm test` (unitario) y `npm run test:integration` son independientes
- [ ] Build de frontend sigue funcionando

