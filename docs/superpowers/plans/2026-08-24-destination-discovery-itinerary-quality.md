# Destination Discovery and Itinerary Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add grounded destination discovery, two-stage attraction prioritization, deterministic profile-specific pre-planning, safe budget utilization, meaningful alternatives, and complete bilingual itinerary presentation without changing Nuogo's approved architecture or objectives.

**Architecture:** Preserve the React/Express/shared modular monolith, memory/MySQL repository modes, OpenTripMap grounding, OpenRouter boundary, deterministic execution/validation/repair pipeline, and JSON trip payloads. Insert deterministic preference resolution, feature extraction, profile pre-planning, and baseline/allocatable budgeting before LLM drafting; evaluate differentiation after mandatory validation without making diversity a hard feasibility constraint.

**Tech Stack:** React 18, React Router 6, Vite 5, Tailwind CSS, Leaflet 1.9, Express 4, Zod 3, Ajv 8, OpenTripMap, optional OpenRouter, memory/MySQL repositories, Vitest, Testing Library, Supertest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-24-destination-discovery-itinerary-quality-design.md`

## Global Constraints

- Work only in the current isolated `feat/report-aligned-nuogo` worktree.
- Support only Beijing, Shanghai, and Xi'an.
- Preserve `BUDGET_SAVING`, `BALANCED`, and `COMFORT_FOCUSED` under the same hard user budget.
- Enforce `estimatedTotalCostFen <= userTotalBudgetFen` for every accepted variant.
- Resolve and attempt selected attractions before supplemental weighted scoring; selection priority is not merely a score.
- Treat selections as high-priority preferences subject to grounding, budget, dates, available time, route, continuity, density, and schedule constraints.
- Require every grounded attraction activity to carry an allowed server-resolved `xid`; names never establish grounding.
- Keep the LLM limited to constrained sequencing, themes, personalization, and explanations.
- Keep deterministic services authoritative for eligibility, scoring, route, schedule, budget, reconciliation, and validity.
- Stop before the LLM when the configured OpenTripMap candidate pool has zero validated records; never cross-fallback to demo records.
- Separate baseline mandatory estimated cost from remaining allocatable budget before profile planning.
- Treat `55%-70%`, `75%-90%`, and `90%-100%` as soft configurable product heuristics, never validity requirements or research constants.
- Treat differentiation thresholds as configurable quality heuristics; never sacrifice mandatory validity or useful POIs to cross them.
- Preserve user-provided, OpenTripMap API-sourced, database-backed, AI-generated, estimated, demo, and currently verified provenance distinctions.
- Keep Chinese as the default language and never render raw enums or developer explanations.
- Preserve archived preferences and variants without rewriting historical records.
- Do not add a MySQL migration unless a failing repository test proves current JSON persistence is insufficient.
- Keep OpenTripMap mandatory. Do not add AMap code, credentials, runtime configuration, network calls, or production persistence.
- Document and test only the optional WGS84/GCJ-02 contract boundary.
- Do not add unrelated functionality or refactoring.
- Use TDD and one focused commit per task.
- Report unavailable live OpenRouter, OpenTripMap, and MySQL checks as **NOT EXECUTED**, never PASS.

## File Structure

Focused new files:

- `shared/destinationDiscovery.js`: controlled bilingual destination/attraction display content.
- `server/src/services/poi/buildDiscoveryResponse.js`: browser-safe discovery DTOs.
- `server/src/services/poi/resolveAttractionPreferences.js`: structured/legacy precedence and server-side identity resolution.
- `server/src/services/poi/buildCandidateFeatures.js`: normalized evidence-based candidate features.
- `server/src/services/itinerary/profilePrePlanner.js`: Stage-A selection and Stage-B profile-specific feasible selection.
- `server/src/services/budget/profileBudget.js`: baseline, allocatable, profile-controlled, and utilization arithmetic.
- `server/src/services/itinerary/selectedAttractionOutcome.js`: exactly-once localized outcomes.
- `server/src/services/itinerary/reconcileSelectedAttractions.js`: deterministic insertion through complete evaluation.
- `server/src/services/itinerary/evaluateProfileDifferentiation.js`: selected-exempt quality metrics.
- `server/src/services/itinerary/diversifyProfiles.js`: one bounded non-selected replacement attempt.
- `server/src/services/itinerary/enrichItineraryPresentation.js`: daily/activity/meal presentation data.
- `client/src/planning/attractionDraft.js`: temporary discovery-to-planner selection state.
- `client/src/i18n/display.js`: centralized safe display resolution.
- focused discovery, outcome, budget, and itinerary presentation components.

No AMap provider or coordinate conversion implementation is created.

---

### Task 1: Establish Shared Discovery, Selection, Outcome, and Coordinate Contracts

**Files:**
- Create: `shared/destinationDiscovery.js`
- Create: `shared/destinationDiscovery.test.js`
- Modify: `shared/constants.js`
- Modify: `shared/schemas.js`
- Modify: `shared/contracts.test.js`
- Modify: `shared/package.json`

**Interfaces:**
- `getDestinationDiscoveryContent(destination)`.
- `resolveAttractionDisplay({ destination, xid, sourceName, sourceDescription, language })`.
- Extended `travelPreferenceSchema` with paired `attractionSelectionMode` and `selectedAttractions`.
- `selectedAttractionOutcomeSchema`, profile budget-summary additions, and canonical coordinate schema requiring `coordinateSystem: "WGS84"`.

- [ ] **Step 1: Write failing shared-contract tests**

```js
expect(getDestinationDiscoveryContent("beijing").introduction.zh).toBeTruthy();
expect(resolveAttractionDisplay({
  destination: "beijing", xid: "otm-bj-forbidden-city",
  sourceName: "Forbidden City", language: "zh"
}).name).toBe("故宫博物院");

expect(travelPreferenceSchema.parse({
  ...validPreferences,
  attractionSelectionMode: "MANUAL",
  selectedAttractions: [{ xid: "N123", displayName: "故宫博物院" }]
}).selectedAttractions).toHaveLength(1);

expect(() => travelPreferenceSchema.parse({
  ...validPreferences,
  attractionSelectionMode: "AUTO",
  selectedAttractions: [{ xid: "N123", displayName: "Forbidden City" }]
})).toThrow();

expect(() => canonicalCoordinatesSchema.parse({
  longitude: 116.397, latitude: 39.918, coordinateSystem: "GCJ02"
})).toThrow();
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm.cmd --workspace shared test -- destinationDiscovery.test.js contracts.test.js`  
Expected: FAIL because the content and extended contracts do not exist.

- [ ] **Step 3: Implement minimal contracts and controlled content**

Add fixed bilingual introductions/themes for the three supported destinations and controlled display records for existing demo attractions. Keep descriptions optional. Require structured selection fields together, unique IDs, MANUAL non-empty, and AUTO empty. Keep all new fields optional when parsing historical records. Add budget fields `baselineMandatoryCostFen`, `profileControlledCostFen`, `utilisationPercent`, and `remainingFen` without making them mandatory on archived variants.

- [ ] **Step 4: Run focused and full shared tests**

Run: `npm.cmd --workspace shared test -- destinationDiscovery.test.js contracts.test.js`  
Run: `npm.cmd --workspace shared test`  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add shared
git commit -m "feat: add discovery and planning contracts"
```

