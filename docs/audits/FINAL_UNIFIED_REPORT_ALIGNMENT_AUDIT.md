# Final Unified Report Alignment Audit

> **SUPERSEDED IMPLEMENTATION-GAP SNAPSHOT.** This Phase A document records pre-implementation conflicts. Resolved architecture is documented in `../../CURRENT_ARCHITECTURE.md`; this audit remains historical evidence only.

Date: 30 August 2026  
Phase: A - audit only  
Worktree: `C:/Users/G16/OneDrive/桌面/FYP/.worktrees/report-aligned-nuogo`  
Branch: `feat/report-aligned-nuogo`  
Audited HEAD: `0801a4f758c1f3220b7d3610434c14f0aee50c8e`  
Original approved-plan rollback point: `d35fabd8c3a6da420f2fa37406da49d82dfd8f9d`

## Authority And Method

The authoritative source reviewed was:

`C:/Users/G16/Downloads/Nuogo_FYP_Final_Report_Chapter1-3_FINAL_UNIFIED.docx`

The filename on disk omits the duplicate-file suffix `(1)` shown in the instruction. The document contains Chapters 1-3 and has a file size of 4,647,093 bytes with a last-modified time of 30 August 2026 10:30:14 UTC. Its complete main document body (977 non-empty paragraphs/table rows) was extracted from `word/document.xml` and read in chapter order. The report itself was not modified.

The audit compares the report with the current source, schemas, routes, migrations, UI, and tests. Old plans and old architecture documents were used only to locate code, not as product authority.

No application code was changed after receiving the FINAL_UNIFIED instruction. The worktree was already dirty from the previous, now-superseded three-itinerary plan. Those nine modified files remain preserved and are listed under Safety State.

## Executive Finding

The repository has a strong reusable foundation for authentication, OpenTripMap discovery, deterministic validation, hard-budget calculation, provenance, localization, maps, persistence, and itinerary management. However, the active product workflow directly conflicts with the final report in four central areas:

1. It generates all three spending profiles in one request instead of accepting one selected travel style and generating one itinerary.
2. It routes successful generation through a three-card comparison and variant-selection workflow.
3. It has no rainy-day backup preference, service, schema, persistence, or presentation behavior.
4. Its live OpenRouter default is `openai/gpt-4.1-mini`, not the report-required `deepseek/deepseek-chat-v3.1`.

The safest alignment is a focused conversion of the active workflow. A rewrite, new service architecture, new database framework, weather API, or advanced route optimizer is not required.

## Major-Area Audit

