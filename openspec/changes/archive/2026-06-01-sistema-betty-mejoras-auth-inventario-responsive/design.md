# Design: Sistema Betty — Auth + Inventario + Responsive

## Technical Approach

Three additive work streams on a single codebase, executed in order (Auth → Inventario → Responsive) because Inventario's sidebar link depends on role-filtered nav and Responsive touches Layout which both Auth and Inventario modify.

**Phase 1 — Auth**: Add `Usuario` + Prisma migration, JWT middleware chain, AuthContext/ProtectedRoute on frontend. Protect all existing routes except login and health.

**Phase 2 — Inventario**: Add `Insumo` model, CRUD controller matching `procedimientos.js` pattern, frontend page with Table + Dialog.

**Phase 3 — Responsive**: Install shadcn Sheet, refactor sidebar, wrap tables, audit padding/agenda.

---

## Architecture Decisions

### Decision: JWT over Session-based Auth

| Option | Tradeoff | Decision |
|--------|----------|----------|
| express-session + SQLite store | Stateful, needs session table, scales poorly | ❌ |
| **JWT (jsonwebtoken + bcryptjs)** | Stateless, simple, 24h expiry, fits SPA pattern | ✅ |

**Rationale**: SPA with separate frontend/backend makes JWT the natural fit. No session store needed. Token in localStorage matches existing `api.js` patterns.

### Decision: Role as String Enum in Prisma

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **String field with app-level validation** | Simple, no migration complexity, easy to extend | ✅ |
| Prisma enum type | Native DB enum, but SQLite lacks enum support | ❌ |

**Rationale**: SQLite does not support native enums. A String field validated at the application layer (middleware + seed) is practical and consistent with the rest of the schema (`estado` fields in Cita, Presupuesto, Recordatorio all use String).

### Decision: Insumo as Standalone Model (No Relations)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Standalone model** | Simple CRUD, no foreign keys, matches current scope | ✅ |
| Relate to Procedimiento or Proveedor | Adds complexity for future feature, not needed now | ❌ |

**Rationale**: The spec defines Insumo as a simple standalone model. Adding relations now would require cascade deletes and complex joins for zero current benefit.

### Decision: shadcn Sheet over Manual translate-x Sidebar

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **shadcn Sheet** | Built-in animation, focus trap, keyboard dismiss, accessible | ✅ |
| Keep current translate-x approach | Works but is manual, no aria attributes, no focus management | ❌ |

**Rationale**: The existing sidebar uses `translate-x` with an overlay div. shadcn Sheet provides proper accessibility, focus trapping, and a cleaner API. The Sheet wraps the existing nav content so the navigation JSX is shared.

---

## Data Flow

### Auth Request Flow

```
Browser                         Backend
  │                                │
  │  POST /api/auth/login          │
  │  { email, password }           │
  │ ──────────────────────────────→│
  │                                │  findUnique Usuario by email
  │                                │  bcrypt.compare(password, hash)
  │                                │  jwt.sign({ id, email, rol }, SECRET, { expiresIn: '24h' })
  │←──────────────────────────────│  200 { token, user: { id, email, rol, nombre } }
  │                                │
  │  (store token in localStorage) │
  │                                │
  │  GET /api/pacientes            │
  │  Authorization: Bearer <token> │
  │ ──────────────────────────────→│
  │                                │  auth middleware: jwt.verify → req.user
  │                                │  controller: req.prisma.paciente.findMany()
  │←──────────────────────────────│  200 [...pacientes]
```

### Protected Route Flow (Frontend)

```
App (BrowserRouter)
  │
  ├── AuthContext.Provider
  │     │
  │     ├── on mount → check localStorage token
  │     │   ├── found → GET /api/auth/me → set user + loading=false
  │     │   └── not found → set user=null, loading=false
  │     │
  │     ├── login() → POST /api/auth/login → save token → set user
  │     └── logout() → remove token → set user=null → navigate /login
  │
  ├── Routes
  │     ├── /login  → Login.jsx (no Layout)
  │     └── Layout (ProtectedRoute wrapper)
  │           ├── checks AuthContext → redirect /login if !user
  │           ├── filters navItems by user.rol
  │           └── Outlet renders child route
  │                 ├── / → Dashboard
  │                 ├── /inventario → Inventario (new)
  │                 └── ...existing routes
```

### Inventario CRUD Flow

```
Inventario.jsx
  │
  ├── on mount → api.getInsumos() → set state
  │
  ├── "Nuevo Insumo" button → Dialog opens
  │   → fill form → api.createInsumo(data) → reload table
  │
  ├── Row "Edit" button → Dialog opens (pre-filled)
  │   → modify → api.updateInsumo(id, data) → reload table
  │
  └── Row "Delete" button → confirm() dialog
      → api.deleteInsumo(id) → reload table
```

### Responsive Sidebar Decision

