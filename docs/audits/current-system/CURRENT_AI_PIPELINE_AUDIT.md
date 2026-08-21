# Nuogo Current AI Pipeline Audit

Audit date: 2026-08-07  
Verdict: structured prototype pipeline with serious factual and semantic gaps

## Where AI is used

There is one live LLM integration: `server/src/providers/openRouter.js`. It is called for initial three-option generation and for activity/day regeneration. No frontend code calls OpenRouter directly, and no API key is bundled into the client.

Runtime provider selection is independent of persistence:

- `AI_PROVIDER=demo` creates `DemoPlanProvider`.
- `AI_PROVIDER=openrouter` creates `OpenRouterProvider`.
- `DEMO_MODE` independently selects memory or MySQL core persistence.
- With the audited checkout and no `.env`, the running default is memory persistence plus demo AI.

## Live OpenRouter implementation

| Property | Actual behavior | Evidence |
|---|---|---|
| Endpoint | `POST https://openrouter.ai/api/v1/chat/completions` | `server/src/providers/openRouter.js:22` |
| Model | `OPENROUTER_MODEL`; code fallback `openai/gpt-4.1-mini`; example `tencent/hy3:free` | `server/src/config.js:34`, `.env.example` |
| Authentication | Server-side bearer key | `server/src/providers/openRouter.js:25` |
| Messages | One fixed system message and one JSON-stringified user message | `server/src/providers/openRouter.js:32-35` |
| Output mode | `response_format: { type: "json_object" }` | `server/src/providers/openRouter.js:36` |
| Temperature | 0.5 | `server/src/providers/openRouter.js:37` |
| Token limit | Not set | request body |
| Timeout | Configurable 1-120 seconds, default 30 seconds | `server/src/config.js:7-12` |
| Retry | Initial generation: up to 3 attempts per style | `server/src/services/generator.js:50-70` |
| Backoff/jitter | None | generator loop |
| Fallback model | None | provider/generator |
| Logging | No prompt or model-response logging found | repository search |

The timeout aborts `fetch`, but the timer is cleared immediately after `fetch` resolves and before `response.json()` reads the body. It is therefore not a complete end-to-end response timeout.

## Prompt construction

`server/src/services/promptBuilder.js` supplies a system instruction that:

- limits the planner to mainland China;
- asks for one valid JSON object;
- asks for English and Simplified Chinese;
- warns against following user/catalogue instructions;
- requests realistic CNY costs;
- requires Huangshan catalogue names and IDs.

The user message is JSON containing validated destination, departure city, days, total/daily budget, interests, group type, accommodation, language, date, conflicts, style, and optionally up to 40 approved Huangshan catalogue items. Catalogue descriptions are capped at 280 characters.

Important defect: the system says “matching the supplied itinerary schema,” but no JSON Schema or schema description is sent. The model only receives JSON-object mode and prose instructions.

## Initial generation flow

```text
Planner form
  -> POST /api/trips/generate with bearer JWT
  -> preferenceSchema + deterministic conflict checks
  -> approved SQLite catalogue lookup (Huangshan only)
  -> generateThreePlans
       -> budget, food and leisure styles concurrently
       -> each style can attempt provider.generate three times
       -> parse JSON and strict Zod structure
       -> apply limited grounding
       -> otherwise create empty fallback
  -> repository.createTrip
  -> persist trip, preferences, three variants, days and activities
  -> comparison UI
```

At worst, three styles can each make three calls. Retries include network, HTTP, parse, schema and grounding failures without classification, delay, jitter, `Retry-After`, or cancellation of sibling styles.

## Parsing and structural validation

`parseItinerary` tries the full response, a fenced block, and the first balanced object. It uses `JSON.parse` and `itineraryVariantSchema.parse`. Zod enforces strict objects, bilingual strings, mainland-wide coordinate bounds, numeric ranges, date/time string formats, category enums, and nonnegative costs.

This is real structural validation. It is not semantic itinerary validation. Arrays such as day activities are not meaningfully bounded, the requested number of days is not compared to output, and category totals are not reconciled to activities.

## Grounding behavior

Huangshan is only partially grounded:

- Approved records come from the SQLite catalogue.
- If an activity supplies `sourceAttractionId`, its ID and exact Chinese name must match an approved record.
- Stored coordinates, source URL, provider, cached image and curated visit details override model values where available.
- However, an activity with no `sourceAttractionId` passes unchanged. This bypasses the catalogue-only promise.
- Current approved scraped records have no coordinates, ticket prices, opening hours, address, category or descriptions. Eight records are approved; the application fills some details from hand-authored `huangshanAttractions.js` by exact Chinese name.

For every non-Huangshan city, the grounding function removes source metadata but accepts the model-authored name, address, coordinates, cost and narrative. This is not verification.

## Hallucination and constraint matrix

