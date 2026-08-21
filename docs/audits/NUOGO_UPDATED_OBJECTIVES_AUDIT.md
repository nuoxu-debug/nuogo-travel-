# Nuogo Full Implementation Audit Against Updated FYP Objectives

Audit date: 2026-08-14  
Repository state audited: `main` at `c0155fc` with pre-existing uncommitted/untracked files  
Audit mode: Evidence only. No application code, dependency, schema, or feature was changed.

## A. Overall Verdict

**Major refactor required.**

Nuogo is a working full-stack prototype with reusable authentication, trip ownership and collaboration authorization, three generated variants, itinerary editing, persistence abstractions, and an interactive Leaflet/OpenStreetMap view. The current implementation is nevertheless built around the previous product model. It does not implement the new core data source or central constraints: OpenTripMap is absent, Beijing/Shanghai/Xi'an attractions come from hard-coded demo records or unconstrained LLM output, the request model omits several mandatory preferences, the three strategies are `budget`/`food`/`leisure`, and the user's total budget is not enforced as a hard constraint.

Objective 1 is partial. Objective 2 is partial but has central correctness blockers. Objective 3 is not implemented. The recommended response is a focused replacement of the input, grounding, validation, and budget-generation pipeline while preserving the working shell, authentication, repositories, itinerary editor, and map. A rewrite of the whole application is neither required nor recommended.

## B. Objective 1 Status - Security and Privacy

### Completed

- Registration and login use server-side Zod validation in `shared/schemas.js` (`registerSchema`, `loginSchema`) and routes in `server/src/routes/auth.js`.
- Passwords are hashed with bcrypt cost 12 in `server/src/services/authService.js` (`register`).
- JWTs have a seven-day expiry and are verified by `server/src/middleware/auth.js` (`authenticate`).
- Trip routes use ownership/member-role checks from `server/src/services/tripAccess.js`; MySQL mutation methods also re-check roles and revisions transactionally.
- The OpenRouter credential is read by the server configuration and provider only. No OpenRouter credential is referenced by frontend source.
- LLM system and user messages are separated by role in `server/src/services/promptBuilder.js` and `server/src/providers/openRouter.js`.
- Trip deletion exists at `DELETE /api/trips/:tripId` and is owner-only.
- A tracked-file secret-pattern scan found no active API key, JWT secret, or private key. The two tracked `OPENROUTER_API_KEY` assignments are test/example strings, not active credentials.

### Partial

- Client routes in `client/src/App.jsx` are directly routable without a route guard. The API rejects unauthenticated requests, but the UI can display private workflow pages before receiving `401`.
- The bearer token is stored in `localStorage` by `client/src/api/authToken.js`. Expiry exists, but there is no refresh, revocation, or server-side logout mechanism.
- `server/src/config.js` permits a known fallback JWT secret in demo mode. This is acceptable only for a strictly local demo and becomes unsafe if the demo server is exposed.
- Prompt construction tells the model not to follow instructions embedded in user data, but there is no suspicious-instruction detector, screening result, audit flag, or rejection path.
- Data sent to the LLM is reasonably limited by the small current schema, but there is no privacy notice or explicit LLM-processing consent.
- Itinerary deletion exists, but account/profile deletion does not.

### Missing or broken

- No administrator role, role guard, or admin-only route exists.
- `POST /api/auth/guest` maps every demo guest to the same `guest@nuogo.local` account in `server/src/services/authService.js` (`getOrCreateGuest`). Multiple visitors can therefore share one identity and its data.
- Favorites have an object-level authorization defect: `server/src/routes/favorites.js` calls `addFavorite(userId, activityId)` without trip authorization, and both repositories resolve activities globally. A user who knows another activity ID can create a snapshot of it.
- Public trip shares use persistent plaintext tokens without expiry or revocation in `trip_shares` from `database/migrations/001_initial.sql` and return the trip DTO through the public route.
- There is no privacy notice, consent record, account deletion workflow, or data-retention policy.
- There is no structured secure logging. `server/src/app.js` returns raw unexpected `error.message` values to clients, which can disclose internal details.
- `.env.example` is currently empty in the working tree. It exposes no credential, but it no longer documents safe configuration placeholders.

## C. Objective 2 Status - Constraint-Aware Personalised Itinerary Generation

### Completed foundations

- `server/src/services/generator.js` (`generateThreePlans`) invokes three variant generations and uses `Promise.allSettled` so one failure does not discard all variants.
- `server/src/providers/openRouter.js` sends structured system/user messages and returns generated text.
- `server/src/services/parser.js` extracts JSON and validates its basic shape with the production Zod `itinerarySchema`.
- Generated variants can be compared and selected in the client, and selected trips can be viewed and edited.
- The system recalculates a basic total, remaining amount, and over-budget flag in `server/src/services/budget.js` (`calculateBudget`).

