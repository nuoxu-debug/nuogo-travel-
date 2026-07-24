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

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/trips/generate` | Validate preferences, generate three plans, and save the trip |
| GET | `/trips` | List the current user's trips |
| GET | `/trips/:tripId` | Read an owned trip |
| PATCH | `/trips/:tripId` | Update bilingual title or lifecycle status |
| DELETE | `/trips/:tripId` | Delete an owned trip |
| POST | `/trips/:tripId/duplicate` | Duplicate a trip with new stable IDs |
| POST | `/trips/:tripId/select-variant` | Select one generated variant |

Generation accepts `destination`, `departureCity`, `days`, `totalBudget`, `interests`, `groupType`, `accommodation`, `language`, and `startDate`.

## Timeline

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/trips/:tripId/days/:dayId/activities` | Add an activity |
| PATCH | `/activities/:activityId` | Edit an activity |
| DELETE | `/activities/:activityId` | Delete an activity |
| PATCH | `/trips/:tripId/days/:dayId/reorder` | Save all activity IDs in display order |
| POST | `/activities/:activityId/cheaper-alternative` | Apply a deterministic lower-cost alternative |
| POST | `/activities/:activityId/regenerate` | Regenerate one activity |
| POST | `/trips/:tripId/days/:dayId/regenerate` | Regenerate one day |

Mutation responses include the current budget where applicable.

## Collaboration and Favorites

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/trips/:tripId/shares` | Yes | Create a `view` or `edit` share |
| GET | `/shared/:token` | No | Read the shared trip and permission |
| POST | `/shared/:token/votes` | Yes | Vote once per user/activity on an edit share |
| GET | `/favorites` | Yes | List saved activities |
| POST | `/favorites` | Yes | Save an activity by `activityId` |
| DELETE | `/favorites/:favoriteId` | Yes | Remove a favorite |

## Adapter Behavior

`DEMO_MODE` selects `MemoryRepository` or `MySqlRepository`. `AI_PROVIDER` independently selects `DemoPlanProvider` or `OpenRouterProvider`. `OPENROUTER_TIMEOUT_MS` bounds live OpenRouter calls and timeout/provider failures are returned as typed API errors before the generator falls back where appropriate. Both providers receive the same approved Huangshan catalogue, and Amap is used when its browser key is set. Route handlers depend on common interfaces, so response shapes stay the same.

## Attraction Ingestion Boundary

The first Anhui ingestion slice is operated through local CLI commands rather than a public REST endpoint:

```powershell
npm run ingest:anhui -- --region huangshan
npm run attractions:list -- --status pending --region huangshan
npm run attractions:review -- --region huangshan --status approved --ids <id,id,...>
```

It writes a local SQLite catalogue and has an equivalent MySQL migration. Only active, explicitly approved records are supplied to Huangshan generation. A Huangshan request with no approved records returns HTTP 422 and `ATTRACTION_CATALOGUE_EMPTY`.
