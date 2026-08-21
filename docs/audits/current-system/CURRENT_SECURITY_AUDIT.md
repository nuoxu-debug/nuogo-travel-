# Nuogo Current Security Audit

Audit date: 2026-08-07  
Scope: authentication, authorization, API, persistence, secrets, external retrieval and LLM boundaries

## Overall security verdict

Nuogo contains meaningful prototype controls: bcrypt cost 12, strict Zod input schemas, server-side AI keys, Helmet, CORS, JSON size limits, rate limiting, parameterized SQL, hashed invitation tokens, invitation expiry, role-aware object authorization, optimistic revisions and transaction-scoped role revalidation. Collaboration authorization is the strongest part of the system.

It is not safe to expose with default configuration. Demo mode fails open with a known JWT secret and a shared guest account, public shares are permanent bearer links, favorite creation has an object-level authorization gap, and unexpected server errors are returned verbatim.

## Severity-rated findings

### HIGH-1: default configuration can be deployed with known JWT secret

`DEMO_MODE` defaults to true and `JWT_SECRET` falls back to `nuogo-demo-secret-change-in-live-mode` (`server/src/config.js:5,30`). The strong-secret check runs only when demo mode is false. If the default server is exposed beyond localhost, anyone who knows the repository can forge JWTs.

Recommendation for later: require an explicit environment designation, bind demo mode to localhost, generate an ephemeral secret, and refuse public interfaces with demo defaults.

### HIGH-2: all guest users share one identity

`POST /api/auth/guest` is unauthenticated in demo mode and `AuthService.guest()` always returns `guest@nuogo.local` (`server/src/routes/auth.js:22`, `server/src/services/authService.js:47`). Different visitors therefore share the same trips, favorites and collaboration identity.

Recommendation for later: create isolated expiring guest principals or use a read-only seeded demo.

### HIGH-3: SQLite catalogue has cross-process lost-update risk

`AttractionSqliteRepository` loads the entire file into SQL.js memory and exports/rewrites the whole file after mutations. The running server and ingestion/review CLIs can open separate copies and overwrite one another. There is no file lock or single writer.

Recommendation for later: use a real transactional database/shared connection service or enforce one writer process.

### HIGH-4: predictable seeded login if demo seed reaches a live database

`database/seeds/001_demo.sql` documents a usable demo password and inserts its bcrypt hash. This is acceptable only for isolated demo data and must never be applied to production.

### MEDIUM-1: favorite creation misses trip authorization

`POST /api/favorites` accepts an activity ID. Both repositories locate the activity globally without checking that the requester owns/is a member of its trip. A known or guessed ID can return a snapshot of a private activity. This is an object-level authorization/IDOR defect.

### MEDIUM-2: public share links never expire or revoke

`trip_shares` stores plaintext tokens with no expiry or revoked state. The API offers create/read/vote but no list/revoke route. Possession exposes the hydrated trip until trip deletion.

### MEDIUM-3: long-lived non-revocable JWT in localStorage

Access JWTs last seven days, have no refresh/revocation/session record, and are stored in `localStorage` (`authService.js:16`, `authToken.js:8`). Logout is browser-side deletion only. Any successful XSS can steal the bearer token.

### MEDIUM-4: internal exception messages reach clients

The global error handler returns `error.message` for unexpected exceptions (`server/src/app.js:100-110`). MySQL constraint text, filesystem paths and upstream details may leak.

### MEDIUM-5: dependency advisories

On 2026-08-07, `npm audit` reported 1 critical, 1 high and 7 moderate package entries. Production-only audit reported 3 moderate entries involving React Router and Undici. The critical/high entries affect development tooling, but a separate upgrade task is required.

### MEDIUM-6: public share returns an overly rich trip object

`getShare` returns the hydrated trip model rather than a purpose-built public DTO. Even if current fields are mostly itinerary data, future private fields could be exposed automatically.

### LOW-1: authentication abuse controls are coarse

Only a global 240 requests/minute limiter exists. Login and registration have no endpoint-specific throttle, delay, lockout or challenge. Registration explicitly reveals whether an email exists.

### LOW-2: JWT claims are minimal

Verification checks signature/expiry but no issuer, audience, token ID or session version. This limits revocation and environment separation.

### LOW-3: AMap failure is silently swallowed

`AmapRouteMap.jsx:49` catches and ignores SDK failures. This is primarily reliability/observability risk, but silent external failures complicate incident detection.

## Authentication controls

