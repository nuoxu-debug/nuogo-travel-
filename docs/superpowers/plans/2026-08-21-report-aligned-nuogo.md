# Report-Aligned Nuogo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Nuogo's dual demo/legacy architecture with one report-aligned, OpenTripMap-grounded, MySQL-persisted itinerary and budget planning system and resolve opaque generation failures.

**Architecture:** One Express generation route validates and screens preferences, retrieves an authoritative OpenTripMap allow-list, obtains three DeepSeek JSON drafts through OpenRouter, validates them with Ajv plus semantic validators, calculates deterministic MySQL-backed budgets, performs bounded repair, persists provenance, and serves focused React comparison/workspace/admin/profile screens. Memory/demo dependencies remain injectable for automated tests only.

**Tech Stack:** React 18, Vite 5, Tailwind CSS, Express 4, MySQL 8-compatible SQL, express-validator, Ajv, OpenRouter, OpenTripMap, JWT, bcryptjs, Leaflet/OpenStreetMap, Vitest, Supertest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-21-report-aligned-nuogo-design.md`

## Global Constraints

- Work only on `feat/report-aligned-nuogo`; retain `backup/pre-report-alignment-2026-08-21`; never merge into `main`.
- Support only Beijing, Shanghai, and Xi'an.
- Do not fabricate provider, price, stakeholder, or verification evidence.
- Use TDD for every behavior change and small reviewable commits.
- Keep all three variants under the same hard user budget.
- Do not add booking, payment, weather, navigation, social, commercial-price, currency, nationwide, or advanced route-optimization features.
- Do not remove a legacy dependency until its replacement passes and repository references are classified.

---

### Task 1: Normalize Generation Failures and Collapse Route Selection

**Files:**
- Modify: `server/src/routes/trips.js`
- Modify: `server/src/app.js`
- Modify: `client/src/api/client.js`
- Modify: `client/src/pages/PlannerPage.jsx`
- Modify: `client/src/i18n/translations.js`
- Test: `server/tests/objective-generation.test.js`
- Test: `server/tests/api.test.js`
- Test: `client/tests/planner.test.jsx`

**Interfaces:**
- Produces: `generationFailure(code, message, actionHints, validation)` using the standard `{ error }` API envelope.
- Produces: one `POST /api/trips/generate` path that always parses the final preference request and calls `objectivePlanner`.

- [ ] Add API tests proving bodies without `totalBudgetCny` fail request validation instead of entering legacy generation, and failed planner results return localized-safe `GENERATION_CONSTRAINTS_UNSATISFIED` details.
- [ ] Run `npm.cmd --workspace server test -- objective-generation.test.js api.test.js` and confirm the new assertions fail.
- [ ] Remove request-body shape dispatch, normalize the 422 error envelope, and preserve machine-readable validation issue codes without provider stack/details.
- [ ] Add a planner component test proving a 422 renders a localized actionable message rather than “Nuogo could not complete this request.”
- [ ] Run the targeted server/client tests and then `npm.cmd test`.
- [ ] Commit: `fix: make itinerary generation failures actionable`.

### Task 2: Establish Final Request and Draft Validation Boundaries

**Files:**
- Modify: `server/package.json`, `package-lock.json`
- Create: `server/src/validation/requestValidators.js`
- Create: `server/src/validation/validateRequest.js`
- Create: `shared/itinerary.schema.json`
- Create: `server/src/services/llm/validateDraftStructure.js`
- Modify: auth, trip, profile, itinerary-edit, and admin routes
- Test: `server/tests/request-validation.test.js`
- Test: `server/tests/llm-harness.test.js`

**Interfaces:**
- Produces: `validateRequest(chains)` Express middleware wrapping `validationResult()`.
- Produces: `validateDraftStructure(value): { valid, errors, data }` backed by one compiled Ajv schema.

- [ ] Add failing request tests for negative budget, invalid travellers/date windows/city, oversized text, malformed auth/profile/admin input, and sanitization.
- [ ] Install `express-validator` and `ajv`; implement centralized chains and route middleware.
- [ ] Add failing draft tests for malformed JSON shape, unknown fields, missing days/xid, invalid dates, and wrong profile.
- [ ] Implement canonical JSON Schema and Ajv validation before semantic parsing; remove overlapping Zod contracts only after import searches prove they are unused.
- [ ] Run validation, shared-contract, API, and LLM tests.
- [ ] Commit: `feat: align request and draft validation contracts`.

### Task 3: Activate Prompt-Injection Screening and Consent

**Files:**
- Modify: `server/src/services/promptInjection.js`
- Modify: `server/src/routes/trips.js`
- Modify: `server/src/repositories/memory.js`, `server/src/repositories/mysql.js`
- Modify: `client/src/pages/PlannerPage.jsx`
- Test: `server/tests/security-objectives.test.js`
- Test: `client/tests/planner.test.jsx`

**Interfaces:**
- Produces: `screenTravelPreferences(preferences)` returning normalized safe data or throwing `PROMPT_INJECTION_REJECTED`.
- Consumes: `repository.recordPrivacyConsent(userId, { type, version, accepted })` before generation.

- [ ] Add failing tests proving relevant free text is screened, ordinary destination text remains accepted, and suspicious input never reaches the planner.
- [ ] Wire screening after request normalization and before retrieval/prompt construction.
- [ ] Add failing tests proving consent is persisted exactly once before an external generation attempt and is absent when validation fails.
- [ ] Connect consent persistence and localized error behavior.
- [ ] Run security, generation, and planner tests.
- [ ] Commit: `feat: enforce generation consent and injection screening`.

### Task 4: Make MySQL the Normal Runtime Repository

**Files:**
- Modify: `server/src/config.js`, `server/src/index.js`, `.env.example`
- Create: `server/src/runtime/createRepository.js`
- Create: `server/tests/runtime-config.test.js`
- Create: `server/tests/integration/mysql.integration.test.js`
- Modify: `package.json`, `server/package.json`

**Interfaces:**
- Produces: `createRepository(config, { testRepository })`; normal modes require MySQL, test mode accepts explicit memory injection.
- Produces: opt-in `npm run test:integration` that skips with a clear reason when credentials are absent.

- [ ] Add failing config tests proving development/production cannot silently select memory and missing MySQL settings fail clearly.
- [ ] Implement explicit `APP_RUNTIME_MODE=live|demo|test`; default normal start is `live`, while automated tests inject memory.
- [ ] Restore `.env.example` with placeholder-only MySQL/OpenTripMap/OpenRouter/JWT variables.
- [ ] Add an opt-in MySQL connectivity/migration smoke test without credentials in source.
- [ ] Run config, repository, API, and integration-skip tests.
- [ ] Commit: `refactor: make mysql the normal application persistence`.

### Task 5: Make OpenTripMap the Authoritative Attraction Provider

**Files:**
- Modify: `server/src/providers/travel/openTripMapProvider.js`
- Create: `server/src/services/poi/openTripMapCandidateService.js`
- Modify: `server/src/services/poi/buildCandidatePool.js`
- Modify: `server/src/services/itinerary/generateValidatedTrip.js`
- Modify: `server/src/index.js`, `server/src/config.js`
- Test: `server/tests/travel-providers.test.js`
- Test: `server/tests/poi-pipeline.test.js`
- Test: `server/tests/objective-generation.test.js`

**Interfaces:**
- Produces: `retrieveAttractionCandidates({ destination, settings, signal })` with normalized `{ xid, name, kinds, coordinates, city, sourceUrl, retrievedAt, matchStatus }` records.
- Candidate IDs are OpenTripMap xids; attraction draft entries without an allowed xid fail.

- [ ] Add failing tests for radius/list and detail responses, empty/malformed/timeout responses, missing/unknown xid, and hard candidate grounding.
- [ ] Implement city-center/radius lookup from repository destination settings and bounded detail retrieval only where usable.
- [ ] Replace AMap-first matching with OpenTripMap-only attraction candidates; generic meals/accommodation/transfers remain ungrounded typed entries.
- [ ] Replace route-provider dependence with the deterministic travel estimator from Task 6.
- [ ] Run provider, POI, generation, and scope tests.
- [ ] Commit: `feat: make opentripmap authoritative for attractions`.

### Task 6: Add Deterministic Travel-Time and Daily-Density Validation

**Files:**
- Create: `server/src/services/travel/haversine.js`
- Create: `server/src/services/travel/estimateTravelTime.js`
- Modify: `server/src/services/itinerary/buildTripLegs.js`
- Create: `server/src/services/validation/validators/dailyDensityValidator.js`
- Modify: `server/src/services/validation/validationEngine.js`
- Modify: `server/src/services/repair/deterministicRepair.js`
- Test: `server/tests/travel-estimator.test.js`
- Test: `server/tests/validation-engine.test.js`

**Interfaces:**
- Produces: `estimateTravelLeg({ from, to, mode })` with Haversine distance, centralized speed/wait assumptions, and `sourceType: "ESTIMATED"`.
- Produces: density issues carrying `availableMinutes`, `meaningfulEntries`, `attractionEntries`, and `reason`.

- [ ] Add red tests for walking/public/taxi estimates and source labels.
- [ ] Implement finite-coordinate Haversine and documented assumptions.
- [ ] Add red tests for full, medium, short, slow-pace, long-attraction, and candidate-scarcity density cases.
- [ ] Implement density validation and bounded repair/regeneration signals without filler activities.
- [ ] Run travel, validation, repair, and objective generation tests.
- [ ] Commit: `feat: validate estimated travel and daily itinerary density`.

### Task 7: Complete Deterministic Budget References and Profile Differentiation

**Files:**
- Add migration: `database/migrations/010_report_aligned_core.sql`
- Modify: `server/src/services/budget/costReferenceService.js`
- Modify: `server/src/services/budget/budgetEngine.js`
- Modify: `server/src/services/budget/spendingProfiles.js`
- Modify: `server/src/services/validation/validators/spendingProfileValidator.js`
- Modify: `server/src/services/itinerary/buildVariantMetrics.js`
- Test: `server/tests/budget-engine.test.js`
- Test: `server/tests/validation-engine.test.js`
- Test: `server/tests/objective-generation.test.js`

**Interfaces:**
- Cost reference: `{ id, city, category, tier, minFen, maxFen, representativeFen, currency, sourceName, sourceUrl, collectedOn, updatedAt, status }`.
- Profile validation centralizes minimum total/category deltas and may return `PROFILE_DIFFERENTIATION_UNAVAILABLE`.

- [ ] Add migration tests for complete reference metadata/status and no fabricated seed values.
- [ ] Add red tests for all categories, traveller/night/room treatment, profile tiers, hard budget, missing/unavailable references, and ordered totals where feasible.
- [ ] Implement reference selection and deterministic formulas; remove any draft-authored cost input.
- [ ] Implement monetary/category/composition differentiation with a tested centralized threshold and explicit impossible-case failure.
- [ ] Run migration, budget, validation, generation, and admin API tests.
- [ ] Commit: `feat: complete deterministic spending profiles and references`.

### Task 8: Complete Provenance, Repair Records, and Safe Persistence

**Files:**
- Modify migration 010 if not yet applied in any environment
- Modify: `server/src/repositories/mysql.js`, `server/src/repositories/memory.js`
- Modify: `server/src/services/itinerary/generateValidatedTrip.js`
- Modify: `server/src/services/repair/repairLoop.js`
- Modify: `client/src/components/ObjectiveTripWorkspace.jsx`, `ActivityModal.jsx`, `TripLegRow.jsx`
- Test: repository, generation, and objective workspace tests

**Interfaces:**
- Provenance uses the six approved source categories and stores match/verification status separately.
- Repair records contain attempt number, issue codes, repair action, and final state.

- [ ] Add failing repository tests for atomic trip, provenance, validation, and repair persistence.
- [ ] Persist source and repair records in one trip transaction; reject incomplete attraction provenance.
- [ ] Add failing UI tests separating OpenTripMap facts, AI rationale, and deterministic estimates.
- [ ] Implement visible labels without claiming real-time/current verification.
- [ ] Run repository, generation, and workspace tests.
- [ ] Commit: `feat: persist and display itinerary provenance`.

### Task 9: Complete Profile, JWT Expiry, Privacy, and Retention

**Files:**
- Add migration: `database/migrations/011_profile_privacy_retention.sql`
- Create: `server/src/routes/profile.js`
- Modify: `server/src/services/authService.js`, auth middleware, repositories, privacy route
- Create: `client/src/pages/ProfilePage.jsx`
- Modify: `client/src/App.jsx`, `AuthContext.jsx`, navigation, translations
- Create: `docs/DATA_RETENTION.md`
- Test: auth/security/API/profile component tests

**Interfaces:**
- `GET/PATCH /api/profile`, `POST /api/profile/password`, authenticated account deletion with current password for registered users.
- Expired JWT returns `AUTH_TOKEN_EXPIRED`; client clears token and redirects to `/login`.

- [ ] Add red API tests for profile read/update, current-password change, wrong password, expired token, and reauthenticated deletion.
- [ ] Implement backend profile and lifecycle transactions that remove/anonymize related identifiable records.
- [ ] Add red frontend tests for profile forms and expired-session redirect.
- [ ] Implement focused profile UI and retention documentation matching behavior.
- [ ] Run auth, security, API, and profile tests.
- [ ] Commit: `feat: complete account and privacy lifecycle`.

### Task 10: Complete Objective Itinerary Edit and Versioned Regeneration

**Files:**
- Create: `server/src/services/itinerary/revalidateEditedTrip.js`
- Create/modify: objective itinerary edit routes
- Modify: repositories and `ObjectiveTripWorkspace.jsx`
- Test: API, repository, workspace, and budget tests

**Interfaces:**
- `PATCH /api/trips/:tripId/entries/:entryId` validates xid/type/time/duration, rebuilds legs, recalculates budget, reruns validators, and atomically persists only valid state.
- `POST /api/trips/:tripId/regenerate` creates a new version linked by `parentTripId` and accepts validated preference changes.

- [ ] Add red API tests for valid edits and rejected unknown xid, overlap, cross-user, over-budget, and stale revision edits.
- [ ] Implement transactional revalidation and persistence.
- [ ] Add red UI tests for edit/save status, rejected edits, preference changes, and versioned regeneration.
- [ ] Implement objective workspace editing without exposing legacy editor behavior.
- [ ] Run API, repository, objective workspace, and generation suites.
- [ ] Commit: `feat: complete validated itinerary editing and regeneration`.

### Task 11: Complete Protected Administration

**Files:**
- Extend migration 010/011 or add `012_admin_system_records.sql`
- Modify: `server/src/routes/admin.js`, repositories, logger/system-record service
- Create: `client/src/pages/AdminPage.jsx` and focused admin components
- Modify: router/navigation/translations
- Test: `server/tests/admin-api.test.js`, new admin frontend tests

**Interfaces:**
- Admin endpoints cover users/status, destinations/settings, cached OpenTripMap records, cost references, and sanitized system records.
- `GET /api/auth/me` includes role for navigation only; every admin API still enforces server RBAC.

- [ ] Add red API tests for all admin capabilities, non-admin denial, and secret-free system records.
- [ ] Implement repository/API operations and status validation.
- [ ] Add red component tests for protected route, CRUD forms, stale/error states, and source dates.
- [ ] Implement `/admin` as a quiet operational interface.
- [ ] Run admin API/frontend, auth, and repository tests.
- [ ] Commit: `feat: complete report-aligned administration`.

### Task 12: Remove Legacy Runtime and Dependencies

**Files:**
- Remove traced legacy server services/routes/providers/ingestion and client pages/components
- Modify: `server/src/app.js`, `server/src/index.js`, `client/src/App.jsx`, package manifests
- Add migration: `database/migrations/013_remove_legacy_subsystems.sql`
- Update/remove tests that only assert deleted behavior

**Interfaces:**
- Final runtime exposes auth/profile/privacy, metadata, objective trips/entries, admin, and health only.
- Retain archive/saved itinerary management; remove favorites as a separate product concept.

- [ ] Search imports/routes/tables for collaboration, invitation, expense, share, vote, favorite, guide, Huangshan, Mafengwo, SQL.js, AMap, and legacy generator/budget.
- [ ] Add/adjust scope tests asserting removed routes return 404 and removed frontend routes are absent.
- [ ] Remove legacy composition and UI after replacement suites pass.
- [ ] Remove `sql.js`, AMap config/provider, ingestion scripts/dependencies used only by deleted code, and competing schemas/services.
- [ ] Add non-destructive cleanup migration for obsolete tables; never rewrite prior migrations.
- [ ] Run full unit/API/component suite and build.
- [ ] Commit: `refactor: remove legacy nuogo subsystems`.

### Task 13: Fix Stable E2E Journeys and Live Integration Hooks

**Files:**
- Modify: `tests/e2e/landing-flight-atlas.spec.js`, `tests/e2e/objective-journey.spec.js`
- Create: `tests/e2e/admin-journey.spec.js`
- Modify: Playwright/config/test setup and package scripts
- Add opt-in OpenTripMap/OpenRouter integration tests

**Interfaces:**
- E2E selects language explicitly or uses roles/test IDs, never assumes English while the app defaults Chinese.
- Integration tests are skipped unless explicit live-test variables are present.

- [ ] Rewrite failing selectors around stable roles/test IDs and set language deliberately per scenario.
- [ ] Cover registration/login, three-city planning, three valid differentiated alternatives, select/workspace/budget/source/map, edit/save/regenerate/archive/delete.
- [ ] Cover admin login, cost-reference update, and generation consuming the updated reference.
- [ ] Add opt-in live provider contract tests with safe sanitized output.
- [ ] Run `npm.cmd run test:e2e` and integration tests; resolve every critical-journey failure by root cause.
- [ ] Commit: `test: align critical journeys with final nuogo workflow`.

### Task 14: Final Verification and Implementation Report

**Files:**
- Create: `docs/audits/FINAL_REPORT_ALIGNMENT_IMPLEMENTATION.md`
- Update current architecture/API/security setup docs only where they describe the final runtime

**Interfaces:**
- Report statuses: `IMPLEMENTED`, `PARTIAL`, `NOT CODE-APPLICABLE`, `BLOCKED BY EXTERNAL EVIDENCE`.

- [ ] Search runtime remnants for AMap, Mafengwo, Huangshan, GuidePanel, tour guide, collaboration, invitation, expense, share, vote, favorite, `sql.js`, missing-ID grounding bypass, legacy generator, and legacy budget; classify every remaining historical/test reference.
- [ ] Run `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run test:e2e`, and opt-in integration checks where credentials exist.
- [ ] Inspect tracked files and `.env.example` for credential exposure without printing values.
- [ ] Verify MySQL operation only if an actual configured database is available; otherwise mark it `BLOCKED BY EXTERNAL EVIDENCE`.
- [ ] Verify current OpenRouter DeepSeek facts only from official sources and include verification date; mark unavailable facts blocked.
- [ ] Create the final report with architecture, removals, compliance, database, OpenTripMap, LLM, budget, security, tests, and non-code stakeholder evidence.
- [ ] Commit: `docs: finalize report-aligned nuogo implementation`.

## Plan Self-Review

- Every specification phase maps to at least one task.
- Replacement tests precede legacy deletion.
- MySQL and live-provider claims require actual integration evidence.
- The generation screenshot is addressed by a standard 422 contract and localized safe failure before provider changes.
- No task fabricates cost, provider, questionnaire, or stakeholder evidence.
- No task adds excluded product functionality.
