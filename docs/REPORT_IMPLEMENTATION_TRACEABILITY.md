# Singapore Report Implementation Traceability

This trace records the five research modules required by the Singapore Nuogo MVP. System Administrator maintenance supports the modules but is not counted as a sixth research module.

| Module | Implemented functions | Research objective contribution | Code evidence |
| --- | --- | --- | --- |
| 1. User and Preference Module | Registration, login, Guest Mode, 24-hour guest lifecycle, bilingual structured Singapore preferences, MANUAL/AUTO selection, one Travel Style, consent, explicit guest save | **RO1:** captures and protects the traveller inputs needed to produce and manage a personalized plan. | `client/src/components/PreferenceForm.jsx`; `client/src/context/AuthContext.jsx`; `server/src/routes/auth.js`; `server/src/routes/trips.js`; `server/src/services/authService.js`; `shared/schemas.js` |
| 2. Attraction Grounding Module | Singapore-only discovery, provider normalization, WGS84 map points, destination candidate pool, server-side xid resolution, demo/live provenance separation, zero-candidate failure | **RO1:** lets travellers express grounded attraction preferences. **RO3:** prevents invented canonical attractions and preserves tourism-source evidence. | `client/src/pages/DestinationDiscoveryPage.jsx`; `client/src/components/AttractionDiscoveryMap.jsx`; `server/src/routes/meta.js`; `server/src/services/poi/openTripMapCandidateService.js`; `server/src/services/poi/buildCandidatePool.js` |
| 3. LLM Itinerary and Rainy-Day Contingency Module | One selected-style itinerary, constrained prompt, DeepSeek-compatible OpenRouter adapter, deterministic demo provider, optional grounded inactive rainy alternative | **RO2:** produces the AI-assisted itinerary structure and useful localized recommendations while keeping the contingency optional and separate. | `server/src/services/llm/buildItineraryPrompt.js`; `server/src/providers/openRouter.js`; `server/src/providers/demoProvider.js`; `server/src/services/itinerary/generateValidatedTrip.js`; `server/src/services/itinerary/rainyDayBackup.js` |
| 4. Validation and Budget Module | Ordered schema/grounding/date/chronology/route/duplicate/style/backup/budget validation, deterministic SGD recalculation, hard-budget gate, one controlled repair | **RO2:** rejects unusable AI drafts and controls one repair. **RO3:** validates grounded identities, route plausibility, provenance, and estimated costs before success. | `server/src/services/validation/validationEngine.js`; `server/src/services/budget/budgetEngine.js`; `server/src/services/repair/repairLoop.js`; `server/src/services/itinerary/reconcileSelectedAttractions.js` |
| 5. Itinerary Management Module | Validated workspace, map, activity detail/edit, rename, regenerate, archive, explicit save, delete, revision and owner checks | **RO1:** gives the traveller practical control over the generated result and persistent records. | `client/src/components/ObjectiveTripWorkspace.jsx`; `client/src/pages/ArchivePage.jsx`; `server/src/routes/trips.js`; `server/src/repositories/memory.js`; `server/src/repositories/mysql.js` |

## Terms And Boundaries

- **Minimum Viable Product (MVP):** the assessed Singapore-only prototype implementing the minimum complete research workflow, not a commercial booking product.
- **Point of Interest (POI):** a traveller-relevant attraction, museum, park, landmark, or cultural site represented by a destination-scoped grounded identity.
- **System Administrator:** a logical specialization of `USER` represented by `users.role = 'admin'`, not a separate password table.
- **Money:** active domain and API values are SGD cents named `amountMinor`, `budgetMinor`, or equivalent. Existing MySQL `_fen` columns are physical compatibility fields and do not reinterpret archived CNY as SGD.
- **Provenance:** user-provided, OpenTripMap API, database-backed, AI-generated, estimated, demo fixture, and unavailable information are displayed distinctly. OpenTripMap matching alone is not labelled currently verified.
- **Live verification:** deterministic tests and demo-browser checks are not evidence that OpenTripMap, OpenRouter, or MySQL live integration executed successfully.

Detailed screen, API, field, and persistence mapping is in `docs/FRONTEND_ERD_TRACEABILITY.md`.

## Verification Evidence (2026-09-04)

- Automated unit/API/frontend tests: 346 passed (shared 10, server 242, client 94).
- Demo-mode Playwright: 14 passed and 4 intentionally skipped across desktop and mobile projects.
- Lint: zero errors and five existing React Hook dependency warnings.
- Production build: passed with the documented Vite chunk-size warning.
- Live OpenTripMap: **NOT EXECUTED**; credential-gated integration test skipped.
- Live OpenRouter: **NOT EXECUTED**; credential-gated integration test skipped.
- Live MySQL: **NOT EXECUTED**; opt-in disposable database test skipped.
