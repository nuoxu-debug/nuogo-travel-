# Singapore Report Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUBSKILL: Use `superpowers:executing-plans` to implement this plan task by task, and `superpowers:test-driven-development` for every behavior change.

**Goal:** Migrate the active Nuogo MVP from the frozen China implementation to a truthful, browser-previewable Singapore-only product with one preselected Travel Style, one validated itinerary, SGD budgeting, optional inactive rainy-day contingency, and correctly bounded Guest, Registered Traveller, and System Administrator access.

**Architecture:** Preserve the existing React/Vite, Express, shared Zod/Ajv contract, provider/repository, MySQL/memory, Leaflet/OpenStreetMap, authentication, and one-workspace architecture. Add Singapore behavior through shared contracts, deterministic fixtures, additive migrations, repository adapters, and focused UI changes. Historical China records remain readable at compatibility boundaries, but cannot enter new Singapore generation.

**Tech Stack:** React 18, Vite 5, Tailwind CSS, Express 4, Zod, Ajv, MySQL/mysql2, JWT, bcryptjs, Leaflet/OpenStreetMap, Vitest, Supertest, Playwright.

**Approved sources:** The authoritative report is `C:/Users/G16/Downloads/zzzz后.docx`. Required refinements are in `C:/Users/G16/.codex/attachments/57b58bb8-1786-4a41-868d-9acd50bd8158/pasted-text.txt`. The rollback baseline is `ed0698f07b417c9d5a9f5f2d6ee305298cbf8f55` on frozen branch `feat/report-aligned-nuogo`.

## Global Constraints

- Work only on `feat/singapore-report-alignment` in `.worktrees/singapore-report-alignment`.
- Never edit the Word report or the frozen China worktree.
- Singapore is the only active destination; historical China data is compatibility-only.
- New domain/API money fields use generic minor-unit names and `SGD`; existing `_fen` database columns may remain behind repositories.
- One request produces one itinerary for one pre-generation Travel Style.
- Rainy-Day Backup is optional, grounded, inactive, non-duplicate, Singapore-only, and excluded from the active total until explicitly used.
- The server remains authoritative for POI identity and hard-budget validation.
- Demo fixtures use visibly internal `demo-sg-*` identifiers and `DEMO_FIXTURE` provenance. Only live OpenTripMap data uses genuine xids.
- One initial LLM draft and at most one controlled repair attempt; both pass the complete ordered validation pipeline.
- Chinese is the default; English is supported; no raw enums, mojibake, CNY, China city, or developer text may leak into active Singapore UI.
- Use `apply_patch` for manual source edits and create one focused commit per task.

## Task 1: Singapore Shared Contract

**Modify:** `shared/constants.js`, `shared/schemas.js`, `shared/destinationDiscovery.js`, `shared/itineraryDraftSchema.js`

**Tests first:** update `shared/contracts.test.js` and `shared/destinationDiscovery.test.js` to prove:

- only `singapore` is active, centered at Singapore WGS84 coordinates;
- new preferences require start/end date, traveller count, `budgetMinor`, interests, MANUAL/AUTO, one Travel Style, rainy backup flag, language, and consent;
- duration is derived inclusively from dates;
- arrival/departure/origin/intercity fields and `totalBudgetCny` are not required or accepted for new requests;
- MANUAL requires unique selected IDs; AUTO contains none;
- archived preferences preserve old destination/currency fields without interpreting CNY as SGD;
- itinerary draft money uses `estimatedCostMinor`/`budgetMinor` and `currency: SGD`.

**RED:** `npm.cmd --workspace shared test`

**Implement:** introduce Singapore-only active constants, currency/provenance constants, `deriveTripDurationDays`, strict active schemas, and explicit legacy normalizers. Keep legacy parsing isolated and named as compatibility behavior.

**GREEN:** `npm.cmd --workspace shared test`

**Commit:** `feat(shared): define Singapore planning contract`

## Task 2: Singapore Demo Discovery Fixtures

