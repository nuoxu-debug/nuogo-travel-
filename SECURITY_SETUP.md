# Nuogo Security Setup

Verified: 2026-08-24

## Environment Files

`.env.example` contains placeholders only. Put local values in an untracked `.env`; never commit credentials.

For credential-free development:

```env
APP_RUNTIME_MODE=demo
AI_PROVIDER=demo
TRAVEL_DATA_PROVIDER=demo
```

Optional demo administrator bootstrap:

```env
DEMO_ADMIN_EMAIL=<demo-admin-email>
DEMO_ADMIN_PASSWORD=<demo-admin-password>
```

Both values are required to create/promote the demo administrator. They are ignored in live mode. Use only disposable local/test credentials.

For live mode:

```env
APP_RUNTIME_MODE=live
MYSQL_PASSWORD=<your-mysql-password>
JWT_SECRET=<at-least-32-random-characters>
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=<your-openrouter-api-key>
OPENROUTER_MODEL=<verified-model-id>
TRAVEL_DATA_PROVIDER=live
OPENTRIPMAP_API_KEY=<your-opentripmap-api-key>
```

The OpenRouter and OpenTripMap keys are read only by the Express server.

## Runtime Protections

- Helmet response headers.
- CORS restricted to `CLIENT_ORIGIN`.
- 100 KB JSON request limit.
- Global request rate limit.
- express-validator request boundary plus Zod domain validation.
- Ajv validation of AI JSON Schema output.
- bcryptjs password hashing with 12 rounds.
- JWT authentication and server-side role/status checks.
- Owner-only trip authorization.
- Prompt-injection screening before LLM processing.
- Safe centralized HTTP errors and redacted system metadata.
- Timeouts and typed errors for OpenRouter and OpenTripMap.
- HTTPS-only administrative evidence URLs.
- Optimistic revisions for trip mutations.

## Accepted Prototype Risks

- JWT is stored in browser `localStorage`, so an XSS defect could expose it. A production system should use a hardened cookie/session design and CSRF protection.
- The API uses one global rate limiter rather than separate login/generation policies.
- Remote Unsplash images and OpenStreetMap tiles disclose normal browser request metadata to those services.
- Demo cost/POI fixtures are not current travel evidence.
- Estimated routes and prices are not booking or navigation guarantees.

## Live Provider Tests

Normal integration tests do not make paid or credentialed calls. Explicitly opt in:

```powershell
$env:OPENTRIPMAP_LIVE_TEST = "true"
$env:OPENROUTER_LIVE_TEST = "true"
npm.cmd run test:integration
```

The relevant API key must also exist. Do not paste provider responses or keys into reports or commits.

## MySQL Integration Test

Use a disposable database whose name ends in `_integration`, set all `MYSQL_INTEGRATION_*` variables, then set:

```powershell
$env:MYSQL_INTEGRATION_ENABLED = "true"
npm.cmd run test:integration
```

Never point the integration test at development or production data.

## Credential Rotation

If a key or password was committed, pasted into a shared document, or shown in a screenshot, rotate it at the provider immediately. Removing it from the latest file does not revoke it or remove it from Git history.

## Pre-Commit Checklist

1. Confirm `.env` remains ignored and `.env.example` contains placeholders only.
2. Scan tracked text files for private keys, bearer tokens, and provider/database credentials.
3. Review staged changes for accidental response payloads or screenshots.
4. Run `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`, and the applicable integration/E2E tests.
5. Record skipped live checks as blocked by external evidence, never as passed.
