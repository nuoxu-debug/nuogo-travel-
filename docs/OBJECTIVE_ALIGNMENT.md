# Nuogo Objective Alignment

Date: 2026-08-14

This document maps the assessed MVP to the updated FYP objectives. Historical modules remain in the repository where deleting them would remove migration/audit evidence, but they are not counted as objective coverage.

## Objective Traceability

| Objective | Required behavior | Production evidence | User-facing evidence | Test evidence |
| --- | --- | --- | --- | --- |
| 1. Security and privacy | Validate input, authenticate, authorize, protect keys, record consent, delete data, screen prompt injection, redact logs | `shared/schemas.js`; `server/src/middleware/auth.js`; `server/src/services/tripAccess.js`; `server/src/services/promptInjection.js`; `server/src/services/logger.js`; `server/src/routes/privacy.js` | `client/src/components/PreferenceForm.jsx`; `client/src/components/PrivacyDialog.jsx` | `server/tests/security-objectives.test.js`; `server/tests/api.test.js`; `client/tests/objective-workspace.test.jsx` |
| 2. Constraint-aware generation | Three spending strategies under one hard budget, deterministic costs, validation and bounded repair | `server/src/services/budget/*`; `server/src/services/llm/*`; `server/src/services/validation/*`; `server/src/services/repair/*`; `server/src/services/itinerary/generateValidatedTrip.js` | `PlannerJourneyHorizon.jsx`; `PipelineOverlay.jsx`; `PlanComparison.jsx`; `ObjectiveTripWorkspace.jsx` | `server/tests/objective-generation.test.js`; `server/tests/budget-engine.test.js`; `server/tests/repair-loop.test.js`; `client/tests/planner.test.jsx` |
| 3. Grounded tourism information | Retrieve and normalize POIs, preserve source identifiers/coordinates/categories, reject unsupported locations, display provenance | `server/src/providers/travel/amapProvider.js`; `openTripMapProvider.js`; `server/src/services/poi/*`; `server/src/services/validation/validationEngine.js` | Source labels in `PlanComparison.jsx` and grounded details in `ObjectiveTripWorkspace.jsx` | `server/tests/travel-providers.test.js`; `server/tests/candidate-pool.test.js`; `server/tests/validation-engine.test.js`; `client/tests/objective-workspace.test.jsx` |

## Runtime Boundary

- Supported destinations: `beijing`, `shanghai`, `xian` only.
- Profiles: `BUDGET_SAVING`, `BALANCED`, `COMFORT_FOCUSED` only.
- Currency: CNY; API and engine money values use integer fen.
- Completed output state: `FINAL_VALIDATED` only.
- Primary travel provider: AMap. Supporting tourism provider: OpenTripMap.
- Demo travel data is deterministic and visibly labelled `DEMO`.
- Basic Leaflet/OpenStreetMap display is in scope; advanced optimisation and navigation are not.

## Legacy Classification

| Legacy area | Classification | Runtime treatment |
| --- | --- | --- |
| Human guide panel/data embedded in old activities | Legacy / no longer required | Hidden in assessed workspace; code retained for compatibility tests |
| Public bearer-link sharing and voting | Legacy / no longer required | Server and client routes disabled by default behind explicit legacy flags |
| Anhui/Huangshan/Mafengwo ingestion | Harmless historical evidence | CLI/data files retained; destination absent from assessed planner |
| Old budget/food/leisure generator | Compatibility path | New `totalBudgetCny` contract selects the objective pipeline |
| Authenticated members and group expenses | Reusable additional capability | Preserved, but not counted as evidence for Objectives 1-3 except access-control tests |

## Information Labels

The UI and DTOs maintain these boundaries:

- User input remains in `trip.preferences` for authorized regeneration.
- Provider facts are attached to activities under `poi`, including canonical ID, source records, coordinates, and retrieval metadata.
- LLM output is restricted to sequence, duration, activity type, and recommendation reason.
- Routes, schedules, category costs, totals, remaining budget, and per-person costs are system-generated estimates.
- `DEMO` labels identify fixtures; provider source labels identify live or cached facts. Neither is described as current price or availability.

## Known Verification Boundary

Deterministic tests verify provider adapters and the complete orchestration path without paid keys. Live AMap, OpenTripMap, and OpenRouter calls require separate opt-in execution and must never be reported as passing unless the relevant environment keys and live test command were used.
