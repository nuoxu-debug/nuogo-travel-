# Task 8 Report: Provenance, Repair Records, and Safe Persistence

## Completed

- Persisted objective trip runs, legs, provenance, validation issues, and repair records together in repository transactions.
- Added structured provenance for user inputs, OpenTripMap facts, database-backed cost references, AI rationale, and deterministic estimates.
- Recorded repair attempts, issue codes, repair actions, and final state.
- Rejected incomplete OpenTripMap provenance and provider provenance nested beneath generic itinerary entries.
- Displayed separate OpenTripMap provider facts, AI rationale, deterministic estimates, and database-backed cost-reference labels without real-time or current-verification claims.

## Verification

- `npm.cmd --workspace server run test -- --run tests/repository-contract.test.js tests/objective-generation.test.js tests/repair-loop.test.js` - 81 tests passed.
- `npm.cmd --workspace client run test -- --run tests/objective-workspace.test.jsx` - 12 tests passed.
- `npm.cmd test` - shared, server, and client workspace suites passed.
- `git diff --check` passed.

## Scope Notes

- No migration change was needed: the itinerary provenance and repair tables already exist in the preserved migration history.
- No current-verification status is generated or displayed for these persisted records.

## Fix Round 1: Evidence Boundaries

- Rejected `CURRENTLY_VERIFIED` persistence until a direct-evidence workflow exists.
- Required canonical OpenTripMap xid card URLs, full ISO timestamps, supported cities, strict source enums, valid xids, and exact activity/source-record equality.
- Rejected unmapped OpenTripMap provenance and generic entries containing POI or provider facts; the workspace now badges only xid-grounded OpenTripMap activities.
- Required every repair record to carry at least one nonblank issue code.

### Verification

- `npm.cmd --workspace server run test -- --run tests/repository-contract.test.js tests/poi-pipeline.test.js tests/objective-generation.test.js tests/repair-loop.test.js` - 103 tests passed.
- `npm.cmd --workspace client run test -- --run tests/objective-workspace.test.jsx` - 13 tests passed.
- `npm.cmd test` - 19 shared, 319 server, and 148 client tests passed.
- `git diff --check` passed.

## Fix Round 2: Unique Canonical Attraction Evidence

- Required exactly one OpenTripMap source record in each grounded attraction payload and exact equality with its persisted provenance record.
- Required `retrievedAt` to be a calendar-valid canonical UTC ISO instant, rejecting normalized impossible dates.
- Selected workspace provider facts by the activity xid rather than source-record order.

### Verification

- `npm.cmd --workspace server run test -- --run tests/repository-contract.test.js` - 67 tests passed.
- `npm.cmd --workspace client run test -- --run tests/objective-workspace.test.jsx` - 14 tests passed.
- `npm.cmd test` - 19 shared, 321 server, and 149 client tests passed.
- `git diff --check` passed.