### Partial requirements

- Three outputs exist, but their strategies are the old `budget`, `food`, and `leisure` styles in `generator.js`, `promptBuilder.js`, `demoProvider.js`, and the MySQL `style` enum. They are not Budget-Saving, Balanced, and Comfort-Focused.
- The demo provider varies ordering, time slots, and cost multipliers, so the outputs are not identical random copies. However, these differences are not six-category spending allocations and are not validated against one shared hard budget.
- Zod checks structural shape, dates as strings, and time format. It does not validate request date alignment, start/end ordering, overlaps, duplicates, daily duration, travel-time plausibility, preference satisfaction, or spending-strategy compliance.
- Failed generation is retried, but the failure reason is not supplied to the model. Exhaustion can persist an empty fallback rather than a safe user-facing failure.
- Current budget output has only scenic tickets, local food, transportation, and accommodation. Entertainment and miscellaneous are absent, transportation has no source field in the activity schema and therefore remains zero, and per-person cost cannot be calculated.

### Missing or broken requirements

- `shared/schemas.js` (`preferenceSchema`) omits traveller count, preferred sights, arrival/departure details, transportation preferences, food preferences, and activity preferences. It accepts 13 destinations rather than the three-city MVP.
- The user's total budget is not enforced. `calculateBudget` reports an overage but generation and persistence continue.
- Costs are not derived from administrator-maintained reference data. The demo provider multiplies hard-coded activity prices; the OpenRouter prompt asks the LLM for realistic costs. Both violate the required deterministic price boundary.
- No six-category cost-reference data, currency/source/collection-date/status fields, or backend cost engine exists.
- There is no budget reconciliation, controlled correction based on validation reasons, or guaranteed safe failure when a variant exceeds budget.
- There is no deterministic strategy validator for Budget-Saving, Balanced, or Comfort-Focused.
- Non-Huangshan generated attractions can be accepted without a source ID. `server/src/services/grounding.js` removes provenance for those cities rather than validating it.

### Runtime proof

An actual request containing the updated Beijing fields was sent to the running API. It returned `400 VALIDATION_ERROR` because the strict current schema rejects traveller count, preferred attraction, arrival/departure, and transport/food/activity preference fields. A closest-valid request then returned `201` with three old-style variants:

| Style | Total | Activities | Source-tagged | Empty days |
| --- | ---: | ---: | ---: | ---: |
| `budget` | CNY 312 | 4 | 0 | 1 |
| `food` | CNY 433 | 4 | 0 | 1 |
| `leisure` | CNY 511 | 4 | 0 | 1 |

The live process was in `demoMode: true` with `aiProvider: demo`. Therefore no OpenRouter call occurred, prices and Beijing POIs came from the hard-coded demo provider, and the in-memory trip will disappear when the server restarts.

## D. Objective 3 Status - OpenTripMap Grounding

**NOT IMPLEMENTED.**

Repository-wide searches found no OpenTripMap package, environment variable, HTTP client, service, cache, database column, test, or runtime call. Beijing, Shanghai, and Xi'an are accepted by the input schema, but their POIs are supplied by `server/src/data/demoCatalog.js` in demo mode. In OpenRouter mode, the prompt has no OpenTripMap records.

The existing attraction ingestion system is for Mafengwo/Huangshan data and uses `server/src/ingestion/sqliteRepository.js` with SQL.js. It is not an implementation of Objective 3 and should not be relabelled as OpenTripMap.

### Grounding weaknesses and hallucination paths

- `server/src/services/grounding.js` enforces catalogue matching only for Huangshan.
- For every non-Huangshan destination, it strips `sourceAttractionId`, `sourceProvider`, and `sourceUrl` and accepts the generated activity.
- Even in the Huangshan path, an activity with no source ID passes through unchanged; only an unknown ID that is present is rejected.
- Provenance fields are optional in `shared/schemas.js` (`activitySchema`) and in the activity table migration.
- The UI displays a source link only when optional source fields happen to exist. There is no mandatory source type, verification status, or estimate label.
- No empty-response, provider-failure, cache, retrieval timestamp, unsupported-city, or OpenTripMap matching behavior exists.

## E. Objective Traceability Matrix