**Modify:** `server/src/providers/travel/demoTravelProvider.js`, `server/src/services/poi/normalizeOpenTripMapPoi.js`, `server/src/services/poi/buildCandidatePool.js`, `server/src/services/poi/buildDiscoveryResponse.js`, `server/src/runtime/initializeDemoRuntime.js`

**Tests first:** update `server/tests/travel-providers.test.js`, `server/tests/poi-pipeline.test.js`, `server/tests/discovery-api.test.js`, and `server/tests/initialize-demo-runtime.test.js` to prove:

- demo discovery returns only Singapore POIs with `demo-sg-*` IDs;
- fixtures include indoor and outdoor POIs suitable for rainy contingency;
- demo provenance is `DEMO_FIXTURE`, never OpenTripMap or currently verified;
- unsupported destination discovery is controlled;
- live OpenTripMap normalization retains provider identity and cannot accept fabricated client metadata.

**RED/GREEN:** `npm.cmd --workspace server test -- --run tests/travel-providers.test.js tests/poi-pipeline.test.js tests/discovery-api.test.js tests/initialize-demo-runtime.test.js`

**Commit:** `feat(discovery): ground Singapore demo POIs`

## Task 3: SGD Minor-Unit Budget Model and References

**Create:** `database/migrations/016_singapore_report_alignment.sql`

**Modify:** `server/src/services/budget/demoCostReferenceFixtures.js`, `server/src/services/budget/costReferenceService.js`, `server/src/services/budget/budgetEngine.js`, `server/src/services/budget/profileBudget.js`, `server/src/services/budget/spendingProfiles.js`, `server/src/repositories/objectiveRecords.js`, `server/src/repositories/memory.js`, `server/src/repositories/mysql.js`, `server/src/repositories/migrations.js`

**Tests first:** update `server/tests/budget-engine.test.js`, `server/tests/profile-budget.test.js`, `server/tests/spending-profile-config.test.js`, `server/tests/repository-contract.test.js`, and `server/tests/migrations.test.js` to prove:

- all new planning values are SGD cents exposed as generic minor units;
- reference values exactly match Table 3.11, including accommodation 68/165/660 SGD room-night, transport 1.28/1.90/2.57 SGD, food bands, named attraction tickets, and miscellaneous 10/20/30 SGD;
- baseline multiplication handles travellers, nights, days, zero allocation, rounding, and exact budget boundaries without double counting;
- all styles obey the same hard maximum and soft utilisation heuristics never force waste;
- migration activates Singapore, makes old destinations unavailable for new generation, and preserves old rows;
- repository adapters map legacy `_fen` storage without reinterpreting archived CNY.

**RED/GREEN:** `npm.cmd --workspace server test -- --run tests/budget-engine.test.js tests/profile-budget.test.js tests/spending-profile-config.test.js tests/repository-contract.test.js tests/migrations.test.js`

**Commit:** `feat(budget): add authoritative SGD planning references`

## Task 4: Singapore Preference Request Boundary

**Modify:** `server/src/validation/requestValidators.js`, `server/src/validation/validateRequest.js`, `server/src/routes/trips.js`, `server/src/services/poi/resolveAttractionPreferences.js`, `client/src/planning/attractionDraft.js`

**Tests first:** update `server/tests/request-validation.test.js`, `server/tests/attraction-preferences.test.js`, and `server/tests/objective-generation.test.js` to prove:

- server accepts the simplified Singapore payload and rejects obsolete active China fields;
- server resolves MANUAL identifiers from its candidate pool and ignores client provenance/details;
- AUTO uses the same validated pool;
- zero candidates stop before LLM generation;
- unknown, wrong-destination, ambiguous, and unavailable identifiers fail or become explicit outcomes according to the approved policy.

**RED/GREEN:** `npm.cmd --workspace server test -- --run tests/request-validation.test.js tests/attraction-preferences.test.js tests/objective-generation.test.js`