| Check | Status | Evidence and limitation |
|---|---|---|
| Attraction existence | PARTIAL | ID/name check only for supplied Huangshan IDs; missing IDs bypass it |
| Hotel existence | NOT IMPLEMENTED | hotels are model/demo activities, not verified entities |
| Restaurant existence | NOT IMPLEMENTED | meals are model/demo activities |
| Tour guide existence | FAKE / UI ONLY | `activity.guide` is narrative tips, not people |
| Duplicate activities | NOT IMPLEMENTED for OpenRouter | no cross-day identity or semantic duplicate validator |
| Requested day count | NOT IMPLEMENTED | schema requires at least one day only |
| Consecutive dates | NOT IMPLEMENTED | date syntax only |
| Opening hours | NOT IMPLEMENTED | display text can be curated/model-authored; no schedule check |
| Time overlap | NOT IMPLEMENTED | time format only |
| Impossible travel time | NOT IMPLEMENTED | no directions/travel-time service |
| Unsupported city | PARTIAL | input enum exists, but most listed cities have no verified catalogue |
| Coordinate bounds | PARTIAL | broad mainland box only; no POI match or CRS validation |
| Cost consistency | NOT IMPLEMENTED on initial AI output | model budget object can disagree with activity costs |
| Budget limit | NOT ENFORCED | prompt asks; backend reports overage only after mutation calculation |
| Currency | PARTIAL | CNY is prose/UI convention, not a persisted currency field |
| Alternative diversity | NOT IMPLEMENTED | style labels differ; no overlap/diversity score |
| Route feasibility | NOT IMPLEMENTED | maps draw straight lines |
| Repair loop | NOT IMPLEMENTED | retries repeat the same class of request without validator feedback |

## Budget involvement

The live model produces every activity `estimatedCost` and the initial category-level `budget`. The backend does not replace initial totals with deterministic calculation before persistence. This permits arithmetic mismatch.

`calculateBudget` later sums activity categories, but it reads `activity.transportCost`, a field absent from the strict activity schema. Transportation therefore remains zero. There is no traveler count, per-person calculation, origin-to-destination travel cost, price timestamp, price source, tax/fee model, or confidence range.

The demo provider calculates category totals deterministically after producing hard-coded/synthetic activities, but its underlying prices are still demo constants or `ticketPriceMin ?? 40`.

## Regeneration behavior

- Activity regeneration asks the provider for a whole variant, then takes the first activity of the first returned day.
- Day regeneration asks for a whole variant, then takes the first day’s activities regardless of the day being replaced.
- These paths make one provider call with no retry/repair loop.
- Current trip preferences are reused; user edits do not become explicit constraints.
- There is no category-allocation request model.
- “Cheaper alternative” does not call AI or search data. It multiplies the current estimated cost by 0.55, appends explanatory text, and removes source metadata.
- There is no endpoint to regenerate all three alternatives after a changed allocation.

The UI/marketing claim that budget allocations drive itinerary regeneration is therefore not implemented.

## Fallback and error behavior

After exhausted initial retries, the generator creates a correctly shaped but empty editable itinerary with `isFallback=true` and a `generationError` property. Problems:

- `generationError` is not part of the shared schema;
- MySQL persistence drops it;
- the client does not visibly handle `isFallback`;
- partial fallback variants can look like legitimate generated options;
- no incident/audit record stores model, prompt version, response, validator failures or retry count.

## Prompt-injection and secret audit

Positive controls:

- user preferences are enums, numbers, dates and bounded arrays;
- system and user messages are separate;
- system text warns that catalogue content is untrusted;
- catalogue text is bounded;
- the API key remains server-side;
- no prompt/response logs were found.

Residual risks:

- catalogue descriptions and labels remain untrusted content inside the model context;
- no provider-level JSON Schema constrains keys before generation;
- no output fact whitelist exists outside partial Huangshan IDs;
- model output can influence displayed links/text after only structural checks;
- no record proves which model/prompt/source version produced a saved itinerary.

No secret is intentionally included in prompts. The client exposes only the AMap browser key when configured, which is expected for that SDK and must be domain-restricted.

## Keep / refactor / replace / delete

| Component | Decision | Reason |
|---|---|---|
| Server-only provider interface | KEEP | correct boundary |
| Shared Zod parsing | KEEP WITH CHANGES | real structural gate; needs semantic constraints |
| Preference validation | REFACTOR | useful but incomplete domain model |
| Prompt builder | REFACTOR | send actual schema/candidate IDs and version prompts |
| Retry implementation | REPLACE | no classification, feedback or backoff |
| Huangshan grounding | REPLACE | optional IDs make it bypassable |
| Non-Huangshan live generation | REPLACE | LLM is currently factual source of truth |
| Deterministic demo provider | KEEP AS DEMO ONLY | useful for tests/presentation, not live claims |
| Initial budget values | REPLACE | model-authored and unreconciled |
| “Cheaper alternative” multiplier | DELETE from final architecture | fake recommendation |
| Silent fallback presentation | REPLACE | misleading failure behavior |

## Required future responsibility split

The target direction is compatible with the provider boundary but not the current pipeline internals. Candidate POIs/prices/coordinates must come from verified repositories; deterministic services must calculate schedule, routing and budget; the LLM should select and explain approved candidates; validators must return actionable failures to a bounded repair loop before persistence.
