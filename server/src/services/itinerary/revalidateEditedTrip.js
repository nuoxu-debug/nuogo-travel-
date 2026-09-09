import { z } from "zod";
import { calculateItineraryBudget } from "../budget/budgetEngine.js";
import { validateItinerary } from "../validation/validationEngine.js";
import { buildTripLegs } from "./buildTripLegs.js";
import { buildVariantProvenance } from "./generateValidatedTrip.js";
import { propagateSchedule } from "./propagateSchedule.js";
import { enrichItineraryPresentation } from "./enrichItineraryPresentation.js";

const groundedTypes = new Set([
  "CULTURE", "HISTORY", "NATURE", "SHOPPING", "ENTERTAINMENT", "FAMILY"
]);
const genericTypes = new Set(["MEAL", "TRANSFER", "ACCOMMODATION", "REST", "DEPARTURE"]);

const editSchema = z.object({
  xid: z.string().trim().min(1).max(160).optional(),
  activityType: z.enum([
    "CULTURE", "HISTORY", "NATURE", "SHOPPING", "ENTERTAINMENT", "FAMILY",
    "MEAL", "TRANSFER", "ACCOMMODATION", "REST", "DEPARTURE"
  ]).optional(),
  plannedStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  plannedDurationMinutes: z.number().int().min(15).max(720).optional()
}).strict().refine((patch) => Object.keys(patch).length > 0, {
  message: "Provide at least one supported itinerary field."
});

function invalidEdit(issues) {
  const error = new Error("The itinerary edit violates the saved trip constraints.");
  error.code = "ITINERARY_EDIT_INVALID";
  error.status = 422;
  error.details = {
    issues,
    issueCodes: [...new Set(issues.map(({ code }) => code))]
  };
  return error;
}

function entryLocation(trip, entryId) {
  const [profile, dayValue, sequenceValue] = String(entryId).split(":");
  const dayNumber = Number(dayValue);
  const sequence = Number(sequenceValue);
  const runs = trip.itineraryRun ? [trip.itineraryRun] : (trip.variants ?? []);
  const variantIndex = runs.findIndex(({ itinerary }) => (itinerary?.travelStyle ?? itinerary?.variant) === profile);
  const variant = runs[variantIndex];
  const dayIndex = variant?.itinerary?.days.findIndex((day) => day.dayNumber === dayNumber) ?? -1;
  const activityIndex = dayIndex < 0 ? -1 : variant.itinerary.days[dayIndex].activities
    .findIndex((activity) => activity.sequence === sequence);
  if (variantIndex < 0 || dayIndex < 0 || activityIndex < 0) return undefined;
  return { variantIndex, dayIndex, activityIndex };
}

function candidatePool(trip) {
  const candidatesById = new Map();
  const runs = trip.itineraryRun ? [trip.itineraryRun] : (trip.variants ?? []);
  for (const variant of runs) {
    for (const day of variant.itinerary?.days ?? []) {
      for (const activity of day.activities ?? []) {
        if (!activity.xid || !activity.poi) continue;
        candidatesById.set(activity.xid, {
          candidateId: activity.xid,
          xid: activity.xid,
          category: "ATTRACTION",
          coordinates: activity.poi.coordinates,
          ...activity.poi
        });
      }
    }
  }
  const candidates = [...candidatesById.values()];
  return { candidates, candidateIds: candidates.map(({ xid }) => xid), candidatesById };
}

function referencesFor(variant) {
  const references = Object.values(variant.summary?.provenance ?? {});
  return [...new Map(references.map((reference) => [reference.id, reference])).values()];
}

function activityCostMinor(type, references, travellerCount) {
  const category = ["CULTURE", "HISTORY", "NATURE", "FAMILY"].includes(type)
    ? "ATTRACTION_PERSON_ENTRY"
    : type === "ENTERTAINMENT"
      ? "ENTERTAINMENT_PERSON_ENTRY"
      : type === "MEAL" ? "FOOD_PERSON_DAY" : undefined;
  return category
    ? (references.find((record) => record.category === category)?.representativeMinor ?? 0) * travellerCount
    : 0;
}