**Commit:** `feat(api): accept Singapore planning preferences`

## Task 5: Singapore Discovery and Planner UI Vertical Slice

**Modify:** `index.html`, `client/src/pages/LandingPage.jsx`, `client/src/pages/DestinationDiscoveryPage.jsx`, `client/src/pages/PlannerPage.jsx`, `client/src/components/AttractionCard.jsx`, `client/src/components/AttractionDiscoveryMap.jsx`, `client/src/components/PreferenceForm.jsx`, `client/src/components/PlannerJourneyHorizon.jsx`, `client/src/components/ScrollJourneyMap.jsx`, `client/src/three/journeyPath.js`, `client/src/i18n/translations.js`, `client/src/i18n/display.js`, `client/src/styles/index.css`

**Tests first:** update `client/tests/destination-discovery.test.jsx`, `client/tests/planner.test.jsx`, `client/tests/landing-flight-atlas.test.jsx`, `client/tests/display-localization.test.js`, and `client/tests/objective-scope.test.jsx` to prove:

- browser title and active copy are Singapore-specific;
- destination is fixed/preselected as Singapore without a fake multi-city selector;
- form contains only report inputs and derives duration;
- budget displays S$/SGD and submits `budgetMinor`;
- one Travel Style is selected before generation;
- discovery cards/map support MANUAL and AUTO with Singapore markers;
- Chinese is default and both languages contain no raw enum/CNY/China leakage.

**RED/GREEN:** `npm.cmd --workspace client test -- --run tests/destination-discovery.test.jsx tests/planner.test.jsx tests/landing-flight-atlas.test.jsx tests/display-localization.test.js tests/objective-scope.test.jsx`

**Build check:** `npm.cmd run build`

**Commit:** `feat(client): deliver Singapore planner vertical slice`

## Task 6: Guest 24-Hour Lifecycle

**Modify:** `server/src/services/authService.js`, `server/src/middleware/auth.js`, `server/src/routes/auth.js`, `server/src/routes/trips.js`, `server/src/repositories/memory.js`, `server/src/repositories/mysql.js`, `server/src/app.js`, `client/src/api/authToken.js`, `client/src/context/AuthContext.jsx`, `client/src/context/TripContext.jsx`, `client/src/App.jsx`

**Tests first:** update `server/tests/security-objectives.test.js`, `server/tests/repository-contract.test.js`, `client/tests/auth-language.test.jsx`, and `client/tests/api-client.test.jsx` to prove:

- guest JWT and server data expire no later than 24 hours after last activity;
- guest data is isolated and denied after expiry;
- cleanup is opportunistic and bounded, without a job queue;
- guest token/browser state uses `sessionStorage`, registered token uses `localStorage`;
- guest may generate/review/edit current-session content but cannot browse a persistent archive/profile;
- guest mode works in the approved preview runtime without weakening production authentication.

**RED/GREEN:** `npm.cmd --workspace server test -- --run tests/security-objectives.test.js tests/repository-contract.test.js`; `npm.cmd --workspace client test -- --run tests/auth-language.test.jsx tests/api-client.test.jsx`

**Commit:** `feat(auth): enforce expiring guest sessions`

## Task 7: Explicit Guest-to-Registered Save

**Modify:** `server/src/routes/trips.js`, `server/src/services/tripAccess.js`, `server/src/repositories/memory.js`, `server/src/repositories/mysql.js`, `client/src/context/AuthContext.jsx`, `client/src/context/TripContext.jsx`, `client/src/pages/TripWorkspacePage.jsx`, `client/src/components/TripArchive.jsx`

**Tests first:** update `server/tests/objective-generation.test.js`, `server/tests/objective-editing.test.js`, `server/tests/security-objectives.test.js`, `client/tests/objective-workspace.test.jsx`, and `client/tests/auth-language.test.jsx` to prove:

- guest trips are session-scoped and absent from archives;
- login/register alone does not transfer guest trips;
- explicit Save securely claims exactly the current guest itinerary and makes it persistent;
- replay/cross-user claim fails;
- registered save, regenerate, rename, edit, delete, and cross-session archive still work;
- User A cannot read or mutate User B data.

**RED/GREEN:** `npm.cmd --workspace server test -- --run tests/objective-generation.test.js tests/objective-editing.test.js tests/security-objectives.test.js`; `npm.cmd --workspace client test -- --run tests/objective-workspace.test.jsx tests/auth-language.test.jsx`

**Commit:** `feat(trips): require explicit guest itinerary save`

## Task 8: System Administrator Scope and Terminology

**Modify:** `server/src/middleware/authorizeRole.js`, `server/src/routes/admin.js`, `client/src/pages/AdminPage.jsx`, `client/src/layout/AppShell.jsx`, `client/src/i18n/translations.js`, `client/src/i18n/display.js`

**Tests first:** update `server/tests/admin-api.test.js`, `server/tests/security-objectives.test.js`, and `client/tests/admin-page.test.jsx` to prove:

- the existing secure user-role model authorizes the logical `SYSTEM_ADMIN` role;
- travellers cannot call admin endpoints;
- admin scope contains only Singapore destination, POIs, and cost references;
- active UI says System Administrator and never Maintainer;
- there is no claim of a separate physical administrator table.

**RED/GREEN:** `npm.cmd --workspace server test -- --run tests/admin-api.test.js tests/security-objectives.test.js`; `npm.cmd --workspace client test -- --run tests/admin-page.test.jsx`

**Commit:** `feat(admin): align Singapore support scope`

## Task 9: Singapore Profile-Aware Generation

**Modify:** `server/src/services/itinerary/profilePrePlanner.js`, `server/src/services/itinerary/generateValidatedTrip.js`, `server/src/services/itinerary/enrichItineraryPresentation.js`, `server/src/services/itinerary/buildTripLegs.js`, `server/src/services/llm/buildItineraryPrompt.js`, `server/src/services/llm/itineraryHarness.js`, `server/src/providers/demoProvider.js`, `server/src/providers/openRouter.js`

**Tests first:** update `server/tests/profile-pre-planner.test.js`, `server/tests/objective-generation.test.js`, `server/tests/llm-harness.test.js`, `server/tests/openrouter-provider.test.js`, and `server/tests/itinerary-presentation.test.js` to prove:

- exactly one requested style produces exactly one itinerary;
- MANUAL selected POIs remain high priority but never override feasibility or budget;
- AUTO selects only grounded candidates;
- style affects pace, density, transport/food/accommodation assumptions, and experience where data permits;
- prompt permits no invented canonical POI, price, hours, hotel, restaurant, or route fact;
- Singapore itinerary includes useful activities, meals, transport, summaries, provenance, and estimates without claiming live truth.

**RED/GREEN:** `npm.cmd --workspace server test -- --run tests/profile-pre-planner.test.js tests/objective-generation.test.js tests/llm-harness.test.js tests/openrouter-provider.test.js tests/itinerary-presentation.test.js`

**Commit:** `feat(planner): generate one grounded Singapore itinerary`

## Task 10: Ordered Validation and Single Repair

**Modify:** `server/src/services/validation/validationEngine.js`, validator files under `server/src/services/validation/validators/`, `server/src/services/repair/repairLoop.js`, `server/src/services/repair/deterministicRepair.js`, `server/src/services/repair/targetedLlmRepair.js`, `server/src/services/itinerary/reconcileSelectedAttractions.js`, `server/src/services/itinerary/selectedAttractionOutcome.js`

**Tests first:** update `server/tests/validation-engine.test.js`, `server/tests/repair-loop.test.js`, `server/tests/selected-attraction-reconciliation.test.js`, and `server/tests/selected-attraction-outcome.test.js` to prove the exact eight-stage order, full rerun after one repair, controlled second failure, no invalid persistence, no duplicate/ungrounded POI, and localized included/excluded MANUAL outcomes.

