# Nuogo Destination Discovery and Itinerary Quality Design

**Date:** 2026-08-24  
**Status:** Revised design approved; implementation remains blocked pending revised-plan approval
**Baseline:** The report-aligned React, Express, shared-schema, provider, repository, and validation architecture on `feat/report-aligned-nuogo`

## 1. Purpose

This change helps first-time travellers discover supported attractions before generation and produces three useful alternatives with genuinely different spending, comfort, POI-selection, and route trade-offs. It preserves Nuogo's current modular-monolith architecture, three supported destinations, three spending profiles, one hard total budget, security controls, provider modes, persistence modes, and itinerary CRUD.

The feature must:

- offer destination discovery for Beijing, Shanghai, and Xi'an;
- allow optional manual attraction selection or automatic recommendation;
- treat manually selected attractions as grounded high-priority preferences through a dedicated priority stage, never as mandatory constraints or merely a weighted score;
- include as many selections as feasible without violating mandatory constraints;
- account for every selected attraction as included or excluded in every variant;
- produce independently planned Budget-Saving, Balanced, and Comfort-Focused POI subsets;
- preserve `estimatedTotalCost <= userTotalBudget` for every variant;
- explain recommendations and exclusions naturally in the selected language;
- improve activity, meal, transport, daily-summary, provenance, and budget detail;
- prevent raw enums, developer text, fabricated facts, and unintended language mixing in user-facing content.

## 2. Scope Boundaries

The implementation must not:

- redesign the application architecture or replace existing working flows;
- add destinations beyond Beijing, Shanghai, and Xi'an;
- remove or rename the three spending profiles;
- weaken the shared hard-budget requirement or permit Comfort-Focused to exceed it;
- add booking, payment, weather, live traffic, live hotel prices, tour guides, nationwide planning, or uncontrolled scraping;
- expose provider credentials to the browser;
- allow an LLM to introduce attraction names outside the validated candidate pool;
- make the LLM the sole budget, route, schedule, or validity authority;
- add a mandatory or "Must Visit" attraction mode;
- rewrite historical database records;
- add a MySQL migration without implementation evidence that JSON persistence is insufficient;
- replace mandatory OpenTripMap grounding with AMap;
- add AMap to the production runtime without separate approval of credentials, terms, matching evidence, report changes, coordinate handling, and testing scope;
- redesign unrelated pages or introduce a full optimization solver.

## 3. Verified Current-State Findings

### 3.1 Variant Similarity

- `generateValidatedTrip.js` passes one common candidate pool to all three profile drafts.
- `buildCandidatePool.js` reduces History, Culture, Nature, and Family interests to the same generic `ATTRACTION` category and exposes only a coarse `interestMatch` value.
- The candidate contract has no normalized cost-efficiency, comfort, travel-burden, diversity, or activity-value features.
- `DemoPlanProvider` rotates one queue by profile offset and then uses nearest-neighbour selection. It does not run independent profile-aware candidate selection.
- `spendingProfiles.js` gives every profile the same `fullDayActivityTarget` and differs mainly in tiers, duration, route modes, pace, and allocation percentages.
- `buildItineraryPrompt.js` supplies every profile the same allowed candidates with only a short profile instruction.
- `spendingProfileValidator.js` checks exact composition, tiers, total differences, and category differences, but does not measure selected-exempt POI overlap or route/day-structure quality.

The root cause is therefore missing profile-aware pre-planning, not a comparison-page styling defect.

### 3.2 Chinese and English Mixing

- `openTripMapProvider.js` currently requests the English OpenTripMap endpoint.
- Candidate normalization retains one source `name`, not a controlled bilingual display model.
- Repository and generation fallbacks create English trip titles.
- `buildVariantMetrics.js` emits English point labels and raw route-source values.
- Client components can render raw `routeSource`, mode, profile, activity, or fallback values.
- Localization is distributed among components instead of resolved by one formatting boundary.
- Demo recommendation reasons contain internal profile enum terminology.

