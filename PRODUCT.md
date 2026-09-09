# Nuogo Product Context

## Product

Nuogo is an LLM-assisted travel planner for a bounded Singapore MVP. The traveller selects one Travel Style before generation, and Nuogo produces one grounded, constraint-aware itinerary inside the user-supplied hard SGD budget.

## Current Objectives

1. Protect profile and travel data through validation, authentication, authorization, server-side keys, consent, safe logging, deletion controls, and prompt-injection screening.
2. Generate one Budget-Saving, Balanced, or Comfort-Focused itinerary from mandatory preferences and a hard total budget.
3. Ground Singapore destination information in OpenTripMap provider records, with deterministic Singapore fixtures available for demonstrations and provenance shown to the user.

## Primary Workflow

1. Sign in or continue as a guest and provide consent.
2. Use the fixed Singapore destination and enter dates, travellers, hard SGD budget, attractions, interests, and travel preferences.
3. Retrieve and normalize destination candidates, then select one Travel Style and optionally request a rainy-day backup.
4. Generate one structured draft, then route, schedule, calculate deterministic costs, validate, and repair it.
5. Open the `FINAL_VALIDATED` itinerary directly in its workspace with source labels, category costs, total, remaining budget, and per-person cost.
6. Inspect its continuous daily sequence, map, travel legs, POI details, data provenance, and any inactive grounded rainy-day contingency.

## Information Boundary

- **User-provided:** dates, budget, party size, preferences, and consent.
- **API-sourced:** POI identifiers, names, categories, coordinates, addresses, and retrieval metadata.
- **Database-backed:** accounts, privacy consent, supported destinations, POIs, and cost references.
- **AI-generated:** activity selection/order, explanation, and recommendation reason.
- **System-estimated:** route duration/cost and six budget-category totals.

Demo provider records are labelled `DEMO_FIXTURE`; they are not represented as live OpenTripMap or currently verified information.

## Assessed MVP Boundary

The assessed MVP excludes human tour guides, booking, payments, live fares, weather, traffic, navigation, social-media/public bearer-link sharing, nationwide coverage, and advanced route optimisation. Historical China/Anhui materials remain only as dated project evidence and do not define the current Singapore runtime.

Authenticated trip membership and equal/flexible group expense splitting remain reusable project capabilities, but they are not used as evidence for the three current objectives.

## Design Commitments

- Product name: Nuogo.
- Simplified Chinese is the default UI language; English is fully selectable and persistent.
- The interface is responsive, keyboard accessible, and usable with reduced motion.
- GSAP communicates route progression and state; Leaflet/OpenStreetMap provides the operational map.
- Sources and estimates are labelled honestly. Nuogo does not claim bookings, live prices, or live navigation.
