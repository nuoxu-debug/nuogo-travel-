# Nuogo Kinetic Travel Redesign

## Intent

Redesign the complete Nuogo frontend around a scenic-wayfinding visual system for young independent travellers and students. The result must feel current and expressive while keeping the planning, comparison, budget, guide, and map workflows practical.

## Chosen Approach

Three viable directions were considered:

1. **Contemporary travel magazine:** strong photography and editorial typography, but weaker for dense tools.
2. **Topographic route atlas:** excellent for maps and routes, but risks looking overly technical.
3. **Scenic wayfinding:** combines route clarity, destination photography, numbered stops, and compact metadata. This is the selected direction because it works across both persuasive and operational screens.

The design uses a contemporary China travel publication as its cultural home and scenic-area signage as its interaction grammar.

## Architecture

The redesign retains React, React Router, Tailwind, anime.js, Leaflet, and the existing application data contracts. It introduces shared visual primitives through global CSS and small reusable React components rather than replacing page logic.

New shared components:

- `ScrollProgress`: viewport progress indicator with reduced-motion support.
- `RouteRail`: reusable animated route sequence for hero and comparison contexts.
- `SectionReveal`: intersection-based, one-time anime.js reveal wrapper.

Existing pages and components keep their API behaviour. Changes are presentation-focused except for correcting visible copy encoding where touched.

## Experience

### Landing

- Full-bleed China travel hero with Nuogo logo, literal product promise, and primary planner action.
- Animated itinerary specimen with three stops, timings, and a visible budget state.
- Three strategy section that demonstrates budget, balanced, and comfort alternatives.
- Scroll-linked story bands connect preference input, comparison, route workspace, and guide selection.
- Anhui destination photography is presented with readable source-aware captions.

### Planner

- Preference input reads as a travel brief, not a generic settings form.
- Grouped fields use numbered stages and visible current trip statistics.
- Selection motion confirms interests and accommodation choices.
- Generation overlay communicates catalogue retrieval, route optimization, budget calculation, and option generation.

### Comparison

- Three plans have distinct colour identities, route summaries, budget bars, and day structures.
- Selection is a clear action; differences remain visible without hover.
- Mobile supports horizontal snap comparison.

### Workspace

- Header and day navigation act as a compact command strip.
- Timeline remains the primary editing surface.
- The Leaflet map stays a real map and uses the shared route visual language.
- Budget and guide panels use dense tables and charts instead of promotional cards.

### Authentication And Archive

- Login and registration use an immersive destination image beside a focused form.
- Archive presents saved trips as a scannable index with clear actions.

## Motion Model

- Page entry: staggered title, metadata, and primary action.
- Route: line draws first, then numbered stops arrive in sequence.
- Scroll: sections reveal once when entering the viewport.
- Selection: short 240-480ms confirmation using scale or translation.
- Loading: staged progress follows the real generation pipeline labels.
- Reduced motion: no translation, scale, path drawing, or looping; final states render immediately.

## Accessibility And Internationalization

- English remains the default.
- English and Simplified Chinese share the same layout and controls.
- Core text and controls target WCAG 2.1 AA contrast.
- Focus states are clearly visible.
- Touch targets are at least 44px.
- Text containers allow wrapping and avoid fixed-height truncation.

## Testing

- Existing component, page, API, and shared tests must continue to pass.
- Add focused tests for new shared motion components and bilingual visible copy.
- Run production build.
- Run the Impeccable detector.
- Verify desktop and mobile screenshots with browser automation.
- Confirm map tiles, logo, attraction media, mobile navigation, and reduced-motion fallback.

## Out Of Scope

- Backend contract changes
- New AI provider integration
- New scraping sources
- New map routing provider
- Fabricated testimonials, statistics, or social proof

