# Nuogo Report and Implementation Alignment

Date: 2026-08-14

This file records where the implemented Nuogo MVP now differs from older proposal wording. It does not modify or silently reinterpret the submitted FYP report.

## Already Aligned

- The assessed MVP implements the updated three objectives: security/privacy, constraint-aware multi-itinerary generation, and grounded tourism information.
- Every planning request produces three independently validated spending profiles under the same user hard budget: `BUDGET_SAVING`, `BALANCED`, and `COMFORT_FOCUSED`.
- The generation path uses a fixed structured itinerary schema, source-labelled POI candidates, deterministic route/time/budget calculations, validation, and a bounded repair loop.
- OpenTripMap is implemented as supporting tourism enrichment.
- Provider IDs, retrieval metadata, route sources, and system-estimate labels are retained in final DTOs and shown in the itinerary workspace.

## Report Changes Required

| Report topic | Implemented position | Evidence |
| --- | --- | --- |
| Primary China travel source | AMap is the primary POI and route provider. OpenTripMap is a supporting enrichment provider. | `server/src/providers/travel/amapProvider.js`; `server/src/providers/travel/openTripMapProvider.js` |
| Origin and complete trip chain | The input includes `origin`, arrival/departure date-time, outbound/return mode and cost, local legs, day anchors, and return travel. | `shared/schemas.js`; `client/src/components/PreferenceForm.jsx` |
| Budget scope | The hard budget is door-to-door and has eight categories: outbound, return, accommodation, local transport, food, attractions, entertainment, and other. | `server/src/services/budget/budgetEngine.js` |
| Transport costing | User-provided trip transport totals are preserved; driving can be calculated from distance, fuel consumption, fuel reference price, tolls, and parking. Route costs are system-calculated. | `fuelCalculator.js`; `budgetEngine.js`; `buildTripLegs.js` |
| Itinerary mechanics | Each day has a start point, ordered legs and activities, an end point, propagated schedule, and cross-day continuity checks. | `shared/itineraryDraftSchema.js`; `validationEngine.js`; `propagateSchedule.js` |
| AI boundary | OpenRouter proposes only structured drafts using approved candidate IDs. It does not calculate authoritative prices, routes, totals, or validation outcomes. | `itineraryHarness.js`; `openRouterStructuredProvider.js` |
| Validation technology | Zod is the implemented request and structured-output contract boundary. Any report claim naming `express-validator` or Ajv as the active validator is outdated. | `shared/schemas.js`; `shared/itineraryDraftSchema.js` |
| Repair behavior | Validation issues are classified, deterministic repair is attempted first, targeted LLM repair is bounded, and invalid output is never marked final. | `server/src/services/repair/*` |
| Completed state | Only `FINAL_VALIDATED` is presented as a completed generated itinerary. | `generateValidatedTrip.js`; `ObjectiveTripWorkspace.jsx` |
| Supported coverage | The assessed scope is Beijing, Shanghai, and Xi'an. Nationwide coverage and advanced route optimisation are outside this MVP. | `shared/travelTaxonomy.js`; `docs/OBJECTIVE_ALIGNMENT.md` |
| Technology stack | React/Vite, Express, shared Zod contracts, MySQL or memory repositories, SQL.js catalogue support, OpenRouter, AMap, OpenTripMap, Leaflet, GSAP, anime.js, and Three.js. PHP, Bootstrap, XAMPP, and a direct DeepSeek API are not the implemented stack. | root and workspace `package.json` files; `CURRENT_ARCHITECTURE.md` |

## Academic Wording Boundaries

- Describe provider facts as AMap-sourced/matched or OpenTripMap supporting information, not automatically as live verified facts.
- Describe category and activity prices as system estimates based on reference data, not provider ticket quotations or live availability.
- Describe live providers as implemented and mock-verified. Do not claim live verification until `docs/LIVE_PROVIDER_VERIFICATION.md` records an opt-in run with configured credentials.
- Describe demo destination and cost records as development fixtures, not administrator-verified production data.

## Current Evidence

- Exact five-day Kuala Lumpur-to-Beijing acceptance fixture: `server/tests/objective-generation.test.js`.
- Shanghai and Xi'an isolation fixtures: `server/tests/objective-generation.test.js`.
- Driving, fuel, toll, local transport, hard-budget, and rounding checks: `server/tests/budget-engine.test.js`.
- Repair and stale-dependency checks: `server/tests/repair-loop.test.js`.
- Security and prompt-injection checks: `server/tests/security-objectives.test.js`.
- Desktop/mobile account and itinerary journey: `tests/e2e/objective-journey.spec.js`.
