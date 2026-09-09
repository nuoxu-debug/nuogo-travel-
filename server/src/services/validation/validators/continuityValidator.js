export function validateContinuity(preferences, itinerary) {
  const issues = [];
  for (let index = 0; index < itinerary.days.length - 1; index += 1) {
    const current = itinerary.days[index];
    const next = itinerary.days[index + 1];
    if (current.endPoint.locationId !== next.startPoint.locationId) {
      issues.push({
        code: "LOCATION_CONTINUITY_ERROR",
        path: ["days", index + 1, "startPoint", "locationId"],
        severity: "ERROR",
        metadata: { previousEndLocationId: current.endPoint.locationId }
      });
    }
  }
  return issues;
}
