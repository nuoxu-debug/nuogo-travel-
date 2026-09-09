# Nuogo FYP Classroom Demo Guide

This guide prepares the Singapore MVP in deterministic demo mode. Demo mode is repeatable and does not prove that live OpenTripMap, OpenRouter, or MySQL integrations were executed.

## A. Before The Presentation

### 1. Open the project

Use two PowerShell terminals. In both terminals run:

```powershell
cd "C:\Users\G16\OneDrive\桌面\FYP\.worktrees\singapore-report-alignment"
```

### 2. Start the backend and prepare the System Administrator

In terminal 1, enter a development-only administrator email and password when prompted, then start the API:

```powershell
$env:APP_RUNTIME_MODE = "demo"
$env:AI_PROVIDER = "demo"
$env:TRAVEL_DATA_PROVIDER = "demo"
$env:PORT = "8787"
$env:CLIENT_ORIGIN = "http://localhost:5173"
$env:DEMO_ADMIN_EMAIL = Read-Host "Demo administrator email"
$secureAdminPassword = Read-Host "Demo administrator password" -AsSecureString
$env:DEMO_ADMIN_PASSWORD = [Net.NetworkCredential]::new("", $secureAdminPassword).Password
npm.cmd --workspace server start
```

This reuses `initializeDemoRuntime.js`. It creates the account through the normal `USER` authentication model and assigns the stored role value `admin`, which represents the logical **System Administrator** role. It never runs in live mode and creates no separate administrator password table.

Keep terminal 1 open. Demo mode uses the in-memory repository, so restarting the backend resets its demo accounts and trips.

### 3. Start the frontend

In terminal 2 run:

```powershell
npm.cmd --workspace client run dev -- --host 0.0.0.0 --port 5173
```

