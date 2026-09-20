# Task 9 Report: Account and Privacy Lifecycle

## Status

Complete. Commit: `feat: complete account and privacy lifecycle`.

The preserved backend, migration, tests, and retention documentation were kept
intact. This resume completed the remaining frontend route, bilingual profile
surface, client-side validation, private-cache cleanup, and expiry handoff.

## Frontend Completion

- Added authenticated `/profile` navigation and `ProfilePage` for profile
  updates, registered-password changes, guest lifecycle clarity, and
  reauthenticated account deletion.
- Kept Simplified Chinese as the application default and added complete English
  and Chinese profile translations.
- Made `clearAuthToken` remove the token plus private `nuogo-trip-*` and
  `nuogo-reused-preferences` entries before dispatching the auth-state event;
  locale storage and unrelated session values remain untouched.
- Preserved cleanup for every API `401`; `AUTH_TOKEN_EXPIRED` additionally
  redirects to `/login?reason=session-expired` with a fixed safe state and the
  localized sign-in alert. Login does not redirect away from that route, so the
  handoff cannot loop.
- Profile forms validate locally, retain entered values after request errors,
  and disable duplicate submissions while requests are in progress. Loading,
  retry, error, and live success states are exposed semantically.

## Test Evidence

### Red

The handoff recorded six failing profile/expiry assertions and one passing
assertion before this frontend work. The first resume command using `npm` was
blocked by the PowerShell execution policy; `npm.cmd` was used for every test
command thereafter. The first focused resume run reproduced missing private
cache cleanup. A later full-suite run exposed the existing requirement that
all `401` responses clear private workspace state; restoring that shared
behavior was verified by its focused regression test.

### Green

- `npm.cmd --workspace client run test -- tests/profile-page.test.jsx tests/api-client.test.jsx tests/auth-language.test.jsx tests/collaboration-security.test.jsx`: 23 tests passed.
- `npm.cmd --workspace server run test -- tests/profile-api.test.js tests/profile-repository.test.js tests/security-objectives.test.js tests/migrations.test.js tests/repository-contract.test.js`: 91 tests passed.
- `npm.cmd test`: shared 19/19, server 332/332, client 154/154 passed.
- `npm.cmd run build`: passed. Vite retained its existing chunk-size warning:
  the main client bundle is 754.15 kB minified (244.02 kB gzip).
- `npm.cmd run lint`: passed with six pre-existing React Hook dependency
  warnings outside Task 9 and no errors.
- `node C:\Users\G16\OneDrive\桌面\FYP\.agents\skills\impeccable\scripts\detect.mjs --json <changed client sources>`: `[]`.
- `git diff --check`: passed; Git reports only normal Windows LF-to-CRLF
  working-copy notices.

## Deletion Matrix

| Data category | Result on authenticated account deletion |
| --- | --- |
| Account profile, email, password hash, role, timestamps | Hard-deleted; no tombstone retained. |
| Privacy consent | Deleted. |
| Owned trips and dependent itinerary data | Deleted, including preferences, variants, days, activities, runs, legs, provenance, validation, repairs, and public shares. |
| Favorites and votes made by the account | Deleted. |
| Attributable memberships and invitations | Deleted; unrelated records remain. |
| Shared-trip expenses and attributable activity history | Deleted when paid, created, split, membership-targeted, or attributable to the account; unrelated records remain. |
| Other users' trips | Preserved. |
| Destination, POI, route-cache, and cost-reference records | Preserved because they are not account-linked. |
| Client private cache | Token, cached private trips, and reused preferences are removed; locale and unrelated session values remain. |

## Limitations

- No external backup, replica, binlog, proxy, hosting, or disaster-recovery
  deletion behavior is implemented or claimed.
- Account deletion cannot retract data already sent to an external LLM; provider
  retention terms require deployment-time verification.
- No statutory retention period is encoded. Deployment owners need applicable
  legal and institutional guidance before establishing retention exceptions.