### Task 2: Retain Rich OpenTripMap Facts and Build Bilingual Discovery Records

**Files:**
- Modify: `server/src/providers/travel/openTripMapProvider.js`
- Modify: `server/src/providers/travel/demoTravelProvider.js`
- Modify: `server/src/services/poi/openTripMapCandidateService.js`
- Modify: `server/src/services/poi/buildCandidatePool.js`
- Create: `server/src/services/poi/buildDiscoveryResponse.js`
- Modify: `server/tests/travel-providers.test.js`
- Modify: `server/tests/poi-pipeline.test.js`

**Interfaces:**
- Provider details retain optional descriptions, address, preview, `kinds`, and WGS84 coordinates.
- `buildDiscoveryResponse(destination, candidates, { runtimeMode })` emits browser-safe localized records.

- [ ] **Step 1: Add failing provider and normalization tests**

```js
await expect(provider.getAttractionDetails({ xid: "N123" })).resolves.toMatchObject({
  wikipedia_extracts: { text: "A historic palace complex." }
});
expect(normalized.coordinates.coordinateSystem).toBe("WGS84");
expect(normalize(candidateWithoutDescription).description).toEqual({});
```

Assert Chinese controlled content outranks provider English, malformed optional fields are discarded safely, demo records stay labelled `DEMO`, and serialized responses contain no key or `apikey` query value.

- [ ] **Step 2: Run and verify failure**

Run: `npm.cmd --workspace server test -- travel-providers.test.js poi-pipeline.test.js`  
Expected: FAIL on rich facts, localization, and coordinate tagging.

- [ ] **Step 3: Implement optional fact retention and display resolution**

Keep OpenTripMap canonical for identity and map coordinates. Derive meaningful categories from `kinds`, preserve source provenance, use controlled bilingual display content first, and use safe source-name fallback when no translation exists. Do not mark matched data currently verified.

- [ ] **Step 4: Run focused tests**

Run: `npm.cmd --workspace server test -- travel-providers.test.js poi-pipeline.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add server/src/providers/travel server/src/services/poi server/tests/travel-providers.test.js server/tests/poi-pipeline.test.js
git commit -m "feat: normalize bilingual discovery records"
```

### Task 3: Expose the Destination Discovery API Safely

**Files:**
- Modify: `server/src/routes/meta.js`
- Modify: `server/src/app.js`
- Modify: `server/src/index.js`
- Create: `server/tests/discovery-api.test.js`
- Modify: `docs/API.md`

**Interfaces:**
- `GET /api/meta/destinations/:destination/attractions` returns `{ destination, introduction, themes, attractions, candidateCount, providerMode }`.

- [ ] **Step 1: Add failing API tests**

```js
const response = await request(app)
  .get("/api/meta/destinations/beijing/attractions")
  .expect(200);
expect(response.body.introduction.zh).toBeTruthy();
expect(response.body.attractions[0].coordinates.coordinateSystem).toBe("WGS84");
expect(JSON.stringify(response.body)).not.toContain("apikey");
```

Also test empty results, provider failure, unsupported destinations, request bounds, and no authentication/profile leakage.

- [ ] **Step 2: Run and verify failure**

Run: `npm.cmd --workspace server test -- discovery-api.test.js`  
Expected: FAIL with route not found.

- [ ] **Step 3: Implement the injected metadata endpoint and API documentation**

Use the configured provider only. Return empty successful discovery for a valid empty pool, map failures to a safe localized code, and never invoke generation or OpenRouter.

- [ ] **Step 4: Run API/security regressions**

Run: `npm.cmd --workspace server test -- discovery-api.test.js objective-scope.test.js security-objectives.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add server/src/routes/meta.js server/src/app.js server/src/index.js server/tests/discovery-api.test.js docs/API.md
git commit -m "feat: expose safe destination discovery api"
```

### Task 4: Build Attraction Discovery Cards, Filters, and Map

**Files:**
- Create: `client/src/pages/DestinationDiscoveryPage.jsx`
- Create: `client/src/components/AttractionCard.jsx`
- Create: `client/src/components/AttractionDiscoveryMap.jsx`
- Modify: `client/src/App.jsx`
- Modify: `client/src/styles/index.css`
- Create: `client/tests/destination-discovery.test.jsx`

**Interfaces:**
- Route `/discover/:destination`.
- Page consumes only the Nuogo discovery API.
- Leaflet receives only canonical WGS84 coordinates.

- [ ] **Step 1: Add failing UI tests**

```jsx
render(<App initialPath="/discover/beijing" />);
expect(await screen.findByRole("heading", { name: "北京" })).toBeVisible();
expect(screen.getByText("故宫博物院")).toBeVisible();
await userEvent.click(screen.getByRole("button", { name: "加入故宫博物院" }));
expect(screen.getByRole("button", { name: "移除故宫博物院" })).toBeVisible();
```

Test category filtering, map focus, missing-description copy, empty result, retry, English mode, keyboard use, reduced motion, and rejection of a GCJ-02 marker DTO.

- [ ] **Step 2: Run and verify failure**

Run: `npm.cmd --workspace client test -- destination-discovery.test.jsx`  
Expected: FAIL because the route/components do not exist.

- [ ] **Step 3: Implement the responsive discovery experience**

Reuse AppShell, Leaflet conventions, Lucide icons, existing tokens, and reduced-motion utilities. Keep the page an operational discovery tool, not a marketing hero.

- [ ] **Step 4: Verify UI and build**

Run: `npm.cmd --workspace client test -- destination-discovery.test.jsx motion-components.test.jsx`  
Run: `npm.cmd --workspace client run build`  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add client/src/pages/DestinationDiscoveryPage.jsx client/src/components/AttractionCard.jsx client/src/components/AttractionDiscoveryMap.jsx client/src/App.jsx client/src/styles/index.css client/tests/destination-discovery.test.jsx
git commit -m "feat: add destination discovery experience"
```

### Task 5: Connect MANUAL and AUTO Choices to Planning

**Files:**
- Create: `client/src/planning/attractionDraft.js`
- Modify: `client/src/pages/DestinationDiscoveryPage.jsx`
- Modify: `client/src/pages/PlannerPage.jsx`
- Modify: `client/src/components/PreferenceForm.jsx`
- Modify: `client/src/api/client.js`
- Modify: `client/tests/destination-discovery.test.jsx`
- Modify: `client/tests/planner.test.jsx`
- Modify: `client/tests/api-client.test.jsx`

**Interfaces:**
- Session-scoped `readAttractionDraft`, `writeAttractionDraft`, and `clearAttractionDraft`.
- Submission sends only mode, `xid`, and display-name hints.

- [ ] **Step 1: Add failing flow tests**

```js
expect(JSON.parse(fetch.mock.calls.at(-1)[1].body)).toMatchObject({
  attractionSelectionMode: "MANUAL",
  selectedAttractions: [{ xid: "N123", displayName: "故宫博物院" }]
});
expect(fetch.mock.calls.at(-1)[1].body).not.toContain("verificationStatus");
```

Add AUTO empty-selection, destination-change clearing, logout clearing, legacy archive display, and Chinese-default tests.

- [ ] **Step 2: Run and verify failure**

Run: `npm.cmd --workspace client test -- destination-discovery.test.jsx planner.test.jsx api-client.test.jsx`  
Expected: FAIL on draft persistence and structured submission.

- [ ] **Step 3: Implement temporary draft and planner summary**

Use one session-storage key. Keep legacy text only when displaying archived legacy input. Provide an Edit Discovery command and a localized destination-change notice.

- [ ] **Step 4: Run focused tests**

Run: `npm.cmd --workspace client test -- destination-discovery.test.jsx planner.test.jsx api-client.test.jsx auth-language.test.jsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add client/src/planning client/src/pages/DestinationDiscoveryPage.jsx client/src/pages/PlannerPage.jsx client/src/components/PreferenceForm.jsx client/src/api/client.js client/tests
git commit -m "feat: connect discovery to planning preferences"
```

### Task 6: Resolve Structured and Legacy Preferences Server-Side

**Files:**
- Create: `server/src/services/poi/resolveAttractionPreferences.js`
- Create: `server/tests/attraction-preferences.test.js`
- Modify: `server/src/services/promptInjection.js`
- Modify: `server/tests/security-objectives.test.js`

**Interfaces:**
- `resolveAttractionPreferences(preferences, candidatePool): { mode, requested, supported, unresolved }`.
- Precedence: structured MANUAL, structured AUTO, legacy names, implicit AUTO.

- [ ] **Step 1: Add failing precedence and trust tests**

```js
expect(resolveAttractionPreferences({
  ...base, attractionSelectionMode: "AUTO", selectedAttractions: [],
  preferredSights: ["Forbidden City"]
}, pool)).toMatchObject({ mode: "AUTO", requested: [] });

