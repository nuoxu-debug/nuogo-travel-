# Nuogo LLM Comparison Evidence

## Experiment Objective

Capture reproducible FYP evidence comparing two OpenRouter model IDs on the same Nuogo Singapore itinerary task.

## Models

- DeepSeek: `deepseek/deepseek-v4.1-flash`
- Gemini: `google/gemini-3.1-flash-lite`

## Controlled Variables

- AI provider: `openrouter`
- Travel data provider: `database`
- Candidate pool: 25 Singapore canonical POIs
- Destination: Singapore
- Trip dates: 2026-10-10 to 2026-10-12
- Arrival: 2026-10-10T08:00:00+08:00
- Departure: 2026-10-12T20:00:00+08:00
- Travellers: 2
- Budget: SGD 5650.00
- Travel style: BALANCED
- Interests: CULTURE, HISTORY, NATURE, ENTERTAINMENT, FAMILY
- Daily attraction target: 6
- Runs per model: 5

Only changed variable = model ID.

## Evidence Files

- `benchmark-config.json`: benchmark configuration and code/version hashes.
- `benchmark-request.json`: exact normalized Nuogo request reused for both models.
- `runs/`: raw per-run evidence JSON files when live runs are explicitly executed.
- `model-comparison-runs.csv`: per-run machine-readable summary.
- `model-comparison-summary.csv`: per-model aggregate summary.

Do not declare a winner from this scaffold. Live model runs have not been executed yet.