```
Layout.jsx
  │
  ├── lg+ viewport (desktop)
  │   └── <aside className="lg:static lg:translate-x-0"> → unchanged sidebar
  │
  └── <lg viewport (mobile/tablet)
      └── <Sheet side="left">
            └── SheetContent → nav items (same JSX, filtered by rol)
                  └── on navigate → SheetTrigger.onOpenChange(false)
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` | Modify | Add `Usuario` and `Insumo` models |
| `backend/prisma/seed.js` | Modify | Add admin user seed (upsert by email) |
| `backend/package.json` | Modify | Add `bcryptjs`, `jsonwebtoken` deps |
| `backend/src/index.js` | Modify | Import + mount auth routes, apply auth middleware to all route groups |
| `backend/src/routes/auth.js` | **New** | POST /login, POST /register, GET /me |
| `backend/src/controllers/auth.js` | **New** | login, register, getMe handlers |
| `backend/src/middleware/auth.js` | **New** | JWT verify middleware (extracts token, decodes, sets req.user) |
| `backend/src/middleware/role.js` | **New** | `requireRole(...roles)` factory middleware |
| `backend/src/routes/insumos.js` | **New** | GET /, GET /:id, POST /, PUT /:id, DELETE /:id |
| `backend/src/controllers/insumos.js` | **New** | getAll, getById, create, update, remove |
| `frontend/src/api.js` | Modify | Add auth methods (+login, +getMe), add insumos CRUD methods, inject token in request() |
| `frontend/src/App.jsx` | Modify | Wrap in AuthContext.Provider, add /login route (outside Layout), add /inventario route |
| `frontend/src/pages/Login.jsx` | **New** | Login form page, centered layout, calls AuthContext.login() |
| `frontend/src/pages/Inventario.jsx` | **New** | Inventory page with Table + CRUD Dialog, stock color coding |
| `frontend/src/components/AuthContext.jsx` | **New** | React Context provider: user, loading, login, logout, isAuthenticated |
| `frontend/src/components/ProtectedRoute.jsx` | **New** | Wraps Layout routes, checks auth, redirects to /login |
| `frontend/src/components/Layout.jsx` | Modify | Add role-filtered navItems, wrap sidebar in Sheet on mobile, change `p-6` → `p-4 sm:p-6` |
| `frontend/src/components/ui/sheet.jsx` | **New** | shadcn Sheet component (installed via CLI) |
| `frontend/src/pages/Agenda.jsx` | Modify | Responsive: horizontal scroll on mobile calendar, wrap table in overflow-x-auto |
| `frontend/src/pages/PatientList.jsx` | Modify | Responsive: table already has overflow-x-auto from shadcn Table, verify only |
| `frontend/src/pages/Dashboard.jsx` | Modify | No changes needed (grid already responsive) |
| `frontend/src/pages/Procedimientos.jsx` | Modify | Verify dialog mobile, no changes expected (Card layout) |
| `frontend/src/pages/Crediticio.jsx` | Modify | Wrap table in overflow-x-auto if not already |
| `frontend/src/pages/Recordatorios.jsx` | Modify | Verify responsive, wrap table if needed |

---

## Interfaces / Contracts

### Prisma Models

```prisma
model Usuario {
  id        Int      @id @default(autoincrement())
  nombre    String
  email     String   @unique
  password  String
  rol       String   // admin | doctor | asistente
  activo    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Insumo {
  id             Int      @id @default(autoincrement())
  nombre         String
  descripcion    String?
  cantidad       Int      @default(0)
  precioUnitario Float?
  proveedor      String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

### JWT Payload

```json
{
  "id": 1,
  "email": "admin@betty.com",
  "rol": "admin",
  "iat": 1717200000,
  "exp": 1717286400
}
```

### Auth Middleware Chain

```js
// auth.js — attaches req.user or returns 401
export const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token requerido' });
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'betty-dev-secret');
    next();
  } catch { res.status(401).json({ error: 'Token inválido o expirado' }); }
};

// role.js — factory, checks req.user.rol
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.rol)) return res.status(403).json({ error: 'No tienes permisos' });
  next();
};
```

### API Contracts

| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| POST | `/api/auth/login` | Public | `{ email, password }` | `{ token, user }` |
| POST | `/api/auth/register` | Admin | `{ nombre, email, password, rol }` | `{ id, nombre, email, rol }` |
| GET | `/api/auth/me` | Any | — | `{ id, nombre, email, rol }` |
| GET | `/api/insumos` | Any auth | — | `[Insumo]` |
| GET | `/api/insumos/:id` | Any auth | — | `Insumo` |
| POST | `/api/insumos` | Admin/Doctor | `{ nombre, cantidad, precioUnitario, ... }` | `Insumo` (201) |
| PUT | `/api/insumos/:id` | Admin/Doctor | `{ ...partial }` | `Insumo` |
| DELETE | `/api/insumos/:id` | Admin | — | `{ message }` |

### Frontend AuthContext Shape

```js
const AuthContext = createContext({
  user: null,           // { id, nombre, email, rol } | null
  loading: true,        // boolean — true while checking token on mount
  login: async (email, password) => {},   // throws on error
  logout: () => {},     // clears token, redirects
  isAuthenticated: false,
});
```

### Role-to-navItems mapping

| Role | Visible Routes |
|------|---------------|
| admin | All (including /inventario, future /usuarios) |
| doctor | All except user management pages |
| asistente | `/`, `/agenda`, `/historial`, `/crediticio` only |

---

## Component Tree

```
<BrowserRouter>
  <AuthContextProvider>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          ├── <Dashboard />       → /
          ├── <Agenda />          → /agenda
          ├── <PatientList />     → /historial
          ├── <HistorialClinico />→ /historial/:id
          ├── <Crediticio />      → /crediticio
          ├── <Procedimientos />  → /procedimientos
          ├── <Inventario />      → /inventario  ← NEW
          └── <Recordatorios />   → /recordatorios
        </Route>
      </Route>
    </Routes>
  </AuthContextProvider>
