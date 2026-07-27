# Task 1 Report: Shared Collaboration and Expense Contracts

## Implementation

- Added `tripMemberRoles`, `invitationStatuses`, and `expenseCategories` to `shared/constants.js`.
- Added strict Zod contracts to `shared/schemas.js` for memberships, invitations, expense input/output, summaries, and revisions.
- Added the four required collaboration and expense contract tests to `shared/contracts.test.js`.
- Preserved the existing bilingual itinerary contracts and fixtures.

## RED

The exact brief command was attempted first:

```powershell
$env:PATH="$PWD\.tools\node;$env:PATH"
.\.tools\node\npm.cmd run test:shared
```

It could not start because `.tools\\node\\npm.cmd` is not present inside this worktree:

```text
The term '.\\.tools\\node\\npm.cmd' is not recognized...
EXIT_CODE=1
```

Using the provisioned repository runtime from the parent workspace, the shared tests then ran and failed for the expected reason before implementation:

```powershell
$env:PATH="C:\Users\G16\OneDrive\桌面\FYP\.tools\node;$env:PATH"
npm run test:shared
```

```text
contracts.test.js (8 tests | 3 failed)
3 failed because tripMemberSchema, expenseInputSchema, and expenseSummarySchema were undefined.
5 legacy tests passed.
EXIT_CODE=1
```

## GREEN

```powershell
$env:PATH="C:\Users\G16\OneDrive\桌面\FYP\.tools\node;$env:PATH"
npm run test:shared
```

```text
contracts.test.js (8 tests) 8ms
Test Files 1 passed (1)
Tests 8 passed (8)
EXIT_CODE=0
```

The same GREEN command was rerun as the final verification. `git diff --check` also completed without whitespace errors.

## Files Changed

- `shared/constants.js`
- `shared/schemas.js`
- `shared/contracts.test.js`
- `.superpowers/sdd/2026-07-27-trip-collaboration-expense-splitting/task-1-report.md`

## Self-Review

- All requested public constants and schemas are exported.
- Input money uses integer fen with the requested positive and maximum bounds.
- Expense participants require at least one member, cap at 50, and reject duplicates.
- Revision input is a nonnegative integer and all new object contracts are strict.
- Participant allocations expose `{ userId, name, shareFen }`; summaries expose integer-fen balances and settlements.
- Existing itinerary contract tests remain green.

## Concerns

The task brief's exact `.tools\\node\\npm.cmd` command cannot run from this worktree because the runtime is provisioned only at the repository root. The equivalent `npm run test:shared` command passed using that root runtime. Git also reports normal Windows LF-to-CRLF conversion warnings when touching the three JavaScript files; no diff-check whitespace errors were found.
