# Nuogo Visual System

## Direction: Scenic Wayfinding

Nuogo combines contemporary Chinese travel editorial design with the functional language of scenic-area wayfinding. Photography establishes place; route lines, numbered stops, ticket metadata, and directional signs explain how a trip moves.

## Visual World

- **Ground:** warm white and pale mist, with deep ink used for navigation and focused work surfaces.
- **Signals:** jade for confirmed paths, vermilion for decisions and active stops, gold for budget and highlights, lake blue for maps and supporting data.
- **Type:** Bricolage Grotesque for expressive English display text, Manrope for interface text and numbers, and Noto Sans SC for Chinese.
- **Shape:** mostly square or lightly rounded surfaces with precise 1px rules. Circular forms are reserved for map stops, statuses, and avatars.
- **Imagery:** large, inspectable destination photographs. Do not blur or darken primary attraction imagery beyond the minimum overlay needed for readable text.
- **Composition:** asymmetric editorial bands on public pages; compact, aligned grids in planning and workspace views.

## Signature Elements

1. A route rail that links numbered stops and animates in travel order.
2. Ticket-like metadata rows for dates, budget, travellers, and pace.
3. Bilingual destination captions that behave like physical wayfinding signs.
4. A four-colour itinerary strategy system so the three generated plans are visibly distinct.
5. A thin page progress signal at the top of the viewport.

## Motion

- Use anime.js for route drawing, staggered stop arrival, section reveals, comparison-card entrance, and pipeline progress.
- Keep one primary motion sequence per surface.
- Hover motion is limited to 2-4px travel and icon translation.
- Scroll reveals run once and preserve reading order.
- `prefers-reduced-motion` renders every element directly in its final state.

## Public Surfaces

- The landing hero remains a full-bleed destination photograph with the product name as the dominant first-viewport signal.
- The first viewport includes a live itinerary specimen so the product is understood immediately.
- Following bands show the three-plan comparison, a connected plan-to-map workflow, and grounded Anhui destination imagery.
- Authentication uses a photographic journey panel and a compact form surface.

## Product Surfaces

- Planner: a destination brief with a strong progress spine and a sticky trip summary.
- Comparison: three equal strategy columns with unique signal colours, budget bars, and day previews.
- Workspace: dense operational layout; timeline, map, budget, and guide recommendations remain visible and scannable.
- Archive: a practical trip index with clear status, destination, date, and action columns.

## Interaction Rules

- Use icon buttons for familiar utilities and icon-plus-text for clear commands.
- Preserve visible labels for destinations, budgets, dates, and destructive actions.
- Never hide essential controls behind hover.
- Keep all primary targets at least 44px tall.
- Language switching must maintain legible contrast in every header and menu state.

## Responsive Rules

- Public editorial grids collapse into a single reading path.
- Comparison columns become horizontally snap-scrollable before stacking into a very long page.
- Workspace side panels move below the map/timeline at tablet widths.
- Hero content leaves a visible hint of the next band on common mobile and desktop viewports.

