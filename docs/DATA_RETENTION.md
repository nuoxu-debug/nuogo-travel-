# Data Retention And Account Deletion

Verified: 2026-08-24

This documents implemented repository behavior, not a legal retention schedule.

## Active Account Data

Registered and guest accounts store an identifier, name, email, preferred language, account type, bcrypt password hash, role, status, and timestamps. Profile responses exclude password hashes and expose no authorization role through the profile endpoint. JWT access tokens expire after seven days; there is no refresh token.

Registered password changes require the current password. Password inputs are bounded to 72 UTF-8 bytes to avoid bcrypt truncation ambiguity. Guest accounts have random unusable password hashes and no password lifecycle.

## Implemented Deletion

`DELETE /api/privacy/account` requires `confirmation: "DELETE"`. Registered accounts also require the current password. Memory deletion swaps prepared collections; MySQL deletion runs in a transaction and rolls back on failure.

| Data category | Result |
| --- | --- |
| User account and password hash | Deleted |
| Privacy consent records | Deleted |
| Trips owned by the user | Deleted |
| Objective payload, runs, legs, provenance, validation issues, and repairs belonging to those trips | Deleted through repository cleanup/foreign-key cascades |
| Other users and trips | Preserved |
| Shared destination, POI, provider, route-cache, and cost-reference data | Preserved because it is not user-owned |
| Administrator system records | Not linked as user-owned deletion data; operational retention requires deployment policy |

After logout, account deletion, or an authentication-expiry response, the client removes Nuogo authentication, trip, and preference browser state. The interface-language preference remains.

## External Boundaries

- No statutory or institutional retention period is encoded.
- Backup, replica, binlog, reverse-proxy, and hosting retention are outside this repository.
- Deleting Nuogo data cannot retract preferences already sent to an external AI provider.
- Provider retention terms must be checked from current official provider policy before deployment.
- A deployment owner must define backup deletion, operational log retention, and legally required exceptions.
