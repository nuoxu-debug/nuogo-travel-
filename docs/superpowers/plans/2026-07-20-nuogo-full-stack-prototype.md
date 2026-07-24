# Nuogo Full-Stack Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, bilingual, animated full-stack Nuogo prototype for mainland China domestic trip planning with real Express APIs and credential-free demo adapters.

**Architecture:** A root npm workspace contains a React/Vite client, Express server, and shared ESM contracts. Controllers depend on repository and AI-provider interfaces, selecting in-memory/demo implementations when credentials are absent and MySQL/OpenRouter implementations when configured.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3, Anime.js 3, React Router 6, dnd-kit, Express 4, Zod, bcryptjs, JWT, mysql2, Vitest, Testing Library, Supertest.

## Global Constraints

- Canonical product name: `Nuogo`.
- English is the default; `EN / 中文` preference persists in local storage.
- All trip destinations and generated POIs are restricted to mainland China.
- No admin dashboard, admin API, admin role, or admin database table.
- No open-ended chat input, scraping, crawling, booking, payments, or notifications.
- All secrets remain in `.env`; only safe labels and defaults appear in `.env.example`.
- The browser always calls Express APIs; it never calls OpenRouter directly.
- Anime.js coordinates page, pipeline, timeline, map, budget, modal, voting, and archive motion.
- `prefers-reduced-motion` disables nonessential animation.
- Demo mode automatically uses memory storage, seeded plans, and a local route visualization.
- Proprietary FYP modules receive short architectural comment blocks.

---

## Planned File Map

```text
.env.example                         Safe environment variable template
package.json                         npm workspaces and root commands
scripts/bootstrap-node.ps1           Workspace-local Node downloader
shared/constants.js                  China cities and bounded enums
shared/schemas.js                    Zod preference and itinerary contracts
database/migrations/001_initial.sql  Complete MySQL schema
database/seeds/001_demo.sql           Safe seed metadata
server/src/app.js                    Express composition root
server/src/index.js                  HTTP process entry
server/src/config.js                 Environment and demo-mode selection
server/src/middleware/auth.js        JWT protection
server/src/services/authService.js   Register/login behavior
server/src/services/validation.js    Sanitization and conflict flags
server/src/services/budget.js        Expense aggregation
server/src/services/promptBuilder.js Server-only OpenRouter prompts
server/src/services/parser.js        Deterministic JSON extraction
server/src/services/generator.js     Triple parallel generation
server/src/providers/demoProvider.js Seeded bilingual itineraries
server/src/providers/openRouter.js   Live provider adapter
server/src/repositories/memory.js    Demo relational repository
server/src/repositories/mysql.js     MySQL repository adapter
server/src/routes/*.js               REST route modules
server/tests/*.test.js               Unit and API behavior tests
client/src/main.jsx                  React entry
client/src/App.jsx                   Router and provider shell
client/src/api/client.js             JWT-aware API client
client/src/i18n/*.js                 English/Chinese translation system
client/src/context/*.jsx             Auth, language, and trip state
client/src/hooks/useAnime.js         Reduced-motion-aware Anime.js helpers
client/src/layout/AppShell.jsx       Shared navigation and demo indicator
client/src/pages/*.jsx               Landing, auth, planner, compare, workspace, archive, shared
client/src/components/*.jsx          Questionnaire, pipeline, timeline, budget, guide, map, share
client/src/styles/index.css          Tailwind layers and global visual system
client/tests/*.test.jsx              Core UI workflow tests
docs/API.md                          Endpoint and adapter documentation
docs/MANUAL_ACCEPTANCE.md            Presentation checklist
README.md                            Setup and project explanation
```

### Task 1: Bootstrap the Workspace and Shared Contracts

**Files:**
- Create: `package.json`
- Create: `scripts/bootstrap-node.ps1`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `shared/package.json`
- Create: `shared/constants.js`
- Create: `shared/schemas.js`
- Create: `shared/contracts.test.js`

