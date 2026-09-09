export function validatePois(itinerary, candidatePool) {
  const allowed = new Set(candidatePool.candidateIds);
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
    });
  });
  return issues;
}
