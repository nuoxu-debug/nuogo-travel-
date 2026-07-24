# Attraction Media Hydration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show rich, image-led Huangshan itinerary activities immediately from approved source URLs, hydrate those images into a protected local cache, and fix the light-header language selector.

**Architecture:** Grounded activities receive a stable `/api/attractions/:id/image` URL and catalogue-owned visit details. The public image endpoint redirects to the approved remote image on a cache miss while a bounded background hydrator stores it locally; later requests serve the cached file. The frontend renders fixed-format image cards and a richer selected-attraction panel, while grounding prevents AI output from replacing catalogue media.

**Tech Stack:** React 18, Tailwind CSS, Anime.js, Express, Zod, sql.js/SQLite, MySQL, Vitest, Testing Library, Supertest

## Global Constraints

- Accept image origins only from approved attraction records and approved Mafengwo image hosts.
- Accept only JPEG, PNG, and WebP content up to 8 MiB.
- Store hydrated files under `server/storage/attractions/` using server-generated filenames.
- Preserve source attribution and never fail itinerary generation because an image is unavailable.
- Keep English as the default language and maintain English/Simplified Chinese content.
- Respect reduced-motion preferences and keep image dimensions stable at desktop and mobile widths.
- Git commit steps are omitted because Git is unavailable in this workspace.

---

### Task 1: Catalogue Media And Rich Details

**Files:**
- Create: `server/src/data/huangshanAttractions.js`
- Modify: `server/src/services/attractionCatalogue.js`
- Modify: `server/src/ingestion/sqliteRepository.js`
- Test: `server/tests/attraction-catalogue.test.js`
- Test: `server/tests/ingestion-repository.test.js`

**Interfaces:**
- Produces: `getHuangshanDetails(nameZh)` returning `{ descriptionZh, descriptionEn, visitDetails }`.
- Produces: `AttractionSqliteRepository.findApprovedImage(attractionId)`.
- Produces: `AttractionSqliteRepository.setImageLocalPath(imageId, localPath)`.
- Produces: approved catalogue records with `thumbnailUrl`, `imageAttribution`, and `visitDetails`.

- [ ] **Step 1: Write failing catalogue and repository tests**

Add assertions that an approved Hongcun record exposes a bilingual description,
an image attribution, visit duration, popularity counts, and an approved image
lookup. Add a test that persists and retrieves `local_path`.

- [ ] **Step 2: Verify the tests fail for missing rich details and repository methods**

Run:

```powershell
.\.tools\node\node.exe .\node_modules\vitest\vitest.mjs run server/tests/attraction-catalogue.test.js server/tests/ingestion-repository.test.js
```

Expected: failures naming `visitDetails`, `findApprovedImage`, or
`setImageLocalPath`.

- [ ] **Step 3: Add the curated Huangshan detail registry**

Define all eight approved Chinese attraction names with bilingual descriptions,
suggested duration, best visit period, opening guidance, ticket guidance, and
two practical highlights. Catalogue mapping merges these values with current
review, travel-note, and image counts.

- [ ] **Step 4: Add approved image repository operations**

`findApprovedImage` must join `attraction_images` to active, approved
`attractions`; `setImageLocalPath` must update only the selected image record
and persist the SQLite database.

- [ ] **Step 5: Run the focused tests**

Run the command from Step 2. Expected: all focused tests pass.

### Task 2: Protected URL-First Image Hydration

**Files:**
- Create: `server/src/services/attractionMedia.js`
- Create: `server/src/routes/attractionMedia.js`
- Modify: `server/src/app.js`
- Modify: `server/src/index.js`
- Modify: `server/src/config.js`
- Test: `server/tests/attraction-media.test.js`
- Test: `server/tests/api.test.js`

**Interfaces:**
- Consumes: `findApprovedImage(attractionId)` and
  `setImageLocalPath(imageId, localPath)`.
- Produces: `AttractionMediaService.getMedia(attractionId)` returning
  `{ state: "cached", path, contentType }` or
  `{ state: "remote", sourceUrl }`.
- Produces: `GET /api/attractions/:attractionId/image`.

- [ ] **Step 1: Write failing hydrator security and route tests**

Cover cache hits, a cache miss that returns the approved remote URL and starts
one hydration, JPEG persistence, unsupported host rejection, invalid MIME
rejection, an oversized stream rejection, and a missing attraction `404`.

- [ ] **Step 2: Verify the tests fail because the service and route do not exist**

