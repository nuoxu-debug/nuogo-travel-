const DAY_START_MINUTES = 8 * 60;
const DAY_END_MINUTES = 20 * 60;
const FULL_DAY_MINUTES = 8 * 60;
const MEDIUM_DAY_MINUTES = 5 * 60;
const LONG_ATTRACTION_MINUTES = 4 * 60;

function timeMinutes(value) {
  const match = /T(\d{2}):(\d{2})/.exec(value ?? "");
  return match ? Number(match[1]) * 60 + Number(match[2]) : undefined;
}

function availableMinutes(preferences, dayIndex, dayCount) {
  let start = DAY_START_MINUTES;
  let end = DAY_END_MINUTES;
  if (dayIndex === 0) start = Math.max(start, timeMinutes(preferences.arrivalDateTime) ?? start);
  if (dayIndex === dayCount - 1) end = Math.min(end, timeMinutes(preferences.departureDateTime) ?? end);
  return Math.max(0, end - start);
}

function isSlowPace(preferences, itinerary) {
  return [preferences.pace, itinerary.pace]
    .some((pace) => ["SLOW", "RELAXED"].includes(String(pace).toUpperCase()));
}

function attractionEntries(day, candidatePool) {
  const allowed = new Set(candidatePool.candidateIds);
  return day.activities.filter(({ xid }) => xid && allowed.has(xid));
}

function requirementsFor(available) {
  if (available >= FULL_DAY_MINUTES) {
    return {
      meaningfulEntries: 3,
      attractionEntries: 2,
      reason: "FULL_DAY_REQUIRES_THREE_MEANINGFUL_ENTRIES_AND_TWO_ATTRACTIONS"
    };
  }
  if (available >= MEDIUM_DAY_MINUTES) {
    return {
      meaningfulEntries: 2,
      attractionEntries: 0,
      reason: "MEDIUM_DAY_REQUIRES_TWO_MEANINGFUL_ENTRIES"
    };
  }
  return undefined;
}

function hasVerifiedCandidateScarcity(candidatePool, requirementsByDay) {
  const candidates = candidatePool.candidates ?? [];
  const requiredMeaningfulEntries = requirementsByDay
    .reduce((total, requirements) => total + requirements.meaningfulEntries, 0);
  const requiredAttractionEntries = requirementsByDay
    .reduce((total, requirements) => total + requirements.attractionEntries, 0);
  const attractionCandidates = candidates.length > 0
    ? candidates.filter(({ category }) => category === "ATTRACTION").length
    : candidatePool.candidateIds.length;
  return candidatePool.candidateIds.length < requiredMeaningfulEntries ||
    attractionCandidates < requiredAttractionEntries;
}

export function validateDailyDensity({ preferences, itinerary, candidatePool }) {
  if (isSlowPace(preferences, itinerary)) return [];
  const days = itinerary.days.map((day, dayIndex) => ({
    day,
    dayIndex,
    available: availableMinutes(preferences, dayIndex, itinerary.days.length),
    requirements: requirementsFor(availableMinutes(preferences, dayIndex, itinerary.days.length))
  }));
  const applicableRequirements = days.flatMap(({ requirements }) => requirements ? [requirements] : []);
  if (hasVerifiedCandidateScarcity(candidatePool, applicableRequirements)) return [];
  return days.flatMap(({ day, dayIndex, available, requirements }) => {
    if (!requirements) return [];
    const attractions = attractionEntries(day, candidatePool);
    const meaningfulEntries = day.activities.length;
    if (meaningfulEntries >= requirements.meaningfulEntries && attractions.length >= requirements.attractionEntries) return [];
    if (attractions.some(({ plannedDurationMinutes }) => plannedDurationMinutes >= LONG_ATTRACTION_MINUTES)) return [];
    return [{
      code: "DAILY_DENSITY_TOO_LOW",
      path: ["days", dayIndex, "activities"],
      severity: "ERROR",
      metadata: {
        availableMinutes: available,
        meaningfulEntries,
        attractionEntries: attractions.length,
        reason: requirements.reason
      }
    }];
  });
}
