# Nuogo Product Context

## Product

Nuogo is an LLM-assisted travel planner for a bounded China MVP covering Beijing, Shanghai, and Xi'an. It generates three grounded, constraint-aware itinerary alternatives and keeps each final estimate inside one user-supplied hard budget.

## Current Objectives

1. Protect profile and travel data through validation, authentication, authorization, server-side keys, consent, safe logging, deletion controls, and prompt-injection screening.
2. Generate Budget-Saving, Balanced, and Comfort-Focused itineraries from the same mandatory preferences and hard total budget.
3. Ground destination information in provider records, using AMap as the primary China POI/routing source and OpenTripMap as a supporting tourism source, with provenance shown to the user.

## Primary Workflow

1. Sign in or continue as a guest and provide consent.
2. Enter origin, one supported destination, dates and times, travellers, hard budget, sights, interests, and travel preferences.
3. Retrieve and normalize destination candidates, then generate three strategy-specific structured drafts.
4. Route, schedule, calculate deterministic costs, validate, and repair each draft.
5. Present only `FINAL_VALIDATED` alternatives with source labels, category costs, total, remaining budget, and per-person cost.
6. Select an alternative and inspect its continuous daily sequence, map, travel legs, POI details, and data provenance.

## Information Boundary

- **User-provided:** dates, budget, party size, origin, preferences, and consent.
- **API-sourced:** POI identifiers, names, categories, coordinates, addresses, and retrieval metadata.
- **Database-backed:** accounts, privacy consent, supported destinations, POIs, and cost references.
- **AI-generated:** activity selection/order, explanation, and recommendation reason.
- **System-estimated:** route duration/cost and all eight budget totals.

Demo provider records are always labelled `DEMO`; they are not represented as live current information.

## Assessed MVP Boundary

The assessed MVP excludes human tour guides, booking, payments, live fares, weather, traffic, navigation, social-media/public bearer-link sharing, nationwide coverage, and advanced route optimisation. Historical Anhui ingestion, `GuidePanel`, and public-share code remain isolated legacy evidence and are disabled unless `ENABLE_LEGACY_FEATURES=true` and `VITE_ENABLE_LEGACY_FEATURES=true` are set deliberately.

Authenticated trip membership and equal/flexible group expense splitting remain reusable project capabilities, but they are not used as evidence for the three current objectives.

## Design Commitments

- Product name: Nuogo.
- English is the assessed UI language; Simplified Chinese remains optional legacy-compatible localization.
- The interface is responsive, keyboard accessible, and usable with reduced motion.
- GSAP communicates route progression and state; Leaflet/OpenStreetMap provides the operational map.
- Sources and estimates are labelled honestly. Nuogo does not claim bookings, live prices, or live navigation.
