# Delta for User Authentication

## ADDED Requirements

### Requirement: Password Change Endpoint — POST /api/auth/change-password

The system MUST accept `currentPassword` and `newPassword` in the request body. It SHALL verify the current password matches the stored hash. `newPassword` MUST be at least 6 characters. On success, the password SHALL be re-hashed and stored, and `passwordChanged` SHALL be set to `true`. This endpoint SHALL require authentication (Bearer token).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Valid change | Authenticated user with correct currentPassword | POST /api/auth/change-password with valid newPassword | 200 OK, `passwordChanged: true` |
| Wrong current | Authenticated user with wrong currentPassword | Same request | 401 "Contraseña actual incorrecta" |
| Weak password | Authenticated user | POST with newPassword < 6 chars | 400 "La contraseña debe tener al menos 6 caracteres" |
| Unauthenticated | No token | POST without Authorization header | 401 Unauthorized |

### Requirement: Frontend — Force Password Change on First Login

The system MUST show a modal dialog when login response has `passwordChanged: false`. The user SHALL NOT be able to dismiss or navigate away until the password is changed or they log out.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| First login | User with passwordChanged=false | Login succeeds | Modal appears, dashboard not shown |
| Password changed | User submits valid current+new password | Change password form submitted | Modal closes, dashboard shown, token refreshed |
| Cancel not allowed | Modal is open | User clicks outside or tries to navigate | Modal stays open |

#### Edge Case: Logout from modal

- GIVEN user is on the password change modal
- WHEN user clicks "Cerrar sesión"
- THEN token is cleared, user is redirected to /login

### Requirement: Login Response Includes passwordChanged

The `POST /api/auth/login` response MUST include `user.passwordChanged` (boolean) in the user object returned alongside the token.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| First login | User created without passwordChanged set | Login succeeds | Response includes `passwordChanged: false` |
| After change | User has set password | Login succeeds | Response includes `passwordChanged: true` |

## MODIFIED Requirements

### Requirement: Usuario Model

The system MUST define a `Usuario` model in Prisma schema with these fields: `id` (autoincrement Int), `nombre` (String), `email` (String, unique), `password` (String, hashed), `rol` (String, enum: admin|doctor|asistente), `activo` (Boolean, default true), `passwordChanged` (Boolean, default false), `createdAt` (DateTime), `updatedAt` (DateTime).

(Previously: Usuario model without `passwordChanged` field)

#### Scenario: Schema Applied

- GIVEN Prisma schema with Usuario model
- WHEN `npx prisma db push` executes
- THEN the `Usuario` table is created with all fields and constraints

#### Scenario: New Field Exists

- GIVEN a fresh PostgreSQL database
- WHEN schema is applied
- THEN the `passwordChanged` column exists with default value `false`

### Requirement: Seed Admin User

The seed script MUST run without errors on consecutive executions. Default seed users SHALL have `passwordChanged: true` to avoid blocking on first login.

(Previously: Seed users without `passwordChanged` field.)

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Idempotent seed | Admin user exists | Seed runs | Upsert by email, no duplicate |
| Default credentials | Fresh database | Seed runs | admin@betty.com / admin123 with passwordChanged: true |