| Objective | Requirement | Status | Evidence | Missing / Problem | Required Action |
| --------- | ----------- | ------ | -------- | ----------------- | --------------- |
| O1 | Registration and login | COMPLETE | `server/src/routes/auth.js`; `shared/schemas.js` `registerSchema`/`loginSchema`; auth tests | None for basic flow | Preserve and extend tests only as needed |
| O1 | Password hashing | COMPLETE | `server/src/services/authService.js` uses bcrypt cost 12 | No password reset, which is not an MVP objective | Preserve |
| O1 | JWT expiry and verification | COMPLETE | `authService.js` signs with `expiresIn: "7d"`; `middleware/auth.js` verifies bearer JWT | No revocation/refresh | Add logout/revocation only if required by privacy design |
| O1 | Protected application routes | PARTIAL | Server trip/activity/favorite routers use `authenticate`; `client/src/App.jsx` has no protected-route wrapper | UI exposes private workflow screens before API rejection | Add client route guard while retaining API enforcement |
| O1 | Object-level itinerary access | COMPLETE | `services/tripAccess.js`; repository mutation role checks; collaboration authorization tests | Public share path is separate and weaker | Preserve checks and apply same pattern everywhere |
| O1 | Favorite object authorization | IMPLEMENTED BUT BROKEN | `routes/favorites.js`; `MemoryRepository.addFavorite`; `MysqlRepository.addFavorite` | No trip membership/ownership check for referenced activity | Authorize the activity's trip before snapshotting |
| O1 | User versus administrator authorization | NOT IMPLEMENTED | No user role field, role middleware, or admin routes | Basic administration cannot be secured | Add minimal role model and admin guard |
| O1 | Server-side API-key protection | PARTIAL | OpenRouter key used in `server/src/config.js`/`providers/openRouter.js`; no frontend key reference | OpenTripMap key/integration absent; logging guarantees absent | Add server-only OpenTripMap configuration and redaction tests |
| O1 | Input validation | PARTIAL | Strict Zod schemas in `shared/schemas.js`; routes parse request bodies | Mandatory updated fields and semantic date constraints absent | Replace preference contract and add semantic validators |
| O1 | Prompt-injection prevention | PARTIAL | Role separation and warning in `services/promptBuilder.js` | No screening/detection/audit stage | Add bounded screening before retrieval/prompting and adversarial tests |
| O1 | Privacy notice and consent | NOT IMPLEMENTED | No privacy/consent component, route, or table | LLM processing consent is not captured | Add notice, consent record, and withdrawal behavior |
| O1 | Data deletion controls | PARTIAL | Owner-only `DELETE /api/trips/:tripId` | No account/profile deletion or retention process; client lacks trip delete UI | Add authenticated account deletion and expose trip deletion UI |
| O1 | Secure logging/error handling | NOT IMPLEMENTED | No structured logger; `server/src/app.js` sends raw unexpected `error.message` | No redaction policy, request IDs, or protected security audit trail | Add minimal structured/redacted logging and generic 500 responses |
| O1 | Guest isolation | IMPLEMENTED BUT BROKEN | `authService.js` `getOrCreateGuest` always uses `guest@nuogo.local` | All demo guests share one account | Use per-session guest identity or disable guest mode outside single-user demo |
| O2 | Collect all required preferences | NOT IMPLEMENTED | `shared/schemas.js` `preferenceSchema`; `client/src/components/PreferenceForm.jsx` | Missing travellers, sights, arrival/departure, transport, food, and activity preferences | Extend shared schema, form, storage, and prompt mapping |
| O2 | Three generated alternatives | PARTIAL | `generator.js` `generateThreePlans` generates three styles concurrently | Wrong strategy names and semantics | Implement the three approved spending profiles |
| O2 | Budget-Saving strategy | PARTIAL | `demoProvider.js` has low-cost `budget` sorting/multiplier | Not a six-category allocation and no hard-budget validation | Define backend allocation policy and validate it |
| O2 | Balanced strategy | NOT IMPLEMENTED | No balanced strategy constant or validation | Existing `food` style is not Balanced | Add Balanced allocation policy and prompt instructions |
| O2 | Comfort-Focused strategy | PARTIAL | `demoProvider.js` `leisure` uses a 1.18 multiplier/high-cost ordering | It is leisure-focused and may exceed budget | Replace with bounded comfort allocation policy |
| O2 | Same mandatory requirements in all alternatives | NOT IMPLEMENTED | No post-generation preference validator | Variants are not checked against all user requirements | Add deterministic preference-satisfaction validation |
| O2 | Total budget as hard constraint | IMPLEMENTED BUT BROKEN | `services/budget.js` computes `overBudget`; generator persists regardless | Reporting an overage does not enforce the constraint | Reject/reconcile every over-budget variant before storage |
| O2 | Six deterministic cost categories | NOT IMPLEMENTED | `budget.js` has four categories; provider/LLM supplies activity costs | Entertainment/miscellaneous absent; transport effectively zero; LLM can invent costs | Build backend six-category cost engine from reference data |
| O2 | Cost per person | NOT IMPLEMENTED | Traveller count absent from schema and database preference model | Cannot calculate per-person estimates | Store traveller count and calculate per-person values |
| O2 | Structured JSON generation | COMPLETE | `providers/openRouter.js`; `services/parser.js`; `itinerarySchema` | This is structural output, not semantic validity | Preserve parser and strengthen schema/versioning |
| O2 | JSON Schema validation | PARTIAL | Production path uses Zod `itinerarySchema` | No Ajv/JSON Schema; more importantly, semantic checks are absent | Zod may be retained, but add the required semantic validation pipeline |
| O2 | Date/time/duplicate/duration/travel validation | NOT IMPLEMENTED | Schema checks string/time format only; no production validators found | Invalid chronology, overlap, duplicates, excessive days, and implausible travel can pass | Add explicit backend validators with reason codes |
| O2 | Controlled regeneration or safe failure | PARTIAL | `generator.js` retries up to three times and uses fallback | Retry is blind and fallback can be an empty persisted itinerary | Feed validation reasons into bounded retries, then return a safe failure |
| O2 | Save and display alternatives | COMPLETE | Repository `createTrip`; compare/workspace client routes and components | Save is automatic rather than explicit | Preserve; clarify draft/save UX |
| O3 | OpenTripMap retrieval | NOT IMPLEMENTED | No OpenTripMap references or client/service | Core Objective 3 source absent | Add server-side provider with timeout and bounded retry |
| O3 | MVP supported-city enforcement | NOT IMPLEMENTED | `shared/constants.js` accepts 13 destinations | Nationwide/Anhui options conflict with three-city scope | Restrict MVP generation to Beijing, Shanghai, Xi'an |
| O3 | OpenTripMap cache/storage | NOT IMPLEMENTED | No `xid`, retrieval timestamp, cache table, or provider cache | Cannot preserve source records or reduce calls | Add minimal attraction/cache persistence |
| O3 | Attraction matching and hallucination prevention | IMPLEMENTED BUT BROKEN | `services/grounding.js` validates only some Huangshan IDs | Missing ID passes; non-Huangshan bypasses grounding | Require every attraction item to match an allowed retrieved record |
| O3 | Empty response/provider failure handling | NOT IMPLEMENTED | No provider exists | No supported behavior | Return explicit safe error/fallback without ungrounded POIs |
| O3 | Source labelling and provenance recording | PARTIAL | Optional source columns from migration 003; conditional source link in `ActivityDetailsDialog.jsx` | Fields optional; no source type/verification/estimate labels | Make provenance required and render consistent labels |
| O3 | Labelled website display | PARTIAL | Conditional source link exists | AI narrative and system estimates appear without mandatory labels | Add visible, localized provenance and estimate-status labels |

