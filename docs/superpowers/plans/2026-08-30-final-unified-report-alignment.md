# Final Unified Report Alignment Implementation Plan

Status: proposed; implementation not approved  
Authority: `Nuogo_FYP_Final_Report_Chapter1-3_FINAL_UNIFIED.docx`  
Audit: `docs/audits/FINAL_UNIFIED_REPORT_ALIGNMENT_AUDIT.md`

## Goal

Convert the active Nuogo workflow from simultaneous three-itinerary comparison to the final report's controlled flow:

`Ground -> Select one Travel Style -> Generate one itinerary -> Validate -> one repair if needed -> optional grounded rainy-day backup -> recheck budget -> display and save`

Preserve the existing React/Vite/Tailwind, Express, MySQL, Zod/Ajv, OpenTripMap, OpenRouter, Leaflet, authentication, repositories, provider modes, hard-budget engine, provenance, localization, and itinerary-management architecture.

## Explicit Non-Goals

- No application rewrite or folder reshuffle.
- No live weather API or automatic weather switching.
- No booking, payment, live navigation, traffic, or advanced route optimization.
- No simultaneous three-plan generation or comparison.
- No collaboration, expense splitting, sharing, tour guide, agent, or analytics features.
- No new database framework or migration unless a failing MySQL contract proves one is required.
- No broad visual redesign.

## Safety Before Implementation

1. Confirm the worktree and branch again.
2. Record `0801a4f758c1f3220b7d3610434c14f0aee50c8e` and the complete current diff as rollback evidence.
3. Create a backup Git ref and a patch for the nine pre-existing uncommitted files without exposing secrets.
4. Preserve the report-aligned partial-day budget and zero-candidate work; replace obsolete three-plan test/UI edits through normal patches rather than destructive reset.
5. Do not touch the original worktree or merge to `main`.

## Task 1 - Final Preference Contract

Tests first:

- Update `shared/contracts.test.js` for required `travelStyle` and `rainyDayBackupEnabled`.
- Add request tests in `server/tests/request-validation.test.js` for missing/invalid style, rainy boolean, supported cities, MANUAL/AUTO, and prompt injection.
- Add backward-compatibility tests for archived preferences without the two new fields.

Files:

- `shared/constants.js`
- `shared/schemas.js`
- `server/src/validation/requestValidators.js`
- `client/src/components/PreferenceForm.jsx`
- `client/src/i18n/display.js`
- `client/src/i18n/translations.js`

Implementation:

- Add one required new-request style: `BUDGET_SAVING`, `BALANCED`, or `COMFORT_FOCUSED`.
- Add one required boolean rainy-day choice, defaulting false in UI.
- Keep old archived preference records readable. Do not rewrite historical rows.
- Reduce advanced controls in the active new-trip form where they duplicate style selection; retain only compatibility values needed by archived records or current schedule/budget calculations.

Verify: shared tests, request-validation tests, client planner tests, lint on touched files.

Commit: `feat: align travel preferences with final report`

## Task 2 - Single-Style LLM Contract

Tests first:

- Update `server/tests/llm-harness.test.js` to prove exactly the selected style reaches the prompt and output boundary.
- Update shared draft-schema tests to reject a mismatched style.
- Add OpenRouter config tests requiring `deepseek/deepseek-chat-v3.1` in live MVP mode.
- Add controlled tests for 429, timeout, malformed output, and no secondary model.

Files:

- `shared/itineraryDraftSchema.js`
- `shared/schemas.js`
- `server/src/services/llm/buildItineraryPrompt.js`
- `server/src/services/llm/itineraryHarness.js`
- `server/src/providers/openRouter.js`
- `server/src/config.js`
- `server/src/index.js`
- `.env.example`
- related provider/config tests

Implementation:

- Use the selected style as the only style for a generation call.
- Lock the DeepSeek V3.1 model ID; do not add a fallback model.
- Preserve structured JSON and Ajv validation.
- Verify and apply OpenRouter's current official ZDR/provider-routing request option before coding it; never infer a request field from the report alone.

Verify: shared tests, LLM/provider/config tests, server build, lint.

