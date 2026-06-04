# Proposal: Deploy Producción — PostgreSQL

## Intent

App is non-deployable: SQLite data lost on Railway restart, JWT secret hardcoded, no security middleware, hardcoded localhost URL, alert() UX, dead code, weak passwords, no demo data, no README. Make it client-delivery ready.

## Scope

**In**: PostgreSQL · Helmet + rate-limit + CORS · JWT_SECRET from env · sync.js→api.js URL · VITE_API_URL · Wire SyncIndicator · sonner toasts · Remove dead getPacienteName() · Password change on first login · Full demo seed · README

**Out**: CI/CD · Test suite · SSL (Railway managed) · Sentry · Horizontal scaling

## Capabilities

### New
- `postgres-migration`: Prisma provider→postgresql, DATABASE_URL from env, Railway PG
- `security-hardening`: helmet, rate-limit, CORS restriction, JWT_SECRET from env

### Modified
- `user-auth`: passwordChanged field on Usuario. POST /api/auth/change-password. Frontend forces change on first login.

## Approach

1. **DB**: Prisma `provider: "postgresql"`, `url: env("DATABASE_URL")`. Railway PG via dashboard.
2. **Security**: helmet + rate-limit middleware. CORS origin = VITE_API_URL. JWT_SECRET required.
3. **URLs**: sync.js imports API_BASE from api.js. api.js prefers VITE_API_URL env var.
4. **UI**: SyncIndicator in Layout. sonner Toaster in App.jsx. alert()→toast. Delete dead getPacienteName().
5. **Password**: Backend route. Frontend dialog when passwordChanged===false.
6. **Seed**: Idempotent — 20 patients, 80+ procedures, inventory, credits.
7. **README**: Setup, env vars, deploy, default credentials.

## Affected Areas

`backend/prisma/schema.prisma`, `backend/src/index.js`, `backend/src/middleware/auth.js`, `backend/src/controllers/auth.js`, `backend/src/routes/auth.js`, `backend/prisma/seed.js`, `railway.json`, `frontend/src/lib/sync.js`, `frontend/src/api.js`, `frontend/src/pages/Dashboard.jsx`, `frontend/src/components/Layout.jsx`, `frontend/src/App.jsx`, `frontend/package.json`, `README.md` (new)

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Data loss SQLite→PG | Med | Re-seed on fresh PG |
| Password change lockout | Med | Seed with passwordChanged: true |
| Stale VITE_API_URL | Low | Set on Railway frontend service |

## Rollback Plan

1. Revert Prisma to sqlite + `file:./dev.db`
2. Remove helmet/rate-limit
3. Revert railway.json DATABASE_URL
4. Remove Railway PG service
5. Revert sync.js/api.js, package.json deps
6. `git checkout` affected files

## Dependencies

Railway PG · npm: `helmet`, `express-rate-limit`, `sonner`

## Success Criteria

- [ ] Backend starts with Railway PG; `/api/health` 200
- [ ] Login works; first-login forces password change
- [ ] sync.js uses live URL, not localhost
- [ ] Frontend build respects VITE_API_URL
- [ ] SyncIndicator visible in header
- [ ] Dashboard uses toast, not alert()
- [ ] getPacienteName() removed
- [ ] Seed creates 20+ patients + appointments + inventory + credits
- [ ] README documents setup, env vars, deploy, credentials
