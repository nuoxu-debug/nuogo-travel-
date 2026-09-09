function minutes(value) {
  if (!value) return undefined;
  const [hours, mins] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + mins;
}

function requestedDates(preferences) {
  const start = new Date(`${preferences.startDate}T00:00:00.000Z`);
  const end = new Date(`${preferences.endDate}T00:00:00.000Z`);
  const dates = [];
  for (const cursor = start; cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    dates.push(cursor.toISOString().slice(0, 10));
  }
  return dates;
}

function validateDateCoverage(preferences, itinerary) {
  const expectedDates = requestedDates(preferences);
  const actualDates = itinerary.days.map(({ date }) => date);
  const issues = [];
  const firstIndexByDate = new Map();
  actualDates.forEach((date, dayIndex) => {
    if (firstIndexByDate.has(date)) {
      issues.push({
        code: "SCHEDULE_DATE_DUPLICATE",
        path: ["days", dayIndex, "date"],
        severity: "ERROR",
        metadata: { date, firstDayIndex: firstIndexByDate.get(date) }
      });
    } else {
      firstIndexByDate.set(date, dayIndex);
    }
    if (date !== expectedDates[dayIndex]) {
      issues.push({
        code: "SCHEDULE_DATE_ORDER_ERROR",
        path: ["days", dayIndex, "date"],
        severity: "ERROR",
        metadata: { expectedDate: expectedDates[dayIndex], actualDate: date }
      });
    }
  });
  expectedDates.forEach((date) => {
    if (!firstIndexByDate.has(date)) {
      issues.push({
        code: "SCHEDULE_DATE_MISSING",
        path: ["days"],
        severity: "ERROR",
        metadata: { date }
      });
    }
  });
  return issues;
}

export function validateSchedule(preferences, itinerary) {
  const issues = validateDateCoverage(preferences, itinerary);
  itinerary.days.forEach((day, dayIndex) => {
    if (day.date < preferences.startDate || day.date > preferences.endDate) {
      issues.push({ code: "DATE_RANGE_ERROR", path: ["days", dayIndex, "date"], severity: "ERROR", metadata: { date: day.date } });
    }
    const attractionCount = day.activities.filter(({ xid }) => xid).length;
    if (day.routeUnavailable || day.legs?.length !== attractionCount + 1) {
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

  return issues;
}
