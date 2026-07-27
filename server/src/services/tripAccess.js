function accessError(message, code) {
  const error = new Error(message);
  error.status = 403;
  error.code = code;
  return error;
}

export async function getTripAccess(repository, tripId, userId) {
  const trip = await repository.getTrip(tripId);
  if (!trip) return undefined;

  const candidate = await repository.getMember(tripId, userId);
  const member = candidate?.userId === userId ? candidate : undefined;
  const isOwner = trip.ownerId === userId;
  const role = isOwner ? "owner" : member?.status === "active" ? member.role : undefined;

  return {
    trip,
    member,
    role,
    canEdit: role === "owner" || role === "editor",
    isOwner
  };
}

export function requireTripRole(access, roles) {
  const role = access?.role;
  if (!role) {
    throw accessError("An active trip membership is required.", "TRIP_MEMBER_REQUIRED");
  }

  const allowedRoles = new Set(roles);
  const hasAccess = allowedRoles.has(role)
    || (role === "owner" && (allowedRoles.has("editor") || allowedRoles.has("viewer")))
    || (role === "editor" && allowedRoles.has("viewer"));
  if (hasAccess) return access;

  if (allowedRoles.has("editor")) {
    throw accessError("Trip editor access is required.", "TRIP_EDITOR_REQUIRED");
  }
  if (allowedRoles.has("owner")) {
    throw accessError("Trip owner access is required.", "TRIP_OWNER_REQUIRED");
  }
  throw accessError("An active trip membership is required.", "TRIP_MEMBER_REQUIRED");
}