Run:

```powershell
.\.tools\node\node.exe .\node_modules\vitest\vitest.mjs run server/tests/attraction-media.test.js server/tests/api.test.js
```

Expected: module-not-found or route `404` failures.

- [ ] **Step 3: Implement the bounded media service**

Use injected `fetchImpl` for tests, `AbortSignal.timeout(10000)`, an 8 MiB
limit, a fixed MIME-to-extension map, `randomUUID()` filenames, and a `Map` of
in-flight hydration promises. Validate the repository URL hostname before
fetching and resolve cached paths beneath the configured storage root.

- [ ] **Step 4: Implement and wire the public media route**

On a cache hit call `res.type(contentType).sendFile(path)`. On a cache miss,
start hydration without blocking the response and redirect with `302` to the
approved source URL. Return `404` for unknown or unapproved attraction IDs.

- [ ] **Step 5: Run the focused tests**

Run the command from Step 2. Expected: all focused tests pass with no unhandled
promise rejection.

### Task 3: Grounded Activity Media Contract

**Files:**
- Modify: `shared/schemas.js`
- Modify: `server/src/providers/demoProvider.js`
- Modify: `server/src/services/promptBuilder.js`
- Modify: `server/src/services/grounding.js`
- Modify: `server/src/routes/activities.js`
- Modify: `server/tests/helpers.js`
- Test: `shared/contracts.test.js`
- Test: `server/tests/generator.test.js`
- Test: `server/tests/services.test.js`

**Interfaces:**
- Consumes: catalogue `visitDetails` and attraction ID.
- Produces: optional activity fields `imageUrl`, `imageAttribution`, and
  `visitDetails`.
- `imageUrl` must match `/api/attractions/<opaque-id>/image`.

- [ ] **Step 1: Write failing schema, generation, and grounding tests**

Assert the shared schema accepts the exact rich-detail structure, demo
generation emits stable image URLs, and grounding replaces malicious
model-supplied media/details with approved catalogue values. Assert custom
activity name edits clear all grounded media and detail fields.

- [ ] **Step 2: Verify the tests fail on unknown strict-schema fields**

Run:

```powershell
.\.tools\node\node.exe .\node_modules\vitest\vitest.mjs run shared/contracts.test.js server/tests/generator.test.js server/tests/services.test.js
```

Expected: strict Zod validation rejects `imageUrl` or assertions receive
`undefined`.

- [ ] **Step 3: Extend the shared activity schema**

Add a strict visit-details schema with bilingual duration, best time, opening
guidance, ticket guidance, integer popularity counts, and bilingual highlight
arrays. Add optional `imageUrl`, `imageAttribution`, and `visitDetails`.

- [ ] **Step 4: Thread catalogue media through both provider paths**

The demo provider copies catalogue fields. The OpenRouter prompt includes only
the detail data needed for writing but grounding always constructs final media
and visit details from the approved record. Non-Huangshan grounding strips the
new attribution fields as it does existing source fields.

- [ ] **Step 5: Preserve or clear provenance correctly during edits**

Cost-only edits retain grounded media. Name changes and cheaper custom
alternatives clear image, attribution, visit details, and source provenance.

- [ ] **Step 6: Run the focused tests**

Run the command from Step 2. Expected: all focused tests pass.

### Task 4: MySQL Activity Persistence

**Files:**
- Create: `database/migrations/004_activity_media_details.sql`
- Modify: `server/src/repositories/mysql.js`
- Test: `server/tests/repository-contract.test.js`
- Test: `server/tests/schema.test.js`

**Interfaces:**
- Consumes: activity `imageUrl`, `imageAttribution`, and `visitDetails`.
- Produces: round-trip mappings for `image_url`,
  `image_attribution`, and `visit_details_json`.

- [ ] **Step 1: Write failing migration and adapter tests**

Assert migration 004 defines all three columns and the MySQL insert/load/update
mappings serialize and parse the structured visit details.

- [ ] **Step 2: Verify focused failures**

Run:

```powershell
.\.tools\node\node.exe .\node_modules\vitest\vitest.mjs run server/tests/repository-contract.test.js server/tests/schema.test.js
```

Expected: migration or SQL mapping assertions fail.

- [ ] **Step 3: Add migration and repository mappings**

Use `VARCHAR(500)` for the stable relative image URL,
`VARCHAR(255)` for attribution, and `JSON` for visit details. Keep all fields
nullable for legacy and non-grounded activities.

