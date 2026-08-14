# Live Provider Verification

Live AMap, OpenTripMap, and OpenRouter checks are deliberately separate from deterministic CI.

## Required Environment

```dotenv
DEMO_MODE=true
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=<server-side-key>
TRAVEL_DATA_PROVIDER=live
AMAP_WEB_SERVICE_KEY=<server-side-key>
OPENTRIPMAP_API_KEY=<server-side-key>
RUN_LIVE_TRAVEL_API_TESTS=true
```

Never commit these values. Run provider-focused checks only from a local environment with valid keys. Record the date, destination, provider response status, provenance fields, timeout behavior, and redacted failure details below.

## Current Record

Status: **NOT EXECUTED**

No live-provider pass is claimed by deterministic unit, API, or Playwright tests.

The 2026-08-14 acceptance run used `AI_PROVIDER=demo` and `TRAVEL_DATA_PROVIDER=demo`. Live-provider verification remains pending until valid server-side keys are supplied in a local environment.
