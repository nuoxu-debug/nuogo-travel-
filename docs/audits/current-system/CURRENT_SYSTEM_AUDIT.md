# Nuogo Complete Current System Audit

Audit date: 2026-08-07  
Baseline: `main` commit `c0155fc`  
Overall verdict: **USABLE BUT NEEDS MAJOR REFACTOR**

## Executive summary

Nuogo is more than a visual mock. It has a functioning React/Express application, authentication, three-option itinerary generation, persistence adapters, itinerary editing, public sharing, collaboration roles, optimistic concurrency, group expense splitting, attraction ingestion, maps, bilingual UI and 294 passing tests.

It is not yet a defensible final AI travel planner. The LLM or deterministic demo data remains the factual source for most travel entities and prices. Huangshan grounding is partial and bypassable. The budget cannot include transportation correctly, has no traveler count, and can disagree with initial AI activity costs. Maps draw straight lines rather than routes. Tour guide recommendation and administration do not exist as claimed domains. The default runtime is a shared-guest, in-memory demo with a known JWT secret.

The correct conclusion is not “rewrite everything.” The collaboration/expense core, shared schemas, server-only AI boundary and UI foundation are worth retaining. The travel-data, budget, routing, AI validation, admin and deployment cores need substantial redesign.

## Overall health

| Area | Rating | Summary |
|---|---|---|
| UI breadth | Good prototype | polished bilingual flows, but accessibility and integrity gaps |
| Core REST API | Good prototype | real routes, validation and authorization |
| Collaboration/expenses | Strong | best-designed and best-tested subsystem |
| Authentication | Adequate locally | unsafe default deployment/session lifecycle |
| Database | Mixed | good collaboration schema; split/duplicated travel catalogue |
| AI pipeline | Partial | structural validation exists; factual/semantic validation does not |
| Budget | Weak | transport broken, no traveler count, initial arithmetic untrusted |
| Geographic routing | Not implemented | map rendering only |
| Travel data | Weak | 8 partially enriched Huangshan records; synthetic elsewhere |
| Admin/tour guide | Not implemented | CLI review and narrative tips are not modules |
| Testing | Strong prototype | 294 pass, but no live MySQL/external/LLM/routing proof |
| Operations | Weak | no migration runner, CI, lint, typecheck or structured logs |

## Top 10 problems

1. **High: the LLM/demo provider is treated as a source of travel facts for nearly every city.** Non-Huangshan names, coordinates, prices, hotels and restaurants are not verified.
2. **High: budget correctness is not credible.** `transportCost` is not in the activity schema, so transport totals are zero; initial OpenRouter totals are model-authored; no traveler count exists.
3. **High: no routing or feasibility engine exists.** Leaflet/AMap draw straight lines and cannot detect backtracking, impossible travel times or poor day transitions.
4. **High: default deployment is unsafe.** Demo mode uses a known JWT secret and every guest shares one account.
5. **High: travel data is split between unused MySQL tables and a SQL.js file with cross-process lost-update risk.**
6. **High: Huangshan grounding can be bypassed by omitting `sourceAttractionId`; approved source records also lack most operational facts.**
7. **Medium-high: claimed tour-guide recommendation and administration modules do not exist.** “Guide” is generated prose and admin is a local CLI.
8. **Medium-high: public shares are permanent plaintext bearer links, and favorite creation has a private-activity IDOR gap.**
9. **Medium: regeneration and budget-adjustment claims are misleading.** “Cheaper” multiplies cost by 0.55; day/activity regeneration takes the first output from a whole-plan call; no allocation-driven full regeneration exists.
10. **Medium: deployment/quality tooling is incomplete.** No migration runner/history, live MySQL tests, lint, typecheck, CI or structured logging; dependency advisories remain.

## What is genuinely good

- OpenRouter credentials stay on the server.
- Strict Zod schemas reject malformed AI and API structures.
- The provider and repository boundaries are useful concepts.
- Bcrypt cost 12 and strong-secret enforcement in explicit live mode are sensible.
- Owner/editor/viewer checks and commit-time role revalidation prevent many authorization races.
- Optimistic trip revisions prevent silent collaborative overwrites.
- Invitation tokens are high-entropy, hashed, expiring and stateful.
- Expense splitting uses integer fen, exact reconciliation and transactional audit writes.
- Media hydration has host, protocol, redirect, type, size and path controls.
- Client session/trip contexts guard stale async responses and clear private state on logout/401.
- The bilingual, responsive frontend is coherent and the automated test suite is substantial.