Commit: `feat: lock generation to one DeepSeek travel style`

## Task 3 - One-Itinerary Planning Pipeline

Tests first:

- Replace simultaneous-profile generation tests in `server/tests/objective-generation.test.js` with one-itinerary tests for each style as separate requests.
- Retain zero-candidate, grounding, unsupported-destination, hard-budget, partial-day, and selected-attraction reconciliation tests.
- Add a call-count assertion proving the provider is invoked for one draft, not three.

Files:

- `server/src/services/itinerary/generateValidatedTrip.js`
- `server/src/services/itinerary/profilePrePlanner.js`
- `server/src/services/budget/spendingProfiles.js`
- `server/src/services/budget/profileBudget.js`
- `server/src/services/budget/budgetEngine.js`
- `server/src/repositories/objectiveRecords.js`
- `server/src/repositories/memory.js`
- `server/src/repositories/mysql.js`
- generation/budget/repository tests

Implementation:

- Build one style-aware plan and generate one draft.
- Remove differentiation/diversification from the active path.
- Return and persist one itinerary run. Read archived `variants` records without rewriting them.
- Keep the hard budget authoritative for every style.
- Do not delete old helper files until searches prove they have no compatibility callers; inactive legacy helpers may remain isolated.

Verify: generation, budget, repository, migration, and objective API tests.

Commit: `refactor: generate one selected-style itinerary`

## Task 4 - One Controlled Repair

Tests first:

- Update `server/tests/repair-loop.test.js` for initial validation plus at most one repair and one revalidation.
- Test deterministic repair, semantic repair, failed repair, malformed output, and hard-budget failure.

Files:

- `server/src/services/repair/repairLoop.js`
- `server/src/services/repair/deterministicRepair.js`
- `server/src/services/repair/targetedLlmRepair.js`
- `server/src/services/itinerary/generateValidatedTrip.js`

Implementation:

- Permit one repair action only.
- Never display partial/unvalidated output.
- Preserve localized controlled failure at the route boundary.

Verify: repair, generation, API failure, and validation tests.

Commit: `fix: limit itinerary generation to one repair`

## Task 5 - Grounded Rainy-Day Backup

Tests first:

- Add `server/tests/rainy-day-backup.test.js` for disabled mode, same-city grounding, indoor/less-sensitive category, no duplicate main POI, zero eligible alternative, and separate cost.
- Add budget tests proving unused backup cost is excluded from the main total and replacement cost cannot exceed the hard budget.
- Add provenance tests for the alternative xid/source.

Files:

- `server/src/services/itinerary/rainyDayBackup.js` (new)
- `server/src/services/itinerary/generateValidatedTrip.js`
- `server/src/services/validation/validationEngine.js`
- `server/src/repositories/objectiveRecords.js`
- `shared/schemas.js`
- `shared/itineraryDraftSchema.js` only if the approved design places backup in LLM output; prefer deterministic post-validation attachment to keep scope small
- related tests

Implementation:

- After a valid main itinerary, attach grounded alternatives only when enabled.
- Use the already validated destination candidate pool.
- Keep alternatives separate from main activities and exclude unused backup cost from the main total.
- Recheck budget and fail safely if replacement semantics would violate it.
- Do not query weather or claim prediction/current status.

Verify: rainy-day, grounding, provenance, budget, and generation tests.

Commit: `feat: add grounded rainy-day contingencies`

## Task 6 - Single-Itinerary API And Persistence

Tests first:

- Update repository contracts for one run per new generation.
- Add archived-three-variant read compatibility tests.
- Update API tests for generate, read, edit, regenerate, delete, ownership, and revision conflicts.
- Run MySQL migration smoke only when dedicated integration credentials are available.

Files:

- `server/src/routes/trips.js`
- `server/src/repositories/objectiveRecords.js`
- `server/src/repositories/memory.js`
- `server/src/repositories/mysql.js`
- repository/API/integration tests
- database migration only if a failing contract demonstrates necessity

Implementation:

- Remove `select-variant` from the new active API.
- Persist selected style and rainy choice in existing preference/payload JSON.
- Store one `itinerary_runs` record for each new request.
- Preserve old records and ownership/deletion behavior.