expect(resolveAttractionPreferences({
  ...base, attractionSelectionMode: "MANUAL",
  selectedAttractions: [{ xid: "N123", displayName: "Fake", provider: "DEMO" }]
}, pool).supported[0]).toMatchObject({ xid: "N123", provider: "OPENTRIPMAP" });
```

Test exact normalized legacy matching, ambiguity, unmatched names, unavailable IDs, duplicates, wrong-city IDs, no-preference AUTO, and prompt-injection screening before provider/LLM work.

- [ ] **Step 2: Run and verify failure**

Run: `npm.cmd --workspace server test -- attraction-preferences.test.js security-objectives.test.js`
Expected: FAIL because authoritative resolution is absent.

- [ ] **Step 3: Implement deterministic resolution**

Never fuzzy-guess legacy names. Preserve unresolved entries for outcomes. Copy identity/provenance only from the current candidate pool and do not mutate preferences or historical records.

- [ ] **Step 4: Run focused tests**

Run: `npm.cmd --workspace server test -- attraction-preferences.test.js security-objectives.test.js request-validation.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add server/src/services/poi/resolveAttractionPreferences.js server/src/services/promptInjection.js server/tests/attraction-preferences.test.js server/tests/security-objectives.test.js
git commit -m "feat: resolve grounded attraction preferences"
```

### Task 7: Derive Evidence-Based Candidate Features and Validate Profile Configuration

**Files:**
- Create: `server/src/services/poi/buildCandidateFeatures.js`
- Create: `server/tests/candidate-features.test.js`
- Modify: `server/src/services/budget/spendingProfiles.js`
- Create: `server/tests/spending-profile-config.test.js`

**Interfaces:**
- `buildCandidateFeatures(candidate, { preferences, selectedIds, routeContext, selectedCandidates, costReferences })`.
- Produces normalized `[0,1]` factors and source metadata for estimated fields.
- Profile config retains the seven approved factors and weights totaling `1.00`.

```js
const profileWeights = {
  BUDGET_SAVING:   { selectedAttractionPriority: .30, preferenceMatch: .20, costEfficiency: .18, travelEfficiency: .14, categoryDiversity: .06, comfortScore: .03, activityValue: .09 },
  BALANCED:        { selectedAttractionPriority: .30, preferenceMatch: .18, costEfficiency: .10, travelEfficiency: .12, categoryDiversity: .12, comfortScore: .10, activityValue: .08 },
  COMFORT_FOCUSED: { selectedAttractionPriority: .30, preferenceMatch: .18, costEfficiency: .04, travelEfficiency: .14, categoryDiversity: .06, comfortScore: .18, activityValue: .10 }
};
```

- [ ] **Step 1: Add failing feature/config tests**

```js
expect(buildCandidateFeatures(lowCostNearby, context)).toMatchObject({
  selectedAttractionPriority: 0,
  costEfficiency: expect.any(Number),
  travelEfficiency: expect.any(Number),
  categoryDiversity: expect.any(Number)
});
expect(Object.values(features).filter(Number.isFinite).every((v) => v >= 0 && v <= 1)).toBe(true);
expect(validateProfileWeights(profileConfig)).toEqual([]);
expect(validateProfileWeights({ ...profileConfig, costEfficiency: -1 })).not.toEqual([]);
```

Test preference relevance, selected feature, neutral missing factual data, route burden, diversity changing after a prior selection, and exact `1.00` totals for all three profiles.

- [ ] **Step 2: Run and verify failure**

Run: `npm.cmd --workspace server test -- candidate-features.test.js spending-profile-config.test.js`
Expected: FAIL because feature extraction and weights are absent.

- [ ] **Step 3: Implement normalized features and frozen configuration**

Use only grounded category/location and evidenced estimates. Recalculate marginal route/diversity features per selection step. In Stage-B non-selected comparison, normalize the six applicable weights by their `0.70` subtotal; do not let the inapplicable selected factor alter ranking.

- [ ] **Step 4: Run focused tests**

Run: `npm.cmd --workspace server test -- candidate-features.test.js spending-profile-config.test.js poi-pipeline.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add server/src/services/poi/buildCandidateFeatures.js server/src/services/budget/spendingProfiles.js server/tests/candidate-features.test.js server/tests/spending-profile-config.test.js
git commit -m "feat: add transparent profile candidate features"
```

### Task 8: Separate Baseline and Profile-Controlled Budgeting

**Files:**
- Create: `server/src/services/budget/profileBudget.js`
- Create: `server/tests/profile-budget.test.js`
- Modify: `server/src/services/budget/budgetEngine.js`
- Modify: `server/tests/budget-engine.test.js`

**Interfaces:**
- `buildProfileBudgetContext(preferences, references): { userBudgetFen, baselineMandatoryCostFen, allocatableBudgetFen }`.
- `summarizeProfileSpend({ budgetContext, categoriesFen }): { userBudgetFen, baselineMandatoryCostFen, profileControlledCostFen, totalFen, utilisationPercent, remainingFen, withinBudget, categoryComponentsFen }`.
- `targetProfileControlledSpend(budgetContext, utilisationBand)` subtracts baseline from the total-spend target and clamps the result to `[0, allocatableBudgetFen]`.

- [ ] **Step 1: Add failing arithmetic tests**

```js
expect(buildProfileBudgetContext(preferences, references)).toMatchObject({
  userBudgetFen: 600_000,
  baselineMandatoryCostFen: 180_000,
  allocatableBudgetFen: 420_000
});
expect(summary.totalFen).toBe(summary.baselineMandatoryCostFen + summary.profileControlledCostFen);
expect(summary.totalFen).toBeLessThanOrEqual(summary.userBudgetFen);
expect(summary.categoryComponentsFen.accommodation.finalFen).toBe(
  summary.categoryComponentsFen.accommodation.baselineFen +
  summary.categoryComponentsFen.accommodation.profileUpliftFen
);
expect(summary.categoryComponentsFen.foodAndBeverages.finalFen).toBe(
  summary.categoryComponentsFen.foodAndBeverages.baselineFen +
  summary.categoryComponentsFen.foodAndBeverages.profileUpliftFen
);
```

Test one traveller, multiple travellers, one and multiple required nights, arrival/departure partial days supported by the existing trip-duration rules, user-provided outbound/return costs, zero/insufficient allocatable budget, integer-fen rounding, utilization calculation, and baseline already above a nominal soft band without invented spending. For every split category, assert `baselineFen + profileUpliftFen === finalFen` and assert the final eight-category total sums each final category exactly once.

- [ ] **Step 2: Run and verify failure**

Run: `npm.cmd --workspace server test -- profile-budget.test.js budget-engine.test.js`
Expected: FAIL because the split does not exist.

- [ ] **Step 3: Implement deterministic budget decomposition**

Keep the existing administrator-maintained references and eight-category total authoritative. Compute baseline before any profile or LLM itinerary exists:

- accommodation floor = required nights from the existing date/arrival/departure helper x the lowest applicable active accommodation reference x the existing room/unit rule;
- food floor = traveller count x the deterministic minimum meal allowance x the existing trip-day/partial-day meal-unit rule, without reading generated meal activities;
- intercity baseline = validated user-provided outbound/return costs or the existing reference-derived mandatory values;
- other baseline = only existing mandatory trip-level reference values.

For a split category, calculate `finalCategoryFen = baselineFloorFen + max(0, selectedProfileTierFen - baselineFloorFen)`. Never add the full profile tier amount on top of its floor. Profile-controlled spend also contains local transport, attraction tickets, entertainment, and optional comfort improvements not already present in baseline. Sum final categories once to obtain the existing eight-category total. The target bands apply to total spend; subtract baseline before deriving the controllable target. Soft bands guide planning only and never create validation issues.

- [ ] **Step 4: Run budget regressions**

Run: `npm.cmd --workspace server test -- profile-budget.test.js budget-engine.test.js objective-generation.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add server/src/services/budget/profileBudget.js server/src/services/budget/budgetEngine.js server/tests/profile-budget.test.js server/tests/budget-engine.test.js
git commit -m "feat: separate baseline and planned trip spending"
```

### Task 9: Build the Two-Stage Profile Pre-Planner

**Files:**
- Create: `server/src/services/itinerary/profilePrePlanner.js`
- Create: `server/tests/profile-pre-planner.test.js`

**Interfaces:**
- `buildProfilePlan({ profile, preferences, candidatePool, resolvedPreferences, budgetContext, costReferences })`.
- Produces selected IDs, structurally excluded selections, provisionally deferred supported selections, ranked supplemental IDs, allowed IDs, day targets, soft utilization band, and profile guidance.

- [ ] **Step 1: Add failing Stage-A priority tests**

```js
const plan = buildProfilePlan(contextWithSelectedSummerPalace);
expect(plan.selectedCandidateIds[0]).toBe("N-SUMMER");
expect(plan.allowedCandidateIds).toContain("N-SUMMER");
expect(plan.structurallyExcludedSelected).toEqual([]);
expect(plan.provisionallyDeferredSelected).toEqual([]);
```

Add unknown-ID, unsupported-ID, wrong-destination, unavailable, ambiguous-legacy, and invalid-grounding cases proving only those records enter `structurallyExcludedSelected`. Add approximately schedule-infeasible and budget-infeasible supported candidates and assert they enter `provisionallyDeferredSelected`, remain in `selectedCandidateIds` and `allowedCandidateIds`, and are not assigned a final exclusion reason by the pre-planner.

- [ ] **Step 2: Add failing Stage-B ranking tests**

Construct one cheap/far, one expensive/near, one diverse, and one high-comfort candidate. Assert cost, preference, route burden, and comfort changes can produce different deterministic rankings across profiles. Assert the same obviously optimal candidate may rank highly in all profiles and route/diversity features are recalculated after each provisional selection.

- [ ] **Step 3: Run and verify failure**

Run: `npm.cmd --workspace server test -- profile-pre-planner.test.js`
Expected: FAIL because the pre-planner does not exist.

- [ ] **Step 4: Implement deterministic feasible greedy selection**

Attempt supported selected candidates first in user order. When approximate pre-planning cannot safely place one, defer it provisionally while retaining it for drafting and full reconciliation. Only structural identity/grounding failures can be excluded here. Then score non-selected candidates with normalized applicable weights, recompute marginal features, cluster geographically/day-by-day, and stop when schedule, density, or allocatable budget cannot safely accept more. Treat utilization bands as guidance, never fill targets artificially.

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd --workspace server test -- profile-pre-planner.test.js candidate-features.test.js profile-budget.test.js validation-engine.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add server/src/services/itinerary/profilePrePlanner.js server/tests/profile-pre-planner.test.js
git commit -m "feat: preplan profile-specific attraction sets"
```

