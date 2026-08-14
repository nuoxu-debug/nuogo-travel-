# Nuogo Objective-Aligned MVP Implementation Plan

> **Visual checkpoint (2026-08-14):** The Living Journey Atlas work is verified: 332 tests passed, the production build succeeded, and Playwright passed 13 checks with one intentional desktop-only skip. Tasks 4-11 and 13-16 below remain the active objective implementation scope; the visual checkpoint does not mark those tasks complete.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the current three FYP objectives as a secure, grounded, hard-budget travel planner for Beijing, Shanghai, and Xi'an, while rebuilding Nuogo's interface as a modern animated travel product with GSAP and a scroll-driven journey atlas.

**Architecture:** Preserve the `client`/`server`/`shared` workspaces, Zod contract boundary, Express application, repository modes, and reusable itinerary UI. Add narrow domain services for canonical POIs, external providers, routing, deterministic costing, validation, repair, and provenance; the orchestration service is the only layer allowed to combine them. The browser renders validated DTOs and never calls AMap, OpenTripMap, or OpenRouter directly.

**Tech Stack:** React 18, Vite, Tailwind CSS, GSAP, Leaflet/OpenStreetMap, Node.js, Express, Zod, MySQL/mysql2, SQL.js test/demo adapter, OpenRouter, AMap, OpenTripMap, Vitest, Supertest, Playwright.

## Global Constraints

- Preserve `client`, `server`, and `shared`; do not rewrite the application from scratch.
- Supported MVP destinations are exactly Beijing, Shanghai, and Xi'an.
- All variants are `BUDGET_SAVING`, `BALANCED`, and `COMFORT_FOCUSED`, and every final variant must satisfy `estimatedTotalCost <= totalBudgetCny`.
- Zod remains the shared contract library. JSON Schema is isolated to the raw LLM response boundary.
- AMap is the primary China POI/routing provider; OpenTripMap is a genuine supporting tourism provider.
- API keys remain server-side, environment-configured, absent from logs, frontend bundles, and tracked credentials.
- Only `FINAL_VALIDATED` itineraries are presented as completed.
- No advanced route optimisation, booking, payment, live fares, weather, traffic, or human tour-guide feature is introduced.
- GSAP motion communicates sequence/state and respects `prefers-reduced-motion`; the landing journey atlas uses generic departure/stop labels and presentation-only generated artwork.

---

### Task 1: Canonical Shared Contracts

**Files:**
- Modify: `shared/constants.js`
- Modify: `shared/schemas.js`
- Modify: `shared/contracts.test.js`
- Create: `shared/itineraryDraftSchema.js`

**Interfaces:**
- Produces: `spendingProfiles`, `supportedDestinations`, `travelPreferenceSchema`, `canonicalPoiSchema`, `tripLegSchema`, `itineraryDraftSchema`, `finalItinerarySchema`.
- Consumes: Existing bilingual text and activity conventions where still useful.

- [x] **Step 1: Write failing contract tests** for all mandatory preference fields, exact three-city validation, three profile values, canonical provenance, trip-leg source fields, and strict rejection of LLM-authored costs/coordinates.
- [x] **Step 2: Run `npm --workspace shared test`** and confirm failures are caused by missing exports/contracts.
- [x] **Step 3: Implement the Zod contracts** with strict objects and a JSON Schema export for the raw itinerary draft. The draft activity contains `poiId`, sequence, duration, reason, and requested activity type only.
- [x] **Step 4: Run `npm --workspace shared test`** and confirm all shared tests pass.
- [x] **Step 5: Commit** with `feat(shared): define objective-aligned travel contracts`.

### Task 2: Security and Privacy Foundation

**Files:**
- Modify: `server/src/services/authService.js`
- Modify: `server/src/routes/favorites.js`
- Modify: `server/src/config.js`
- Modify: `server/src/app.js`
- Create: `server/src/services/promptInjection.js`
- Create: `server/src/services/logger.js`
- Create: `server/src/routes/privacy.js`
- Create: `database/migrations/006_security_privacy.sql`
- Modify: `server/tests/api.test.js`
- Create: `server/tests/security-objectives.test.js`

