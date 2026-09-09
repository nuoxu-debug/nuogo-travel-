# Report-Aligned Nuogo Design

**Date:** 2026-08-21  
**Status:** Approved through the user-supplied “NUOGO — FULL REPORT-ALIGNMENT IMPLEMENTATION” specification  
**Baseline audit:** `CURRENT_SYSTEM_ARCHITECTURE_AND_WORKFLOW_AUDIT.md`

## Product Boundary

Nuogo is an LLM-assisted travel itinerary and deterministic budget planner for Beijing, Shanghai, and Xi'an. It is not a booking, payment, guide, social, weather, navigation, commercial-price, or advanced route-optimization product.

The application has one generation path. Authenticated users submit validated preferences, suspicious free text is rejected, OpenTripMap supplies the allowed attraction pool, OpenRouter drafts three profile-specific JSON itineraries, Ajv checks structure, semantic validators and deterministic budget logic check correctness, bounded repair may correct a draft, and only valid trips are persisted to MySQL.

## Architecture

```text
React/Vite client
  -> Express API
  -> express-validator request boundary
  -> prompt-injection screening
  -> OpenTripMap candidate service
  -> OpenRouter DeepSeek provider
  -> Ajv structural validation
  -> semantic validation and bounded repair
  -> deterministic MySQL-backed budget engine
  -> MySQL repositories and provenance
  -> comparison, workspace, profile, and admin UI
  -> Leaflet/OpenStreetMap display
```

Normal development and production require MySQL. Memory repositories and synthetic providers are explicit test/demo dependencies only. SQLite, AMap, and body-shape-selected legacy generation are absent from runtime composition.

## Generation Contract

`POST /api/trips/generate` accepts one sanitized preference contract and always calls the report-aligned planner. The planner returns one of:

```js
{ state: "FINAL_VALIDATED", trip, variants, validation }
{ state: "FAILED", error: { code, message, actionHints }, validation }
```

The Express route wraps failures consistently in the API error envelope. The frontend localizes known error codes and may show safe action hints; it never exposes provider internals.

Every named attraction schedule entry has an OpenTripMap `xid` that is present in the retrieved allow-list. Generic meal, transfer, accommodation, rest, and departure entries do not claim external grounding and use `AI_GENERATED` or `ESTIMATED` labels.

## Travel and Schedule Rules

- Hard constraints: supported destination, trip dates, arrival/departure boundaries, travellers, budget, mandatory selected attractions, and attraction allow-list.
- Soft preferences: interests, food style, accommodation tier, local transport, pace/activity interests, and free text.
- A full day of at least 8 available hours normally requires three meaningful entries and at least two attractions, unless a long-duration attraction, explicit slow pace, or verified candidate scarcity explains the exception.
- A medium day of 5-8 hours normally requires two meaningful entries.
- A short day under 5 hours may contain one meaningful entry.
- Haversine distance plus centralized mode speed/wait assumptions produces estimated travel minutes. Straight Leaflet lines are labelled “Estimated Travel Sequence”, never optimized routes.
- Opening hours, hotel availability, restaurant availability, and booking status are not fabricated.

## Three Alternatives and Budget

The fixed alternatives are Budget-Saving, Balanced, and Comfort-Focused. They share the same user budget ceiling. Profile rules alter deterministic accommodation, food, transport, attraction, and optional entertainment selection. When reference data and budget permit, totals must be ordered:

```text
Budget-Saving < Balanced < Comfort-Focused <= User Budget
```

The differentiation validator checks profile configuration, category totals, overall totals, and attraction/entry composition. If meaningful differentiation is impossible, generation fails with an actionable constraint error rather than presenting false alternatives.

All prices are integer CNY fen calculated after drafting. Cost references are administrator-maintained MySQL records with city, category, optional tier, min/max/representative values, currency, named source, source URL, collection/update dates, and ACTIVE/OUTDATED/UNAVAILABLE status. The LLM never supplies prices.

## Source Model

The display vocabulary is:

- `USER_PROVIDED`: submitted and format-validated by the traveller.
- `OPENTRIPMAP_API`: matched to an OpenTripMap record; not automatically current.
- `DATABASE_BACKED`: stored by Nuogo; not automatically externally verified.
- `AI_GENERATED`: model-authored rationale or sequencing.
- `ESTIMATED`: deterministic budget or travel-time result.
- `CURRENTLY_VERIFIED`: used only with direct evidence from a suitable current source.

Attraction provenance stores xid, provider, source URL when available, retrieved time, city, match status, and verification status. AI rationale is displayed separately from source facts.

## Account, Privacy, CRUD, and Admin

Registered users can view/update their display name, change password with current-password verification, and delete their account with reauthentication. Access JWTs expire; there is no refresh token. A 401 clears local authentication and returns the user to login.

Planner consent is persisted before an external LLM call. Account deletion irreversibly anonymizes or removes user-identifiable profile, itinerary, preference, consent, and related data according to a repository-local retention policy.

Objective itineraries support view, schedule-entry edit/save, rename, versioned regeneration, and delete. Every edit reruns grounding, schedule, travel-time, budget, and provenance checks before persistence.

The `/admin` UI and API require server-side ADMIN role. Administrators manage users/status, the three destinations and retrieval settings, cached OpenTripMap records, cost references, and sanitized system/provider failures.

## Removal Boundary

After replacements pass tests, remove runtime and tests for the legacy generator/budget, AMap, SQL.js/SQLite ingestion/media, Huangshan/Mafengwo, tour guides, collaboration/invitations, expense splitting, public sharing/voting, and favorites. Historical audit/design documents may retain names when clearly historical.

## External Evidence Boundary

OpenRouter model identifiers, pricing, context limits, availability, limits, and retention terms must be verified from current official sources and dated. Cost-reference values require named sources and collection dates. Missing evidence is marked `BLOCKED BY EXTERNAL EVIDENCE`; no academic or stakeholder evidence is fabricated.

## Verification

Completion requires passing unit/API/component tests, production build, lint without errors, critical Playwright user/admin journeys, separated opt-in live integration checks, a runtime-remnant search, and `docs/audits/FINAL_REPORT_ALIGNMENT_IMPLEMENTATION.md`.
