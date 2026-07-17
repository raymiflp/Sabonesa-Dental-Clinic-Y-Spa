# Proposal: E2E Testing with Playwright

## Intent

Zero E2E coverage across 8 critical user flows. Manual testing is slow, non-repeatable, and blocks confident refactoring. Playwright E2E tests will catch regressions, document critical paths, and enable safe iteration.

## Scope

### In Scope
- Playwright config, global setup, shared helpers
- E2E specs for all 8 flows: auth, patients, agenda, crediticio, procedimientos, inventario, configuracion, roles
- E2E-specific seed data (SQLite)
- GitHub Actions CI workflow
- Test scripts in root package.json
- Rate limiting disabled in test env

### Out of Scope
- Unit/integration tests
- Performance or load tests
- Visual regression (screenshot diff) tests
- Component-level tests

## Capabilities

### New Capabilities
- `e2e-testing`: E2E test infrastructure, specs, seed data, and CI pipeline covering all critical user flows

### Modified Capabilities
None

## Approach

Single PR. Playwright in JavaScript (project convention). SQLite test DB (matches dev). Specs under `e2e/specs/`. Shared helpers for password confirmations, shadcn portal selects, date freezing, and auth StorageState. Sequential execution (`fullyParallel: false`) — tests share DB state. StorageState avoids re-login between specs. Playwright clock freezing for date-sensitive flows.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `e2e/` | New | Playwright config, global setup, helpers, all specs |
| `backend/prisma/seed-e2e.js` | New | E2E-specific seed data |
| `.github/workflows/e2e.yml` | New | CI workflow |
| `package.json` | Modified | Add test:e2e scripts |
| `backend/src/middleware/rateLimiter.js` | Modified | Disable when E2E env detected |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Offline IndexedDB layer interferes with E2E | Medium | Mock or disable in test env |
| shadcn portal selects break standard interaction | High | Custom helper for Radix trigger/option pattern |
| Date-sensitive tests flaky from clock drift | Medium | Playwright `clock.freezeFixed()` |
| Rate limiting blocks test requests | Medium | Disable via env variable check |
| Password dialogs on delete operations | Medium | Shared confirm helper abstraction |

## Rollback Plan

Single revert. All changes additive (new files) except `package.json` scripts and rate limiter toggle — both trivially revertible.

## Dependencies

- Playwright (new devDependency, `npm install -D @playwright/test`)
- Node 22 (already satisfied, see `.nvmrc`)

## Success Criteria

- [ ] All 8 flows have ≥1 happy-path E2E spec passing locally
- [ ] CI runs E2E suite on every PR to main
- [ ] `npm run test:e2e` passes with zero flaky tests
- [ ] Rate limiting and IndexedDB don't block execution
