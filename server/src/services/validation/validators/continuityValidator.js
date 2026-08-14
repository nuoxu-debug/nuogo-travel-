export function validateContinuity(preferences, itinerary) {
  const issues = [];
  if (itinerary.days[0]?.startPoint.locationType !== "ORIGIN") {
    issues.push({
      code: "ARRIVAL_CONSTRAINT_VIOLATION",
      path: ["days", 0, "startPoint"],
      severity: "ERROR",
      metadata: { expectedType: "ORIGIN" }
    });
  }
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
  if (itinerary.days.at(-1)?.endPoint.locationType !== "DESTINATION") {
    issues.push({
      code: "DEPARTURE_CONSTRAINT_VIOLATION",
      path: ["days", itinerary.days.length - 1, "endPoint"],
      severity: "ERROR",
      metadata: { expectedType: "DESTINATION" }
    });
  }
  return issues;
}
