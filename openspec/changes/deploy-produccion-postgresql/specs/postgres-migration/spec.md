# Postgres Migration Specification

## Purpose

Switch the Prisma ORM datasource from SQLite (`file:./dev.db`) to PostgreSQL, enabling persistent storage across Railway restarts and production-grade concurrency.

## Requirements

### Requirement: Prisma Datasource Configuration

The Prisma schema datasource block MUST set `provider: "postgresql"` and `url: env("DATABASE_URL")`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Fresh deploy | DATABASE_URL env points to Railway PG | Prisma validates schema | No errors, tables created |
| Missing DATABASE_URL | No DATABASE_URL in env | Server starts | Prisma connection error, process exits |

### Requirement: Schema PostgreSQL Compatibility

All models SHALL use only PostgreSQL-compatible types. No SQLite-specific types or features SHALL be used.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Schema push | PostgreSQL database | `npx prisma db push` | All tables created with correct types |
| Idempotent push | Tables already exist | Push runs again | No data loss, schema matches |

### Requirement: Development Coexistence

The system MAY continue using SQLite in local development when no DATABASE_URL is set.

#### Scenario: Dev Fallback

- GIVEN no DATABASE_URL in `.env`
- WHEN backend starts
- THEN Prisma falls back to SQLite (`file:./dev.db`) (requires local `.env` override)

### Requirement: Railway Configuration

`railway.json` SHALL set `DATABASE_URL` only as a placeholder, relying on Railway's PostgreSQL service to inject the actual connection string.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Railway deploy | Railway PG service linked | App starts | DATABASE_URL from Railway env is used |
| Local override | `.env` has SQLite DATABASE_URL | Dev server runs | SQLite is used, PG not required |

### Requirement: Init Script Compatibility

The `init-railway.js` script SHALL use `prisma.$queryRawUnsafe` or standard Prisma queries compatible with PostgreSQL.

#### Scenario: Init on PG

- GIVEN fresh Railway PostgreSQL
- WHEN `init-railway.js` runs
- THEN default users, categories, config are created via upsert