The implementation must also verify UTF-8 round trips in touched content. Terminal mojibake alone is not treated as proof that stored source files are corrupt.

## 4. Architectural Decision

Nuogo adopts a deterministic profile-aware pre-planner. Rank-only prompting is insufficient because the model would remain responsible for feasibility and differentiation. A full mathematical optimizer is outside the approved FYP scope.

The controlled pipeline is:

```text
Ground
-> Resolve Preferences
-> Enrich
-> Feature Extraction
-> Profile-Specific Pre-Planning
-> LLM Sequence and Explain
-> Execute Route, Schedule, and Budget
-> Validate
-> Deterministic Repair
-> Bounded LLM Repair
-> Reconcile Selected Attractions
-> Evaluate Differentiation
-> Persist
```

The LLM may propose sequencing, day themes, personalization, recommendation reasons, and constrained natural-language content. Deterministic server services own candidate eligibility, grounded IDs, priority resolution, profile scoring, cost arithmetic, the hard budget, routing, schedule propagation, density, duplicate detection, selected-attraction outcomes, and final validity.

This design follows research showing that language agents struggle with real-world multi-constraint travel planning and that deterministic or formal validation materially strengthens planning correctness. ReAct is relevant to tool interaction, but Nuogo does not use free-form ReAct as its sole planning authority.

Verified references:

- Xie et al. (2024), *TravelPlanner: A Benchmark for Real-World Planning with Language Agents*, arXiv:2402.01622.
- Hao et al. (2024), *Large Language Models Can Solve Real-World Planning Rigorously with Formal Verification Tools*, arXiv:2404.11891.
- Yao et al. (2022), *ReAct: Synergizing Reasoning and Acting in Language Models*, arXiv:2210.03629.
- Halder et al. (2024), *A survey on personalized itinerary recommendation: From optimisation to deep learning*, Applied Soft Computing 152, 111200.
- *Recommendation rules to personalize itineraries for tourists in an unfamiliar city* (2024), Applied Soft Computing 150, 111084.

These references motivate constrained POI selection and verification. They do not establish Nuogo's weights, utilisation bands, matching thresholds, or differentiation thresholds.

## 5. User Flow

1. Select a supported destination in the planner.
2. Open `/discover/:destination`.
3. Read a controlled destination introduction and browse categories, cards, and map markers.
4. Select attractions manually or choose "Let Nuogo recommend for me" / "让 Nuogo 为我推荐".
5. Continue to the existing preference form.
6. Generate three independently pre-planned and validated alternatives.
7. Compare their POIs, spending, comfort, routes, utilisation, and selected-attraction outcomes.
8. Open the existing three-column workspace with enriched itinerary content.

Manual selection is optional. Changing destination clears incompatible current-draft selections with a localized notice. The browser keeps only the temporary planning draft needed between discovery and planning and clears it under existing logout/privacy behavior.

## 6. Destination Discovery

### 6.1 Page Structure

`DestinationDiscoveryPage` contains:

- localized destination name and controlled short introduction;
- major themes/categories;
- a concise attraction grid;
- a compact Leaflet map using canonical coordinates;
- manual-selection and automatic-recommendation controls;
- a selected-attraction summary;
- a continue-to-planning action.

The page remains responsive and keyboard accessible. Short entrance, selection, and map-focus transitions must respect reduced-motion preferences.

Destination introductions are controlled localized application or database-backed content with an accurate source label. They are not generated ad hoc by the LLM and are not labelled OpenTripMap-sourced or currently verified. Any future AI-generated introduction must be explicitly labelled AI-generated.

### 6.2 Attraction Cards

Each card displays available grounded information:

- localized display name with safe source-name fallback;
- localized category;
- trusted short description when available;
- suggested visit duration labelled as system guidance or estimate unless supported by an authoritative source;
- location or destination label;
- source and verification label;
- Add/Remove control;
- View-on-map control.

