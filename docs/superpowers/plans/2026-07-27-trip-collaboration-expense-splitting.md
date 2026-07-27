# Trip Collaboration and Expense Splitting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authenticated trip membership, collaborative itinerary editing, and flexible equal-split group expenses to Nuogo without changing its established full-stack architecture.

**Architecture:** Extend the existing Express REST API and memory/MySQL repository contract with trip memberships, hashed invitation tokens, expense records, and activity logs. Reuse `TripContext` and the current trip workspace, adding a membership-aware authorization service, optimistic trip revisions, a collaboration drawer, an invitation acceptance page, and a planned-budget/group-expense tab set.

**Tech Stack:** React 18, React Router, Tailwind CSS, Anime.js, Lucide React, Express, Zod, JWT, Node.js crypto, MySQL, Vitest, Testing Library, Supertest

## Global Constraints

- Preserve React, Express, MySQL, SQL.js, memory/MySQL repository modes, public share links, and the frozen architecture baseline.
- Chinese remains the default interface language; every new visible string must have Chinese and English text.
- Equal splitting is the default and any active participant may be excluded before saving.
- Money is stored and calculated as integer fen; display converts fen to yuan.
- Server authorization is mandatory; hidden client controls are not authorization.
- Owners manage members and invitations; editors mutate itineraries and add expenses; viewers are read-only.
- Existing owner workflows and public `view`/`edit` share links must remain functional.
- Invitation tokens expire after seven days, are revocable, and are stored only as SHA-256 hashes.
- Do not add WebSockets, chat, custom percentages, receipt OCR, payment processing, or new dependencies.
- Use existing Lucide icons, Anime.js, Tailwind tokens, and the Nuogo Scenic Wayfinding design language.
- Before UI implementation, read and apply `impeccable`, `design-taste-frontend`, `redesign-existing-projects`, and `ui-ux-pro-max`.

---

## File Structure

### New Files

- `database/migrations/005_trip_collaboration_expenses.sql`: collaboration tables, trip revision, constraints, and indexes.
- `server/src/services/expenseSplit.js`: integer-fen allocation, balances, and settlement calculation.
- `server/src/services/tripAccess.js`: owner/member role lookup and reusable authorization errors.
- `server/src/services/invitationTokens.js`: random token creation and SHA-256 hashing.
- `server/src/routes/members.js`: invitation and member lifecycle endpoints.
- `server/src/routes/expenses.js`: group expense CRUD and summary endpoints.
- `client/src/pages/InvitationPage.jsx`: invitation preview, authentication continuation, acceptance, and decline.
- `client/src/components/MemberAvatars.jsx`: compact member waypoint group.
- `client/src/components/CollaborationDrawer.jsx`: members, invitations, roles, and activity feed.
- `client/src/components/ExpenseWorkspace.jsx`: planned/group expense tabs and group summaries.
- `client/src/components/ExpenseDialog.jsx`: add/edit expense form with participant selection.
- `client/src/components/SettlementList.jsx`: balances and suggested payments.
- `client/tests/invitation.test.jsx`: invitation routing and acceptance UI.
- `client/tests/group-expenses.test.jsx`: expense form, allocation preview, balances, and permissions.
- `server/tests/expense-split.test.js`: pure money calculation coverage.
- `server/tests/collaboration-api.test.js`: invitation, membership, role, revision, and expense API coverage.

### Modified Files

- `shared/constants.js`: collaboration roles, invitation states, and expense categories.
- `shared/schemas.js`: invitation, membership, expense, participant, and mutation revision schemas.
- `shared/contracts.test.js`: shared contract coverage.
- `database/seeds/001_demo.sql`: optional deterministic collaboration demo records.
- `server/src/repositories/memory.js`: in-memory members, invitations, expenses, logs, and revision behavior.
- `server/src/repositories/mysql.js`: MySQL implementations of the same repository methods.
- `server/tests/repository-contract.test.js`: adapter parity and representative MySQL query coverage.
- `server/tests/schema.test.js`: migration structure and security constraints.
- `server/src/routes/collaboration.js`: retain public sharing/voting while removing misleading edit semantics from membership.
- `server/src/routes/trips.js`: member-aware reads and owner-only destructive operations.
- `server/src/routes/activities.js`: editor-aware mutations, revision checks, and activity logging.
- `server/src/app.js`: mount member and expense routers.
- `server/tests/api.test.js`: preserve and update existing collaboration workflow expectations.
- `client/src/App.jsx`: invitation route.
- `client/src/context/AuthContext.jsx`: preserve intended route through login/register.
- `client/src/context/TripContext.jsx`: expose access metadata, members, revision conflict refresh, and lightweight polling.
- `client/src/pages/LoginPage.jsx`: return to invitation after login.
- `client/src/pages/RegisterPage.jsx`: return to invitation after registration.
- `client/src/pages/TripWorkspacePage.jsx`: member controls, role-derived editability, expense workspace, and revision requests.
- `client/src/components/ShareDialog.jsx`: distinguish public sharing from member invitations and repair bilingual copy.
- `client/src/components/BudgetPanel.jsx`: remain the planned-budget presentation inside `ExpenseWorkspace`.
- `client/src/i18n/translations.js`: all collaboration and expense strings.
- `client/src/styles/index.css`: drawer, sheet, allocation, and reduced-motion details only when Tailwind utilities are insufficient.
- `client/tests/fixtures.js`: members, access, revision, expenses, and summary fixtures.
- `client/tests/collaboration-archive.test.jsx`: preserve public link and voting coverage.
- `docs/API.md`: collaboration and expense endpoints.
- `CURRENT_ARCHITECTURE.md`: append the implemented feature to the frozen baseline without restructuring existing sections.
- `ARCHITECTURE_CHANGES.md`: record this feature as a post-baseline change.

---

### Task 1: Shared Collaboration and Expense Contracts

**Files:**
- Modify: `shared/constants.js`
- Modify: `shared/schemas.js`
- Modify: `shared/contracts.test.js`

**Interfaces:**
- Produces: `tripMemberRoles`, `invitationStatuses`, `expenseCategories`
- Produces: `tripMemberSchema`, `tripInvitationSchema`, `expenseInputSchema`, `tripExpenseSchema`, `expenseSummarySchema`, `tripRevisionSchema`
- Money fields: `amountFen`, `shareFen`, `paidFen`, `netFen`

- [ ] **Step 1: Write failing contract tests**

Add imports and tests that establish the exact public shapes:

```js
import {
  expenseInputSchema,
  expenseSummarySchema,
  tripInvitationSchema,
  tripMemberSchema,
  tripRevisionSchema
} from "./schemas.js";

it("validates an editor membership and a pending invitation", () => {
  expect(tripMemberSchema.parse({
    id: "member-1",
    tripId: "trip-1",
    userId: "user-2",
    name: "Li Wei",
    role: "editor",
    status: "active",
    joinedAt: "2026-07-27T10:00:00.000Z"
  }).role).toBe("editor");

  expect(tripInvitationSchema.parse({
    id: "invite-1",
    tripId: "trip-1",
    role: "viewer",
    status: "pending",
    expiresAt: "2026-08-03T10:00:00.000Z"
  }).status).toBe("pending");
});

it("accepts an equal expense with a participant exclusion", () => {
  const value = expenseInputSchema.parse({
    description: "Tunxi dinner",
    category: "food",
    amountFen: 30000,
    expenseDate: "2026-08-10",
    paidByUserId: "user-1",
    participantUserIds: ["user-1", "user-2", "user-3"],
    note: ""
  });
  expect(value.participantUserIds).not.toContain("user-4");
});

it("rejects empty expense participants and invalid revisions", () => {
  expect(() => expenseInputSchema.parse({
    description: "Taxi",
    category: "transportation",
    amountFen: 8000,
    expenseDate: "2026-08-10",
    paidByUserId: "user-1",
    participantUserIds: []
  })).toThrow();
  expect(() => tripRevisionSchema.parse({ expectedRevision: -1 })).toThrow();
});

it("validates a per-member balance summary", () => {
  const summary = expenseSummarySchema.parse({
    totalSpentFen: 30000,
    members: [{
      userId: "user-1",
      name: "Chen",
      paidFen: 30000,
      shareFen: 10000,
      netFen: 20000
    }],
    settlements: []
  });
  expect(summary.members[0].netFen).toBe(20000);
});
```

- [ ] **Step 2: Run shared tests and confirm failure**

Run:

```powershell
$env:PATH="$PWD\.tools\node;$env:PATH"
.\.tools\node\npm.cmd run test:shared
```

Expected: FAIL because the collaboration and expense exports do not exist.

- [ ] **Step 3: Add constants and strict Zod schemas**

Add:

```js
export const tripMemberRoles = ["owner", "editor", "viewer"];
export const invitationStatuses = ["pending", "accepted", "declined", "revoked", "expired"];
export const expenseCategories = [
  "accommodation",
  "transportation",
  "food",
  "attractions",
  "entertainment",
  "other"
];
```

Define strict schemas with these exact boundaries:

```js
export const tripRevisionSchema = z.object({
  expectedRevision: z.number().int().nonnegative()
}).strict();

export const expenseInputSchema = z.object({
  description: z.string().trim().min(1).max(120),
  category: z.enum(expenseCategories),
  amountFen: z.number().int().positive().max(5_000_000),
  expenseDate: z.string().date(),
  paidByUserId: z.string().min(1),
  participantUserIds: z.array(z.string().min(1)).min(1).max(50)
    .refine((ids) => new Set(ids).size === ids.length, "Participants must be unique."),
  note: z.string().trim().max(500).default("")
}).strict();
```

Define the output schemas with the field names exercised by the tests and `tripExpenseSchema.participants` containing `{ userId, name, shareFen }`.

- [ ] **Step 4: Run shared tests and confirm success**

Run:

```powershell
.\.tools\node\npm.cmd run test:shared
```

Expected: all shared tests PASS.

- [ ] **Step 5: Commit shared contracts**

```powershell
& 'C:\Program Files\Git\cmd\git.exe' add shared/constants.js shared/schemas.js shared/contracts.test.js
& 'C:\Program Files\Git\cmd\git.exe' commit -m 'feat: add collaboration and expense contracts'
```

---

### Task 2: Integer-Fen Expense Allocation and Settlement Service

**Files:**
- Create: `server/src/services/expenseSplit.js`
- Create: `server/tests/expense-split.test.js`

**Interfaces:**
- Produces: `splitEqually(amountFen, participantUserIds) -> Array<{ userId, shareFen }>`
- Produces: `summarizeExpenses(members, expenses) -> { totalSpentFen, members, settlements }`
- Settlement shape: `{ fromUserId, fromName, toUserId, toName, amountFen }`

- [ ] **Step 1: Write failing calculation tests**

```js
import { describe, expect, it } from "vitest";
import { splitEqually, summarizeExpenses } from "../src/services/expenseSplit.js";

describe("expense splitting", () => {
  it("splits integer fen deterministically and preserves the total", () => {
    expect(splitEqually(10000, ["user-c", "user-a", "user-b"])).toEqual([
      { userId: "user-a", shareFen: 3334 },
      { userId: "user-b", shareFen: 3333 },
      { userId: "user-c", shareFen: 3333 }
    ]);
  });

  it("excludes travellers who did not participate", () => {
    const allocations = splitEqually(30000, ["user-1", "user-2", "user-3"]);
    expect(allocations).toHaveLength(3);
    expect(allocations.some(({ userId }) => userId === "user-4")).toBe(false);
  });

  it("allows the payer to be outside the participant set", () => {
    const summary = summarizeExpenses(
      [
        { userId: "payer", name: "Chen" },
        { userId: "guest", name: "Li" }
      ],
      [{
        amountFen: 10000,
        paidByUserId: "payer",
        participants: [{ userId: "guest", shareFen: 10000 }]
      }]
    );
    expect(summary.members.find(({ userId }) => userId === "payer").netFen).toBe(10000);
    expect(summary.members.find(({ userId }) => userId === "guest").netFen).toBe(-10000);
  });

  it("creates a small deterministic settlement list", () => {
    const summary = summarizeExpenses(
      [
        { userId: "a", name: "A" },
        { userId: "b", name: "B" },
        { userId: "c", name: "C" }
      ],
      [{
        amountFen: 30000,
        paidByUserId: "a",
        participants: [
          { userId: "a", shareFen: 10000 },
          { userId: "b", shareFen: 10000 },
          { userId: "c", shareFen: 10000 }
        ]
      }]
    );
    expect(summary.settlements).toEqual([
      { fromUserId: "b", fromName: "B", toUserId: "a", toName: "A", amountFen: 10000 },
      { fromUserId: "c", fromName: "C", toUserId: "a", toName: "A", amountFen: 10000 }
    ]);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run:

```powershell
.\.tools\node\npm.cmd --workspace server test -- expense-split.test.js
```

Expected: FAIL because `expenseSplit.js` does not exist.

- [ ] **Step 3: Implement deterministic allocation and settlement**

Implement `splitEqually` by sorting unique user IDs, assigning `Math.floor(amountFen / count)`, and adding one fen to the first `amountFen % count` IDs.

Implement `summarizeExpenses` by:

1. Creating zeroed `{ paidFen, shareFen, netFen }` entries for every referenced member.
2. Adding each expense amount to its payer's `paidFen`.
3. Adding each stored participant share to `shareFen`.
4. Computing `netFen = paidFen - shareFen`.
5. Sorting debtors by most-negative balance and creditors by most-positive balance, then transferring `Math.min(-debtor.netFen, creditor.netFen)` until balanced.

Throw `RangeError` for non-positive integer amounts or empty participants.

- [ ] **Step 4: Run focused and server tests**

```powershell
.\.tools\node\npm.cmd --workspace server test -- expense-split.test.js
.\.tools\node\npm.cmd --workspace server test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit the money service**