**Interfaces:**
- Produces: `chinaCities`, `poiCategories`, `tripStyles`, `preferenceSchema`, `itineraryVariantSchema`, and `activitySchema`.
- Consumes: no prior application interfaces.

- [ ] **Step 1: Add the failing shared-contract test**

```js
import { describe, expect, it } from "vitest";
import { chinaCities } from "./constants.js";
import { preferenceSchema, itineraryVariantSchema } from "./schemas.js";

describe("Nuogo shared contracts", () => {
  it("accepts bounded mainland-China preferences", () => {
    const value = preferenceSchema.parse({
      destination: "chengdu",
      departureCity: "shanghai",
      days: 4,
      totalBudget: 4800,
      interests: ["local_street_food", "historical_relics"],
      groupType: "student_group",
      accommodation: "budget_hotel",
      language: "en",
      startDate: "2026-08-10",
    });
    expect(value.destination).toBe("chengdu");
  });

  it("rejects destinations outside the supported mainland list", () => {
    expect(() => preferenceSchema.parse({
      destination: "tokyo",
      departureCity: "shanghai",
      days: 4,
      totalBudget: 4800,
      interests: ["natural_scenery"],
      groupType: "solo",
      accommodation: "budget_hotel",
      language: "en",
      startDate: "2026-08-10",
    })).toThrow();
    expect(chinaCities.every((city) => city.countryCode === "CN")).toBe(true);
  });

  it("validates a complete itinerary variant", () => {
    const variant = itineraryVariantSchema.parse(globalThis.__NUOGO_TEST_VARIANT__);
    expect(variant.days[0].activities[0].location.latitude).toBeTypeOf("number");
  });
});
```

- [ ] **Step 2: Run the test and confirm the contracts are missing**

Run: `npm run test:shared`

Expected: FAIL because `shared/constants.js` and `shared/schemas.js` do not exist.

- [ ] **Step 3: Add workspace metadata, local Node bootstrap, constants, and schemas**

Implement root workspaces for `client`, `server`, and `shared`; pin Node `>=20`; add `dev`, `build`, `test`, and per-workspace scripts. The PowerShell bootstrap downloads the official Node 20 Windows x64 zip to `.tools/node`, verifies the archive can be expanded, and prints the command that prepends its directory to `PATH`.

Define supported cities `beijing`, `shanghai`, `xian`, `chengdu`, `hangzhou`, `guilin`, `kunming`, `chongqing`, `guangzhou`, `suzhou`, `nanjing`, and `zhangjiajie`, each with bilingual names and center coordinates.

Define strict Zod contracts with these bounds:

```js
export const preferenceSchema = z.object({
  destination: z.enum(cityIds),
  departureCity: z.enum(cityIds),
  days: z.number().int().min(1).max(10),
  totalBudget: z.number().int().min(500).max(50000),
  interests: z.array(z.enum(poiCategories)).min(1).max(6),
  groupType: z.enum(groupTypes),
  accommodation: z.enum(accommodationTypes),
  language: z.enum(["en", "zh"]).default("en"),
  startDate: z.string().date(),
}).strict();
```

Activities must include stable IDs, order, time range, bilingual text, fixed category, address, decimal coordinates, estimated cost, transport note, guide enrichment, vote count, and favorite state.

- [ ] **Step 4: Add a valid global fixture and rerun contracts**

Create a complete two-activity fixture inside the test and assign it to `globalThis.__NUOGO_TEST_VARIANT__`.

Run: `npm run test:shared`

Expected: PASS with 3 tests.

### Task 2: Build Preference Validation, Budget Analysis, Prompt Isolation, and Parser

**Files:**
- Create: `server/package.json`
- Create: `server/src/services/validation.js`
- Create: `server/src/services/budget.js`
- Create: `server/src/services/promptBuilder.js`
- Create: `server/src/services/parser.js`
- Create: `server/tests/services.test.js`

