# Nuogo REST API

Base URL: `http://localhost:8787/api`

Protected endpoints require `Authorization: Bearer <jwt>`. JSON failures use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The submitted data is invalid.",
    "details": []
  }
}
```

## Health and Metadata

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | No | Product, service status, and adapter mode |
| GET | `/meta/china` | No | Supported cities and bounded preference enums |
| POST | `/meta/preferences/validate` | Yes | Canonical preference validation route |
| POST | `/preferences/validate` | Yes | Legacy compatibility route; returns `Deprecation: true` |

## Authentication

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | No | Create an account and return JWT/user |
| POST | `/auth/login` | No | Verify credentials and return JWT/user |
| GET | `/auth/me` | Yes | Return the current public user |

Registration accepts `name`, `email`, and `password`. Login accepts `email` and `password`.

## Trips

| Method | Path | Auth / role | Purpose |
| --- | --- | --- | --- |
| POST | `/trips/generate` | Yes | Validate preferences, generate three plans, and save the trip |
| GET | `/trips` | Yes | List trips owned by or shared with the current member |
| GET | `/trips/:tripId` | Active member | Read a trip and the caller's access summary |
| PATCH | `/trips/:tripId` | Owner or editor | Update bilingual title or lifecycle status; requires `expectedRevision` |
| DELETE | `/trips/:tripId` | Owner | Delete a trip |
| POST | `/trips/:tripId/duplicate` | Owner | Duplicate a trip with new stable IDs |
| POST | `/trips/:tripId/select-variant` | Owner or editor | Select one generated variant; requires `expectedRevision` |

The assessed generation request accepts `origin`, `destination`, `startDate`, `endDate`, `arrivalDateTime`, `departureDateTime`, `travellerCount`, `totalBudgetCny`, `interests`, `preferredSights`, accommodation/food/local-transport/activity preferences, outbound and return transport modes/costs, `otherPreferences`, `language`, and `consentToLlmProcessing`. `destination` is limited to `beijing`, `shanghai`, or `xian`.

The assessed response contains three variants (`BUDGET_SAVING`, `BALANCED`, and `COMFORT_FOCUSED`). Each accepted variant is `FINAL_VALIDATED`, uses the same hard budget, includes routed daily legs and POI provenance, and carries an eight-category deterministic budget summary in integer fen. A failed pipeline returns HTTP 422 and does not present an invalid itinerary as complete.

Requests using the older `days`/`totalBudget` contract enter the legacy compatibility generator and are not part of current objective evidence.

Collaborative trip updates, variant selection, and timeline activity/day mutations require an integer `expectedRevision`. Successful revision-checked mutations increment and return the trip `revision`. Trip deletion and duplication do not accept `expectedRevision`. A stale revision-checked write returns HTTP 409:

```json
{
  "error": {
    "code": "TRIP_VERSION_CONFLICT",
    "message": "This trip changed. Refresh and try again."
  }
}
```

## Timeline

| Method | Path | Auth / role | Purpose |
| --- | --- | --- | --- |
| POST | `/trips/:tripId/days/:dayId/activities` | Owner or editor | Add an activity |
| PATCH | `/activities/:activityId` | Owner or editor | Edit an activity |
| DELETE | `/activities/:activityId` | Owner or editor | Delete an activity |
| PATCH | `/trips/:tripId/days/:dayId/reorder` | Owner or editor | Save all activity IDs in display order |
| POST | `/activities/:activityId/cheaper-alternative` | Owner or editor | Apply a deterministic lower-cost alternative |
| POST | `/activities/:activityId/regenerate` | Owner or editor | Regenerate one activity |
| POST | `/trips/:tripId/days/:dayId/regenerate` | Owner or editor | Regenerate one day |

The timeline mutation requests above include `expectedRevision`; responses include the new `revision` and current budget where applicable.

## Authenticated Trip Collaboration

Authenticated membership is distinct from public bearer-link sharing. Membership is attached to a user account and grants one of three roles:

- `owner`: manage invitations and members, edit the itinerary, and manage all trip expenses.
- `editor`: edit the itinerary, create expenses, and change only expenses they created.
- `viewer`: read the trip, activity log, and group expenses without mutation access.

Removed members lose trip access. The owner role cannot be changed or removed.

| Method | Path | Auth / role | Purpose |
| --- | --- | --- | --- |
| POST | `/trips/:tripId/invitations` | Owner | Create a seven-day `editor` or `viewer` invitation |
| GET | `/trips/:tripId/invitations` | Owner | List invitations without token hashes |
| DELETE | `/trips/:tripId/invitations/:invitationId` | Owner | Revoke a pending invitation |
| GET | `/trips/:tripId/members` | Active member | List active trip members |
| PATCH | `/trips/:tripId/members/:memberId` | Owner | Change a non-owner role to `editor` or `viewer` |
| DELETE | `/trips/:tripId/members/:memberId` | Owner | Remove a non-owner member |
| GET | `/trips/:tripId/activity-log` | Active member | Return up to 50 latest collaboration events |
| GET | `/invitations/:token` | No | Inspect a pending invitation |
| POST | `/invitations/:token/accept` | Yes | Accept an invitation for the signed-in user |
| POST | `/invitations/:token/decline` | Yes | Decline an invitation for the signed-in user |

Invitation creation accepts:

```json
{ "role": "editor" }
```

The plaintext invitation token is returned only when the invitation is created. Persistence stores its SHA-256 hash. Expired, revoked, accepted, or declined invitations return a typed terminal-state error.

## Group Expenses

All monetary API fields use integer fen. For example, CNY 300.00 is sent as `30000`. The server calculates equal participant shares and deterministically allocates any remaining fen; clients do not submit `shareFen`.

| Method | Path | Auth / role | Purpose |
| --- | --- | --- | --- |
| GET | `/trips/:tripId/expenses` | Active member | List the trip's recorded group expenses |
| POST | `/trips/:tripId/expenses` | Owner or editor | Create an equally split expense |
| PATCH | `/trips/:tripId/expenses/:expenseId` | Owner or creating editor | Replace expense details and participants |
| DELETE | `/trips/:tripId/expenses/:expenseId` | Owner or creating editor | Delete an expense |
| GET | `/trips/:tripId/expense-summary` | Active member | Return paid, share, net, and settlement totals |

Create and update requests use:

```json
{
  "description": "Hongcun shared lunch",
  "category": "food",
  "amountFen": 30000,
  "expenseDate": "2026-08-10",
  "paidByUserId": "user-id",
  "participantUserIds": ["owner-user-id", "editor-user-id"],
  "note": "Viewer did not join this meal."
}
```

Expense responses include `amountFen` and participant records with `shareFen`. The sum of participant `shareFen` values always equals `amountFen`. Summary responses use:

- `totalSpentFen`
- `members[].paidFen`
- `members[].shareFen`
- `members[].netFen`
- `settlements[].amountFen`

## Legacy Public Sharing and Favorites

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/trips/:tripId/shares` | Owner | Create a `view` or `edit` share for an owner-owned trip |
| GET | `/shared/:token` | No | Read the shared trip and permission |
| POST | `/shared/:token/votes` | Yes | Vote once per user/activity on an edit share |
| GET | `/favorites` | Yes | List saved activities |
| POST | `/favorites` | Yes | Save an activity by `activityId` |
| DELETE | `/favorites/:favoriteId` | Yes | Remove a favorite |

