# Nuogo Living Atlas 3D Implementation Plan

> **For agentic workers:** Execute this plan task by task. Keep each change reviewable, run the named test after each task, and do not claim completion before the final verification task passes.

**Goal:** Add a bright, purposeful Three.js journey scene and a coherent GSAP-led visual system across Nuogo's landing, planner, comparison, and trip workspace without changing the application's existing functional contracts.

**Architecture:** React keeps ownership of content and accessibility. A dynamically imported, framework-independent Three.js controller owns one decorative WebGL canvas and exposes a small imperative API. GSAP ScrollTrigger converts scroll into normalized progress and sends that progress to the controller. The existing SVG journey composition remains the complete fallback, while Leaflet remains the only operational map in the trip workspace.

**Tech Stack:** React 18, Vite 5, Three.js, GSAP 3 with ScrollTrigger, Vitest, Testing Library, Playwright, existing CSS design tokens.

**Global Constraints:** Preserve English as the default and Simplified Chinese as an option. Keep city labels generic on the landing page. Do not add React Three Fiber, post-processing, GLTF assets, a globe, a smooth-scroll dependency, or a second 3D map in the workspace. Cap renderer DPR at 1.5, initialize only in view, pause when hidden, dispose all resources, and keep a usable static path for reduced motion or WebGL failure.

---

## Task 1: Add Three.js and Capability Boundaries

**Files:**
- Modify: `client/package.json`
- Modify: `package-lock.json`
- Create: `client/src/three/capabilities.js`
- Create: `client/src/hooks/useReducedMotion.js`
- Create: `client/src/hooks/useVisibility.js`
- Test: `client/tests/living-atlas-capabilities.test.jsx`

### Step 1: Write failing capability tests

Cover these public contracts:

```js
canUseWebGL(canvasFactory) // boolean without throwing
getRendererPixelRatio(devicePixelRatio, compactViewport) // <= 1.5, mobile <= 1
useReducedMotion() // responds to matchMedia changes
useVisibility(ref) // reports IntersectionObserver visibility and document visibility
```

The tests must prove unavailable contexts return `false`, renderer DPR is bounded, media-query listeners are cleaned up, and visibility observers disconnect on unmount.

### Step 2: Run the focused test and confirm it fails

Run: `npm test --workspace client -- --run tests/living-atlas-capabilities.test.jsx`

Expected: FAIL because the modules do not exist.

### Step 3: Install and implement the minimum boundary

Run: `npm install three --workspace client`

Implement browser-safe helpers. Re-export or migrate the current reduced-motion behavior from `client/src/hooks/useAnime.js` without breaking existing imports. `useVisibility` must use `IntersectionObserver` when present and fall back to visible when absent.

### Step 4: Run focused and existing motion tests

Run:

```powershell
npm test --workspace client -- --run tests/living-atlas-capabilities.test.jsx tests/motion-components.test.jsx
```

Expected: PASS.

### Step 5: Commit

```powershell
git add client/package.json package-lock.json client/src/three/capabilities.js client/src/hooks/useReducedMotion.js client/src/hooks/useVisibility.js client/tests/living-atlas-capabilities.test.jsx
git commit -m "feat(ui): add living atlas capability boundaries"
```

## Task 2: Build the Framework-Independent Scene Controller

**Files:**
- Create: `client/src/three/journeyPath.js`
- Create: `client/src/three/createLivingAtlas.js`
- Test: `client/tests/living-atlas-controller.test.js`

### Step 1: Write failing route and lifecycle tests

Define and test:

```js
DEFAULT_JOURNEY_POINTS
normalizeJourneyPoints(points)
sampleJourneyPath(curve, progress)
createLivingAtlas(container, { points, textureUrl, onReady, onFailure })
```

The returned controller must expose:

```js
{
  canvas,
  setProgress(progress),
  resize(),
  pause(),
  resume(),
  dispose(),
  getDebugState()
}
```