Missing descriptions display "Description unavailable" or "暂无景点介绍" and do not block selection or generation. The UI must not invent named restaurants, ticket details, opening hours, hotel facts, or unsupported attraction facts.

### 6.3 Discovery API

A focused endpoint beneath the existing metadata API retrieves candidates through the configured server-side provider, validates them, and returns browser-safe fields. Provider credentials remain server-only.

```js
{
  xid,
  destination,
  name: { en, zh },
  category,
  description: { en, zh },
  suggestedVisitDurationMinutes,
  coordinates: { longitude, latitude, coordinateSystem: "WGS84" },
  source: {
    provider,
    sourceUrl,
    retrievedAt,
    matchStatus,
    verificationStatus
  }
}
```

Localized fields may be absent. OpenTripMap-backed records are labelled API-sourced/matched or supporting information, not currently verified. Demo records remain visibly labelled demo data.

## 7. Preference Contract and Compatibility

New requests represent attraction behavior explicitly:

```js
{
  attractionSelectionMode: "MANUAL" | "AUTO",
  selectedAttractions: [{ xid, displayName }]
}
```

Rules:

- `MANUAL` requires one or more unique selected identities.
- `AUTO` requires an empty selected-attraction list.
- Browser display names are non-authoritative presentation hints.
- The server re-resolves every `xid` against the current destination candidate pool.
- Client-supplied provider, provenance, match, verification, and coordinate metadata is ignored.
- Selected attractions from another destination are rejected or cleared.
- Existing prompt-injection screening and request-size limits remain active.

Structured fields take precedence without combining contracts:

1. Structured `MANUAL`: use validated selected IDs as high-priority preferences.
2. Structured `AUTO`: use automatic recommendation and ignore legacy `preferredSights`.
3. No structured fields plus legacy names: resolve names against the current pool as legacy high-priority preferences.
4. No structured fields and no legacy names: use automatic recommendation.

Ambiguous or unmatched legacy names are recorded as excluded and never silently replaced. Historical records are not rewritten.

## 8. Candidate Retrieval, Enrichment, and Empty Results

Discovery and generation use the existing provider and normalization boundaries. Generation always retrieves a fresh validated candidate pool.

- Automatic recommendation requires at least one validated destination candidate.
- Production candidates remain grounded by OpenTripMap.
- An empty or failed OpenTripMap result never falls back across provider modes to demo records.
- A zero-candidate pool is a controlled generation failure in manual and automatic modes.
- The LLM is not called with an empty pool and may never invent replacement attractions.
- A selected attraction that disappeared remains in the requested set and is reported as excluded.
- Provider descriptions are optional; their absence is not a generation failure.

### 8.1 Controlled Bilingual Enrichment

For important supported attractions, controlled records may contain:

```js
{
  canonicalPoiId,
  nameZh,
  nameEn,
  shortDescriptionZh,
  shortDescriptionEn,
  category,
  suggestedVisitDurationMinutes,
  informationSource,
  sourceUrl,
  collectedAt,
  lastReviewedAt
}
```

Descriptions should use suitable official attraction or tourism sources where available. An AI-generated personalized explanation may use grounded facts, but must be labelled AI-generated and cannot become factual provider metadata.

Chinese display resolution is centralized in this order:

1. trusted controlled Chinese enrichment;
2. strongly matched validated Chinese provider value;
3. safe localized or translated grounded display value;
4. canonical source-name fallback.

English uses the corresponding controlled/provider/fallback chain. A fallback source name is allowed when no reliable translation exists; fabricated translation is not.

## 9. Profile-Aware Pre-Planning

### 9.1 Candidate Features

The server derives, where evidence permits:

- canonical candidate ID and OpenTripMap `xid`;
- resolved selected-attraction status and selected order;
- normalized interest/preference relevance;
- meaningful category;
- estimated visit duration with provenance;
- estimated attraction/activity cost with provenance;
- canonical WGS84 location;
- marginal route/time burden;
- marginal category-diversity contribution;
- profile suitability;
- comfort score;
- activity value from grounded relevance and available source evidence.