**Interfaces:**
- Consumes: shared `preferenceSchema` and `itineraryVariantSchema`.
- Produces: `validatePreferences(input)`, `calculateBudget(variant, limit)`, `buildPrompt(preferences, style)`, and `parseItinerary(raw)`.

- [ ] **Step 1: Write failing service tests**

```js
it("adds a low-budget luxury conflict", () => {
  const result = validatePreferences(validPreferences({
    days: 4,
    totalBudget: 1200,
    accommodation: "family_resort",
  }));
  expect(result.dailyBudget).toBe(300);
  expect(result.conflicts).toContain("LOW_BUDGET_PREMIUM_STAY");
});

it("keeps fixed server instructions separate from values", () => {
  const prompt = buildPrompt(validPreferences(), "food");
  expect(prompt.system).toContain("mainland China");
  expect(prompt.system).not.toContain("ignore previous");
  expect(JSON.parse(prompt.user).destination).toBe("chengdu");
});

it("extracts fenced JSON and validates it", () => {
  const parsed = parseItinerary("Result:\n```json\n" + JSON.stringify(validVariant()) + "\n```");
  expect(parsed.style).toBe("budget");
});

it("groups activity costs and returns remaining budget", () => {
  const budget = calculateBudget(validVariant(), 5000);
  expect(budget.total).toBeGreaterThan(0);
  expect(budget.remaining).toBe(5000 - budget.total);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm --workspace server test -- services.test.js`

Expected: FAIL with unresolved service modules.

- [ ] **Step 3: Implement the four isolated services**

`validatePreferences` parses with Zod, computes `dailyBudget`, and adds:

- `LOW_BUDGET_PREMIUM_STAY` when daily budget is below CNY 450 with boutique homestay or family resort.
- `SHORT_CROSS_CITY_TRIP` when departure and destination differ and duration is one day.
- `ELDERLY_HIGH_INTENSITY` when elderly groups select more than four interests for trips of two days or less.

`buildPrompt` returns `{ system, user }`; the system string is a fixed server constant and the user value is `JSON.stringify` of validated scalar/enumerated data.

`parseItinerary` attempts direct parse, fenced-block extraction, then a balanced-bracket scan. Every result passes `itineraryVariantSchema`.

`calculateBudget` maps taxonomy values to the four display groups and returns:

```js
{
  categories: { scenicTickets: 0, localFood: 0, transportation: 0, accommodation: 0 },
  total: 0,
  limit,
  remaining: limit,
  overBudget: false,
}
```

- [ ] **Step 4: Run focused and complete server tests**

Run: `npm --workspace server test -- services.test.js`

Expected: PASS with all service tests.

### Task 3: Implement Demo Generation and Triple-Plan Orchestration

**Files:**
- Create: `server/src/data/demoCatalog.js`
- Create: `server/src/providers/demoProvider.js`
- Create: `server/src/providers/openRouter.js`
- Create: `server/src/services/generator.js`
- Create: `server/tests/generator.test.js`

**Interfaces:**
- Consumes: `buildPrompt`, `parseItinerary`, supported city metadata.
- Produces: `DemoPlanProvider.generate(preferences, style)`, `OpenRouterProvider.generate(preferences, style)`, and `generateThreePlans(preferences, provider)`.

- [ ] **Step 1: Write failing orchestrator tests**

```js
it("generates budget, food, and leisure variants concurrently", async () => {
  const calls = [];
  const provider = {
    generate: async (_preferences, style) => {
      calls.push(style);
      return JSON.stringify(validVariant({ style }));
    },
  };
  const result = await generateThreePlans(validPreferences(), provider);
  expect(calls.sort()).toEqual(["budget", "food", "leisure"]);
  expect(result.variants).toHaveLength(3);
});

it("returns editable fallback only for a failed style", async () => {
  const provider = {
    generate: async (_preferences, style) => style === "food" ? "invalid" : JSON.stringify(validVariant({ style })),
  };
  const result = await generateThreePlans(validPreferences(), provider, { retries: 1 });
  expect(result.variants.find((item) => item.style === "food").isFallback).toBe(true);
  expect(result.variants.filter((item) => !item.isFallback)).toHaveLength(2);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm --workspace server test -- generator.test.js`