| Area | Report requirement | Current implementation and evidence | Status | Smallest required change |
|---|---|---|---|---|
| Authentication | Registration, login, logout, profile, protected access | `server/src/routes/auth.js`, `server/src/routes/profile.js`, `server/src/services/authService.js`; JWT expires in 7 days and bcrypt is used. Client protected routes are in `client/src/App.jsx:44-63`. | PASS | Preserve. Add final-report regression coverage only. |
| Authorization | Prevent cross-user and unauthorized maintenance access | All trip routes use authentication; trip access is checked in `server/src/routes/trips.js:60-64`. Admin routes use `authorizeRole` at `server/src/routes/admin.js:77-80`. Cross-user tests pass. | PASS | Preserve. Remove or isolate only maintenance functions outside final scope. |
| Security/privacy | Server-side keys, Helmet, validation, prompt screening, deletion, secure logging | Helmet/rate limiting are in `server/src/app.js:26-36`; prompt screening is in `server/src/routes/trips.js:84-91`; account deletion is in `server/src/routes/privacy.js:30-38`; `.env.example` contains placeholders only. | PARTIAL | Preserve controls. Add explicit DeepSeek/ZDR routing configuration evidence and final-report tests; verify 90-day log-retention behavior rather than relying only on documentation. |
| Supported cities | Beijing, Shanghai, Xi'an only | `shared/constants.js:1-25` defines exactly the three cities; Zod destination validation uses those IDs. | PASS | Preserve. |
| Destination discovery | Retrieve and display OpenTripMap-supported attractions | Discovery service, API, cards, and map exist in `server/src/services/poi/openTripMapCandidateService.js`, `server/src/services/poi/buildDiscoveryResponse.js`, `client/src/pages/DestinationDiscoveryPage.jsx`, and `client/src/components/AttractionDiscoveryMap.jsx`. | PASS | Preserve and update only tests affected by the single-itinerary flow. |
| OpenTripMap provider | Timeout/failure handling, xid, coordinates, details | Provider and retry/timeout boundary exist in `server/src/providers/travel/openTripMapProvider.js` and `httpClient.js:15-68`. Normalization retains xid, WGS84 coordinates, city, descriptions, and source URL. | PASS | Preserve. Live verification remains NOT EXECUTED without credentials. |
| Attraction normalization | Reject empty/malformed/duplicate/wrong-city candidates | Empty names, invalid list/detail records, and duplicate xids are filtered in `openTripMapCandidateService.js:36-39,107-130`; wrong city and non-matched records are rejected in `buildCandidatePool.js:36-78`. | PASS | Preserve. |
| Attraction matching quality | Prefer exact/strong main-attraction matches | Manual current selections are safely resolved by xid. Legacy names use exact normalized equality in `resolveAttractionPreferences.js:13-25`. There is no explicit ranking test for main attraction vs similarly named entrance/hall results. | PARTIAL | Add deterministic exact-main-name ranking for legacy/name resolution and the report's Forbidden City regression test. Do not trust list order. |
| MANUAL/AUTO selection | Manual grounded preferences or automatic grounded pool | Contract and compatibility behavior exist in `shared/schemas.js:18-21,61-63,85-117` and `resolveAttractionPreferences.js:3-27`. Zero candidates stop generation at `generateValidatedTrip.js:320-323`. | PASS | Preserve, including legacy preferred-sight compatibility and zero-candidate failure. |
| Essential preferences | Destination, dates, budget, travellers, interests, preferred attractions, one style, rainy-day choice | Current schema has destination/dates/budget/travellers/interests and attraction mode, but lacks `travelStyle` and `rainyDayBackupEnabled`. It also requires several advanced transport/accommodation/food fields (`shared/schemas.js:52-84`). | PARTIAL | Add the two report fields. Simplify the active form; retain legacy fields as optional compatibility data only where existing records need them. |
| Travel-style selection | Select exactly one style before generation | The three enum values exist as `spendingProfiles` in `shared/constants.js:27-31`, but no selected `travelStyle` field exists in the preference contract or UI. | CONFLICT | Add one required selector and pass only that style into planning. |
| One-itinerary generation | Exactly one itinerary per request | `generateValidatedTrip.js:342-364` maps all three profile plans, diversifies them, and returns `variants`. | CONFLICT | Generate and validate only the selected style. Remove profile differentiation from the active path. |
| LLM structured output | DeepSeek structured JSON, Ajv validation | Ajv 2020 validates `itineraryDraftJsonSchema` in `validateDraftStructure.js:1-14`; Zod also validates drafts. The schema still calls style `variant`, which is reusable internally but tied to old naming. | PARTIAL | Keep Ajv/Zod. Treat the field as the one selected travel style or rename at the boundary with legacy compatibility. |
| OpenRouter/DeepSeek | OpenRouter with only `deepseek/deepseek-chat-v3.1` | Timeout/error handling exists in `openRouter.js:32-95`. Defaults are `openai/gpt-4.1-mini` in `openRouter.js:6` and `config.js:52`; `.env.example` has only a generic model placeholder. | CONFLICT | Set and validate the required DeepSeek model ID. Do not add another model. Add controlled 429/provider-failure tests and verified ZDR routing options. |
| Controlled repair | One repair/regeneration attempt | `repairLoop.js:3-56` defaults to three evaluations and can perform two repair actions after the initial draft. `generateVariant` does not override the default. | CONFLICT | Limit the pipeline to initial validation plus one repair attempt and one final revalidation. |
| Deterministic validation | Schema, city/dates, grounding, duplicates, schedule, budget | Validation is modular in `validationEngine.js:1-15` with POI, continuity, schedule, density, and budget validators. Draft boundary checks lock trip context in `itineraryHarness.js:15-25`. | PASS | Preserve and adapt inputs from profile/variant to selected style. |
| Hard budget | Estimated total never exceeds user total | `budgetEngine.js:66-79,99-143` calculates categories and hard-budget state from maintained references. Budget validator is authoritative. Current uncommitted work adds partial-day meal counting and tests. | PASS | Preserve partial-day fix and all hard-boundary tests. Remove three-profile aggregate assertions, not hard-budget behavior. |
| Cost references | Traceable maintained CNY references | `costReferenceService.js` validates category/tier/range/source/date records. MySQL migration `011_report_aligned_core.sql` stores traceable reference metadata. | PASS | Preserve. Ensure selected style chooses the relevant tiers. |
| Rainy-day backup | Optional grounded same-city non-duplicate contingency, no live weather, no main-total double count | No `rainy`, `rainyDay`, or `weather` implementation occurs in `shared`, `server/src`, `client/src`, or active database code. | MISSING | Add one boolean, deterministic grounded alternative selection after main validation, separate presentation/persistence, and budget recheck excluding unused backup cost. No Weather API. |
| Provenance | Separate user, OpenTripMap, AI, estimates, DB, genuinely current facts | `buildVariantProvenance` and `objectiveRecords.js` enforce source categories and complete OpenTripMap mapping. UI uses provider/estimate labels. OpenTripMap is `SUPPORTING_ONLY`, not automatically current. | PASS | Preserve; rename helper away from `Variant` only if touched by the single-run conversion. Add rainy-backup provenance. |
| Localization | Chinese default; consistent English; no raw enums | Chinese defaults in `shared/schemas.js:83`, user persistence, and `LanguageContext`. Central display dictionaries are in `client/src/i18n/display.js`. Existing tests cover key labels. | PARTIAL | Add style/rainy/failure translations and test complete single-flow pages. Ensure LLM-facing language reaches generation so explanation text is not mixed. |
| Map | Leaflet/OpenStreetMap attraction markers | Discovery and itinerary maps use Leaflet and OSM tiles in `AttractionDiscoveryMap.jsx:15-22` and `LeafletRouteMap.jsx:51-88`. | PASS | Preserve markers; do not add navigation or advanced routing. |
| Itinerary detail | Practical days, activities, meals, transport, summaries, source labels | Rich presentation is implemented in `enrichItineraryPresentation.js` and workspace components added through `0801a4f`. | PASS | Reuse for the one selected itinerary; add separate rainy-day detail where enabled. |
| Itinerary management | View, edit, save, regenerate, delete | Protected routes and workspace support these operations in `trips.js:120-280` and `ObjectiveTripWorkspace.jsx`. Regeneration calls the real planner. | PASS | Adapt from a selected variant to a single itinerary. Keep archived legacy reads compatible. |
| Comparison workflow | Must not generate/compare three complete itineraries | `/compare/:tripId`, `ComparePage`, `PlanComparison`, `ComparisonRouteRail`, `select-variant`, and multi-profile E2E assertions are active. | CONFLICT | Remove from the new active workflow. Isolate legacy display code only if required to open historical records; do not offer new comparisons. |
| Persistence | Store preferences, one itinerary run, days/activities/provenance/estimates/rainy data | MySQL stores trip preferences/payload JSON plus normalized run/provenance/repair/leg records. `itinerary_runs.profile` can store the selected style, but current persistence writes three runs and a `variants` array (`mysql.js:387-460`). | PARTIAL | Persist one run per request and selected style/rainy data in existing JSON boundaries. No migration is currently proven necessary; add one only if a failing MySQL contract test demonstrates a missing physical field. |
| Supporting maintenance | Small authorized maintenance for cost references/selected records | Admin currently includes users, system logs, destinations, POIs, provider records, and cost references (`server/src/routes/admin.js:81-197`; `AdminPage.jsx`). | CONFLICT | Keep cost-reference and strictly needed supported-record maintenance. Remove user suspension/system-log dashboards from the active MVP UI/API or clearly isolate them as legacy. |
| Obsolete social/collaboration | Must not be active | Migration `015_remove_retired_subsystems.sql:3-25` drops collaboration, expense, sharing, favorites, ingestion, and old normalized itinerary tables. No active collaboration routes/components were found. | PASS | Preserve removal. Historical migrations remain for upgrade order but must not be exposed. |
| Test alignment | Verify one itinerary, one selected style, rainy day, failures, management | Unit/component tests pass but many explicitly assert three profiles. Current objective E2E also asserts comparison and currently fails generation with `The submitted data is invalid.` | CONFLICT | Replace obsolete assertions with the nine independent city/style scenarios and rainy-day/one-repair tests. Preserve security, grounding, budget, CRUD, localization, and failure tests. |