### Task 10: Constrain LLM and Demo Drafting to Each Profile Plan

**Files:**
- Modify: `server/src/services/llm/buildItineraryPrompt.js`
- Modify: `server/src/services/llm/itineraryHarness.js`
- Modify: `server/src/providers/demoProvider.js`
- Modify: `server/tests/llm-harness.test.js`
- Modify: `server/tests/validation-engine.test.js`

**Interfaces:**
- Prompt consumes `profilePlan`, not the unrestricted common candidate pool.
- Existing parser/POI validator continues rejecting missing and unknown IDs.

- [ ] **Step 1: Add failing prompt and grounding tests**

```js
const payload = JSON.parse(buildItineraryPrompt(preferences, profilePlan, pool).user)
  .UNTRUSTED_USER_DATA;
expect(payload.allowedCandidateIds).toEqual(profilePlan.allowedCandidateIds);
expect(payload.selectedCandidateIds).toEqual(profilePlan.selectedCandidateIds);
expect(payload).not.toHaveProperty("candidateScores");
```

Assert localized instructions, no internal weights/codes exposed, name-only attraction rejection, unknown-ID rejection, and no prompt call for an empty pool.

- [ ] **Step 2: Run and verify failure**

Run: `npm.cmd --workspace server test -- llm-harness.test.js validation-engine.test.js`
Expected: FAIL on the profile-plan prompt contract; existing ID guards remain PASS.

- [ ] **Step 3: Implement constrained prompt/demo behavior**

Send allowed grounded facts and profile guidance only. Update DemoPlanProvider to consume each pre-plan deterministically and produce natural Chinese/English reasons without enum terminology.

- [ ] **Step 4: Run focused tests**

Run: `npm.cmd --workspace server test -- llm-harness.test.js validation-engine.test.js objective-generation.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add server/src/services/llm server/src/providers/demoProvider.js server/tests/llm-harness.test.js server/tests/validation-engine.test.js
git commit -m "feat: constrain drafting to profile preplans"
```

