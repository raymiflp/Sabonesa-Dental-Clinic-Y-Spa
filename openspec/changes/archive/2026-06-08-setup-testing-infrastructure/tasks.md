# Tasks: Setup Testing Infrastructure

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~494 (478 new + 16 modified) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

```
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium
```

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend + Frontend infrastructure + tests | Single PR | ~494 líneas, dentro del budget D2 de 800 |

---

## Phase 1: Backend Infrastructure

- [x] 1.1 Install `vitest`, `@vitest/coverage-v8`, `supertest` as devDependencies in `backend/package.json`
- [x] 1.2 Add `"test": "vitest"` and `"test:run": "vitest run"` scripts to `backend/package.json`
- [x] 1.3 Create `backend/vitest.config.js` with ESM support, `v8` coverage provider, reporters `text` + `html`
- [x] 1.4 Create `backend/src/__tests__/helpers/setup.js` with Express app factory + `vi.mock('@prisma/client')`

## Phase 2: Frontend Infrastructure

- [x] 2.1 Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `msw` as devDependencies in `frontend/package.json`
- [x] 2.2 Add `"test": "vitest"` and `"test:run": "vitest run"` scripts to `frontend/package.json`
- [x] 2.3 Create `frontend/vitest.config.js` with `environment: 'jsdom'`, path alias `@/`, coverage `v8`
- [x] 2.4 Create `frontend/src/test/setup.js` — MSW server listen + `afterEach` cleanup + `@testing-library/jest-dom` import
- [x] 2.5 Create `frontend/src/test/mocks/handlers.js` — MSW handlers for `POST /api/auth/login`, `GET /api/auth/me`
- [x] 2.6 Create `frontend/src/test/mocks/server.js` — MSW `setupServer(...handlers)` instance

## Phase 3: Backend Tests

- [x] 3.1 Create `backend/src/__tests__/middleware/auth.test.js` — tests `authMiddleware`: no token → 401, invalid token → 401, expired token → 401, valid token → next()
- [x] 3.2 Create `backend/src/__tests__/controllers/auth.test.js` — tests `login` (missing email, bad credentials, disabled user, success), `register` (validation, duplicate email), `changePassword` (length, wrong current password)

## Phase 4: Frontend Tests

- [x] 4.1 Create `frontend/src/test/api.test.js` — tests `login()` JSON format, `getMe()` reads token from localStorage, 401 clears token
- [x] 4.2 Create `frontend/src/test/AuthContext.test.jsx` — tests login success sets user, login failure sets error, logout clears state + localStorage, `checkAuth` without token skips API
- [x] 4.3 Create `frontend/src/test/ProtectedRoute.test.jsx` — tests loading spinner, redirect to `/login` without user, denied for wrong role, renders children when authorized
- [x] 4.4 Create `frontend/src/test/Login.test.jsx` — tests form submit success navigates to `/`, submit failure shows error, button disabled during submit

## Phase 5: Verification

- [x] 5.1 Run `cd backend && npx vitest run` — all 11 backend tests pass
- [x] 5.2 Run `cd frontend && npx vitest run` — all 18 frontend tests pass
- [x] 5.3 Run `cd frontend && npx vite build` — build does not break
- [x] 5.4 Run `cd backend && node src/index.js` — runtime is not broken (syntax valid)