Expected: FAIL because providers and orchestrator are missing.

- [ ] **Step 3: Add bilingual deterministic China demo data**

Add curated POIs for Chengdu, Beijing, Shanghai, Xi'an, Hangzhou, Guilin, and fallback POIs derived from supported city centers. Each POI contains bilingual title, description, address, guide data, category, coordinates, and cost.

Build each style with a distinct rule:

- budget favors free landmarks, public transit, and budget hotels;
- food prioritizes local street food and regional cuisine;
- leisure limits each day to three slower-paced activities.

No catalog item may point outside mainland China or contain scraped text.

- [ ] **Step 4: Implement OpenRouter and orchestration**

`OpenRouterProvider` sends a server-side request to `https://openrouter.ai/api/v1/chat/completions`, passes only fixed prompt messages, sets JSON response format when supported, and returns message content. The orchestrator starts three promises before awaiting, retries parse/provider failures up to three total attempts, and creates a schema-valid blank fallback per failed style.

- [ ] **Step 5: Run generator and server suites**

Run: `npm --workspace server test`

Expected: PASS.

### Task 4: Implement Repositories, Authentication, and Express API

**Files:**
- Create: `server/src/config.js`
- Create: `server/src/repositories/memory.js`
- Create: `server/src/repositories/mysql.js`
- Create: `server/src/services/authService.js`
- Create: `server/src/middleware/auth.js`
- Create: `server/src/routes/auth.js`
- Create: `server/src/routes/meta.js`
- Create: `server/src/routes/trips.js`
- Create: `server/src/routes/activities.js`
- Create: `server/src/routes/collaboration.js`
- Create: `server/src/routes/favorites.js`
- Create: `server/src/app.js`
- Create: `server/src/index.js`
- Create: `server/tests/api.test.js`

**Interfaces:**
- Consumes: all server services and shared contracts.
- Produces: `createApp(options)`, repository methods for users/trips/activities/shares/votes/favorites, and the complete REST API.

- [ ] **Step 1: Write failing authentication and workflow API tests**

```js
it("registers, authenticates, generates, edits, and shares a trip", async () => {
  const register = await request(app).post("/api/auth/register").send({
    name: "Demo Student",
    email: "student@nuogo.test",
    password: "Nuogo123!",
  }).expect(201);
  const auth = { Authorization: `Bearer ${register.body.token}` };

  const generated = await request(app)
    .post("/api/trips/generate")
    .set(auth)
    .send(validPreferences())
    .expect(201);
  expect(generated.body.variants).toHaveLength(3);

  const tripId = generated.body.trip.id;
  const activityId = generated.body.variants[0].days[0].activities[0].id;
  await request(app).patch(`/api/activities/${activityId}`).set(auth)
    .send({ estimatedCost: 18 }).expect(200);

  const share = await request(app).post(`/api/trips/${tripId}/shares`).set(auth)
    .send({ permission: "view" }).expect(201);
  expect(share.body.url).toContain("/shared/");
});
```

- [ ] **Step 2: Run the API test and verify failure**

Run: `npm --workspace server test -- api.test.js`

Expected: FAIL because `createApp` and routes are missing.

- [ ] **Step 3: Implement the memory repository and auth**

The repository stores normalized maps for users, preferences, trips, variants, days, activities, shares, votes, and favorites. It exposes async methods and deep-clones returned values. Registration hashes with `bcryptjs.hash(password, 12)`; login compares hashes; JWT payload includes only `sub` and `email`.

