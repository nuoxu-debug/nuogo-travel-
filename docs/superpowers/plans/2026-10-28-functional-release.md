# Nuogo functional release implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement and verify each task.

**Goal:** Verify and repair the complete Nuogo journey and prepare/publish a functional GitHub Pages deployment backed by the existing API architecture.

**Architecture:** Keep GitHub Pages, Render Express API, and Supabase. Run isolated automated tests, then real configured AI verification. Publish only reviewed source with no credentials or test snapshots.

**Tech Stack:** React, Vite, Express, Node.js, Vitest, Playwright, PostgreSQL/Supabase, OpenRouter.

**Spec:** `docs/superpowers/specs/2026-10-28-functional-release-design.md`

## Global constraints

Preserve existing application edits and local user data. Never commit `.env`, credentials, browser traces containing credentials, or runtime snapshots. No database schema changes without inspecting the intended production connection and migrations. The user confirmed that visitors may browse and generate, with login required to save.

## Review focus

- A static UI must not silently send auth/generation requests to the Pages origin.
- Browser tests must not overwrite `.data/demo-state.json`.
- A successful login must persist beyond browser and API restarts.
- Real generation must return a validated itinerary, not merely HTTP 200 or mocked content.
- Direct Pages routes and mobile access must use the repository basename.

## Task 1: Isolate and repair existing browser checks

- [ ] Give every Playwright run an explicit temporary persistence snapshot and clean it afterward.
- [ ] Replace the stale guest-account button test with the current anonymous browse flow.
- [ ] Make regeneration wait for a new trip ID and successful request before deletion.
- [ ] Run desktop/mobile browser tests and fix demonstrated failures.

## Task 2: Verify the real configured local journey

- [ ] Register a clearly identified temporary QA user through the UI, logout, login, and refresh.
- [ ] Generate a real Singapore itinerary using synthetic preferences, verify validation and visible activities, save and reopen it.
- [ ] Confirm account/trip persistence after API restart; remove only the QA account afterward.
- [ ] Record exact failures and repair their root causes with focused regression tests.

## Task 3: Repair GitHub deployment wiring

- [ ] Restore and update CI without the missing lint command.
- [ ] Restore Pages deployment with a required HTTPS `VITE_API_URL`, correct basename, and SPA fallback.
- [ ] Verify Render runtime settings and document required database/provider secrets and existing migration order.
- [ ] Build under the Pages basename and verify the production bundle targets the configured API.

## Task 4: Apply clarified guest permissions

- [ ] Record the user's chosen visitor scope.
- [ ] Update only the routes/UI needed for that scope, keeping persistence and ownership protected.
- [ ] Verify anonymous entry, planning permission, and the save/login boundary.

## Task 5: Review, sync, and verify publicly

- [ ] Run applicable unit, integration, browser, and build checks; request independent review.
- [ ] Inspect the staged application changes for credentials and unrelated deletions.
- [ ] Use authorized GitHub access to sync the source and deployment files.
- [ ] Verify public registration, login, visitor access, and real generation against the actual hosted API.
- [ ] Publish an acceptance report distinguishing passed checks from any external access/deployment blockers.
