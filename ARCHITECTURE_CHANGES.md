# Nuogo Architecture Changes

Date: 2026-07-24

## 1. Summary Of Confirmed Original Weaknesses

- `.env.example` contained a real-looking OpenRouter API key.
- OpenRouter live AI requests had no application-level timeout.
- OpenRouter provider errors were plain `Error` instances without stable error codes.
- Metadata routes were mounted through the same router at both `/api/meta` and `/api`.
- JWT was stored directly through repeated `localStorage` calls.
- MySQL trip loading used nested reads for variants, days, and activities.
- Prompt construction did not explicitly label catalogue text as untrusted data and did not cap long scraped descriptions.
- Server dependency metadata had duplicate `cheerio` and `sql.js` keys.
- `.env.example` listed `AMAP_WEB_KEY`, but the current app only consumes `VITE_AMAP_KEY`.

## 2. Incorrect Or Overstated Findings

- Shared trip read access is public by design through a bearer share token, not an accidental missing-login route.
- External and AI data validation was already stronger than a simple JSON parse: Zod schemas, grounding, source URL rules, and image host allowlists existed before this pass.
- A full frontend folder migration was not necessary to improve maintainability.
- A cookie migration was not attempted because doing it correctly would require CSRF and credentialed CORS changes that would significantly alter auth behavior.

## 3. Files Added

- `ARCHITECTURE_VERIFICATION.md`
- `SECURITY_SETUP.md`
- `ARCHITECTURE_CHANGES.md`
- `server/src/errors.js`
- `server/tests/openrouter-provider.test.js`
- `client/src/api/authToken.js`
- `client/src/components/RootErrorBoundary.jsx`
- `client/tests/api-client.test.jsx`
- `client/tests/root-error-boundary.test.jsx`

## 4. Files Modified

- `.env.example`
- `.gitignore`
- `README.md`
- `CURRENT_ARCHITECTURE.md`
- `docs/API.md`
- `server/package.json`
- `server/src/app.js`
- `server/src/config.js`
- `server/src/index.js`
- `server/src/providers/openRouter.js`
- `server/src/repositories/mysql.js`
- `server/src/routes/meta.js`
- `server/src/services/promptBuilder.js`
- `server/tests/api.test.js`
- `server/tests/config.test.js`
- `server/tests/repository-contract.test.js`
- `server/tests/services.test.js`
- `client/src/App.jsx`
- `client/src/api/client.js`
- `client/src/context/AuthContext.jsx`

## 5. Files Moved

None.

## 6. API Routes Changed

- Canonical metadata routes remain:
  - `GET /api/meta/china`
  - `POST /api/meta/preferences/validate`
- Legacy compatibility routes remain explicit and return `Deprecation: true`:
  - `GET /api/china`
  - `POST /api/preferences/validate`

No existing success response shapes were intentionally changed.

## 7. Authentication Changes

- Bearer JWT auth was preserved for the FYP prototype.
- Token access is centralized in `client/src/api/authToken.js`.
- `apiRequest()` now clears stored auth on HTTP 401.
- The limitation of localStorage token storage is documented in `SECURITY_SETUP.md`.

## 8. Security Changes

- Replaced the real-looking OpenRouter key in `.env.example` with a placeholder.
- Added `OPENROUTER_TIMEOUT_MS=30000` to `.env.example`.
- Removed unused `AMAP_WEB_KEY` from active setup examples; only `VITE_AMAP_KEY` is consumed by `client/src/components/RouteMap.jsx`.
- Expanded `.gitignore` for `.env.*`, local attraction media cache, and browser automation cache artifacts.
- Added `SECURITY_SETUP.md` with environment and rotation guidance.
- Added prompt catalogue text limits and explicit untrusted-data instruction.

## 9. Provider Changes

- `OpenRouterProvider` now accepts `timeoutMs`.
- Live OpenRouter fetches use `AbortController`.
- Timeout, network, non-2xx, invalid JSON envelope, and empty-content cases throw typed external-service errors.

## 10. Repository Changes

- `MySqlRepository.getTrip()` now delegates to a batched loader.
- `MySqlRepository.listTrips()` uses the same loader for all listed trip IDs.
- Trip graph loading now uses fixed query groups for trips, variants, days, and activities, then assembles the nested result in JavaScript.

