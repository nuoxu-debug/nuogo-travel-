# Nuogo Comparison Density and Profile Differentiation Design

## Problem and verified causes

The objective-aligned demo path currently creates one activity per day in `DemoPlanProvider.generateStructured`. All variants use the same cost references, meal count, route mode, rooms, and nights in `calculateItineraryBudget`; spending-profile percentages are target metadata only. Therefore equal activity counts produce equal totals. The comparison page accurately reports one activity as one stop, but its chart omits values and its cards do not expose enough strategy data to support a decision.

## Design

Keep one hard user budget and the existing three profile IDs. Add deterministic profile strategies that define accommodation tier, food tier, preferred local modes, daily density, and activity mix. The demo structured provider uses these strategies to create schedule-aware days from unique verified candidates. Arrival and departure boundaries reduce density when necessary. All generated items remain candidate-addressable, connected by sourced route legs, and checked by the existing schedule, continuity, POI, and hard-budget validators.

Budgeting applies explicit tier factors to the authoritative destination reference amounts and calculates transport from each generated leg. It does not randomize or post-adjust totals. The response exposes calculated `variantMetrics` and `daySummaries`: activity count, paid/free mix, route count, transport distribution, walking estimate, accommodation/food tiers, pace, key attractions, deterministic reasons, and ordered daily preview items.

Add cross-variant validation after all three plans are evaluated. Obvious duplicates produce `INSUFFICIENT_VARIANT_DIFFERENTIATION`; invalid variants are never copied into another slot. The existing bounded generation flow remains responsible for returning only three `FINAL_VALIDATED` plans.

The comparison page becomes a decision surface: a common-scale numeric budget matrix, three compact selectable cards, real metrics, deterministic “why this differs” bullets, and local day tabs showing start, route legs, activities/meals, and end. Desktop uses three columns; tablet/mobile use stacked or horizontally scrollable cards with readable widths. Selection is indicated by border, badge, `aria-pressed`, and heading text rather than colour alone.

## Compatibility and constraints

- Preserve React, Express, Zod, the current workspaces, routes, logo, navigation, and hard-budget model.
- Preserve mandatory sights and user interests across all variants.
- Use no additional LLM call when switching cards or days.
- Keep legacy variant rendering functional.
- Treat missing required cost data as a validation failure, never as zero.
- Do not imply route geometry when only route summaries are available.

## Verification

Use backend unit/integration tests for density, schedule boundaries, budget ordering when feasible, hard-budget compliance, strategy metrics, continuity, and duplicate detection. Use frontend interaction tests for the numeric matrix, metrics, day tabs, selected state, and plan selection. Add a Playwright Beijing five-day regression and inspect desktop and mobile screenshots before completion.
