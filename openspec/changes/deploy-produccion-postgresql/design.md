# Design: Deploy Producción — PostgreSQL

## Technical Approach

Six coordinated changes to make the app production-deployable on Railway: switch Prisma to PostgreSQL, add security middleware, enforce password change on first login, fix hardcoded frontend URLs, provide rich demo data, and document setup.

---

## Architecture Decisions

### Decision: Prisma datasource strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Single PG connection string in `.env` | Works locally but Railway overrides it | **Adopt** — `DATABASE_URL` from env always wins |
| SQLite fallback when no DATABASE_URL | Dev continues with SQLite unchanged | **Adopt** — `schema.prisma` uses `env("DATABASE_URL")`; `.env` file with `DATABASE_URL="file:./dev.db"` for local dev |
| Prisma multi-provider | Not supported in single datasource | Rejected — separate `.env` is simpler |

### Decision: Seed consolidation

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep two separate scripts (seed.js + init-railway.js) | init-railway.js is sparse (no demo data), seed.js is `deleteMany` (destructive) | **Unify into seed.js** — make seed.js idempotent with upsert/deleteMany-create. `npm run db:seed` becomes the single entry point |
| merge init-railway.js logic into seed.js | One script does everything | **Adopt** — replace the `start` script to run seed instead of init-railway |

### Decision: Password change modal routing

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Separate route `/change-password` | Requires route guard, layout change | Rejected — more surface area |
| Modal overlay on any page after login | Simpler, user sees it immediately, cannot dismiss | **Adopt** — `PasswordChangeModal` in Layout, triggered when `user.passwordChanged === false` |

### Decision: JWT_SECRET dev fallback

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Fail hard in dev too | Breaks existing workflow | Rejected |
| Warn + use fallback in dev, fail in production | Dev keeps working, prod is safe | **Adopt** — `NODE_ENV=production` check on startup |

### Decision: CORS_ORIGIN source

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Reuse `VITE_API_URL` | Same env var; consistent | **Adopt** — single origin env var |
| Separate `CORS_ORIGIN` var | More explicit, decouples | Rejected — unnecessary indirection |

### Decision: init-railway.js fate

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Delete init-railway.js | Cleaner but breaks existing Railway deploy | **Keep but simplify** — change `start` script to `npx prisma db push && npx prisma db seed`. init-railway.js becomes deprecated (can remove later) |
| Repurpose init-railway.js as Railway seed | Already exists; minimal changes needed | Viable but seed.js is richer. Keep both, seed.js is primary |

---

## Data Flow

```
Browser ──https──► Railway Frontend (Vite SPA)
                     │
                     │ fetch() with Bearer token
                     ▼
              Railway Backend (Express)
                     │
                     ├── helmet()           ── sets security headers
                     ├── rateLimit(100/15m)  ── global throttle
                     ├── rateLimit(20/15m)   ── auth endpoint throttle
                     ├── cors({origin})      ── blocks unknown origins
                     │
                     ├── POST /api/auth/login
                     │     └──→ JWT sign (JWT_SECRET)
                     │     └──→ response includes { user: { passwordChanged } }
                     │
                     ├── POST /api/auth/change-password
                     │     └──→ authMiddleware checks token
                     │     └──→ bcrypt.compare(currentPassword)
                     │     └──→ bcrypt.hash(newPassword), update Usuario
                     │
                     └── Prisma ──→ PostgreSQL (Railway PG service)
                            └── DATABASE_URL from Railway env
```

**URL resolution flow**:
```
import.meta.env.VITE_API_URL (set on Railway)
  ? VITE_API_URL
  : DEV_API (localhost:3001) or PROD_API (Railway)

sync.js: import { API_BASE } from '@/api'  // no more hardcoded localhost
```

