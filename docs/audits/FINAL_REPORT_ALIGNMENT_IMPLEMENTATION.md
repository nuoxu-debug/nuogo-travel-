# Nuogo Final Report-Alignment Implementation Audit

> **SUPERSEDED PRE-FINAL_UNIFIED SNAPSHOT.** This document records the earlier three-itinerary implementation. Use `../../CURRENT_ARCHITECTURE.md`, the current source, and the latest verification report for the active FINAL_UNIFIED system.

Date: 2026-08-24

## Status Definitions

- `IMPLEMENTED`: executable production code and deterministic test evidence exist.
- `PARTIAL`: useful implementation exists, but a stated boundary remains.
- `NOT CODE-APPLICABLE`: requires academic, legal, ethical, or stakeholder evidence outside the repository.
- `BLOCKED BY EXTERNAL EVIDENCE`: adapter/test exists, but this run lacked the external service, database, credential, or approved evidence required for a truthful pass.

## Executive Result

The final runtime is aligned to the approved assessed scope: security/privacy, three constraint-aware itinerary alternatives under one hard budget, and grounded tourism information for Beijing, Shanghai, and Xi'an. Retired collaboration, expense, guide, public-sharing, AMap, Mafengwo/Anhui, SQL.js, and legacy generator systems are absent from active source.

The previously reported generation problem is covered by a stable authenticated E2E journey and the server's explicit HTTP 422 failure contract. Demo generation completed successfully in the final desktop/mobile run.

## Objective Compliance

| Objective | Requirement | Status | Primary evidence |
| --- | --- | --- | --- |
| Security/privacy | Registration, login, guest sessions, logout, profile and password lifecycle | IMPLEMENTED | `authService.js`, auth/profile routes, auth and profile tests |
| Security/privacy | Authentication, owner-only trip authorization, administrator role checks | IMPLEMENTED | auth middleware, `tripAccess.js`, admin router, security/admin tests |
| Security/privacy | Consent, prompt screening, account/trip deletion, safe errors, log redaction | IMPLEMENTED | privacy route, `promptInjection.js`, logger, security tests |
| Multi-itinerary | Exactly three profile-specific alternatives | IMPLEMENTED | spending profiles, generation service, comparison UI |
| Multi-itinerary | Same hard budget, deterministic totals, remaining and per-person values | IMPLEMENTED | `budgetEngine.js`, budget tests, workspace UI |
| Multi-itinerary | Dense schedules, continuity, no duplicate POIs, route/schedule validation | IMPLEMENTED | validation engine, route/schedule propagation, generation tests |
| Multi-itinerary | Compare, select, edit, revalidate, regenerate, save, archive, duplicate, delete | IMPLEMENTED | trip routes/pages and Playwright journey |
| Tourism grounding | Destination-scoped provider candidate IDs and retained provenance | IMPLEMENTED | POI pipeline, OpenTripMap provider, provenance DTOs |
| Tourism grounding | Unsupported destination and hallucinated candidate rejection | IMPLEMENTED | shared schema and POI validator tests |
| Tourism grounding | Live OpenTripMap request | BLOCKED BY EXTERNAL EVIDENCE | opt-in integration test skipped without flag/key |

## Current Architecture

The system remains a pragmatic modular monolith:

- React/Vite browser application.
- Express REST API.
- shared Zod and JSON Schema contracts.
- memory repository in demo mode and MySQL repository in live mode.
- deterministic demo AI/travel providers.
- optional OpenRouter and OpenTripMap live providers.

No rewrite, microservice split, queue, CQRS layer, or theoretical folder migration was introduced. See `CURRENT_ARCHITECTURE.md`.

## Removed Runtime Scope

The final search covered `client/src`, `server/src`, `shared`, and the cleanup migration.

| Search group | Classification |
| --- | --- |
| AMap landing claim | Found and corrected to OpenTripMap with a regression test |
| Mafengwo, GuidePanel, tour guide, collaboration, invitation, expense, share, vote, favorite, SQL.js, Cheerio, legacy generator | No active implementation found |
| Retired table names in migration 015 | Expected deletion evidence |
| Expense/invitation names in `shared/contracts.test.js` | Expected negative assertions proving removed exports |
| `huangshan` in `shared/contracts.test.js` | Expected unsupported-destination test |
| `mysql.js` filename matching the text `sql.js` | False-positive filename substring |

Historical design and audit documents can still mention removed concepts; they are dated project history, not current runtime documentation.

## Database Alignment

`015_remove_retired_subsystems.sql` removes collaboration, expense, share, vote, favorite, old itinerary graph, and ingestion/media tables. Active live persistence retains users/privacy, objective trips/runs, supported destinations, canonical POIs/source records, route cache, evidenced cost references, validation/repair/provenance records, and administrator system records.

Memory and MySQL repositories implement the same final contract in deterministic repository tests.

| Check | Status |
| --- | --- |
| Migration ordering and source assertions | IMPLEMENTED |
| Memory repository behavior | IMPLEMENTED |
| MySQL repository contract with test pool | IMPLEMENTED |
| Clean migration against a real disposable MySQL database | BLOCKED BY EXTERNAL EVIDENCE |

## OpenTripMap

