# Functional release acceptance

The requested result is a working Nuogo website locally and through its GitHub Pages URL, including registration, login, visitor access, and real Singapore itinerary generation. GitHub must receive the application source and deployment configuration.

## Approach

Retain the existing React/Vite frontend on GitHub Pages, Express API on Render, and Supabase database. A static-only Pages deployment cannot execute the existing API. Moving the whole application to another host would add unnecessary migration work. Retaining the configured split deployment is the implementation choice for this audit.

## Acceptance

- Registration, logout, login, refresh, persisted account access, and saved itinerary access work.
- The user confirmed that anonymous visitors can browse and generate itineraries; saving requires login. Preview data is temporary, with no persistent guest account creation.
- A real configured OpenRouter request produces a validated itinerary, beyond a schema-only HTTP probe.
- Automated browser tests use a separate temporary persistence snapshot and cannot modify local user data.
- Pages loads assets and direct routes under `/nuogo-travel-/`, connects to a public HTTPS API, and supports the same working journeys.
- GitHub deployment checks fail clearly when the backend URL is missing. API and database credentials stay outside the repository and frontend bundle.

## External dependencies

The current local environment has an OpenRouter key but no production database URL or Render credentials. GitHub credential-store access was rejected by automatic approval review; repository writes require an approved account connection or explicit credential-use authorization. Do not claim deployment is complete until the public URL passes functional checks.