All scoring factors are normalized to `[0, 1]`. Missing facts receive a documented neutral/default treatment and are never invented. Route and diversity features are recalculated after every provisional selection because they depend on the existing route and selected set.

### 9.2 Stage A: Selected-Attraction Priority

Selected attractions are not defined by a general weighted score.

1. Resolve structured IDs and resolvable legacy names first.
2. Reject unsupported, ambiguous, wrong-city, or unavailable records into the excluded outcome.
3. Attempt feasible selected candidates in the user's selected order before ordinary candidates.
4. Test each provisional inclusion against budget, dates, available time, routing, continuity, density, and grounding.
5. Preserve unresolved or infeasible requests for localized reconciliation.

`selectedAttractionPriority` may remain a tie-breaking feature, but it is not the mechanism that establishes high priority.

### 9.3 Stage B: Supplemental Candidate Scoring

Profile scoring primarily ranks non-selected candidates, supplemental experiences, and replacements. The approved initial configurable factor table is retained:

| Factor | Budget-Saving | Balanced | Comfort-Focused |
| --- | ---: | ---: | ---: |
| `selectedAttractionPriority` | 0.30 | 0.30 | 0.30 |
| `preferenceMatch` | 0.20 | 0.18 | 0.18 |
| `costEfficiency` | 0.18 | 0.10 | 0.04 |
| `travelEfficiency` | 0.14 | 0.12 | 0.14 |
| `categoryDiversity` | 0.06 | 0.12 | 0.06 |
| `comfortScore` | 0.03 | 0.10 | 0.18 |
| `activityValue` | 0.09 | 0.08 | 0.10 |
| **Total** | **1.00** | **1.00** | **1.00** |

These weights are Nuogo configuration heuristics, not academic constants. Configuration validation rejects negative values, unknown factors, or profile totals outside a small numeric tolerance around `1.00`. Stage A still establishes selected-candidate priority before this formula is consulted. When Stage B compares only non-selected candidates, `selectedAttractionPriority` is inapplicable and the other configured weights are normalized by their `0.70` subtotal; it cannot silently reduce all supplemental scores or change candidate order. The retained selected-priority factor may support diagnostics or deterministic tie-breaking among otherwise equivalent resolved selections, but never replaces Stage A.

Profile intent:

- **Budget-Saving:** preference fit, value, low cost, and travel efficiency.
- **Balanced:** preference coverage, category diversity, convenience, and cost balance.
- **Comfort-Focused:** preference fit, convenience, lower route burden, and suitable higher-value experiences.

The planner performs deterministic greedy feasible selection with marginal-score recalculation and geographic/day clustering. It must not deliberately choose an inferior or irrelevant POI merely to look different.

### 9.4 Profile Plan Contract

Each pre-plan passed to the LLM contains only allowed grounded IDs and server-owned planning guidance:

```js
{
  profile,
  selectedCandidateIds,
  rankedSupplementalCandidateIds,
  allowedCandidateIds,
  targetActivityCountByDay,
  targetBudgetUtilisation,
  baselineMandatoryCostFen,
  allocatableBudgetFen,
  profileGuidance
}
```

The LLM may sequence and explain these candidates but cannot add candidates, coordinates, prices, routes, opening hours, or verification claims.

## 10. Budget Model and Utilisation

Before profile planning, the deterministic budget service separates:

1. **Baseline/mandatory estimated cost:** user-provided outbound/return transport and unavoidable trip-level accommodation, meal, or other baseline estimates already implied by the request.
2. **Remaining allocatable budget:** `userTotalBudgetFen - baselineMandatoryEstimatedCostFen`.
3. **Profile-controlled estimated cost:** controllable accommodation tier difference, local transport, food tier, attraction/activity choices, entertainment, and optional comfort improvements.

Every variant must satisfy:

```text
estimatedTotalCostFen = baselineMandatoryEstimatedCostFen + profileControlledEstimatedCostFen
estimatedTotalCostFen <= userTotalBudgetFen
```

Initial soft target utilisation bands are:

- Budget-Saving: `55%-70%` of the user's total budget;
- Balanced: `75%-90%`;
- Comfort-Focused: `90%-100%`.

They are configurable Nuogo heuristics, not research constants or validity rules. The pre-planner interprets them after accounting for baseline costs. If baseline costs or a sparse candidate pool make a band unreachable, Nuogo keeps the best feasible plan. It never adds fake costs, unnecessary activities, transport, meals, or upgrades to consume budget.

The comparison page displays user-friendly localized values for:

- User Budget;
- Baseline Estimated Cost, when meaningful;
- Planned Experience Cost;
- Estimated Total Spend;
- Budget Utilisation;
- Remaining Budget.

## 11. LLM Drafting, Execution, Validation, and Repair

For each profile independently:

1. Build a profile-specific pre-plan.
2. Ask the LLM for a structured sequence and localized rationale using only allowed IDs.
3. Parse with the existing structured-output boundary.
4. Attach canonical POI facts server-side.
5. Build route legs and propagate the schedule.
6. Calculate the deterministic eight-category budget.
7. Validate grounding, duplicates, density, continuity, route, schedule, hard budget, and profile configuration.
8. Apply bounded deterministic repair first.
9. Use bounded targeted LLM repair only for permitted draft structure/content.
10. Re-run all mandatory validators after every repair.

Only mandatory-valid alternatives proceed to reconciliation and differentiation. The LLM is never the final authority for feasibility.

## 12. Selected-Attraction Reconciliation

### 12.1 Mandatory Constraints

Selections never override the hard budget, dates, trip duration, arrival/departure boundaries, available time, route quality, continuity, daily density, or POI grounding.

### 12.2 Deterministic Insertion

For a supported selected candidate omitted from a valid draft:

1. Find the lowest-disruption feasible day and sequence.
2. Insert provisionally in selected order.
3. Rebuild legs and schedules.
4. Recalculate the complete budget.
5. Rerun every mandatory validator.
6. Keep the insertion only if all validators pass; otherwise revert it.

### 12.3 Outcome Contract

```js
{
  selectedAttractionOutcome: {
    requested: [...],
    included: [...],
    excluded: [{
      xid,
      displayName,
      reasonCode,
      reason: { en, zh }
    }]
  }
}
```

Every request appears exactly once in `included` or `excluded` for every variant. Internal codes support tests and diagnostics but are never displayed. Reasons naturally explain unsupported data, schedule, budget, route, density, or combined feasibility. No outcome is delegated solely to the LLM.

Every grounded tourist-attraction activity requires an allowed `xid` or existing equivalent source-attraction ID. A matching name cannot compensate for a missing or unknown ID. Generic meal, transfer, accommodation, rest, and departure entries retain their non-attraction contract.

## 13. Safe Differentiation Evaluation

Differentiation is a quality target, not a mandatory reason to reject otherwise useful feasible trips.

After three mandatory-valid variants exist, Nuogo measures pairwise:

- Jaccard overlap of non-selected POIs;
- normalized cost-allocation distance;
- transport-mode distribution difference;
- accommodation and food tier difference;
- route/day-assignment and sequence difference.

Selected attractions are removed from the POI overlap sets. When the non-selected union is empty, POI overlap is recorded as `NOT_APPLICABLE`, not divided by zero or assigned a misleading perfect/failed score.

Initial `maxNonSelectedPoiJaccard = 0.80` and `minimumMeaningfulDimensions = 2` values are configurable product heuristics. They are not academic constants and are not unconditional validity rules.

The quality sequence is:

```text
Measure differentiation
-> if useful, attempt one bounded profile-specific diversification repair
-> rerun all mandatory validators
-> compare original and repaired alternatives
-> retain the best feasible alternatives
```

