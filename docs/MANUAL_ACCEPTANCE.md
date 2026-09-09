# Nuogo Manual Acceptance

Use this checklist before the FYP presentation.

## Entry And Language

- [ ] The landing hero and journey map load without horizontal overflow.
- [ ] Chinese is selected on a first visit.
- [ ] English/Chinese switching is readable and persists after refresh.
- [ ] Registration, logout, login, guest access, and invalid credentials behave correctly.
- [ ] Reduced-motion mode presents complete content without required animation.

## Planning

- [ ] The planner offers only Singapore.
- [ ] Origin, dates/times, travellers, hard budget, interests, stay, food, and transport inputs are available.
- [ ] Consent text states that preferences can be sent to the configured AI provider.
- [ ] The traveller selects one Travel Style before generation.
- [ ] Generation opens one itinerary workspace directly with no comparison or post-generation variant selection.
- [ ] Budget-Saving, Balanced, and Comfort-Focused can each be generated independently and remain under the hard budget.
- [ ] When enabled and grounded data permits, rainy-day backups are shown as inactive optional contingencies and do not replace main activities automatically.
- [ ] An unsatisfied request shows a safe actionable error rather than a broken page.

## Itinerary Workspace

- [ ] Each day contains a continuous start, ordered legs/activities, and end.
- [ ] Daily activities contain no duplicate grounded POI.
- [ ] Day transitions form a reasonable connected itinerary.
- [ ] The compact Leaflet map renders markers and route lines.
- [ ] Budget shows eight categories, total, remaining, and per-person values.
- [ ] Activity details separate OpenTripMap facts, AI rationale, and system estimates.
- [ ] Editing revalidates the itinerary; preference changes can regenerate a linked trip.
- [ ] Rename, archive/list, duplicate, and delete workflows behave correctly.

## Profile And Privacy

- [ ] Profile name and preferred language can be saved.
- [ ] Registered password change verifies the current password.
- [ ] Privacy settings explain the LLM boundary.
- [ ] Cross-user trip access is denied.
- [ ] Account deletion removes the session and owned data.

## Administration

- [ ] A server-confirmed administrator can open `/admin`.
- [ ] Ordinary users are redirected away from `/admin`.
- [ ] Destination lifecycle controls persist.
- [ ] POI records are destination-scoped.
- [ ] Cost-reference evidence can be updated or retired.
- [ ] A revised active cost reference appears in subsequent generation provenance.

## Quality

- [ ] Desktop `1440 x 900` has no overlap, clipping, or blank map/canvas.
- [ ] Mobile `412 x 915` remains readable and horizontally safe.
- [ ] Keyboard focus is visible and icon buttons have accessible names.
- [ ] Browser console contains no unhandled errors in the critical journey.
- [ ] `npm.cmd test`, lint, build, and Playwright results match the final audit.

## External Evidence

- [ ] OpenRouter opt-in test passes with the selected current model.
- [ ] OpenTripMap opt-in test passes and returns source-labelled attraction data.
- [ ] Migrations apply to a disposable MySQL `*_integration` database.

Leave these external boxes unchecked unless the matching test was actually run.