## 11. Frontend Architecture Changes

- Token storage was centralized.
- A root error boundary was added around the app providers and router.
- Existing UI and page flow were preserved.

## 12. Tests Added Or Updated

- OpenRouter timeout and provider-response tests.
- Runtime config timeout tests.
- Cross-user trip/activity authorization tests.
- Prompt catalogue untrusted-data regression.
- MySQL fixed-query trip loading regression.
- Frontend API 401 token cleanup tests.
- Root error boundary test.
- Typed server error middleware mapping test.

## 13. Remaining Limitations

- JWT still uses `localStorage`; acceptable for the prototype, not ideal for production.
- Demo provider is still large and mixed; it was not split to avoid behavior churn.
- Page components still contain some route workflow logic.
- No root lint/typecheck scripts exist.
- MySQL tests use a mocked pool, not a real MySQL container.
- No integrated Playwright end-to-end test command exists.
- Vite still emits a chunk-size warning: the JavaScript bundle is 505.32 kB.

## 14. Future Optional Improvements

- Add short-lived tokens or a complete httpOnly cookie + CSRF migration.
- Split `demoProvider.js` after pinning generated itinerary snapshots.
- Extract frontend trip-generation and workspace mutation hooks.
- Add an integrated E2E smoke test.
- Add ESLint and optional type checking.
- Add request logging with redaction and request IDs.

## 15. Post-Baseline Feature Extension: Trip Collaboration And Expenses

Date: 2026-07-30

This section records a feature added after the pragmatic architecture baseline was frozen. It does not replace the baseline, change the deployment model, or introduce a new architectural style.

Preserved boundaries:

- React and Vite frontend.
- Express modular-monolith API.
- Existing MemoryRepository and MySqlRepository modes.
- Existing Zod shared-contract boundary.
- Existing bearer JWT authentication model.
- Existing public share and voting behavior.

Feature additions:

- Authenticated trip membership with `owner`, `editor`, and `viewer` roles.
- Seven-day editor/viewer invitation links with hashed token persistence.
- Member role management, removal, and collaboration activity history.
- Optimistic trip revision checks through `expectedRevision` and `TRIP_VERSION_CONFLICT`.
- Actual group expense recording, flexible participant exclusion, deterministic equal splitting in integer fen, balances, and settlement instructions.
- Planned itinerary budget remains separate from actual group expenses.

Backend files added or extended:

- `server/src/routes/members.js`
- `server/src/routes/expenses.js`
- `server/src/services/tripAccess.js`
- `server/src/services/invitationTokens.js`
- `server/src/services/expenseSplit.js`
- `server/src/repositories/memory.js`
- `server/src/repositories/mysql.js`
- `server/src/routes/trips.js`
- `server/src/routes/activities.js`

Frontend files added or extended:

- `client/src/pages/InvitationPage.jsx`
- `client/src/pages/TripWorkspacePage.jsx`
- `client/src/context/TripContext.jsx`
- `client/src/components/CollaborationDrawer.jsx`
- `client/src/components/MemberAvatars.jsx`
- `client/src/components/ExpenseWorkspace.jsx`
- `client/src/components/ExpenseDialog.jsx`
- `client/src/components/SettlementList.jsx`

Persistence additions:

- `trips.revision`
- `trip_members`
- `trip_invitations`
- `trip_expenses`
- `expense_participants`
- `trip_activity_log`

Verification additions:

- Shared collaboration and expense schemas.
- Memory and mocked-MySQL repository contract tests.
- Invitation/member/expense API authorization and transaction tests.
- Invitation, collaborative workspace, revision-conflict, expense, settlement, mobile, focus, and reduced-motion frontend tests.
- Deterministic MySQL demo rows in `database/seeds/001_demo.sql`; no live invitation token or external credential is seeded.
- Playwright visual capture for desktop/mobile collaboration and group-expense states.

Current build note:

- The final post-review production build emits 577.72 kB of JavaScript (177.51 kB gzip) and 58.53 kB of CSS (15.57 kB gzip).
- Vite's existing chunk-size warning remains. Bundle optimization is intentionally outside this documentation and verification task.