Keep terminal 2 open. Open [http://localhost:5173](http://localhost:5173).

### 4. Verify frontend-to-backend communication

In a third PowerShell window run:

```powershell
Invoke-RestMethod http://localhost:5173/api/health
```

Expected result: `product` is `Nuogo`, `status` is `ok`, `demoMode` is `true`, and `aiProvider` is `demo`.

### 5. Prepare the Registered Traveller

Open [http://localhost:5173/register](http://localhost:5173/register), create a memorable classroom-only account, and sign out. This calls the real `POST /api/auth/register` route. Do not reuse a production password.

Expected result: registration signs in the traveller and opens the planner. The account remains available until the demo backend is restarted.

## B. Traveller Demonstration

### Guest Mode

1. Open `/` and point out the Singapore-only scope.
2. Select **Continue as Guest**, then confirm **Continue as guest**.
3. In the planner, choose **Choose attractions**.
4. On `/discover/singapore`, show POI cards, categories, source labels, and map markers. Select two attractions and continue.
5. Enter travel dates, traveller count, SGD hard budget, interests, and other preferences.
6. Select one Travel Style: Budget-Saving, Balanced, or Comfort-Focused.
7. Optionally enable Rainy-Day Backup and select **Generate ONE itinerary**.
8. In the workspace, show the selected style, validation summary, included POIs, daily activities, meals, travel estimates, map, sources, and budget.
9. Explain that Rainy-Day Backup is inactive and never replaces the main activity automatically.
10. Show that Guest Mode has no normal **My trips** archive link.

Expected result: one validated itinerary appears, its estimated total is within the SGD hard budget, grounded attraction counts come from the response, and demo facts are labelled **Demo fixture** rather than OpenTripMap API.

### Registered User

1. Register a new traveller or sign in with the account prepared earlier.
2. Generate a Singapore itinerary through the same planner.
3. Open **My trips** to show persistent itinerary management.
4. Open the trip, rename it, edit a supported activity if useful, and regenerate after changing the budget.
5. Show that regeneration creates a newly validated trip result.
6. Delete a disposable demonstration trip.

For the clearest explicit-save demonstration, generate as Guest, select **Sign in to save**, register or log in, return to the workspace, and select **Save itinerary to my account**. Signing in alone does not silently claim the guest trip.

Expected result: registered trips appear in the archive and all visible controls call implemented owner-protected API routes.

## C. System Administrator Demonstration

1. Sign out and log in using the demo administrator values entered in terminal 1.
2. Open `/admin` through the **System Administrator** navigation item.
3. Show **Destinations** and Singapore's lifecycle status.
4. Show **POIs**, including internal POI identity, provider ID, name, category, coordinates, source, and status. Retire only a disposable demo record if demonstrating the action.
5. Show **Cost references**, including SGD range, source, collection date, and status. Edit a value only if you plan to regenerate immediately and explain its effect.

Expected result: the route is inaccessible to an ordinary traveller. The UI contains only destination, Singapore POI, and cost-reference maintenance.

## D. What To Explain

| Page | Explanation | Expected evidence |
| --- | --- | --- |
| Landing/access | Singapore is a bounded MVP; Guest and Registered User have different persistence behavior. | Singapore wording and three access links. |
| Discovery | POI means Point of Interest. Attraction choices use destination-scoped provider identities rather than invented names. | Cards, map, category, source label, selected count. |
| Preferences | Visible fields become structured `TRIP.preferences_json`; one Travel Style is chosen before generation. | Singapore, dates, travellers, SGD budget, interests, MANUAL/AUTO, style, backup. |
| Generation | The AI adapter drafts one itinerary. Deterministic services recalculate route, schedule and costs, validate constraints, and permit at most one controlled repair. | One generation button and one resulting workspace. |
| Workspace | The browser renders a structured run; it does not display raw JSON or query database tables. | Days, activities, legs, map, sources and budget. |
| Rainy-Day Backup | The contingency is optional, grounded, separate and inactive. There is no weather monitoring or automatic replacement. | **Inactive** status and excluded unused cost. |
| Archive | Registered owners can manage persistent trips; Guest Mode cannot silently use the archive. | Open, rename/edit, regenerate and delete actions. |
| System Administrator | This is a protected `USER` role, not a separate account system or sixth research module. | Destination, POI and cost-reference tabs only. |

## E. Frontend To ERD Classroom Table

The browser calls HTTP APIs. It never queries a database table directly.

| Frontend page/function | API or data flow | Logical ERD entity | Main fields |
| --- | --- | --- | --- |
| Login/Register | `POST /api/auth/login` or `/register`; `GET /api/auth/me` | `USER` | system `user_id`, name, email, password hash server-side, account type, role |
| System Administrator | protected `/api/admin/*` routes | `USER.role`; logical `SYSTEM_ADMINISTRATOR` | stored role `admin`, status |
| Preference form | `POST /api/trips/generate` | `TRIP` | dates, travellers, `budgetMinor`, `preferences_json`, persistence scope |
| Generate ONE itinerary/workspace | generation pipeline then `GET /api/trips/:tripId` | `ITINERARY_RUN`, `TRIP` | run/trip IDs, structured `objective_payload_json`, selected Travel Style, estimated total, state |
| Transport display | legs embedded in the structured itinerary response | `TRIP_LEG` domain and MySQL persistence support | run, day, sequence, origin, destination, mode, duration, distance, estimated cost |
| Singapore POI discovery/map | `GET /api/meta/destinations/singapore/attractions` | `SUPPORTED_DESTINATION`, provider-backed POI; retained `CANONICAL_POI` where administered | destination, xid/provider ID, name, category, coordinates, source |
| Budget | deterministic budget service using repository references | `COST_REFERENCE`, `ITINERARY_RUN` | category, SGD minor units, source/date, estimated total, remaining budget |
| Registered itinerary management | owner-protected `/api/trips/*` routes | `USER` to `TRIP` to `ITINERARY_RUN` | owner, revision, title, run, persistence scope |

## F. Recovery

- **Frontend stopped:** return to terminal 2 and rerun the frontend command. Refresh the browser.
- **Backend stopped:** return to terminal 1, repeat the demo environment commands, and restart it. Recreate demo accounts because memory mode resets.
- **Port occupied:** run `Get-NetTCPConnection -LocalPort 5173,8787 -State Listen` to identify the process. Close only a known stale Nuogo terminal. Do not terminate an unknown process.
- **Login failed:** verify the email and password, check terminal 1 for errors, or restart demo mode and recreate the account.
- **Demo provider failed:** confirm `/api/health` reports `demoMode: true` and `aiProvider: demo`; verify all three demo environment variables are `demo`.
- **Browser session problem:** sign out, close Nuogo tabs, clear site data for `localhost:5173`, reopen the page, and recreate the in-memory demo account if necessary.
- **LAN page unavailable:** allow Node.js on the Windows private network when prompted and confirm both devices are on the same Wi-Fi. Keep localhost as the reliable fallback.

## Screenshot Inventory

| Route | What must be visible | FYP concept | ERD connection |
| --- | --- | --- | --- |
| `/` | Singapore hero plus Guest, Login and Register access | Bounded MVP and account modes | `USER` access paths |
| `/discover/singapore` | POI cards, selected count, source labels and map | Grounded Singapore discovery | `SUPPORTED_DESTINATION`, `CANONICAL_POI` concept |
| `/planner` | dates, travellers, SGD budget, interests, one style and backup | Structured travel preferences | `TRIP.preferences_json` |
| `/trip/:tripId` top | title, selected style and actual validation status | One validated run | `TRIP`, `ITINERARY_RUN` |
| `/trip/:tripId` itinerary | day, activities, meals and transport | Usable itinerary detail | `objective_payload_json`, `TRIP_LEG` |
| `/trip/:tripId` budget/map | S$ total/remaining budget, categories and Singapore map | Hard-budget and route evidence | `COST_REFERENCE`, run estimated total, `TRIP_LEG` |
| `/archive` | saved trip and management controls | Registered persistence and ownership | `USER` to `TRIP` to `ITINERARY_RUN` |
| `/admin` POI tab | POI identity, provider ID, coordinates, source and status | Supporting administrator scope | `USER.role`, `CANONICAL_POI` |
| `/admin` cost tab | SGD range, evidence source, date and maintenance actions | Deterministic planning evidence | `COST_REFERENCE` |

Use English or Chinese consistently within one screenshot. Avoid including passwords, tokens, environment values, or terminal windows containing credentials.