**First-login flow**:
```
Login success ──→ response.passwordChanged === false
                      │
                      ▼
           AuthContext stores user (with passwordChanged)
                      │
                      ▼
           Layout renders <PasswordChangeModal />
           (modal cannot be dismissed; user must change or logout)
                      │
           POST /api/auth/change-password ──→ passwordChanged: true
                      │
                      ▼
           Modal closes, dashboard rendered normally
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` | Modify | `provider: "postgresql"`, `url: env("DATABASE_URL")`, add `passwordChanged` on Usuario, add `Recordatorio` model |
| `backend/prisma/seed.js` | Modify | Add `passwordChanged: true` to default users, make idempotent (upsert for usuarios, deleteMany+create for rest) |
| `backend/prisma/init-railway.js` | Keep (deprecated) | No code change; `start` script shifts to seed.js |
| `backend/src/index.js` | Modify | Add helmet, rate-limit, CORS config, JWT_SECRET startup check, mount new auth routes |
| `backend/src/middleware/auth.js` | Modify | Read JWT_SECRET from env, fail in production if missing |
| `backend/src/controllers/auth.js` | Modify | Add `changePassword`, include `passwordChanged` in login response, export JWT_SECRET from env |
| `backend/src/routes/auth.js` | Modify | Add `POST /change-password` route |
| `backend/package.json` | Modify | Add `helmet`, `express-rate-limit` deps; update `start` script |
| `backend/.env` | Create | `DATABASE_URL="file:./dev.db"`, `JWT_SECRET="betty-dev-secret"` |
| `railway.json` | Modify | Remove `DATABASE_URL` placeholder (Railway PG injects it), remove `NIXPACKS_NODE_VERSION` |
| `frontend/src/api.js` | Modify | Prefer `import.meta.env.VITE_API_URL`, fallback to DEV/PROD |
| `frontend/src/lib/sync.js` | Modify | Import `{ API_BASE }` from `@/api` instead of hardcoded `'http://localhost:3001/api'` |
| `frontend/src/components/Layout.jsx` | Modify | Add `<SyncIndicator />` in header (near search bar), add `<PasswordChangeModal />` |
| `frontend/src/components/SyncIndicator.jsx` | No change | Already exists and works — just wire it in Layout |
| `frontend/src/components/PasswordChangeModal.jsx` | Create | Modal dialog for first-login password change |
| `frontend/src/pages/Dashboard.jsx` | Modify | Remove `getPacienteName()`, replace `alert()` with `toast.error()` |
| `frontend/src/App.jsx` | Modify | Add `<Toaster />` from `sonner` at root level |
| `frontend/src/context/AuthContext.jsx` | Modify | Store `passwordChanged` from login response; expose `refreshUser()` |
| `frontend/package.json` | Modify | Add `sonner` dependency |
| `README.md` | Create | Full project documentation |

---

## Interfaces / Contracts

### Prisma Schema — Usuario model delta

```prisma
model Usuario {
  id              Int      @id @default(autoincrement())
  nombre          String
  email           String   @unique
  password        String
  rol             String   // 'admin', 'doctor', 'asistente'
  activo          Boolean  @default(true)
  passwordChanged Boolean  @default(false)   // ← NEW
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### Prisma Schema — Recordatorio model (NEW)

```prisma
model Recordatorio {
  id           Int      @id @default(autoincrement())
  pacienteId   Int
  paciente     Paciente @relation(fields: [pacienteId], references: [id], onDelete: Cascade)
  tipo         String   // recordatorio_1m, recordatorio_6m
  destinatario String   // 'paciente'
  telefono     String?
  mensaje      String?
  whatsappUrl  String?
  estado       String   @default("pendiente") // pendiente, enviado, cancelado
  enviadoEn    DateTime?
  createdAt    DateTime @default(now())
}
```

### API — POST /api/auth/login response

```json
{
  "token": "eyJ...",
  "user": {
    "id": 1,
    "nombre": "Admin Betty",
    "email": "admin@betty.com",
    "rol": "admin",
    "passwordChanged": true
  }
}
```

### API — POST /api/auth/change-password

**Request**:
```json
{
  "currentPassword": "old123",
  "newPassword": "new456secure"
}
```

**Response (200)**:
```json
{
  "message": "Contraseña actualizada exitosamente",
  "passwordChanged": true
}
```

### API — POST /api/auth/me response

```json
{
  "id": 1,
  "nombre": "Admin Betty",
  "email": "admin@betty.com",
  "rol": "admin",
  "activo": true,
  "passwordChanged": true
}
```

### CORS / Rate-Limit Config

```js
// helmet
app.use(helmet());