### Task 11: Integrate Profile Pre-Planning With Generation

**Files:**
- Modify: `server/src/services/itinerary/generateValidatedTrip.js`
- Modify: `server/src/services/itinerary/buildVariantMetrics.js`
- Modify: `server/tests/objective-generation.test.js`

**Interfaces:**
- Generation resolves once, creates one budget context, creates three independent pre-plans, then executes the existing route/schedule/budget/validate/repair boundary per profile.

- [ ] **Step 1: Add failing rich-pool generation tests**

```js
const result = await generateValidatedTrip(preferences, dependencies);
expect(result.variants).toHaveLength(3);
expect(result.variants.every((v) => v.summary.totalFen <= v.summary.budgetFen)).toBe(true);
const selectedIds = new Set(preferences.selectedAttractions.map(({ xid }) => xid));
const scenarioSignature = (variant) => JSON.stringify({
  supplementalPoiIds: variant.itinerary.days.flatMap((day) => day.activities
    .map(({ xid }) => xid).filter((xid) => xid && !selectedIds.has(xid))).sort(),
  transportDistribution: variant.variantMetrics.transportDistribution,
  categoriesFen: variant.summary.categoriesFen,
  accommodationTier: variant.variantMetrics.accommodationTier,
  foodTier: variant.variantMetrics.foodTier,
  dayAssignments: variant.itinerary.days.map((day) =>
    day.activities.map(({ xid }) => xid).filter(Boolean))
});
expect(new Set(result.variants.map(scenarioSignature)).size).toBeGreaterThan(1);
```

Construct a rich grounded pool with meaningful cost, comfort, category, route-burden, and preference-relevance differences. Assert at least one profile difference appears in non-selected POIs, transport distribution, spending allocation, accommodation/food tier, or route/day assignment. Also test profile-specific allowed lists, shared selected attractions, automatic mode, zero candidates before provider draft invocation, route/schedule execution after drafting, and hard-budget failure without persistence.

- [ ] **Step 2: Add a failing sparse/shared-optimal generation test**

Use a small pool where user selections dominate and the same remaining POIs are clearly optimal. Assert all three variants remain mandatory-valid and within budget, identical POI sets do not fail generation, and every returned ID belongs to the validated pool. Task 14 completes this scenario by asserting that production diagnostics report limited differentiation and no bounded repair introduces an inferior or fabricated candidate.

- [ ] **Step 3: Run and verify failure**

Run: `npm.cmd --workspace server test -- objective-generation.test.js`
Expected: FAIL because generation still uses one common pool directly.

- [ ] **Step 4: Integrate the pre-planning stage**

Preserve the existing evaluation callback as the only route/schedule/budget/mandatory-validation authority. Add baseline and utilization metrics to variant summaries. Do not weaken bounded deterministic or targeted LLM repair.

- [ ] **Step 5: Run generation/validation/budget tests**

Run: `npm.cmd --workspace server test -- objective-generation.test.js validation-engine.test.js budget-engine.test.js repair-loop.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add server/src/services/itinerary/generateValidatedTrip.js server/src/services/itinerary/buildVariantMetrics.js server/tests/objective-generation.test.js
git commit -m "feat: integrate profile-aware generation"
```

### Task 12: Build Exactly-Once Localized Selection Outcomes

**Files:**
- Create: `server/src/services/itinerary/selectedAttractionOutcome.js`
- Create: `server/tests/selected-attraction-outcome.test.js`

**Interfaces:**
- `buildSelectedAttractionOutcome({ requested, itinerary, structurallyExcluded, finalEvaluationRejected }): selectedAttractionOutcome`.
- Closed localized reason map; codes never become display text.

- [ ] **Step 1: Add failing outcome tests**

```js
const outcome = buildSelectedAttractionOutcome({
  requested,
  itinerary,
  structurallyExcluded,
  finalEvaluationRejected
});
expect(outcome.included.length + outcome.excluded.length).toBe(outcome.requested.length);
expect(new Set([...outcome.included, ...outcome.excluded].map((x) => x.requestId)).size)
  .toBe(outcome.requested.length);
expect(outcome.excluded[0].reason.zh).not.toMatch(/SCHEDULE_LIMIT|validator|score/i);
expect(outcome.excluded[0].reason.en).toContain("was not included");
```

Cover structural unsupported/unavailable/ambiguous cases and final schedule, budget, route, density, continuity, and combined-feasibility reasons in both languages. Add a test passing a supported `provisionallyDeferredSelected` item before reconciliation and assert the builder refuses to classify it as finally excluded without a complete deterministic evaluation result.

- [ ] **Step 2: Run and verify failure**

Run: `npm.cmd --workspace server test -- selected-attraction-outcome.test.js`  
Expected: FAIL because the builder is absent.

- [ ] **Step 3: Implement deterministic outcome accounting**

Use stable request IDs for set membership and validate with the shared outcome schema. Accept immediate exclusions only from structural identity/grounding resolution. Require complete evaluation/reconciliation evidence for budget, schedule, route, density, and continuity exclusions.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm.cmd --workspace server test -- selected-attraction-outcome.test.js`  
Expected: PASS.

```powershell
git add server/src/services/itinerary/selectedAttractionOutcome.js server/tests/selected-attraction-outcome.test.js
git commit -m "feat: account for selected attraction outcomes"
```

### Task 13: Reconcile Omitted Selections Through Full Revalidation

**Files:**
- Create: `server/src/services/itinerary/reconcileSelectedAttractions.js`
- Create: `server/tests/selected-attraction-reconciliation.test.js`
- Modify: `server/src/services/itinerary/generateValidatedTrip.js`

**Interfaces:**
- `reconcileSelectedAttractions({ evaluation, requested, provisionallyDeferredSelected, candidatePool, context, evaluate })`.
- `evaluate` remains the complete route/schedule/budget/validator boundary.

- [ ] **Step 1: Add failing insertion and rollback tests**

```js
const result = await reconcileSelectedAttractions(input);
expect(result.evaluation.itinerary.days.flatMap((d) => d.activities.map((a) => a.xid)))
  .toContain("N-SUMMER");
