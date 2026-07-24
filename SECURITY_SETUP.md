# Nuogo Security Setup

## Environment Files

Use `.env.example` as a template only. Copy values into a local `.env` file and keep `.env` uncommitted.

Required live-mode values:

```env
JWT_SECRET=replace-with-a-long-random-string
DEMO_MODE=false
MYSQL_PASSWORD=replace-with-your-mysql-password
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=replace-with-your-openrouter-api-key
OPENROUTER_MODEL=tencent/hy3:free
OPENROUTER_TIMEOUT_MS=30000
```

Frontend map key:

```env
VITE_AMAP_KEY=replace-with-your-browser-map-key
```

`VITE_AMAP_KEY` is read by `client/src/components/RouteMap.jsx` and passed to the browser-only Amap renderer. There is no server-side Amap integration in the current app, so no `AMAP_WEB_KEY` is required. Restrict the browser key by domain/origin in the provider dashboard when supported.

## Credential Rotation

If a real OpenRouter key was ever committed, pasted, or shared, rotate it in OpenRouter immediately. Replacing the local value only prevents future exposure; it does not revoke the old key.

## Runtime Modes

- Demo mode uses in-memory persistence and the deterministic demo itinerary provider.
- Live mode uses MySQL persistence when `DEMO_MODE=false`.
- OpenRouter is used only when `AI_PROVIDER=openrouter`.

## Authentication Notes

- Protected API routes use JWT bearer tokens.
- The frontend stores the token in `localStorage`, which is acceptable for this FYP prototype but is more exposed to XSS than an httpOnly cookie.
- Shared trip read links are public by token. Treat share tokens like private URLs.

## Commit Safety Checklist

Before committing or submitting the project:

1. Run a secret scan.
2. Confirm `.env` and `.env.*` files are ignored except `.env.example`.
3. Confirm `.env.example` contains placeholders only.
4. Rotate any credential that was exposed before cleanup.
5. Run `npm test` and `npm run build`.