| Control | Status | Assessment |
|---|---|---|
| Registration validation | Implemented | normalized email, name 2-80, password 8-72 |
| Password hashing | Implemented | bcryptjs cost 12 |
| Generic login failure | Implemented | avoids direct account confirmation on login |
| Access JWT expiry | Implemented | 7 days |
| Refresh token | Not implemented | session cannot rotate safely |
| Server logout/revocation | Not implemented | stolen token remains valid |
| Browser storage | localStorage | XSS-readable |
| Live secret validation | Implemented only when `DEMO_MODE=false` | default mode remains unsafe if exposed |
| Guest isolation | Not implemented | one global guest identity |

## Authorization controls

Trip operations use owner/editor/viewer roles and `getTripAccess`/`requireTripRole`. Read requires active viewer membership; mutation requires editor; deletion/duplication require owner. Critical collaborative writes re-check role and revision within MySQL transactions or memory locks. Tests cover cross-user access and in-flight demotion/removal.

Exceptions/gaps:

- favorite creation does not check activity-trip membership;
- public share is bearer-token authorization with no lifetime management;
- there is no administrator role or administrative API;
- share permission `edit` does not grant anonymous editing; it currently gates authenticated voting, so the name is misleading.

## API controls

| Area | Current state |
|---|---|
| Input validation | Strong on shared schemas and collaboration/expense inputs; several routes use ad hoc body selection |
| Sanitization | React escapes text; Leaflet popup uses DOM `textContent`; no HTML rendering found |
| Rate limiting | Global only |
| CORS | One configured exact origin |
| Security headers | Helmet enabled; cross-origin resource policy disabled for media behavior |
| Body size | 100 kB JSON limit |
| CSRF | Bearer header reduces classic cookie CSRF risk |
| Error convention | consistent JSON envelope, but 500 messages leak |
| Request logging | no structured logger/request IDs/audit for general API |

## Database controls

- MySQL statements use parameter placeholders. Dynamic `IN` lists are generated from array length, not raw values.
- Collaboration and expense writes use transactions and rollback.
- Foreign keys and unique keys cover most core relationships.
- The database user privileges are not documented or enforced by code: UNKNOWN.
- MySQL TLS configuration is absent: deployment-dependent/UNKNOWN.
- There is no automated backup, restore or migration history.
- Public share tokens are plaintext; invitation tokens are correctly stored as SHA-256 hashes.
- The local attraction database and cached media are ignored by Git, but filesystem permissions are unmanaged.

## External retrieval and media security

Strong controls in attraction ingestion/media include:

- exact HTTPS host/path allowlist for source HTML;
- robots.txt check and a 2.5-second default delay;
- redirect revalidation for images;
- Mafengwo image-host allowlist;
- three-redirect maximum;
- 10-second image timeout;
- 8 MiB bounded streaming body;
- JPEG/PNG/WebP content-type allowlist;
- path traversal prevention and exclusive file creation.

Weaknesses:

- HTML fetch has no timeout or maximum response size;
- synchronous cache file reads/writes can block the process;
- legal/licensing suitability of scraping and image caching is UNKNOWN and was not established by code;
- background image hydration errors are intentionally swallowed.

## LLM security

| Risk | Status |
|---|---|
| Frontend exposes OpenRouter key | Not found |
| Secrets sent in prompt | Not found |
| Prompt/response logging | Not found |
| Prompt injection | Partially mitigated by strict preferences and separated messages; catalogue text remains untrusted model input |
| Unsafe tool agency | Not present; model has no tools/database access |
| Output structure | Zod-validated after parse |
| Output factual safety | Weak; only partial Huangshan grounding |
| Retry abuse/cost | Weak; up to nine unclassified calls per generation |

## Secret inspection

Tracked files were scanned for common API key/private key/credential patterns. `.env.example` contains placeholders only; no active OpenRouter, AMap, JWT or MySQL credential was identified. The demo seed credential is intentionally public and must be treated as demo-only. `.env`, local databases, media cache and logs are ignored.

## Positive controls worth keeping

- Server-only OpenRouter integration.
- Bcrypt cost 12 and normalized email handling.
- Strict live-mode JWT secret requirement.
- Hashed 256-bit invitation tokens with expiry.
- Layered collaboration authorization and commit-time role checks.
- Integer-fen expense arithmetic and transaction rollback.
- Parameterized SQL.
- Media SSRF/path/size/type/redirect controls.
- Client clearing of private cached state on logout and 401.

## Priority disposition

| Component | Decision | Priority |
|---|---|---|
| Demo defaults/shared guest | Replace before any public deployment | Critical path |
| Favorite authorization | Fix | High |
| SQLite cross-process writer model | Replace | High |
| Public share lifecycle/DTO | Refactor | High |
| JWT/session storage | Refactor | Medium-high |
| Error redaction/logging | Refactor | Medium |
| Dependency advisories | Upgrade in separate task | Medium-high |
| Collaboration authorization | Keep | N/A |
| Media safety controls | Keep | N/A |
