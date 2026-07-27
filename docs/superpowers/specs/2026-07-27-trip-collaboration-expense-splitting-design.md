# Nuogo Trip Collaboration and Expense Splitting Design

**Date:** 2026-07-27  
**Status:** Approved for implementation planning  
**Project:** Nuogo: An AI-Powered Smart Travel Planner

## 1. Purpose

Extend Nuogo's existing trip sharing into authenticated group collaboration. A trip owner can invite other Nuogo users, grant appropriate permissions, plan the itinerary together, record actual group expenses, and calculate who should reimburse whom.

The feature must preserve the current React, Express, MySQL, SQL.js, repository modes, itinerary generation flow, public share links, bilingual interface, and frozen architecture baseline.

## 2. Confirmed Product Decisions

- Invitation links require the invitee to sign in or register before joining.
- Existing public view-only links remain available.
- A trip has one owner and may have editors and viewers.
- Equal expense splitting is the default.
- The user recording an expense can exclude travellers who did not participate.
- Planned AI budget estimates and actual group expenses are related but shown separately.
- The first version does not include chat, real-time cursors, receipt scanning, payment processing, or WebSockets.
- Collaborators receive fresh saved state after mutations and through lightweight background refresh.

## 3. Existing Functionality to Reuse

Nuogo already provides:

- Authenticated users and JWT authorization.
- Owner-managed trips and itinerary mutations.
- Token-based `view` and `edit` share links.
- Public shared-trip reading.
- One vote per authenticated user and activity on editable share links.
- Planned budget calculations and category allocation.
- Memory and MySQL repository implementations.

The existing `edit` share permission currently enables voting in the shared interface but does not authorize itinerary mutation routes for non-owners. The new membership model resolves that mismatch. Public share tokens remain presentation links; accepted trip membership becomes the authority for collaborative editing.

## 4. Approaches Considered

### 4.1 Token-Only Editing

Allow anyone holding an editable link to mutate a trip. This is the smallest change, but it does not provide reliable identity, member management, expense ownership, or safe revocation. It is unsuitable for the required expense ledger.

### 4.2 Account-Bound Membership

An invitee accepts a token while authenticated and becomes a trip member with a role. Existing REST routes and repositories enforce membership permissions. This supports identity, editing, audit records, expense ownership, revocation, and testing without introducing a new architectural style.

**Selected approach.**

### 4.3 Real-Time Collaborative Editing

Add WebSockets, presence indicators, live cursors, and conflict-free document synchronization. This offers immediate co-editing but adds infrastructure and failure modes that are disproportionate for the current FYP scope.

## 5. Roles and Authorization

### Owner

- View and edit the complete itinerary.
- Add, edit, delete, reorder, and regenerate activities or days.
- Create and revoke invitations.
- View pending invitations.
- Change member roles.
- Remove members.
- Add, edit, and delete group expenses.
- Delete the trip.

### Editor

- View and edit the complete itinerary.
- Add, edit, delete, reorder, and regenerate activities or days.
- Add group expenses.
- Edit or delete expenses they created.
- View members, balances, and settlements.
- Cannot manage roles, remove members, or delete the trip.

### Viewer

- View the itinerary, members, expenses, balances, and settlements.
- Cannot change itinerary or expense data.

### Public Share Visitor

- Access is controlled by a private bearer link.
- A view link provides read-only access.
- The existing editable share behavior may continue to allow authenticated voting, but it does not grant trip membership or itinerary mutation rights.

All authorization decisions are enforced by the server. Hiding a control in the client is not considered authorization.

## 6. Invitation Flow

1. The owner opens the collaboration drawer and selects `Editor` or `Viewer`.
2. Nuogo creates a cryptographically random invitation token with a seven-day expiry.
3. The owner copies and sends the invitation link.
4. The invitee opens the link.
5. If signed out, Nuogo preserves the invitation URL while the user signs in or registers.
6. Nuogo displays the trip title, destination, dates, owner, and offered role.
7. The invitee accepts or declines.
8. Acceptance creates or reactivates one membership for that user and trip.
9. The invitation is marked accepted and cannot be used by another account.
10. The new member enters the shared trip workspace.

Duplicate acceptance returns the existing membership without creating another row. Expired, revoked, declined, or already-consumed invitations display a clear bilingual state.

## 7. Collaborative Editing

The existing trip workspace remains the primary editing surface. Owner-only checks in itinerary mutation routes are replaced with a shared authorization policy:

- Read operations allow owner, active member, or valid public share token where applicable.
- Itinerary mutations allow owner or active editor.
- Trip deletion and member administration allow owner only.

After a successful mutation, the API returns the updated trip graph and revision timestamp. The client updates its trip context immediately. While the collaboration workspace is open, it checks for a newer revision at a modest interval and refreshes only when saved state has changed.

Mutation requests include the last known trip revision. If another member has already saved a newer revision, the server returns `409 TRIP_VERSION_CONFLICT`. Nuogo refreshes the trip and tells the user that a newer group change was loaded. Automatic merging is outside the first-version scope.

