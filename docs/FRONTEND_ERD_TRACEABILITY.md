# Nuogo Frontend-to-ERD Traceability

Verified against the Singapore implementation on 2026-09-04. This document describes the implemented frontend, API, domain, and persistence paths. It does not modify or silently correct the submitted report ERD.

## Persistence Legend

- **Persistent:** stored in MySQL in live mode; represented by the in-memory repository in demo mode.
- **Session-only:** stored with a maximum 24-hour guest expiry and omitted from the registered archive until explicitly claimed.
- **Derived:** calculated from persisted/domain data and not claimed as a separate database field.
- **Provider-backed:** retrieved from OpenTripMap in live mode or from clearly labelled deterministic Singapore fixtures in demo mode.

## Frontend Mapping

| Frontend screen / UI | User action | API / route | Server service or boundary | Logical ERD entity | Relevant fields | Persistence and access |
| --- | --- | --- | --- | --- | --- | --- |
| Login | Sign in | `POST /api/auth/login`, `GET /api/auth/me` | `authService.login`, JWT authentication | `USER` | `user_id`, `email`, `password_hash`, `role`, `account_type`, `status` | Persistent registered account. Password hash is server-only and never displayed. |
| Registration | Create account | `POST /api/auth/register` | `authService.register` | `USER` | System-generated `user_id`, `name`, `email`, server-generated `password_hash`, default role | Persistent registered account. Traveller enters name, email, and password only. |
| Guest access | Continue as Guest | `POST /api/auth/guest` | `authService.guest`, guest expiry middleware | `USER` and `TRIP` | `account_type`, `guest_last_activity_at`, `guest_expires_at`, `persistence_scope`, `expires_at` | Session-only. Guest server records expire no later than 24 hours after the latest authenticated activity. |
| System Administrator | Open protected maintenance view; update destination status; inspect/retire POIs; update/retire cost references | `GET/PATCH /api/admin/destinations`, `GET/PUT/DELETE /api/admin/pois`, `GET/PUT/DELETE /api/admin/cost-references` | JWT authentication plus `authorizeRole(repository, "admin")` | `USER.role`; logical `SYSTEM_ADMINISTRATOR` subtype; `SUPPORTED_DESTINATION`; `CANONICAL_POI`; `COST_REFERENCE` | role; destination status; POI identity/provider ID/name/category/coordinates/source/status; cost range/currency/source/date/status | Persistent supporting records. There is no separate administrator credential table, and the UI exposes no unrelated surveillance, booking, payment, guide, or weather administration. |
| Singapore POI discovery | Browse/filter map and select MANUAL preferences or AUTO | `GET /api/meta/destinations/singapore/attractions` | `retrieveAttractionCandidates`, normalization, destination-scoped candidate pool | `SUPPORTED_DESTINATION`, conceptually `CANONICAL_POI` | destination status/center; provider xid, name, category, WGS84 coordinates, source type | Provider-backed for discovery. Live records come from OpenTripMap; demo records use `demo-sg-*` identifiers and `DEMO_FIXTURE`. Admin-maintained canonical POIs are persistent supporting records, not falsely presented as the live discovery response. |
| Travel preference form | Enter dates, travellers, SGD hard budget, interests, selected POIs, one Travel Style, optional backup, language, consent | `POST /api/trips/generate` | Express request validation, Zod `travelPreferenceSchema`, prompt-injection screening | `TRIP` | `destination`, `start_date`, `end_date`, `total_budget`, `preferences_json`; domain `budgetMinor`, `travelStyle`, selection mode/IDs, backup flag | Persistent for registered users; session-only for guests. Duration is derived inclusively from the two dates. |
| Generate ONE itinerary | Generate and validate one selected style | `POST /api/trips/generate` | `generateValidatedTrip`, pre-planner, LLM adapter, route propagation, budget engine, validation engine, one controlled repair | `ITINERARY_RUN` linked to `TRIP` | `run_id`, `trip_id`, physical `profile`, `state`, `estimated_total_fen`, `summary_json`; `objective_payload_json` on `TRIP` | A successful run is persisted only after complete validation. Physical `_fen` names are legacy storage compatibility; domain/API values are SGD minor units. |
| Itinerary workspace | View title, style, days, activities, meals, costs, validation summary, map and sources | `GET /api/trips/:tripId` | owner access check and repository load | `TRIP`, `ITINERARY_RUN` | `objective_payload_json`, selected Travel Style, itinerary days, validation, total and remaining budget | The UI renders the structured objective payload, not raw JSON. Owner-only. Guest access remains session-scoped. |
| Route and transport rows | View start/end anchors and travel between activities | included in trip response | `buildTripLegs`, travel estimator/provider | `TRIP_LEG` | `itinerary_run_id`, `day_number`, `sequence`, `leg_json`; domain origin, destination, mode, duration, distance, estimated cost | MySQL persists normalized leg evidence. The workspace currently consumes the equivalent `day.legs` embedded in `TRIP.objective_payload_json`; it does not issue a direct table query from the browser. |
| Budget panel | View user budget, estimated total, category breakdown, utilization and remaining budget | included in generate/get response | `budgetEngine`, `costReferenceService` | `COST_REFERENCE`, `ITINERARY_RUN` | category/tier, min/representative/max minor units, currency, source, collection date; run summary | Cost references are persistent; totals are deterministically derived and persisted in run/payload evidence. All active values are SGD. |
| Rainy-Day Backup | View optional inactive alternative | included in generate/get response | `rainyDayBackup` | `ITINERARY_RUN` payload | main activity reference, grounded alternative, separate estimated cost, inactive state | Derived attached contingency in the run payload. It never automatically replaces the main activity and unused cost is excluded from the active total. |
| Registered itinerary archive | View saved trips | `GET /api/trips` | repository `listTrips` | `USER` to `TRIP` to `ITINERARY_RUN` | owner, persistence scope, title, revision, objective payload | Persistent registered trips only. Session guest trips are deliberately absent. |
| Workspace management | Rename, edit/revalidate, regenerate, delete | `PATCH /api/trips/:tripId`, `PATCH /entries/:entryId`, `POST /regenerate`, `DELETE /api/trips/:tripId` | owner checks, optimistic revision checks, real planning/revalidation pipeline | `TRIP`, `ITINERARY_RUN`, `TRIP_LEG` | title, revision, parent trip, new run and payload evidence | Persistent for registered owners; current-session edits are available to the owning guest where allowed. Regeneration creates a linked new trip/run. |
| Explicit guest save | Authenticate, return to the trip, then choose Save | `POST /api/trips/:tripId/claim` | one-time SHA-256 claim-token verification | `USER`, `TRIP` | owner, `persistence_scope`, `expires_at`, `guest_claim_token_hash` | Converts exactly one valid session trip to persistent ownership. Login alone transfers nothing; tokens cannot be replayed or used cross-user. |