Diversification repair may replace only non-selected candidates and must improve profile suitability without reducing preference satisfaction, grounding, schedule feasibility, budget compliance, route quality, or daily usefulness. Mandatory or clearly optimal POIs may legitimately appear in every profile. Sparse candidate pools and unavoidable high overlap produce a diagnostic quality note, not a fabricated or failed trip.

## 14. Optional AMap Feasibility Boundary

OpenTripMap remains mandatory and canonical for the current Objective 3 runtime:

- canonical `xid` and candidate eligibility;
- grounding and provenance;
- canonical WGS84 coordinates used by Leaflet/OpenStreetMap.

AMap is documented only as an optional future enrichment/feasibility adapter. Official AMap Web Service documentation indicates support for keyword, nearby, polygon, and ID POI search; city/adcode constraints; and walking, transit, and driving route information.

A future approved AMap adapter could provide:

- Chinese POI name/address enrichment;
- optional China-specific route distance/time estimates;
- a separate AMap provider identity and source record;
- separate GCJ-02 coordinates.

It must not become a production dependency in this implementation. A future match must require destination/adcode agreement, category compatibility, geographic proximity measured in one coordinate system, and exact normalized name or approved alias evidence. Ambiguous or weak matches remain separate and cannot overwrite canonical facts.

### 14.1 Coordinate-System Contract

- Canonical map coordinates remain `{ longitude, latitude, coordinateSystem: "WGS84" }`.
- Optional AMap coordinates are stored separately with `coordinateSystem: "GCJ02"`.
- WGS84-to-GCJ-02 conversion occurs only through an approved AMap conversion boundary.
- GCJ-02 values are never passed directly into Leaflet/OpenStreetMap.
- No unofficial reverse-conversion algorithm is introduced.
- Any future production adoption requires Beijing, Shanghai, and Xi'an alignment tests and explicit route-geometry treatment.

This revision adds only documentation and future test/spike planning for the boundary. It does not add AMap code, credentials, configuration, persistence, or runtime selection.

## 15. Localization and Provenance Boundary

The selected locale flows through frontend state, preference validation, prompts, generated copy, normalization, persistence, and rendering. Chinese remains the default language.

Centralized formatters resolve trip titles, day labels, categories, activity types, route modes, source statuses, profile labels, endpoints, estimate labels, and errors. Raw values such as `BUDGET_SAVING`, `COMFORT_FOCUSED`, `MEAL`, `START`, `END`, `ESTIMATED`, and `PUBLIC_TRANSIT` never reach either UI language. Unknown values use a safe localized fallback and are logged safely.

Free-form generated copy is stored with its generation locale. Switching language does not pretend that existing generated copy has a verified translation.

Provenance categories remain distinct:

- **User-provided:** validated travel preferences, selections, and user costs.
- **OpenTripMap API/API-sourced:** matched attraction facts; not automatically current.
- **Database-backed:** controlled content and cost references with source metadata.
- **AI-generated:** rationale, day themes, and constrained descriptive guidance.
- **Estimated:** routes, calculated costs, suggested durations, and system anchors.
- **Currently verified:** only when an appropriate authoritative current source genuinely supports the claim.

The UI displays localized labels without collapsing categories or exposing internal enums.

## 16. Itinerary Detail Improvements

The existing left-itinerary, middle-map, right-budget layout remains.

### 16.1 Daily Summary

- day number, date, and localized theme;
- activity and meal counts;
- transport-leg count and localized mode summary;
- major planned attractions;
- estimated daily spending.

### 16.2 Attraction Entries

- localized name;
- start and calculated end time;
- estimated duration and category;
- grounded short description or unavailable copy;
- personalized reason tied to interests, selection, profile, schedule, or location;
- estimated ticket/activity cost;
- source and verification status;
- next transport information.

### 16.3 Meal Entries