expect(evaluate).toHaveBeenCalled();
```

Assert every supported `provisionallyDeferredSelected` item is attempted even when pre-planning considered it approximately infeasible. For budget, schedule, route, density, and continuity failures, assert the original evaluation remains unchanged and a final localized outcome reason is derived only from the complete evaluation result. Structural POI failures remain the responsibility of preference resolution and are not reclassified here.

- [ ] **Step 2: Run and verify failure**

Run: `npm.cmd --workspace server test -- selected-attraction-reconciliation.test.js`  
Expected: FAIL because reconciliation is absent.

- [ ] **Step 3: Implement minimal deterministic insertion**

Probe omitted and provisionally deferred supported candidates in user order, days/sequences by lowest added route burden, and retain only a fully valid evaluation. Never mutate accepted state while probing. Return final feasibility rejection evidence only after every permitted insertion position has passed through the complete evaluator.

- [ ] **Step 4: Run focused regressions**

Run: `npm.cmd --workspace server test -- selected-attraction-reconciliation.test.js objective-generation.test.js validation-engine.test.js budget-engine.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add server/src/services/itinerary/reconcileSelectedAttractions.js server/src/services/itinerary/generateValidatedTrip.js server/tests/selected-attraction-reconciliation.test.js
git commit -m "feat: reconcile selections through validation"
```

### Task 14: Measure and Boundedly Improve Profile Differentiation

**Files:**
- Create: `server/src/services/itinerary/evaluateProfileDifferentiation.js`
- Create: `server/src/services/itinerary/diversifyProfiles.js`
- Create: `server/tests/profile-differentiation.test.js`
- Modify: `server/src/services/validation/validators/spendingProfileValidator.js`
- Modify: `server/src/services/itinerary/generateValidatedTrip.js`
- Modify: `server/tests/objective-generation.test.js`

**Interfaces:**
- `evaluateProfileDifferentiation(variants, { selectedCandidateIds, config })` returns pairwise quality metrics and diagnostics.
- `attemptProfileDiversification({ variants, profilePlans, evaluate, config })` performs at most one non-selected replacement attempt per flagged profile and returns the best feasible set.
- Initial config is `{ maxNonSelectedPoiJaccard: 0.80, minimumMeaningfulDimensions: 2, maxRepairAttemptsPerProfile: 1 }`; all values are product heuristics.

- [ ] **Step 1: Add failing metric tests**

```js
expect(evaluateProfileDifferentiation(variants, {
  selectedCandidateIds: ["N-FORBIDDEN"], config
}).pairs[0]).toMatchObject({
  nonSelectedPoiJaccard: expect.any(Number),
  meaningfulDimensionCount: expect.any(Number)
});
expect(evaluateProfileDifferentiation(allSelectedVariants, options).pairs[0]
  .nonSelectedPoiJaccard).toBe("NOT_APPLICABLE");
```

Test selected-ID exemption, empty union, allocation/transport/tier/route differences, sparse pool, shared optimal POIs, and configurable thresholds. Complete Task 11's sparse/shared-optimal integration fixture by asserting its production diagnostics identify limited similarity while generation remains successful.

- [ ] **Step 2: Add failing bounded-repair tests**

Assert only non-selected POIs may be replaced, the evaluator is called once per flagged profile, a repair is retained only when all mandatory checks pass and quality improves, and invalid/inferior repairs revert to the original valid plan.

- [ ] **Step 3: Run and verify failure**

Run: `npm.cmd --workspace server test -- profile-differentiation.test.js`
Expected: FAIL because quality evaluation is absent.

- [ ] **Step 4: Implement quality-only differentiation**

Remove exact-composition difference as an unconditional validity failure. Keep hard budget/profile configuration checks mandatory. Record unavoidable similarity as diagnostics, not a failed trip. Attempt one bounded repair after mandatory validation.

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd --workspace server test -- profile-differentiation.test.js objective-generation.test.js validation-engine.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add server/src/services/itinerary/evaluateProfileDifferentiation.js server/src/services/itinerary/diversifyProfiles.js server/src/services/itinerary/generateValidatedTrip.js server/src/services/validation/validators/spendingProfileValidator.js server/tests/profile-differentiation.test.js server/tests/objective-generation.test.js
git commit -m "feat: evaluate safe itinerary differentiation"
```

### Task 15: Persist Profile Metrics and Selection Outcomes Compatibly

**Files:**
- Modify: `server/src/repositories/objectiveRecords.js`
- Modify: `server/tests/repository-contract.test.js`
- Modify: `server/tests/objective-editing.test.js`
- Modify: `server/tests/migrations.test.js`

**Interfaces:**
- New JSON fields round-trip in memory and MySQL contracts.
- Historical preferences/variants without new fields continue loading unchanged.

- [ ] **Step 1: Add failing repository compatibility tests**

Save/load structured preferences, bilingual outcomes, baseline/profile spend, utilization, and differentiation diagnostics. Load archived legacy records unchanged. Assert regeneration re-resolves current IDs rather than trusting persisted provider snapshots.

- [ ] **Step 2: Run and verify failure**

Run: `npm.cmd --workspace server test -- repository-contract.test.js objective-editing.test.js migrations.test.js`
Expected: FAIL only where new JSON validation/round trips are absent.

- [ ] **Step 3: Extend objective-record validation minimally**

Keep added fields optional for history. Do not create a migration when JSON round trips pass.

- [ ] **Step 4: Run repository/editing tests and commit**

Run: `npm.cmd --workspace server test -- repository-contract.test.js objective-editing.test.js migrations.test.js`
Expected: PASS.

```powershell
git add server/src/repositories/objectiveRecords.js server/tests/repository-contract.test.js server/tests/objective-editing.test.js server/tests/migrations.test.js
git commit -m "feat: persist itinerary planning outcomes"
```

### Task 16: Build Localized Itinerary Presentation Data

**Files:**
- Create: `server/src/services/itinerary/enrichItineraryPresentation.js`
- Create: `server/tests/itinerary-presentation.test.js`
- Modify: `server/src/services/itinerary/generateValidatedTrip.js`
- Modify: `server/src/services/itinerary/revalidateEditedTrip.js`

**Interfaces:**
- Adds optional localized day/activity/meal presentation data with explicit provenance.

- [ ] **Step 1: Add failing presentation and provenance tests**

```js
const enriched = enrichItineraryPresentation(context);
expect(enriched.days[0].presentation).toMatchObject({
  activityCount: expect.any(Number), mealCount: expect.any(Number),
  transportLegCount: expect.any(Number), estimatedDailyCostFen: expect.any(Number)
});
expect(enrichItineraryPresentation(openTripMapContext).days[0].activities[0]
  .presentation.descriptionSourceType)
  .toBe("OPENTRIPMAP_API");
expect(enrichItineraryPresentation(controlledContentContext).days[0].activities[0]
  .presentation.descriptionSourceType)
  .toBe("DATABASE_BACKED");
expect(enrichItineraryPresentation(noDescriptionContext).days[0].activities[0]
  .presentation.description.zh)
  .toBe("暂无景点介绍");
expect(enrichItineraryPresentation(noDescriptionContext).days[0].activities[0]
  .presentation.description.en)
  .toBe("Description unavailable");
expect(enrichItineraryPresentation(noDescriptionContext).days[0].activities[0]
  .presentation)
  .not.toHaveProperty("descriptionSourceType");
expect(enrichItineraryPresentation(aiReasonContext).days[0].activities[0]
  .presentation.reasonSourceType)
  .toBe("AI_GENERATED");
expect(enrichItineraryPresentation(estimatedDurationContext).days[0].activities[0]
  .presentation.durationSourceType)
  .toBe("ESTIMATED");
```

Test OpenTripMap descriptions, controlled bilingual/database-backed descriptions, unavailable Chinese/English copy without fabricated metadata, AI-generated personalized reasons, estimated duration/system calculations, Chinese/English themes, calculated end times, meal timing/area/style/per-person estimate, next transport, no named restaurant without grounding, and no raw profile enums. Do not collapse controlled content into OpenTripMap provenance.

- [ ] **Step 2: Run and verify failure**

Run: `npm.cmd --workspace server test -- itinerary-presentation.test.js`  
Expected: FAIL because enrichment is absent.

- [ ] **Step 3: Implement deterministic presentation enrichment**

