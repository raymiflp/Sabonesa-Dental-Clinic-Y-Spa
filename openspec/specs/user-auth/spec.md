# User Authentication Specification

## Purpose

JWT-based authentication with 3 roles (admin, doctor, asistente) protecting all existing and new API routes. Provides login, token verification, role-based access control, and matching frontend components.

## Requirements

### Requirement: Usuario Model

The system MUST define a `Usuario` model in Prisma schema with these fields: `id` (autoincrement Int), `nombre` (String), `email` (String, unique), `password` (String, hashed), `rol` (String, enum: admin|doctor|asistente), `activo` (Boolean, default true), `createdAt` (DateTime), `updatedAt` (DateTime).

#### Scenario: Schema Applied

- GIVEN Prisma schema with Usuario model
- WHEN `npx prisma db push` executes
- THEN the `Usuario` table is created with all fields and constraints

### Requirement: POST /api/auth/login

The system MUST accept email/password, verify with bcrypt, and return a JWT token (24h expiry) and user data. Inactive accounts MUST be rejected.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Valid login | admin@betty.com / admin123 | POST with credentials | 200 + JWT token + user data |
| Wrong password | Registered user | POST with wrong password | 401 "Credenciales inválidas" |
| Inactive user | activo=false user | POST with correct credentials | 403 "Usuario desactivado" |

### Requirement: POST /api/auth/register (Admin Only)

The system MUST accept nombre, email, password, rol. Only admin users MAY create new users. Passwords MUST be hashed before storage.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Admin creates | Admin authenticated | POST with valid data | 201 + user (no password) |
| Non-admin rejected | Doctor/asistente | POST with same data | 403 Forbidden |
| Duplicate email | Existing email | POST with same email | 409 "El email ya está registrado" |

### Requirement: GET /api/auth/me

The system MUST return current user data from the valid JWT token.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Valid token | Valid JWT in Authorization header | GET /api/auth/me | 200 + user data |
| Invalid token | Expired/malformed JWT | GET /api/auth/me | 401 Unauthorized |

### Requirement: Auth Middleware

The system MUST provide Express middleware that extracts Bearer token from Authorization header, verifies JWT, and attaches decoded user to `req.user`.

#### Scenario: Missing Header

- GIVEN no Authorization header
- WHEN accessing any protected route
- THEN 401 response is returned

### Requirement: Role Middleware

The system MUST accept an array of allowed roles and reject requests where `req.user.rol` is not in the list. MUST wrap auth middleware.

#### Scenario: Role Check

- GIVEN a doctor user calling an admin-only endpoint
- WHEN role middleware with `['admin']` executes
- THEN 403 response is returned

### Requirement: Seed Admin User

The seed script MUST run without errors on consecutive executions.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Idempotent seed | Admin user exists | Seed runs | Upsert by email, no duplicate |
| Default credentials | Fresh database | Seed runs | admin@betty.com / admin123 (hashed) |

### Requirement: Frontend Login Page

The system MUST provide `/login` page with email/password form centered on a clean layout, error display, and redirect to `/` on success.

#### Scenario: Login Flow

- GIVEN unauthenticated user at /login
- WHEN valid credentials are submitted
- THEN token is stored in localStorage and user is redirected to /

### Requirement: AuthContext

The system MUST provide a React Context with `user`, `loading`, `login()`, `logout()` values. On mount, reads token from localStorage and calls GET /api/auth/me.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Page refresh | Token in localStorage | Page reloads | AuthContext restores user via /api/auth/me |
| Logout | Authenticated user | logout() called | Token removed, user cleared, redirect to /login |

### Requirement: ProtectedRoute

The system MUST wrap `<Route>` elements to redirect to `/login` if no token present. MAY accept a `requiredRole` prop.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| No token | No localStorage token | Navigate to /agenda | Redirect to /login |
| Role mismatch | Asistente visits admin page | Navigate to protected route | Redirect to / (or 403 display) |

### Requirement: Role-Filtered Sidebar

The Layout MUST filter `navItems` by `user.rol`. Admin sees all items. Doctor sees all except Usuarios. Asistente sees only Agenda, Historial Clínico, Crediticio. The Inventario link MUST be visible to admin and doctor.

#### Scenario: Asistente View

- GIVEN authenticated asistente user
- WHEN sidebar renders
- THEN only Agenda, Historial Clínico, and Crediticio links appear

### Requirement: API Authorization Injection

The `api.js` client MUST read token from localStorage and set `Authorization: Bearer <token>` header on every request.

#### Scenario: Token Attached

- GIVEN a token in localStorage
- WHEN any api.js method is called
- THEN the request includes the Authorization header

### Requirement: Protect Existing Backend Routes

All existing route groups (pacientes, agenda, crediticio, procedimientos, presupuestos, recordatorios, configuracion, odontograma, historial-clinico) MUST use auth middleware. Auth routes (`/api/auth/*`) and `/api/health` SHOULD remain public.

#### Scenario: Blocked Unauthenticated Request

- GIVEN no valid token
- WHEN GET /api/pacientes is called
- THEN 401 is returned

#### Scenario: Public Endpoints Bypass

- GIVEN no token
- WHEN POST /api/auth/login or GET /api/health is called
- THEN the request succeeds (200)
