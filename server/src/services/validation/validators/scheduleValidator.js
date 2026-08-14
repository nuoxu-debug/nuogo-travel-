function minutes(value) {
  if (!value) return undefined;
  const [hours, mins] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + mins;
}

export function validateSchedule(preferences, itinerary) {
  const issues = [];
  itinerary.days.forEach((day, dayIndex) => {
    if (day.date < preferences.startDate || day.date > preferences.endDate) {
      issues.push({ code: "DATE_RANGE_ERROR", path: ["days", dayIndex, "date"], severity: "ERROR", metadata: { date: day.date } });
    }
    if (day.routeUnavailable || day.legs?.length !== day.activities.length + 1) {
      issues.push({ code: "ROUTE_UNAVAILABLE", path: ["days", dayIndex, "legs"], severity: "ERROR", metadata: day.routeUnavailable ?? {} });
    }
    day.activities.forEach((activity, activityIndex) => {
      if (activity.scheduleShiftMinutes > 0) {
        issues.push({
          code: "TRAVEL_TIME_CONFLICT",
          path: ["days", dayIndex, "activities", activityIndex, "plannedStartTime"],
          severity: "ERROR",
          metadata: { shiftMinutes: activity.scheduleShiftMinutes }
        });
      }
    });
    for (let index = 1; index < day.activities.length; index += 1) {
      const previousEnd = minutes(day.activities[index - 1].scheduledEndTime);
      const nextStart = minutes(day.activities[index].scheduledStartTime);
      if (previousEnd !== undefined && nextStart !== undefined && nextStart < previousEnd) {
        issues.push({ code: "TIME_OVERLAP", path: ["days", dayIndex, "activities", index], severity: "ERROR", metadata: {} });
      }
    }
    const plannedDuration = day.activities.reduce((sum, activity) => sum + activity.plannedDurationMinutes, 0) +
      (day.legs ?? []).reduce((sum, leg) => sum + leg.durationMinutes, 0);
    if (plannedDuration > 720) {
      issues.push({ code: "DAILY_DURATION_EXCEEDED", path: ["days", dayIndex], severity: "ERROR", metadata: { durationMinutes: plannedDuration, maximumMinutes: 720 } });
    }
  });

  const first = itinerary.days[0]?.activities[0];
  if (first && minutes(first.scheduledStartTime ?? first.plannedStartTime) < minutes(preferences.arrivalDateTime.slice(11, 16))) {
    issues.push({ code: "ARRIVAL_CONSTRAINT_VIOLATION", path: ["days", 0, "activities", 0], severity: "ERROR", metadata: {} });
  }
  const lastDay = itinerary.days.at(-1);
  const lastTime = minutes(lastDay?.endTime ?? lastDay?.activities.at(-1)?.scheduledEndTime);
  if (lastTime !== undefined && lastTime > minutes(preferences.departureDateTime.slice(11, 16))) {
    issues.push({ code: "DEPARTURE_CONSTRAINT_VIOLATION", path: ["days", itinerary.days.length - 1], severity: "ERROR", metadata: {} });
  }
  return issues;
}