**Interfaces:**
- Produces: `screenPromptInput(preferences) -> { safe, code, fields }`, `logger.info/warn/error(event, metadata)`, privacy notice/consent/deletion routes.
- Consumes: `authenticate`, `tripAccess`, repository ownership methods.

- [x] **Step 1: Write failing security tests** proving separate guest identities, favorite trip authorization, generic 500 responses, redacted secrets, injection classification, consent capture, and account deletion.
- [x] **Step 2: Run the focused server tests** and verify the expected authorization/privacy failures.
- [x] **Step 3: Implement minimal fixes**: per-session guest subject in demo mode, trip authorization before favorites, production-secret enforcement, structured redaction, generic internal errors, prompt screening, and authenticated consent/deletion endpoints.
- [x] **Step 4: Run focused and full server tests** and confirm 401/403 behavior and no secret-bearing output.
- [x] **Step 5: Commit** with `fix(security): enforce privacy and object authorization boundaries`.

### Task 3: MySQL Domain Migrations and Repository Contracts

**Files:**
- Create: `database/migrations/007_objective_aligned_mvp.sql`
- Create: `database/migrations/008_objective_aligned_seed.sql`
- Modify: `server/src/repositories/memory.js`
- Modify: `server/src/repositories/mysql.js`
- Modify: `server/tests/repository-contract.test.js`
- Create: `server/src/repositories/migrations.js`
- Create: `server/tests/migrations.test.js`

**Interfaces:**
- Produces repository methods for roles, consent, supported destinations, canonical POIs/source records, route cache, cost references, final itinerary state, legs, provenance, validation summaries, and repairs.

- [x] **Step 1: Write failing repository-contract and migration-order tests** for every new entity and owner/admin boundary.
- [x] **Step 2: Run tests and confirm missing repository methods/migrations fail.**
- [x] **Step 3: Add additive migrations and matching memory/MySQL methods** without deleting historical migrations. Store money as integer fen and timestamps in UTC.
- [x] **Step 4: Run repository and migration tests.**
- [x] **Step 5: Commit** with `feat(database): add grounded itinerary domain storage`.

### Task 4: Travel Provider Abstractions and Resilience

**Files:**
- Create: `server/src/providers/travel/providerError.js`
- Create: `server/src/providers/travel/httpClient.js`
- Create: `server/src/providers/travel/amapProvider.js`
- Create: `server/src/providers/travel/openTripMapProvider.js`
- Create: `server/src/providers/travel/demoTravelProvider.js`
- Modify: `server/src/config.js`
- Modify: `.env.example`
- Create: `server/tests/travel-providers.test.js`

**Interfaces:**
- `searchPois({ city, categories, signal }) -> RawPoi[]`
- `getRoute({ from, to, mode, city, signal }) -> RawRoute`
- `enrichTourism({ city, coordinates, radiusMeters, signal }) -> RawTourismRecord[]`
- Provider errors expose stable codes: `PROVIDER_UNAVAILABLE`, `PROVIDER_RATE_LIMITED`, `PROVIDER_AUTH_FAILED`, `ROUTE_UNAVAILABLE`.

- [x] **Step 1: Write failing provider tests** for mapping, server-only keys, timeout, transient retry, permanent 4xx no-retry, rate limits, malformed responses, and deterministic demo fixtures.
- [x] **Step 2: Run provider tests and verify missing implementations fail.**
- [x] **Step 3: Implement the adapters** with injected `fetch`, `AbortController`, bounded retry, Zod response parsing, and no fabricated success fallback.
- [x] **Step 4: Run tests and scan the client bundle sources for provider key names.**
- [x] **Step 5: Commit** with `feat(travel-data): add AMap and OpenTripMap adapters`.