## F. Module Status Matrix

| Module | Status | Evidence | Main Problems | Objective Supported |
| ------ | ------ | -------- | ------------- | ------------------- |
| 1. User Management & Security | PARTIAL | `routes/auth.js`, `authService.js`, `middleware/auth.js`, auth tests | Shared guest, no admin role, no consent/account deletion, weak client guard | O1 |
| 2. Travel Preference Collection | PARTIAL | `PreferenceForm.jsx`, `shared/schemas.js` `preferenceSchema` | Several mandatory fields absent; city scope is too broad | O2 |
| 3. OpenTripMap Travel Information | NOT IMPLEMENTED | Repository search has zero OpenTripMap references | No provider, cache, IDs, timestamps, failure handling, or tests | O3 |
| 4. LLM Itinerary Generation | PARTIAL | `openRouter.js`, `generator.js`, `promptBuilder.js` | Current runtime uses demo provider; prompt uses old strategies and unverified prices | O2, O3 |
| 5. Structured Output Validation | PARTIAL | `parser.js`, `itinerarySchema` | Structural Zod only; required semantic validation is absent | O2 |
| 6. Constraint Validation | NOT IMPLEMENTED | No composed production validation pipeline | No duplicate, chronology, duration, travel, preference, city, or hard-budget enforcement | O2, O3 |
| 7. Multiple Spending-Preference Itineraries | PARTIAL | `generateThreePlans`; `demoProvider` style logic; comparison UI | Uses budget/food/leisure, not approved profiles; no allocation validation | O2 |
| 8. Deterministic Budget Engine | NOT IMPLEMENTED | `services/budget.js` is a four-category sum of supplied values | No reference data, six categories, per-person cost, reconciliation, or hard rejection | O2 |
| 9. Information Provenance / Verification Labels | PARTIAL | Optional activity source fields; `ActivityDetailsDialog.jsx` source link | Provenance is optional and absent for MVP cities; estimates are unlabeled | O1, O3 |
| 10. Itinerary Management | PARTIAL | trip/activity routes, repositories, compare/workspace/archive UI | Backend rename/delete exist but corresponding UI is incomplete; full-trip regeneration is absent | O1, O2 |
| 11. Interactive Map | PARTIAL | `LeafletRouteMap.jsx` uses Leaflet and OSM markers/popups/polyline | Interactive display works, but MVP city coordinates are not grounded; lines are not routes | O3 |
| 12. Administration | NOT IMPLEMENTED | Only local attraction ingestion/review CLI exists | No admin identity, UI/API, user management, destination/cost/source/status/error management | O1, O2, O3 |

