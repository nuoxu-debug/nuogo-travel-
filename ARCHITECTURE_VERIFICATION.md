# Nuogo Architecture Verification

Date: 2026-07-24

## Phase 1 Scope

This document verifies the current Nuogo architecture against the actual source code before broad refactoring. It records baseline command results, security observations, and architecture claims that were confirmed, partially confirmed, or not confirmed.

## Baseline Commands

| Command | Result | Notes |
| --- | --- | --- |
| `npm test` | Passed | Shared: 4 tests passed. Server: 67 tests passed. Client: 26 tests passed. |
| `npm run build` | Passed | Shared tests passed, server syntax check passed, client Vite build passed. Latest main JavaScript bundle: 724.56 kB (232.08 kB gzip). |
| `npm run lint` | Not run | No root `lint` script exists in `package.json`. |
| `npm run typecheck` | Not run | No root `typecheck` script exists in `package.json`. |

## Post-Change Verification Commands

| Command | Result | Notes |
| --- | --- | --- |
| `npm test` | Passed | Shared: 4 tests passed. Server: 76 tests passed. Client: 29 tests passed. |
| `npm run build` | Passed | Shared tests passed, server syntax check passed, client Vite build passed. Latest main JavaScript bundle: 724.56 kB (232.08 kB gzip). |
| `npm run lint` | Not run | No root `lint` script exists in `package.json`. |
| `npm run typecheck` | Not run | No root `typecheck` script exists in `package.json`. |
| Secret scan | Passed | No checked OpenRouter key or non-placeholder env secret pattern remained in scanned project text files. |

## Secret Scan

Tracked/project text files were scanned for common credential patterns without printing secret values.

| Status | File | Finding | Action |
| --- | --- | --- | --- |
| Confirmed | `.env.example` | Contained a real-looking OpenRouter API key before this pass. | Replaced with `replace-with-your-openrouter-api-key`. |
| Confirmed | `.gitignore` | Ignored `.env`, but not `.env.*` variants or generated browser-cache artifacts. | Added `.env.*`, kept `!.env.example`, and ignored local cache/artifact folders. |
| Confirmed after fix | Project text files | Re-scan found no checked OpenRouter key or non-placeholder env secret pattern. | No further local credential edit required. |

No secret values are recorded in this document. Any exposed key should be rotated in the OpenRouter dashboard because replacing it locally does not invalidate the old credential.

## Verified Findings

| Finding | Status | Evidence | Decision |
| --- | --- | --- | --- |
| The project is a pragmatic React, Express, shared-schema prototype. | Confirmed | Root workspaces are `client`, `server`, and `shared`; server uses Express routes and providers; client uses Vite React. | Preserve the current stack. |
| The current app has both demo and live-provider modes. | Confirmed | `server/src/config.js` supports `DEMO_MODE` and `AI_PROVIDER`; `server/src/index.js` chooses memory/MySQL and demo/OpenRouter providers. | Preserve both modes. |
| Authentication exists for protected resources. | Confirmed | `server/src/routes/trips.js` and `favorites.js` use `router.use(authenticate)`; activity mutation routes call `authenticate`; auth middleware verifies JWTs. | Keep existing controls and add only targeted tests/fixes. |
| Authorization checks trip ownership. | Mostly confirmed | Memory/MySQL repositories check `ownerId`; trip routes also check `trip.ownerId`. | Existing pattern is acceptable for FYP; add regression tests when changing protected routes. |
| Shared trip read is public. | Confirmed intentional | `GET /api/shared/:token` has no `authenticate`; voting on a shared trip requires `authenticate`. | Treat as token-based public sharing, not an auth bug. |
| Duplicate metadata routes exist. | Confirmed before fix | `createMetaRouter` was mounted at both `/api/meta` and `/api` in `server/src/app.js`. | Fixed by keeping canonical `/api/meta/*` and adding explicit deprecated compatibility handlers for legacy `/api/*` metadata routes. |
| OpenRouter has no timeout. | Confirmed before fix | `server/src/providers/openRouter.js` called `fetchImpl` without an abort signal or configured timeout. | Fixed with `OPENROUTER_TIMEOUT_MS`, `AbortController`, and typed provider errors. |
| External AI output is validated before storage. | Confirmed | `server/src/services/parser.js`, `shared/schemas.js`, and `server/src/services/grounding.js` validate and ground generated itineraries. | Keep this boundary. |
| Attraction ingestion is bounded and source-aware. | Confirmed | `server/src/ingestion/sourcePolicy.js`, `fetcher.js`, and ingestion contracts validate source policy, robots/content type, and record shape. | Keep current ingestion model. |
| MySQL trip loading has N+1-style nested reads. | Confirmed before fix | `listTrips()` called `getTrip()` per row; `getTrip()` looped variants and days with additional queries. | Fixed with batched trip graph loading and a repository regression test. |
| Demo provider mixes catalogue, route, media, and itinerary generation logic. | Confirmed | `server/src/providers/demoProvider.js` contains static data helpers, route optimization, support stops, and variant generation in one large file. | Avoid broad split in Phase 1; extract only when a tested change needs it. |
| UI page components contain workflow logic. | Partially confirmed | Planner, compare, and workspace pages call APIs and manage workflow state directly. | Accept for FYP prototype; centralize only repeated or error-prone logic. |
| Server dependency list is clean. | Incorrect before fix | `server/package.json` contained duplicate `cheerio` and `sql.js` entries. | Duplicate keys removed. |

## Authentication and Authorization Details

- Login/register/guest auth are implemented in `server/src/routes/auth.js`.
- JWT verification is centralized in `server/src/middleware/auth.js`.
- Trip listing, trip details, variant selection, trip update/delete, duplication, sharing creation, favorites, and activity mutations require authentication.
- Ownership checks are enforced in route handlers and repository methods.
- `GET /api/shared/:token` is intentionally public because the random share token is the access credential for read-only shared trips.

## Phase 1 Implementation Plan

1. Replace unsafe placeholders and harden ignore rules.
2. Document secure environment setup and credential rotation steps.
3. Add OpenRouter timeout/error tests before changing provider code.
4. Implement timeout and typed external-service errors with the smallest compatible API change.
5. Update architecture/change documentation and rerun verification commands.