## Current feature matrix

| Feature | UI | Backend | Database | Real/Mock | Working? | Quality |
|---|---|---|---|---|---|---|
| Registration | Yes | Yes | users | Real in selected repository | Yes | Good prototype |
| Login | Yes | Yes | users | Real | Yes | Session design needs refactor |
| Guest login | Yes | Yes | one shared user | Demo | Yes | Unsafe if exposed |
| Profile | `/auth/me` only | read only | users | Partial | Partial | No profile page/edit |
| Travel preferences | Yes | validated | JSON + duplicate table | Real inputs | Yes | Missing traveler count/preferences depth |
| Itinerary generation | Yes | demo/OpenRouter | persisted | Mixed | Yes | factual safety weak |
| Three alternatives | Yes | budget/food/leisure | variants | Real generation mechanism | Yes | no diversity validation |
| Compare/select | Yes | Yes | selected_variant_id | Real | Yes | Strong basic flow |
| Edit activity | Yes | Yes | activities | Real | Yes | form validation/accessibility weak |
| Add/delete/reorder | Yes | Yes | activities | Real | Yes | delete has no confirmation |
| Save itinerary | implicit on generation/edit | Yes | trips | Real | Yes | no explicit save concept |
| Delete trip | archive UI | owner route | cascades in MySQL | Real | Yes | memory cleanup diverges |
| Duplicate trip | archive UI | Yes | new aggregate | Real | Yes | adapter output differs |
| Reopen archived trip | No direct action | read exists | trips | UI gap | No | Replace archive workflow |
| Reuse preferences | button exists | none | sessionStorage write | UI-only | No | Dead behavior |
| Budget estimate | Yes | partial calculator | variant JSON/activity cost | Mixed | Partial | transport always zero |
| Budget visualization | Yes | n/a | n/a | Real display | Yes | based on unreliable input |
| Per-person budget | No | No | no traveler count | Missing | No | Required rebuild |
| Category allocation controls | No | No | No | Marketing/UI claim only | No | Required rebuild |
| Allocation-driven regeneration | No | No | No | Missing | No | Required rebuild |
| Cheaper alternative | button | 55% multiplier | updates activity | Fake heuristic | Technically runs | Delete from final architecture |
| Maps | Yes | No routing backend | coordinates only | Real renderer | Yes | not route optimization |
| Attraction catalogue | indirect | SQLite/Mafengwo path | SQLite | Partial real source | Huangshan only | provenance/facts weak |
| Hotels | activity cards | generated/demo | activity rows | Mock/model-authored | Displayed | Not verified recommendations |
| Restaurants/meals | activity cards | generated/demo | activity rows | Mock/model-authored | Displayed | Not verified recommendations |
| Ticket tiers | details dialog | none | no tier table | UI demo estimate | Displayed | Must not be treated as fact |
| Tour guides | “local guide” panel | none | none | Generated tips | UI works | Not a guide recommendation module |
| Public sharing | Yes | Yes | trip_shares | Real | Yes | permanent bearer links |
| Voting | Yes | Yes | votes | Real | Yes | share permission naming/error UX weak |
| Invitations/members | Yes | Yes | collaboration tables | Real | Yes | Strong |
| Group expenses | Yes | Yes | normalized fen tables | Real | Yes | Strongest feature |
| Favorites | Yes | Yes | favorites | Real | Yes | creation IDOR and adapter parity issues |
| Administration | No | local CLI only | review_status | Missing web module | No | Replace |
| User/destination management | No | No | No admin domain | Missing | No | Required if retained in scope |
| Export | No | No | No | Missing | No | Optional future feature |

## Frontend audit

### Routes/pages

| Route | Page | Purpose |
|---|---|---|
| `/` | LandingPage | product overview/demo entry |
| `/login` | LoginPage | account/guest login |
| `/register` | RegisterPage | account creation |
| `/invite/:token` | InvitationPage | inspect/accept/decline invitation |
| `/planner` | PlannerPage | collect preferences and generate |
| `/compare/:tripId` | ComparePage | compare/select three variants |
| `/trip/:tripId` | TripWorkspacePage | private itinerary workspace |
| `/shared/:token` | SharedTripPage | public shared trip |
| `/archive` | ArchivePage | trips/favorites |

All pages are eagerly imported. Unknown routes redirect silently to `/`. There is no protected-route component.

### State and API

