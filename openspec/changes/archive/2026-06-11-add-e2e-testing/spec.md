# E2E Testing Specification

## Purpose

Playwright E2E tests covering 8 critical user flows of Sabonesa Dental Clinic Y Spa — a dental clinic management system with Spanish UI. Tests run sequentially against SQLite, sharing DB state. Auth state is persisted via StorageState. Rate limiting disabled when `E2E_TEST=true` env is set.

## Requirements

### Requirement: Test Infrastructure

The E2E infrastructure MUST provide a Playwright config at `e2e/playwright.config.js` with: `baseURL: http://localhost:5173`, viewport 1280x720, `fullyParallel: false`, `retries: 0`, `workers: 1`, `timeout: 30000`. The `webServer` block MUST start both frontend (Vite 8, port 5173) and backend (Express, port 3001) before tests.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Config loads | Fresh checkout | `npm run test:e2e` runs | Playwright starts webServer, renders login page |
| Sequential execution | Multiple spec files | Suite runs | Specs execute one at a time, in order |
| Timeout detection | Slow response on any step | Step exceeds 30s | Test fails with timeout error |

### Requirement: Global Setup & Helpers

The project MUST provide `e2e/global-setup.js` that logs in as admin and saves StorageState to `e2e/.auth/admin.json`. Custom helpers MUST reside in `e2e/helpers/`:

| Helper | Purpose | Behavior |
|--------|---------|----------|
| `confirmDialog` | Password confirmation dialogs | Fills password input, clicks confirm button |
| `selectOption` | shadcn Select components | Opens portal, selects option by label text |
| `pickDate` | Date/calendar inputs | Sets date input value directly |
| `freezeClock` | Date-sensitive tests | Calls `page.clock.freezeFixed()` before navigation |

#### Scenario: Global Setup Auth

- GIVEN fresh test environment
- WHEN `global-setup.js` executes
- THEN admin is logged in and StorageState is saved to `e2e/.auth/admin.json`

#### Scenario: Confirm Dialog Helper

- GIVEN a delete/action requiring password confirmation
- WHEN `confirmDialog(page)` is called with correct password
- THEN the dialog submits and action completes

#### Scenario: shadcn Select Helper

- GIVEN a shadcn Select component rendered on page
- WHEN `selectOption(page, label, optionText)` is called
- THEN the correct option is selected (handles Radix portal)

### Requirement: E2E Seed Data

The system MUST provide `backend/prisma/seed-e2e.js` that seeds minimal test data: 1 admin user (`e2e@test.com` / `Test1234!`), 1 doctor user, 1 asistente user, 2 patients with clinical records, 1 procedure category with 2 procedures, 2 supplies, 1 appointment (today), and 1 credit record. Seed MUST be idempotent (upsert).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Fresh seed | Empty test DB | `npx prisma db seed` runs | All test records created with known IDs |
| Re-seed | Existing test data | Seed runs again | No duplicate errors; data replaced via upsert |
| Test-specific DB | Development DB has different data | E2E runs with `DATABASE_URL=file:./test.db` | E2E data is isolated from dev data |

### Requirement: Auth Flow

The system MUST test login, logout, role-based access, password change, and inactive user rejection.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Successful login | Login page at `/login` | Fill valid `e2e@test.com` / `Test1234!` | Redirected to `/`; sidebar shows user name and role |
| Invalid credentials | Login page | Submit wrong password | Red error message "Credenciales inválidas" |
| Role-based sidebar | Logged in as admin | Navigate to `/` | All nav items visible (Dashboard, Agenda, Pacientes, Crediticio, Procedimientos, Inventario, Configuración) |
| Doctor restricted | Logged in as doctor | Navigate to `/` | Crediticio link NOT present in sidebar |
| Asistente limited | Logged in as asistente | Navigate to `/` | Only Dashboard, Agenda, Pacientes, Inventario visible |
| Protected route | Unauthenticated | Navigate to `/agenda` | Redirected to `/login` |
| Admin-only route | Doctor user visits `/crediticio` | Navigate directly | 403 or redirect |
| Logout | Authenticated | Click logout icon | Token cleared; redirected to `/login` |
| Password change | Authenticated user | Submit valid current + new password | Success message; password updated |

### Requirement: Patients Flow

The system MUST test patient CRUD (list, create, edit, delete) and clinical history access.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| List patients | Authenticated user | Navigate to `/historial` | Patient table shows existing patients |
| Create patient | Patient list page | Click "Nuevo Paciente", fill form, submit | Patient appears in table |
| View clinical history | Existing patient | Click patient row/ver | Navigates to `/historial/{id}`; shows patient record |
| Edit patient | Patient detail page | Modify field, save | Changes persist and display |
| Delete patient | Patient list | Click delete, confirm password | Patient removed from table |
| Patient search | Multiple patients exist | Type in global search bar | Results filter by name, cédula, or phone |

### Requirement: Agenda Flow

The system MUST test appointment CRUD with date navigation, status changes, and cobro creation.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| List today's appointments | Seed has 1 appointment today | Navigate to `/agenda` | Appointment visible in today's date cell |
| Create appointment | Agenda page | Click date, fill patient+time, submit | Appointment appears on calendar |
| Change appointment status | Existing appointment | Open edit, change to "realizada" | Badge updates to green "realizada" |
| Cobro from appointment | Realizada appointment | Click cobrar, fill amount, submit | Crediticio record created; toast confirms |
| Delete appointment | Existing appointment | Click delete, confirm password | Appointment removed from view |
| Month navigation | Current month shown | Click prev/next month arrows | Calendar updates to correct month/year |
| Filter by status | Multiple appointments | Select "pendiente" filter | Only pending appointments shown |