### Task 5: Canonical POIs, Matching, and Candidate Pool

**Files:**
- Create: `server/src/services/poi/normalizeAmapPoi.js`
- Create: `server/src/services/poi/normalizeOpenTripMapPoi.js`
- Create: `server/src/services/poi/matchPois.js`
- Create: `server/src/services/poi/buildCandidatePool.js`
- Create: `server/tests/poi-pipeline.test.js`

**Interfaces:**
- `normalizeAmapPoi(raw, context) -> CanonicalPoi`
- `normalizeOpenTripMapPoi(raw, context) -> SourceRecord`
- `matchPois(primary, supporting, threshold) -> CanonicalPoi[]`
- `buildCandidatePool(preferences, canonicalPois) -> ApprovedCandidatePool`

- [x] **Step 1: Write failing tests** for IDs, categories, coordinates, city isolation, distance/name/category matching, ambiguous/unmatched states, retrieval timestamps, and stable candidate IDs.
- [x] **Step 2: Verify red.**
- [x] **Step 3: Implement normalization and conservative matching**; AMap remains operational primary and unmatched OpenTripMap records are never fabricated as support.
- [x] **Step 4: Verify green and run shared/provider tests.**
- [x] **Step 5: Commit** with `feat(poi): build grounded candidate pool`.

### Task 6: Cost References and Deterministic Budget Engine

**Files:**
- Create: `server/src/services/budget/costReferenceService.js`
- Create: `server/src/services/budget/fuelCalculator.js`
- Create: `server/src/services/budget/budgetEngine.js`
- Create: `server/src/services/budget/spendingProfiles.js`
- Deprecate production use of: `server/src/services/budget.js`
- Create: `server/tests/budget-engine.test.js`

**Interfaces:**
- `calculateDrivingCost({ distanceKm, fuelConsumptionLitresPer100Km, fuelPricePerLitre, tollCny, parkingCny })`
- `calculateItineraryBudget({ preferences, itinerary, references, profile }) -> BudgetSummary`
- `validateHardBudget(summary, totalBudgetCny) -> ValidationResult`

- [x] **Step 1: Write failing tests** for eight trip-level categories, per-person values, fixed outbound/return costs, nights, meals, fuel/tolls, missing-reference errors, all three allocations, and impossible budgets.
- [x] **Step 2: Verify red.**
- [x] **Step 3: Implement integer-fen calculations** using only user-provided, provider-sourced, or active reference values with explicit provenance.
- [x] **Step 4: Verify green and add boundary/property-style cases for rounding.**
- [x] **Step 5: Commit** with `feat(budget): enforce deterministic hard trip budget`.

### Task 7: Fixed LLM Harness and Structured Draft

**Files:**
- Modify: `server/src/providers/openRouter.js`
- Replace production path in: `server/src/services/promptBuilder.js`
- Create: `server/src/services/llm/itineraryHarness.js`
- Create: `server/src/services/llm/buildItineraryPrompt.js`
- Create: `server/src/services/llm/parseDraft.js`
- Create: `server/tests/llm-harness.test.js`

**Interfaces:**
- `planDraft({ preferences, profile, candidatePool }) -> ItineraryDraft`
- User text appears only inside a serialized `UNTRUSTED_USER_DATA` object; candidate POIs are ID-addressable.

- [x] **Step 1: Write failing tests** for fixed schema, candidate IDs, strategy rules, low temperature, structured-output capability gating, unknown IDs, no sensitive account fields, and malicious preference text.
- [x] **Step 2: Verify red.**
- [x] **Step 3: Implement the harness** around the existing provider with strict response format when supported and mandatory local Zod validation always.
- [x] **Step 4: Verify green and retain existing OpenRouter timeout tests.**
- [x] **Step 5: Commit** with `feat(ai): constrain OpenRouter itinerary drafts`.