Keep provider facts immutable. Label generated guidance `AI_GENERATED` and calculations `ESTIMATED`. Apply the same enrichment after generation and edited-trip revalidation.

- [ ] **Step 4: Run tests and commit**

Run: `npm.cmd --workspace server test -- itinerary-presentation.test.js objective-generation.test.js objective-editing.test.js`  
Expected: PASS.

```powershell
git add server/src/services/itinerary/enrichItineraryPresentation.js server/src/services/itinerary/generateValidatedTrip.js server/src/services/itinerary/revalidateEditedTrip.js server/tests/itinerary-presentation.test.js
git commit -m "feat: enrich itinerary presentation data"
```

### Task 17: Centralize Chinese and English Display Resolution

**Files:**
- Create: `client/src/i18n/display.js`
- Create: `client/tests/display-localization.test.js`
- Modify: `client/src/i18n/translations.js`
- Modify: `client/src/context/LanguageContext.jsx`
- Modify: `client/src/components/PreferenceForm.jsx`
- Modify: `client/src/components/PlanComparison.jsx`
- Modify: `client/src/components/ObjectiveTripWorkspace.jsx`
- Modify: `client/src/components/TripLegRow.jsx`
- Modify: `client/tests/auth-language.test.jsx`
- Modify: `client/tests/planner.test.jsx`
- Modify: `client/tests/objective-workspace.test.jsx`

**Interfaces:**
- `displayLabel(language, namespace, value)` never returns an unknown raw value.
- `localizedText(value, language, fallbackKey)` uses the approved resolution order.

- [ ] **Step 1: Add failing formatter and UTF-8 tests**

```js
expect(displayLabel("zh", "profile", "BUDGET_SAVING")).toBe("省钱优先");
expect(displayLabel("zh", "activity", "MEAL")).toBe("用餐");
expect(displayLabel("zh", "activity", "UNKNOWN_INTERNAL")).toBe("其他活动");
expect(displayLabel("zh", "activity", "UNKNOWN_INTERNAL")).not.toContain("UNKNOWN");
```

Render Chinese and English planner/comparison/workspace fixtures; reject raw profile/activity/route/source enums, internal rationale, mojibake replacement characters, and unintended cross-language labels. Verify fresh browser state defaults to Chinese.

- [ ] **Step 2: Run and verify failure**

Run: `npm.cmd --workspace client test -- display-localization.test.js auth-language.test.jsx planner.test.jsx objective-workspace.test.jsx`  
Expected: FAIL on centralized formatting and current leakage.

- [ ] **Step 3: Implement closed display dictionaries and fallbacks**

Preserve technical brands and CNY. Store generated copy with its generation locale and do not pretend it has a verified translation.

- [ ] **Step 4: Run localization tests and commit**

Run: `npm.cmd --workspace client test -- display-localization.test.js auth-language.test.jsx planner.test.jsx objective-workspace.test.jsx`  
Expected: PASS.

```powershell
git add client/src/i18n client/src/context/LanguageContext.jsx client/src/components/PreferenceForm.jsx client/src/components/PlanComparison.jsx client/src/components/ObjectiveTripWorkspace.jsx client/src/components/TripLegRow.jsx client/tests
git commit -m "fix: centralize bilingual itinerary display"
```

### Task 18: Render Comparison and Workspace Outcomes, Budgets, and Details

**Files:**
- Create: `client/src/components/SelectedAttractionOutcome.jsx`
- Create: `client/src/components/ProfileBudgetSummary.jsx`
- Create: `client/src/components/DailyItinerarySummary.jsx`
- Create: `client/src/components/ItineraryActivityDetails.jsx`
- Create: `client/src/components/MealDetails.jsx`
- Modify: `client/src/components/PlanComparison.jsx`
- Modify: `client/src/components/ObjectiveTripWorkspace.jsx`
- Modify: `client/src/components/TripLegRow.jsx`
- Modify: `client/tests/objective-scope.test.jsx`
- Modify: `client/tests/objective-workspace.test.jsx`

**Interfaces:**
- MANUAL/legacy variants render included/excluded outcomes; AUTO renders a grounded-pool explanation.
- Budget summary renders user budget, meaningful baseline, planned experience cost, total, utilization, and remaining.

- [ ] **Step 1: Add failing outcome/budget/detail tests**

```jsx
expect(screen.getByText("已加入的已选景点")).toBeVisible();
expect(screen.getByText("未加入的已选景点")).toBeVisible();
expect(screen.getByText("预算使用率")).toBeVisible();
expect(document.body).not.toHaveTextContent("SCHEDULE_LIMIT");
expect(document.body).not.toHaveTextContent("BUDGET_SAVING");
```

Test all-included, localized exclusion, AUTO, historical fallback, baseline hidden when meaningless, profile trade-offs, daily summary, activity description/reason/source, meal guidance, transport endpoints, estimated labels, and no invented restaurant.

- [ ] **Step 2: Run and verify failure**

Run: `npm.cmd --workspace client test -- objective-scope.test.jsx objective-workspace.test.jsx`  
Expected: FAIL because focused presentation components are absent.

- [ ] **Step 3: Implement compact responsive presentation**

Preserve the existing workspace layout and editing/dialog controls. Do not nest cards. Display differentiation as understandable profile trade-offs, not Jaccard scores or diagnostics.

- [ ] **Step 4: Run client tests/build and commit**

Run: `npm.cmd --workspace client test -- objective-scope.test.jsx objective-workspace.test.jsx`  
Run: `npm.cmd --workspace client run build`  
Expected: PASS.

```powershell
git add client/src/components client/tests/objective-scope.test.jsx client/tests/objective-workspace.test.jsx
git commit -m "feat: present complete itinerary alternatives"
```

### Task 19: Preserve Security, CRUD, Archives, Regeneration, and Hard Budgets

**Files:**
- Modify: `server/tests/objective-editing.test.js`
- Modify: `server/tests/repository-contract.test.js`
- Modify: `server/tests/security-objectives.test.js`
- Modify: `server/tests/objective-generation.test.js`
- Modify: `client/tests/planner.test.jsx`
- Modify: `client/tests/objective-workspace.test.jsx`
- Modify: `client/tests/profile-page.test.jsx`
- Modify: `tests/e2e/objective-journey.spec.js`

- [ ] **Step 1: Add missing cross-feature regression tests**

Cover authentication, owner authorization, privacy consent, prompt screening, Save, Select, Edit, Regenerate, Delete, archive reuse, account deletion, structured and legacy records, current-ID re-resolution, and all three hard-budget summaries. Assert selected outcomes remain exactly once and profile plans remain independently generated.

- [ ] **Step 2: Extend the demo E2E journey**

Exercise discovery, MANUAL selection, three alternatives, profile trade-offs, budget utilization, outcome display, workspace details, regeneration, archive, and deletion. Add AUTO mode with a non-empty demo pool and a controlled empty-pool server test. Keep existing authentication coverage.

- [ ] **Step 3: Run focused regressions**

Run: `npm.cmd --workspace server test -- objective-editing.test.js repository-contract.test.js security-objectives.test.js objective-generation.test.js budget-engine.test.js`
Run: `npm.cmd --workspace client test -- planner.test.jsx objective-workspace.test.jsx profile-page.test.jsx destination-discovery.test.jsx`  
Expected: PASS.