## FR1-FR14 Status

| Requirement | Status | Evidence summary |
|---|---|---|
| FR1 Account/authentication | PASS | Register/login/profile/protected routes and deletion exist and are tested. |
| FR2 Essential preferences | PARTIAL | Core values exist; selected style and rainy-day choice are missing; active form is broader than the final scope. |
| FR3 Destination discovery | PASS | Three-city OpenTripMap discovery API, cards, and map exist. |
| FR4 Attraction selection | PASS | MANUAL/AUTO grounded xid flow and legacy name compatibility exist. |
| FR5 Input/prompt validation | PASS | Express validation, Zod, and prompt-injection screening precede planning. |
| FR6 Travel-style selection | CONFLICT | Three styles exist only as simultaneous generated profiles, not one pre-generation choice. |
| FR7 LLM itinerary generation | CONFLICT | Structured generation exists, but it produces three plans and defaults to the wrong model. |
| FR8 Rainy-day backup | MISSING | No implementation found. |
| FR9 Validation/controlled repair | PARTIAL | Strong validators exist; repair count exceeds the one allowed repair. |
| FR10 Budget estimation | PASS | Deterministic reference-backed categories and hard ceiling exist. |
| FR11 Source/estimate labels | PASS | Provenance boundaries are explicit and validated. |
| FR12 Map display | PASS | Leaflet/OSM markers exist without live navigation. |
| FR13 Itinerary management | PASS | View/edit/save/regenerate/delete and ownership checks exist. |
| FR14 Supporting maintenance | CONFLICT | Maintenance is broader than the final report's small supporting function. |

