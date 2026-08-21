# Nuogo Current Test and Build Audit

Audit date: 2026-08-07  
Baseline: `main` commit `c0155fc`

## Commands executed

| Command | Result |
|---|---|
| `npm test` | PASS, exit 0 |
| `npm run build` | PASS, exit 0 with bundle-size warning |
| `npm run lint` | Not run: no `lint` script exists |
| `npm run typecheck` | Not run: no `typecheck` script exists |
| `npm ls --all --depth=0` | PASS; identified one extraneous local `playwright-core` installation |
| `npm audit --json` | FAIL status by design: 9 vulnerable entries (1 critical, 1 high, 7 moderate) |
| `npm audit --omit=dev --json` | FAIL status by design: 3 moderate production entries |
| `npm run attractions:list -- --status approved --limit 100` | PASS; 8 approved Huangshan attractions listed from local SQLite |

## Exact test result

| Workspace | Test files | Tests | Result |
|---|---:|---:|---|
| `shared` | 1 | 12 | 12 passed |
| `server` | 15 | 174 | 174 passed |
| `client` | 12 | 108 | 108 passed |
| **Total** | **28** | **294** | **294 passed, 0 failed, 0 skipped reported** |

Vitest 2.1.9 is used in all workspaces. Client tests use jsdom and Testing Library. Server API tests use Supertest.

## Build result

`npm run build` performs three operations:

1. reruns the 12 shared contract tests;
2. runs `node --check src/index.js` for the server;
3. runs `vite build` for the client.

The production build transformed 1,641 modules and emitted:

| Asset | Minified | Gzip |
|---|---:|---:|
| `index.html` | 0.65 kB | 0.38 kB |
| CSS | 58.53 kB | 15.57 kB |
| JavaScript | 577.72 kB | 177.51 kB |

Vite warned that a chunk exceeds 500 kB after minification. This is a performance warning, not a build failure. The application currently has no route-level code splitting.

## What is genuinely tested

- Strict Zod contracts for preferences, activities, itinerary variants, invitations and group expenses.
- Registration/login and protected REST workflow through the memory repository.
- Cross-user trip and activity access rejection.
- Three generated variants and Huangshan empty-catalogue behavior.
- Collaboration roles, invitation states, optimistic revisions and in-flight role changes.
- Atomic audit rollback behavior through repository contracts.
- Equal expense splitting, exact integer-fen reconciliation, former-member history and settlements.
- Client authentication/language behavior, itinerary comparison, editing, invitation UX and collaboration privacy clearing.
- Attraction parser, source allowlist, robots processing, repository behavior and media safety with test doubles.
- OpenRouter request construction, timeout classification and malformed response handling with fake fetch implementations.

## What the passing tests do not prove

The test count is strong for a prototype, but it is not end-to-end production evidence:

- API suites instantiate `MemoryRepository`; they do not run HTTP flows against MySQL.
- MySQL repository tests use mocked pool/connection objects and fabricated rows.
- No live MySQL server applies migrations or seeds.
- No migration replay, partial migration recovery or rollback is tested.
- SQLite tests use `:memory:` and do not test concurrent server/CLI writes to one file.
- OpenRouter tests do not contact OpenRouter or validate a real model response.
- Ingestion tests use fixtures/fake fetch; no current external page contract is verified.
- Map tests verify component selection, not directions, travel time or route feasibility.
- No test proves hotel, restaurant, attraction price, opening-hours or guide existence.
- No browser E2E command is part of `npm test`; visual scripts are separate and depend on undeclared `playwright-core`.
- No coverage threshold or coverage report is configured.

## Important missing test areas

| Priority | Gap |
|---|---|
| High | Real MySQL migration and repository integration |
| High | Cross-process SQLite write safety and recovery |
| High | Favorite creation authorization against private activities |
| High | Default demo deployment/JWT-secret and shared-guest exposure |
| High | Semantic itinerary validation: duplicate POIs, day/date sequence, overlap, travel time, opening hours and route feasibility |
| High | Budget reconciliation between activity costs, category totals, traveler count and requested limits |
| High | Real structured OpenRouter response and repair-loop behavior |
| Medium | Public share expiry/revocation and data minimization |
| Medium | Auth-specific throttling and session revocation |
| Medium | Memory/MySQL parity after delete, duplicate and favorite operations |
| Medium | Accessibility automation and real mobile-browser E2E |
| Medium | Beijing/Shanghai/Xi'an verified-data candidate retrieval |

## Quality tooling gaps

- No ESLint configuration or script.
- No typecheck or TypeScript configuration.
- No formatter policy.
- No CI workflow.
- Server build checks only the syntax of `src/index.js`; imported modules are exercised indirectly by tests, not by a full static build.
- No automated database schema drift check.

## Dependency security result

The full dependency audit reported 9 entries: Vitest critical, Vite high, and seven moderate transitive/direct entries. Production-only auditing reported moderate advisories affecting React Router and Undici. These findings are time-sensitive registry results from 2026-08-07 and should be remediated in a separate dependency task, not silently during this audit.

## Verdict

The automated suite is a genuine strength and covers collaboration unusually well for an FYP. Its main weakness is adapter realism: the green suite proves the in-memory application and mocked contracts, not the live MySQL, external-data, routing, or LLM system that the final architecture intends to claim.
