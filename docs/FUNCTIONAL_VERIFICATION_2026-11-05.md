# Nuogo functional verification — 2026-11-05

## Verified locally

The final local checks use isolated temporary persistence and synthetic QA accounts. Real AI checks use the configured OpenRouter provider with demo Singapore attraction/cost data; they do not establish production Supabase readiness.

| Journey | Result |
| --- | --- |
| Register, sign out, sign in, reload | Passed |
| Registered real AI generation | HTTP 201, FINAL_VALIDATED, 2 days, 4 grounded attractions |
| Save and reopen after API/browser restart | Passed |
| Anonymous discovery and real AI generation | HTTP 201, FINAL_VALIDATED, 2 days, 4 grounded attractions |
| Anonymous Save requires authentication | Passed |
| Wrong login credentials preserve unsigned-in preview | Regression covered |
| Account switching cannot reuse saved-trip cache authorization | Regression covered |
| Late previous-account responses cannot replace the new account's trip | Regression covered |
| Private trip removed after access is denied | Regression covered |
| Temporary QA account removal | HTTP 204 |

`npm test`: 621 passed (14 shared, 437 server, 170 client). `npm run build`: passed. The build reports a large JavaScript bundle warning; no compilation failure occurred.

The browser acceptance suite covers desktop/mobile guest generation → rejected login → registration → return to preview → explicit Save, persisted member login/reopen/regeneration/deletion, admin evidence, API restart, and responsive navigation.

`npm run test:e2e`: 24 passed, 6 intentionally skipped duplicate viewport-independent checks, 0 failures. The independent final review found no blocking regressions in the authentication/cache fixes or deployment guards. The staged release was checked against configured secret values and excludes environment files, runtime snapshots, and unrelated local deletions.

## GitHub deployment wiring

The source keeps the existing GitHub Pages frontend, Render API, and Supabase database architecture. Pages deployment requires both successful CI and a valid public HTTPS `VITE_API_URL` ending in `/api`. Credentials belong in Render environment settings and are not bundled into the frontend.

The current public site was reachable, but `/nuogo-travel-/api/health` returned an HTML 404 and its bundle used the relative `/api` target. The working local `.env` has no production database URL or Render API credentials. A public backend URL has not been supplied or connected.

## Still required for public acceptance

1. Connect/provision the Render service and Supabase project, inspect/apply the intended schema and Singapore data, and configure the required server secrets.
2. Confirm public API registration, authentication, discovery, and real generation with the production database.
3. Set GitHub repository variable `VITE_API_URL` to that verified public API, rebuild Pages, and repeat the same browser journey through the public URL.

GitHub Pages alone cannot run the Node API. See the repository README for the concrete deployment sequence. Until these checks pass, the public deployment is not certified functional.