## G. Current End-to-End Architecture

### What the application actually does

1. The React/Vite client collects the limited `preferenceSchema` fields in `PreferenceForm.jsx`.
2. `Planner.jsx` posts them to `POST /api/trips/generate`. A client timer displays simulated pipeline stages and deliberately extends the loading period; it is not server progress telemetry.
3. `client/src/api/client.js` adds the JWT from `localStorage`.
4. Express authenticates the token and parses the strict Zod schema in `server/src/routes/trips.js`.
5. The attraction catalogue is queried. The active catalogue is SQL.js-based local ingestion data and is useful primarily for Huangshan.
6. `generateThreePlans` requests `budget`, `food`, and `leisure` variants.
7. In the currently running default demo mode, `DemoPlanProvider` selects hard-coded destination records from `demoCatalog.js`, applies simple sorting/time templates/cost multipliers, and returns JSON. OpenRouter is not called.
8. If configured for OpenRouter, `OpenRouterPlanProvider` sends a prompt and generated JSON is parsed with Zod.
9. `grounding.js` performs limited Huangshan matching. Beijing, Shanghai, and Xi'an bypass source matching and have provenance stripped.
10. `calculateBudget` sums activity costs supplied by the demo provider or LLM. It does not consult reference data or reject over-budget output.
11. The repository persists the trip. The default runtime uses `MemoryRepository`; live mode can use `MysqlRepository` when `DEMO_MODE=false`.
12. The client stores the generated response in session storage, displays three comparison cards, and opens the selected trip workspace.
13. Leaflet renders markers and a straight polyline between activity coordinates using OpenStreetMap tiles. It does not call a routing service or provide navigation.

### Actual Beijing request trace

Requested scenario: Beijing, five days, two travellers, CNY 10,000, history and food, Forbidden City, arrival on Day 1 at 10:00, departure on Day 5 at 20:00.

| Stage | Observed behavior |
| --- | --- |
| Frontend form | Cannot represent traveller count, preferred attraction, arrival/departure, or transport/food/activity preferences. |
| Frontend API call | Sends only current schema fields to `POST /api/trips/generate` with a bearer JWT. Loading stage text is simulated. |
| Backend route | Authenticates and calls `preferenceSchema.parse`. |
| Input validation | The full updated payload was actually rejected with `400 VALIDATION_ERROR` because the strict schema treats the new fields as unrecognized. |
| Prompt-injection screening | Skipped; no screening stage exists. |
| Supported-city validation | Beijing is accepted, but so are ten destinations outside the updated MVP. |
| OpenTripMap | Skipped; no implementation exists. |
| Data preparation | Closest-valid request uses demo catalogue data in the current runtime. |
| LLM | Skipped in the observed run because `aiProvider` was `demo`. OpenRouter is optional code, not the active provider. |
| Structured output | Demo JSON passes the same Zod itinerary shape used for model output. |
| Semantic validation | Duplicate, chronology, daily-duration, travel-time, preference, strategy, and hard-budget checks are skipped. |
| Grounding | Non-Huangshan provenance is stripped; Beijing activities are not OpenTripMap-matched. |
| Budget engine | Sums hard-coded/multiplied activity costs. No six-category references or per-person calculation. |
| Database | Current runtime writes to in-memory repository. Data is lost on restart. |
| Frontend display | Shows old-style alternatives and unlabeled estimates; no API source label exists. |

### Real technology stack

| Technology | Classification | Evidence / qualification |
| --- | --- | --- |
| React | actively used | `client/package.json`, `client/src/main.jsx`, `App.jsx` |
| Vite | actively used | client scripts/config and successful production build |
| Tailwind CSS | actively used | `tailwind.config.js`, PostCSS config, utility usage/styles |
| Node.js | actively used | root engine and server runtime |
| Express.js | actively used | `server/src/app.js` and route modules |
| MySQL | actively implemented, live operation cannot be verified | `mysql2`, `repositories/mysql.js`, migrations; selected only when `DEMO_MODE=false`; no local MySQL/Docker available during audit |
| SQL.js | actively used | `ingestion/sqliteRepository.js`; attraction catalogue initialized in `server/src/index.js` |
| OpenRouter | actively implemented but optional | `providers/openRouter.js`; current runtime uses demo provider |
| DeepSeek model | claimed/possible configuration but absent by default | No DeepSeek reference; default model is `openai/gpt-4.1-mini` |
| OpenTripMap | claimed requirement but absent | Zero repository references and no configuration/dependency |
| Leaflet | actively used | `LeafletRouteMap.jsx` |
| OpenStreetMap | actively used | OSM tile URL and attribution in `LeafletRouteMap.jsx` |
| express-validator | claimed/planned elsewhere but absent | No dependency or source reference; Zod is used |
| Ajv | claimed/planned elsewhere but absent | No dependency or source reference; Zod is used |
| JWT | actively used | `jsonwebtoken`, `authService.js`, `middleware/auth.js` |
| bcrypt | actively used | `bcryptjs`, `authService.js` |
| Helmet | actively used | `server/src/app.js` |
| Vitest | actively used | all workspace test scripts and 294 passing tests |
| Supertest | actively used | server API tests |
| Playwright | claimed/planned but absent | No dependency, config, or tests |