- localized meal label inferred from scheduled time;
- start/end time and duration;
- suitable area derived from adjacent grounded locations;
- meal style based on preference and profile;
- estimated cost per traveller;
- AI-generated suggestion and estimated-cost labels.

Nuogo does not name a restaurant unless a grounded restaurant candidate is present.

### 16.4 Transport Rows

- localized origin and destination names;
- localized mode;
- estimated distance, duration, and cost;
- explicit localized estimate/source label.

## 17. Comparison and Workspace Outcomes

Both pages show:

- "Selected attractions included" / "已加入的已选景点";
- "Selected attractions not included" / "未加入的已选景点";
- a localized reason beside every exclusion;
- the profile budget fields from Section 10;
- clear profile trade-offs and safe differentiation indicators.

Automatic-mode variants show a concise localized statement that Nuogo selected from the validated destination pool. They do not show an empty manual-selection outcome.

## 18. Persistence and Security

No database migration is planned initially. Existing JSON preferences and objective-trip payloads can hold the added selection outcomes, planning metrics, and localized content in memory and MySQL repository modes. A migration is added only if implementation evidence proves a required queryable field cannot be safely represented through the current contract. Historical records are read compatibly and are never rewritten merely to adopt the new shape.

Existing authentication, owner checks, prompt-injection screening, request limits, consent, credential isolation, logging redaction, and deletion behavior remain unchanged. Only validated travel preferences and allowed candidate facts reach OpenRouter.

## 19. Error Handling

- Provider timeout/failure: localized retryable discovery error.
- Zero validated candidates: localized controlled failure and no LLM call.
- Missing description: unavailable copy; generation continues.
- Selected candidate unavailable/unsupported/ambiguous: excluded outcome with localized reason.
- Insertion violates constraints: revert and provide the most useful friendly reason.
- Malformed provider record: discard safely during normalization.
- Unknown locale/enum: safe localized fallback; never raw internal text.
- Unreachable utilisation band: keep the best feasible spend and do not fabricate consumption.
- Unavoidable variant similarity: retain valid plans with a diagnostic quality note.
- Failed generation: preserve the existing error boundary and do not persist a successful trip.

## 20. Automated Testing

Tests must cover:

1. Destination introductions, discovery cards, filters, maps, source labels, malformed records, missing descriptions, and empty provider results.
2. `MANUAL`/`AUTO` contracts, untrusted client metadata, destination changes, and server-side `xid` revalidation.
3. Structured precedence, legacy-name compatibility, ambiguous legacy names, and no historical rewrites.
4. Zero validated candidates preventing every LLM call.
5. Feature normalization, neutral missing-data behavior, and configuration weights summing to `1.00`.
6. Stage-A selected-attraction priority preceding supplemental scoring.
7. Cost, preference relevance, travel burden, comfort, and diversity changes producing deterministic profile-ranking differences.
8. Route/diversity features recalculated after provisional selection.
9. Baseline mandatory cost, remaining allocatable budget, profile-controlled cost, total, utilisation, remaining, and hard-ceiling arithmetic.
10. Baseline cost outside a soft target band without artificial spending or invalidation.
11. Three profile shortlists differing when suitable candidates exist while preserving obviously optimal/shared candidates.
12. Grounded attraction IDs rejected when missing or unknown even when names match.
13. All selections included when feasible; schedule, budget, unsupported, unavailable, and unmatched exclusions.
14. Deterministic insertion accepted only after complete route/schedule/budget/density/continuity/POI revalidation.
15. Exactly-once included/excluded coverage and all-three-profile prioritization.
16. Chinese and English reasons, unavailable descriptions, trip titles, categories, route labels, source labels, and no raw enum/developer text.
17. Non-selected POI overlap with selected attractions exempt.
18. Empty non-selected union producing `NOT_APPLICABLE` without division by zero.
19. Sparse candidate pools retaining valid similar plans.
20. One bounded diversification repair replacing only a non-selected POI and retaining it only after complete validation.
21. Detailed activity, meal, transport, daily-summary, budget, source, and outcome rendering.
22. Optional AMap contract tests that verify coordinate-system tagging and prohibit GCJ-02 values from the canonical Leaflet DTO, without making network calls or adding runtime AMap code.
23. Existing authentication, authorization, archive, Save, Edit, Regenerate, Delete, privacy, hard-budget, and persistence behavior.
24. Responsive discovery/workspace rendering and reduced-motion behavior.

