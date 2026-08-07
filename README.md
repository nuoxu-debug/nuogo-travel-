# Nuogo

Nuogo is a bilingual AI-assisted planner for domestic travel in mainland China. It is a final-year computer science prototype with a React frontend, an Express API, interchangeable AI and persistence adapters, and Anime.js interaction design.

## Prototype Features

- Chinese by default with a persistent Chinese/English language switch
- Bounded China-only preference questionnaire, with no open chat prompt
- Three parallel itinerary styles: budget, food, and leisure
- Six-stage animated generation sequence built with Anime.js
- Plan comparison, editable day timeline, drag reorder, partial regeneration, and live budget totals
- Synchronized route map, cultural guide, sharing permissions, voting, favorites, and trip archive
- Credential-free demo mode plus OpenRouter, Amap, and MySQL live adapters
- A bounded, attributed Anhui attraction catalogue stored in a local SQLite file

## Quick Start

Node.js 20 or newer is required. This repository includes a workspace-local bootstrap for Windows:

```powershell
npm run bootstrap:node
$env:Path = (Resolve-Path '.\.tools\node').Path + ';' + $env:Path
```

Install and start both applications:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. The API health endpoint is `http://localhost:8787/api/health`.

Demo mode uses in-memory storage, deterministic bilingual itinerary data, and the local route renderer. Register any account in the UI; no external credentials are needed. Data resets when the API restarts.

Huangshan generation additionally reads active, approved attractions from `database/local/nuogo-attractions.sqlite`. Grounded activities receive stable Nuogo image URLs and curated bilingual visit details. The local trip and account repository remains in memory.

## Verification

```powershell
npm test
npm run build
```

The root commands cover the shared schemas, server services and API, React workflows, and production client bundle.

## Live Mode

Copy `.env.example` to `.env`, keep secrets out of source control, and set:

- `DEMO_MODE=false` only when MySQL persistence is required
- `AI_PROVIDER=openrouter` to use live AI generation
- a strong `JWT_SECRET`
- `OPENROUTER_API_KEY`
- `OPENROUTER_TIMEOUT_MS` to bound live AI requests
- `MYSQL_PASSWORD` and the remaining MySQL connection values
- `VITE_AMAP_KEY` for the browser map renderer

Apply every migration in order before loading the optional demo seed:

```powershell
Get-Content -Raw database/migrations/001_initial.sql | mysql -u root -p
Get-Content -Raw database/migrations/002_anhui_ingestion.sql | mysql -u root -p
Get-Content -Raw database/migrations/003_grounded_activity_sources.sql | mysql -u root -p
Get-Content -Raw database/migrations/004_activity_media_details.sql | mysql -u root -p
Get-Content -Raw database/migrations/005_trip_collaboration_expenses.sql | mysql -u root -p
Get-Content -Raw database/seeds/001_demo.sql | mysql -u root -p
```

The final seed command is optional. Restart the application after applying the schema. Persistence and AI selection are independent: `DEMO_MODE=true` can be combined with `AI_PROVIDER=openrouter` for local OpenRouter testing without MySQL.

The browser calls only the Express API. OpenRouter credentials stay server-side. `VITE_AMAP_KEY` is a browser key and must be restricted by domain in the Amap console.

## Project Structure

```text
client/      React, Vite, Tailwind CSS, Anime.js
server/      Express, JWT, AI providers, repositories
shared/      Zod contracts and China travel taxonomy
database/    MySQL migrations and safe local seed
docs/        API and manual presentation checks
```

See [docs/API.md](docs/API.md) for the API contract and [docs/MANUAL_ACCEPTANCE.md](docs/MANUAL_ACCEPTANCE.md) for the demonstration checklist.

## Anhui Attraction Ingestion

Nuogo includes a bounded importer for approved public Mafengwo catalogue pages. The current active source covers the Huangshan and southern Anhui cluster; Hefei, Chizhou/Jiuhua Mountain, Xuancheng, Anqing/Tianzhu Mountain, and Wuhu are present in the rollout manifest but remain disabled until an administrator approves a source URL.

Run the importer:

```powershell
npm run ingest:anhui -- --region huangshan
npm run attractions:list -- --status pending --region huangshan --limit 20
npm run attractions:review -- --region huangshan --status approved --ids <id,id,...>
```

The first command:

- refreshes and evaluates Mafengwo's `robots.txt`;
- waits at least 2.5 seconds before an uncached catalogue request;
- extracts only attraction-card facts;
- stores source attribution and remote thumbnail URLs;
- creates or updates `database/local/nuogo-attractions.sqlite`;
- marks every imported attraction as `pending`.

Run with `--refresh` to bypass the local HTML cache. Repeated normal runs reuse the cache and update existing provider/POI records instead of creating duplicates.

The importer does not fetch user travel-diary bodies, user-review bodies, authenticated pages, or full-resolution image libraries. It records one catalogue thumbnail per attraction. When a generated itinerary first requests an approved image, Nuogo redirects to that source immediately and hydrates a validated JPEG, PNG, or WebP copy of at most 8 MiB into `server/storage/attractions/`. Later requests use the local copy. Source attribution remains attached to the activity, and only active, explicitly approved attractions are eligible for hydration or Huangshan generation.

Nuogo enriches the eight approved Huangshan records with curated bilingual descriptions, suggested visit duration, best-time guidance, ticket and opening guidance, highlights, and catalogue popularity counts. These fields are presentation guidance; confirm time-sensitive operating rules at the attributed source.

Optional environment controls:

```dotenv
ATTRACTION_SQLITE_PATH=
ATTRACTION_MEDIA_STORAGE_PATH=
INGESTION_DELAY_MS=2500
```

The production-equivalent MySQL schema is in `database/migrations/002_anhui_ingestion.sql`. The ingestion architecture and expansion policy are documented in `docs/superpowers/specs/2026-07-20-anhui-attraction-ingestion-design.md`.
