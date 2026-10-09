import { haversineDistanceMeters } from "../travel/haversine.js";

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
      "DUPLICATE_ATTRACTION_XID",
      "GENERIC_TRANSFER_ACTIVITY"
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

const attractionTypes = new Set(["CULTURE", "HISTORY", "NATURE", "SHOPPING", "ENTERTAINMENT", "FAMILY"]);
const MEAL_DURATION_MINUTES = 60;
const MEAL_WINDOWS = Object.freeze({
  LUNCH: { start: 11 * 60 + 30, end: 14 * 60, fallback: 12 * 60 + 30, reason: "Lunch opportunity between sightseeing activities." },
  DINNER: { start: 17 * 60 + 30, end: 20 * 60, fallback: 18 * 60 + 30, reason: "Dinner opportunity before evening sightseeing.", allowEveningShift: true }
});

function dayLocation(issue) {
  const dayMarker = issue.path.indexOf("days");
  if (dayMarker < 0) return undefined;
  const dayIndex = Number(issue.path[dayMarker + 1]);
  return Number.isInteger(dayIndex) ? dayIndex : undefined;
}

function candidateId(candidate) {
  return candidate?.xid ?? candidate?.candidateId;
}

function candidateName(candidate) {
  return candidate?.name
    ?? candidate?.displayName?.en
    ?? candidate?.displayName?.zh
    ?? candidateId(candidate);
}

function candidateDuration(candidate, fallback = 90) {
  const duration = Number(candidate?.suggestedVisitDurationMinutes);
  return Number.isFinite(duration) && duration > 0 ? duration : fallback;
}

function usableCandidates(candidatePool) {
  const allowed = new Set(candidatePool?.candidateIds ?? []);
  return (candidatePool?.candidates ?? [])
    .filter((candidate) => {
      const id = candidateId(candidate);
      return id && allowed.has(id) && attractionTypes.has(candidate.category);
    });
}

function candidateById(candidatePool) {
  return new Map((candidatePool?.candidates ?? [])
    .map((candidate) => [candidateId(candidate), candidate])
    .filter(([id]) => Boolean(id)));
}

function issueDayIndexes(issues, codes) {
  return [...new Set(issues
    .filter(({ code }) => codes.has(code))
    .map(dayLocation)
    .filter((dayIndex) => Number.isInteger(dayIndex)))];
}

function pointCoordinates(point, candidates) {
  return point?.coordinates ?? candidates.get(point?.locationId)?.coordinates;
}

function activityCoordinates(activity, candidates) {
  return activity?.poi?.coordinates ?? candidates.get(activity?.xid)?.coordinates;
}

