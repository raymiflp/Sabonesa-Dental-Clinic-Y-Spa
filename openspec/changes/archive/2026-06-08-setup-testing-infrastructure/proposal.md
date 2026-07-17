# Proposal: Setup Testing Infrastructure

## Intent

El proyecto carece de tests automatizados en backend y frontend. Esto impide detectar regresiones, validar controllers y middleware, y mantener calidad a medida que crece la base de código. Este cambio agrega el stack de testing completo (Vitest + Testing Library + MSW + Supertest) sin modificar código de producción.

## Scope

### In Scope
- Vitest + Supertest en backend con scripts `test` y `test:run`
- Vitest + @testing-library/react + jsdom + MSW en frontend
- Config de coverage básica (text + html, sin threshold)
- Tests de referencia: middleware/auth (backend), ProtectedRoute + Login + AuthContext (frontend)

### Out of Scope
- Tests de integración con BD real o e2e (Playwright/Cypress)
- Umbrales de coverage obligatorios en CI
- Modificación de archivos de producción o lógica de negocio
- Pipeline CI/CD (se hará en cambio separado)

## Capabilities

> Cambio puramente infraestructura. No introduce ni modifica capacidades funcionales.

### New Capabilities
None.

### Modified Capabilities
None.

## Approach

1. **Backend**: Instalar vitest + @vitest/coverage-v8 + supertest como devDependencies. Crear `vitest.config.js` con soporte ESM. Agregar scripts `test` (watch) y `test:run` (single-run). Crear `src/__tests__/` con tests de middleware auth (JWT) y controllers base.

2. **Frontend**: Instalar vitest + @testing-library/react + @testing-library/jest-dom + jsdom + msw como devDependencies. Crear `vitest.config.ts` con environment jsdom. Agregar scripts `test` y `test:run`. Crear `src/test/` con setup files y tests de ProtectedRoute, Login y AuthContext.

3. **Tests de referencia**: Implementar tests que sirvan como template: auth middleware con Supertest, ProtectedRoute con MSW mockeando API, Login con submit exitoso/fallido, AuthContext con estado y logout.

4. **Coverage**: Configurar reporter `text` y `html`, sin threshold obligatorio.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/package.json` | Modified | +devDeps +scripts `test`, `test:run` |
| `backend/vitest.config.js` | New | Config Vitest ESM |
| `backend/src/__tests__/` | New | Tests backend |
| `frontend/package.json` | Modified | +devDeps +scripts `test`, `test:run` |
| `frontend/vitest.config.ts` | New | Config Vitest jsdom |
| `frontend/src/test/` | New | Tests + setup frontend |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Vitest incompatible con Vite 8 / Node 22 ESM | Low | Usar vitest v3+ que soporta Vite 8 |
| jsdom no soporte API de React 19 | Low | Usar @testing-library/react v16+; migrar a happy-dom si es necesario |
| MSW intercepte en dev | Low | Activar MSW solo condicionalmente en test |

## Rollback Plan

Commits atómicos permiten revertir por capa:
`npm uninstall` devDependencies → revertir scripts en package.json → borrar vitest.config.* y directorios de tests. Ningún archivo de producción se modifica.

## Dependencies

- vitest v3+ (compatible con Vite 8 y Node 22 ESM)
- @testing-library/react v16+ (React 19)
- msw v2+ (ESM nativo)

## Success Criteria

- [ ] `npm run test:run` pasa en backend y frontend
- [ ] Tests de middleware/auth cubren: token faltante, inválido, expirado
- [ ] Tests frontend cubren: ProtectedRoute (redirect sin token), Login (submit exitoso/fallido), AuthContext
- [ ] Coverage genera reporte text + html sin errores
- [ ] `npm run dev` y `npm run build` siguen funcionando en ambos lados
- [ ] Ningún archivo de producción fue modificado
