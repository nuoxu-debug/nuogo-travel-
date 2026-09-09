# Nuogo

Nuogo is a Chinese-first, bilingual AI-assisted travel planner for Singapore. It is a Bachelor of Computer Science final-year prototype built as a React/Vite and Express modular monolith.

## Implemented Prototype

- Registration, login, guest access, profile/password management, and account deletion.
- Chinese default with persistent Chinese/English selection.
- Structured origin, destination, date, party, hard-budget, interest, stay, food, and transport preferences.
- Pre-generation selection of one Travel Style: Budget-Saving, Balanced, or Comfort-Focused.
- Optional grounded rainy-day alternatives that remain inactive unless the traveller chooses them.
- Deterministic route, schedule, eight-category budget, remaining budget, and per-person calculations.
- POI grounding and provenance through demo fixtures or optional OpenTripMap.
- Direct one-itinerary workspace with editing, revalidation, regeneration, archive, duplication, and deletion.
- Leaflet/OpenStreetMap trip maps plus Anime.js, GSAP, and Three.js presentation motion.
- Supporting administrator controls for destinations, POIs, and cost evidence.
- Memory demo repository and MySQL live repository.
- Deterministic demo AI and optional server-side OpenRouter generation.

Collaboration, shared expenses, tour guides, public sharing, Mafengwo/Anhui ingestion, SQL.js, AMap, booking, and payment are not part of the final runtime.

## Requirements

- Node.js 20 or newer.
- npm.

## Run The Demo

```powershell
npm.cmd install
$env:APP_RUNTIME_MODE = "demo"
$env:AI_PROVIDER = "demo"
$env:TRAVEL_DATA_PROVIDER = "demo"
npm.cmd run dev
```

Open `http://localhost:5173`. The API health endpoint is `http://localhost:8787/api/health`.

No provider key or database is required in demo mode. In-memory users and trips reset when the API restarts.

To expose the administration screen in a disposable demo:

```powershell
$env:DEMO_ADMIN_EMAIL = "admin@nuogo.test"
$env:DEMO_ADMIN_PASSWORD = "choose-a-disposable-password"
npm.cmd run dev
```

## Verification

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run test:integration
```

Live-provider and MySQL integration checks skip unless their explicit opt-in variables and credentials are configured.

## Live Mode

Copy `.env.example` to an untracked `.env`, replace every placeholder, and apply migrations `001` through `015` in filename order. Live mode requires MySQL, a strong JWT secret, an OpenRouter key/model, and an OpenTripMap key.

Do not report a live provider or MySQL check as successful unless the corresponding opt-in integration test was actually executed.

## Workspaces

```text
client/      React, Vite, Tailwind CSS, motion, maps, pages
server/      Express, auth, planning pipeline, providers, repositories
shared/      Zod contracts, JSON Schema, fixed taxonomies
database/    Ordered MySQL migrations
docs/        Current API, audit, acceptance, and historical design records
tests/e2e/   Playwright desktop/mobile critical journeys
```

See [CURRENT_ARCHITECTURE.md](CURRENT_ARCHITECTURE.md), [docs/API.md](docs/API.md), [SECURITY_SETUP.md](SECURITY_SETUP.md), and [docs/MANUAL_ACCEPTANCE.md](docs/MANUAL_ACCEPTANCE.md). Earlier documents under `docs/audits/` are historical snapshots and do not override the current architecture.