```powershell
& 'C:\Program Files\Git\cmd\git.exe' add server/src/services/expenseSplit.js server/tests/expense-split.test.js
& 'C:\Program Files\Git\cmd\git.exe' commit -m 'feat: calculate shared trip balances'
```

---

### Task 3: Collaboration and Expense Database Migration

**Files:**
- Create: `database/migrations/005_trip_collaboration_expenses.sql`
- Modify: `server/tests/schema.test.js`

**Interfaces:**
- Produces tables: `trip_members`, `trip_invitations`, `trip_expenses`, `expense_participants`, `trip_activity_log`
- Adds: `trips.revision INT UNSIGNED NOT NULL DEFAULT 0`

- [ ] **Step 1: Add a failing schema test**

Add a migration URL and assertions:

```js
const collaborationMigrationUrl = new URL(
  "../../database/migrations/005_trip_collaboration_expenses.sql",
  import.meta.url
);

it("defines collaboration memberships, invitations, expenses, logs, and revisions", () => {
  const sql = readFileSync(collaborationMigrationUrl, "utf8");
  for (const table of [
    "trip_members",
    "trip_invitations",
    "trip_expenses",
    "expense_participants",
    "trip_activity_log"
  ]) {
    expect(sql).toMatch(new RegExp(`CREATE TABLE(?: IF NOT EXISTS)? ${table}`, "i"));
  }
  expect(sql).toMatch(/ADD COLUMN revision INT UNSIGNED NOT NULL DEFAULT 0/i);
  expect(sql).toMatch(/token_hash CHAR\(64\) NOT NULL/i);
  expect(sql).not.toMatch(/\btoken\s+VARCHAR/i);
  expect(sql).toMatch(/amount_fen INT UNSIGNED NOT NULL/i);
  expect(sql).toMatch(/share_fen INT UNSIGNED NOT NULL/i);
  expect(sql).toMatch(/UNIQUE KEY\s+\w+\s+\(trip_id,\s*user_id\)/i);
});
```

- [ ] **Step 2: Run the schema test and confirm failure**

```powershell
.\.tools\node\npm.cmd --workspace server test -- schema.test.js
```

Expected: FAIL because migration `005` does not exist.

- [ ] **Step 3: Write migration `005`**

Create the five tables from the approved design with:

- UUID `VARCHAR(36)` primary keys.
- Foreign keys to `trips` and `users`.
- `trip_members.role ENUM('owner','editor','viewer')`.
- `trip_members.status ENUM('active','removed')`.
- A unique `(trip_id, user_id)` key.
- `trip_invitations.token_hash CHAR(64)` with a unique key.
- Seven-day expiry stored in `expires_at`.
- Integer `amount_fen` and `share_fen`.
- Composite primary key `(expense_id, user_id)` for participants.
- `summary_json JSON NOT NULL` for activity logs.
- Indexes for trip/date list operations.
- `ALTER TABLE trips ADD COLUMN revision INT UNSIGNED NOT NULL DEFAULT 0`.
- An `INSERT ... SELECT` backfill that adds one active owner membership for each existing trip.

- [ ] **Step 4: Run schema and complete server tests**

```powershell
.\.tools\node\npm.cmd --workspace server test -- schema.test.js
.\.tools\node\npm.cmd --workspace server test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit the migration**

```powershell
& 'C:\Program Files\Git\cmd\git.exe' add database/migrations/005_trip_collaboration_expenses.sql server/tests/schema.test.js
& 'C:\Program Files\Git\cmd\git.exe' commit -m 'feat: add trip collaboration schema'
```

---

### Task 4: Invitation Tokens and Trip Access Policy

**Files:**
- Create: `server/src/services/invitationTokens.js`
- Create: `server/src/services/tripAccess.js`
- Modify: `server/tests/services.test.js`

**Interfaces:**
- Produces: `createInvitationToken() -> { token, tokenHash }`
- Produces: `hashInvitationToken(token) -> 64-character lowercase hex`
- Produces: `getTripAccess(repository, tripId, userId) -> { trip, member, role, canEdit, isOwner }`
- Produces: `requireTripRole(access, roles)`, throwing structured `403` errors

- [ ] **Step 1: Write failing service tests**

```js
import {
  createInvitationToken,
  hashInvitationToken
} from "../src/services/invitationTokens.js";
import { getTripAccess, requireTripRole } from "../src/services/tripAccess.js";

it("creates opaque invitation tokens and stable hashes", () => {
  const first = createInvitationToken();
  const second = createInvitationToken();
  expect(first.token).not.toBe(second.token);
  expect(first.tokenHash).toBe(hashInvitationToken(first.token));
  expect(first.tokenHash).toMatch(/^[a-f0-9]{64}$/);
});

it("maps owner and editor membership to trip access", async () => {
  const repository = {
    getTrip: async () => ({ id: "trip-1", ownerId: "owner-1" }),
    getMember: async () => ({ userId: "editor-1", role: "editor", status: "active" })
  };
  expect((await getTripAccess(repository, "trip-1", "owner-1")).isOwner).toBe(true);
  expect((await getTripAccess(repository, "trip-1", "editor-1")).canEdit).toBe(true);
});

it("rejects viewers from editor operations", () => {
  try {
    requireTripRole({ role: "viewer" }, ["owner", "editor"]);
    throw new Error("Expected requireTripRole to reject a viewer.");
  } catch (error) {
    expect(error).toMatchObject({ status: 403, code: "TRIP_EDITOR_REQUIRED" });
  }
});
```

- [ ] **Step 2: Run the focused service tests and confirm failure**

```powershell
.\.tools\node\npm.cmd --workspace server test -- services.test.js
```

Expected: FAIL because both service modules do not exist.

- [ ] **Step 3: Implement token and access helpers**

Use only Node.js standard library:

```js
import { createHash, randomBytes } from "node:crypto";

export function hashInvitationToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function createInvitationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashInvitationToken(token) };
}
```

`getTripAccess` returns `undefined` when the trip does not exist and returns no role for unrelated or removed users. Owner identity always resolves to `owner` even before owner membership backfill is observed.

`requireTripRole` returns the access object on success and throws:

- `TRIP_MEMBER_REQUIRED` for no active role.
- `TRIP_EDITOR_REQUIRED` when editor access is required.
- `TRIP_OWNER_REQUIRED` when owner access is required.

- [ ] **Step 4: Run focused and full server tests**

```powershell
.\.tools\node\npm.cmd --workspace server test -- services.test.js
.\.tools\node\npm.cmd --workspace server test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit access helpers**