Public bearer-link sharing is outside the assessed MVP and is not mounted by default. It can be enabled only for historical compatibility with `ENABLE_LEGACY_FEATURES=true` on the server and `VITE_ENABLE_LEGACY_FEATURES=true` in the client build. Authenticated membership is a separate access-control mechanism.

## Adapter Behavior

`DEMO_MODE` selects `MemoryRepository` or `MySqlRepository`. `AI_PROVIDER` selects `DemoPlanProvider` or the server-side OpenRouter adapter. `TRAVEL_DATA_PROVIDER` selects deterministic `DEMO` travel records or live server-side AMap plus OpenTripMap adapters. `OPENROUTER_TIMEOUT_MS` and `TRAVEL_PROVIDER_TIMEOUT_MS` bound external calls. Demo records are labelled `DEMO`; live provider verification must be recorded separately.

## Legacy Anhui Ingestion Boundary

The first Anhui ingestion slice is operated through local CLI commands rather than a public REST endpoint:

```powershell
npm run ingest:anhui -- --region huangshan
npm run attractions:list -- --status pending --region huangshan
npm run attractions:review -- --region huangshan --status approved --ids <id,id,...>
```

This CLI and its historical migrations remain available as legacy project evidence. Huangshan/Anhui is not selectable in the assessed three-city planner and this ingestion path is not evidence for Objective 3.