### Task 8: Trip Legs, Scheduling, and Validation Engine

**Files:**
- Create: `server/src/services/itinerary/buildTripLegs.js`
- Create: `server/src/services/itinerary/propagateSchedule.js`
- Create: `server/src/services/validation/validationEngine.js`
- Create: `server/src/services/validation/validators/*.js`
- Create: `server/tests/validation-engine.test.js`

**Interfaces:**
- Validators return `{ code, path, severity, metadata }` without chain-of-thought.
- Required codes include `UNKNOWN_POI`, `LOCATION_CONTINUITY_ERROR`, `TRAVEL_TIME_CONFLICT`, `TIME_OVERLAP`, `DAILY_DURATION_EXCEEDED`, `ARRIVAL_CONSTRAINT_VIOLATION`, `DEPARTURE_CONSTRAINT_VIOLATION`, `BUDGET_EXCEEDED`, and `ROUTE_UNAVAILABLE`.

- [ ] **Step 1: Write failing tests** for POI whitelist, duplicate detection, consecutive-day continuity, first/final day boundaries, route enrichment, time propagation, overlap, date range, daily duration, and route unavailability.
- [ ] **Step 2: Verify red.**
- [ ] **Step 3: Implement pure validators and deterministic propagation**; no missing route duration/cost becomes zero.
- [ ] **Step 4: Verify green.**
- [ ] **Step 5: Commit** with `feat(validation): enforce continuous feasible itineraries`.

### Task 9: Repair Loop and Finalisation

**Files:**
- Create: `server/src/services/repair/deterministicRepair.js`
- Create: `server/src/services/repair/targetedLlmRepair.js`
- Create: `server/src/services/repair/repairLoop.js`
- Create: `server/tests/repair-loop.test.js`

**Interfaces:**
- `repairUntilValid(context, { maxAttempts: 3 }) -> { state, itinerary, summary, attempts }`
- Derived route/schedule/budget values are invalidated after dependency changes.

- [ ] **Step 1: Write the seven required failing repair tests** from the authoritative brief, including stale-route invalidation and three-attempt safe failure.
- [ ] **Step 2: Verify red.**
- [ ] **Step 3: Implement deterministic repair first**, then a constrained semantic repair request carrying codes and allowed candidate IDs only.
- [ ] **Step 4: Verify green and assert invalid plans never become `FINAL_VALIDATED`.**
- [ ] **Step 5: Commit** with `feat(repair): finalize only validated itineraries`.

### Task 10: Objective-Aligned Generation Orchestration

**Files:**
- Replace production flow in: `server/src/services/generator.js`
- Modify: `server/src/routes/trips.js`
- Modify: `server/src/index.js`
- Create: `server/src/services/itinerary/generateValidatedTrip.js`
- Create: `server/tests/objective-generation.test.js`

**Interfaces:**
- `generateValidatedTrip(preferences, dependencies) -> { trip, variants, validation }`
- Each variant independently runs candidate selection, draft, enrichment, deterministic cost, validation, repair, and final persistence.

- [ ] **Step 1: Write failing Beijing, Shanghai, Xi'an, driving, impossible-budget, and provider-failure integration tests.**
- [ ] **Step 2: Verify red.**
- [ ] **Step 3: Wire the production pipeline in the required order** and persist only final validated variants or a safe failed-generation record.
- [ ] **Step 4: Verify green and assert every accepted total is within the same user budget.**
- [ ] **Step 5: Commit** with `feat(planning): orchestrate grounded hard-budget variants`.

### Task 11: Administration API

**Files:**
- Create: `server/src/middleware/authorizeRole.js`
- Create: `server/src/routes/admin.js`
- Modify: `server/src/app.js`
- Create: `server/tests/admin-api.test.js`

**Interfaces:**
- Admin CRUD is limited to supported destinations, POI/source metadata, cost/fuel references, dates, and `ACTIVE`/`OUTDATED`/`UNAVAILABLE` status.

