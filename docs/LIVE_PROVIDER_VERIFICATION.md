# Live Provider Verification

Verified record date: 2026-08-24

Live OpenTripMap and OpenRouter checks are deliberately separate from deterministic tests.

## Opt-In Environment

```env
OPENTRIPMAP_LIVE_TEST=true
OPENTRIPMAP_API_KEY=<server-side-key>
OPENROUTER_LIVE_TEST=true
OPENROUTER_API_KEY=<server-side-key>
OPENROUTER_MODEL=<verified-model-id>
OPENROUTER_STRUCTURED_OUTPUT=<true-only-if-model-support-is-verified>
```

Run:

```powershell
npm.cmd run test:integration
```

## Current Record

Status: **NOT EXECUTED**

The final 2026-08-24 integration run skipped both provider tests because explicit live-test configuration was unavailable. Deterministic unit, API, and Playwright tests do not prove current external behavior.

## Required Evidence

For each real run, record only sanitized information:

- date and configured model/provider identifier;
- HTTP success/failure category;
- presence of expected source/provenance fields;
- schema validation result;
- timeout/error classification;
- no credential or full provider payload.

OpenRouter model support, availability, rate limits, and price can change. Verify the selected model on official OpenRouter pages on the day of the run.