Automated/mock/demo verification remains separate from genuine live OpenRouter, OpenTripMap, and MySQL verification. AMap live verification is outside this implementation. Missing credentials are reported as **NOT EXECUTED**, never PASS.

## 21. Manual Acceptance

Use Beijing, Chinese, three days, two travellers, CNY 6,000, and History/Culture/Food interests. Select Forbidden City, Temple of Heaven, Summer Palace, and Jingshan Park.

Confirm:

- discovery helps a first-time visitor understand Beijing;
- all three alternatives use only grounded candidates;
- selected attractions are attempted before supplemental scoring;
- each selection appears exactly once as included or excluded per profile;
- exclusions have natural Chinese reasons;
- profiles demonstrate genuine trade-offs without inferior forced diversity;
- baseline, planned-experience, total, utilisation, and remaining values reconcile;
- every plan remains within CNY 6,000;
- descriptions, meals, transport, maps, sources, and estimates are useful and accurately labelled;
- Chinese UI contains no unintended English or raw enums;
- Save, Edit, Regenerate, Delete, and archives still work.

Repeat in English and repeat in automatic mode. Automatic generation proceeds only with a non-empty validated candidate pool.

## 22. Verification Reporting

Final evidence is separated into:

- **Automated/mock/demo verification:** local tests, fixtures, and deterministic providers.
- **Live integration verification:** genuine configured OpenRouter, OpenTripMap, or MySQL calls.

Each live check is PASS or FAIL only when executed. Otherwise it is reported exactly as **NOT EXECUTED**. The implementation report records root causes, files changed, schema/migration evidence, algorithms/configuration, exact commands/results, limitations, and manual-inspection pages.

## 23. FYP Report Impact

This design does not change the current objectives. Objective 3 remains mandatory OpenTripMap grounding. Profile-aware selection, deterministic validation, bilingual presentation, and optional AMap feasibility refine implementation quality within the existing objectives.

If AMap is later approved for production enrichment, the report must amend its named sections for:

- system scope and Objective 3 provider wording, without removing OpenTripMap;
- system architecture and provider diagrams;
- tourism-data acquisition, provenance, and cross-source matching;
- functional requirements and external interfaces;
- database/ERD coordinate-system and secondary-source representation;
- API/provider contracts;
- security, API-key, privacy, and third-party terms;
- methodology and matching evaluation;
- testing, including coordinate alignment and live-provider evidence;
- tools/platform table;
- limitations and external-service assumptions.

No complete FYP report artifact is stored in this worktree, so chapter numbers cannot be verified or changed automatically.

## 24. Expected File Areas

Implementation planning may add focused files while preserving existing ownership boundaries:

- `shared/`: preference, outcome, planning-metric, localization, and coordinate contracts;
- `server/src/providers/travel/`: richer OpenTripMap detail normalization only;
- `server/src/services/poi/`: discovery normalization, bilingual enrichment, candidate features, and selection resolution;
- `server/src/services/budget/`: baseline/allocatable accounting and profile configuration;
- `server/src/services/itinerary/`: profile pre-planning, reconciliation, differentiation, and view data;
- `server/src/services/llm/`: profile-plan prompt rules and grounded output handling;
- `server/src/services/validation/`: configuration, budget, grounding, and safe differentiation checks;
- `server/src/routes/`: discovery and generation contracts;
- `client/src/pages/` and `client/src/components/`: discovery, centralized display resolution, comparison, and workspace detail;
- corresponding tests and API/report-alignment documentation.

No application file is changed until the revised implementation plan is separately approved.
