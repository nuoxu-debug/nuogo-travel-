# Nuogo Kinetic Travel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a polished, animated, responsive Nuogo frontend using the scenic-wayfinding design direction without changing existing backend contracts.

**Architecture:** Extend the existing Tailwind and global CSS foundation, add three focused motion primitives, and apply them page-by-page. Existing data fetching, routing, form submission, trip selection, and workspace editing flows remain unchanged.

**Tech Stack:** React 18, React Router, Tailwind CSS 3, anime.js 3, Leaflet 1.9, Vitest, Testing Library, Vite.

## Global Constraints

- English remains the default and Simplified Chinese remains available.
- Preserve all current API contracts and generated-trip data structures.
- Use anime.js for authored motion and respect `prefers-reduced-motion`.
- Keep core controls at least 44px tall and keyboard accessible.
- Use the supplied Nuogo logo and real destination imagery.
- Do not add fabricated testimonials, statistics, or source claims.

---

### Task 1: Shared Wayfinding Foundation

**Files:**
- Modify: `client/tailwind.config.js`
- Modify: `client/src/styles/index.css`
- Create: `client/src/components/ScrollProgress.jsx`
- Create: `client/src/components/SectionReveal.jsx`
- Create: `client/src/components/RouteRail.jsx`
- Test: `client/src/__tests__/motion-components.test.jsx`

**Interfaces:**
- `ScrollProgress()` renders an accessible decorative progress line.
- `SectionReveal({ children, className, delay })` reveals content once.
- `RouteRail({ stops, tone, compact })` renders an ordered animated route.

- [ ] Write tests asserting the progress line, ordered route stops, and reveal content render.
- [ ] Run `npm run test -w @nuogo/client -- motion-components.test.jsx` and confirm the new tests fail.
- [ ] Implement the three components and shared design tokens.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Application Shell And Landing

**Files:**
- Modify: `client/src/layout/AppShell.jsx`
- Modify: `client/src/pages/LandingPage.jsx`
- Modify: `client/src/components/BrandLogo.jsx`
- Test: `client/src/__tests__/auth-language.test.jsx`

**Interfaces:**
- `AppShell` retains `dark` and `hideFooter`.
- Existing navigation paths and language actions remain unchanged.

- [ ] Add a failing assertion for the Nuogo route specimen and page progress indicator.
- [ ] Run the focused client test and confirm failure.
- [ ] Redesign header, mobile menu, footer, hero, strategy, workflow, and destination bands.
- [ ] Run the focused test and confirm pass.

### Task 3: Planner And Generation Experience

**Files:**
- Modify: `client/src/pages/PlannerPage.jsx`
- Modify: `client/src/components/PreferenceForm.jsx`
- Modify: `client/src/components/PipelineOverlay.jsx`
- Test: `client/src/__tests__/planner.test.jsx`

**Interfaces:**
- `PreferenceForm({ onSubmit, busy })` submits the existing preference payload.
- `PipelineOverlay` retains the current pipeline timing contract.

- [ ] Add assertions for the staged travel brief and three-plan generation action.
- [ ] Run the planner test and confirm failure.
- [ ] Apply staged layout, ticket metadata, improved controls, animation, and corrected visible copy.
- [ ] Run the planner test and confirm pass.

### Task 4: Comparison Strategy System

**Files:**
- Modify: `client/src/pages/ComparePage.jsx`
- Modify: `client/src/components/PlanComparison.jsx`
- Test: `client/src/__tests__/comparison.test.jsx`

**Interfaces:**
- `PlanComparison({ variants, onChoose, choosing })` retains the existing callback contract.

- [ ] Add assertions that all three strategy labels and choose actions remain visible.
- [ ] Run the comparison test and confirm failure only for new presentation semantics.
- [ ] Implement distinct strategy colours, budget visualization, route previews, and snap comparison.
- [ ] Run the comparison test and confirm pass.

### Task 5: Workspace, Archive, And Authentication

**Files:**
- Modify: `client/src/pages/TripWorkspacePage.jsx`
- Modify: `client/src/pages/ArchivePage.jsx`
- Modify: `client/src/pages/LoginPage.jsx`
- Modify: `client/src/pages/RegisterPage.jsx`
- Modify: `client/src/components/ActivityCard.jsx`
- Modify: `client/src/components/BudgetPanel.jsx`
- Modify: `client/src/components/GuidePanel.jsx`

**Interfaces:**
- Preserve all existing page routes, API requests, drag/edit callbacks, budget regeneration, and guide comparison.

- [ ] Run existing workspace, archive, and authentication tests as a baseline.
- [ ] Apply the shared command-strip, dense panel, image, and form styling.
- [ ] Re-run the affected tests and fix any behavioural regression.

### Task 6: Verification And Visual Audit

**Files:**
- Modify only files required by verified defects.
- Create: `artifacts/nuogo-redesign-desktop.png`
- Create: `artifacts/nuogo-redesign-mobile.png`
- Create: `artifacts/nuogo-redesign-workspace.png`

**Interfaces:**
- No new production interfaces.

- [ ] Run `npm test` and confirm every workspace passes.
- [ ] Run `npm run build -w @nuogo/client` and confirm Vite production build succeeds.
- [ ] Run the Impeccable detector and resolve relevant findings.
- [ ] Capture desktop, mobile, and workspace screenshots using the local running app.
- [ ] Inspect screenshots for overlap, wrapping, map rendering, image loading, and contrast.
- [ ] Keep the frontend and API servers running for user review.