## 8. Collaboration Interface

### Workspace Header

- Compact member avatar group.
- Member count.
- `Invite` action for the owner.
- `Members` action for authenticated trip members.
- Existing public `Share` action remains separate.

### Collaboration Drawer

- Owner identity.
- Active members with avatar or initials, name, and role.
- Pending invitations with offered role and expiry.
- Copy link, revoke invitation, change role, and remove member actions when authorized.
- A concise saved-change feed showing actor, action, target, and time.

### Activity Attribution

Activity cards may show a small `Last edited by` label when collaboration metadata exists. Attribution must not make the already dense itinerary timeline taller by default; it appears in activity details or a compact footer.

### Responsive Behavior

- Desktop: collaboration opens as a right-side drawer without replacing the map or timeline.
- Mobile: the same content opens as a full-height bottom sheet.
- Member and expense controls maintain at least 44-pixel targets.
- Chinese is the default language and every new visible string has Chinese and English translations.
- Focus is trapped in open dialogs or drawers, restored on close, and motion respects `prefers-reduced-motion`.

## 9. Expense Model

Planned budget and actual expenses serve different purposes:

- **Planned budget:** AI-estimated itinerary costs and category allocations.
- **Group expenses:** actual amounts paid by travellers during planning or travel.

Each group expense records:

- Trip
- Description
- Category
- Amount in CNY
- Expense date
- Payer
- Creator
- Included participants
- Equal split allocation
- Optional note
- Created and updated timestamps

Supported categories reuse Nuogo's budget categories where possible: accommodation, transportation, food and beverages, attraction tickets, entertainment and activities, and other.

Equal splitting is recalculated from the stored total and participant set. Allocation uses integer fen rather than floating-point yuan. Any remainder is distributed deterministically by membership ID order so participant shares always sum exactly to the expense total.

The payer does not need to be included as a consumer. This supports cases where one traveller pays on behalf of only part of the group.

## 10. Balances and Settlement

For each active or historically referenced member:

`net balance = total paid - total allocated share`

- Positive balance: the group owes this member.
- Negative balance: this member owes the group.
- Zero balance: settled.

Nuogo produces a simplified settlement list by matching the largest debtor with the largest creditor until all balances are zero. Amounts are handled in integer fen and displayed in yuan. The algorithm aims to produce a small practical set of payments; it does not claim mathematical minimization across every possible settlement graph.

Example:

- Four members share a trip.
- Chen pays CNY 300 for a meal.
- Only Chen, Li, and Wang participated.
- Each included member receives a CNY 100 share.
- Chen's net contribution for that expense is positive CNY 200.
- Li and Wang each owe CNY 100.
- The excluded fourth member owes nothing.

## 11. Expense Interface

The existing budget area gains two tabs:

### Planned Budget

Retains the current AI budget breakdown, allocation controls, and itinerary regeneration behavior.

### Group Expenses

- Summary: actual total, paid by the current user, current user's share, and current balance.
- Expense list grouped by date.
- Add-expense action for owner and editors.
- Expense row showing description, category, payer, amount, participant count, and split status.
- Expense details show the exact allocation for every included traveller.
- Balances view lists paid, share, and net balance per traveller.
- Settlement view lists direct suggested payments.

The add/edit expense dialog defaults all active members to included. Users can deselect anyone not involved. The live preview updates each included person's share before saving.

## 12. Data Design

### `trip_members`

- `id`
- `trip_id`
- `user_id`
- `role`: `owner`, `editor`, or `viewer`
- `status`: `active` or `removed`
- `joined_at`
- `removed_at`
- `created_at`
- `updated_at`

Unique active identity is enforced for each trip and user. Existing trip owners are treated as owners without requiring destructive migration of `trips.owner_id`; an owner membership row is created when collaboration is first used or during migration backfill.

### `trip_invitations`

- `id`
- `trip_id`
- `token_hash`
- `role`
- `status`: `pending`, `accepted`, `declined`, `revoked`, or `expired`
- `invited_by_user_id`
- `accepted_by_user_id`
- `expires_at`
- `created_at`
- `accepted_at`

Only a token hash is stored. The plain invitation token appears only in the generated URL response.

### `trip_expenses`

- `id`
- `trip_id`
- `description`
- `category`
- `amount_fen`
- `expense_date`
- `paid_by_user_id`
- `created_by_user_id`
- `note`
- `created_at`
- `updated_at`

### `expense_participants`

- `expense_id`
- `user_id`
- `share_fen`

The composite key is `expense_id, user_id`. Stored shares form a stable historical record even if membership later changes.

### `trip_activity_log`

- `id`
- `trip_id`
- `actor_user_id`
- `action`
- `entity_type`
- `entity_id`
- `summary_json`
- `created_at`

The log stores concise event metadata, not full itinerary snapshots.

### Trip Revision

Trips receive a numeric `revision` incremented by each collaborative itinerary mutation. Existing `updated_at` remains useful for display and cache freshness.

## 13. API Design

### Invitations and Members