- User/session: `AuthContext`, JWT in localStorage.
- Language: `LanguageContext`, defaults to Chinese and stores preference.
- Trip/member state: `TripContext`, session cache and 20-second polling.
- Budget/map/day/modal state: local state in `TripWorkspacePage` and components.
- Expenses/collaboration: component-local state plus direct `apiRequest` calls.
- Admin state: none.
- API calls are centralized at transport level but endpoint orchestration is repeated across components/pages; no generated types or query cache exists.

### Frontend problems

- Simulated generation stages force a minimum 4.34-second wait unrelated to server progress.
- Archive “reuse preferences” writes a key no code reads; archive cannot directly reopen trips.
- `ActivityModal`, activity details and pipeline dialog lack complete focus trapping/restoration/scroll behavior.
- `ActivityCard` uses an article-as-button containing real buttons, producing nested interaction semantics.
- Edit form permits invalid/reversed/empty values until server rejection and does not lock repeated save.
- Low-contrast microcopy and sub-44px touch targets occur in important controls.
- AMap errors are swallowed; vote/favorite/clipboard failures are weak or invisible.
- `TripWorkspacePage` (489 lines), collaboration drawer (518), expense workspace (489), expense dialog (470) and invitation page (465) need responsibility splits.
- Hard-coded label maps are duplicated between form/activity components.
- `Placeholder` and `DemoRouteMap` are dead; some CSS selectors are unused.

### Frontend strengths

- coherent design tokens and responsive layouts;
- no document overflow found in prior browser checks from 320-1440 px;
- skip link, semantic alerts, image fallbacks and reduced-motion checks;
- keyboard drag support;
- stale-session/request protections;
- comprehensive collaboration/expense UI tests.

## Backend audit

The backend resembles routes + services + repositories + middleware, but separation is incomplete. Route handlers perform orchestration, authorization, patch shaping, fallback decisions and response mapping. `mysql.js` is 1,277 lines and `memory.js` 772 lines. There are no controllers, domain modules or typed repository interfaces.

Positive behavior includes one global error pipeline, awaited async handlers, parameterized SQL, transactional creation/collaboration/expenses, optimistic revisions and audit logs.

Problems include:

- adapter parity defects (memory stale shares/favorites, title differences, global favorite flag);
- expected and unexpected errors share one message-exposing handler;
- missing validation schemas for some ad hoc route bodies;
- no auth-specific rate limit;
- no service for route feasibility, verified price or candidate retrieval;
- no generation-run audit/observability;
- no migration runner;
- duplicate legacy metadata routes are still registered at `/api/meta/...` and `/api/...`;
- `incrementTripRevision` has no production caller.

## Budget system audit

| Question | Actual answer |
|---|---|
| Accommodation pricing | demo constants or LLM-authored activity cost |
| Food pricing | demo constants or LLM-authored activity cost |
| Attraction tickets | scraped field is currently null; demo provider uses `ticketPriceMin ?? 40`; OpenRouter authors values |
| Transportation | calculator reads absent `transportCost`, resulting in zero |
| Who totals? | demo/post-edit backend calculator; initial OpenRouter budget can remain model-authored |
| Currency | implicit CNY only; no currency column |
| Freshness | no price timestamp |
| Provenance | no per-price source/confidence |
| Reconciliation | not guaranteed for initial AI plan |
| Detect over budget | calculator can flag overage after calculation; no hard generation enforcement |
| Group/per-person | expense splitting exists, itinerary traveler-count budget does not |

## Data source audit

| Data | Source | Retrieval | Real/Mock | Freshness | Reliability |
|---|---|---|---|---|---|
| Huangshan attraction names/counts/thumbnails | Mafengwo catalogue | bounded manual scraper | external data | last fetch stored | UNKNOWN / UNVERIFIED credibility; incomplete facts |
| Huangshan descriptions/hours/advice | `huangshanAttractions.js` | hand-authored exact-name merge | curated local | no version | UNKNOWN / UNVERIFIED |
| Other city POIs | `demoCatalog.js` or OpenRouter | hard-coded/model | mock/model | none | not reliable factual source |
| Hotels/restaurants | demo provider/OpenRouter | generated | mock/model | none | not reliable |
| Ticket tiers | client formula (adult, 50% child/student) | UI calculation | fake estimate | none | not reliable |
| Coordinates | catalogue if present; otherwise demo/model | mixed | mostly estimated | none | no CRS/source assurance |
| Maps | OSM tiles / AMap SDK | browser | real map display | provider-managed | does not verify route |
| Attraction images | Mafengwo cache or Unsplash | lazy server/browser | mixed | no freshness policy | entity match only partial |
| Tour guides/agencies | none | none | missing | n/a | n/a |
| Travel costs | demo constants/model | generated | mock | none | not reliable |