- [ ] **Step 4: Run focused tests**

Run the command from Step 2. Expected: all focused tests pass.

### Task 5: Image-Led Workspace

**Files:**
- Create: `client/src/components/AttractionImage.jsx`
- Modify: `client/src/components/ActivityCard.jsx`
- Modify: `client/src/components/GuidePanel.jsx`
- Modify: `client/src/components/ActivityModal.jsx`
- Modify: `client/tests/fixtures.js`
- Test: `client/tests/workspace.test.jsx`

**Interfaces:**
- Consumes: optional `imageUrl`, `imageAttribution`, and `visitDetails`.
- Produces: `AttractionImage({ activity, className, eager })` with stable
  fallback and image-error handling.

- [ ] **Step 1: Write failing workspace rendering tests**

Assert a grounded activity renders its image with a bilingual alt value,
`loading="lazy"`, rich visit facts, popularity, image attribution, and the
existing source link. Trigger an image error and assert the branded fallback
appears.

- [ ] **Step 2: Verify tests fail because no images or facts render**

Run:

```powershell
.\.tools\node\node.exe .\node_modules\vitest\vitest.mjs run client/tests/workspace.test.jsx
```

Expected: image and rich-detail queries fail.

- [ ] **Step 3: Implement the reusable attraction image**

Render a fixed-aspect image with `object-cover`, `referrerPolicy="no-referrer"`,
localized alt text, and an in-place fallback containing a `MapPin` icon.

- [ ] **Step 4: Redesign activity cards and selected details**

Add a stable thumbnail column to cards. Add a 4:3 selected image, compact visit
facts, popularity metrics, highlights, and attribution above the existing guide
tips. Use `useAnime` to animate the image and facts when `activity.id` changes.

- [ ] **Step 5: Keep media visible but non-editable in the activity modal**

Show the attraction thumbnail and attribution in grounded activity editors;
continue editing only user-owned activity fields.

- [ ] **Step 6: Run focused client tests**

Run the command from Step 2. Expected: all workspace tests pass.

### Task 6: Light And Dark Language Selector

**Files:**
- Modify: `client/src/components/LanguageToggle.jsx`
- Modify: `client/src/layout/AppShell.jsx`
- Test: `client/tests/auth-language.test.jsx`

**Interfaces:**
- Produces: `LanguageToggle({ tone = "light" })`, where `tone` is `light` or
  `dark`.

- [ ] **Step 1: Write the failing contrast regression test**

Render a light authenticated shell and assert the inactive language button has
ink text rather than `text-white`. Render the dark landing shell and assert the
dark variant retains white inactive text.

- [ ] **Step 2: Verify the regression test fails**

Run:

```powershell
.\.tools\node\node.exe .\node_modules\vitest\vitest.mjs run client/tests/auth-language.test.jsx
```

Expected: the light-shell inactive button still contains `text-white`.

- [ ] **Step 3: Implement tone-aware segmented styles**

Use an ink border and jade active segment for `light`; use a translucent white
border and white active segment for `dark`. Pass `dark ? "dark" : "light"` from
the desktop shell and `light` in the white mobile menu.

- [ ] **Step 4: Run focused language tests**

Run the command from Step 2. Expected: all language tests pass.

### Task 7: Full Verification And Live Visual Check

**Files:**
- Modify: `README.md`
- Modify: `docs/MANUAL_ACCEPTANCE.md`

**Interfaces:**
- Documents: cache directory behavior, attribution, and Huangshan test steps.

- [ ] **Step 1: Document media hydration and test instructions**

Explain that the first request may redirect to the approved source while Nuogo
caches the image, and that later requests serve the local copy.

- [ ] **Step 2: Run the complete automated suite**

Run:

```powershell
& .\.tools\node\npm.cmd test
```

Expected: shared, server, and client suites all pass with zero failures.

- [ ] **Step 3: Run the production build**

Run:

```powershell
& .\.tools\node\npm.cmd run build
```

Expected: shared checks, server syntax build, and Vite production build exit
with code 0.

- [ ] **Step 4: Exercise a live Huangshan itinerary**

Register, generate a two-day Shanghai-to-Huangshan trip, choose a plan, request
an attraction image twice, and confirm the second request is served locally.

- [ ] **Step 5: Capture desktop and mobile screenshots**

Verify the image cards, rich selected-attraction panel, map, budget panel, and
language selector do not overlap at 1440 x 900 and 390 x 844.

