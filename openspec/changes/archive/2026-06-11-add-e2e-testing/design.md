# Design: E2E Testing with Playwright

## Technical Approach

Single PR adding Playwright (JS, project convention) under `e2e/`. Sequential execution against a seeded SQLite DB matches dev environment. Rate limiting skips when `SKIP_RATE_LIMIT=true` or `NODE_ENV=test`. Eight spec files mirror the frontend routing structure. Shared helpers abstract auth, shadcn portal selects, confirm dialogs, and clock freezing.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| **Test runner** | Playwright vs Cypress vs Vitest E2E | Cypress heavier, no native clock API; Vitest E2E less mature. Playwright: clock API, StorageState, and MSW compatibility | Playwright |
| **Language** | JS vs TS | Project uses JS everywhere (no TS in backend or frontend) | JavaScript |
| **DB for E2E** | SQLite vs testcontainers/PostgreSQL | SQLite matches dev `.env`, zero setup, fast. Testcontainers closer to prod but adds Docker dep | SQLite |
| **Execution** | Sequential vs parallel | Tests share DB state (seed + mutations between groups). Parallel would need per-test isolation | `fullyParallel: false` |
| **Auth strategy** | Login per test vs StorageState | StorageState saves ~2s per spec. Login only on first auth.spec.js, reuse token state | StorageState |

## Data Flow

```
playwright.config.js ──→ webServer (backend :3001 + frontend :5173)
       │
 global-setup.js (seed DB, login admin → save StorageState)
       │
       ▼
  auth.spec.js ──────────→ Login page → StorageState saved
       │
       ▼
  patients.spec.js ──────→ CRUD patients via UI
  agenda.spec.js ─────────→ Browse/create/confirm appointments
  crediticio.spec.js ─────→ View credit history (admin only)
  procedimientos.spec.js ─→ Manage procedures/categories
  inventario.spec.js ─────→ Stock CRUD
  configuracion.spec.js ──→ Update settings
  roles.spec.js ─────────→ Admin vs doctor vs asistente views
```

### Auth Flow

```
spec.start → helpers.auth.login(page, role) → POST /api/auth/login
  → receive token → localStorage.setItem('token', token)
  → save StorageState → return page
```

### Confirm Dialog Flow

```
delete/action click → shadcn dialog opens → helpers.confirmDialog(page, password)
  → fill input[type="password"] → click Confirm button → wait for dialog close
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `e2e/playwright.config.js` | Create | Config: `webServer`, `baseURL`, `StorageState`, `fullyParallel: false`, 1 retry |
| `e2e/global-setup.js` | Create | Seed DB via `npm run db:seed:e2e`, login admin, save `e2e/.auth/admin.json` |
| `e2e/helpers/auth.js` | Create | `login(page, role)` — POST login, set localStorage, return page with token |
| `e2e/helpers/confirmDialog.js` | Create | `confirmAction(page, password)` — type + click confirm |
| `e2e/helpers/selectHelper.js` | Create | `selectOption(page, triggerLabel, optionText)` — click trigger, wait portal, click option |
| `e2e/helpers/dateHelper.js` | Create | `freezeClock(page, isoDate)` — `page.clock.freezeFixed()` |
| `e2e/fixtures/users.js` | Create | Test user credentials (admin/doctor/asistente) |
| `e2e/specs/auth.spec.js` | Create | Login, logout, invalid credentials, role-based redirect |
| `e2e/specs/patients.spec.js` | Create | List, search, create patient, view clinical history |
| `e2e/specs/agenda.spec.js` | Create | View agenda, create cita, change estado (with clock freeze) |
| `e2e/specs/crediticio.spec.js` | Create | View credit history table (admin), verify non-admin blocked |
| `e2e/specs/procedimientos.spec.js` | Create | List procedures, create/edit category, create procedure |
| `e2e/specs/inventario.spec.js` | Create | List supplies, add stock, edit quantity |
| `e2e/specs/configuracion.spec.js` | Create | View settings page (no WhatsApp interaction) |
| `e2e/specs/roles.spec.js` | Create | Verify route access per role (admin, doctor, asistente) |
| `backend/prisma/seed-e2e.js` | Create | Seed: 3 users, 3 patients, citas, credit history, categories+procedures, supplies, config |
| `backend/src/index.js` | Modify | Disable rate limiters when `SKIP_RATE_LIMIT=true` or `NODE_ENV=test` |
| `package.json` | Modify | Add scripts: `test:e2e`, `test:e2e:ui`, `db:seed:e2e` |
| `backend/package.json` | Modify | Add `db:seed:e2e` script |
| `.github/workflows/e2e.yml` | Create | CI: install deps, seed DB, start servers, run Playwright, upload report |

## Rate Limiting Toggle

In `backend/src/index.js`, wrap both `globalLimiter` and `authLimiter`:

```js
const shouldSkip = process.env.SKIP_RATE_LIMIT === 'true' || process.env.NODE_ENV === 'test';