Tests must prove progress clamps to `0..1`, the aircraft position follows route progress, route draw count grows monotonically, resize ignores zero-size containers, pause/resume controls frames, and repeated `dispose()` removes canvas/listeners and disposes geometry, materials, textures, and renderer once.

### Step 2: Run the focused test and confirm it fails

Run: `npm test --workspace client -- --run tests/living-atlas-controller.test.js`

Expected: FAIL because the scene modules do not exist.

### Step 3: Implement the Three.js scene

Build one scene with:

- `WebGLRenderer({ antialias: true, alpha: true })` and a DPR from `getRendererPixelRatio`.
- A `PlaneGeometry` with restrained deterministic vertex elevation.
- The daylight map texture, with a pale procedural material fallback on load failure.
- A sampled `CatmullRomCurve3` route in coral using `BufferGeometry.setDrawRange`.
- Four lightweight waypoint groups and one geometric aircraft group.
- Ambient and directional daylight plus shallow fog.
- Camera interpolation keyed by normalized progress.
- `ResizeObserver`, `visibilitychange`, context loss, animation-frame, and pointer-offset cleanup.

Do not update React state from the frame loop. Keep `createLivingAtlas` independent of API, auth, budget, and persistence modules.

### Step 4: Run focused tests and build

Run:

```powershell
npm test --workspace client -- --run tests/living-atlas-controller.test.js
npm run build --workspace client
```

Expected: PASS, with Three.js emitted as a lazy chunk rather than merged into the initial application chunk.

### Step 5: Commit

```powershell
git add client/src/three client/tests/living-atlas-controller.test.js
git commit -m "feat(ui): build living atlas three scene"
```

## Task 3: Add the React Scene Shell and Semantic Fallback

**Files:**
- Create: `client/src/components/JourneySceneFallback.jsx`
- Create: `client/src/components/JourneyProgressRail.jsx`
- Create: `client/src/components/LivingAtlasScene.jsx`
- Test: `client/tests/living-atlas-scene.test.jsx`

### Step 1: Write failing component tests

Prove that:

- `Departure`, `Stop 01`, `Stop 02`, and `Stop 03` are semantic text.
- The static map renders before the dynamic import resolves.
- Reduced motion never initializes Three.js and shows a completed route.
- WebGL failure retains the fallback and reports no page-level exception.
- Successful initialization adds one `canvas[aria-hidden="true"]` and marks the scene ready.
- Progress updates the semantic percentage without making the canvas focusable.
- Unmount disposes the scene controller.

### Step 2: Run the focused test and confirm it fails

Run: `npm test --workspace client -- --run tests/living-atlas-scene.test.jsx`

Expected: FAIL because the components do not exist.

### Step 3: Implement progressive enhancement

`LivingAtlasScene` must:

- Render `JourneySceneFallback` immediately.
- Use `useReducedMotion` and `useVisibility`.
- Dynamically import `../three/createLivingAtlas.js` only when visible and motion is allowed.
- Fade the canvas in only after `onReady`.
- Call `pause`, `resume`, `resize`, and `dispose` through the controller.
- Accept `progress`, `points`, and generic `stops` props.
- Keep errors local and expose a stable `data-scene-state` value for browser tests.

### Step 4: Run focused tests

Run: `npm test --workspace client -- --run tests/living-atlas-scene.test.jsx`

Expected: PASS.

### Step 5: Commit

```powershell
git add client/src/components/JourneySceneFallback.jsx client/src/components/JourneyProgressRail.jsx client/src/components/LivingAtlasScene.jsx client/tests/living-atlas-scene.test.jsx
git commit -m "feat(ui): add accessible living atlas shell"
```

## Task 4: Integrate the 3D Journey Chapter on the Landing Page

**Files:**
- Modify: `client/src/components/ScrollJourneyMap.jsx`
- Modify: `client/src/pages/LandingPage.jsx`
- Modify: `client/src/styles/index.css`
- Modify: `DESIGN.md`
- Modify: `client/tests/landing-flight-atlas.test.jsx`
- Modify: `tests/e2e/landing-flight-atlas.spec.js`

