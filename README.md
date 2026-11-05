# Nuogo

Nuogo is a bilingual AI-assisted Singapore travel planner built with React, Vite, Express, and shared Zod contracts.

The current implemented MVP is Singapore-only and source-backed. It uses stored Singapore POI candidates, cost references, and operating-hour records for planning checks, while the configured AI provider assists with drafting an itinerary from the allowed candidate pool.

## Requirements

- Node.js 20 or newer
- npm

## Install

```powershell
npm install
```

## Run Locally

Demo mode does not require provider keys or a database:

```powershell
$env:APP_RUNTIME_MODE = "demo"
$env:AI_PROVIDER = "demo"
$env:TRAVEL_DATA_PROVIDER = "demo"
npm run dev
```

Open `http://localhost:5173`. The API health endpoint is `http://localhost:8787/api/health`.

## Build

```powershell
npm run build
```

## Live Configuration

Copy `.env.example` to `.env` locally and fill in the required values. Do not submit `.env`.

For the live Singapore deployment, `TRAVEL_DATA_PROVIDER=database` keeps attraction discovery, price references, and opening-hour validation grounded in the database rather than asking the AI model to invent travel facts.

## Deploy the full application

The public frontend is `https://nuoxu-debug.github.io/nuogo-travel-/`. GitHub Pages serves the React files; a separate Render API handles registration, login, guest generation, saved trips, database access, and OpenRouter requests. Guests can browse and generate; signing in is required to save a trip to an account. Publishing the frontend alone does not make those services available.

Prepare the database, deploy and verify the API, then configure and rebuild Pages. This repository does not contain an assigned production API hostname or production credentials.

### 1. Prepare Supabase PostgreSQL

For a new database, review and run these files manually in the Supabase SQL editor in this order:

1. `database/supabase/001_current_schema.sql`
2. `database/supabase/002_cost_reference_price_sources.sql`
3. `database/supabase/003_poi_operating_hours.sql`
4. `database/seeds/singapore_pilot_25_pois.sql`
5. `database/seeds/verify_singapore_pilot_25_pois.sql` (read-only verification)

The current schema creates the Singapore destination and fallback cost records before the POI seed adds venue data, prices, sources, and operating hours. Verify that the pilot POI count is 25 and duplicate, missing-coordinate, out-of-bounds, and orphan checks return zero. Review the reported price and operating-hour coverage against the seed; refresh dated sources before relying on them for public planning.

For an existing Supabase database, compare the schema and take a backup before applying updates. `CREATE TABLE IF NOT EXISTS` does not upgrade an existing table's columns. The historical files under `database/migrations/` target MySQL; do not run that migration series against Supabase. Deployment does not apply SQL or seed production automatically.

Copy the project's PostgreSQL connection string from Supabase's **Connect** panel into Render's `DATABASE_URL`. For an IPv4 connection, use the session pooler connection on port 5432. Replace the password placeholder and URL-encode special characters. The backend uses PostgreSQL directly and its own password/JWT authentication; no Supabase Auth browser keys are required. See [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres).

### 2. Deploy the Render API

Connect the repository to Render and create a Blueprint from `render.yaml`, using branch `main` and the repository root. The Blueprint installs dependencies, checks the server entry point, starts Express, and uses `/api/health` as the health check. Its production configuration is:

| Setting | Value or source |
| --- | --- |
| `APP_RUNTIME_MODE` | `live` |
| `CLIENT_ORIGIN` | `https://nuoxu-debug.github.io` (origin only, without the repository path) |
| `DATABASE_PROVIDER` | `supabase` |
| `TRAVEL_DATA_PROVIDER` | `database` |
| `AI_PROVIDER` | `openrouter` |
| `OPENROUTER_MODEL` | `google/gemini-3.1-flash-lite` |
| `OPENROUTER_STRUCTURED_OUTPUT` | `true` |
| `OPENROUTER_TIMEOUT_MS` | `120000` |
| `DATABASE_URL` | Supabase PostgreSQL connection string; store only in Render |
| `JWT_SECRET` | A private, randomly generated value of at least 32 characters; keep stable across redeploys |
| `OPENROUTER_API_KEY` | A funded OpenRouter key with access to the configured model; store only in Render |

The OneMap entries in the Blueprint are optional for this database-backed flow; they can be left empty. `OPENTRIPMAP_API_KEY` is only needed if switching to `TRAVEL_DATA_PROVIDER=live`. Render supplies `PORT`. Never add credentials to a `VITE_` variable, commit `.env`, or place provider keys in the Pages build.

Copy the actual public HTTPS service URL assigned by Render. Do not infer it from the Blueprint's service name. Confirm the following before releasing the frontend:

- `GET <actual-api-origin>/api/health` returns `status: "ok"`, `demoMode: false`, and `aiProvider: "openrouter"`.
- `GET <actual-api-origin>/api/meta/destinations/singapore/attractions` succeeds and returns database-backed candidates. Health alone does not query the database or call OpenRouter.
- Browser requests from `https://nuoxu-debug.github.io` receive the matching CORS allow-origin header.

The free plan can suspend an idle service, so allow for a cold start when checking the API. See [Render's Blueprint reference](https://render.com/docs/blueprint-spec) and [free service limitations](https://render.com/docs/free).

### 3. Configure GitHub Pages

In the GitHub repository:

1. Open **Settings → Pages → Build and deployment** and choose **GitHub Actions** as the source.
2. Open **Settings → Secrets and variables → Actions → Variables** and add the **repository variable** `VITE_API_URL`, set to the actual Render HTTPS URL plus `/api`. This is a public URL, so use a variable, not a secret. No Render, database, JWT, or OpenRouter credentials belong in GitHub for this workflow.
3. Push the reviewed changes to `main`, or run **Actions → Deploy GitHub Pages → Run workflow** on `main` after changing the variable.

The Pages workflow first rejects a missing or malformed production API URL, including local URLs and URLs without `/api`. It then requires shared/server/client tests, a full build, and desktop/mobile browser checks through the reusable CI workflow before uploading and deploying the frontend. It builds with `VITE_BASE_PATH=/nuogo-travel-/` and copies `index.html` to `404.html` for direct SPA routes. Other branch pushes and pull requests run CI without publishing. See [GitHub's custom Pages workflow guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Vite embeds `VITE_API_URL` at build time. Changing the repository variable requires a fresh Pages build; it does not update an already published bundle. A valid URL is a configuration check, not proof that the API, database, or AI service is ready.

### 4. Verify the public journey

Open the Pages link in a fresh browser session and check attraction browsing, guest generation with consent, registration/login, saving a generated trip after login, and reopening it after signing out and back in. In the browser Network panel, confirm API calls target the actual Render host and successful generation reports the OpenRouter provider. Reload a nested page to check the SPA fallback. These live checks use the configured database and incur an OpenRouter request; automated CI uses demo providers and does not establish production readiness.

## Project Structure

```text
client/      React frontend and public image assets
server/      Express API, auth, planning, providers, repositories
shared/      Shared constants and validation schemas
database/    Database migrations, Supabase schema, and Singapore seed SQL
```
