function clone(value) {
  return structuredClone(value);
}

function invalidateDerived(itinerary) {
  delete itinerary.budgetSummary;
  for (const day of itinerary.days) {
    delete day.legs;
    delete day.routeUnavailable;
    delete day.startTime;
    delete day.endTime;
    for (const activity of day.activities) {
      delete activity.scheduledStartTime;
      delete activity.scheduledEndTime;
      delete activity.scheduleShiftMinutes;
    }
  }
}

function activityLocation(issue) {
  const dayMarker = issue.path.indexOf("days");
  const activityMarker = issue.path.indexOf("activities");
  if (dayMarker < 0 || activityMarker < 0) return undefined;
  const dayIndex = Number(issue.path[dayMarker + 1]);
  const activityIndex = Number(issue.path[activityMarker + 1]);
  return Number.isInteger(dayIndex) && Number.isInteger(activityIndex)
    ? { dayIndex, activityIndex }
    : undefined;
}

function removeActivities(itinerary, issues) {
  const removals = issues
    .filter(({ code }) => [
      "MISSING_ATTRACTION_XID",
      "UNKNOWN_ATTRACTION_XID",
      "DUPLICATE_ATTRACTION_XID"
    ].includes(code))
    .map(activityLocation)
    .filter(Boolean)
    .sort((left, right) => right.dayIndex - left.dayIndex || right.activityIndex - left.activityIndex);
  let changed = false;
  for (const { dayIndex, activityIndex } of removals) {
    const activities = itinerary.days[dayIndex]?.activities;
    if (!activities?.[activityIndex] || activities.length <= 1) continue;
    activities.splice(activityIndex, 1);
    changed = true;
  }
  return changed;
}

function repairContinuity(itinerary, issues) {
  let changed = false;
  for (const issue of issues.filter(({ code }) => code === "LOCATION_CONTINUITY_ERROR")) {
    const dayMarker = issue.path.indexOf("days");
    const dayIndex = Number(issue.path[dayMarker + 1]);
    if (dayMarker < 0 || !Number.isInteger(dayIndex) || dayIndex < 1 || !itinerary.days[dayIndex - 1]) continue;
    itinerary.days[dayIndex].startPoint = clone(itinerary.days[dayIndex - 1].endPoint);
    changed = true;
  }
  return changed;
}

function repairScheduleConflicts(itinerary, issues) {
  const affectedDays = new Set(issues
    .filter(({ code }) => code === "TRAVEL_TIME_CONFLICT" || code === "TIME_OVERLAP")
    .map(activityLocation)
    .filter(Boolean)
    .map(({ dayIndex }) => dayIndex));
  let changed = false;
  for (const dayIndex of affectedDays) {
    for (const activity of itinerary.days[dayIndex]?.activities ?? []) {
      if (!activity.scheduledStartTime || activity.plannedStartTime === activity.scheduledStartTime) continue;
      activity.plannedStartTime = activity.scheduledStartTime;
      changed = true;
    }
  }
  return changed;
}

function repairBudget(itinerary, issues) {
  if (!issues.some(({ code }) => code === "BUDGET_EXCEEDED")) return false;
  for (let dayIndex = itinerary.days.length - 1; dayIndex >= 0; dayIndex -= 1) {
    const activities = itinerary.days[dayIndex].activities;
    const optionalIndex = activities.findLastIndex(({ activityType }) => activityType === "ENTERTAINMENT");
    if (optionalIndex >= 0 && activities.length > 1) {
      activities.splice(optionalIndex, 1);
      return true;
    }
  }
  return false;
}

function resequence(itinerary) {
  for (const day of itinerary.days) {
    day.activities.forEach((activity, index) => { activity.sequence = index + 1; });
  }
}

export function deterministicRepair(input, issues) {
  const itinerary = clone(input);
  const regenerationRequiredCodes = [...new Set(issues
    .filter(({ code }) => code === "DAILY_DENSITY_TOO_LOW")
    .map(({ code }) => code))];
  const changed = [
    removeActivities(itinerary, issues),
    repairContinuity(itinerary, issues),
    repairScheduleConflicts(itinerary, issues),
    repairBudget(itinerary, issues)
  ].some(Boolean);
  if (changed) {
    resequence(itinerary);
    invalidateDerived(itinerary);
  }
  return {
    itinerary,
    changed,
    repairedCodes: changed ? [...new Set(issues.map(({ code }) => code))] : [],
    regenerationRequiredCodes
  };
}
