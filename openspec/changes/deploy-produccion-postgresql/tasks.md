# Tasks: Deploy Producción — PostgreSQL

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~320 (additions + deletions) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

---

## Batch 1: Backend Infrastructure *(no frontend dependency)*

- [ ] **1.1 PostgreSQL schema** — `backend/prisma/schema.prisma`: change `provider: "postgresql"`, `url: env("DATABASE_URL")`, add missing `Recordatorio` model (seed.js already uses it). Create `backend/.env` with `DATABASE_URL="file:./dev.db"` for local dev. *Accept: `npx prisma db push` succeeds*
- [ ] **1.2 Security middleware** — `backend/src/index.js`: add `helmet()`, `express-rate-limit` (global 100/15m + auth limiter 20/15m), `cors({origin: VITE_API_URL})`. `backend/package.json`: add deps. *Accept: security headers in response, 429 on rate exceed*
- [ ] **1.3 JWT_SECRET hardening** — `backend/src/middleware/auth.js` + `backend/src/controllers/auth.js`: read `JWT_SECRET` from env, no fallback string. `backend/src/index.js`: startup check — `NODE_ENV=production` + missing secret → `process.exit(1)`. *Accept: missing secret in prod kills server*
- [ ] **1.4 passwordChanged field** — `backend/prisma/schema.prisma`: add `passwordChanged Boolean @default(false)` to `Usuario` model. Re-run `npx prisma db push`. *Accept: column exists with default false*

## Batch 2: Backend Logic

- [ ] **2.1 Password change endpoint** — `backend/src/controllers/auth.js`: add `changePassword` — verify current, hash new, set `passwordChanged: true`. `backend/src/routes/auth.js`: add `POST /change-password` (authenticated). *Accept: 200 on valid, 401 wrong current, 400 weak password*
- [ ] **2.2 Login response** — `backend/src/controllers/auth.js`: include `passwordChanged` in login + `/me` responses. *Accept: response has `user.passwordChanged`*
- [ ] **2.3 Idempotent seed** — `backend/prisma/seed.js`: add `passwordChanged: true` to default users. Ensure deleteMany→create pattern is safe (already is). `backend/package.json`: update `start` script to run `npx prisma db seed`. *Accept: `node prisma/seed.js` twice without errors*

## Batch 3: Frontend Fixes

- [ ] **3.1 VITE_API_URL** — `frontend/src/api.js`: prefer `import.meta.env.VITE_API_URL`, fallback DEV/PROD. *Accept: env var overrides base URL*
- [ ] **3.2 sync.js URL** — `frontend/src/lib/sync.js`: import `{ API_BASE }` from `@/api` instead of hardcoded localhost. *Accept: sync uses same base as api.js*
- [ ] **3.3 SyncIndicator** — `frontend/src/components/Layout.jsx`: add `<SyncIndicator />` in header (near search bar). *Accept: indicator visible in header*
- [ ] **3.4 Remove dead code** — `frontend/src/pages/Dashboard.jsx`: delete `getPacienteName()` function (lines 121-124). *Accept: function gone, no runtime error*
- [ ] **3.5 Sonner toasts** — `frontend/package.json`: add `sonner`. `frontend/src/App.jsx`: add `<Toaster />`. `frontend/src/pages/Dashboard.jsx`: replace `alert()` with `toast.error()`. *Accept: toast shown instead of alert*
- [ ] **3.6 Password change modal** — Create `frontend/src/components/PasswordChangeModal.jsx` (modal with current/new password fields, cannot dismiss). `frontend/src/context/AuthContext.jsx`: store `passwordChanged`, expose `refreshUser()`. `frontend/src/components/Layout.jsx`: render `<PasswordChangeModal />` when `user.passwordChanged === false`. *Accept: modal blocks navigation until password changed*

## Batch 4: Infrastructure & Docs

- [ ] **4.1 Railway config** — `railway.json`: remove `DATABASE_URL` placeholder, remove `NIXPACKS_NODE_VERSION`. Railway PG service auto-injects `DATABASE_URL`. *Accept: PG connection via Railway env*
- [ ] **4.2 Deploy backend** — Railway: link PG service, set `JWT_SECRET`, `VITE_API_URL`, `CORS_ORIGIN`. Run seed on Railway. *Accept: /api/health 200, login works*
- [ ] **4.3 Deploy frontend** — Railway: configure build with `VITE_API_URL`. *Accept: SPA loads, connects to backend*
- [ ] **4.4 Write README** — Root `README.md`: sections for description, tech stack, prerequisites, setup (clone→install→seed→start), env vars table, Railway deploy steps, default credentials (admin@betty.com/admin123). *Accept: developer can deploy following README*
- [ ] **4.5 End-to-end verify** — Test: login, password change flow, sync indicator, seed data (20+ patients, 80+ procedures, 50+ insumos), CORS block, rate limit. *Accept: all spec scenarios pass*

---

## Dependency Graph

```
1.1 ──→ 1.4 ──→ 2.1 ──→ 3.6
                 2.2 ──→ 3.6
                 2.3
1.2 ──→ (independent, can parallel)
1.3 ──→ 2.1, 2.2
3.1 ──→ 3.2 ──→ 3.3
3.4, 3.5 (independent, can parallel with 3.1-3.3)
4.1 ──→ 4.2 ──→ 4.3 ──→ 4.5
3.6 ──→ 4.5
4.4 (independent, can write anytime)
```