- `POST /api/trips/:tripId/invitations`
- `GET /api/trips/:tripId/invitations`
- `DELETE /api/trips/:tripId/invitations/:invitationId`
- `GET /api/invitations/:token`
- `POST /api/invitations/:token/accept`
- `POST /api/invitations/:token/decline`
- `GET /api/trips/:tripId/members`
- `PATCH /api/trips/:tripId/members/:memberId`
- `DELETE /api/trips/:tripId/members/:memberId`

### Expenses

- `GET /api/trips/:tripId/expenses`
- `POST /api/trips/:tripId/expenses`
- `PATCH /api/trips/:tripId/expenses/:expenseId`
- `DELETE /api/trips/:tripId/expenses/:expenseId`
- `GET /api/trips/:tripId/expense-summary`

### Collaboration Activity

- `GET /api/trips/:tripId/activity-log`

Current trip and timeline routes retain their paths. Their authorization policy expands to active editors, and mutation requests accept a trip revision.

## 14. Validation and Error Handling

- Invitation role must be `editor` or `viewer`.
- Invitation expiry is controlled by the server.
- Only the owner can create, revoke, or manage invitations and members.
- A trip must always have exactly one owner.
- The owner cannot remove or demote themselves.
- Expense amount must be a positive integer number of fen and remain within a reasonable server-defined maximum.
- Description is required and length-bounded.
- Category must be supported.
- Payer must be a trip member or a historically retained member.
- At least one active participant is required when creating an expense.
- Users can edit or delete only expenses permitted by their role and ownership rules.
- Removed members retain historical expense shares but lose future trip access.
- Membership, invitation, and expense failures use the existing structured API error format.

Expected codes include:

- `INVITATION_EXPIRED`
- `INVITATION_REVOKED`
- `INVITATION_CONSUMED`
- `TRIP_MEMBER_REQUIRED`
- `TRIP_EDITOR_REQUIRED`
- `TRIP_OWNER_REQUIRED`
- `EXPENSE_PARTICIPANT_REQUIRED`
- `TRIP_VERSION_CONFLICT`

## 15. Visual and Motion Direction

Implementation will apply all installed Nuogo design skills while preserving the established Scenic Wayfinding system.

- Collaboration is represented as a connected route party, not a generic enterprise team dashboard.
- Member avatars use compact circular waypoints.
- Invitation acceptance uses destination imagery and trip ticket metadata.
- Expense allocation uses clear tabular numbers, category colour swatches, and restrained balance indicators.
- Positive and negative balances use icon, label, and colour together.
- Anime.js animates member arrival, split recalculation, and settlement row changes.
- Motion remains short, purposeful, and disabled when reduced motion is requested.
- No nested cards, decorative gradient blobs, oversized panel headings, or excessive page-length expansion.

The implementation will consult:

- `impeccable`
- `design-taste-frontend`
- `redesign-existing-projects`
- `ui-ux-pro-max`

## 16. Testing Strategy

### Shared Contracts and Services

- Membership and invitation schema validation.
- Equal splitting with all members.
- Equal splitting with excluded members.
- Deterministic remainder allocation.
- Payer excluded from participants.
- Balance calculation.
- Settlement calculation.
- Empty participant rejection.

### Server

- Invitation creation, inspection, acceptance, decline, expiry, and revocation.
- Duplicate acceptance is idempotent.
- Owner, editor, viewer, removed member, and unrelated-user authorization.
- Collaborator itinerary mutation.
- Owner-only trip deletion and member management.
- Expense create, read, update, and delete permissions.
- Cross-trip expense and member access prevention.
- Revision conflict response.
- Memory and MySQL repository contract coverage.

### Client

- Invitation sign-in continuation and acceptance.
- Member drawer roles and owner actions.
- Editor controls enabled and viewer controls disabled.
- Chinese and English strings.
- Add-expense participant selection and live equal-split preview.
- Balances and settlement rendering.
- Conflict refresh message.
- Keyboard navigation, focus management, and responsive drawer behavior.

### Verification

- Run the existing complete test suite.
- Run the production build.
- Verify invitation, collaborative editing, expense entry, exclusion, balance, and settlement flows manually.
- Capture desktop and mobile screenshots.
- Check that existing itinerary generation, public sharing, voting, planned budgets, and owner-only workflows remain functional.

## 17. Delivery Boundaries

Included:

- Authenticated trip membership.
- Owner, editor, and viewer roles.
- Invitation lifecycle.
- Collaborative itinerary authorization.
- Member management interface.
- Actual group expense ledger.
- Equal split with participant inclusion and exclusion.
- Balances and suggested settlements.
- Lightweight change refresh and revision conflicts.
- Bilingual, accessible, responsive Nuogo interface.

Deferred:

- Email delivery of invitations.
- Custom percentages or manually assigned shares.
- Multiple currencies or exchange-rate conversion.
- Receipt image upload or OCR.
- Payment collection.
- Chat and comments.
- WebSocket presence and real-time cursors.
- Offline-first synchronization.

These deferred items should be added only when a later requirement demonstrates their need.
