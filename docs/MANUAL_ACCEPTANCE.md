# Nuogo Manual Acceptance

Use this checklist before the final-year project presentation.

## Core Flow

- [ ] Landing page identifies Nuogo in the first viewport and all images load.
- [ ] English is selected on first visit.
- [ ] Switching to Chinese translates the UI and persists after refresh.
- [ ] Registration, logout, login, and invalid-field feedback work.
- [ ] Planner offers supported mainland-China cities only and contains no open chat field.
- [ ] Daily budget reacts to duration and total budget changes.
- [ ] Conflicting preferences display a useful warning.
- [ ] Generation displays all six animated stages.
- [ ] Budget, food, and leisure variants all appear in comparison.
- [ ] Selecting a variant opens its editable workspace.

## Workspace

- [ ] Day tabs update timeline, guide, budget, and route together.
- [ ] Timeline cards can be added, edited, deleted, and dragged into a new order.
- [ ] One activity and one full day can be regenerated independently.
- [ ] A cheaper alternative lowers the displayed budget.
- [ ] Selecting a map marker highlights and scrolls to the matching activity.
- [ ] Cultural, food, crowd, and visit advice follows the selected activity.

## Collaboration and Archive

- [ ] View-only links hide mutation controls.
- [ ] Edit links allow authenticated voting and prevent duplicate user votes.
- [ ] Favorites can be added, listed, dragged, and removed.
- [ ] Archive filters draft, upcoming, and completed trips.
- [ ] Duplicate and reuse-preference actions preserve the original trip.

## Quality

- [ ] Desktop `1440 x 900` has no overlap, clipped controls, or blank route surface.
- [ ] Mobile `390 x 844` keeps readable controls and horizontally safe content.
- [ ] Keyboard focus is visible and icon buttons have accessible names/tooltips.
- [ ] Reduced-motion mode reveals all content without nonessential movement.
- [ ] Browser console and API terminal contain no unhandled errors.
- [ ] `npm test` and `npm run build` both pass.

## Live Adapter Checks

- [ ] OpenRouter key remains server-side and generates schema-valid China plans.
- [ ] MySQL migration applies cleanly and data survives an API restart.
- [ ] Amap key is domain-restricted and markers align with timeline activities.

## Anhui Ingestion

- [ ] Huangshan ingestion completes without visiting a disallowed robots path.
- [ ] The local SQLite database contains attributed pending records.
- [ ] Imported records contain POI IDs, names, counts, source URLs, and remote thumbnails.
- [ ] `attractions:review` changes only the explicitly selected Huangshan records.
- [ ] The planner offers `Huangshan, Anhui` and `安徽黄山`.
- [ ] Huangshan generation returns three non-fallback variants.
- [ ] Every Huangshan activity references an active, approved local attraction.
- [ ] Editing a grounded activity displays its Mafengwo attribution link.
- [ ] Grounded activity cards show attraction images without resizing while loading.
- [ ] The first approved image request redirects to its recorded source and hydrates one bounded local copy.
- [ ] A later request serves the hydrated image from `server/storage/attractions/`.
- [ ] Invalid image hosts, non-image content, and files above 8 MiB are rejected.
- [ ] The selected attraction displays bilingual visit timing, ticket guidance, highlights, and popularity.
- [ ] Image load failures show the Nuogo fallback without breaking the itinerary.
- [ ] The language selector is readable on white workspace headers and dark landing headers.
- [ ] A second normal run uses the cache and creates no duplicate attractions.
- [ ] Disabled Anhui expansion regions reject ingestion until an approved source is configured.
- [ ] No user diary body, user review body, authenticated content, or full-resolution image library is stored.