### Actual database architecture

- The root architecture supports two trip repository modes: `MemoryRepository` by default and `MysqlRepository` when live mode is enabled.
- SQL.js is a separate local attraction catalogue store used by the ingestion subsystem in both modes. This creates two data authorities for attraction-related data.
- MySQL migrations are raw SQL files and there is no migration runner, migration-history table, or migration verification script.
- No JSON/file store persists trips. The memory repository resets on server restart; SQL.js exports the attraction catalogue to a local database file.

MySQL tables by migration:

- `001_initial.sql`: `users`, `trips`, `travel_preferences`, `itinerary_variants`, `trip_days`, `activities`, `trip_shares`, `activity_votes`, `favorites`.
- `002_anhui_ingestion.sql`: `ingestion_sources`, `scrape_jobs`, `attractions`, `attraction_images`, `attraction_sources`.
- `003_activity_provenance.sql`: optional activity source/provenance columns.
- `004_attraction_media_details.sql`: attraction media/detail fields.
- `005_trip_collaboration.sql`: `trip_members`, `trip_invitations`, `trip_expenses`, `expense_participants`, `trip_activity_log`.

Important inconsistencies:

- `travel_preferences` reflects the old request fields and does not store all updated constraints.
- `itinerary_variants.style` is restricted to `budget`, `food`, and `leisure`.
- No OpenTripMap `xid`, retrieval timestamp, provider-cache, or matching status exists.
- No six-category cost-reference table exists.
- Activity provenance is optional and has no verification status.
- Users have no administrator role.
- Expense splitting uses integer fen and six categories, but it records collaborative actual expenses; it is not the itinerary estimate/reference engine required by Objective 2.

## H. Legacy / Out-of-Scope Features

| Feature | Current reach | Classification | Recommendation |
| --- | --- | --- | --- |
| `activity.guide` / `GuidePanel` | Required by shared activity schema, stored as `guide_json`, generated by providers, rendered in trip UI, referenced by tests/docs | Reachable UI/API/database/tests/docs; creates confusion with removed human tour-guide objective | Retain useful text but rename to visit tips/local tips across contracts in a later migration |
| Human tour-guide recommendation | Old design documentation references it; no profile tables, recommendation routes, or booking implementation exist | Documentation legacy, not an implementation gap | Mark old specifications superseded; remove from active requirements |
| Travel agency recommendation/booking | No implementation found | No longer required | No action beyond keeping it out of future scope |
| Public trip sharing and voting | Reachable UI/API/database via `trip_shares` and `activity_votes` | Out of current MVP; permanent-token design also adds risk | Disable or remove public sharing/voting after confirming no evaluation dependency |
| Collaboration invitations and expense splitting | Reachable UI/API/database and well tested | Useful optional functionality but not required by the three updated objectives | Isolate from the core MVP; retain only if supervisor approves collaborative planning scope |
| Mafengwo/Anhui ingestion | CLI, SQL.js catalogue, migrations, tests/docs | Functional legacy data path outside three-city/OpenTripMap MVP | Isolate or archive; do not use as Objective 3 evidence |
| Nationwide destination list | Reachable in planner and backend schema | Conflicts with MVP city boundary | Disable outside Beijing, Shanghai, Xi'an for the assessed MVP |
| AMap renderer | Optional map implementation alongside Leaflet | Outside required Leaflet/OSM baseline but harmless when isolated | Retain only if configured and documented; Leaflet remains the baseline |
| Nearest-neighbor ordering and straight route lines | Active demo-provider ordering and map display | Basic heuristic/display, not advanced route optimization | Retain as simple ordering/display but stop labelling it optimized navigation |
| Ticket child/student prices | `ActivityDetailsDialog.jsx` derives 50% of activity estimate | Synthetic legacy UI information, not verified pricing | Remove or explicitly label as illustrative; do not present as source-backed ticket data |

## I. Critical Bugs

