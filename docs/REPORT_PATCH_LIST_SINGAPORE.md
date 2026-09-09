# Singapore Report Patch List

Do not apply these changes to the Word report automatically. They are recommendations for the student's supervised report-editing pass after implementation verification.

1. **Research Problem:** add one explicit, bounded research problem for secure, grounded, constraint-aware Singapore itinerary generation.
2. **Role terminology:** replace Authorised Maintainer, Supporting Maintainer, and Maintainer with **System Administrator** where they describe the implemented role.
3. **Module-to-objective explanation:** include the five-module mapping and explain how each module contributes, using `docs/REPORT_IMPLEMENTATION_TRACEABILITY.md`.
4. **Technology stack:** describe React/Vite, Express/Node.js, MySQL, JavaScript, Zod/Ajv/request-boundary validation, OpenRouter, OpenTripMap, Leaflet/OpenStreetMap, Git, and test tools only according to repository evidence. Classify Anime.js, GSAP, and Three.js as supporting frontend libraries. Git is verified; GitHub is not fully verified unless actual remote usage is evidenced.
5. **ERD administrator model:** show System Administrator as a logical `USER` role/subtype, not a duplicate credential table.
6. **MVP definition:** define Minimum Viable Product at first formal use and state the Singapore-only assessed boundary.
7. **POI definition:** define Point of Interest at first formal use as a traveller-relevant grounded location.
8. **Use Case terminology:** use Traveller, Guest Mode, Registered User, System Administrator, Singapore POI discovery, one Travel Style, Generate ONE Itinerary, optional Rainy-Day Backup, and itinerary management.
9. **Singapore workflow:** ensure diagrams and prose show Singapore discovery, preferences, one pre-generation style, one itinerary, deterministic validation, hard SGD budget, at most one repair, and one workspace.
10. **Legacy geography/currency:** remove active China, Beijing, Shanghai, Xi'an, CNY, RMB, yuan, and fen wording from the Singapore workflow. Historical implementation discussion must be clearly labelled historical.
11. **Ma et al. (2023):** resolve the citation independently against the actual source and reference list; do not manufacture bibliographic details from implementation evidence.

## Technology Evidence Status

- **Verified used:** Git, React, Vite, Express, Node.js, JavaScript, Zod, Ajv, express-validator, MySQL adapter, Leaflet/OpenStreetMap, Vitest, Supertest, Playwright.
- **Supporting frontend libraries:** Anime.js, GSAP, Three.js.
- **Implemented but live verification separate:** OpenTripMap adapter; OpenRouter adapter configured for the selected DeepSeek model; MySQL repository/migrations.
- **Not fully verified:** GitHub hosting/synchronization unless a real remote or repository evidence is supplied.
- **Do not add artificially:** any report-listed technology absent from the repository. Remove or qualify the report claim instead.