## Fix Round 1: Profile and Session Security

### Status

Complete. This follow-up hardens the original lifecycle implementation without
discarding its backend, tests, or retention documentation.

### Security Changes

- `AUTH_TOKEN_EXPIRED` now clears every `nuogo-*` private local/session value
  atomically while retaining only `nuogo-language` and
  `nuogo-language-default`. Auth bootstrap applies the same cleanup whenever
  no token exists. Protected route boundaries unmount profile, archive,
  comparison, and trip screens and redirect expiry to the localized,
  non-looping `/login?reason=session-expired` handoff.
- Trip persistence rechecks the token at write time, preventing an in-flight
  private-workspace update from recreating cache after a background `401`.
- Password admission is capped at 72 UTF-8 bytes at registration, login,
  current-password, change-password, and deletion boundaries. The tests cover
  multibyte bcrypt truncation-collision attempts.
- Historical migration rows retain the conservative `REGISTERED` default; the
  `guest+...@nuogo.local` namespace is reserved from registration and guest
  classification is assigned only by explicit guest creation.
- JWT verification is isolated from repository lookup. Expired/invalid JWTs
  return `401`; lookup faults reach the safe server-error path and do not clear
  a valid client credential.
- Profile fields now provide bilingual, field-specific errors, invalid-state
  semantics, described alerts, sensible autocomplete values, and first-invalid
  focus. Current-password failures use the correct password-specific copy.

### Fix-Round Deletion Matrix

| Event | Local storage | Session storage | Route result |
| --- | --- | --- | --- |
| Token expiry | Remove all private `nuogo-*`; retain only safe locale keys | Remove all `nuogo-*` private state | Protected screens unmount and login shows localized expiry reason. |
| Generic authentication loss | Remove all private `nuogo-*`; retain only safe locale keys | Remove all `nuogo-*` private state | Protected screens unmount and require login. |
| No-token bootstrap | Remove stale private `nuogo-*`; retain only safe locale keys | Remove stale private `nuogo-*` state | Private routes never hydrate their cached workspace. |
| Account deletion | Same client cleanup after deletion response | Same client cleanup after deletion response | Login receives the account-deleted handoff. |

### Evidence

- Red-first focused tests reproduced stale cache cleanup, missing protected
  redirects, missing field descriptions, wrong current-password copy,
  migration guest classification, UTF-8 overflow, and repository-fault
  classification before the fixes.
- `npm.cmd --workspace client run test -- tests/auth-language.test.jsx tests/api-client.test.jsx tests/profile-page.test.jsx tests/collaboration-security.test.jsx`: 28 passed.
- `npm.cmd --workspace server run test -- tests/request-validation.test.js tests/profile-api.test.js tests/profile-repository.test.js tests/security-objectives.test.js tests/api.test.js`: 33 passed.
- `npm.cmd test`: shared 19/19, server 335/335, and client 159/159 passed.
- `npm.cmd run build`: passed. Vite emitted its existing chunk-size warning;
  the largest bundle is 756.80 kB minified (244.71 kB gzip).
- `npm.cmd run lint`: passed with 0 errors and six existing React Hook
  dependency warnings, including one pre-existing `TripContext` warning.
- `node C:\Users\G16\OneDrive\桌面\FYP\.agents\skills\impeccable\scripts\detect.mjs --json <changed client targets>`:
  `[]` (run once).

### Limitations

- MySQL transaction SQL and rollback behavior are asserted with a mocked
  connection. No live SQL execution is claimed because credentials were not
  supplied.
- This remains a client-storage cleanup boundary; it cannot revoke copies that
  users exported or data retained by external providers under their own terms.

## Fix Round 2: Expiry and Legacy Guest Lifecycle

### Status

Complete. This round makes expired-session navigation route-global, narrows the
historical guest migration to the verifiable legacy fingerprint, completes
keyboard focus recovery, and adds an opt-in live-MySQL deletion case.

### Changes

