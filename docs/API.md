# Nuogo REST API

Verified: 2026-08-24

Base URL: `http://localhost:8787/api`

JSON errors use:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Safe user-facing message",
    "details": {}
  }
}
```

Protected routes require `Authorization: Bearer <jwt>`. All trip routes are owner-scoped. All admin routes also require the server-confirmed `admin` role.

## Health And Metadata

| Method | Path | Auth | Response purpose |
| --- | --- | --- | --- |
| GET | `/health` | No | Product, health, runtime mode, AI provider |
| GET | `/meta/singapore` | No | Singapore destination metadata, spending profiles, and transport taxonomies |
| GET | `/meta/destinations/:destination/attractions` | No | Controlled destination introduction and browser-safe grounded attraction records |

The discovery endpoint supports only `singapore`. An empty validated pool returns `candidateCount: 0` and `attractions: []`. OpenTripMap records are labelled `OPENTRIPMAP_API`; demo records are labelled `DEMO_FIXTURE`. Provider credentials are never returned.

## Authentication

| Method | Path | Auth | Request |
| --- | --- | --- | --- |
| POST | `/auth/register` | No | `{ name, email, password }` |
| POST | `/auth/login` | No | `{ email, password }` |
| POST | `/auth/guest` | No | Empty body |
| GET | `/auth/me` | Yes | Current session |

Registration, login, and guest creation return `{ user, token }`.

## Profile And Privacy

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/profile` | Read name, email, preferred language, and account type |
| PATCH | `/profile` | Update `name` and/or `preferredLanguage` |
| POST | `/profile/password` | Change a registered password with `currentPassword` and `newPassword` |
| POST | `/privacy/consent` | Record accepted consent type and version |
| DELETE | `/privacy/account` | Delete account and owned data after confirmation |

Account deletion requires `confirmation: "DELETE"`. Registered accounts must also provide `currentPassword`; guest accounts do not have a password.

## Trip Generation

### `POST /trips/generate`

The request body follows `travelPreferenceSchema`:

- fixed `singapore` destination;
- start/end dates and arrival/departure ISO date-times;
- traveller count and one hard total budget in SGD minor units;
- interests, preferred sights, accommodation, food, local transport, and activity preferences;
- `travelStyle` as one of `BUDGET_SAVING`, `BALANCED`, or `COMFORT_FOCUSED`;
- `attractionSelectionMode` with safe selected attraction IDs, plus optional `rainyDayBackupEnabled`;
- outbound/return transport modes and optional user-provided costs;
- optional driving fuel consumption and other preferences;
- `language` and `consentToLlmProcessing: true`.

Success is HTTP 201 and contains one `FINAL_VALIDATED` `itineraryRun` for the selected Travel Style. The run contains itinerary days, ordered activities and legs, deterministic budget summary, validation, provenance, repair attempts, selected-attraction outcomes, and optional inactive rainy-day contingencies.

If all constraints cannot be satisfied, the API returns HTTP 422 with `GENERATION_CONSTRAINTS_UNSATISFIED`, issue codes, and adjustment hints. Invalid output is never returned as a completed itinerary.

## Trip Management

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/trips` | List the current user's trips |
| GET | `/trips/:tripId` | Read one owned trip and access metadata |
| PATCH | `/trips/:tripId` | Rename or change lifecycle status with `expectedRevision` |
| DELETE | `/trips/:tripId` | Delete an owned trip |
| POST | `/trips/:tripId/duplicate` | Create an owner-linked copy |
| PATCH | `/trips/:tripId/entries/:entryId` | Edit and revalidate one objective entry |
| POST | `/trips/:tripId/regenerate` | Generate a linked replacement from revised preferences |

Trip mutations use optimistic concurrency. A stale `expectedRevision` returns HTTP 409 with `TRIP_VERSION_CONFLICT`.

## Administration

All routes below require an authenticated administrator.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin/destinations` | List supported destinations |
| PATCH | `/admin/destinations/:destinationId` | Set destination lifecycle status |
| GET | `/admin/pois?destinationId=:id` | List destination canonical POIs |
| PUT | `/admin/pois/:poiId` | Create or replace a canonical POI |
| DELETE | `/admin/pois/:poiId` | Retire a canonical POI |
| GET | `/admin/cost-references?city=:id` | List cost evidence |
| PUT | `/admin/cost-references/:referenceId` | Create or replace cost evidence |
| DELETE | `/admin/cost-references/:referenceId` | Mark cost evidence unavailable |

Cost records use integer minor units and include category, optional tier, minimum, representative, maximum, SGD currency, HTTPS source URL, source name, collection date, update time, and lifecycle status.

## Removed APIs

The final runtime has no attraction-media, ingestion, guide, collaboration, invitation, membership, expense, favorite, vote, share, or legacy metadata routes. Requests to removed paths return HTTP 404.