function distanceOrInfinity(from, to) {
  try {
    return haversineDistanceMeters(from, to);
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function repairRouteOrder(itinerary, issues, { candidatePool } = {}) {
  const affectedDays = issueDayIndexes(issues, new Set([
    "LOCATION_CONTINUITY_ERROR",
    "TRAVEL_TIME_CONFLICT",
    "TIME_OVERLAP",
    "POI_CLOSED_AT_SCHEDULED_TIME"
  ]));
  if (!affectedDays.length) return false;

  const candidates = candidateById(candidatePool);
  let changed = false;
  for (const dayIndex of affectedDays) {
    const day = itinerary.days[dayIndex];
    const grounded = (day?.activities ?? [])
      .map((activity, index) => ({ activity, index }))
      .filter(({ activity }) => activity.xid && activityCoordinates(activity, candidates));
    if (grounded.length < 2) continue;

    const remaining = [...grounded];
    const ordered = [];
    let cursor = pointCoordinates(day.startPoint, candidates) ?? activityCoordinates(grounded[0].activity, candidates);
    while (remaining.length) {
      remaining.sort((left, right) =>
        distanceOrInfinity(cursor, activityCoordinates(left.activity, candidates)) -
          distanceOrInfinity(cursor, activityCoordinates(right.activity, candidates)) ||
        left.index - right.index);
      const [next] = remaining.splice(0, 1);
      ordered.push(next.activity);
      cursor = activityCoordinates(next.activity, candidates);
    }

    const originalIds = grounded.map(({ activity }) => activity.xid);
    const orderedIds = ordered.map(({ xid }) => xid);
    if (originalIds.every((id, index) => id === orderedIds[index])) continue;

    let replacementIndex = 0;
    day.activities = day.activities.map((activity) =>
      activity.xid && activityCoordinates(activity, candidates) ? ordered[replacementIndex++] : activity);
    changed = true;
  }
  return changed;
}

function verifiedHourRecordsFor(activity, day, candidatePool) {
  const candidates = candidateById(candidatePool);
  const candidate = candidates.get(activity.xid);
  const poiId = activity.poi?.canonicalPoiId ?? candidate?.canonicalPoiId ?? activity.xid;
  const exceptionRecords = (candidatePool?.operatingHours?.exceptions ?? [])
    .filter((record) => record.poiId === poiId && record.exceptionDate === day.date);
  const records = exceptionRecords.length
    ? exceptionRecords
    : (candidatePool?.operatingHours?.weeklyHours ?? [])
        .filter((record) => record.poiId === poiId && record.dayOfWeek === dayOfWeek(day.date));
  return records.filter(({ status, verificationStatus, isClosed, opensAt, closesAt }) =>
    status === "ACTIVE" &&
    verificationStatus === "VERIFIED" &&
    !isClosed &&
    toMinutes(opensAt) !== undefined &&
    toMinutes(closesAt) !== undefined);
}

function intervalForDuration(records, durationMinutes) {
  return records
    .map((record) => ({ record, opens: toMinutes(record.opensAt), closes: toMinutes(record.closesAt) }))
    .filter(({ opens, closes }) => opens !== undefined && closes !== undefined && closes - opens >= durationMinutes)
    .sort((left, right) => left.opens - right.opens)[0];
}

function intervalForEarliestStart(records, durationMinutes, earliestStart) {
  return records
    .map((record) => ({ record, opens: toMinutes(record.opensAt), closes: toMinutes(record.closesAt) }))
    .filter(({ opens, closes }) =>
      opens !== undefined &&
      closes !== undefined &&
      Math.max(earliestStart, opens) + durationMinutes <= closes)
    .sort((left, right) =>
      Math.max(earliestStart, left.opens) - Math.max(earliestStart, right.opens) ||
      left.opens - right.opens)[0];
}

function orderedReplacementCandidates(candidatePool, currentId) {
  const candidates = usableCandidates(candidatePool);
  const currentIndex = candidates.findIndex((candidate) => candidateId(candidate) === currentId);
  if (currentIndex < 0) return candidates;
  return [...candidates.slice(currentIndex + 1), ...candidates.slice(0, currentIndex)];
}

function orderedCompatibleReplacements(candidatePool, activity) {
  const candidates = candidateById(candidatePool);
  const current = candidates.get(activity.xid);
  const currentCoordinates = activityCoordinates(activity, candidates);
  return orderedReplacementCandidates(candidatePool, activity.xid)
    .map((candidate) => ({
      candidate,
      sameCategory: current?.category && candidate.category === current.category,
      distance: currentCoordinates && candidate.coordinates
        ? distanceOrInfinity(currentCoordinates, candidate.coordinates)
        : Number.POSITIVE_INFINITY
    }))
    .sort((left, right) =>
      Number(right.sameCategory) - Number(left.sameCategory) ||
      left.distance - right.distance)
    .map(({ candidate }) => candidate);
}

function plannedStartForOpenInterval(activity, interval) {
  const duration = Number(activity.plannedDurationMinutes) || 0;
  const scheduledStart = toMinutes(activity.scheduledStartTime);
  const scheduledEnd = toMinutes(activity.scheduledEndTime);
  const plannedStart = toMinutes(activity.plannedStartTime);
  const shift = Number.isFinite(Number(activity.scheduleShiftMinutes))
    ? Number(activity.scheduleShiftMinutes)
    : scheduledStart !== undefined && plannedStart !== undefined
      ? scheduledStart - plannedStart
      : 0;
  const desiredScheduledStart = scheduledEnd !== undefined && scheduledEnd > interval.closes
    ? interval.closes - duration
    : interval.opens;
  return toTime(desiredScheduledStart - shift);
}

function repairUngroundedDays(itinerary, issues, { candidatePool } = {}) {
  const affectedDays = [...new Set([
    ...issues
    .filter(({ code }) => code === "DAY_HAS_NO_GROUNDED_POI_ACTIVITY")
    .map(dayLocation)
    .filter((dayIndex) => Number.isInteger(dayIndex)),
    ...(issues.some(({ code }) => code === "SCHEDULE_DATE_MISSING")
      ? itinerary.days
          .map((day, dayIndex) => (day.activities ?? []).some(({ xid }) => xid) ? undefined : dayIndex)
          .filter((dayIndex) => Number.isInteger(dayIndex))
      : [])
  ])];
  if (affectedDays.length === 0) return false;

  const candidates = usableCandidates(candidatePool);
  if (candidates.length === 0) return false;

  const usedIds = new Set(itinerary.days
    .flatMap((day) => day.activities ?? [])
    .map(({ xid }) => xid)
    .filter(Boolean));
  let changed = false;

  for (const dayIndex of affectedDays) {
    const day = itinerary.days[dayIndex];
    if (!day || (day.activities ?? []).some(({ xid }) => xid)) continue;

    const selected = candidates.find((candidate) => !usedIds.has(candidateId(candidate))) ?? candidates[0];
    const id = candidateId(selected);
    usedIds.add(id);
    const firstActivity = day.activities?.[0];
    const plannedStartTime = firstActivity?.plannedStartTime ?? "09:00";
    const plannedDurationMinutes = candidateDuration(selected);

    day.activities = [
      {
        sequence: 1,
        xid: id,
        activityType: selected.category,
        plannedStartTime,
        plannedDurationMinutes,
        reason: `Visit ${candidateName(selected)} as a grounded Nuogo POI for this day.`
      },
      ...(day.activities ?? [])
    ];
    changed = true;
  }
  return changed;
}

function hasVerifiedHours(candidate, day, candidatePool) {
  return verifiedHourRecordsFor({ xid: candidateId(candidate) }, day, candidatePool).length > 0;
}

function backfillStartTime(day, candidate, candidatePool) {
  const duration = candidateDuration(candidate);
  const interval = intervalForDuration(
    verifiedHourRecordsFor({ xid: candidateId(candidate) }, day, candidatePool),
    duration
  );
  if (hasVerifiedHours(candidate, day, candidatePool) && !interval) return undefined;
  if (interval) return toTime(interval.opens);

  const latestGrounded = [...(day.activities ?? [])]
    .filter(({ xid }) => xid)
    .map(({ plannedStartTime, plannedDurationMinutes }) => ({
      start: toMinutes(plannedStartTime),
      duration: Number(plannedDurationMinutes) || 90
    }))
    .filter(({ start }) => start !== undefined)
    .sort((left, right) => right.start - left.start)[0];
  const nextStart = latestGrounded
    ? latestGrounded.start + latestGrounded.duration + 60
    : 9 * 60;
  return nextStart + duration <= 20 * 60 ? toTime(nextStart) : undefined;
}

function backfillSparseDays(itinerary, issues, { candidatePool } = {}) {
  const densityIssues = issues
    .filter(({ code }) => code === "DAILY_DENSITY_TOO_LOW")
    .map((issue) => ({ issue, dayIndex: dayLocation(issue) }))
    .filter(({ dayIndex }) => Number.isInteger(dayIndex));
  if (!densityIssues.length) return false;

  const candidates = usableCandidates(candidatePool);
  if (!candidates.length) return false;

  const usedIds = new Set(itinerary.days
    .flatMap((day) => day.activities ?? [])
    .map(({ xid }) => xid)
    .filter(Boolean));
  let changed = false;

  for (const { issue, dayIndex } of densityIssues) {
    const day = itinerary.days[dayIndex];
    if (!day) continue;
    const target = Math.max(
      1,
      Number(issue.metadata?.requiredAttractionEntries) ||
        Number(issue.metadata?.requestedDailyAttractionTarget) ||
        3
    );
    while ((day.activities ?? []).filter(({ xid }) => xid).length < target) {
      const selected = candidates
        .filter((candidate) => !usedIds.has(candidateId(candidate)))
        .map((candidate) => ({
          candidate,
          startTime: backfillStartTime(day, candidate, candidatePool),
          verified: hasVerifiedHours(candidate, day, candidatePool)
        }))
        .filter(({ startTime }) => Boolean(startTime))
        .sort((left, right) => Number(right.verified) - Number(left.verified))[0];
      if (!selected) break;

      const id = candidateId(selected.candidate);
      usedIds.add(id);
      day.activities.push({
        sequence: day.activities.length + 1,
        xid: id,
        activityType: selected.candidate.category,
        plannedStartTime: selected.startTime,
        plannedDurationMinutes: candidateDuration(selected.candidate),
        reason: `Visit ${candidateName(selected.candidate)} as an additional grounded Nuogo POI for this day.`
      });
      changed = true;
    }
  }
  return changed;
}

function mealStart(activity) {
  return toMinutes(activity?.plannedStartTime);
}

function activityEnd(activity) {
  const start = toMinutes(activity?.plannedStartTime);
  return start === undefined ? undefined : start + (Number(activity.plannedDurationMinutes) || 0);
}

function hasMealInWindow(day, window) {
  return (day.activities ?? []).some((activity) => {
    if (activity.activityType !== "MEAL") return false;
    const start = mealStart(activity);
    return start !== undefined && start >= window.start && start <= window.end;
  });
}

function mealWindowKey(activity) {
  if (activity?.activityType !== "MEAL") return undefined;
  const start = mealStart(activity);
  if (start === undefined) return undefined;
  if (start >= MEAL_WINDOWS.LUNCH.start && start <= MEAL_WINDOWS.LUNCH.end) return "LUNCH";
  if (start >= MEAL_WINDOWS.DINNER.start && start <= MEAL_WINDOWS.DINNER.end) return "DINNER";
  return undefined;
}

function chooseMealStart(day, window) {
  const busy = (day.activities ?? [])
    .filter((activity) => activity.xid)
    .map((activity) => ({ start: toMinutes(activity.plannedStartTime), end: activityEnd(activity) }))
    .filter(({ start, end }) => start !== undefined && end !== undefined)
    .sort((left, right) => left.start - right.start);
  let cursor = window.start;
  for (const block of busy) {
    if (cursor <= window.end && cursor + MEAL_DURATION_MINUTES <= block.start) return cursor;
    if (window.allowEveningShift && cursor === window.start && block.start >= window.start && block.start <= window.end) {
      return window.start;
    }
    if (block.end > cursor) cursor = block.end;
  }
  if (cursor <= window.end) return cursor;
  return undefined;
}

function normalizeOverlongGroundedDurations(itinerary, issues, { candidatePool } = {}) {
  if (!issues.some(({ code }) => code === "MEAL_CADENCE_MISSING")) return false;
  const candidates = candidateById(candidatePool);
  let changed = false;

  for (const day of itinerary.days ?? []) {
    for (const activity of day.activities ?? []) {
      if (!activity.xid) continue;
      const canonicalDuration = Number(candidates.get(activity.xid)?.suggestedVisitDurationMinutes);
      const plannedDuration = Number(activity.plannedDurationMinutes);
      if (!Number.isFinite(canonicalDuration) || !Number.isFinite(plannedDuration)) continue;
      if (canonicalDuration <= 0) continue;
      if (plannedDuration <= canonicalDuration) continue;
      activity.plannedDurationMinutes = canonicalDuration;
      changed = true;
    }
  }

  return changed;
}

function repairMealCadence(itinerary, issues) {
  const mealIssues = issues
    .filter(({ code }) => code === "MEAL_CADENCE_MISSING")
    .map((issue) => ({ issue, dayIndex: dayLocation(issue) }))
    .filter(({ dayIndex }) => Number.isInteger(dayIndex));
  if (!mealIssues.length) return false;

  let changed = false;
  for (const { issue, dayIndex } of mealIssues) {
    const day = itinerary.days[dayIndex];
    if (!day?.activities?.length) continue;
    const availableMinutes = Number(issue.metadata?.availableMinutes);
    if (Number.isFinite(availableMinutes) && availableMinutes < 5 * 60) continue;
    const meal = issue.metadata?.meal === "DINNER" ? "DINNER" : "LUNCH";
    const window = MEAL_WINDOWS[meal];
    if (hasMealInWindow(day, window)) continue;
    const start = chooseMealStart(day, window);
    if (start === undefined) continue;
    day.activities.push({
      sequence: day.activities.length + 1,
      activityType: "MEAL",
      sourceType: "AI_GENERATED",
      plannedStartTime: toTime(start),
      plannedDurationMinutes: MEAL_DURATION_MINUTES,
      reason: window.reason
    });
    day.activities.sort((left, right) =>
      (toMinutes(left.plannedStartTime) ?? 0) - (toMinutes(right.plannedStartTime) ?? 0));
    changed = true;
  }
  return changed;
}

function reduceOverlongSightseeingDays(itinerary, issues) {
  const affectedDays = issueDayIndexes(issues, new Set(["DAILY_DURATION_EXCEEDED"]));
  let changed = false;
  for (const dayIndex of affectedDays) {
    const day = itinerary.days[dayIndex];
    if (!day?.activities?.length) continue;
    const plannedMinutes = (day.activities ?? []).reduce((sum, activity) =>
      sum + (Number(activity.plannedDurationMinutes) || 0), 0) +
      (day.legs ?? []).reduce((sum, leg) =>
        sum + (Number(leg.durationMinutes) || 0), 0);
    if (plannedMinutes <= 12 * 60) continue;
    const grounded = day.activities
      .map((activity, index) => ({ activity, index, start: toMinutes(activity.plannedStartTime) ?? 0 }))
      .filter(({ activity }) => activity.xid)
      .sort((left, right) => right.start - left.start || right.index - left.index);
    if (grounded.length <= 1) continue;
    day.activities.splice(grounded[0].index, 1);
    changed = true;
  }
  return changed;
}

const removableGenericTypes = new Set(["REST", "FREE_TIME", "LEISURE", "TRANSFER", "ACCOMMODATION"]);

function trimGenericFiller(itinerary, issues) {
  const affectedDays = issueDayIndexes(issues, new Set([
    "DAILY_DURATION_EXCEEDED",
    "DAILY_DENSITY_TOO_LOW",
    "TRAVEL_TIME_CONFLICT",
    "TIME_OVERLAP",
    "POI_CLOSED_AT_SCHEDULED_TIME"
  ]));
  let changed = false;

  for (const dayIndex of affectedDays) {
    const day = itinerary.days[dayIndex];
    if (!day?.activities?.length) continue;
    const groundedCount = day.activities.filter(({ xid }) => xid).length;
    if (groundedCount < 2) continue;

    const keptMealWindows = new Set();
    const next = day.activities.filter((activity) => {
      if (activity.xid) return true;
      if (removableGenericTypes.has(activity.activityType)) return false;
      if (activity.activityType === "MEAL") {
        const windowKey = mealWindowKey(activity);
        if (!windowKey || keptMealWindows.has(windowKey)) return false;
        keptMealWindows.add(windowKey);
        return true;
      }
      return true;
    });
    if (next.length !== day.activities.length) {
      day.activities = next;
      changed = true;
    }
  }
  return changed;
}

function earliestVerifiedOpening(activity, day, candidatePool) {
  const interval = intervalForDuration(
    verifiedHourRecordsFor(activity, day, candidatePool),
    Number(activity.plannedDurationMinutes) || 90
  );
  return interval ?? { opens: 9 * 60, closes: 20 * 60 };
}

function compactDenseDaySchedules(itinerary, issues, { candidatePool, preferences } = {}) {
  const compactTriggerCodes = new Set([
    "TRAVEL_TIME_CONFLICT",
    "TIME_OVERLAP",
    "DAILY_DURATION_EXCEEDED",
    "POI_CLOSED_AT_SCHEDULED_TIME",
    "DAILY_DENSITY_TOO_LOW"
  ]);
  const affectedDays = issueDayIndexes(issues, compactTriggerCodes);
  const forceCompactDays = new Set(issueDayIndexes(issues, new Set([
    "DAILY_DURATION_EXCEEDED",
    "DAILY_DENSITY_TOO_LOW",
    "POI_CLOSED_AT_SCHEDULED_TIME"
  ])));
  let changed = false;

  for (const dayIndex of affectedDays) {
    const day = itinerary.days[dayIndex];
    if (!day?.activities?.length) continue;
    const grounded = day.activities.filter(({ xid }) => xid);
    if (grounded.length < 3) continue;
    const hasLateGroundedTime = grounded.some((activity) =>
      (toMinutes(activity.plannedStartTime) ?? 0) >= 20 * 60 ||
      (toMinutes(activity.scheduledEndTime) ?? 0) > 20 * 60);
    if (!forceCompactDays.has(dayIndex) && !hasLateGroundedTime) continue;

    const orderedGrounded = [...grounded].sort((left, right) => {
      const leftInterval = earliestVerifiedOpening(left, day, candidatePool);
      const rightInterval = earliestVerifiedOpening(right, day, candidatePool);
      return leftInterval.closes - rightInterval.closes ||
        leftInterval.opens - rightInterval.opens ||
        String(left.xid).localeCompare(String(right.xid));
    });

    const legMatchesOrder = Array.isArray(day.legs) &&
      day.legs.length === orderedGrounded.length + 1 &&
      day.legs.every((leg, index) => {
        if (index === 0) return leg.toLocationId === orderedGrounded[0].xid;
        if (index === orderedGrounded.length) return leg.fromLocationId === orderedGrounded.at(-1).xid;
        return leg.fromLocationId === orderedGrounded[index - 1].xid &&
          leg.toLocationId === orderedGrounded[index].xid;
      });
    const legDurations = legMatchesOrder
      ? day.legs.map(({ durationMinutes }) => Number(durationMinutes) || 45)
      : [];
    let cursor = dayStartMinutes(dayIndex, preferences) + (legDurations[0] ?? 0);
    const scheduledGrounded = orderedGrounded.map((activity, index) => {
      const interval = earliestVerifiedOpening(activity, day, candidatePool);
      const duration = Number(activity.plannedDurationMinutes) || 90;
      const start = Math.max(cursor, interval.opens);
      cursor = start + duration + (legDurations[index + 1] ?? 45);
      return { ...activity, plannedStartTime: toTime(start), plannedDurationMinutes: duration };
    });

    const meals = day.activities
      .filter((activity) => !activity.xid && activity.activityType === "MEAL" && mealWindowKey(activity))
      .map((meal) => ({
        ...meal,
        plannedDurationMinutes: Math.min(Number(meal.plannedDurationMinutes) || 60, 60)
      }));
    const nextActivities = [...scheduledGrounded, ...meals]
      .sort((left, right) => (toMinutes(left.plannedStartTime) ?? 0) - (toMinutes(right.plannedStartTime) ?? 0));

    if (JSON.stringify(day.activities.map(({ xid, activityType, plannedStartTime }) => [xid, activityType, plannedStartTime])) !==
      JSON.stringify(nextActivities.map(({ xid, activityType, plannedStartTime }) => [xid, activityType, plannedStartTime]))) {
      day.activities = nextActivities;
      changed = true;
    }
  }
  return changed;
}

function routeLegDurationsForCurrentOrder(day) {
  const grounded = (day.activities ?? []).filter(({ xid }) => xid);
  if (!Array.isArray(day.legs) || day.legs.length !== grounded.length + 1) return undefined;
  const matchesOrder = day.legs.every((leg, index) => {
    if (index === 0) return leg.toLocationId === grounded[0]?.xid;
    if (index === grounded.length) return leg.fromLocationId === grounded.at(-1)?.xid;
    return leg.fromLocationId === grounded[index - 1]?.xid &&
      leg.toLocationId === grounded[index]?.xid;
  });
  if (!matchesOrder) return undefined;
  return day.legs.map(({ durationMinutes }) => Number(durationMinutes) || 0);
}

function activityScheduleSignature(day) {
  return JSON.stringify((day.activities ?? []).map((activity) => [
    activity.xid ?? null,
    activity.activityType ?? null,
    activity.plannedStartTime ?? null,
    Number(activity.plannedDurationMinutes) || 0
  ]));
}

function preferenceTimeMinutes(value) {
  const match = /T(\d{2}):(\d{2})/.exec(value ?? "");
  return match ? Number(match[1]) * 60 + Number(match[2]) : undefined;
}

function dayStartMinutes(dayIndex, preferences = {}) {
  const base = 9 * 60;
  if (dayIndex !== 0) return base;
  return Math.max(base, preferenceTimeMinutes(preferences.arrivalDateTime) ?? base);
}

function rebuildDaySchedule(day, candidatePool, { dayStart = 9 * 60 } = {}) {
  const before = activityScheduleSignature(day);
  const legDurations = routeLegDurationsForCurrentOrder(day);
  let cursor = dayStart;
  let legIndex = 0;

  day.activities = (day.activities ?? []).map((activity) => {
    const duration = Number(activity.plannedDurationMinutes) || 90;
    let start;
    if (activity.xid) {
      const hasKnownRoute = Array.isArray(legDurations);
      const travelMinutes = hasKnownRoute
        ? legDurations[legIndex]
        : legIndex === 0
          ? 0
          : 45;
      const earliest = cursor + (Number(travelMinutes) || 0);
      const verifiedInterval = intervalForEarliestStart(
        verifiedHourRecordsFor(activity, day, candidatePool),
        duration,
        earliest
      );
      if (verifiedInterval) {
        start = Math.max(earliest, verifiedInterval.opens);
      } else {
        const scheduledStart = toMinutes(activity.scheduledStartTime);
        start = scheduledStart !== undefined && !hasKnownRoute
          ? Math.max(scheduledStart, earliest)
          : earliest;
      }
      legIndex += 1;
    } else {
      const plannedStart = toMinutes(activity.plannedStartTime);
      const scheduledStart = toMinutes(activity.scheduledStartTime);
      const mealWindow = mealWindowKey(activity);
      if (activity.activityType === "MEAL" && mealWindow) {
        const window = MEAL_WINDOWS[mealWindow];
        if (plannedStart !== undefined && plannedStart >= cursor) {
          start = plannedStart;
        } else if (cursor <= window.end) {
          start = Math.max(cursor, window.start);
        } else {
          start = plannedStart ?? cursor;
        }
      } else {
        start = Math.max(cursor, scheduledStart ?? plannedStart ?? cursor);
      }
    }

    cursor = start + duration;
    return {
      ...activity,
      plannedStartTime: toTime(start),
      plannedDurationMinutes: duration
    };
  });

  return activityScheduleSignature(day) !== before;
}

function rebuildAffectedDaySchedules(itinerary, issues, { candidatePool, preferences } = {}) {
  const scheduleTriggerCodes = new Set([
    "TRAVEL_TIME_CONFLICT",
    "TIME_OVERLAP",
    "DAILY_DURATION_EXCEEDED",
    "POI_CLOSED_AT_SCHEDULED_TIME"
  ]);
  const affectedDays = issueDayIndexes(issues, scheduleTriggerCodes);
  let changed = false;
  for (const dayIndex of affectedDays) {
    const day = itinerary.days[dayIndex];
    if (!day?.activities?.length) continue;
    changed = rebuildDaySchedule(day, candidatePool, {
      dayStart: dayStartMinutes(dayIndex, preferences)
    }) || changed;
  }
  return changed;
}

function toMinutes(value) {
  if (!value) return undefined;
  const [hours, minutes] = String(value).slice(0, 5).split(":").map(Number);
  return Number.isInteger(hours) && Number.isInteger(minutes) ? hours * 60 + minutes : undefined;
}

function toTime(value) {
  const bounded = Math.max(0, Math.min((24 * 60) - 1, Math.trunc(value)));
  const hours = Math.floor(bounded / 60);
  const minutes = bounded % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function dayOfWeek(date) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.getUTCDay();
}

function requestedDates(preferences = {}) {
  if (!preferences.startDate || !preferences.endDate) return [];
  const start = new Date(`${preferences.startDate}T00:00:00.000Z`);
  const end = new Date(`${preferences.endDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const dates = [];
  for (const cursor = start; cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    dates.push(cursor.toISOString().slice(0, 10));
  }
  return dates;
}

function repairMissingDays(itinerary, issues, { preferences } = {}) {
  if (!issues.some(({ code }) => code === "SCHEDULE_DATE_MISSING")) return false;
  const dates = requestedDates(preferences ?? itinerary.trip);
  if (!dates.length) return false;
  const byDate = new Map((itinerary.days ?? []).map((day) => [day.date, day]));
  let changed = false;
  const days = dates.map((date, index) => {
    const existing = byDate.get(date);
    if (existing) return { ...existing, dayNumber: index + 1 };
    changed = true;
    return {
      dayNumber: index + 1,
      date,
      startPoint: { locationId: "hotel", locationType: "HOTEL" },
      activities: [],
      endPoint: { locationId: "hotel", locationType: "HOTEL" }
    };
  });
  if (changed) itinerary.days = days;
  return changed;
}

function repairClosedPois(itinerary, issues, { candidatePool } = {}) {
  if (issues.some(({ code }) => code === "TRAVEL_TIME_CONFLICT" || code === "TIME_OVERLAP")) {
    return false;
  }
  const locations = issues
    .filter(({ code }) => code === "POI_CLOSED_AT_SCHEDULED_TIME" || code === "POI_OPENING_HOURS_UNVERIFIED")
    .map((issue) => ({ ...activityLocation(issue), code: issue.code }))
    .filter(({ dayIndex, activityIndex }) => Number.isInteger(dayIndex) && Number.isInteger(activityIndex));
  if (!locations.length) return false;

  const usedIds = new Set(itinerary.days
    .flatMap((day) => day.activities ?? [])
    .map(({ xid }) => xid)
    .filter(Boolean));
  let changed = false;

  for (const { dayIndex, activityIndex, code } of locations) {
    const day = itinerary.days[dayIndex];
    const activity = day?.activities?.[activityIndex];
    if (!activity?.xid) continue;

    const interval = intervalForDuration(
      verifiedHourRecordsFor(activity, day, candidatePool),
      activity.plannedDurationMinutes
    );
    if (interval) {
      const nextStart = plannedStartForOpenInterval(activity, interval);
      if (activity.plannedStartTime !== nextStart) {
        activity.plannedStartTime = nextStart;
        changed = true;
      }
      const scheduledEnd = toMinutes(activity.scheduledEndTime);
      if (scheduledEnd !== undefined && scheduledEnd > interval.closes) {
        const firstGroundedIndex = day.activities.findIndex(({ xid }) => xid);
        if (firstGroundedIndex >= 0 && activityIndex > firstGroundedIndex) {
          const [entry] = day.activities.splice(activityIndex, 1);
          day.activities.splice(firstGroundedIndex, 0, entry);
          changed = true;
        }
      }
      continue;
    }

    const replacementCandidates = code === "POI_OPENING_HOURS_UNVERIFIED"
      ? orderedCompatibleReplacements(candidatePool, activity)
      : orderedReplacementCandidates(candidatePool, activity.xid);
    const replacement = replacementCandidates
      .find((candidate) => {
        const id = candidateId(candidate);
        if (!id || usedIds.has(id)) return false;
        const replacementInterval = intervalForDuration(
          verifiedHourRecordsFor({ ...activity, xid: id }, day, candidatePool),
          activity.plannedDurationMinutes
        );
        return Boolean(replacementInterval);
      });
    if (!replacement) continue;

    const replacementInterval = intervalForDuration(
      verifiedHourRecordsFor({ ...activity, xid: candidateId(replacement) }, day, candidatePool),
      activity.plannedDurationMinutes
    );
    day.activities[activityIndex] = {
      ...activity,
      xid: candidateId(replacement),
      activityType: replacement.category,
      plannedStartTime: plannedStartForOpenInterval(activity, replacementInterval),
      reason: `Visit ${candidateName(replacement)} as a verified-open replacement grounded Nuogo POI.`
    };
    usedIds.delete(activity.xid);
    usedIds.add(candidateId(replacement));
    changed = true;
  }
  return changed;
}

function resequence(itinerary) {
  for (const day of itinerary.days) {
    day.activities.forEach((activity, index) => { activity.sequence = index + 1; });
  }
}

function syncDayTitles(itinerary, candidatePool) {
  const candidates = candidateById(candidatePool);
  for (const day of itinerary.days ?? []) {
    const names = (day.activities ?? [])
      .filter(({ xid }) => xid)
      .map((activity) => candidateName(candidates.get(activity.xid)) ?? activity.poi?.name)
      .filter(Boolean);
    if (!names.length) continue;
    day.title = names.length === 1 ? names[0] : `${names[0]} and ${names[1]}`;
  }
}

export function deterministicRepair(input, issues, options = {}) {
  const itinerary = clone(input);
  const semanticRepairCodes = new Set([
    "DAILY_DENSITY_TOO_LOW",
    "DAY_HAS_NO_GROUNDED_POI_ACTIVITY",
    "GENERIC_PREFIX_TOO_LONG",
    "DAY_STARTS_WITH_WEAK_GENERIC_ENTRY",
    "GENERIC_TRANSFER_ACTIVITY",
    "BROAD_AREA_USED_AS_ATTRACTION",
    "NEAR_DUPLICATE_ADJACENT_POI"
  ]);
  const regenerationRequiredCodes = [...new Set(issues
    .filter(({ code }) => semanticRepairCodes.has(code))
    .map(({ code }) => code))];
  const changed = [
    repairMissingDays(itinerary, issues, options),
    removeActivities(itinerary, issues),
    repairUngroundedDays(itinerary, issues, options),
    repairRouteOrder(itinerary, issues, options),
    repairContinuity(itinerary, issues),
    repairClosedPois(itinerary, issues, options),
    backfillSparseDays(itinerary, issues, options),
    normalizeOverlongGroundedDurations(itinerary, issues, options),
    repairMealCadence(itinerary, issues),
    trimGenericFiller(itinerary, issues),
    reduceOverlongSightseeingDays(itinerary, issues),
    compactDenseDaySchedules(itinerary, issues, options),
    rebuildAffectedDaySchedules(itinerary, issues, options),
    repairBudget(itinerary, issues)
  ].some(Boolean);
  if (changed) {
    resequence(itinerary);
    syncDayTitles(itinerary, options.candidatePool);
    invalidateDerived(itinerary);
  }
  return {
    itinerary,
    changed,
    repairedCodes: changed ? [...new Set(issues.map(({ code }) => code))] : [],
    regenerationRequiredCodes
  };
}