- `SessionExpiryRedirect` now observes the auth context above all routes. An
  `AUTH_TOKEN_EXPIRED` response during `/auth/me` bootstrap or any later API
  request clears private `nuogo-*` local/session state, resets auth-dependent
  UI, and replaces every non-login route, including public `/planner`, with
  `/login?reason=session-expired`. Login is excluded from the redirect, so the
  localized expiry notice cannot loop.
- Migration 012 leaves all historical rows `REGISTERED` unless both fields
  match the exact known legacy generator output: case-sensitive `Nuogo Guest`
  and a lowercase UUID-shaped `guest+...@nuogo.local` address. Registration
  continues to reserve the complete internal guest email namespace.
- Password-change and deletion forms focus the first invalid new-password,
  confirmation, or deletion-confirmation control. A server-side wrong current
  password returns focus to its matching password field after the async state
  update.
- The guarded MySQL integration suite now seeds a target account and unrelated
  account records, including trip cascade dependencies, shared membership,
  expenses, activity logs, consents, favorites, and votes. It asserts target
  removal and unrelated-record preservation after `deleteAccount`; existing
  repository unit tests continue to assert transaction ordering, parameters,
  commit, and rollback behavior.

### Deletion Matrix

| Event | Private state removed | Preserved state | Route/result |
| --- | --- | --- | --- |
| Expired bootstrap or later API request | Token, account/trip/preference `nuogo-*` local state, and all `nuogo-*` session state | Safe locale keys only; non-Nuogo session values | Any non-login route is replaced by the localized expiry login notice. |
| Target MySQL account deletion | User, owned trips and cascade dependencies, target memberships, invitations, attributable expenses/logs, consents, favorites, and votes | The unrelated user's account, trip, itinerary/share records, memberships, invitations, expenses/logs, consents, favorites, and votes | Transaction commits only when the complete deletion succeeds. |
| Ambiguous historical guest row | Nothing is destructively reclassified | Conservative `REGISTERED` account type | Only the exact legacy fingerprint becomes `GUEST`. |

### Evidence

- Red-first client regressions initially exposed four gaps: public planner
  bootstrap expiry did not redirect, and invalid new password, confirmation,
  and async current-password paths did not retain first-invalid focus. The
  resulting 12 profile component tests now pass, including keyboard and focus
  assertions and a one-bootstrap-request no-loop assertion.
- `npm.cmd --workspace client run test -- tests/profile-page.test.jsx tests/api-client.test.jsx tests/auth-language.test.jsx tests/collaboration-security.test.jsx`: 31 passed.
- `npm.cmd --workspace server run test -- tests/migrations.test.js tests/profile-api.test.js tests/profile-repository.test.js tests/security-objectives.test.js tests/api.test.js`: 37 passed.
- `npx.cmd vitest run tests/integration/mysql.integration.test.js`: 2 skipped.
  The suite printed its explicit opt-in requirements and did not execute live
  SQL without `MYSQL_INTEGRATION_ENABLED=true` plus the required credentials.
- `npm.cmd test`: shared 19/19, server 335/335, client 162/162 passed.
- `npm.cmd run build`: passed. Vite retained its existing chunk-size warning:
  the largest bundle is 757.63 kB minified (244.87 kB gzip).
- `npm.cmd run lint`: passed with 0 errors and six pre-existing React Hook
  dependency warnings.
- `node C:\\Users\\G16\\OneDrive\\桌面\\FYP\\.agents\\skills\\impeccable\\scripts\\detect.mjs --json client/src/App.jsx client/src/pages/ProfilePage.jsx`:
  `[]` (run once).

### Limitations

- Live MySQL execution is intentionally not claimed: the opt-in integration
  case was skipped because no credentials or enabling flag were supplied.
- The legacy database has no authoritative guest marker. Rows that resemble a
  guest but fail either exact fingerprint condition remain `REGISTERED`; this
  conservative ambiguity is unavoidable without external historical evidence.
