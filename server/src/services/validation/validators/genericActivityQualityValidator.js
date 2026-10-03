const GENERIC_ACTIVITY_TYPES = new Set(["MEAL", "TRANSFER", "ACCOMMODATION", "REST", "DEPARTURE"]);
const WEAK_START_TYPES = new Set(["REST", "TRANSFER", "ACCOMMODATION", "DEPARTURE"]);
const LUNCH_START = 11 * 60 + 30;
const LUNCH_END = 14 * 60;
const DINNER_START = 17 * 60 + 30;
const DINNER_END = 20 * 60;

function isGenericActivity(activity) {
  return GENERIC_ACTIVITY_TYPES.has(activity?.activityType);
}

function toMinutes(value) {
  if (!value) return undefined;
  const [hours, minutes] = String(value).slice(0, 5).split(":").map(Number);
  return Number.isInteger(hours) && Number.isInteger(minutes) ? hours * 60 + minutes : undefined;
}

function activityEnd(activity) {
  const start = toMinutes(activity.plannedStartTime);
  const duration = Number(activity.plannedDurationMinutes) || 0;
  return start === undefined ? undefined : start + duration;
}

function hasMealInWindow(activities, start, end) {
  return activities.some((activity) => {
    if (activity.activityType !== "MEAL") return false;
    const mealStart = toMinutes(activity.plannedStartTime);
    return mealStart !== undefined && mealStart >= start && mealStart <= end;
  });
}

function mealCadenceIssues(day, dayIndex, activities) {
  const grounded = activities
    .filter(({ xid }) => xid)
    .map((activity) => ({
      start: toMinutes(activity.plannedStartTime),
      end: activityEnd(activity)
    }))
    .filter(({ start, end }) => start !== undefined && end !== undefined);
  if (!grounded.length) return [];

  const earliest = Math.min(...grounded.map(({ start }) => start));
  const latest = Math.max(...grounded.map(({ end }) => end));
  const issues = [];
  if (earliest <= LUNCH_START && latest >= LUNCH_END && !hasMealInWindow(activities, LUNCH_START, LUNCH_END)) {
    issues.push({
      code: "MEAL_CADENCE_MISSING",
      path: ["days", dayIndex, "activities"],
      severity: "ERROR",
      metadata: {
        meal: "LUNCH",
        windowStart: "11:30",
        windowEnd: "14:00",
        reason: "FULL_SIGHTSEEING_DAY_REQUIRES_LUNCH_OPPORTUNITY"
      }
    });
  }
  if (latest >= DINNER_START && !hasMealInWindow(activities, DINNER_START, DINNER_END)) {
    issues.push({
      code: "MEAL_CADENCE_MISSING",
      path: ["days", dayIndex, "activities"],
      severity: "ERROR",
      metadata: {
        meal: "DINNER",
        windowStart: "17:30",
        windowEnd: "20:00",
        reason: "EVENING_SIGHTSEEING_DAY_REQUIRES_DINNER_OPPORTUNITY"
      }
    });
  }
  return issues;
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

    return [
      ...issues,
      ...mealCadenceIssues(day, dayIndex, activities)
    ];
  });
}