app.use(shouldSkip ? (req, res, next) => next() : globalLimiter);
```

The E2E scripts export `SKIP_RATE_LIMIT=true` before starting the backend.

## Seed Data Design (`seed-e2e.js`)

| Entity | Records | Key fields |
|--------|---------|------------|
| **Usuarios** | 3 | `admin@betty.com` (admin), `doctor@betty.com` (doctor), `asistente@betty.com` (asistente) — all password `Test1234!` |
| **Pacientes** | 3 | Juan Pérez (con HC), María García (con crediticio), Carlos López (con cita) |
| **Citas** | 2 | Future dates, different estados (pendiente, confirmada) |
| **Crediticios** | 2 | Abonos + pagos for María García |
| **Categorías** | 2 | Odontología General (3 procedimientos), Cirugía (2 procedimientos) |
| **Insumos** | 3 | Guantes, Mascarillas, Anestesia with varied stock |
| **Configuraciones** | 2 | `whatsapp_provider_mode` = wa (mock-safe), `notificaciones_activas` = false |

Seeding runs via `npx prisma db push && node prisma/seed-e2e.js` targeting `DATABASE_URL=file:./dev-e2e.db`. The `global-setup.js` runs this shell command once before all specs.

## Helper Interfaces

### `helpers/auth.js`
```js
export async function login(page, role)  // → page (with localStorage token set)
export async function loginAndSaveState(page, role, statePath)  // → browserContext
```

### `helpers/confirmDialog.js`
```js
export async function confirmAction(page, password = 'Test1234!')
```

### `helpers/selectHelper.js`
```js
export async function selectOption(page, triggerText, optionText)
// Handles: click trigger → wait for Radix portal → click option by text
```

### `helpers/dateHelper.js`
```js
export async function freezeClock(page, isoDate = '2026-06-15T10:00:00')
```

## Test Data Management

- **Sequential**: `fullyParallel: false` ensures each spec file runs in order (auth → patients → agenda → crediticio → procedimientos → inventario → configuracion → roles).
- **Auth reuse**: first spec (`auth.spec.js`) logs in admin and saves StorageState. Subsequent specs share it.
- **No cleanup**: tests are additive (create patients, citas, etc.) — the DB is re-seeded on every CI run. For local, `npm run db:seed:e2e` resets.
- **Clock freezing**: `agenda.spec.js` uses `page.clock.freezeFixed()` before date-sensitive interactions to prevent flakiness.

## CI Workflow

```yaml
# .github/workflows/e2e.yml — triggers on PR to main
steps:
  1. Checkout repo
  2. Setup Node 22, npm ci
  3. Install Playwright browsers (chromium only)
  4. Create .env with DATABASE_URL=file:./dev-e2e.db
  5. npx prisma generate && npx prisma db push
  6. node backend/prisma/seed-e2e.js
  7. Start backend: SKIP_RATE_LIMIT=true node backend/src/index.js &
  8. Start frontend: npm --prefix frontend run dev &
  9. Wait for both servers (poll /api/health and localhost:5173)
  10. npx playwright test
  11. Upload playwright-report/ as artifact
```

## Testing Strategy for E2E Tests

| Layer | What | Approach |
|-------|------|----------|
| **Spec** | Each spec validates happy path + 1-2 edge cases | Assert visible text, URL, toast messages |
| **Auth** | Token presence, role-based redirect, invalid login | Verify `localStorage`, route access, error messages |
| **Confirm** | Dialog appears on delete, password typed, action completes | `locator('[role="dialog"]')` visibility |
| **Select** | shadcn portal open, option selected, value reflected | `selectOption` helper, assert input value |
| **Clock** | Freeze date, navigate agenda, assert correct week | `page.clock.freezeFixed()`, visible date labels |

## Open Questions

- None. All decisions documented above.

