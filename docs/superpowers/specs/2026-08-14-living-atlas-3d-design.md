# Nuogo Living Atlas 3D Design

**Date:** 2026-08-14  
**Status:** Approved through the standing instruction to follow the recommended design direction  
**Scope:** Product-wide visual and motion system for the existing React application

## 1. Objective

Rebuild Nuogo's interface into a modern travel experience that uses GSAP and Three.js purposefully while preserving the existing React, Express, shared-contract, authentication, collaboration, budget, and itinerary workflows.

The visual experience must feel like moving through a journey rather than browsing generic travel cards. It must remain practical for repeated planning work, support English and Simplified Chinese, and degrade cleanly when WebGL or motion is unavailable.

## 2. Chosen Direction

The approved direction is **Living Atlas 3D**.

Nuogo will use a bright, tactile three-dimensional journey landscape instead of a globe. The scene presents a stylized topographic travel surface, an elevated coral route, waypoint signals, atmospheric light, and a moving aircraft marker. Scroll changes the camera viewpoint and advances the route.

This direction preserves the already-approved daylight journey map while solving the earlier globe problem: the journey remains close, legible, and connected to itinerary planning rather than becoming a distant view of Earth.

## 3. Design Principles

1. **The journey is the interface.** Route continuity, progress, cost, and source confidence are recurring visual motifs.
2. **3D earns its place.** Three.js appears on narrative and orientation surfaces. It does not replace forms, tables, operational maps, or readable itinerary details.
3. **Motion explains state.** GSAP communicates sequence, comparison, selection, and route progression. Decorative loops remain subtle.
4. **Daylight travel atmosphere.** Terrain stays bright and inspectable. Dark overlays are limited to local contrast support.
5. **Real data remains separate.** Generated artwork and the 3D scene are presentation layers. Provider-sourced coordinates, routes, POIs, and prices remain authoritative.
6. **The product works without animation.** Semantic content and a static route remain available with reduced motion, WebGL failure, or JavaScript rendering constraints.

## 4. Visual Language

### Palette

- Cloud white `#f7f8f4`: operational background.
- Deep ink `#13221c`: primary text and focused controls.
- Jade `#1da77a`: sourced, accepted, and completed states.
- Coral `#ff6b4a`: active journey and primary action.
- Sky `#2e88ff`: calculated system information.
- Sun `#f4bf4f`: budget and limited waypoint emphasis.
- Pale turquoise water and fresh green terrain form the 3D scene.

### Typography

- Display: Aptos Display, Segoe UI Variable Display, Noto Sans SC, system sans.
- Interface: Manrope, Noto Sans SC, system sans.
- Numeric information uses tabular figures.
- Letter spacing remains zero. Hierarchy comes from scale, weight, placement, and contrast.

### Surfaces

- Public narrative surfaces are full-bleed and image-led.
- Product surfaces are bright, compact, and scan-first.
- Cards are reserved for repeated plans, activities, and framed tools.
- No nested decorative cards, ornamental gradient blobs, or generic three-column feature rows.

## 5. Three.js Journey Scene

### Scene Composition

`LivingAtlasScene` renders:

- A subdivided terrain plane using the daylight map artwork as its color texture.
- Restrained procedural elevation that creates tactile relief without claiming geographic altitude accuracy.
- A coral Catmull-Rom route rendered above the terrain.
- Four generic waypoints: `Departure`, `Stop 01`, `Stop 02`, and `Stop 03` until real itinerary data is supplied.
- A small geometric aircraft marker that follows and rotates along the route tangent.
- Soft daylight, ambient fill, shallow fog, and restrained terrain shadowing.

The scene contains no baked-in city names and makes no operational navigation claim.

### Camera Choreography

GSAP ScrollTrigger drives a normalized progress value from zero to one.

- Opening: oblique wide view showing the complete travel surface.
- Discovery: camera lowers and moves toward the route origin.
- Progress: route reveals, aircraft advances, and completed waypoints pulse once.
- Resolution: camera moves toward a clearer top-down composition before comparison content begins.

Pointer movement adds only a small camera offset on devices with a precise pointer. It never changes route state.

### Runtime Boundary

- Three.js is dynamically imported only when the scene enters the viewport and motion is allowed.
- Device pixel ratio is capped at `1.5`.
- Rendering pauses when the scene is offscreen or the document is hidden.
- Resize uses `ResizeObserver` and updates renderer and camera dimensions.
- Geometry, materials, textures, renderer, listeners, observers, and animation frames are disposed on unmount.
- Canvas has no interactive keyboard role; all meaning is duplicated in semantic HTML.

## 6. GSAP Motion System

GSAP owns all authored timelines and scroll sequencing.

- `useGsapContext` scopes selectors and reverts timelines on unmount.
- ScrollTrigger pins only narrative sections, never planner forms or the operational workspace.
- Route progress updates Three.js scene state through a small imperative controller rather than rerendering React every frame.
- Page entrances use one short sequence per surface.
- Plan comparison uses spatial continuity and shared baselines rather than three unrelated card animations.
- Workspace selection uses short transform/opacity transitions and map focus changes.

Under `prefers-reduced-motion: reduce`, content is immediately visible, pinning is disabled, route progress is complete, and the static daylight map is shown.

## 7. Product Surfaces

### Landing

- Keep the photographic first viewport and concise route-planning promise.
- Place the Three.js terrain scene in the full-bleed journey chapter immediately after the hero.
- Scroll through route creation, waypoint activation, and the three spending strategies.
- Keep city names generic in this presentation.
- Preserve direct links to planning and route exploration.

### Planner