- [ ] **Step 1: Write failing role and CRUD tests**, including normal-user denial and validation of source/date/status fields.
- [ ] **Step 2: Verify red.**
- [ ] **Step 3: Implement the minimal protected routes and repository calls.**
- [ ] **Step 4: Verify green.**
- [ ] **Step 5: Commit** with `feat(admin): manage travel reference data`.

### Task 12: New Visual System, GSAP Motion, and Scroll-Driven Journey Atlas

**Files:**
- Modify: `DESIGN.md`
- Modify: `client/package.json`
- Modify: `client/src/styles/index.css`
- Modify: `client/tailwind.config.js`
- Create: `client/src/motion/useGsapContext.js`
- Create: `client/src/components/ScrollJourneyMap.jsx`
- Create: `client/src/components/RouteConstellation.jsx`
- Modify: `client/src/layout/AppShell.jsx`
- Modify: `client/src/pages/LandingPage.jsx`
- Create: `client/tests/landing-flight-atlas.test.jsx`
- Modify: `client/tests/motion-components.test.jsx`

**Interfaces:**
- `ScrollJourneyMap()` renders a responsive journey route with generic waypoints and a semantic reduced-motion state.
- GSAP contexts clean up on unmount and all timeline content is visible immediately under reduced motion.

- [x] **Step 1: Write failing component and browser tests** for generic route labels, reduced motion, cleanup, nonblank artwork, route progress, responsive overflow, and keyboard-safe content.
- [x] **Step 2: Verify red.**
- [x] **Step 3: Install `gsap`, record the Living Journey Atlas design system, and implement the pinned map** with route drawing, active waypoints, a moving plane, image parallax, and a static reduced-motion state.
- [x] **Step 4: Rebuild the landing page** around real China imagery, route typography, a daylight journey map, and GSAP scroll choreography without nested decorative cards or named showcase cities.
- [x] **Step 5: Verify component/full client and Playwright tests and commit** with `feat(ui): add animated China journey atlas`.

### Task 13: Planner, Comparison, and Generation States

**Files:**
- Modify: `client/src/components/PreferenceForm.jsx`
- Modify: `client/src/components/PipelineOverlay.jsx`
- Modify: `client/src/components/PlanComparison.jsx`
- Modify: `client/src/pages/PlannerPage.jsx`
- Modify: `client/src/pages/ComparePage.jsx`
- Modify: `client/src/i18n/translations.js`
- Modify: `client/tests/planner.test.jsx`
- Modify: `client/tests/workspace.test.jsx`

**Interfaces:**
- Form emits `travelPreferenceSchema` fields.
- Pipeline renders real server states: retrieval, planning, validating, repairing, failure, and `FINAL_VALIDATED`.

- [ ] **Step 1: Write failing UI tests** for every mandatory field, three supported destinations, accessible validation, profile labels, hard-budget summaries, source labels, and all required generation/error states.
- [ ] **Step 2: Verify red.**
- [ ] **Step 3: Rebuild planner as a progressive travel brief** and comparison as three equal, visually distinct but structurally comparable profiles.
- [ ] **Step 4: Remove simulated timing claims and connect UI state to API responses.**
- [ ] **Step 5: Verify green and commit** with `feat(ui): align planner and comparison with validated trips`.

### Task 14: Daily Workspace, Budget, Map, and Management

**Files:**
- Modify: `client/src/components/Timeline.jsx`
- Create: `client/src/components/TripLegRow.jsx`
- Modify: `client/src/components/ActivityCard.jsx`
- Modify: `client/src/components/BudgetPanel.jsx`
- Modify: `client/src/components/LeafletRouteMap.jsx`
- Modify: `client/src/pages/TripWorkspacePage.jsx`
- Modify: `client/src/components/TripArchive.jsx`
- Create: `client/src/components/PrivacyDialog.jsx`
- Modify: `client/tests/workspace.test.jsx`
- Create: `client/tests/objective-workspace.test.jsx`