// global rate limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intente de nuevo más tarde' }
}));

// auth endpoint stricter limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos de inicio de sesión' }
});

// CORS
const corsOrigin = process.env.CORS_ORIGIN || process.env.VITE_API_URL || 'http://localhost:5173';
app.use(cors({ origin: corsOrigin }));
```

### JWT_SECRET enforcement

```js
// startup check
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET no está configurado en producción');
    process.exit(1);
  }
  console.warn('ADVERTENCIA: JWT_SECRET no configurado, usando fallback de desarrollo');
}
```

### URL resolution (api.js)

```js
const DEV_API = 'http://localhost:3001';
const PROD_API = 'https://amusing-fulfillment-production-1144.up.railway.app';

const API_BASE = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? DEV_API : PROD_API);
```

### sync.js import change

```diff
- const API = 'http://localhost:3001/api';
+ import { API_BASE } from '@/api';
+ const API = `${API_BASE}/api`;
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Integration | Prisma connects to PG, schema push succeeds | `npx prisma db push` against a test PG (local Docker PG or Railway PG) |
| Integration | Seed script runs idempotently — re-run produces no errors | Run `node prisma/seed.js` twice, verify no duplicate errors |
| Unit | Password change: wrong current → 401, weak new → 400, valid → 200 | Manual API test with curl/Postman |
| Unit | JWT_SECRET missing in production → process.exit | Set NODE_ENV=production, unset JWT_SECRET, verify server exits |
| Integration | Helmet headers present on response | curl -I /api/health, check X-Frame-Options, X-Content-Type-Options |
| Integration | Rate limit exceeded → 429 | Send 101 rapid requests to /api/health, verify 429 on last |
| Manual | CORS blocks unknown origin | Fetch from http://evil.com, verify browser CORS error |
| Manual | First-login password change modal | Login as new user with passwordChanged=false, verify modal blocks navigation |
| Manual | SyncIndicator visible in Layout | Navigate to any protected page, verify indicator in header |
| Manual | sonner toast replaces alert() | Submit cobro with network error, verify toast instead of alert |

---

## Migration / Rollout

**Deploy order**:
1. Add `Recordatorio` model and `passwordChanged` field to schema.prisma
2. `npx prisma migrate dev --name add-recordatorio-password-changed` (optional, or just db push for PG)
3. Deploy backend to Railway with new dependencies (`helmet`, `express-rate-limit`)
4. Set Railway env vars: `JWT_SECRET`, `VITE_API_URL`, `CORS_ORIGIN`
5. Link Railway PostgreSQL service (auto-injects `DATABASE_URL`)
6. Run `npm run db:seed` on Railway to populate demo data
7. Deploy frontend with `VITE_API_URL` set at build time
8. Verify /api/health, login, password change flow

**Rollback** (per proposal section — revert each change in reverse order):
1. Revert schema.prisma to sqlite
2. Remove helmet/rate-limit deps + imports
3. Revert railway.json DATABASE_URL
4. Remove Railway PG service
5. Revert sync.js/api.js, package.json deps
6. `git checkout` affected files

---

## Open Questions

- [ ] `Recordatorio` model referenced in seed.js but missing from schema.prisma — confirm this was intentionally omitted and needs adding
- [ ] Confirm Railway PG service plan (free tier 500MB is enough for demo data)
- [ ] Decide whether to keep `init-railway.js` as a Railway-specific minimal seed or fully replace with seed.js
