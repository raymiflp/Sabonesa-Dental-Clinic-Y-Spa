# Security Hardening Specification

## Purpose

Add production-grade security middleware (helmet, rate-limit, restricted CORS) and enforce JWT_SECRET from environment for the Express backend.

## Requirements

### Requirement: Helmet Middleware

The Express app MUST apply `helmet()` to set secure HTTP headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Headers set | Any HTTP response | Response is served | Security headers present (X-Frame-Options, X-Content-Type-Options, etc.) |

### Requirement: Rate Limiting

The Express app MUST apply `express-rate-limit` middleware. The global rate limit SHALL be at most 100 requests per 15 minutes per IP. Auth endpoints MAY have a stricter limit (e.g., 20 req/15min).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Normal usage | Client under limit | Requests within window | All succeed (200) |
| Rate exceeded | Client exceeds 100 req/15min | Additional request | 429 Too Many Requests |

#### Edge Case: Auth brute force

- GIVEN an attacker sending rapid POST /api/auth/login requests
- WHEN auth rate limit is exceeded (e.g., 20 req/15min)
- THEN 429 is returned for auth endpoint only

### Requirement: CORS Restriction

CORS SHALL restrict `origin` to the frontend's production URL. The origin SHALL be read from `process.env.VITE_API_URL` (or a separate `CORS_ORIGIN` env var).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Allowed origin | Request from VITE_API_URL origin | Preflight OPTIONS | 200, Access-Control-Allow-Origin matches |
| Blocked origin | Request from unknown origin | Fetch request | CORS error in browser, request blocked |
| No origin header | curl/Postman without Origin | GET /api/health | Succeeds (non-browser request) |

### Requirement: JWT_SECRET Enforcement

The JWT secret MUST be read from `process.env.JWT_SECRET`. In production, the app MUST fail to start (or log a critical warning) if JWT_SECRET is not set.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Secret set | JWT_SECRET in environment | Server starts | Tokens signed/verified with provided secret |
| Secret missing in production | No JWT_SECRET, NODE_ENV=production | Server starts | Critical error logged or process exits |

#### Edge Case: Dev fallback

- GIVEN no JWT_SECRET and NODE_ENV is NOT production
- WHEN server starts
- THEN a warning is logged but the server starts using a dev fallback secret (existing behavior)
