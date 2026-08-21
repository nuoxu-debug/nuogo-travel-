# Nuogo Current Technology Stack - Verified

Audit date: 2026-08-07  
Code baseline: `main` at merge commit `c0155fc`

## Scope and evidence

This inventory is based on `package.json`, `package-lock.json`, imports in application source, build configuration, and `npm ls --all --depth=0`. Installed versions below are the resolved local versions, not only the semver ranges declared in manifests.

## Runtime and workspace

| Category | Technology | Exact installed version | Where used | Required? | Assessment |
|---|---|---:|---|---|---|
| Runtime | Node.js | 20.15.1 | Express server, CLIs, Vite and tests | Yes | Keep; project declares Node 20+ |
| Package manager | npm | 10.7.0 | npm workspaces and lockfile v3 | Yes | Keep |
| Language | JavaScript ESM | ECMAScript on Node 20 / browser | All source | Yes | Keep with stronger static checks; no TypeScript exists |
| Workspace | npm workspaces | npm 10.7.0 | root, `client`, `server`, `shared` | Yes | Keep |
| Version control | Git | 2.55.0.windows.3 | repository | Yes | Keep; no remote or CI was configured during audit |

## Frontend

| Technology | Version | Actual use | Required? | Decision |
|---|---:|---|---|---|
| React | 18.3.1 | UI and context state | Yes | Keep |
| React DOM | 18.3.1 | Browser root and portals | Yes | Keep |
| React Router DOM | 6.30.4 | Nine browser routes | Yes | Upgrade: production advisories reported by `npm audit` |
| Vite | 5.4.21 | dev server and production bundle | Yes | Upgrade: advisories and large single chunk |
| Tailwind CSS | 3.4.19 | utility styling plus custom CSS | Yes | Keep |
| PostCSS | 8.5.22 | CSS processing | Yes | Upgrade: advisory reported by `npm audit` |
| Autoprefixer | 10.5.4 | PostCSS plugin | Yes | Keep |
| anime.js | 3.2.2 | motion through `useAnime` | Optional product choice | Keep with restraint and reduced-motion support |
| Leaflet | 1.9.4 | OpenStreetMap tile renderer and straight polylines | Yes for current fallback map | Keep renderer; it is not a routing engine |
| AMap JS SDK | remote v2.0 | Dynamically loaded by `AmapRouteMap.jsx` | Optional | Keep renderer; add a real routing service later |
| lucide-react | 0.468.0 | interface icons | Yes | Keep |
| `@dnd-kit/core` | 6.3.1 | timeline drag-and-drop | Yes | Keep |
| `@dnd-kit/sortable` | 8.0.0 | sortable activities | Yes | Keep |
| `@dnd-kit/utilities` | 3.2.2 | drag transforms | Yes | Keep |
| Native `fetch` | Browser built-in | central `apiRequest` wrapper | Yes | Keep; add abort/timeouts and response typing |

No Bootstrap, PHP, XAMPP, Axios, Redux, Zustand, React Query, form library, or client validation library is used. Client forms use local React state and manual validation. Zod is not bundled directly into client form handling.

## Backend

| Technology | Version | Actual use | Required? | Decision |
|---|---:|---|---|---|
| Express | 4.22.2 | REST API and middleware composition | Yes | Keep |
| Zod | 3.25.76 | shared input/output schemas and AI parsing | Yes | Keep and extend semantic validation |
| bcryptjs | 2.4.3 | password hashing with cost 12 | Yes | Keep or evaluate native Argon2/bcrypt later; current use is acceptable |
| jsonwebtoken | 9.0.3 | seven-day access JWTs | Yes currently | Refactor session lifecycle and storage |
| express-rate-limit | 7.5.1 | one global API limiter | Yes | Keep; add auth-specific policies |
| Helmet | 8.3.0 | response security headers | Yes | Keep |
| CORS | 2.8.6 | single configured client origin | Yes | Keep |
| dotenv | 16.6.1 | server environment loading | Yes | Keep |
| Cheerio | 1.2.0 | Mafengwo catalogue HTML parsing | Only for current ingestion | Refactor behind provider adapter; do not treat scraped data as authoritative by itself |
| Native `fetch` | Node built-in | OpenRouter, HTML and image retrieval | Yes | Keep |

There is no controller layer, ORM, query builder, file-upload library, structured logger, OpenAPI generator, queue, cache service, or background worker.

## Persistence