- Rebuild the preference form as a progressive whole-trip brief.
- Add a compact, non-pinned route horizon driven by origin, date, traveller, and budget completion state.
- Keep the form and validation fully native and keyboard accessible.
- Use motion to clarify section completion, budget recalculation, and generation state.
- Do not place a continuous 3D renderer beside the entire form on mobile.

### Comparison

- Present all three profiles with identical information architecture.
- Use a shared route ribbon and allocation rail above the plans.
- GSAP transitions focus between `BUDGET_SAVING`, `BALANCED`, and `COMFORT_FOCUSED` without hiding the alternatives.
- Costs, remaining budget, source labels, and validation state remain readable without motion.

### Trip Workspace

- Preserve Leaflet/OpenStreetMap as the operational route map.
- Keep the compact timeline, budget panel, collaboration, editing, and activity details.
- Add route-leg progression, selected-stop focus, restrained map/timeline synchronization, and animated budget deltas.
- Do not render a second decorative 3D map inside the dense workspace.

### Authentication, Archive, and Shared Views

- Use the same typography, route marks, daylight surfaces, and motion tokens.
- Provide quiet page entrances and meaningful empty/loading/error states.
- Avoid heavy 3D scenes on task-focused or public shared-trip screens.

## 8. Component Architecture

### New Components

- `LivingAtlasScene`: React shell and semantic fallback.
- `createLivingAtlas`: framework-independent Three.js scene factory.
- `JourneySceneFallback`: static daylight map and completed SVG route.
- `JourneyProgressRail`: semantic current stage and progress.
- `useReducedMotion`: shared media-query state.
- `useVisibility`: pauses expensive rendering when hidden.

### Reused Components

- `ScrollJourneyMap` supplies route geometry, labels, and fallback composition.
- `RouteConstellation` remains the lightweight route summary.
- `AppShell`, `PreferenceForm`, `PlanComparison`, `Timeline`, `BudgetPanel`, and `LeafletRouteMap` keep their functional responsibilities.

The Three.js scene must not know about authentication, API providers, budgets, or persistence. It accepts presentation-safe route points and progress only.

## 9. Data Flow

1. React renders semantic journey content and the static fallback immediately.
2. Capability checks confirm WebGL, viewport visibility, and motion preference.
3. Three.js loads and replaces only the visual layer.
4. GSAP ScrollTrigger calculates journey progress.
5. The controller updates route reveal, aircraft position, camera pose, and waypoint state.
6. Future real itinerary points can replace generic route points through component props.

No browser component calls AMap, OpenTripMap, or OpenRouter directly.

## 10. Failure Handling

- WebGL unavailable: keep static daylight map and route.
- Texture load failure: render a pale procedural terrain surface and semantic route.
- Context loss: stop rendering and expose fallback without reloading the page.
- Resize or zero-size container: skip frame updates until valid dimensions return.
- Reduced motion: do not initialize continuous rendering.
- Runtime scene exception: catch locally, dispose resources, preserve the rest of the page.

## 11. Accessibility

- Canvas is decorative and `aria-hidden`.
- Route labels, progress, and strategy state exist in semantic HTML.
- All controls are keyboard reachable with visible focus.
- Minimum touch target is 44 by 44 pixels.
- Text contrast meets WCAG 2.1 AA.
- Motion does not convey information that is absent from the static state.
- English remains the default while Simplified Chinese stays available.

## 12. Performance Budget

- Dynamically loaded Three.js chunk rather than adding it to the initial application bundle.
- One active WebGL canvas at a time.
- Pixel ratio cap of `1.5`, reduced to `1` on constrained mobile devices.
- No post-processing pipeline in the first implementation.
- No large GLTF dependency; the aircraft uses lightweight geometry.
- Target 55-60 FPS on desktop and at least 30 FPS on the tested mobile viewport.
- Avoid React state updates in the render loop.

## 13. Verification

### Unit and Component Tests

- Static fallback renders before Three.js loads.
- Reduced motion avoids WebGL initialization.
- Scene controller updates progress deterministically.
- Resize and visibility lifecycle behavior works.
- Unmount disposes every resource and listener.
- Semantic route labels remain present.

### Browser Tests

- Canvas contains nonblank, varied pixels on desktop and mobile.
- Camera/route pixels change after scroll.
- The canvas is correctly framed and does not overlap controls.
- No horizontal overflow at representative desktop and phone sizes.
- WebGL failure preserves a usable page.
- Reduced motion produces no pinned or continuous scene.
- Navigation away from the page stops animation and removes the canvas.
- Console contains no WebGL, GSAP selector, or resource errors.

### Regression Gates

- `npm test`
- `npm run build`
- `npm run test:e2e`
- Visual screenshot review at desktop and mobile sizes
- Impeccable design detector once after the final UI edit set

## 14. Non-Goals

- No globe.
- No 3D operational navigation.
- No replacement of Leaflet with Three.js.
- No simulated live route, fare, provider, or validation claims.
- No smooth-scroll library that overrides native browser scrolling.
- No redesign of backend architecture as part of this visual phase.

## 15. Completion Criteria

The visual phase is complete when:

1. Three.js is used in a visible, purposeful, verified journey scene.
2. GSAP drives scene and interface progression with correct cleanup.
3. Landing, planner, comparison, and workspace share one coherent visual language.
4. The experience feels bright, modern, and travel-specific on desktop and mobile.
5. Reduced-motion and WebGL fallback paths remain fully usable.
6. Existing functional tests continue to pass.
7. Browser screenshots and pixel checks prove the 3D scene is nonblank, correctly framed, and responsive.