```powershell
& 'C:\Program Files\Git\cmd\git.exe' add server/src/services/invitationTokens.js server/src/services/tripAccess.js server/tests/services.test.js
& 'C:\Program Files\Git\cmd\git.exe' commit -m 'feat: add secure trip access helpers'
```

---

### Task 5: Repository Membership, Invitation, Expense, and Log Contract

**Files:**
- Modify: `server/src/repositories/memory.js`
- Modify: `server/src/repositories/mysql.js`
- Modify: `server/tests/repository-contract.test.js`

**Interfaces:**
- Produces repository methods:
  - `getMember(tripId, userId)`
  - `listMembers(tripId)`
  - `createInvitation(input)`
  - `getInvitationByTokenHash(tokenHash)`
  - `listInvitations(tripId)`
  - `updateInvitation(invitationId, tripId, patch)`
  - `acceptInvitation(invitationId, userId)`
  - `updateMember(tripId, memberId, role)`
  - `removeMember(tripId, memberId)`
  - `listExpenses(tripId)`
  - `getExpense(tripId, expenseId)`
  - `createExpense(input, allocations)`
  - `updateExpense(expenseId, input, allocations)`
  - `deleteExpense(tripId, expenseId)`
  - `appendTripActivity(input)`
  - `listTripActivity(tripId, limit)`
  - `incrementTripRevision(tripId, expectedRevision)`
- `incrementTripRevision` returns the new revision or `undefined` on conflict.

- [ ] **Step 1: Expand the adapter contract test**

Append every method above to `requiredMethods`. Add MemoryRepository behavior tests:

```js
it("stores one accepted membership per user and trip", async () => {
  const repository = new MemoryRepository();
  const owner = await repository.createUser({
    name: "Owner",
    email: "owner@example.com",
    passwordHash: "hash"
  });
  const member = await repository.createUser({
    name: "Member",
    email: "member@example.com",
    passwordHash: "hash"
  });
  repository.trips.set("trip-1", {
    id: "trip-1",
    ownerId: owner.id,
    revision: 0,
    variants: []
  });
  const invitation = await repository.createInvitation({
    id: "invite-1",
    tripId: "trip-1",
    tokenHash: "a".repeat(64),
    role: "editor",
    status: "pending",
    invitedByUserId: owner.id,
    expiresAt: "2099-01-01T00:00:00.000Z"
  });
  await repository.acceptInvitation(invitation.id, member.id);
  await repository.acceptInvitation(invitation.id, member.id);
  expect((await repository.listMembers("trip-1"))
    .filter(({ userId }) => userId === member.id)).toHaveLength(1);
});

it("persists exact expense allocations", async () => {
  const repository = new MemoryRepository();
  repository.expenses = new Map();
  const expense = await repository.createExpense({
    id: "expense-1",
    tripId: "trip-1",
    description: "Dinner",
    category: "food",
    amountFen: 10000,
    expenseDate: "2026-08-10",
    paidByUserId: "user-1",
    createdByUserId: "user-1",
    note: ""
  }, [
    { userId: "user-1", shareFen: 5000 },
    { userId: "user-2", shareFen: 5000 }
  ]);
  expect(expense.participants.reduce((sum, item) => sum + item.shareFen, 0)).toBe(10000);
});
```

- [ ] **Step 2: Run repository tests and confirm failure**

```powershell
.\.tools\node\npm.cmd --workspace server test -- repository-contract.test.js
```

Expected: FAIL because the repository methods do not exist.

- [ ] **Step 3: Implement MemoryRepository behavior**

Add maps for members, invitations, expenses, and trip activity. Ensure `createTrip`:

- Sets `revision: 0`.
- Adds an active owner membership.

Use composite map keys `${tripId}:${userId}` for membership. `acceptInvitation` must return the existing active membership for repeat acceptance by the same user and reject consumption by a different user.

Store expense allocations as immutable participant records and return creator/payer/member names by joining the in-memory user map.

- [ ] **Step 4: Implement MySqlRepository behavior**

Use parameterized SQL only. Wrap these operations in transactions:

- Invitation acceptance plus membership upsert plus invitation status update.
- Expense create/update plus participant replacement.
- Revision increment with:

```sql
UPDATE trips
SET revision = revision + 1
WHERE id = ? AND revision = ?
```

Load member public identity using `users.name` and never return password hashes. Use `INSERT ... ON DUPLICATE KEY UPDATE` to reactivate an existing membership on valid invitation acceptance.

- [ ] **Step 5: Add representative MySQL query assertions**

Test that:

- Invitation lookup filters by `token_hash`.
- Expense creation stores `amount_fen`.
- Participant insertion stores each `share_fen`.
- Revision update includes both trip ID and expected revision.
- No SQL statement stores the plain invitation token.

- [ ] **Step 6: Run repository and complete server tests**

```powershell
.\.tools\node\npm.cmd --workspace server test -- repository-contract.test.js
.\.tools\node\npm.cmd --workspace server test
```

Expected: all tests PASS.

- [ ] **Step 7: Commit repository support**

```powershell
& 'C:\Program Files\Git\cmd\git.exe' add server/src/repositories/memory.js server/src/repositories/mysql.js server/tests/repository-contract.test.js
& 'C:\Program Files\Git\cmd\git.exe' commit -m 'feat: persist trip collaboration data'
```

---

### Task 6: Invitation and Member REST API

**Files:**
- Create: `server/src/routes/members.js`
- Modify: `server/src/app.js`
- Create: `server/tests/collaboration-api.test.js`

**Interfaces:**
- Owner endpoints:
  - `POST /api/trips/:tripId/invitations`
  - `GET /api/trips/:tripId/invitations`
  - `DELETE /api/trips/:tripId/invitations/:invitationId`
  - `PATCH /api/trips/:tripId/members/:memberId`
  - `DELETE /api/trips/:tripId/members/:memberId`
- Authenticated member endpoint: `GET /api/trips/:tripId/members`
- Authenticated member endpoint: `GET /api/trips/:tripId/activity-log`
- Invitation endpoints:
  - `GET /api/invitations/:token`
  - `POST /api/invitations/:token/accept`
  - `POST /api/invitations/:token/decline`

- [ ] **Step 1: Write failing invitation lifecycle tests**

Use two registered users and assert:

```js
it("lets an owner invite a signed-in editor and lists the new member", async () => {
  const created = await request(app)
    .post(`/api/trips/${tripId}/invitations`)
    .set(ownerAuth)
    .send({ role: "editor" })
    .expect(201);

  expect(created.body.url).toContain("/invite/");
  expect(created.body.invitation).not.toHaveProperty("tokenHash");

  await request(app)
    .post(`/api/invitations/${created.body.token}/accept`)
    .set(memberAuth)
    .expect(200);

  const members = await request(app)
    .get(`/api/trips/${tripId}/members`)
    .set(ownerAuth)
    .expect(200);
  expect(members.body.members).toEqual(expect.arrayContaining([
    expect.objectContaining({ userId: memberId, role: "editor", status: "active" })
  ]));
});
```

