import { resolveActivityOperatingHours } from "../../operatingHours/operatingHoursService.js";

export function calculateOpeningHoursVerificationCoverage(itinerary, candidatePool) {
  if (!candidatePool.operatingHours) {
    return { verifiedVisits: 0, totalVisitsRequiringVerification: 0, percentage: null };
  }
  let verifiedVisits = 0;
  let totalVisitsRequiringVerification = 0;
  itinerary.days.forEach((day) => {
    day.activities.forEach((activity) => {
      if (!activity.xid) return;
      totalVisitsRequiringVerification += 1;
      const result = resolveActivityOperatingHours({ activity, day, candidatePool });
      if (result.state === "VERIFIED_OPEN" || result.state === "VERIFIED_CLOSED") {
        verifiedVisits += 1;
      }
    });
  });
  return {
    verifiedVisits,
    totalVisitsRequiringVerification,
    percentage: totalVisitsRequiringVerification === 0
      ? null
      : Math.round((verifiedVisits / totalVisitsRequiringVerification) * 100)
  };
}

export function validateOperatingHours(itinerary, candidatePool) {
  if (!candidatePool.operatingHours) return [];
  const issues = [];
  itinerary.days.forEach((day, dayIndex) => {
    day.activities.forEach((activity, activityIndex) => {
      if (!activity.xid) return;
      const result = resolveActivityOperatingHours({ activity, day, candidatePool });
      if (result.state === "VERIFIED_CLOSED") {
        issues.push({
          code: "POI_CLOSED_AT_SCHEDULED_TIME",
          path: ["days", dayIndex, "activities", activityIndex, "scheduledStartTime"],
          severity: "ERROR",
          metadata: {
            xid: activity.xid,
            operatingHoursState: result.state,
            source: result.source
          }
        });
      }
      if (result.state === "UNVERIFIED") {
        issues.push({
          code: "POI_OPENING_HOURS_UNVERIFIED",
          path: ["days", dayIndex, "activities", activityIndex, "xid"],
          severity: "WARNING",
          metadata: {
            xid: activity.xid,
            operatingHoursState: result.state,
            source: result.source,
            message: "Opening hours not verified - please confirm before visiting."
          }
        });
      }
    });
  });
  return issues;
}