</BrowserRouter>
```

---

## File-by-File Implementation Order

1. **Backend: schema + deps** — `schema.prisma` (add models), `npm install bcryptjs jsonwebtoken`
2. **Backend: auth middleware** — `middleware/auth.js`, `middleware/role.js`
3. **Backend: auth controller + routes** — `controllers/auth.js`, `routes/auth.js`
4. **Backend: index.js** — mount auth routes, protect existing route groups
5. **Backend: seed** — add admin user with upsert
6. **Backend: migrate** — `backup dev.db` → `npx prisma db push` → `node prisma/seed.js`
7. **Backend: inventario** — `controllers/insumos.js`, `routes/insumos.js`, mount in `index.js`
8. **Frontend: api.js** — add auth methods + insumos methods + token injection
9. **Frontend: AuthContext** — `components/AuthContext.jsx`
10. **Frontend: ProtectedRoute** — `components/ProtectedRoute.jsx`
11. **Frontend: Login page** — `pages/Login.jsx`
12. **Frontend: App.jsx** — wrap with AuthContext, add routes
13. **Frontend: Layout** — role-filtered navItems, Sheet sidebar, p-4 sm:p-6
14. **Frontend: Inventario page** — `pages/Inventario.jsx`
15. **Frontend: Responsive audit** — Agenda, PatientList, Crediticio, Recordatorios, Dialog verification
16. **Frontend: Verify build** — `npm run build`

---

## Migration Strategy

1. **Backup**: `copy backend\prisma\dev.db backend\prisma\dev.db.backup`
2. **Schema**: Edit `schema.prisma` → add Usuario + Insumo models
3. **Deps**: `cd backend && npm install bcryptjs jsonwebtoken`
4. **Push**: `cd backend && npx prisma db push` (adds new tables, existing data untouched)
5. **Seed**: `cd backend && node prisma/seed.js` (upserts admin, existing data preserved)
6. **Sheet**: `cd frontend && npx shadcn add sheet`
7. **Verify**: Start backend → verify login works → verify existing data intact

**Rollback**: `copy backend\prisma\dev.db.backup backend\prisma\dev.db` + `git checkout` on changed files + `npm uninstall bcryptjs jsonwebtoken`

---

## Testing Considerations

### Manual Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Login success | Open /login, enter admin@betty.com / admin123 | Redirect to /, user sees all nav items |
| 2 | Login failure | Enter wrong password | 401 error displayed, no redirect |
| 3 | Protected route | Clear localStorage, navigate to /agenda | Redirect to /login |
| 4 | Token refresh | Login, refresh page | AuthContext restores user via /api/auth/me |
| 5 | Logout | Click logout (if UI available) or call logout() | Token cleared, redirect to /login |
| 6 | Role filter (asistente) | Login as asistente | Only Agenda, Historial, Crediticio in sidebar |
| 7 | Role filter (doctor) | Login as doctor | All except Usuarios, Inventario visible |
| 8 | Inventario CRUD | Login as admin, navigate to /inventario | Create, read, update, delete all work |
| 9 | Stock coloring | Create insumo with cantidad=0, 5, 25 | Red / Yellow / Green cells |
| 10 | Mobile sidebar | Resize to 375px, tap hamburger | Sheet slides in, tap link closes it |
| 11 | Table scroll | On 375px, view PatientList table | Horizontal scroll, no page overflow |
| 12 | Agenda mobile | On 375px, view Agenda calendar | Cells visible, tappable, no break |
| 13 | Dialog mobile | On 375px, open any Dialog | Fits viewport, scrollable if tall |
| 14 | Desktop unchanged | At 1440px layout | Static sidebar, no Sheet, same as before |
| 15 | Existing data | After migration, check existing patients/citas | All data intact, all pages render |

### Backend verification
- Run backend: `cd backend && node src/index.js` → no errors
- Test login via curl/Postman: `POST /api/auth/login`
- Test protected route without token: `GET /api/pacientes` → 401
- Test protected route with invalid token → 401

### Frontend verification
- Run frontend: `cd frontend && npm run build` → no errors
- Dev server: `cd frontend && npm run dev` → opens without console errors

---

## Open Questions

- [ ] JWT secret: use env var `JWT_SECRET` with fallback `'betty-dev-secret'` for dev — confirm production env setup
- [ ] Register endpoint: implement now (admin-only) or defer to user management phase? Spec says implement now.