- [ ] **Step 4: Implement routes and mutation behavior**

Compose Helmet, CORS, 100 KB JSON limit, rate limiting, standard `{ error: { code, message } }` failures, and JWT middleware. Implement every endpoint from the approved specification. Each activity mutation recalculates and returns the current budget. Share mutation routes enforce `edit` permission.

- [ ] **Step 5: Implement the MySQL repository interface**

Use `mysql2/promise` with parameterized SQL. Implement the same public methods as `MemoryRepository`; controllers receive only a repository instance and contain no mode branch. Wrap multi-row trip saves and reorder operations in transactions.

- [ ] **Step 6: Run all server tests**

Run: `npm --workspace server test`

Expected: PASS.

### Task 5: Build the React Shell, Bilingual System, and Authentication

**Files:**
- Create: `client/package.json`
- Create: `client/index.html`
- Create: `client/vite.config.js`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`
- Create: `client/src/main.jsx`
- Create: `client/src/App.jsx`
- Create: `client/src/styles/index.css`
- Create: `client/src/api/client.js`
- Create: `client/src/i18n/translations.js`
- Create: `client/src/context/LanguageContext.jsx`
- Create: `client/src/context/AuthContext.jsx`
- Create: `client/src/hooks/useAnime.js`
- Create: `client/src/layout/AppShell.jsx`
- Create: `client/src/pages/LoginPage.jsx`
- Create: `client/src/pages/RegisterPage.jsx`
- Create: `client/tests/setup.js`
- Create: `client/tests/auth-language.test.jsx`

**Interfaces:**
- Consumes: Express auth routes.
- Produces: `useLanguage()`, `useAuth()`, `apiRequest()`, protected routes, and shared visual shell.

- [ ] **Step 1: Write failing language and authentication UI tests**

```jsx
it("defaults to English and persists Chinese", async () => {
  render(<App />);
  expect(screen.getByText("Plan China, your way.")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "中文" }));
  expect(localStorage.getItem("nuogo-language")).toBe("zh");
});

