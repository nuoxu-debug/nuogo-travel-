# Nuogo Visual System

## Direction: Living Journey Atlas

Nuogo is a living journey atlas: cinematic China travel imagery introduces the experience, then a pinned Three.js terrain draws the user's route as they scroll. Bright, precise travel instruments follow for planning and comparison. The route is described with generic stops until real itinerary data supplies place names.

## Direction Contract

**THESIS:** Nuogo makes the complete journey visible, from origin to return. It refuses the standard travel homepage made from a search box over a stock photograph.

**OWN-WORLD:** Volcanic black and cloud white form the ground; signal coral plots the active route, jade confirms sourced data, and electric blue identifies system calculations. Surfaces use map contours, route ticks, and compact flight-status typography rather than decorative glass cards.

**STORY:** See the route, define constraints, compare three budget-safe approaches, then shape one validated trip.

**FIRST VIEWPORT:** A full-bleed China journey photograph owns the background. The left carries one clear promise and primary action; a compact generic route manifest anchors the lower edge. The next section remains visible below the fold.

**FORM:** A photographic travel editorial joined to a route observatory. Scrolling pins the topographic map, draws a coral journey line, moves the travel marker, activates stops, and then transitions into three itinerary approaches. Concept seed `4b42ee56`.

## Palette

- `night`: `#07130f`, the 3D observation ground and focused status surfaces.
- `cloud`: `#f7f8f4`, the operational workspace ground.
- `ink`: `#13221c`, primary text.
- `jade`: `#1da77a`, sourced and accepted states.
- `coral`: `#ff6b4a`, active route and primary action.
- `sky`: `#2e88ff`, system estimates and map data.
- `sun`: `#f4bf4f`, budget and limited highlights.
- `line-light`: `rgba(255,255,255,.14)` and `line-dark`: `rgba(19,34,28,.12)`.

The palette is full but role-bound. Purple, beige, and dark-blue monochrome are not used as the dominant visual world.

## Typography

- Display: platform-native `Aptos Display` or `Segoe UI Variable Display`, with `Noto Sans SC` and system fallbacks; large, direct, maximum 6rem.
- Interface: `Manrope`, `Noto Sans SC`, and system sans.
- Data: tabular numerals in the interface family. Monospace is reserved for coordinates and machine identifiers.
- Letter spacing remains `0`; hierarchy comes from size, weight, and position.

## Composition

- Public surfaces use cinematic horizontal fields, exposed route lines, and one decisive focal action.
- Product surfaces are bright, compact operating views. Maps, timelines, costs, and provenance remain scan-first.
- Cards are used only for repeated plans, activities, and framed tools. Page sections are unframed bands.
- Cards use 12px radius and either a border or shadow, never both.
- Primary controls are at least 44px tall and use Lucide icons where available.

## Living Atlas Scene

- A dynamically loaded Three.js terrain uses the daylight map artwork as its color layer. It is full-bleed, unframed, and decorative rather than an operational navigation map.
- Route labels remain `Departure` and numbered stops until the planner supplies the user's real itinerary data.
- Scroll advances the camera, draws the elevated route, moves and rotates a geometric aircraft, and activates waypoint state.
- Desktop and mobile use separately tuned route framing so the marker stays visible throughout the sequence.
- Reduced-motion and WebGL failure modes show the completed route as a static, semantic journey preview.
- The renderer caps DPR at `1.5`, pauses outside the viewport, and disposes its geometry, materials, textures, listeners, frame, observer, and canvas on unmount.

## Motion

- GSAP owns page entrance, route drawing, pinned scroll transitions, and state changes.
- One authored sequence dominates each surface. Repeated elements may stagger only when order matters.
- Scroll motion uses scrubbed spatial continuity, not a chain of identical fade-ups.
- Hover movement stays within 4px. Loading and repair states communicate progress without pretending to be live server telemetry.
- Under `prefers-reduced-motion`, all content and the completed route are immediately visible, and scroll pinning is disabled.

## Surface Rules

- Landing: photographic cover, route manifest, animated journey map, three spending strategies, information provenance, then a direct planning close.
- Planner: progressive travel brief with a persistent whole-trip budget summary and visible privacy consent.
- Comparison: three equal strategy tracks with identical information architecture and distinct allocation signals.
- Workspace: a compact route console showing start point, trip leg, activity, next leg, and end point without excessive scrolling.
- Archive/admin/auth: quiet operational layouts using the same status and provenance language.

## Accessibility and Performance

- WCAG 2.1 AA contrast for text and controls.
- Complete keyboard navigation, visible focus, semantic headings, and non-color status labels.
- Text remains valid in English and Simplified Chinese, but English is the default presentation.
- Mobile keeps the route marker within the viewport, avoids horizontal overflow, and retains the reduced-motion fallback.
- Generated visual assets are presentation-only; operational places, prices, and routes continue to use provider and system data.