| Severity | Problem | Evidence | Affected objective | Recommended fix |
| --- | --- | --- | --- | --- |
| Critical | MVP attractions are not OpenTripMap-grounded | No OpenTripMap code; `demoCatalog.js`; non-Huangshan bypass in `grounding.js` | O3, O2 | Implement server-side retrieval/cache and require matched source IDs |
| Critical | Total budget is not a hard constraint | `calculateBudget` reports `overBudget`; `generator.js` still returns/persists variant | O2 | Reconcile or reject every variant before persistence |
| Critical | Costs are provider/LLM supplied rather than deterministic | `demoProvider.js` cost multipliers; `promptBuilder.js` asks for realistic costs; no reference table | O2 | Build six-category reference data and backend-only calculation |
| Critical | Required updated request cannot be submitted | `preferenceSchema` and form omit fields; real complete request returns 400 | O2 | Introduce the approved preference contract end to end |
| High | Alternative strategies do not match objective | `budget`/`food`/`leisure` constants, prompts, DB enum | O2 | Replace with Budget-Saving/Balanced/Comfort-Focused allocation profiles |
| High | Grounding can be bypassed by missing source ID | `grounding.js` accepts missing IDs and strips sources for non-Huangshan | O3 | Make source identity mandatory for attraction activities and fail closed |
| High | All guest visitors share one identity | `authService.js` `getOrCreateGuest` fixed email | O1 | Use isolated guest sessions or disable guest in multi-user deployments |
| High | Favorite endpoint permits cross-trip activity access | `routes/favorites.js` and repository `addFavorite` methods lack trip authorization | O1 | Resolve activity context and call trip-access authorization first |
| High | Privacy consent and account deletion are absent | No UI/API/table for either | O1 | Add explicit consent record and authenticated account deletion transaction |
| High | Semantic validation pipeline is absent | Only `parser.js` Zod shape validation exists | O2, O3 | Add deterministic validators and reason-coded controlled retry |
| Medium | Public share tokens are permanent and stored plaintext | `trip_shares` and collaboration repository/routes | O1 | Disable feature or hash, expire, and revoke tokens with reduced public DTO |
| Medium | Raw server error messages can reach clients | `server/src/app.js` error handler | O1 | Log redacted internal error and return generic 500 response |
| Medium | Client private routes lack authentication guard | Direct routes in `client/src/App.jsx` | O1 | Add a minimal protected-route wrapper |
| Medium | Demo-mode JWT fallback is predictable | `server/src/config.js` | O1 | Bind demo server to local use and require explicit secret when exposed |

## J. Missing Implementation

Only work required by the updated objectives/MVP is listed here:

1. Complete preference contract for dates, travellers, sights, arrival/departure, accommodation, transport, food, activities, and relevant constraints.
2. Strict Beijing/Shanghai/Xi'an support validation.
3. Server-only OpenTripMap client, failure handling, cache/storage, source IDs, coordinates, categories, and retrieval timestamps.
4. Fail-closed attraction matching for every attraction activity.
5. Six-category CNY cost-reference data with source, collection/update dates, and availability status.
6. Backend deterministic budget engine with category totals, per-person values, remaining budget, and hard-budget rejection.
7. Explicit Budget-Saving, Balanced, and Comfort-Focused allocation strategies under the same user budget.
8. Post-generation validation for dates, times, duplicates, daily duration, travel plausibility, preference satisfaction, source matching, strategy compliance, and budget.
9. Controlled reason-aware regeneration followed by a safe failure response.
10. Mandatory provenance/verification/estimate labels in stored data and UI.
11. Prompt-injection screening, secure structured logging, generic internal errors, and key-redaction tests.
12. Consent/privacy notice, account deletion, and complete user-facing itinerary management controls.
13. Minimal administrator role and protected management for users, destinations, attractions, cost references/statuses, and basic error visibility.
14. Tests for all of the above, including end-to-end browser coverage.

## K. Existing Features That Can Be Reused

- React/Vite/Tailwind application shell, localization context, and responsive visual system.
- Authentication route/service/middleware foundation, bcrypt hashing, JWT expiry, and server-side route protection.
- `tripAccess.js` role model and transactional repository checks for owned/shared trips.
- Root `client`/`server`/`shared` workspaces and shared Zod contracts. Zod can remain the schema library; Ajv is not inherently required if equivalent JSON and semantic validation is implemented.
- `OpenRouterPlanProvider`, role-separated prompt transport, timeout support, and JSON parser as the LLM adapter foundation.
- `generateThreePlans` concurrency/error-isolation structure after replacing styles and validation flow.
- Memory/MySQL repository interfaces and trip/day/activity persistence model, extended rather than replaced.
- Compare, trip workspace, activity editor/reorder, archive, and localized dialog components.
- Leaflet/OpenStreetMap marker, popup, selection, and viewport behavior.
- Existing Vitest/Supertest suite and authorization/concurrency tests.
- Invitation token hashing/expiry/revocation patterns can inform any future security token design.

