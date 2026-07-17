# Tasks: Add E2E Testing with Playwright

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~800–900 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Infra+Seed+RateLimit+Helpers+CI → PR 2: All 8 specs |
| Delivery strategy | auto-forecast |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### ⚠️ Schema Gap — Decision Required Before Apply

Design specifies SQLite for E2E (`DATABASE_URL=file:./dev-e2e.db`) but `backend/prisma/schema.prisma` has `provider = "postgresql"`. Options: (a) create `prisma/schema.e2e.prisma` with SQLite provider, (b) use PostgreSQL for E2E (local + CI service container). Resolve before implementation.

---

## Phase 1: Foundation (Infrastructure + Backend Changes)

**Dependencies**: None (first work)
**Verification**: `npm run db:seed:e2e` creates known test data; `npm run test:e2e` exists in scripts

- [x] 1.1 Install `@playwright/test` as root devDependency, create `e2e/` directory
- [x] 1.2 Create `e2e/playwright.config.js` — webServer (Vite:5173, Express:3001 with `SKIP_RATE_LIMIT=true`), baseURL `http://localhost:5173`, viewport 1280×720, `fullyParallel: false`, `workers: 1`, timeout 30000, globalSetup path, StorageState path `e2e/.auth/admin.json`
- [x] 1.3 Create `e2e/global-setup.js` — run `npm run db:seed:e2e`, authenticate admin via API, save StorageState
- [x] 1.4 Create `e2e/fixtures/users.js` — export `{ admin, doctor, asistente }` credentials (email + password)
- [x] 1.5 Add `test:e2e` (`npx playwright test`), `test:e2e:ui`, `db:seed:e2e` scripts to root `package.json`; add `db:seed:e2e` to `backend/package.json`
- [x] 1.6 Create `backend/prisma/seed-e2e.js` — idempotent (upsert): 3 users, 3 patients+HC, 2 citas, 2 crediticios, 2 categorías+5 procedimientos, 3 insumos con stock variado, 2 configs
- [x] 1.7 Modify `backend/src/index.js` — skip `globalLimiter` / `authLimiter` when `SKIP_RATE_LIMIT=true` or `NODE_ENV=test` via conditional middleware
- [x] 1.8 Update `.gitignore` — add `e2e/.auth/`, `e2e/test-results/`, `e2e/playwright-report/`

## Phase 2: Helpers

**Dependencies**: Phase 1 (config exists)
**Verification**: Each helper can be unit-tested manually via `node --eval` import

- [x] 2.1 Create `e2e/helpers/auth.js` — `login(page, role)` → POST `/api/auth/login`, set localStorage token
- [x] 2.2 Create `e2e/helpers/confirmDialog.js` — `confirmAction(page, password)` → fill dialog password input, click Confirm button, wait for dialog close
- [x] 2.3 Create `e2e/helpers/selectHelper.js` — `selectOption(page, triggerText, optionText)` → click combobox trigger, wait for listbox portal, click option
- [x] 2.4 Create `e2e/helpers/dateHelper.js` — `freezeClock(page, isoDate)` → `page.clock.freezeFixed(new Date(isoDate))`

## Phase 3: Specs

**Dependencies**: Phase 1 (seed data, rate limiter toggle) + Phase 2 (helpers)
**Verification**: Each spec passes in isolation; full suite passes sequentially under 2 min

- [x] 3.1 Create `e2e/specs/auth.spec.js` — login success/invalid, logout clears token, protected route redirects to `/login`, sidebar items per role (7 scenarios)
- [x] 3.2 Create `e2e/specs/patients.spec.js` — list patients, search by name, create patient via form, edit, delete with password confirm (5 scenarios)
- [x] 3.3 Create `e2e/specs/agenda.spec.js` — freeze clock, view agenda, create cita (use `selectOption` for paciente), change estado to realizada, cobro creates crediticio record, month nav (5 scenarios)
- [x] 3.4 Create `e2e/specs/crediticio.spec.js` — list records, create nuevo movimiento, verify totals, trigger XLSX export download, verify doctor access denied (5 scenarios)
- [x] 3.5 Create `e2e/specs/procedimientos.spec.js` — list categories, expand to see procedures, create category, create procedure, edit procedure, delete procedure (6 scenarios)
- [x] 3.6 Create `e2e/specs/inventario.spec.js` — list supplies with stock, create, edit, delete insumo (4 scenarios)
- [x] 3.7 Create `e2e/specs/configuracion.spec.js` — page loads cards, switch WhatsApp provider mode, toggle reminder toggle, save config (4 scenarios)
- [x] 3.8 Create `e2e/specs/roles.spec.js` — admin vs doctor vs asistente sidebar links, doctor accessing `/crediticio` sees "Acceso denegado" (4 scenarios)

## Phase 4: CI

**Dependencies**: Phases 1–3 (all code exists)
**Verification**: PR to main triggers workflow; report artifact uploaded on failure

- [x] 4.1 Create `.github/workflows/e2e.yml` — trigger: `pull_request → main`, runner: ubuntu-latest, node 22, steps: checkout, npm ci, install chromium, postgres service container, prisma generate+push, seed, start backend (`SKIP_RATE_LIMIT=true`) + frontend, wait for both, `npx playwright test`, upload `playwright-report/` on failure

## Implementation Order

Phase 1 → Phase 2 → Phase 3 → Phase 4. Phase 1 must be fully done before any helper or spec work. Specs are independent of each other (sequential execution handles auth reuse). CI is last.

### Suggested PR Split

**PR 1** (~350–400 lines): Phases 1 + 2 + 4 (infrastructure, backend changes, helpers, CI). This is self-contained — installs playwright, configures it, seeds data, toggles rate limiting, provides helpers, and wires CI. No actual test scenarios yet, but the pipeline is ready.

**PR 2** (~450–500 lines): Phase 3 (all 8 spec files). Pure test code — no infra changes. Each spec is its own work unit. Reviewers focus on scenario coverage and assertions.
