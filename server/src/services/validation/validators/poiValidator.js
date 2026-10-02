const broadAreaCandidateIds = new Set([
  "demo-sg-sentosa"
]);

function radians(value) {
  return value * Math.PI / 180;
}

function distanceMeters(left, right) {
  if (!left || !right) return undefined;
  const latitudeDelta = radians(right.latitude - left.latitude);
  const longitudeDelta = radians(right.longitude - left.longitude);
  const leftLatitude = radians(left.latitude);
  const rightLatitude = radians(right.latitude);
  const value = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function candidateId(candidate) {
  return candidate?.candidateId ?? candidate?.xid;
}

function candidateName(candidate) {
  return candidate?.displayName?.en ?? candidate?.name ?? candidateId(candidate);
}

function normalizeCandidateName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function hasDuplicateNameEvidence(leftCandidate, rightCandidate) {
  const leftName = normalizeCandidateName(candidateName(leftCandidate));
  const rightName = normalizeCandidateName(candidateName(rightCandidate));
  return Boolean(leftName && rightName && leftName === rightName);
}

export function validatePois(itinerary, candidatePool) {
  const allowed = new Set(candidatePool.candidateIds);
  const candidatesById = new Map((candidatePool.candidates ?? [])
    .map((candidate) => [candidateId(candidate), candidate])
    .filter(([id]) => Boolean(id)));
  const attractionTypes = new Set([
    "CULTURE", "HISTORY", "NATURE", "SHOPPING", "ENTERTAINMENT", "FAMILY"
  ]);
  const seen = new Map();
  const issues = [];
  itinerary.days.forEach((day, dayIndex) => {
    day.activities.forEach((activity, activityIndex) => {
      const path = ["days", dayIndex, "activities", activityIndex, "xid"];
      if (!attractionTypes.has(activity.activityType)) {
        if (activity.xid) {
          issues.push({
            code: "UNGROUNDED_ENTRY_HAS_XID",
            path,
            severity: "ERROR",
            metadata: { xid: activity.xid }
          });
        }
        return;
      }
      if (!activity.xid) {
        issues.push({ code: "MISSING_ATTRACTION_XID", path, severity: "ERROR", metadata: {} });
        return;
      }
      if (!allowed.has(activity.xid)) {
        issues.push({
          code: "UNKNOWN_ATTRACTION_XID",
          path,
          severity: "ERROR",
          metadata: { xid: activity.xid }
        });
      }
      const candidate = candidatesById.get(activity.xid);
      if (broadAreaCandidateIds.has(activity.xid)) {
        issues.push({
          code: "BROAD_AREA_USED_AS_ATTRACTION",
          path,
          severity: "ERROR",
          metadata: {
            xid: activity.xid,
            name: candidateName(candidate),
            reason: "BROAD_DESTINATION_AREA_SHOULD_NOT_BE_SCHEDULED_AS_A_SPECIFIC_ACTIVITY"
          }
        });
      }
      if (seen.has(activity.xid)) {
        issues.push({
          code: "DUPLICATE_ATTRACTION_XID",
          path,
          severity: "ERROR",
          metadata: { xid: activity.xid, firstPath: seen.get(activity.xid) }
        });
      } else {
        seen.set(activity.xid, path);
      }
      const previous = day.activities[activityIndex - 1];
      const previousCandidate = previous?.xid ? candidatesById.get(previous.xid) : undefined;
      const currentCandidate = candidatesById.get(activity.xid);
      const distance = distanceMeters(previousCandidate?.coordinates, currentCandidate?.coordinates);
      if (
        previous?.xid &&
        previous.xid !== activity.xid &&
        Number.isFinite(distance) &&
        distance < 75 &&
        hasDuplicateNameEvidence(previousCandidate, currentCandidate)
      ) {
        issues.push({
          code: "NEAR_DUPLICATE_ADJACENT_POI",
          path,
          severity: "ERROR",
          metadata: {
            xid: activity.xid,
            previousXid: previous.xid,
            distanceMeters: Math.round(distance),
            reason: "ADJACENT_ATTRACTIONS_ARE_TOO_CLOSE_TO_BE_MEANINGFUL_SEPARATE_STOPS"
          }
        });
      }
    });
  });
  return issues;
}
