# Nuogo Report And Implementation Alignment

Verified: 2026-08-31

Use these statements in the final report:

| Report topic | Implemented position |
| --- | --- |
| Frontend | React 18, Vite, React Router, Tailwind CSS, Leaflet, Anime.js, GSAP, Three.js, Lucide |
| Backend | Node.js 20+, Express, JWT, bcryptjs, Helmet, CORS, rate limiting |
| Validation | express-validator at selected HTTP request boundaries, Zod for shared/domain contracts, Ajv for LLM JSON Schema |
| Persistence | Memory repository for demo; MySQL repository for live mode |
| AI | OpenRouter gateway or deterministic demo provider; no direct DeepSeek API integration |
| Tourism data | OpenTripMap live adapter or deterministic demo fixtures |
| Coverage | Singapore only |
| Planning output | One validated itinerary for the pre-selected Travel Style under one hard budget |
| Budget | Deterministic eight-category SGD/minor-unit estimate with total, remaining, and per-person values |
| Maps | Leaflet with OpenStreetMap tiles; route legs are estimates |
| Administration | Supporting maintenance for destinations, POIs, and cost references |

Do not describe PHP, Bootstrap, XAMPP, direct DeepSeek API, AMap, Mafengwo, SQL.js, collaboration, shared expenses, guides, or public sharing as implemented final-runtime technologies/features.

Do not claim live OpenTripMap, OpenRouter, or MySQL verification unless the matching opt-in integration test was executed. Demo fixtures are not current provider or price evidence.

The authoritative active architecture is `CURRENT_ARCHITECTURE.md`. Dated audits are retained as historical project evidence.
