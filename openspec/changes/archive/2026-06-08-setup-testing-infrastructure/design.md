# Design: Setup Testing Infrastructure

## Technical Approach

Testing stack elegido para cubrir backend (Express + Prisma) y frontend (React 19 + Vite 8) sin BD real ni servicios externos.

**Backend**: Vitest + Supertest sobre Express aislado. Prisma se mockea completo con `vi.mock('@prisma/client')` — cada test recibe un mock controlado de `req.prisma.usuario`, `req.prisma.cita`, etc. Supertest permite testear middleware y controllers sin levantar el servidor real.

**Frontend**: Vitest + jsdom + @testing-library/react para componentes. MSW intercepta fetch a nivel HTTP para que `api.js` funcione sin cambios. `indexedDB` de `./lib/db.js` se mockea con `vi.mock` para evitar dependencia del browser.

Ambos lados comparten patrón: `vitest.config.js` → `src/__tests__/` (backend) o `src/test/` (frontend) → scripts `test` (watch) y `test:run` (single-run).

## Architecture Decisions

| Option | Tradeoffs | Decision |
|--------|-----------|----------|
| **Vitest vs Jest** | Vitest es ESM nativo, comparte config con Vite 8, mismo `expect` compatible. Jest requiere transformación ESM → CJS con `ts-node` o `babel`. | **Vitest** — el proyecto ya usa Vite 8, Vitest v3+ hereda su pipeline nativamente |
| **Supertest vs servidor real** | Supertest envuelve Express en `http.createServer` y hace requests efímeros sin `app.listen()`. Alternativa: levantar servidor real → más lento, necesita limpieza de puertos. | **Supertest** — ideal para tests rápidos sin proceso HTTP real |
| **MSW vs mock manual de fetch** | MSW intercepta `fetch` global con Service Worker en test. Mock manual requiere overridear `globalThis.fetch` y restaurarlo. | **MSW v2+** — más limpio, corre en node (jsdom), handlers reutilizables para Integration Testing |
| **Prisma mocking** | `vi.mock('@prisma/client')` reemplaza el módulo completo. Alternativa: `prisma-mock` librería externa, mockery manual. | **vi.mock directo** — sin dependencia extra, control granular sobre cada método (`findUnique`, `create`, etc.) |

## Mocking Strategy Detail

**Prisma** (`@prisma/client` mock):
```js
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    usuario: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    cita: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
    // ... resto de modelos
    $disconnect: vi.fn(),
  })),
}));
```

**Express test helper**: Factory que crea `express()` y monta solo las rutas/middleware bajo test. No toca `index.js`.

**Frontend DB mock**: `vi.mock('../lib/db')` retorna funciones stub que no usan `indexedDB`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/vitest.config.js` | Create | Config ESM + coverage text/html |
| `backend/src/__tests__/helpers/setup.js` | Create | Factory para app Express + mock Prisma |
| `backend/src/__tests__/middleware/auth.test.js` | Create | Tests authMiddleware: sin token, inválido, expirado |
| `backend/src/__tests__/controllers/auth.test.js` | Create | Tests login, register, changePassword |
| `frontend/vitest.config.js` | Create | Config jsdom + path alias `@/` |
| `frontend/src/test/setup.js` | Create | Setup MSW server + afterEach cleanup |
| `frontend/src/test/mocks/handlers.js` | Create | MSW handlers para `/api/auth/*` |
| `frontend/src/test/mocks/server.js` | Create | MSW `setupServer` instance |
| `frontend/src/test/api.test.js` | Create | Tests api.js cliente (login, getMe, 401 cleanup) |
| `frontend/src/test/AuthContext.test.jsx` | Create | Tests AuthProvider (login ok/error, logout, checkAuth sin token) |
| `frontend/src/test/ProtectedRoute.test.jsx` | Create | Tests loading, redirect sin user, denied por rol |
| `frontend/src/test/Login.test.jsx` | Create | Tests form submit exitoso/fallido |
| `backend/package.json` | Modify | +`test`, `test:run` scripts + devDeps |
| `frontend/package.json` | Modify | +`test`, `test:run` scripts + devDeps |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| **Unit — Backend middleware** | `authMiddleware`: token ausente, formato inválido, JWT expirado, token válido | Supertest + mock de `jsonwebtoken.verify` (o token real firmado) |
| **Unit — Backend controllers** | `login`: email faltante, credenciales inválidas, usuario desactivado, éxito. `register`: validación de campos, email duplicado, rol inválido. `changePassword`: validación longitud, password actual incorrecta | Supertest + mock Prisma con `vi.fn()` que retorna data controlada |
| **Unit — Frontend api.js** | `login()` envía JSON correcto, `getMe()` usa token de localStorage, 401 limpia token | MSW handler + mock `./lib/db` (stubs) |
| **Integration — Frontend AuthContext** | Login exitoso setea user, login fallido setea error, logout limpia estado y localStorage, `checkAuth` sin token no llama API | MSW handler + render con `AuthProvider` |
| **Integration — Frontend ProtectedRoute** | Estado loading muestra spinner, sin user redirige a `/login`, usuario sin rol muestra denied, usuario autorizado renderiza children | MemoryRouter + AuthContext mockeado |
| **Integration — Frontend Login page** | Submit exitoso navega a `/`, submit fallido muestra error, botón deshabilitado durante submit | MSW handler + MemoryRouter + AuthProvider |

## Coverage Config

```js
// Ambos vitest.config.js comparten este patrón
coverage: {
  provider: 'v8',
  reporter: ['text', 'html'],
  reportsDirectory: './coverage',
},
// Sin threshold — solo reporte informativo
```

<!-- Excluded from word count: tables and code blocks -->