### Step 1: Update tests for the new contract

Add assertions that the journey chapter contains the Living Atlas shell, keeps generic labels, exposes scroll progress, has one visual canvas maximum, and retains the static fallback. Keep existing hero, no-overflow, and strategy tests.

### Step 2: Run the landing tests and confirm the new assertions fail

Run: `npm test --workspace client -- --run tests/landing-flight-atlas.test.jsx`

Expected: FAIL before integration.

### Step 3: Replace only the map visual layer

Keep `ScrollJourneyMap` as the scroll owner. Replace its inline map image/SVG visual layer with `LivingAtlasScene` while preserving its semantic heading and progress. Let ScrollTrigger update a ref-backed imperative scene progress value; throttle semantic percentage updates so React does not rerender every frame.

Update landing styles so the scene is full-bleed and unframed, bright at every breakpoint, and never overlaps the heading, progress rail, header, or strategy section. Keep the generated daylight map as the fallback texture and keep all landing labels generic.

### Step 4: Run component tests and inspect the build

Run:

```powershell
npm test --workspace client -- --run tests/landing-flight-atlas.test.jsx tests/living-atlas-scene.test.jsx
npm run build --workspace client
```

Expected: PASS. Confirm the initial entry chunk does not statically contain the Three.js module.

### Step 5: Commit

```powershell
git add client/src/components/ScrollJourneyMap.jsx client/src/pages/LandingPage.jsx client/src/styles/index.css DESIGN.md client/tests/landing-flight-atlas.test.jsx tests/e2e/landing-flight-atlas.spec.js
git commit -m "feat(ui): integrate 3d living journey chapter"
```

## Task 5: Refine the Planner as a Whole-Trip Brief

**Files:**
- Create: `client/src/components/PlannerJourneyHorizon.jsx`
- Modify: `client/src/pages/PlannerPage.jsx`
- Modify: `client/src/components/PreferenceForm.jsx`
- Modify: `client/src/styles/index.css`
- Modify: `client/tests/planner.test.jsx`

### Step 1: Write failing planner behavior tests

Assert the planner presents one coherent brief, displays a semantic completion horizon for origin, destination, dates, travellers, interests, and budget, preserves all existing fields and validation, and keeps generation keyboard accessible. Test English and Simplified Chinese labels.

### Step 2: Run the focused test and confirm failure

Run: `npm test --workspace client -- --run tests/planner.test.jsx`

Expected: FAIL for the new horizon and copy assertions.

### Step 3: Implement the planner refinement

Add a compact, non-WebGL `PlannerJourneyHorizon` above the form. Derive its state only from existing preference values. Use GSAP for short section-completion and generation transitions through `useGsapContext`; do not pin the form or obscure validation. Tighten spacing and responsive tracks so the page scans as one trip brief rather than stacked unrelated panels.

### Step 4: Run planner and language tests

Run:

```powershell
npm test --workspace client -- --run tests/planner.test.jsx tests/auth-language.test.jsx
```

Expected: PASS.

### Step 5: Commit

```powershell
git add client/src/components/PlannerJourneyHorizon.jsx client/src/pages/PlannerPage.jsx client/src/components/PreferenceForm.jsx client/src/styles/index.css client/tests/planner.test.jsx
git commit -m "feat(ui): refine planner journey brief"
```

## Task 6: Redesign Three-Plan Comparison Around Shared Constraints

**Files:**
- Create: `client/src/components/ComparisonRouteRail.jsx`
- Modify: `client/src/pages/ComparePage.jsx`
- Modify: `client/src/components/PlanComparison.jsx`
- Modify: `client/src/styles/index.css`
- Modify: `client/tests/planner.test.jsx`

### Step 1: Write failing comparison tests

Prove all three itinerary profiles remain visible and selectable, each has distinct content, the same total-budget constraint is visible, shared cost categories align, source and validation states remain readable, and keyboard selection updates focus without removing alternatives.

### Step 2: Run the focused test and confirm failure

