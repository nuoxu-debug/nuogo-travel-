# Completed Objective Evidence

## Completed Objective

**Objective 2: Generate one constraint-aware Singapore itinerary for a selected Travel Style within a hard SGD budget.**

## What Is Completed

Nuogo lets a traveller plan for Singapore by entering structured preferences, choosing exactly one Travel Style, optionally requesting a rainy-day backup, and generating one validated itinerary workspace.

The implemented flow is:

```text
Destination -> Preferences -> ONE Travel Style -> Optional Rainy-Day Backup -> Generate -> ONE Itinerary Workspace
```

## User Evidence

The completed objective is visible through these pages:

- `/discover/singapore` for Singapore attraction discovery.
- `/planner` for dates, travellers, interests, hard SGD budget, and one Travel Style.
- `/trip/:tripId` for the generated itinerary workspace, validation status, daily plan, budget totals, route estimates, POI sources, and optional inactive rainy-day backup.

## Implementation Evidence

Main implementation files:

- `client/src/pages/PlannerPage.jsx`
- `client/src/components/PreferenceForm.jsx`
- `client/src/components/ObjectiveTripWorkspace.jsx`
- `server/src/routes/trips.js`
- `server/src/services/itinerary/generateValidatedTrip.js`
- `server/src/services/budget/budgetEngine.js`
- `server/src/services/validation/validationEngine.js`
- `server/src/services/repair/repairLoop.js`
- `shared/schemas.js`

## Test Evidence

Automated tests covering this objective:

- `server/tests/objective-generation.test.js`
- `server/tests/budget-engine.test.js`
- `server/tests/validation-engine.test.js`
- `server/tests/repair-loop.test.js`
- `server/tests/rainy-day-backup.test.js`
- `client/tests/planner.test.jsx`
- `client/tests/objective-workspace.test.jsx`
- `tests/e2e/objective-journey.spec.js`

Verified checkpoint evidence:

```text
Client: 99 passed
Server: 242 passed
Shared: 10 passed
E2E: 17 passed, 5 skipped
Lint: passed
Production build: passed
```

## Assessment Boundary

This objective does not claim booking, payment, live fares, live weather detection, live navigation, AMap, Mafengwo, or the retired three-itinerary comparison design.

Historical China/CNY/Beijing references remain only where required for migration compatibility, archived data compatibility, negative tests, or documentation history.
