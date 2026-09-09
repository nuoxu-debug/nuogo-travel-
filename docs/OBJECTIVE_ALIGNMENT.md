# Nuogo Objective Alignment

Verified: 2026-08-31

| Objective | Production modules | User pages | Test evidence |
| --- | --- | --- | --- |
| Security and privacy | auth/profile/privacy routes, auth middleware/service, trip access, prompt screening, logger | Login, register, profile, privacy dialog | security, profile, admin, auth-language, Playwright account journey |
| One constraint-aware itinerary for a selected Travel Style | spending profiles, LLM harness, route/schedule services, budget engine, validation, repair, optional rainy-day backup | Planner, direct objective workspace, archive | generation, budget, validation, repair, rainy-day, workspace, Playwright objective journey |
| Grounded tourism information | demo/OpenTripMap providers, normalization, matching, candidate pool, provenance | Discovery cards/map, activity details, Leaflet itinerary map | travel-provider, POI-pipeline, discovery, workspace, opt-in live-provider test |

## Fixed Runtime Boundary

- Destination: Singapore only.
- Travel Styles: one of `BUDGET_SAVING`, `BALANCED`, `COMFORT_FOCUSED` is selected before generation.
- Rainy-day backup: optional grounded, inactive contingency; no weather detection or automatic replacement.
- Currency: SGD; deterministic engine values use integer minor units.
- Completion state: `FINAL_VALIDATED` only.
- Live tourism provider: OpenTripMap.
- AI gateway: optional OpenRouter; deterministic demo provider by default in demo mode.
- Route/time/cost outputs: system estimates, not bookings or navigation.

Guide recommendations, collaboration, shared expenses, public links, AMap, Mafengwo/Anhui ingestion, SQL.js, booking, and payment are excluded from the final runtime. Historical documents describing them are not evidence of current functionality.

See `CURRENT_ARCHITECTURE.md` for the active FINAL_UNIFIED architecture. Dated audits remain historical evidence.