| Technology | Version | Actual use | Required? | Decision |
|---|---:|---|---|---|
| MySQL Community-compatible server | External, version unknown | live core repository when `DEMO_MODE=false` | Intended live mode | Keep database choice; validate against a real server |
| mysql2 | 3.23.1 | parameterized SQL and transactions | Yes for MySQL mode | Keep |
| SQL.js | 1.14.1 | file-backed SQLite attraction catalogue | Yes currently | Replace the write architecture or isolate it; whole-file rewrites are unsafe across processes |
| In-memory JavaScript repository | application code | default demo accounts/trips/collaboration | Demo only | Keep only as test/demo adapter |
| ORM / migration runner | None | SQL files are manually applied | Missing | Add later; current manual migrations are not a defensible deployment mechanism |

The repository contains both MySQL attraction tables and a separate runtime SQLite attraction schema. Runtime code uses SQLite even in MySQL mode, so the MySQL ingestion tables are currently dead architecture.

## AI

| Item | Current implementation | Assessment |
|---|---|---|
| Provider | OpenRouter HTTP API, no SDK | Keep provider boundary |
| Configured example model | `tencent/hy3:free` in `.env.example` | Example only; actual runtime currently defaults to demo provider because no `.env` is present |
| Code default model | `openai/gpt-4.1-mini` | Configuration fallback, not proof of actual use |
| Demo provider | 591-line deterministic generator | Keep only as fixture/demo, not final travel truth |
| Structured output | OpenRouter `json_object` plus server Zod parsing | Partial; no JSON Schema is sent to the model |
| Retries | Up to three per style, all errors, no backoff | Replace |
| Timeout | 30 seconds around initial `fetch` | Refactor; response-body parsing is outside the cleared timer |
| Fallback | Empty editable itinerary | Keep concept, but expose failure and never present it as successful AI output |

## Mapping and geographic services

| Provider | What it actually does | What it does not do |
|---|---|---|
| Leaflet + OpenStreetMap tiles | Displays tiles, markers, popups and a straight polyline | No routing, distance, time, traffic, transit, route optimization or China coordinate conversion |
| AMap JS SDK | Displays markers and a straight polyline when a browser key exists and locations are not estimated | No AMap directions service; failures are swallowed |
| `DemoRouteMap.jsx` | Draws a synthetic grid route | Not imported by `RouteMap.jsx`; delete as dead code |

## Developer and test tooling

| Tool | Version | Use | Assessment |
|---|---:|---|---|
| Vitest | 2.1.9 | shared, server and client tests | Upgrade; current version has a critical development-server advisory |
| Testing Library React | 16.3.2 | component tests | Keep |
| Testing Library jest-dom | 6.9.1 | DOM assertions | Keep |
| Testing Library user-event | 14.6.1 | interaction tests | Keep |
| jsdom | 25.0.1 | browser-like test environment | Keep |
| Supertest | 7.2.2 | Express API tests | Keep |
| concurrently | 9.2.4 | combined API/web dev command | Keep |
| playwright-core | 1.54.1 locally extraneous | visual scripts import it, but it is not declared in any manifest or lockfile | Fix dependency declaration or move scripts outside the supported project path |
| ESLint | Not installed/configured | none | Missing quality gate |
| Prettier | Not installed/configured | none | Optional but useful |
| TypeScript/typecheck | Not configured | none | Missing static contract checking |
| Docker | None | none | Not required for FYP, but reproducible MySQL setup is missing |
| CI/CD | None found | none | Missing |

## Dependency risk result

`npm audit --json` reported 9 vulnerable package entries: 1 critical, 1 high and 7 moderate. The critical/high findings are in Vitest/Vite development tooling. `npm audit --omit=dev --json` still reported 3 moderate production entries involving `react-router`, `react-router-dom`, and `undici`. No dependency was changed during this audit.

## Unnecessary, missing, or questionable dependencies

| Item | Status | Recommendation |
|---|---|---|
| `playwright-core` | Installed locally but undeclared | Declare it as dev-only if visual scripts are official, otherwise remove those unsupported scripts later |
| `DemoRouteMap.jsx` | Dead source file, not a package | Delete later |
| MySQL ingestion schema | No runtime consumer | Delete or unify with the chosen catalogue repository later |
| AI SDK | Absent | No SDK is required; native fetch is sufficient |
| State library | Absent | React context is adequate at current scale, but split oversized contexts by responsibility |

## Bottom line

The actual stack is React + Vite + Tailwind on the client, Express + JavaScript + Zod on the server, MySQL for intended live core data, SQL.js/SQLite for the attraction catalogue, OpenRouter for optional AI, and Leaflet/AMap for display maps. The report must not describe Nuogo as PHP, Bootstrap, XAMPP, or DeepSeek API unless those technologies are deliberately introduced later.