## NFR1-NFR10 Status

| Requirement | Status | Reason |
|---|---|---|
| NFR1 Security | PASS | Hashing, JWT, authorization, protected routes, server keys, Helmet. |
| NFR2 Privacy | PARTIAL | Consent/minimization/deletion exist; ZDR request enforcement and retention operation need evidence. |
| NFR3 Reliability | PARTIAL | Controlled failures and validation exist; repair limit and currently failing generation E2E need correction. |
| NFR4 Transparency | PASS | Source/provenance categories and supporting-only OpenTripMap status are enforced. |
| NFR5 Usability | PARTIAL | Discovery/workspace are usable, but active workflow is the obsolete comparison and rainy backup is absent. |
| NFR6 Performance | PARTIAL | Build works; no final one-itinerary response-time evidence. Main JS is 638.29 kB with a Vite warning. |
| NFR7 Maintainability | PASS | Shared, client, server, provider, validation, budget, and repository responsibilities are modular. |
| NFR8 Compatibility | PARTIAL | Responsive components/tests exist, but the objective browser journey currently fails before itinerary display. |
| NFR9 Localization | PARTIAL | Chinese default and dictionaries exist; new final-flow labels and generated-language consistency remain unverified. |
| NFR10 Budget correctness | PASS | Hard-budget validator and boundary tests pass. |

## Obsolete Active Behavior

The following behavior conflicts with the FINAL_UNIFIED report and is active, not merely historical:

- Three profile plans are created and generated together.
- Profile differentiation and diversification run after generation.
- The planner promises "Generate 3 validated plans".
- Successful generation navigates to `/compare/:tripId`.
- A comparison page displays and selects one of three variants.
- The API exposes `POST /api/trips/:tripId/select-variant`.
- Persistence stores `variants`, differentiation diagnostics, and selected-variant state.
- Browser/component tests require three simultaneous alternatives.
- Admin UI/API includes broad user and system-record management.

The following prohibited behavior has already been removed from the active code:

- collaboration and invitations;
- expense splitting;
- trip sharing and favorites;
- scraping/ingestion tables;
- tour-guide workflows.

## Safety State

The worktree was not clean when this final report instruction arrived. Existing uncommitted files are:

- `client/src/components/PlanComparison.jsx`
- `client/src/components/ProfileBudgetSummary.jsx`
- `client/tests/planner.test.jsx`
- `server/src/services/budget/budgetEngine.js`
- `server/src/services/budget/profileBudget.js`
- `server/src/services/itinerary/generateValidatedTrip.js`
- `server/tests/budget-engine.test.js`
- `server/tests/objective-generation.test.js`
- `tests/e2e/objective-journey.spec.js`

The server budget changes and their tests add partial-day meal accounting and zero-candidate coverage, which align with the final report. Several client/E2E changes still reinforce the obsolete three-plan flow. No files were reset, discarded, or committed during this Phase A audit.

Before approved implementation, preserve the complete diff as a rollback patch/ref and then retain only report-aligned portions through reviewable edits. Do not use a destructive reset.

## Baseline Verification

Commands executed against the current dirty worktree:

| Command | Result |
|---|---|
| `npm test` | PASS: shared 14/14, server 236/236, client 93/93; 343 tests across 49 files. These passing tests include obsolete three-plan expectations. |
| `npm run build` | PASS: 1,650 modules transformed. Main JS `638.29 kB` (`209.86 kB` gzip); atlas chunk `529.46 kB` (`134.64 kB` gzip); Vite emitted a chunk-size warning. |
| `npm run lint` | FAIL: 1 error (`PlanComparison.jsx:57`, unused `style`) and 5 React hook warnings. |
| `npm run test:integration` | SKIPPED: 4/4 tests skipped; MySQL, OpenTripMap, and OpenRouter live prerequisites are unset. This is not a live pass. |
| `npm run test:e2e -- tests/e2e/objective-journey.spec.js` | FAIL from the current pre-audit work state: 2 passed, 6 failed. Generation remained on the planner and displayed `The submitted data is invalid.` The test itself also asserts the obsolete three-profile comparison. |

Credential availability was checked without displaying values. `OPENROUTER_API_KEY`, `OPENTRIPMAP_API_KEY`, `MYSQL_PASSWORD`, and `JWT_SECRET` are unset in the process environment. Only `.env.example` exists in the worktree, and it contains placeholders rather than active credentials.

## Conclusion

The current code should be evolved, not rewritten. The reusable foundation is substantial, but the active workflow is not aligned with the final report. Implementation should begin only after approval of the companion plan:

`docs/superpowers/plans/2026-08-30-final-unified-report-alignment.md`