## L. Tests and Verification Status

### Commands actually executed

| Command | Result |
| --- | --- |
| `npm test` | PASS: 28 files, 294 tests; shared 12, server 174, client 108; 0 failed, 0 skipped |
| `npm run build` | PASS: shared tests pass, server syntax check passes, Vite production build succeeds |
| `npm audit --omit=dev` | FAIL/non-zero: 3 moderate production dependency vulnerabilities |
| `npm audit` | FAIL/non-zero: 10 total vulnerabilities, 7 moderate, 2 high, 1 critical |
| `npm run lint` | Not run because no lint script exists |
| `npm run typecheck` | Not run because no typecheck script/config exists |
| Live API updated Beijing payload | `400 VALIDATION_ERROR` as expected from current strict schema |
| Live API closest-valid Beijing payload | `201`; three demo variants produced with no source-tagged activities |

Build artifacts from the executed build: Vite 5.4.21, 1,641 modules, JavaScript 577.72 kB (177.51 kB gzip), CSS 58.53 kB (15.57 kB gzip). Vite emitted a chunk-size warning over 500 kB.

### Test coverage assessment

- Present: shared schema/unit tests, backend unit/service tests, API tests with Supertest, frontend component/integration tests, authentication/authorization and collaboration tests.
- Production code is exercised in many tests, not merely represented by empty test files.
- Absent: OpenTripMap tests, hard-budget/reference-cost tests, updated preference tests, prompt-injection tests, privacy/account deletion tests, admin tests, provenance enforcement tests, migration execution checks, live MySQL integration tests, and browser end-to-end tests.
- No Playwright, linting, type checking, CI workflow, migration runner/check, or structured logging is configured.
- MySQL live behavior is `CANNOT VERIFY` because no local MySQL server or Docker runtime was available and the default application path is memory mode.

## M. Priority Development Plan

### P0 - Must fix for objectives to work

1. Freeze a shared updated request/output/provenance contract and restrict generation to Beijing, Shanghai, and Xi'an.
2. Add OpenTripMap retrieval and fail-closed attraction grounding with cached source metadata.
3. Add six-category cost-reference data and deterministic CNY budget calculation.
4. Implement the three approved spending strategies and enforce the same hard total budget.
5. Compose the semantic validation pipeline and controlled retry/safe-failure behavior.
6. Fix shared guest identity and favorite object-level authorization before multi-user evaluation.

### P1 - Required for FYP MVP

1. Update the form, prompt, repositories, and UI for all mandatory preferences and traveller count.
2. Store and display provenance, verification status, retrieval dates, and estimate labels.
3. Add privacy notice/LLM consent, account deletion, and complete trip rename/delete/regenerate controls.
4. Add minimal administrator identity and protected user/destination/attraction/cost-reference management.
5. Add secure error handling and redacted structured logging.
6. Disable or isolate out-of-scope public sharing, nationwide data paths, and synthetic ticket claims.

### P2 - Required for reliability/evaluation

1. Add provider contract tests, OpenTripMap failure/cache tests, adversarial prompt tests, validator tests, hard-budget property/boundary tests, and ownership regressions.
2. Add browser end-to-end tests for registration, generation, three alternatives, save/edit/delete, labels, and failure states.
3. Add a repeatable migration runner/check and MySQL integration test environment.
4. Add linting, type checking or stronger runtime-contract checks, CI, dependency remediation, and security scans.
5. Remove simulated pipeline claims or connect progress text to real backend stages.

### P3 - Optional future improvement

1. Optimize bundle splitting and non-critical performance.
2. Retain collaborative planning/expense splitting as a separately approved extension.
3. Add richer map clustering or routing only after the stated MVP is complete; advanced route optimization remains out of scope.
4. Expand destinations only after the three-city source/cost pipeline is validated.

## N. Final Objective Coverage

| Objective | Approximate Completion | Main Remaining Work |
| --------- | ---------------------: | ------------------- |
| Objective 1: Security and Privacy | 45% | Fix guest/favorite isolation, add admin authorization, consent/privacy, account deletion, injection screening, secure logging, and client route protection |
| Objective 2: Constraint-Aware Personalised Itineraries | 30% | Complete input contract, three approved strategies, reference-cost budget engine, hard-budget enforcement, semantic validation, and controlled regeneration |
| Objective 3: OpenTripMap Grounding | 5% | Implement the provider, cache/schema, three-city enforcement, fail-closed matching, provenance recording, labels, and tests |

These percentages credit only verified reusable implementation and working behavior. Existing Huangshan/Mafengwo ingestion and old guide/share features are not counted toward the updated Objective 3 or as missing requirements.