Add tests for:

- Viewer cannot create invitations.
- Owner can change editor to viewer.
- Owner can remove a member.
- Owner cannot remove or demote themselves.
- Expired and revoked invitations return their exact error codes.
- A consumed invitation cannot add a different account.
- Repeat acceptance by the same account is idempotent.
- An unrelated user cannot list members.
- Active members can read the latest 50 activity-log records and unrelated users cannot.

- [ ] **Step 2: Run collaboration API tests and confirm failure**

```powershell
.\.tools\node\npm.cmd --workspace server test -- collaboration-api.test.js
```

Expected: FAIL because the member router does not exist.

- [ ] **Step 3: Implement invitation endpoints**

Use:

```js
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const { token, tokenHash } = createInvitationToken();
```

Return the plain token only from invitation creation. Invitation inspection returns trip title, destination, dates, owner public name, role, status, and expiry but never `tokenHash`.

Call `getTripAccess` and `requireTripRole` for every trip-scoped endpoint. Revoke through `DELETE` by setting status to `revoked`; do not physically delete invitation records.

Keep `GET /invitations/:token` public so a signed-out invitee can preview the trip. Apply `authenticate` to acceptance and decline. Return `INVITATION_EXPIRED`, `INVITATION_REVOKED`, or `INVITATION_CONSUMED` from token inspection and mutation when the stored state disallows the action.

- [ ] **Step 4: Implement member management**

Owner-only role changes accept only `editor` or `viewer`. Removal sets `status: "removed"` and retains historical identity. `GET members` includes owner and all active members.

`GET /trips/:tripId/activity-log` permits active members and returns at most 50 newest-first records with actor public name, action, entity type, entity ID, summary, and timestamp.

Mount `createMembersRouter({ repository, authenticate, clientOrigin })` at `/api`.

- [ ] **Step 5: Run focused and complete server tests**

```powershell
.\.tools\node\npm.cmd --workspace server test -- collaboration-api.test.js
.\.tools\node\npm.cmd --workspace server test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit invitation and member APIs**

```powershell
& 'C:\Program Files\Git\cmd\git.exe' add server/src/routes/members.js server/src/app.js server/tests/collaboration-api.test.js
& 'C:\Program Files\Git\cmd\git.exe' commit -m 'feat: add trip invitation and member APIs'
```

---

### Task 7: Member-Aware Trip Editing and Revision Conflicts

**Files:**
- Modify: `server/src/routes/trips.js`
- Modify: `server/src/routes/activities.js`
- Modify: `server/src/repositories/memory.js`
- Modify: `server/src/repositories/mysql.js`
- Modify: `server/tests/collaboration-api.test.js`
- Modify: `server/tests/api.test.js`

**Interfaces:**
- Trip reads return `access: { role, canEdit, isOwner }`.
- Every itinerary mutation body includes `expectedRevision`.
- Successful mutation returns `revision`.
- Stale mutation returns HTTP `409` and `TRIP_VERSION_CONFLICT`.

- [ ] **Step 1: Write failing editor/viewer/revision tests**

Add API tests proving:

```js
const edited = await request(app)
  .patch(`/api/activities/${activityId}`)
  .set(editorAuth)
  .send({
    expectedRevision: 0,
    estimatedCost: 420
  })
  .expect(200);
expect(edited.body.revision).toBe(1);

await request(app)
  .patch(`/api/activities/${activityId}`)
  .set(viewerAuth)
  .send({ expectedRevision: 1, estimatedCost: 500 })
  .expect(403);

const conflict = await request(app)
  .patch(`/api/activities/${activityId}`)
  .set(ownerAuth)
  .send({ expectedRevision: 0, estimatedCost: 600 })
  .expect(409);
expect(conflict.body.error.code).toBe("TRIP_VERSION_CONFLICT");
```

Also test editor add/delete/reorder/regenerate, unrelated-user denial, viewer trip read, member trip list inclusion, editor cannot delete trip, and owner workflow compatibility.

- [ ] **Step 2: Run focused API tests and confirm failure**

```powershell
.\.tools\node\npm.cmd --workspace server test -- collaboration-api.test.js
```

Expected: FAIL because trip and activity routes remain owner-only.

- [ ] **Step 3: Expand trip read/list authorization**

- `GET /trips` returns owned trips and active member trips without duplicates.
- `GET /trips/:tripId` allows active members and returns `access`.
- Trip title/status update allows owner or editor.
- Trip deletion, duplication, and variant selection remain owner-only unless the existing product behavior explicitly requires editor variant selection; for this plan, selected variant changes are editor operations because they alter the shared itinerary choice.

- [ ] **Step 4: Expand activity mutation authorization**

Before mutation:

1. Locate trip context.
2. Resolve access with `getTripAccess`.
3. Require owner/editor.
4. Parse `expectedRevision`.
5. Atomically increment the trip revision.
6. Perform mutation.
7. Append an activity log entry using the authenticated actor.

If revision increment fails, throw:

```js
const error = new Error("This trip changed while you were editing. The latest version has been loaded.");
error.status = 409;
error.code = "TRIP_VERSION_CONFLICT";
throw error;
```

Mutation responses include the new `revision`. Repository activity mutation methods accept an already-authorized actor and must no longer independently require `trip.ownerId === actorId`.

- [ ] **Step 5: Make revision and mutation atomic in MySQL**

For each MySQL collaborative mutation, use one transaction for revision increment and data write. Roll back the revision when the write fails. MemoryRepository performs the same checks before mutating its in-memory graph.

- [ ] **Step 6: Run focused and full tests**

```powershell
.\.tools\node\npm.cmd --workspace server test -- collaboration-api.test.js
.\.tools\node\npm.cmd --workspace server test
.\.tools\node\npm.cmd test
```

Expected: shared, server, and client suites PASS.

- [ ] **Step 7: Commit collaborative editing authorization**

```powershell
& 'C:\Program Files\Git\cmd\git.exe' add server/src/routes/trips.js server/src/routes/activities.js server/src/repositories/memory.js server/src/repositories/mysql.js server/tests/collaboration-api.test.js server/tests/api.test.js
& 'C:\Program Files\Git\cmd\git.exe' commit -m 'feat: authorize collaborative trip editing'
```

---

### Task 8: Group Expense REST API

**Files:**
- Create: `server/src/routes/expenses.js`
- Modify: `server/src/app.js`
- Modify: `server/tests/collaboration-api.test.js`

**Interfaces:**
- `GET /api/trips/:tripId/expenses`
- `POST /api/trips/:tripId/expenses`
- `PATCH /api/trips/:tripId/expenses/:expenseId`
- `DELETE /api/trips/:tripId/expenses/:expenseId`
- `GET /api/trips/:tripId/expense-summary`

- [ ] **Step 1: Write failing expense API tests**

Test this exact flow:

```js
const created = await request(app)
  .post(`/api/trips/${tripId}/expenses`)
  .set(editorAuth)
  .send({
    description: "Hongcun lunch",
    category: "food",
    amountFen: 30000,
    expenseDate: "2026-08-10",
    paidByUserId: ownerId,
    participantUserIds: [ownerId, editorId],
    note: "Viewer did not join"
  })
  .expect(201);