## Entity Audit

### USER

Created by registration or guest access and used by every authenticated API. MySQL persists registered and guest identities in `users`; guest records additionally carry activity and expiry timestamps. The UI never reads or displays `password_hash`.

### SYSTEM_ADMINISTRATOR

Implemented as the logical specialization `USER.role = 'admin'`. `AppShell` exposes `/admin` only for a server-confirmed administrator, while every admin API independently enforces the same role. A separate physical administrator table would misrepresent the implementation.

### TRIP

Created after successful generation. The visible Singapore form maps to `preferences_json`: dates, traveller count, SGD budget, interests, MANUAL/AUTO selection, safe selected identifiers/display names, one Travel Style, rainy backup, language, other preferences, and consent. Generated itinerary workspace data is stored in `objective_payload_json`.

### ITINERARY_RUN

One run is created per successful generation. Regeneration creates a linked new trip with a new run rather than overwriting the previous validated result. The workspace displays that run's itinerary, validation state, budget summary, provenance, selected-attraction outcomes, and optional contingency.

### TRIP_LEG

Implemented and persisted by the MySQL repository. The frontend does not query `trip_legs` directly; it renders equivalent run legs embedded in the objective payload. The ERD may show the persisted relation, but the report should not claim a browser-to-table read.

### SUPPORTED_DESTINATION

Singapore is the sole active destination in the shared contract and migration `016_singapore_report_alignment.sql`. Beijing, Shanghai, and Xi'an remain unavailable only for historical compatibility.

### CANONICAL_POI

Persistent canonical POI maintenance exists for System Administrators. Traveller discovery is provider-backed and normalized into the same domain concept; live OpenTripMap and demo-fixture provenance remain distinct. The implementation must not claim that every discovery card was loaded from the physical `canonical_pois` table.

### COST_REFERENCE

Persistent Singapore SGD references are selected by `costReferenceService` and used by `budgetEngine`. They are planning estimates, not live prices or booking quotations. Administrator edits affect subsequent planning in the repository mode being used.

## ERD Corrections Required After Frontend Verification

1. If the ERD models `SYSTEM_ADMINISTRATOR` as a separate credential/password table, change it to a logical subtype or role of `USER`.
2. If the ERD claims that the traveller frontend reads `TRIP_LEG` directly, clarify that the browser receives structured run payloads while MySQL stores normalized leg evidence.
3. If the ERD implies all discovered POIs originate from `CANONICAL_POI`, distinguish external/provider-backed discovery from persistent administrator-maintained canonical records.
4. If money fields are labelled CNY/fen at the logical level, use SGD generic minor-unit names. Existing physical `_fen` columns remain documented implementation compatibility only.