**Interfaces:**
- Daily sequence is start point, leg, activity/meal, leg, end point.
- Management actions expose rename, edit/revalidate, regenerate, delete, and retrieval with role-aware controls.

- [ ] **Step 1: Write failing tests** for legs, timings, sources, eight budget categories, remaining/per-person values, map ordering, coordinate warning, management actions, privacy consent, and invalidated/revalidating states.
- [ ] **Step 2: Verify red.**
- [ ] **Step 3: Implement the dense operational workspace** using the Flight Atlas system; keep the map compact/sticky and details scannable.
- [ ] **Step 4: Verify green and commit** with `feat(ui): display continuous sourced trips`.

### Task 15: Legacy Isolation and Documentation Alignment

**Files:**
- Modify or remove production references to: `GuidePanel.jsx`, public sharing/voting routes/components, old style constants, `demoCatalog.js`, Anhui planner entries.
- Modify: `PRODUCT.md`
- Modify: `CURRENT_ARCHITECTURE.md`
- Modify: `docs/API.md`
- Create: `docs/OBJECTIVE_ALIGNMENT.md`
- Modify: `.env.example`

**Interfaces:**
- Development demo fixtures remain explicitly tagged `DEMO`; production cannot silently use them.

- [ ] **Step 1: Write failing route/UI tests** proving out-of-scope public paths are disabled in the assessed MVP and demo records are visibly labelled.
- [ ] **Step 2: Verify red.**
- [ ] **Step 3: Isolate legacy functionality and update active documentation** without deleting historical migrations or audit evidence.
- [ ] **Step 4: Run repository-wide searches** for old styles, human guide claims, unsupported city options, and unlabeled demo data.
- [ ] **Step 5: Commit** with `chore(scope): isolate legacy Nuogo features`.

### Task 16: Playwright, CI, Quality, and Final Acceptance

**Files:**
- Modify: root and client/server `package.json` files
- Create: `eslint.config.js`
- Create: `playwright.config.js`
- Create: `e2e/*.spec.js`
- Create: `.github/workflows/ci.yml`
- Create: `docs/LIVE_PROVIDER_VERIFICATION.md`

**Interfaces:**
- Normal CI uses deterministic provider fixtures.
- Live provider suites run only under `RUN_LIVE_TRAVEL_API_TESTS=true` with all required keys.

- [ ] **Step 1: Add failing Playwright scenarios** for authentication, planning, all three under-budget alternatives, management, privacy, and cross-user access.
- [ ] **Step 2: Run E2E and verify red against missing final UI behaviors.**
- [ ] **Step 3: Implement fixtures/configuration and add lint/CI scripts.**
- [ ] **Step 4: Run `npm test`, `npm run build`, `npm run lint`, `npm run test:e2e`, `npm audit`, and `npm audit --omit=dev`.**
- [ ] **Step 5: Start the app and inspect desktop/mobile screenshots plus journey-map pixels, resize, interaction, reduced motion, overlap, localization, and console/network errors.**
- [ ] **Step 6: Run the Impeccable detector once across changed UI targets and resolve valid findings.**
- [ ] **Step 7: Record live-provider verification separately; never claim it passed without keys and executed evidence.**
- [ ] **Step 8: Commit** with `chore: verify objective-aligned Nuogo MVP`.

## Plan Self-Review

- Every requirement in sections 0-89 maps to Tasks 1-16 or a Global Constraint.
- The plan preserves the existing workspace and Zod architecture.
- The provider, LLM, budget, validation, repair, persistence, and UI boundaries have explicit inputs/outputs.
- All production behavior starts with a failing test; documentation/configuration changes are verified by searches/builds.
- Live provider evidence is separated from deterministic CI and remains pending when credentials are unavailable.
- No task adds booking, payment, live fares, weather, navigation, advanced route optimisation, or human tour-guide functionality.
