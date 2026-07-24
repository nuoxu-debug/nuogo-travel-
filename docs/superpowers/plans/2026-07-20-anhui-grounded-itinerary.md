# Anhui Grounded Itinerary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Huangshan selectable and generate three itinerary variants grounded in explicitly approved local attraction records.

**Architecture:** Keep app persistence independent from itinerary-provider choice. A focused attraction catalogue reads approved records from the existing SQLite ingestion database, providers receive that bounded catalogue, and a validator checks every Huangshan activity before persistence or display.

**Tech Stack:** Node.js 20, Express, Zod, sql.js, React 18, Vitest, React Testing Library.

## Global Constraints

- Local testing must not require MySQL.
- Newly ingested attractions remain pending until an explicit review command changes them.
- Huangshan generation uses only active, approved local attractions.
- Existing non-Huangshan destinations keep their current behavior.
- The committed environment example must contain no API secret.
- All production changes follow a failing-test-first cycle.
- Git is unavailable, so test checkpoints replace commits.

---

### Task 1: Shared Huangshan Contracts

**Files:**
- Modify: `shared/constants.js`
- Modify: `shared/schemas.js`
- Modify: `shared/contracts.test.js`

**Interfaces:**
- Produces: a `huangshan` city and optional activity fields `sourceAttractionId`, `sourceProvider`, and `sourceUrl`.

- [ ] Add a shared contract test that parses Huangshan preferences and a grounded activity.
- [ ] Run `npm --workspace shared test` and verify it fails because `huangshan` is unsupported.
- [ ] Add `{ id: "huangshan", name: { en: "Huangshan, Anhui", zh: "安徽黄山" }, countryCode: "CN", center: [118.3376, 29.7147] }`.
- [ ] Extend `activitySchema` with optional source metadata, validating `sourceUrl` as an HTTPS URL.
- [ ] Re-run `npm --workspace shared test` and verify it passes.

### Task 2: Reviewable Attraction Catalogue

**Files:**
- Modify: `server/src/ingestion/sqliteRepository.js`
- Create: `server/src/cli/reviewAttractions.js`
- Create: `server/src/services/attractionCatalogue.js`
- Modify: `server/src/cli/listAttractions.js`
- Modify: `server/package.json`
- Modify: `package.json`
- Modify: `server/tests/ingestion-repository.test.js`
- Create: `server/tests/attraction-catalogue.test.js`

**Interfaces:**
- Produces: `reviewAttractions({ regionId, ids, status })`, region-aware `listAttractions`, and `SqliteAttractionCatalogue.listApproved(destination)`.

- [ ] Add repository tests proving selected Huangshan records can be approved atomically and region filtering excludes other records.
- [ ] Add a catalogue test proving only active approved Huangshan records are returned with source attribution.
- [ ] Run the focused tests and verify the new methods/modules are missing.
- [ ] Add repository review and expanded projection methods.
- [ ] Add the explicit `attractions:review` CLI and region option to the list CLI.
- [ ] Implement `SqliteAttractionCatalogue`, mapping `huangshan` to the `huangshan` region and returning an empty array for other destinations.
- [ ] Re-run focused tests and verify they pass.

### Task 3: Grounded Providers and Output Validation

**Files:**
- Modify: `server/src/providers/demoProvider.js`
- Modify: `server/src/providers/openRouter.js`
- Modify: `server/src/services/promptBuilder.js`
- Modify: `server/src/services/generator.js`
- Create: `server/src/services/grounding.js`
- Modify: `server/tests/generator.test.js`
- Modify: `server/tests/services.test.js`

**Interfaces:**
- Consumes: `options.attractions` passed through `generateThreePlans`.
- Produces: `validateGroundedItinerary(variant, attractions)` and catalogue-backed Huangshan activities.

- [ ] Add a generator test requiring all three Huangshan variants to use only supplied source attraction IDs.
- [ ] Add service tests proving the prompt contains the bounded catalogue and unknown source IDs are rejected.
- [ ] Run focused tests and verify failures occur for missing grounding behavior.
- [ ] Map catalogue records to demo-provider POIs using prototype estimates where factual fields are absent.
- [ ] Include the compact catalogue in OpenRouter prompt input and require source IDs in its system instruction.
- [ ] Validate parsed Huangshan variants before returning them from each style attempt.
- [ ] Re-run focused tests and verify they pass.

### Task 4: API Integration and Independent Runtime Modes

**Files:**
- Modify: `server/src/config.js`
- Modify: `server/src/index.js`
- Modify: `server/src/app.js`
- Modify: `server/src/routes/trips.js`
- Modify: `server/src/routes/meta.js`
- Modify: `server/tests/api.test.js`
- Modify: `.env.example`

**Interfaces:**
- `createApp` consumes `attractionCatalogue`.
- Health responses expose `aiProvider`.
- Huangshan generation returns `ATTRACTION_CATALOGUE_EMPTY` with status 422 when no approved records exist.

- [ ] Add API tests for three grounded Huangshan variants, empty-catalogue handling, and provider mode metadata.
- [ ] Run `npm --workspace server test -- api.test.js` and verify the tests fail.
- [ ] Load approved attractions in the generation route before calling `generateThreePlans`.
- [ ] Separate `AI_PROVIDER` from `DEMO_MODE`; use memory persistence with either provider.
- [ ] Construct the SQLite catalogue at server startup and report active provider mode in health/meta.
- [ ] Replace the exposed key in `.env.example` with a placeholder.
- [ ] Re-run API tests and verify they pass.

### Task 5: Frontend Destination and Attribution

**Files:**
- Modify: `client/src/components/ActivityModal.jsx`
- Modify: `client/tests/planner.test.jsx`
- Modify: `client/tests/workspace.test.jsx`

**Interfaces:**
- Consumes: shared `chinaCities` and optional activity source metadata.
- Produces: bilingual Huangshan selection and a safe external attribution link.

- [ ] Add a planner test that selects `Huangshan, Anhui`.
- [ ] Add a workspace test that displays a Mafengwo source link for a grounded activity.
- [ ] Run focused client tests and verify the attribution test fails.
- [ ] Render source attribution only when `sourceUrl` and `sourceProvider` exist.
- [ ] Re-run focused client tests and verify they pass.

### Task 6: Local Approval and End-to-End Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/MANUAL_ACCEPTANCE.md`
- Runtime: `database/local/nuogo-attractions.sqlite`

**Interfaces:**
- Produces: a running local Nuogo instance with at least eight explicitly approved Huangshan records.

- [ ] List pending Huangshan attractions and inspect the top records.
- [ ] Approve at least eight selected records using `npm run attractions:review`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Restart the development servers with grounded demo generation.
- [ ] Register through the API and POST a four-day Huangshan generation request.
- [ ] Verify three variants return and every activity source ID belongs to the approved catalogue.
- [ ] Verify `http://localhost:5173` and `/api/health` respond successfully.
- [ ] Document the review and local test commands.