Add explicit impossible-low-SGD and exact-boundary cases. Verify provisionally deferred selections only become final exclusions after complete deterministic reconciliation.

**RED/GREEN:** `npm.cmd --workspace server test -- --run tests/validation-engine.test.js tests/repair-loop.test.js tests/selected-attraction-reconciliation.test.js tests/selected-attraction-outcome.test.js`

**Commit:** `fix(validation): enforce final Singapore pipeline`

## Task 11: Optional Inactive Rainy-Day Backup

**Modify:** `server/src/services/itinerary/rainyDayBackup.js`, `server/src/services/itinerary/generateValidatedTrip.js`, `client/src/components/RainyDayBackup.jsx`

**Tests first:** update `server/tests/rainy-day-backup.test.js` and `client/tests/objective-workspace.test.jsx` to prove backup is optional, grounded, Singapore-only, indoor/less weather-sensitive, non-duplicate, inactive, separately costed, and excluded from active total. Prove no weather detection or automatic substitution exists.

**RED/GREEN:** `npm.cmd --workspace server test -- --run tests/rainy-day-backup.test.js`; `npm.cmd --workspace client test -- --run tests/objective-workspace.test.jsx`

**Commit:** `feat(itinerary): add inactive Singapore rain backup`

## Task 12: Workspace, Map, Budget, and Provenance

**Modify:** `client/src/pages/TripWorkspacePage.jsx`, `client/src/components/ObjectiveTripWorkspace.jsx`, `client/src/components/ProfileBudgetSummary.jsx`, `client/src/components/LeafletRouteMap.jsx`, `client/src/components/ItineraryActivityDetails.jsx`, `client/src/components/MealDetails.jsx`, `client/src/components/TripLegRow.jsx`, `client/src/components/DailyItinerarySummary.jsx`, `client/src/components/SelectedAttractionOutcome.jsx`, `client/src/i18n/display.js`, `client/src/i18n/translations.js`

**Tests first:** update `client/tests/objective-workspace.test.jsx`, `client/tests/display-localization.test.js`, and `client/tests/objective-scope.test.jsx` to prove:

- generation navigates directly to one workspace with no comparison/variant UI;
- Singapore Leaflet map markers and route estimates render with truthful map disclaimer;
- S$ total, category breakdown, remaining budget, and inactive backup cost are unambiguous;
- source labels distinguish User-Provided, OpenTripMap API, Database-Backed, AI-Generated, Estimated, Demo Fixture, and Unavailable;
- OpenTripMap does not imply Currently Verified;
- all display is localized with safe missing-description copy and no raw enum/CNY leakage.

**RED/GREEN:** `npm.cmd --workspace client test -- --run tests/objective-workspace.test.jsx tests/display-localization.test.js tests/objective-scope.test.jsx`

**Commit:** `feat(workspace): present validated Singapore itinerary`

## Task 13: Database Compatibility and Retention Verification

**Modify only if evidence requires:** `database/migrations/016_singapore_report_alignment.sql`, `server/src/repositories/mysql.js`, `server/src/repositories/memory.js`, `server/src/repositories/objectiveRecords.js`

**Tests first:** extend `server/tests/migrations.test.js`, `server/tests/repository-contract.test.js`, and `server/tests/integration/mysql.integration.test.js` to prove additive migration behavior, guest expiry/claim fields, active Singapore references, archived CNY isolation, revision persistence, and ownership. Do not rewrite historical migrations.

**Automated:** `npm.cmd --workspace server test -- --run tests/migrations.test.js tests/repository-contract.test.js`

**Live MySQL:** `npm.cmd run test:integration -- --run tests/integration/mysql.integration.test.js`; report `NOT EXECUTED` if credentials/database are unavailable.

**Commit:** `test(database): verify Singapore compatibility boundary`

## Task 14: Report Traceability and Patch List