function locationsFor(itinerary, pool) {
  const locations = Object.fromEntries(pool.candidates.map(({ xid, coordinates }) => [xid, coordinates]));
  for (const day of itinerary.days) {
    if (day.startPoint?.coordinates) locations[day.startPoint.locationId] = day.startPoint.coordinates;
    if (day.endPoint?.coordinates) locations[day.endPoint.locationId] = day.endPoint.coordinates;
  }
  return locations;
}

function applyPatch(activity, patch, pool, references, travellerCount) {
  const next = { ...activity, ...patch };
  if (patch.xid !== undefined) {
    const candidate = pool.candidatesById.get(patch.xid);
    if (!candidate) {
      throw invalidEdit([{
        code: "UNKNOWN_ATTRACTION_XID",
        path: ["xid"],
        severity: "ERROR",
        metadata: { xid: patch.xid }
      }]);
    }
    next.poi = {
      canonicalPoiId: candidate.canonicalPoiId,
      name: candidate.name,
      displayName: candidate.displayName,
      description: candidate.description,
      descriptionSourceType: candidate.descriptionSourceType,
      suggestedVisitDurationMinutes: candidate.suggestedVisitDurationMinutes,
      durationSourceType: candidate.durationSourceType,
      city: candidate.city,
      category: candidate.category,
      coordinates: candidate.coordinates,
      address: candidate.address,
      primarySource: candidate.primarySource,
      matchStatus: candidate.matchStatus,
      verificationStatus: candidate.verificationStatus,
      sourceRecords: candidate.sourceRecords
    };
  }
  if (genericTypes.has(next.activityType)) {
    delete next.xid;
    delete next.poi;
    next.sourceType ??= "AI_GENERATED";
  } else if (groundedTypes.has(next.activityType)) {
    if (!next.xid || !next.poi) {
      throw invalidEdit([{
        code: "MISSING_ATTRACTION_XID",
        path: ["xid"],
        severity: "ERROR",
        metadata: {}
      }]);
    }
    delete next.sourceType;
  }
  next.estimatedActivityCostMinor = activityCostMinor(next.activityType, references, travellerCount);
  return next;
}

export function objectiveEntryId(profile, dayNumber, sequence) {
  return `${profile}:${dayNumber}:${sequence}`;
}

export async function revalidateEditedTrip({ trip, entryId, patch }) {
  if (!trip?.objectiveAligned) {
    throw invalidEdit([{ code: "OBJECTIVE_TRIP_REQUIRED", path: [], severity: "ERROR", metadata: {} }]);
  }
  const parsedPatch = editSchema.parse(patch);
  const location = entryLocation(trip, entryId);
  if (!location) {
    const error = new Error("Itinerary entry was not found.");
    error.code = "NOT_FOUND";
    error.status = 404;
    throw error;
  }

  const pool = candidatePool(trip);
  const runs = trip.itineraryRun ? [trip.itineraryRun] : (trip.variants ?? []);
  const variant = structuredClone(runs[location.variantIndex]);
  const references = referencesFor(variant);
  const day = variant.itinerary.days[location.dayIndex];
  day.activities[location.activityIndex] = applyPatch(
    day.activities[location.activityIndex],
    parsedPatch,
    pool,
    references,
    trip.preferences.travellerCount
  );

  const routed = await buildTripLegs(variant.itinerary, {
    locations: locationsFor(variant.itinerary, pool),
    mode: trip.preferences.localTransportPreference ?? "PUBLIC_TRANSIT"
  });
  const scheduled = {
    ...routed,
    days: routed.days.map((item) => propagateSchedule(item, {
      dayStartTime: "09:00"
    }))
  };
  const summary = calculateItineraryBudget({
    preferences: trip.preferences,
    itinerary: scheduled,
    references,
    profile: scheduled.travelStyle ?? scheduled.variant
  });
  const validatedItinerary = { ...scheduled, budgetSummary: summary };
  const validation = validateItinerary({ preferences: trip.preferences, itinerary: validatedItinerary, candidatePool: pool });
  if (!validation.valid) throw invalidEdit(validation.issues);
  const itinerary = enrichItineraryPresentation({
    itinerary: validatedItinerary,
    preferences: trip.preferences,
    summary
  });

  return {
    variant: {
      ...variant,
      state: "FINAL_VALIDATED",
      itinerary,
      summary,
      validation,
      provenance: buildVariantProvenance(itinerary, summary)
    }
  };
}