## Dependency audit summary

All declared frontend production packages are imported. The main dependency problem is currency/security, not duplication: Vite/Vitest/React Router/PostCSS and transitive Undici advisories were reported. `playwright-core` is installed locally but undeclared even though scripts import it. Full details are in `CURRENT_TECH_STACK_VERIFIED.md`.

## Dead code and technical debt

| Evidence | Classification |
|---|---|
| `client/src/App.jsx:15` `Placeholder` | DELETE, unused |
| `client/src/components/DemoRouteMap.jsx` | DELETE, unused |
| archive `nuogo-reused-preferences` write | DELETE/FIX, no reader |
| `FavoritesGrid` `draggable` attribute | DELETE, no drag implementation |
| `.page-enter` / `.noise-line` CSS | DELETE if confirmed unused |
| `travel_preferences` reads absent | REFACTOR/DELETE duplicate storage |
| MySQL migration 002 ingestion tables | DELETE or unify; runtime dead |
| repository `incrementTripRevision` | DELETE if contract removed |
| deterministic city catalogue/prices/images | KEEP strictly as demo fixture, never live truth |
| simulated pipeline statuses | DELETE/REPLACE with honest progress |

No meaningful TODO/FIXME/HACK markers were found in production source. The larger debt is implemented placeholder behavior presented as product functionality.

## Strict Keep / Refactor / Replace / Delete

| Component | Current state | Decision | Reason | Priority |
|---|---|---|---|---|
| React/Vite UI foundation | coherent and tested | KEEP WITH CHANGES | good base, upgrade dependencies/accessibility | Medium |
| Express composition | simple and usable | KEEP WITH CHANGES | split domain orchestration gradually | Medium |
| Shared Zod schemas | strict structural contracts | KEEP | strong boundary | Low |
| Collaboration/member/expense domain | real and robust | KEEP | best architecture | Low |
| Memory repository | useful demo/test adapter | KEEP AS DEMO ONLY | not live persistence | Low |
| MySQL core repository | functional but monolithic | REFACTOR | real transactions, weak boundaries/testing | High |
| SQL.js attraction writer | unsafe split store | REPLACE | data-integrity and duplication risk | High |
| OpenRouter provider boundary | server-side abstraction | KEEP | correct dependency direction | Low |
| Current AI prompt/retry/grounding | partial safety | REPLACE/REFACTOR | model remains truth source | High |
| Demo provider | large synthetic generator | KEEP AS DEMO ONLY | valuable tests, invalid live truth | Low |
| Budget engine | incomplete/broken transport | REPLACE | cannot support objectives | High |
| Map components | useful renderers | KEEP WITH CHANGES | add real routing backend | Medium |
| “Cheaper alternative” | 55% multiplier | DELETE | misleading |
| Tour-guide panel as recommendation | generated tips | DELETE/RENAME | not guide profiles |
| Admin CLI as admin module | local direct DB update | REPLACE | no authentication/audit/UI |
| Public share lifecycle | permanent token | REFACTOR | expiry/revoke/DTO needed | High |
| Favorite creation | missing object access check | REFACTOR | IDOR | High |
| Simulated generation progress | invented timing | DELETE/REPLACE | misleading |
| Dead UI files/functions | unused | DELETE | noise |

## What must not survive into the final architecture

- LLM-generated facts, prices and coordinates presented as verified.
- Optional grounding IDs that permit catalogue bypass.
- Straight-line maps described as route optimization.
- Transportation budget fixed at zero.
- Fake ticket tiers and cost multipliers presented as recommendations.
- Synthetic hotels/restaurants/tour guides in the live path.
- Shared guest identity and known default JWT secret on an exposed server.
- Dual MySQL/SQL.js attraction schemas and whole-file concurrent writes.
- Permanent public share tokens without lifecycle controls.
- Simulated backend pipeline progress.
- Claims of admin or tour-guide modules until real domains exist.

## Final system verdict

**USABLE BUT NEEDS MAJOR REFACTOR.** The project has enough sound code and tests to avoid a full rewrite, but its central travel-planning claims depend on synthetic or unverified data. The final FYP should preserve the working application shell and collaboration strengths while rebuilding the travel-data, route, budget, AI-validation and administration cores.
