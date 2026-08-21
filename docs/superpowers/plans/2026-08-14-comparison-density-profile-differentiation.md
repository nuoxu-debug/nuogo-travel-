# Comparison Density and Spending-Profile Differentiation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate three genuinely different, connected, hard-budget itineraries and present their calculated differences clearly on the comparison page.

**Architecture:** Extend the existing objective planner with deterministic profile strategies and server-calculated comparison metrics. Keep the API route and itinerary contract compatible, then make the current comparison components render the richer response with progressive disclosure.

**Tech Stack:** JavaScript, Zod, Express, React 18, Vitest, Testing Library, Playwright, Tailwind/CSS, GSAP.

## Global Constraints

- The same user total is a hard budget for all three variants.
- Only verified candidate IDs may become itinerary activities.
- Do not copy, randomize, or cosmetically relabel duplicate plans.
- Preserve mandatory sights, arrival/departure limits, day continuity, and source provenance.
- Plan/day switching is local UI state and causes no additional API or LLM request.

---

### Task 1: Deterministic profile strategy and dense demo drafts

**Files:**
- Modify: `server/src/services/budget/spendingProfiles.js`
- Modify: `server/src/services/llm/buildItineraryPrompt.js`
- Modify: `server/src/providers/demoProvider.js`
- Test: `server/tests/objective-generation.test.js`

**Interfaces:**
- Produces: `getSpendingProfile(profile)` with `accommodationTier`, `foodTier`, `routeModes`, `fullDayActivityTarget`, `pace`, and allocation metadata.
- Consumes: candidate IDs and candidate categories already supplied to `generateStructured`.

- [ ] Write failing tests proving a full middle day has multiple unique candidate activities, preferred sights remain present, and profile drafts use distinct strategy characteristics.
- [ ] Run `npm --workspace server test -- objective-generation.test.js` and confirm the new assertions fail because current drafts contain one activity per day.
- [ ] Extend profile definitions with deterministic strategy fields and include them in the constrained prompt.
- [ ] Update demo structured generation to select unique nearby candidates, insert FOOD activities where available, target realistic full-day density, and respect first/last-day time windows.
- [ ] Run the focused server test and confirm the draft-density assertions pass.

### Task 2: Profile-aware budget, route modes, metrics, and differentiation validation

**Files:**
- Modify: `server/src/services/itinerary/buildTripLegs.js`
- Modify: `server/src/services/itinerary/generateValidatedTrip.js`
- Modify: `server/src/services/budget/budgetEngine.js`
- Create: `server/src/services/itinerary/buildVariantMetrics.js`
- Create: `server/src/services/validation/validators/spendingProfileValidator.js`
- Test: `server/tests/budget-engine.test.js`
- Test: `server/tests/objective-generation.test.js`

**Interfaces:**
- Produces: `buildVariantMetrics(itinerary, summary, profileDefinition)` returning counts, transport distribution, tiers, pace, key attractions, day summaries, and reason bullets.
- Produces: `validateSpendingProfiles(variants)` returning `INSUFFICIENT_VARIANT_DIFFERENTIATION` or profile-order issues.

- [ ] Write failing budget tests proving tier factors change accommodation/food totals without post-adjusting prices.
- [ ] Write failing generation tests proving route modes and metrics differ, all totals remain within budget, and obvious duplicate variants fail validation.
- [ ] Make `buildTripLegs` accept either one mode or a per-leg mode resolver and choose modes from the profile strategy.
- [ ] Calculate accommodation and food with named tier factors from cost references; keep every category integer fen and preserve provenance.
- [ ] Build comparison metrics from enriched activities, legs, and summaries on the server.
- [ ] Validate all three variants together and fail closed on duplicates or strategy contradictions.
- [ ] Run focused budget and objective-generation tests until green.

### Task 3: Decision-focused comparison interface

**Files:**
- Modify: `client/src/components/ComparisonRouteRail.jsx`
- Modify: `client/src/components/PlanComparison.jsx`
- Modify: `client/src/pages/ComparePage.jsx`
- Modify: `client/src/styles/index.css`
- Test: `client/tests/planner.test.jsx`
- Test: `client/tests/objective-workspace.test.jsx`

**Interfaces:**
- Consumes: `variant.variantMetrics`, `variant.summary.categoriesFen`, and `variant.itinerary.days`.
- Preserves: `onChoose(variant)` and legacy comparison data support.

- [ ] Add a failing frontend fixture and assertions for three different totals, readable category amounts, activity/leg counts, tier labels, reasons, day tabs, and an explicit selected state.
- [ ] Replace unlabeled thin bars with a common-scale comparison matrix containing numeric CNY values.
- [ ] Refactor cards into compact summary, metrics, reasons, day preview, and choose action sections.
- [ ] Add local accessible day tabs and render ordered start, leg, activity/meal, and end preview rows.
- [ ] Make desktop three-column and mobile stacked/horizontal layouts readable without nested cards or clipped controls.
- [ ] Run focused client tests until green.

### Task 4: End-to-end regression and visual verification

**Files:**
- Create: `tests/e2e/comparison-profiles.spec.js`
- Modify: `playwright.config.js` only if the existing server configuration cannot run the scenario.

**Interfaces:**
- Exercises: planner input -> guest session -> generation -> comparison -> plan selection.

- [ ] Add a five-day Beijing scenario for two travellers, sufficient hard budget, history and food interests, and Forbidden City as a preferred sight.
- [ ] Assert three named final variants, every total within the same budget, meaningful metric differences, and multiple events on full middle days.
- [ ] Capture desktop and mobile comparison screenshots and inspect text fit, selected state, card height, category readability, and route truthfulness.
- [ ] Run `npm test`, `npm run lint`, `npm run build`, and `npm run test:e2e -- comparison-profiles.spec.js`.
- [ ] Record exact totals, metrics, one complete day, test counts, build result, lint result, and screenshot paths in the completion report.
