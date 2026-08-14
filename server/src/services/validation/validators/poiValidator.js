export function validatePois(itinerary, candidatePool) {
  const allowed = new Set(candidatePool.candidateIds);
  const seen = new Map();
  const issues = [];
  itinerary.days.forEach((day, dayIndex) => {
    day.activities.forEach((activity, activityIndex) => {
      const path = ["days", dayIndex, "activities", activityIndex, "poiId"];
      if (!allowed.has(activity.poiId)) {
        issues.push({ code: "UNKNOWN_POI", path, severity: "ERROR", metadata: { poiId: activity.poiId } });
      }
      if (seen.has(activity.poiId)) {
        issues.push({
          code: "DUPLICATE_POI",
          path,
          severity: "ERROR",
          metadata: { poiId: activity.poiId, firstPath: seen.get(activity.poiId) }
        });
      } else {
        seen.set(activity.poiId, path);
      }
    });
  });
  return issues;
}