Verify: repository/API/security/edit/regenerate/delete tests and optional MySQL smoke.

Commit: `refactor: persist one final-report itinerary run`

## Task 7 - Single-Itinerary Frontend Workflow

Tests first:

- Rewrite `client/tests/planner.test.jsx` for one style selector, rainy toggle, one generation, and direct workspace navigation.
- Update `client/tests/objective-workspace.test.jsx` for one itinerary and separate rainy alternatives.
- Add Chinese/English tests for style, rainy labels, failures, source labels, and no raw enums.

Files:

- `client/src/pages/PlannerPage.jsx`
- `client/src/components/PreferenceForm.jsx`
- `client/src/context/TripContext.jsx`
- `client/src/pages/TripWorkspacePage.jsx`
- `client/src/components/ObjectiveTripWorkspace.jsx`
- `client/src/components/ProfileBudgetSummary.jsx`
- `client/src/components/SelectedAttractionOutcome.jsx`
- `client/src/components/RainyDayBackup.jsx` (new)
- `client/src/App.jsx`
- `client/src/i18n/display.js`
- `client/src/i18n/translations.js`
- affected client tests

Implementation:

- Navigate successful generation directly to `/trip/:tripId`.
- Remove comparison from the active route/navigation and do not show three cards.
- Reuse detailed itinerary, meal, transport, daily summary, budget, map, and provenance components.
- Display rainy alternatives separately and clearly as contingency choices, not forecasts.
- Preserve Chinese default and consistent English.

Legacy handling:

- `ComparePage`, `PlanComparison`, and `ComparisonRouteRail` may remain isolated only if required to read archived records. They must not be reachable from new generation or normal navigation.

Verify: client tests, focused accessibility/browser checks, build, lint.

Commit: `feat: present one validated itinerary workflow`

## Task 8 - Narrow Supporting Maintenance

Tests first:

- Update admin API/UI tests to cover only cost references and strictly required supported destination/POI records.
- Assert ordinary users cannot access maintenance.

Files:

- `server/src/routes/admin.js`
- `client/src/pages/AdminPage.jsx`
- `server/tests/admin-api.test.js`
- `client/tests/admin-page.test.jsx`

Implementation:

- Remove user suspension and system-log dashboards from the active MVP maintenance surface.
- Keep only report-required cost-reference and selected supported-record maintenance.
- Preserve authorization.

Verify: admin, security, and objective-scope tests.

Commit: `refactor: narrow maintenance to final MVP scope`

## Task 9 - Final Regression And Acceptance

Tests:

- Rewrite `tests/e2e/objective-journey.spec.js` around one itinerary.
- Keep authentication and cross-user assertions.
- Add nine independent city/style scenarios, not one simultaneous comparison.
- Include rainy backup in at least one scenario per city.
- Test MANUAL and AUTO grounding, zero candidates, malformed LLM output, provider timeout, one failed repair, hard budget, localization, map, edit/save/regenerate/delete.
- Remove obsolete three-profile assertions from component, API, and E2E tests.

Commands:

```text
npm test
npm run test:integration
npm run test:e2e
npm run lint
npm run build
```

Reporting:

- Report mocked/provider-contract tests separately from live checks.
- Mark MySQL, OpenTripMap, and OpenRouter live checks NOT EXECUTED unless credentials and explicit live-test switches are available.
- Record response time for fixed scenarios without fabricating evaluation success rates.
- Search active source for comparison, multi-profile generation, live weather, booking, payment, collaboration, and advanced route optimization.

Commit: `test: verify final unified report workflow`

## Expected Commit Order

1. `feat: align travel preferences with final report`
2. `feat: lock generation to one DeepSeek travel style`
3. `refactor: generate one selected-style itinerary`
4. `fix: limit itinerary generation to one repair`
5. `feat: add grounded rainy-day contingencies`
6. `refactor: persist one final-report itinerary run`
7. `feat: present one validated itinerary workflow`
8. `refactor: narrow maintenance to final MVP scope`
9. `test: verify final unified report workflow`

Implementation must not begin until this plan is approved.