### Requirement: Crediticio Flow

The system MUST test credit/payment record CRUD, date filtering, totals calculation, and Excel export. Admin-only access.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| List credit records | Seed has 1 credit record | Navigate to `/crediticio` | Record visible in month calendar view |
| Create payment record | Crediticio page | Select patient, fill amount, submit | Record appears in selected date |
| Edit payment | Existing record | Click edit, modify amount, save | Amount updates in view |
| Delete payment | Existing record | Click delete, confirm password | Record removed |
| Excel export | Records exist | Click export button (FileDown) | XLSX file downloads |
| Totals calculation | Multiple records in a day | Select date with records | Total pagado, abonado, descuento displayed |

### Requirement: Procedimientos Flow

The system MUST test procedure CRUD with category grouping and nested procedure management.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| List categories | Seed has 1 category | Navigate to `/procedimientos` | Category visible with expand icon |
| Expand category | Category exists | Click chevron/expand | Procedures within category shown |
| Create procedure | Category expanded | Click "+", fill name+price, submit | Procedure appears under category |
| Edit procedure | Existing procedure | Click edit, modify, save | Changes reflected |
| Delete procedure | Existing procedure | Click delete, confirm password | Procedure removed from category |
| Create category | Procedure page | Click "Nueva Categoría", fill name, submit | New category appears in list |
| Edit category | Existing category | Click edit on category, update, save | Category name updated |
| Delete category | Category with no procedures | Click delete, confirm | Category removed |

### Requirement: Inventario Flow

The system MUST test supply (insumo) CRUD with stock color coding.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| List supplies | Seed has 2 supplies | Navigate to `/inventario` | Table shows both supplies with stock colors |
| Stock colors | Supplies with stock=0, stock=5, stock=25 | Table renders | 0→red bg, 1-10→yellow bg, >10→green bg |
| Create supply | Inventario page | Click "Nuevo Insumo", fill form, submit | Supply appears in table |
| Edit supply | Existing supply | Click pencil icon, modify, save | Changes reflected in table |
| Delete supply | Existing supply | Click trash icon, confirm password | Supply removed |

### Requirement: Configuracion Flow

The system MUST test configuration page load, WhatsApp provider mode switching, reminder settings, and test message sending.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Page loads | Authenticated admin | Navigate to `/configuracion` | WhatsApp card, Reminders card, and Test card render |
| WhatsApp mode switch | Config page open | Change provider dropdown to "Twilio API" | Mode saved; toast confirms |
| Reminder toggle | Config page open | Click activation toggle | Toggle switches between Activado/Desactivado |
| Save reminder config | Config modified | Click "Guardar configuración" | Success toast; config persists on reload |
| Test message form | Config page open | Fill phone number, click "Enviar mensaje de prueba" | Sending state shown; result displayed |

### Requirement: Roles Flow

The system MUST test user registration (admin only), role verification, and multi-role permission enforcement.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Admin registers user | Logged in as admin | POST to `/api/auth/register` with new user data | 201; user created with specified role |
| Non-admin rejected | Logged in as doctor | POST to `/api/auth/register` | 403 Forbidden |
| Duplicate email | Existing email | POST register with same email | 409 "El email ya está registrado" |
| Asistente cannot access crediticio | Logged in as asistente | Navigate to `/crediticio` | Redirected or 403 |
| Doctor cannot register users | Logged in as doctor | Navigate to user management | No register option visible |

### Requirement: CI Pipeline

The system MUST provide `.github/workflows/e2e.yml` that runs E2E tests on every PR to main.

| Property | Value |
|----------|-------|
| Trigger | `pull_request` → `main` |
| Runner | `ubuntu-latest` |
| Database | SQLite (file: `./backend/prisma/test.db`) |
| Node | 22.x |
| Setup | `npm ci`, `npx playwright install --with-deps chromium`, `npx prisma generate` |
| Seed | `npm run db:seed:e2e` |
| Run | `npm run test:e2e` |
| Artifacts | `playwright-report/` uploaded on failure |

#### Scenario: CI Run

- GIVEN a PR to main with Playwright tests
- WHEN CI workflow triggers
- THEN tests run against fresh seed data, report uploaded if any fail

### Requirement: Non-Functional

| Constraint | Rule |
|------------|------|
| Sequential | All specs MUST run in order; `fullyParallel: false` |
| Flakiness | Zero flaky tests — no `auto-retry` hacks; stable timeouts |
| Browser | Chromium only (baseline); Firefox SHOULD pass but not mandatory |
| Speed | Full suite SHOULD complete under 2 minutes |
| Isolation | Seed MUST be applied fresh before `npm run test:e2e` |

#### Scenario: Fresh Seed Before Suite

- GIVEN previous test run left DB in dirty state
- WHEN `npm run db:seed:e2e` executes
- THEN DB reset to known state before any test runs

### Requirement: Security

| Rule | Description |
|------|-------------|
| No real credentials | Test credentials (`e2e@test.com` / `Test1234!`) MUST be fake and ONLY exist in seed file |
| Rate limiting | Rate limiter MUST check `process.env.E2E_TEST`; if `true`, skip limiting entirely |
| StorageState | Auth token in `e2e/.auth/admin.json` MUST be gitignored, regenerated per test run |
| Environment | `E2E_TEST=true` MUST be set in `e2e/playwright.config.js` `webServer.env` block |

#### Scenario: Rate Limiter Disabled in E2E

- GIVEN `E2E_TEST=true` env is set
- WHEN multiple rapid API requests are sent
- THEN no rate limiting errors occur

#### Scenario: No Real Credentials in Code

- GIVEN grep for real admin email and password in tests, configs, or helpers
- WHEN any test source file is checked
- THEN no production credentials are found