it("validates login before calling the API", async () => {
  render(<App initialPath="/login" />);
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run client tests and verify failure**

Run: `npm --workspace client test -- auth-language.test.jsx`

Expected: FAIL because the React application is missing.

- [ ] **Step 3: Implement providers, routing, and API client**

Use React Router routes for `/`, `/login`, `/register`, `/planner`, `/compare/:tripId`, `/trip/:tripId`, `/archive`, and `/shared/:token`. The API client attaches `Authorization: Bearer <token>`, parses standard errors, and redirects only after a 401 response.

The language provider reads `nuogo-language`, defaults to `en`, updates `<html lang>`, and exposes `t(key)`.

- [ ] **Step 4: Implement auth pages and Anime.js form behavior**

Use labeled inputs, inline validation, visible password toggle, and loading/error states. Animate page entrance with a stagger and invalid fields with a short horizontal shake through the reduced-motion-aware hook.

- [ ] **Step 5: Run focused client tests**

Run: `npm --workspace client test -- auth-language.test.jsx`

Expected: PASS.

### Task 6: Build the Landing Page, Questionnaire, and AI Pipeline

**Files:**
- Create: `client/src/pages/LandingPage.jsx`
- Create: `client/src/pages/PlannerPage.jsx`
- Create: `client/src/components/LanguageToggle.jsx`
- Create: `client/src/components/PreferenceForm.jsx`
- Create: `client/src/components/PipelineOverlay.jsx`
- Create: `client/src/components/icons/TravelGlyphs.jsx`
- Create: `client/tests/planner.test.jsx`

**Interfaces:**
- Consumes: `/api/meta/china`, `/api/preferences/validate`, `/api/trips/generate`.
- Produces: sanitized preferences and navigation to `/compare/:tripId`.

- [ ] **Step 1: Write failing planner workflow tests**

```jsx
it("shows bounded China controls and live daily budget", async () => {
  renderPlanner();
  expect(screen.getByRole("combobox", { name: "Destination" })).toHaveValue("chengdu");
  await userEvent.clear(screen.getByLabelText("Total budget"));
  await userEvent.type(screen.getByLabelText("Total budget"), "6000");
  expect(screen.getByText("¥1,500 / day")).toBeInTheDocument();
  expect(screen.queryByRole("textbox", { name: /chat/i })).not.toBeInTheDocument();
});

it("shows all six pipeline stages while generating", async () => {
  renderPlanner({ generationDelay: 50 });
  await userEvent.click(screen.getByRole("button", { name: "Generate 3 plans" }));
  expect(await screen.findByText("Collecting China travel preferences")).toBeInTheDocument();
  expect(await screen.findByText("Rendering timeline & map routes")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm --workspace client test -- planner.test.jsx`

Expected: FAIL because landing/planner components are missing.

- [ ] **Step 3: Implement the destination-led landing page**

Use a full-bleed China destination photograph in the hero, Nuogo as the H1, visible planner CTAs, seven feature items, a three-step process band, destination gallery, and project footer. Apply Anime.js title stagger, hero scale reveal, scroll-triggered section entrances, and feature hover feedback.

- [ ] **Step 4: Implement bounded questionnaire and validation**

Render semantic dropdowns, sliders/steppers, selectable tags, segmented group controls, accommodation choices, date input, daily budget output, and conflict messages. Never render a free-text travel prompt. Normalize numeric and enum values before requests.

- [ ] **Step 5: Implement the six-stage overlay**

Create one Anime.js timeline for progress, stage text transitions, route-dot movement, luggage glyph float, and exit. Coordinate API completion with a 3.6-second minimum presentation duration and immediately expose a translated retry action on failure.

- [ ] **Step 6: Run planner tests**

Run: `npm --workspace client test -- planner.test.jsx`

Expected: PASS.

### Task 7: Build Comparison and the Editable Timeline Workspace

**Files:**
- Create: `client/src/context/TripContext.jsx`
- Create: `client/src/pages/ComparePage.jsx`
- Create: `client/src/pages/TripWorkspacePage.jsx`
- Create: `client/src/components/PlanComparison.jsx`
- Create: `client/src/components/DayTabs.jsx`
- Create: `client/src/components/Timeline.jsx`
- Create: `client/src/components/ActivityCard.jsx`
- Create: `client/src/components/ActivityModal.jsx`
- Create: `client/src/components/BudgetPanel.jsx`
- Create: `client/src/components/GuidePanel.jsx`
- Create: `client/tests/workspace.test.jsx`

**Interfaces:**
- Consumes: trip detail, variant selection, activity CRUD/reorder/regeneration, and cheaper-alternative endpoints.
- Produces: synchronized selected day/activity state and live budget state.

- [ ] **Step 1: Write failing comparison and CRUD tests**

```jsx
it("compares three variants and selects one", async () => {
  renderTripRoute("/compare/trip-1");
  expect(await screen.findAllByText(/day itinerary/i)).toHaveLength(3);
  await userEvent.click(screen.getAllByRole("button", { name: "Choose this plan" })[1]);
  expect(mockNavigate).toHaveBeenCalledWith("/trip/trip-1");
});

it("edits one activity and refreshes the budget", async () => {
  renderTripRoute("/trip/trip-1");
  await userEvent.click(await screen.findByRole("button", { name: "Edit Jinli Ancient Street" }));
  await userEvent.clear(screen.getByLabelText("Estimated cost"));
  await userEvent.type(screen.getByLabelText("Estimated cost"), "25");
  await userEvent.click(screen.getByRole("button", { name: "Save activity" }));
  expect(await screen.findByText("¥25")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm --workspace client test -- workspace.test.jsx`

Expected: FAIL because comparison and workspace components are missing.

- [ ] **Step 3: Implement comparison selection**

Display synchronized variant columns with pace, total, highlights, and day summaries. Stagger columns with Anime.js and animate the chosen card into a full-width transition before navigation.

- [ ] **Step 4: Implement timeline CRUD and drag reorder**

Use dnd-kit sortable activities. Keep stable card dimensions while dragging. Call the bulk reorder endpoint on drag end and revert on API failure. Add edit/delete/add/regenerate controls with Lucide icons and tooltips. Animate insertion, removal, and settled reflow with Anime.js.

- [ ] **Step 5: Implement live budget and guide panels**

Interpolate previous-to-next budget values through Anime.js object animation. Mark over-budget values and expose the cheaper-alternative action. Guide data follows selected activity and shows culture, hidden food, crowd, and visit advice in the selected language.

- [ ] **Step 6: Run workspace and full client tests**

Run: `npm --workspace client test`

Expected: PASS.

### Task 8: Add Synchronized Amap/Fallback Routes, Sharing, Voting, Archive, and Favorites

**Files:**
- Create: `client/src/components/RouteMap.jsx`
- Create: `client/src/components/DemoRouteMap.jsx`
- Create: `client/src/components/AmapRouteMap.jsx`
- Create: `client/src/components/ShareDialog.jsx`
- Create: `client/src/components/VoteButton.jsx`
- Create: `client/src/pages/SharedTripPage.jsx`
- Create: `client/src/pages/ArchivePage.jsx`
- Create: `client/src/components/TripArchive.jsx`
- Create: `client/src/components/FavoritesGrid.jsx`
- Create: `client/tests/collaboration-archive.test.jsx`

**Interfaces:**
- Consumes: selected timeline activity, share/vote/favorite/archive APIs.
- Produces: marker-to-timeline callbacks, share URL, vote state, archive filtering, and reusable preferences.

- [ ] **Step 1: Write failing synchronization and collaboration tests**

```jsx
it("selects the matching timeline activity from a map marker", async () => {
  renderTripRoute("/trip/trip-1");
  await userEvent.click(await screen.findByRole("button", { name: "Map marker: People's Park" }));
  expect(screen.getByTestId("activity-people-park")).toHaveAttribute("data-selected", "true");
});

it("creates an edit share and records one vote", async () => {
  renderTripRoute("/trip/trip-1");
  await userEvent.click(await screen.findByRole("button", { name: "Share trip" }));
  await userEvent.click(screen.getByLabelText("Can edit"));
  await userEvent.click(screen.getByRole("button", { name: "Create link" }));
  expect(await screen.findByDisplayValue(/shared/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm --workspace client test -- collaboration-archive.test.jsx`

Expected: FAIL because map and collaboration modules are missing.

- [ ] **Step 3: Implement route renderers**

`RouteMap` selects Amap only when `VITE_AMAP_KEY` exists. The local SVG/canvas renderer scales longitude/latitude into a fixed-aspect view, draws a sequential route, pulses selected markers, and exposes accessible marker buttons. Anime.js draws route segments and controls marker pulses.

`AmapRouteMap` loads the official web script only once, creates markers/polylines, and destroys map resources on unmount.

- [ ] **Step 4: Implement sharing and voting**

Generate view/edit links, copy through the Clipboard API, display current permission, and disable mutation controls in view-only shared mode. Voting uses optimistic UI with rollback and Anime.js count feedback.

- [ ] **Step 5: Implement archive and favorites**

Filter trips into draft/upcoming/completed without nested cards. Expose duplicate and reuse-preference actions. Render favorites in a draggable grid and allow insertion into a selected future trip through the activity-create endpoint.

- [ ] **Step 6: Run all client tests and build**

Run: `npm --workspace client test && npm --workspace client run build`

Expected: PASS and a generated `client/dist`.

### Task 9: Add MySQL Migrations, Environment Template, and Project Documentation

**Files:**
- Create: `database/migrations/001_initial.sql`
- Create: `database/seeds/001_demo.sql`
- Create: `docs/API.md`
- Create: `docs/MANUAL_ACCEPTANCE.md`
- Create: `README.md`
- Modify: `.env.example`

**Interfaces:**
- Consumes: final API, schemas, and adapter configuration.
- Produces: reproducible setup, live-mode database schema, API reference, and demonstration checklist.

- [ ] **Step 1: Add a schema verification test**

```js
it("defines every required table without admin tables", () => {
  const sql = readFileSync(new URL("../../database/migrations/001_initial.sql", import.meta.url), "utf8");
  for (const table of [
    "users", "travel_preferences", "trips", "itinerary_variants",
    "trip_days", "activities", "trip_shares", "activity_votes", "favorites",
  ]) {
    expect(sql).toMatch(new RegExp(`CREATE TABLE ${table}`, "i"));
  }
  expect(sql).not.toMatch(/CREATE TABLE .*admin/i);
});
```

- [ ] **Step 2: Run the schema test and verify failure**

Run: `npm --workspace server test -- schema.test.js`

Expected: FAIL because migration files are missing.

- [ ] **Step 3: Create the migration and safe seed**

Use `utf8mb4`, InnoDB, indexed foreign keys, unique user email/share token/vote constraints, decimal coordinates, JSON bilingual/guide fields, and timestamp columns. Store only non-secret demonstration metadata in the seed.

- [ ] **Step 4: Document exact environment variables**

```dotenv
NODE_ENV=development
PORT=8787
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=replace-with-a-long-random-string
DEMO_MODE=true
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4.1-mini
AMAP_WEB_KEY=
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=nuogo
MYSQL_USER=nuogo
MYSQL_PASSWORD=
VITE_API_URL=http://localhost:8787/api
VITE_AMAP_KEY=
```

Explain demo/live selection, workspace-local Node bootstrap, install, test, build, run, and credential safety in `README.md`. Document all endpoints and sample error shapes in `docs/API.md`.

- [ ] **Step 5: Add the complete manual acceptance checklist**

Include authentication, bilingual persistence, triple generation, all six loading stages, comparison, selection, CRUD, drag reorder, partial regeneration, budget updates, route sync, sharing permissions, voting, favorites, archive, mobile widths, and reduced motion.

- [ ] **Step 6: Run schema and full tests**

Run: `npm test`

Expected: PASS for shared, server, and client workspaces.

### Task 10: Final Production Verification and Presentation Launch

**Files:**
- Modify only files implicated by verification failures.

**Interfaces:**
- Consumes: complete Nuogo application.
- Produces: production builds and a locally running prototype.

- [ ] **Step 1: Run static scope and secret scans**

Run:

```powershell
rg -n -i "huaxing|华行|tokyo|paris|admin dashboard|open-ended chat" client server shared database
rg -n "sk-or-|OPENROUTER_API_KEY=.+" . -g "!.env.example" -g "!node_modules"
```

Expected: no forbidden brand, international destination, admin UI, chat UI, or credential matches.

- [ ] **Step 2: Run all tests and production builds**

Run: `npm test`

Expected: all workspace tests pass.

Run: `npm run build`

Expected: client and server build/check commands exit successfully.

- [ ] **Step 3: Start the integrated development application**

Run: `npm run dev`

Expected: Express listens on `http://localhost:8787` and Vite serves `http://localhost:5173`.

- [ ] **Step 4: Complete browser acceptance**

Open `http://localhost:5173`, complete the seeded demo workflow, inspect desktop at 1440×900 and mobile at 390×844, and confirm no overlapping text, clipped controls, blank route surface, console errors, or broken images.

- [ ] **Step 5: Record final evidence**

Capture the exact passing test/build summaries, active URLs, demo credentials, adapter mode, and any unverified live-service limitations in the completion response.