**Create:** `docs/REPORT_IMPLEMENTATION_TRACEABILITY.md`, `docs/REPORT_PATCH_LIST_SINGAPORE.md`

**Modify:** `CURRENT_ARCHITECTURE.md`, `DESIGN.md` only where current authoritative wording is stale; mark historical plans/specifications as historical rather than rewriting them.

**Checks:** document exactly five modules and required RO mappings with concrete code evidence; define MVP and Point of Interest (POI); explain logical SYSTEM_ADMIN specialization over `USER.role`; document `_fen` physical compatibility; classify technologies truthfully; record GitHub and all live providers as not fully verified unless executed. Include all eleven requested report-only corrections and do not modify the Word file.

**Verification:** `rg -n "three itinerar|Compare Plans|Authorised Maintainer|Supporting Maintainer|China-only|CNY" CURRENT_ARCHITECTURE.md DESIGN.md docs/REPORT_*.md`

**Commit:** `docs: trace Singapore report implementation`

## Task 15: Browser Acceptance and E2E

**Modify:** `tests/e2e/objective-journey.spec.js`, `tests/e2e/landing-flight-atlas.spec.js`, `tests/e2e/admin-journey.spec.js`, `playwright.config.js` only if needed for deterministic demo startup.

**Tests first:** replace active China scenarios with:

- Guest MANUAL: Singapore, two grounded demo POIs, valid dates, 2 travellers, reasonable SGD budget, Balanced, rainy backup enabled;
- Guest AUTO using the same candidate pool;
- impossible low-budget controlled failure with no persisted invalid trip;
- registered explicit save, archive, edit/regenerate, and delete;
- System Administrator access and traveller denial;
- language persistence and no active China/CNY/comparison/arrival/departure text.

Assert one itinerary, Singapore map markers, derived duration, SGD totals, remaining budget, provenance, and inactive/separate backup.

**Run:** `npm.cmd run test:e2e`

**Commit:** `test(e2e): cover Singapore traveller journeys`

## Task 16: Full Regression and Security Audit

**Modify only for verified regressions:** affected source/test files.

**Run exactly:**

```text
npm.cmd test
npm.cmd run test:integration
npm.cmd run test:e2e
npm.cmd run lint
npm.cmd run build
```

Also run repository leakage audits:

```text
rg -n --hidden -g '!node_modules/**' -g '!dist/**' "(OPENROUTER_API_KEY|OPENTRIPMAP_API_KEY|JWT_SECRET)\s*=\s*[^<[:space:]]+" .
rg -n "Beijing|Shanghai|Xi'an|Xian|China Travel Planner|CNY|RMB|fen|Authorised Maintainer|Supporting Maintainer|Compare Plans" client/src server/src shared
```

Classify every remaining match as legacy compatibility, physical storage adapter, internal historical code, or defect. Fix active defects only. Do not claim skipped live tests passed.

**Commit:** `test: complete Singapore regression audit`

## Task 17: Live Verification and Preview Handoff

**Live provider checks:** inspect environment presence without printing values. If credentials are available, run `npm.cmd run test:integration -- --run tests/integration/live-providers.integration.test.js`; otherwise record OpenTripMap/OpenRouter as `NOT EXECUTED`. Treat MySQL similarly.

Stop the old China preview session before binding ports. Start the Singapore backend and frontend from this worktree in demo mode with frontend host `0.0.0.0`. Keep processes running.

Verify:

- backend health/API through an actual HTTP request;
- frontend HTML through localhost;
- browser-rendered Guest MANUAL and AUTO journeys;
- current LAN IPv4 URL through an actual HTTP request before claiming it works;
- no approved deployment config means public deployment is `Not configured`.

Capture exact branch, rollback commit, implementation commits, final HEAD, clean/dirty status, URLs, successful demo inputs, exact test counts, bundle sizes, lint result, live-provider execution status, and remaining report-only work.

No commit is required solely to start processes. If final evidence documentation is added, commit it as `docs: record Singapore preview verification`.