`OpenTripMapProvider` performs server-side radius and detail requests with bounded radius, timeouts, retries, and typed response validation. Normalization retains provider identity and coordinates. The LLM receives only the approved candidate pool and cannot introduce an unknown grounded POI.

The opt-in test `server/tests/integration/live-providers.integration.test.js` requires `OPENTRIPMAP_LIVE_TEST=true` and `OPENTRIPMAP_API_KEY`. It was skipped in this verification, so no live-data claim is made.

## OpenRouter And LLM Boundary

`OpenRouterProvider` calls the server-side Chat Completions endpoint, supports strict JSON Schema mode or compatible JSON-object mode, and applies a configurable timeout. Ajv validates the returned JSON structure; Zod and domain validators enforce travel contracts and business constraints. Deterministic and targeted repair are bounded.

Official facts checked on 2026-08-24:

- OpenRouter documents `POST /api/v1/chat/completions`: https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request
- OpenRouter documents JSON Schema structured output for compatible models and advises checking model-supported parameters: https://openrouter.ai/docs/guides/features/structured-outputs
- OpenRouter's model page lists `deepseek/deepseek-chat:free` as free and rate-limited; model availability and parameters remain provider-controlled: https://openrouter.ai/deepseek/deepseek-chat-v3%3Afree

No tracked configuration pins a DeepSeek model; `.env.example` intentionally uses a placeholder. The live OpenRouter test was skipped because its explicit flag/credential was unavailable. Therefore model compatibility, current rate limits, and successful live generation are `BLOCKED BY EXTERNAL EVIDENCE`.

## Budget And Administration

The budget engine uses integer fen and eight categories. Every profile stays under the same user hard budget or fails validation. Demo cost rows are explicitly labelled non-live fixtures.

Generation now reads cost references from the repository in every runtime. The Playwright administrator journey signs in, edits balanced meal evidence, generates a trip, and verifies that the revised source appears in saved trip provenance. Demo startup seeds only missing references, preserving administrator edits.

## Security Verification

| Check | Result |
| --- | --- |
| Tracked private-key/provider-token pattern scan | No matches |
| `.env.example` secret fields | Placeholders only |
| OpenRouter/OpenTripMap credentials in client source | None found |
| Password storage | bcryptjs hash |
| API auth and role enforcement | Covered by server and E2E tests |
| Prompt-injection screening and consent ordering | Covered by server tests |
| Safe unknown error response and redacted system records | Covered by server tests |

JWT storage in `localStorage` and a global rather than endpoint-specific rate limiter remain accepted prototype risks.

## Final Commands And Results

| Command | Result |
| --- | --- |
| `npm.cmd test` | PASS: 267 tests (5 shared, 183 server, 79 client) |
| `npm.cmd run lint` | PASS with 0 errors and 4 existing React Hook warnings |
| `npm.cmd run build` | PASS; Vite chunk-size warning remains |
| `npm.cmd run test:e2e` | PASS: 22 passed, 2 intentional project-specific skips |
| `npm.cmd run test:integration` | 4 skipped: 2 live providers and 2 MySQL checks lacked opt-in external configuration |
| `npx.cmd -y @mermaid-js/mermaid-cli -i CURRENT_ARCHITECTURE.md ...` | PASS: both Mermaid diagrams rendered without syntax errors |

One final E2E attempt exposed a 5-second URL-wait timeout while parallel bcrypt requests were still loading. The bounded auth expectation was increased to 15 seconds; the failing two-project scenario then passed, followed by the successful full matrix recorded above.

## Production Bundle

Latest Vite output:

| Asset | Minified | Gzip |
| --- | ---: | ---: |
| Main JavaScript `index-DDNox_Y0.js` | 615.74 kB | 203.69 kB |
| Living Atlas `createLivingAtlas-WbjUs7e8.js` | 529.46 kB | 134.64 kB |
| CSS `index-BNNgyuSG.css` | 67.56 kB | 17.89 kB |

Bundle optimization is a separate performance task.

All Section 17 source/document references exist, and the current Markdown link scan found no broken relative links.

## Non-Code Evidence

| Item | Status |
| --- | --- |
| Supervisor approval of final objective wording | NOT CODE-APPLICABLE |
| User evaluation/usability study results | NOT CODE-APPLICABLE |
| Ethics/consent paperwork beyond in-app consent | NOT CODE-APPLICABLE |
| Legal approval for third-party data/media use | NOT CODE-APPLICABLE |
| Current authoritative hotel/meal/ticket price dataset | BLOCKED BY EXTERNAL EVIDENCE |
| Live adult/child/senior ticket inventory | BLOCKED BY EXTERNAL EVIDENCE; not implemented |

## Remaining Risks

- MySQL and live provider tests require external configuration before deployment claims.
- Remote images/tiles and provider availability can change independently of Nuogo.
- Estimated costs and routes are not bookings, current prices, or navigation guarantees.
- Vite reports two JavaScript chunks above 500 kB.
- Four React Hook lint warnings remain outside this report-alignment pass.
- Historical documents can contain superseded architecture; current claims must cite this audit, `CURRENT_ARCHITECTURE.md`, `docs/API.md`, or executable source.
