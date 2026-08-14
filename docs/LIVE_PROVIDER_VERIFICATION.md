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

## OpenRouter Runtime Contract

- Configured model ID comes from `OPENROUTER_MODEL`; the code fallback is `openai/gpt-4.1-mini`.
- `OPENROUTER_STRUCTURED_OUTPUT=true` sends a strict `json_schema` response format. Otherwise the adapter requests `json_object` and Nuogo still parses and validates the result through the same Zod contract.
- Requests use temperature `0.2` for planning/repair and are bounded by `OPENROUTER_TIMEOUT_MS`.
- Model support, price, context window, and live response behavior have not been independently verified in this record. A configured free model must pass the same parser, approved-candidate, budget, route, and repair pipeline.