expect(created.body.expense.participants).toEqual([
  expect.objectContaining({ shareFen: 15000 }),
  expect.objectContaining({ shareFen: 15000 })
]);

const summary = await request(app)
  .get(`/api/trips/${tripId}/expense-summary`)
  .set(viewerAuth)
  .expect(200);
expect(summary.body.totalSpentFen).toBe(30000);
```

Add tests for:

- Empty participant rejection.
- Duplicate participant rejection.
- Non-member payer rejection.
- Participant from another trip rejection.
- Viewer cannot create/update/delete.
- Editor can edit/delete only expenses they created.
- Owner can edit/delete any trip expense.
- Removed members remain in historical summaries.
- Expense amount and shares always reconcile exactly.
- Cross-trip and unrelated-user access is denied.

- [ ] **Step 2: Run focused API tests and confirm failure**

```powershell
.\.tools\node\npm.cmd --workspace server test -- collaboration-api.test.js
```

Expected: FAIL because expense routes do not exist.

- [ ] **Step 3: Implement expense validation and CRUD**

Parse request bodies with `expenseInputSchema`. Resolve active trip members and verify payer and every participant belong to the same trip. Call `splitEqually(amountFen, participantUserIds)` before persistence.

Permissions:

- Owner/editor: create.
- Owner: update/delete any.
- Editor: update/delete only records where `createdByUserId === req.user.id`.
- Viewer/unrelated/removed: read-only or denied according to membership.

Every create/update/delete appends a `trip_activity_log` event.

- [ ] **Step 4: Implement summary endpoint**

Load current plus historically referenced members, load expenses, and call `summarizeExpenses`. Return:

```json
{
  "totalSpentFen": 30000,
  "members": [],
  "settlements": []
}
```

The summary does not mutate itinerary budget estimates.

- [ ] **Step 5: Mount router and run tests**

Mount `createExpensesRouter({ repository, authenticate })` at `/api`.

```powershell
.\.tools\node\npm.cmd --workspace server test -- collaboration-api.test.js
.\.tools\node\npm.cmd --workspace server test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit expense APIs**

```powershell
& 'C:\Program Files\Git\cmd\git.exe' add server/src/routes/expenses.js server/src/app.js server/tests/collaboration-api.test.js
& 'C:\Program Files\Git\cmd\git.exe' commit -m 'feat: add shared trip expense APIs'
```

---

### Task 9: Invitation Acceptance and Authentication Continuation UI

**Files:**
- Create: `client/src/pages/InvitationPage.jsx`
- Modify: `client/src/App.jsx`
- Modify: `client/src/context/AuthContext.jsx`
- Modify: `client/src/pages/LoginPage.jsx`
- Modify: `client/src/pages/RegisterPage.jsx`
- Create: `client/tests/invitation.test.jsx`

**Interfaces:**
- Route: `/invite/:token`
- Login/register query: `?returnTo=/invite/:token`
- Invitation page states: loading, sign-in required, pending, accepted, declined, expired/revoked/consumed

- [ ] **Step 1: Write failing invitation page tests**

```jsx
it("preserves the invitation route through sign in", async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      invitation: {
        status: "pending",
        role: "editor",
        trip: {
          title: { en: "Huangshan Together", zh: "榛勫北鍚岃" },
          destination: "huangshan",
          startDate: "2026-08-10",
          endDate: "2026-08-13"
        },
        owner: { name: "Chen" }
      }
    })
  });
  render(<App initialPath="/invite/invite-token" />);
  expect(await screen.findByRole("link", { name: /sign in to join/i }))
    .toHaveAttribute("href", "/login?returnTo=%2Finvite%2Finvite-token");
});

it("accepts an invitation and opens the trip workspace", async () => {
  localStorage.setItem("nuogo-token", "member-token");
  fetch.mockImplementation(async (url, options = {}) => {
    if (url.endsWith("/auth/me")) {
      return {
        ok: true,
        json: async () => ({ user: { id: "user-2", name: "Li", email: "li@example.com" } })
      };
    }
    if (url.endsWith("/invitations/invite-token") && !options.method) {
      return {
        ok: true,
        json: async () => ({
          invitation: {
            status: "pending",
            role: "editor",
            trip: {
              id: "trip-1",
              title: { en: "Huangshan Together", zh: "黄山同行" },
              destination: "huangshan",
              startDate: "2026-08-10",
              endDate: "2026-08-13"
            },
            owner: { name: "Chen" }
          }
        })
      };
    }
    if (url.endsWith("/invitations/invite-token/accept")) {
      return {
        ok: true,
        json: async () => ({ membership: { role: "editor" }, tripId: "trip-1" })
      };
    }
    if (url.endsWith("/trips/trip-1")) {
      return {
        ok: true,
        json: async () => ({
          trip: demoTrip(),
          access: { role: "editor", canEdit: true, isOwner: false }
        })
      };
    }
    if (url.endsWith("/trips/trip-1/members")) {
      return { ok: true, json: async () => ({ members: [] }) };
    }
    throw new Error(`Unexpected request: ${url}`);
  });

  render(<App initialPath="/invite/invite-token" />);
  await userEvent.click(await screen.findByRole("button", { name: /accept invitation/i }));

  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining("/invitations/invite-token/accept"),
    expect.objectContaining({ method: "POST" })
  );
  expect(await screen.findByText(/trip workspace/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run client invitation tests and confirm failure**

```powershell
.\.tools\node\npm.cmd --workspace client test -- invitation.test.jsx
```

Expected: FAIL because the invitation route does not exist.

- [ ] **Step 3: Implement return-path authentication**

Read `returnTo` from `useSearchParams`. Permit only paths beginning with a single `/` and reject values beginning `//`; fallback to `/planner`. After successful login/register, navigate to the validated local path.

Do not place the invitation token in local storage.

- [ ] **Step 4: Implement InvitationPage**

Use the existing app shell, Nuogo logo, destination metadata, offered role, and owner name. Signed-out users see sign-in/register actions. Signed-in users see accept/decline. Successful acceptance navigates to `/trip/:tripId`.

All states have Chinese and English copy and accessible live status text.

- [ ] **Step 5: Run focused and complete client tests**

