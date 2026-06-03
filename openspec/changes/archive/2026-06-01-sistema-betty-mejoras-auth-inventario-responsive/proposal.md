# Proposal: Sistema Betty — Auth + Inventario + Responsive

## Intent

Add user authentication with role-based access (admin, doctor, asistente),
an inventory module for dental supplies, and full responsive support across
all existing and new pages. Currently the app has zero auth, no inventory
management, and breaks on mobile (sidebar without Sheet, calendar too
small, tables overflow).

## Scope

### In Scope
- JWT auth: login page, protected routes, role-based sidebar menu filtering
- User model (Usuario) + Prisma schema + seed with default admin
- Auth backend: routes, controllers, JWT middleware, role middleware
- Auth frontend: AuthContext, ProtectedRoute, role-filtered Layout
- Inventario CRUD: Insumo model, REST API, Inventory page with table + dialog
- Sheet component install + mobile sidebar refactor
- Responsive: table overflow-x-auto, agenda calendar mobile alternative,
  global padding audit (p-6→p-4 sm:p-6), dialog mobile check

### Out of Scope
- User management CRUD (create/edit/delete users) — deferred
- Password reset / email verification
- Inventory stock movements or low-stock alerts
- Dark mode responsive fixes
- PWA or offline support

## Capabilities

### New Capabilities
- `user-auth`: Login/logout, JWT tokens, 3-role RBAC, protected routes
- `inventario`: CRUD for dental supplies (insumos), search, stock tracking
- `responsive-design`: Mobile sidebar (Sheet), responsive tables, mobile
  calendar, global spacing audit

### Modified Capabilities
None — no prior specs exist (`openspec/specs/` is empty).

## Approach

**Phase 1 — Auth:**
Add `Usuario` model to Prisma, run `db push`, create
`auth` routes + controller + JWT verify + role middleware on backend.
Frontend: `Login.jsx` page, `AuthContext` provider, `ProtectedRoute`
wrapper, role-filtered `navItems` in Layout. Seed default admin.

**Phase 2 — Inventario:**
Add `Insumo` model to Prisma, run `db push`,
create CRUD routes + controller following `procedimientos` pattern
(exact same structure). Frontend: `Inventario.jsx` page with shadcn
Table + Dialog for create/edit, add sidebar link.

**Phase 3 — Responsive:**
`shadcn add sheet`, refactor Layout sidebar
to use Sheet on mobile. Wrap all `<Table>` in `<div className="overflow-x-auto">`.
Replace Agenda grid calendar with a horizontal scrollable list
on small screens. Audit padding: `p-6` → `p-4 sm:p-6` across all pages.
Verify Odontograma touch works. Ensure dialogs are mobile-friendly.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` | Modified | +Usuario, +Insumo models |
| `backend/prisma/seed.js` | Modified | +default admin user |
| `backend/package.json` | Modified | +bcryptjs, +jsonwebtoken |
| `backend/src/index.js` | Modified | +auth route mount |
| `backend/src/routes/auth.js` | New | Auth routes |
| `backend/src/controllers/auth.js` | New | Auth controller |
| `backend/src/middleware/auth.js` | New | JWT verify middleware |
| `backend/src/middleware/role.js` | New | Role check middleware |
| `backend/src/routes/insumos.js` | New | Inventario routes |
| `backend/src/controllers/insumos.js` | New | Inventario controller |
| `frontend/src/api.js` | Modified | +auth, +insumos API methods |
| `frontend/src/App.jsx` | Modified | +auth routes, ProtectedRoute |
| `frontend/src/pages/Login.jsx` | New | Login page |
| `frontend/src/pages/Inventario.jsx` | New | Inventory page |
| `frontend/src/components/AuthContext.jsx` | New | Auth state provider |
| `frontend/src/components/ProtectedRoute.jsx` | New | Route guard by role |
| `frontend/src/components/Layout.jsx` | Modified | Sheet sidebar, role filter |
| `frontend/src/components/ui/sheet.jsx` | New | shadcn Sheet component |
| All page files | Modified | responsive padding + tables |
| `frontend/src/pages/Agenda.jsx` | Modified | mobile calendar alt view |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| JWT secret hardcoded in config | Low | Use env var with fallback for dev |
| Seed admin conflicts on re-seed | Low | `upsert` by email, not `create` |
| Sheet install breaks existing sidebar | Medium | Wrap old sidebar inside Sheet and test both states |
| Tables overflow on very small screens | Low | `overflow-x-auto` + min-width on cols |
| Prisma db push drops data | Med | Back up `dev.db` before schema changes |

## Rollback Plan

1. Revert `schema.prisma` — remove Usuario and Insumo models
2. `git checkout` on each new file to delete it
3. Remove added npm deps (`npm uninstall bcryptjs jsonwebtoken`)
4. Run `npx prisma db push` to revert schema (data loss on those tables)
5. Restore `dev.db` from backup if needed
6. `git checkout` on Layout.jsx, App.jsx, api.js to revert changes

## Dependencies

- Backend: `npm install bcryptjs jsonwebtoken`
- Frontend: `npx shadcn add sheet` (installs Sheet component)
- Frontend already has `lucide-react` for icons

## Success Criteria

- [ ] Login page renders at `/login`, redirects unauthenticated users
- [ ] 3 roles (admin, doctor, asistente) each see different sidebar links
- [ ] Inventario page lists, creates, edits, and deletes insumos
- [ ] Mobile sidebar opens/closes via Sheet (swipe or tap)
- [ ] All pages render without horizontal scroll on 375px viewport
- [ ] Agenda calendar displays usable cells on mobile (<640px)
- [ ] `npm run build` succeeds on frontend
- [ ] Server starts without errors on backend

## Estimated Workload

| Category | New Files | Modified Files | Est. New Lines | Est. Changed Lines |
|----------|-----------|----------------|----------------|-------------------|
| Auth (backend) | 4 | 3 | ~200 | ~30 |
| Auth (frontend) | 3 | 2 | ~250 | ~30 |
| Inventario (backend) | 2 | 2 | ~120 | ~10 |
| Inventario (frontend) | 1 | 2 | ~200 | ~15 |
| Responsive | 1 | 7+ | ~100 | ~100 |
| **Total** | **~11** | **~16** | **~870** | **~185** |

**Review workload assessment:** ~1,055 total lines across ~27 files.
Moderate review size. Recommend reviewing by phase order (auth → inventory → responsive).