Run: `npm test --workspace client -- --run tests/planner.test.jsx`

Expected: FAIL for the new shared route/allocation rail.

### Step 3: Implement comparison choreography

Add `ComparisonRouteRail` above the existing plans. Keep identical information architecture for `BUDGET_SAVING`, `BALANCED`, and `COMFORT_FOCUSED`. Use GSAP to shift emphasis and allocation markers on selection, but keep costs, budget status, source labels, and select actions statically available. Avoid horizontal overflow and nested cards.

### Step 4: Run comparison tests

Run: `npm test --workspace client -- --run tests/planner.test.jsx tests/motion-components.test.jsx`

Expected: PASS.

### Step 5: Commit

```powershell
git add client/src/components/ComparisonRouteRail.jsx client/src/pages/ComparePage.jsx client/src/components/PlanComparison.jsx client/src/styles/index.css client/tests/planner.test.jsx
git commit -m "feat(ui): align three-plan comparison"
```

## Task 7: Refine Workspace Route Continuity and Budget Motion

**Files:**
- Modify: `client/src/pages/TripWorkspacePage.jsx`
- Modify: `client/src/components/Timeline.jsx`
- Modify: `client/src/components/BudgetPanel.jsx`
- Modify: `client/src/components/LeafletRouteMap.jsx`
- Modify: `client/src/styles/index.css`
- Modify: `client/tests/workspace.test.jsx`
- Modify: `client/tests/workspace-mutations.test.jsx`

### Step 1: Write failing workspace interaction tests

Assert clicking a timeline activity selects the matching operational map stop, route-leg progression is announced, budget deltas animate without replacing text, activity details remain available, and daily controls stay compact at desktop and mobile sizes.

### Step 2: Run focused tests and confirm failure

Run:

```powershell
npm test --workspace client -- --run tests/workspace.test.jsx tests/workspace-mutations.test.jsx
```

Expected: FAIL for the new synchronized state and route-leg indicator.

### Step 3: Implement restrained operational motion

Keep Leaflet/OpenStreetMap intact. Add selected-stop state through existing page/component props, a compact route-leg progress label, short timeline focus transitions, and a numeric budget delta transition. Preserve edit, delete, regenerate, collaboration, expense, meal, hotel, ticket, and activity-detail flows. Do not add a second decorative map.

### Step 4: Run workspace regression tests

Run:

```powershell
npm test --workspace client -- --run tests/workspace.test.jsx tests/workspace-mutations.test.jsx tests/route-map.test.jsx tests/group-expenses.test.jsx
```

Expected: PASS.

### Step 5: Commit

```powershell
git add client/src/pages/TripWorkspacePage.jsx client/src/components/Timeline.jsx client/src/components/BudgetPanel.jsx client/src/components/LeafletRouteMap.jsx client/src/styles/index.css client/tests/workspace.test.jsx client/tests/workspace-mutations.test.jsx
git commit -m "feat(ui): connect workspace route progression"
```

## Task 8: Unify Auth, Archive, Shared Views, and Language Coverage

**Files:**
- Modify: `client/src/pages/LoginPage.jsx`
- Modify: `client/src/pages/RegisterPage.jsx`
- Modify: `client/src/pages/ArchivePage.jsx`
- Modify: `client/src/pages/SharedTripPage.jsx`
- Modify: `client/src/pages/InvitationPage.jsx`
- Modify: `client/src/layout/AppShell.jsx`
- Modify: `client/src/i18n/translations.js`
- Modify: `client/src/styles/index.css`
- Modify: `client/tests/auth-language.test.jsx`
- Modify: `client/tests/collaboration-archive.test.jsx`
- Modify: `client/tests/invitation.test.jsx`

### Step 1: Add failing consistency and localization tests

Require English default labels with complete Simplified Chinese equivalents for new visual-system copy. Verify auth, archive, invitation, and shared-trip pages expose meaningful loading, empty, error, and success states without depending on motion.

### Step 2: Run focused tests and confirm failure