```powershell
.\.tools\node\npm.cmd --workspace client test -- invitation.test.jsx
.\.tools\node\npm.cmd --workspace client test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit invitation UI**

```powershell
& 'C:\Program Files\Git\cmd\git.exe' add client/src/pages/InvitationPage.jsx client/src/App.jsx client/src/context/AuthContext.jsx client/src/pages/LoginPage.jsx client/src/pages/RegisterPage.jsx client/tests/invitation.test.jsx
& 'C:\Program Files\Git\cmd\git.exe' commit -m 'feat: add trip invitation acceptance'
```

---

### Task 10: Collaboration Drawer and Member-Aware Workspace

**Files:**
- Create: `client/src/components/MemberAvatars.jsx`
- Create: `client/src/components/CollaborationDrawer.jsx`
- Modify: `client/src/context/TripContext.jsx`
- Modify: `client/src/pages/TripWorkspacePage.jsx`
- Modify: `client/src/components/ShareDialog.jsx`
- Modify: `client/src/i18n/translations.js`
- Modify: `client/tests/collaboration-archive.test.jsx`
- Modify: `client/tests/fixtures.js`

**Interfaces:**
- `TripContext` exposes `access`, `members`, `refreshTrip`, `refreshMembers`, and `applyRevision`.
- `CollaborationDrawer` props: `{ tripId, open, onClose, access, members, onMembersChanged }`
- Public `ShareDialog` remains separate from invitations.

- [ ] **Step 1: Read all requested design skills before UI edits**

Read completely:

```powershell
Get-Content -Raw '.agents/skills/impeccable/SKILL.md'
Get-Content -Raw '.agents/skills/taste-skill/SKILL.md'
Get-Content -Raw '.agents/skills/redesign-skill/SKILL.md'
Get-Content -Raw "$env:USERPROFILE\.codex\skills\ui-ux-pro-max\SKILL.md"
```

Apply their audit, accessibility, responsive, hierarchy, motion, and visual-system guidance while preserving `DESIGN.md`.

- [ ] **Step 2: Write failing collaboration UI tests**

Test:

- Owner sees member avatars, Invite, Members, role controls, revoke, and remove.
- Editor sees itinerary editing controls and member list but no role controls.
- Viewer sees no itinerary mutation controls.
- Invitation creation displays a copyable `/invite/` URL.
- Public share creation still displays `/shared/`.
- Drawer closes with Escape and returns focus to its trigger.
- Chinese mode contains no English collaboration labels.

- [ ] **Step 3: Run collaboration client tests and confirm failure**

```powershell
.\.tools\node\npm.cmd --workspace client test -- collaboration-archive.test.jsx
```

Expected: FAIL because membership UI is absent.

- [ ] **Step 4: Expand TripContext**

For owned/member trips, store server-returned `access`, defaulting only existing owner fixtures to `{ role: "owner", canEdit: true, isOwner: true }`. Fetch members after the trip loads.

Add a 20-second interval that requests `/trips/:tripId` while the document is visible. Replace local trip state only when the returned revision is greater. Clear the interval on unmount.

`applyRevision(revision)` updates the trip revision after each successful mutation.

- [ ] **Step 5: Build member waypoint and drawer components**

Use:

- Circular waypoint avatars with initials and accessible full-name labels.
- A restrained right-side desktop drawer and full-height mobile sheet.
- Segmented `Editor`/`Viewer` invitation role control.
- Native select menu for existing member roles.
- Explicit confirmation before member removal or invitation revocation.
- Anime.js for a short staggered member-row entrance and no motion under reduced-motion preference.

Do not introduce nested cards or make the workspace header materially taller.

- [ ] **Step 6: Wire role-aware workspace mutations**

Derive `readOnly` from `!access.canEdit` plus public share permission. Add `expectedRevision: trip.revision` to add/edit/delete/reorder/regenerate/cheaper-alternative requests. On `TRIP_VERSION_CONFLICT`, call `refreshTrip()` and render a bilingual status message.

Replace the single ambiguous share action with:

- `Invite` for owner-managed membership.
- `Share` for public bearer links.
- `Members` for the collaboration drawer.

- [ ] **Step 7: Run focused and full client tests**

```powershell
.\.tools\node\npm.cmd --workspace client test -- collaboration-archive.test.jsx
.\.tools\node\npm.cmd --workspace client test
```

Expected: all tests PASS.

- [ ] **Step 8: Commit collaboration workspace UI**

```powershell
& 'C:\Program Files\Git\cmd\git.exe' add client/src/components/MemberAvatars.jsx client/src/components/CollaborationDrawer.jsx client/src/context/TripContext.jsx client/src/pages/TripWorkspacePage.jsx client/src/components/ShareDialog.jsx client/src/i18n/translations.js client/tests/collaboration-archive.test.jsx client/tests/fixtures.js
& 'C:\Program Files\Git\cmd\git.exe' commit -m 'feat: add collaborative trip workspace'
```

---

### Task 11: Group Expense Workspace UI

**Files:**
- Create: `client/src/components/ExpenseWorkspace.jsx`
- Create: `client/src/components/ExpenseDialog.jsx`
- Create: `client/src/components/SettlementList.jsx`
- Modify: `client/src/pages/TripWorkspacePage.jsx`
- Modify: `client/src/components/BudgetPanel.jsx`
- Modify: `client/src/i18n/translations.js`
- Modify: `client/src/styles/index.css`
- Create: `client/tests/group-expenses.test.jsx`
- Modify: `client/tests/fixtures.js`

**Interfaces:**
- `ExpenseWorkspace` props: `{ tripId, access, members, plannedBudget }`
- `ExpenseDialog` props: `{ expense, members, open, onClose, onSaved }`
- `SettlementList` props: `{ summary, currentUserId }`

- [ ] **Step 1: Write failing expense UI tests**

Cover:

```jsx
const members = [
  { userId: "user-1", name: "Chen", role: "owner", status: "active" },
  { userId: "user-2", name: "Li", role: "editor", status: "active" },
  { userId: "user-3", name: "Wang", role: "viewer", status: "active" }
];

