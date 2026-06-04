# Frontend Polish Specification

## Purpose

Fix hardcoded localhost URLs, wire the existing SyncIndicator component, replace `alert()` with sonner toasts, respect `VITE_API_URL` environment variable, and remove dead code from Dashboard.

## Requirements

### Requirement: Dynamic API URL in sync.js

The `sync.js` module MUST import the API base URL from `api.js` instead of hardcoding `'http://localhost:3001/api'`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Production URL | VITE_API_URL set in environment | sync.js processes queue | Requests go to the configured URL |
| Dev URL | No VITE_API_URL, local dev | sync.js processes queue | Requests use the dev API host |

#### Scenario: Remove Hardcoded URL

- GIVEN `sync.js` line 4 hardcodes `const API = 'http://localhost:3001/api'`
- WHEN the source is read
- THEN the constant is imported from `api.js` as `API_BASE`

### Requirement: VITE_API_URL Environment Variable

The `api.js` module MUST prefer `import.meta.env.VITE_API_URL` over the hardcoded `DEV_API`/`PROD_API` constants.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| VITE_API_URL set | VITE_API_URL=https://api.example.com | api.js resolves base URL | API_BASE = https://api.example.com |
| No VITE_API_URL | VITE_API_URL undefined | api.js resolves base URL | Falls back to DEV_API or PROD_API logic |
| Frontend build | VITE_API_URL set during build | `npm run build` | Built SPA uses the configured API URL |

### Requirement: SyncIndicator in Layout

The Layout component MUST render the `<SyncIndicator />` component in the header area.

#### Scenario: SyncIndicator Visible

- GIVEN user is authenticated on any page
- WHEN the Layout header renders
- THEN SyncIndicator appears near the header right side

#### Scenario: SyncIndicator States

- GIVEN the app is online and no pending syncs
- WHEN SyncIndicator renders
- THEN green "Conectado" icon is shown

- GIVEN the sync manager is processing the write queue
- WHEN SyncIndicator renders
- THEN yellow spinning icon with "Sincronizando" text is shown

### Requirement: Sonner Toaster

The App.jsx root MUST include the `<Toaster />` component from `sonner`.

#### Scenario: Toaster Rendered

- GIVEN the app is rendered
- WHEN inspecting the DOM
- THEN a sonner toaster container exists

### Requirement: Replace alert() with Toast

The Dashboard.jsx `handleCobroSubmit` error handler MUST use `toast.error()` from `sonner` instead of `alert()`.

#### Scenario: Cobro Error Shows Toast

- GIVEN a user submits a cobro form
- WHEN the API call fails
- THEN a sonner toast with the error message appears instead of a browser alert dialog

### Requirement: Remove Dead Code

The `getPacienteName()` function in `Dashboard.jsx` (lines 121-124) MUST be removed.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Dead code gone | Dashboard.jsx source | File is inspected | No `getPacienteName` function exists |
| No runtime error | Dashboard component mounts | Component renders | No reference to undefined function |
