function accessError(message, code) {
  const error = new Error(message);
  error.status = 403;
  error.code = code;
  return error;
}

export async function getTripAccess(repository, tripId, userId) {
  const trip = await repository.getTrip(tripId);
  if (!trip) return undefined;
  const isOwner = trip.ownerId === userId;

  return {
    trip,
    role: isOwner ? "owner" : undefined,
    canEdit: isOwner,
    isOwner
  };
}

export function requireTripRole(access, roles) {
  const role = access?.role;
  if (!role) {
    throw accessError("Trip owner access is required.", "TRIP_OWNER_REQUIRED");
  }

  const allowedRoles = new Set(roles);
  const hasAccess = allowedRoles.has(role)
    || (role === "owner" && (allowedRoles.has("editor") || allowedRoles.has("viewer")));
  if (hasAccess) return access;

  if (allowedRoles.has("editor")) {
    throw accessError("Trip editor access is required.", "TRIP_EDITOR_REQUIRED");
  }
  if (allowedRoles.has("owner")) {
    throw accessError("Trip owner access is required.", "TRIP_OWNER_REQUIRED");
  }
  throw accessError("Trip owner access is required.", "TRIP_OWNER_REQUIRED");
}

export function createGuestClaim() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashGuestClaimToken(token) };
}

export function hashGuestClaimToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function guestClaimMatches(expectedHash, token) {
  if (typeof expectedHash !== "string" || typeof token !== "string") return false;
  const actual = Buffer.from(hashGuestClaimToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