function renderExpenseWorkspace() {
  fetch.mockImplementation(async (url) => {
    if (url.endsWith("/trips/trip-1/expenses")) {
      return { ok: true, json: async () => ({ expenses: [] }) };
    }
    if (url.endsWith("/trips/trip-1/expense-summary")) {
      return {
        ok: true,
        json: async () => ({ totalSpentFen: 0, members: [], settlements: [] })
      };
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  return render(
    <ExpenseWorkspace
      tripId="trip-1"
      access={{ role: "owner", canEdit: true, isOwner: true }}
      members={members}
      plannedBudget={{
        total: 4800,
        spent: 1200,
        remaining: 3600,
        overBudget: false,
        categories: {}
      }}
    />
  );
}

it("defaults all active members into an equal split and supports exclusions", async () => {
  renderExpenseWorkspace();
  await userEvent.click(screen.getByRole("button", { name: /add expense/i }));
  await userEvent.type(screen.getByLabelText(/description/i), "Hongcun lunch");
  await userEvent.clear(screen.getByLabelText(/amount/i));
  await userEvent.type(screen.getByLabelText(/amount/i), "300");

  expect(screen.getByText("¥100.00 each")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("checkbox", { name: "Wang" }));
  expect(screen.getByText("¥150.00 each")).toBeInTheDocument();
});
```

Also test:

- Planned Budget remains the initial tab.
- Group Expenses loads expense rows and total.
- Payer can be excluded from participants.
- Viewer has no add/edit/delete controls.
- Editor can edit only their own records.
- Balance rows display paid, share, and net.
- Settlement text renders in Chinese and English.
- Dialog validation rejects zero amount and no participants.
- Keyboard focus returns to Add Expense after close.

- [ ] **Step 2: Run focused expense UI tests and confirm failure**

```powershell
.\.tools\node\npm.cmd --workspace client test -- group-expenses.test.jsx
```

Expected: FAIL because expense components do not exist.

- [ ] **Step 3: Build the planned/group expense tabs**

Use a two-option segmented tab control. Keep existing `BudgetPanel` unchanged in behavior as the Planned Budget panel. Group Expenses shows four compact metrics:

- Actual total.
- Current user paid.
- Current user share.
- Current user balance.

Use labels and plus/minus icons in addition to colour. Do not use a separate card around every metric on mobile; use one aligned summary band.

- [ ] **Step 4: Build ExpenseDialog with live equal allocation**

Use native form controls:

- Description text input.
- Category select.
- Yuan amount input converted with `Math.round(Number(value) * 100)`.
- Date input.
- Payer select.
- Member checkboxes checked by default.
- Optional note textarea.

Calculate preview shares with a small client helper mirroring deterministic server remainder behavior. The server response remains authoritative.

- [ ] **Step 5: Build balances and settlements**

Render a dense, scannable member table on desktop and aligned rows on mobile. Settlement rows use `ArrowRight` between payer and receiver names and format integer fen through:

```js
export function formatFen(amountFen, language) {
  return new Intl.NumberFormat(language === "zh" ? "zh-CN" : "en-CN", {
    style: "currency",
    currency: "CNY"
  }).format(amountFen / 100);
}
```

Animate recalculated rows with Anime.js opacity/translate changes; avoid count-up animation for money.

- [ ] **Step 6: Integrate expense workspace**

Replace the direct `BudgetPanel` placement in the third workspace column with `ExpenseWorkspace`. Preserve the current map, timeline, guide, and responsive grid.

- [ ] **Step 7: Run focused, client, and complete tests**

```powershell
.\.tools\node\npm.cmd --workspace client test -- group-expenses.test.jsx
.\.tools\node\npm.cmd --workspace client test
.\.tools\node\npm.cmd test
```

Expected: all tests PASS.

- [ ] **Step 8: Commit expense workspace UI**

```powershell
& 'C:\Program Files\Git\cmd\git.exe' add client/src/components/ExpenseWorkspace.jsx client/src/components/ExpenseDialog.jsx client/src/components/SettlementList.jsx client/src/pages/TripWorkspacePage.jsx client/src/components/BudgetPanel.jsx client/src/i18n/translations.js client/src/styles/index.css client/tests/group-expenses.test.jsx client/tests/fixtures.js
& 'C:\Program Files\Git\cmd\git.exe' commit -m 'feat: add group expense workspace'
```

---

### Task 12: Demo Data, Documentation, Visual Verification, and Final Checks

**Files:**
- Modify: `database/seeds/001_demo.sql`
- Modify: `docs/API.md`
- Modify: `CURRENT_ARCHITECTURE.md`
- Modify: `ARCHITECTURE_CHANGES.md`
- Modify: `docs/MANUAL_ACCEPTANCE.md`
- Modify: `scripts/capture-redesign.mjs`

**Interfaces:**
- Demo includes at least three members and two expenses with one excluded traveller.
- Documentation records the feature as a post-baseline extension, not an architecture rewrite.

- [ ] **Step 1: Add deterministic collaboration demo data**

Add idempotent seed rows for:

- Owner, editor, and viewer membership on one demo trip.
- One CNY 300 meal shared by owner and editor only.
- One transport expense shared by all three members.
- Exact participant `share_fen` values matching each expense total.

Do not seed a live invitation token or credential.

- [ ] **Step 2: Update API and architecture documentation**

Document:

- Invitation/member endpoints and role requirements.
- Expense endpoints and integer-fen request/response fields.
- `TRIP_VERSION_CONFLICT`.
- Public shares versus authenticated membership.
- New tables, services, routes, and client components.
- This work as a post-freeze feature addition in `ARCHITECTURE_CHANGES.md`.

- [ ] **Step 3: Add manual acceptance cases**

Add a bilingual-ready manual checklist for:

1. Owner creates editor invitation.
2. Second account signs in and accepts.
3. Editor changes one activity and owner sees it after refresh.
4. Viewer cannot edit.
5. Editor records a three-person CNY 300 expense.
6. One traveller is excluded and preview becomes CNY 150 per included person.
7. Balances and settlement reconcile to zero.
8. Public share remains read-only.
9. Invitation expiry and revocation states display correctly.

- [ ] **Step 4: Extend screenshot capture**

Capture:

- Desktop collaboration drawer.
- Mobile collaboration sheet.
- Desktop group expense ledger and settlement view.
- Mobile expense dialog with participant selection.

Use existing Playwright capture conventions and save outputs under `artifacts/`.

- [ ] **Step 5: Run full verification**

```powershell
$env:PATH="$PWD\.tools\node;$env:PATH"
.\.tools\node\npm.cmd test
.\.tools\node\npm.cmd run build
```

Expected:

- Shared tests PASS.
- Server tests PASS.
- Client tests PASS.
- Production build completes.
- Record the exact generated JavaScript bundle size; do not reuse the architecture baseline's old size.

- [ ] **Step 6: Run the app and perform visual checks**

Start:

```powershell
.\.tools\node\npm.cmd run dev
```

Verify at desktop `1440x900` and mobile `390x844`:

- No clipped Chinese or English labels.
- Drawer/sheet does not cover its close action.
- Expense amount and participant controls remain visible without horizontal scrolling.
- Timeline, map, guide, and planned budget still render.
- Focus indicators are visible.
- Reduced-motion mode removes entrance/recalculation animation.
- Browser console has no errors.

- [ ] **Step 7: Commit documentation and verification assets**

```powershell
& 'C:\Program Files\Git\cmd\git.exe' add database/seeds/001_demo.sql docs/API.md CURRENT_ARCHITECTURE.md ARCHITECTURE_CHANGES.md docs/MANUAL_ACCEPTANCE.md scripts/capture-redesign.mjs
& 'C:\Program Files\Git\cmd\git.exe' commit -m 'docs: complete collaboration feature verification'
```

- [ ] **Step 8: Final repository checkpoint**

```powershell
& 'C:\Program Files\Git\cmd\git.exe' status --short
& 'C:\Program Files\Git\cmd\git.exe' log -12 --oneline
```

Expected: only pre-existing unrelated untracked files remain; all collaboration source and documentation changes are committed.
