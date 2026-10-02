const GENERIC_ACTIVITY_TYPES = new Set(["MEAL", "TRANSFER", "ACCOMMODATION", "REST", "DEPARTURE"]);
const WEAK_START_TYPES = new Set(["REST", "TRANSFER", "ACCOMMODATION", "DEPARTURE"]);

function isGenericActivity(activity) {
  return GENERIC_ACTIVITY_TYPES.has(activity?.activityType);
}

export function validateGenericActivityQuality(itinerary) {
  return (itinerary.days ?? []).flatMap((day, dayIndex) => {
    const activities = day.activities ?? [];
    const issues = [];
    const firstAttractionIndex = activities.findIndex((activity) => activity.xid);

    if (activities.length > 0 && firstAttractionIndex < 0) {
      issues.push({
        code: "DAY_HAS_NO_GROUNDED_POI_ACTIVITY",
        path: ["days", dayIndex, "activities"],
        severity: "ERROR",
        metadata: {
          genericActivityCount: activities.filter(isGenericActivity).length,
          reason: "DAY_MUST_INCLUDE_AT_LEAST_ONE_SOURCE_GROUNDED_POI"
        }
      });
    }

    activities.forEach((activity, activityIndex) => {
      if (activity.activityType === "TRANSFER") {
        issues.push({
          code: "GENERIC_TRANSFER_ACTIVITY",
          path: ["days", dayIndex, "activities", activityIndex],
          severity: "ERROR",
          metadata: {
            activityType: "TRANSFER",
            reason: "TRANSPORT_BELONGS_TO_ROUTE_LEGS"
          }
        });
      }
    });

    if (firstAttractionIndex > 1 && activities.slice(0, firstAttractionIndex).every(isGenericActivity)) {
      issues.push({
        code: "GENERIC_PREFIX_TOO_LONG",
        path: ["days", dayIndex, "activities"],
        severity: "ERROR",
        metadata: {
          firstAttractionIndex,
          maximumGenericEntriesBeforeAttraction: 1,
          reason: "DAY_SHOULD_REACH_A_GROUNDED_POI_BEFORE_GENERIC_FILLER"
        }
      });
    }

    const firstActivity = activities[0];
    if (firstAttractionIndex > 0 && WEAK_START_TYPES.has(firstActivity?.activityType)) {
      issues.push({
        code: "DAY_STARTS_WITH_WEAK_GENERIC_ENTRY",
        path: ["days", dayIndex, "activities", 0],
        severity: "ERROR",
        metadata: {
          activityType: firstActivity.activityType,
          reason: "DAY_SHOULD_START_WITH_A_GROUNDED_POI_OR_A_NECESSARY_MEAL"
        }
      });
    }

    return issues;
  });
}
