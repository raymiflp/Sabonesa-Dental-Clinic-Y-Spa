# Tasks: Sistema Betty — Auth + Inventario + Responsive

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~930 (range 850–1050) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Auth Foundation → PR 2: Inventario → PR 3: Responsive |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Auth Foundation — Usuario model, JWT middleware, login/register/me, AuthContext, ProtectedRoute, Login page, role-filtered nav | PR 1 → main | Backend auth infra + frontend auth shell. Base: `main`. |
| 2 | Inventario — Insumo model, CRUD backend, Inventario page with Table + Dialog, sidebar link | PR 2 → main | Depends on PR 1 (needs role-filtered nav + auth middleware). Base: `main`. |
| 3 | Responsive — Sheet sidebar, table overflow-x-auto, Agenda mobile, global p-4 sm:p-6, dialog/odontograma verification | PR 3 → main | Depends on PR 1 & 2 (touches Layout which both modify). Base: `main`. |

---

## Phase 1: Auth Foundation

- [ ] 1.1 **Backup DB** — Copy `backend/prisma/dev.db` to `dev.db.backup`
- [ ] 1.2 **Schema: Usuario model** — Add `model Usuario` to `backend/prisma/schema.prisma` (id, nombre, email, password, rol, activo, timestamps)
- [ ] 1.3 **Install deps** — `cd backend && npm install bcryptjs jsonwebtoken`
- [ ] 1.4 **Push schema** — `cd backend && npx prisma db push` (creates Usuario table)
- [ ] 1.5 **Seed admin** — Modify `backend/prisma/seed.js` to upsert admin@betty.com / admin123
- [ ] 1.6 **Run seed** — `cd backend && node prisma/seed.js`
- [ ] 1.7 **Auth middleware** — Create `backend/src/middleware/auth.js` (JWT verify, `req.user`)
- [ ] 1.8 **Role middleware** — Create `backend/src/middleware/roles.js` (`requireRole` factory)
- [ ] 1.9 **Auth controller** — Create `backend/src/controllers/auth.js` (login, register, getMe)
- [ ] 1.10 **Auth routes** — Create `backend/src/routes/auth.js` (POST /login, POST /register, GET /me)
- [ ] 1.11 **Mount auth + protect routes** — Modify `backend/src/index.js` (mount /api/auth, protect all other route groups)
- [ ] 1.12 **api.js: auth + token injection** — Add login/getMe methods to `frontend/src/api.js`; inject `Authorization` header in `request()`
- [ ] 1.13 **AuthContext** — Create `frontend/src/context/AuthContext.jsx` (user, loading, login, logout, isAuthenticated)
- [ ] 1.14 **ProtectedRoute** — Create `frontend/src/components/ProtectedRoute.jsx` (redirect to /login if unauthenticated)
- [ ] 1.15 **Login page** — Create `frontend/src/pages/Login.jsx` (centered form, error display, redirect on success)
- [ ] 1.16 **App.jsx: auth wiring** — Wrap `<Routes>` in `<AuthContext.Provider>`, add `/login` (outside ProtectedRoute), `/` inside ProtectedRoute
- [ ] 1.17 **Layout: role-filtered nav** — Add `navItems` filtered by `user.rol`; admin: all, doctor: all except Usuarios, asistente: Agenda/Historial/Crediticio only

## Phase 2: Inventario

- [x] 2.1 **Schema: Insumo model** — Add `model Insumo` to `backend/prisma/schema.prisma` (id, nombre, descripcion?, cantidad, precioUnitario?, proveedor?, timestamps)
- [x] 2.2 **Push schema** — `cd backend && npx prisma db push` (creates Insumo table)
- [x] 2.3 **Insumos controller** — Create `backend/src/controllers/insumos.js` (getAll, getById, create, update, remove)
- [x] 2.4 **Insumos routes** — Create `backend/src/routes/insumos.js` (GET /, GET /:id, POST /, PUT /:id, DELETE /:id)
- [x] 2.5 **Mount insumos routes** — Modify `backend/src/index.js` (mount /api/insumos with auth + role middleware)
- [x] 2.6 **api.js: insumo methods** — Add getInsumos, getInsumo, createInsumo, updateInsumo, deleteInsumo to `frontend/src/api.js`
- [x] 2.7 **Inventario page** — Create `frontend/src/pages/Inventario.jsx` (Table + CRUD Dialog + stock color coding)
- [x] 2.8 **App.jsx: inventario route** — Add `/inventario` route inside Layout in `frontend/src/App.jsx`
- [x] 2.9 **Layout: sidebar link** — Add Inventario link (Package icon) to `frontend/src/components/Layout.jsx`, visible to admin + doctor

## Phase 3: Responsive

- [x] 3.1 **Install shadcn Sheet** — Created `frontend/src/components/ui/sheet.jsx` wrapping @base-ui/react Drawer (manual creation, shadcn failed)
- [x] 3.2 **Layout: mobile Sheet sidebar** — Replaced manual `translate-x` sidebar with `<Sheet side="left">`; kept static sidebar on `lg+`; extracted shared `SidebarContent` component
- [x] 3.3 **Layout: global padding** — Changed `<main className="p-6"` to `<main className="p-4 sm:p-6"` + header `px-4 sm:px-6`
- [x] 3.4 **Table pages: overflow-x-auto** — Verified: Table component already has `overflow-x-auto` built into wrapper div
- [x] 3.5 **Agenda responsive** — Calendar cells: `gap-1`→`gap-0.5 md:gap-1`, `text-sm`→`text-xs md:text-sm`, added `min-h-[32px] min-w-[32px]` for touch targets
- [x] 3.6 **Dialog mobile audit** — Added `max-h-[85vh] overflow-y-auto` to base DialogContent; prior custom overrides (90vh) preserved
- [x] 3.7 **Odontograma touch** — Verified: already has `touch-none`, `onTouchStart/Move/End` handlers, `w-full h-auto` responsive sizing
- [x] 3.8 **PagoRapido FAB mobile** — Verified: `fixed bottom-6 right-6 w-14 h-14` is properly visible; no overlap issues
- [x] 3.9 **Verify build** — `cd frontend && npm run build` — zero errors
- [x] 3.10 **Crediticio responsive** — Applied same calendar responsive fixes as Agenda (gap, text size, touch targets)

---

## Verification per Spec

- **Auth spec** (15 scenarios): manual tests via curl + browser — login success/failure, protected routes, role checks, seed idempotency, AuthContext refresh, logout, sidebar filtering
- **Inventario spec** (7 scenarios): manual tests via browser — CRUD operations, stock colors, sidebar link visibility, route registration
- **Responsive spec** (10 scenarios): manual tests via DevTools viewports (360px, 768px, 1024px, 1440px) — Sheet sidebar, table scroll, dialog fit, Agenda cells, padding, Odontograma touch, FAB visibility