Run:

```powershell
npm test --workspace client -- --run tests/auth-language.test.jsx tests/collaboration-archive.test.jsx tests/invitation.test.jsx
```

Expected: FAIL for missing translations or state styling hooks.

### Step 3: Apply the shared visual language

Use the established daylight palette, type hierarchy, route marks, button treatment, and short page entrances. Keep task-focused screens compact and avoid Three.js. Correct any visible mixed-language strings discovered by the tests.

### Step 4: Run focused tests

Run the command from Step 2.

Expected: PASS.

### Step 5: Commit

```powershell
git add client/src/pages/LoginPage.jsx client/src/pages/RegisterPage.jsx client/src/pages/ArchivePage.jsx client/src/pages/SharedTripPage.jsx client/src/pages/InvitationPage.jsx client/src/layout/AppShell.jsx client/src/i18n/translations.js client/src/styles/index.css client/tests/auth-language.test.jsx client/tests/collaboration-archive.test.jsx client/tests/invitation.test.jsx
git commit -m "feat(ui): unify supporting product surfaces"
```

## Task 9: Browser, Pixel, Accessibility, and Regression Verification

**Files:**
- Modify: `tests/e2e/landing-flight-atlas.spec.js`
- Modify: `playwright.config.js` only if a deterministic reduced-motion project is needed
- Modify: `DESIGN.md`
- Modify: `docs/superpowers/plans/2026-08-14-nuogo-objective-aligned-mvp.md`

### Step 1: Complete browser coverage

Add Playwright checks for:

- Nonblank and varied WebGL pixels on desktop and mobile.
- Pixel changes after journey scroll proves the route/camera advances.
- Correct scene bounds and no overlap with header, text, controls, or following content.
- No horizontal overflow on desktop and phone.
- DPR cap from the renderer debug state.
- Reduced-motion fallback with no active continuous renderer or pin.
- Forced WebGL failure preserving the static scene.
- Navigation away removing the canvas and animation lifecycle.
- No console errors from WebGL, Three.js, GSAP, Leaflet, or resource loading.

Save desktop and mobile screenshots to `.artifacts/` and inspect them visually. For canvas pixels, sample WebGL `readPixels` or a renderer-provided debug sample rather than trusting canvas dimensions alone.

### Step 2: Run the visual test and correct only verified failures

Run: `npm run test:e2e`

Expected: PASS on configured desktop and mobile projects.

### Step 3: Run the final design detector once

Run the Impeccable detector specified by the installed skill against the final edited frontend. Resolve relevant hierarchy, contrast, overflow, motion, and accessibility findings. Record any consciously accepted warning in `DESIGN.md`.

### Step 4: Run all regression gates

Run:

```powershell
npm test
npm run build
npm run test:e2e
git diff --check
```

Expected: all commands PASS. Record exact test counts, generated bundle sizes, and any warnings. Confirm the Three.js chunk remains lazy and note the existing Vite size warning if it still applies.

### Step 5: Update documentation and the broader MVP plan

Document the final component boundaries, fallback behavior, screenshots, and verification evidence in `DESIGN.md`. Mark only the completed visual tasks in the broader objective-aligned plan; leave provider, validation, budget engine, and audit work pending until separately implemented and proven.

### Step 6: Commit the verified visual phase

```powershell
git add tests/e2e/landing-flight-atlas.spec.js playwright.config.js DESIGN.md docs/superpowers/plans/2026-08-14-nuogo-objective-aligned-mvp.md
git commit -m "test(ui): verify living atlas experience"
```

## Task 10: Resume the Objective-Aligned MVP Plan

After the visual phase is verified, return to `docs/superpowers/plans/2026-08-14-nuogo-objective-aligned-mvp.md` at Task 4. Implement provider adapters, validation and repair, deterministic budget enforcement, OpenRouter prompt boundaries, three distinct itinerary generation, role-based administration, and objective coverage in their existing order. Do not mark the overall FYP implementation complete until those tasks and their tests pass.