- [ ] **Step 4: Run E2E and commit**

Run: `npm.cmd run test:e2e -- tests/e2e/objective-journey.spec.js`  
Expected: PASS against the configured demo test server.

```powershell
git add server/tests client/tests tests/e2e/objective-journey.spec.js
git commit -m "test: cover profile planning regressions"
```

### Task 20: Verify Beijing Acceptance and Document Honest Evidence

**Files:**
- Modify: `docs/MANUAL_ACCEPTANCE.md`
- Modify: `docs/LIVE_PROVIDER_VERIFICATION.md`
- Modify: `docs/API.md`
- Modify: `docs/OBJECTIVE_ALIGNMENT.md`
- Modify: `docs/REPORT_IMPLEMENTATION_ALIGNMENT.md`
- Create: `docs/audits/DESTINATION_DISCOVERY_IMPLEMENTATION.md`

- [ ] **Step 1: Add the optional AMap feasibility and coordinate contract to documentation**

State that OpenTripMap remains mandatory; AMap is not implemented. Record potential POI/route enrichment, strong-match requirements, WGS84 canonical coordinates, separate future GCJ-02 values, prohibited direct Leaflet mixing, future three-city alignment tests, and required report amendments before adoption.

- [ ] **Step 2: Run the complete automated baseline**

Run: `npm.cmd test`  
Run: `npm.cmd run test:integration`  
Run: `npm.cmd run test:e2e`  
Run: `npm.cmd run lint`  
Run: `npm.cmd run build`  
Expected: test/E2E/lint/build PASS. Record integration output exactly. Credential-gated checks may skip and must be reported **NOT EXECUTED**. Record type checking as `NOT CONFIGURED` when no script exists.

- [ ] **Step 3: Verify the exact MANUAL scenario in demo mode**

Use Chinese, Beijing, three days, two travellers, CNY 6,000, History/Culture/Food, and Forbidden City, Temple of Heaven, Summer Palace, and Jingshan Park. Verify discovery, Stage-A priority outcomes, genuine profile trade-offs, no forced inferior POI, reconciled budget fields, hard ceiling, localized descriptions/reasons, map, meals, transport, Save/Edit/Regenerate/Delete, archives, and no raw enums.

- [ ] **Step 4: Verify AUTO, English, sparse-pool, and empty-pool scenarios**

Confirm AUTO uses only a non-empty validated pool, English is consistently English, sparse pools may return similar valid alternatives, and an empty validated pool stops before the LLM.

- [ ] **Step 5: Run live checks only with genuine configuration**

- OpenTripMap: execute only with a real key and live travel-provider mode; otherwise **NOT EXECUTED**.
- OpenRouter: execute only with a real key and live AI mode; otherwise **NOT EXECUTED**.
- MySQL: execute only with real settings and MySQL mode; otherwise **NOT EXECUTED**.
- AMap: **NOT IMPLEMENTED / NOT EXECUTED** in this implementation.

Never print credentials or infer live success from mocks/demo/skips.

- [ ] **Step 6: Write the implementation audit and final checks**

Record root causes, algorithms/configuration, exact files, no-migration evidence, test counts, command results, live statuses, limitations, UI pages inspected, and whether report wording requires updates.

Run: `git diff --check`  
Run: `git status --short`  
Run: `npm.cmd test`  
Run: `npm.cmd run lint`  
Run: `npm.cmd run build`  
Expected: no whitespace errors and all executed non-live checks PASS.

- [ ] **Step 7: Commit**

```powershell
git add docs
git commit -m "docs: verify destination itinerary quality"
```

## Execution Order and Review Gates

1. Tasks 1-3 establish contracts, canonical OpenTripMap normalization, and the discovery API.
2. Tasks 4-6 deliver discovery and authoritative MANUAL/AUTO/legacy preference resolution.
3. Tasks 7-9 implement transparent features, baseline/allocatable budgeting, and two-stage profile pre-planning.
4. Tasks 10-11 constrain drafting and integrate `PLAN -> EXECUTE -> VALIDATE -> REPAIR`.
5. Tasks 12-13 reconcile every selected attraction through complete validation.
6. Task 14 measures differentiation and permits only one bounded quality repair.
7. Tasks 15-18 preserve persistence while adding localized detailed presentation.
8. Tasks 19-20 prove regressions and document automated, demo, and live evidence honestly.

Stop after any task if evidence shows an existing public API must break, a MySQL migration is genuinely required, AMap production integration is needed, or an approved objective must change. Present that evidence before continuing.

## Specification Coverage Self-Review

| Specification sections | Plan coverage |
| --- | --- |
| 1-4 Purpose, scope, findings, architecture | Global Constraints; Tasks 7-14 implement deterministic profile planning and validation without architectural replacement. |
| 5-6 User flow and discovery | Tasks 1-5. |
| 7 Preference compatibility | Tasks 1, 5, 6, 15, 19. |
| 8 Candidate/enrichment/empty results | Tasks 1-3, 11, 16-18. |
| 9 Profile pre-planning | Tasks 7 and 9-11. |
| 10 Baseline/allocatable budget | Tasks 1, 8, 9, 11, 18. |
| 11 Controlled LLM/execution/repair | Tasks 10-11 and existing validator/repair regressions. |
| 12 Selected reconciliation | Tasks 6, 9, 12-13, 15. |
| 13 Safe differentiation | Task 14 plus Tasks 18-20 for presentation/evidence. |
| 14 Optional AMap/coordinate boundary | Tasks 1, 2, 4, and documentation-only Task 20; no runtime adapter. |
| 15 Localization/provenance | Tasks 1-3 and 16-18. |
| 16-17 Details/comparison/workspace | Tasks 16-18. |
| 18 Persistence/security | Tasks 6, 15, 19. |
| 19 Error handling | Tasks 2-3, 6, 8-14, 17-19. |
| 20 Automated testing | Every task starts with failing tests and exact commands. |
| 21 Manual acceptance | Task 20 uses the exact Beijing scenario plus AUTO/English/sparse/empty cases. |
| 22 Verification reporting | Task 20 separates automated/demo evidence from genuinely executed live checks. |
| 23 FYP report impact | Task 20 documents optional AMap amendments; current objectives remain unchanged. |
| 24 Expected file areas | File Structure and every task remain inside approved boundaries. |

## Plan Self-Review Result

- Every approved requirement maps to at least one task.
- Selected attraction priority is a separate Stage A before weighted Stage B scoring.
- Supported selected attractions that are only approximately infeasible remain provisionally deferred until complete evaluation and reconciliation; pre-planning alone cannot finally exclude them.
- Baseline and allocatable spending precede utilization targeting, use existing cost references and pre-generation unit rules, and enforce `baseline floor + profile uplift = final category` without double counting.
- Differentiation is quality-only, uses rich-pool and sparse/shared-optimal scenarios, handles an empty non-selected union, and cannot invalidate a useful mandatory-valid trip merely for similarity.
- Presentation provenance separately covers OpenTripMap, controlled/database-backed enrichment, AI-generated reasons, estimated values, and unavailable descriptions.
- OpenTripMap remains mandatory; AMap remains documentation/test-contract scope only.
- No MySQL migration is planned.
- No application implementation begins until this revised plan is approved.
