import { randomUUID } from "node:crypto";
import { buildCandidatePool } from "../poi/buildCandidatePool.js";
import { matchPois } from "../poi/matchPois.js";
import { normalizeAmapPoi } from "../poi/normalizeAmapPoi.js";
import { normalizeOpenTripMapPoi } from "../poi/normalizeOpenTripMapPoi.js";
import { calculateItineraryBudget } from "../budget/budgetEngine.js";
import { spendingProfileIds } from "../budget/spendingProfiles.js";
import { planDraft } from "../llm/itineraryHarness.js";
import { targetedLlmRepair } from "../repair/targetedLlmRepair.js";
import { repairUntilValid } from "../repair/repairLoop.js";
import { validateItinerary } from "../validation/validationEngine.js";
import { buildTripLegs } from "./buildTripLegs.js";
import { propagateSchedule } from "./propagateSchedule.js";

function issueFor(error) {
  return {
    code: error?.code ?? "GENERATION_FAILED",
    path: [],
    severity: "ERROR",
    metadata: {}
  };
}

function routeCost(route, { mode }) {
  if (mode === "TAXI") return Math.max(0, Math.round(Number(route.taxiCostCny ?? 0) * 100));
  if (mode === "DRIVE") return Math.max(0, Math.round(Number(route.tollsCny ?? 0) * 100));
  if (mode === "PUBLIC_TRANSIT" || mode === "MIXED") return 300;
  return 0;
}

async function candidatePoolFor(preferences, dependencies) {
  const primaryProvider = dependencies.primaryProvider ?? dependencies.travelProvider;
  const tourismProvider = dependencies.tourismProvider ?? dependencies.travelProvider;
  const retrievedAt = dependencies.now();
  const rawPrimary = await primaryProvider.searchPois({
    city: preferences.destination,
    categories: ["ATTRACTION", "RESTAURANT", "HOTEL"]
  });
  const primary = rawPrimary.map((raw) => normalizeAmapPoi(raw, {
    city: preferences.destination,
    retrievedAt: raw.retrievedAt ?? retrievedAt
  }));
  let supporting = [];
  if (tourismProvider?.enrichTourism && primary[0]) {
    const records = await tourismProvider.enrichTourism({
      city: preferences.destination,
      coordinates: primary[0].coordinates,
      radiusMeters: 50_000
    });
    supporting = records.map((raw) => normalizeOpenTripMapPoi(raw, {
      city: preferences.destination,
      retrievedAt: raw.retrievedAt ?? retrievedAt
    }));
  }
  return buildCandidatePool(preferences, matchPois(primary, supporting));
}

async function drivingDetails(preferences, dependencies) {
  const result = {};
  for (const direction of ["outbound", "return"]) {
    if (preferences[`${direction}TransportMode`] !== "DRIVING" ||
      preferences[`${direction}TransportCostCny`] !== undefined) continue;
    if (!dependencies.resolveDrivingLeg) {
      throw Object.assign(new Error(`${direction} driving route is unavailable.`), { code: "ROUTE_UNAVAILABLE" });
    }
    result[`${direction}Driving`] = await dependencies.resolveDrivingLeg({ direction, preferences });
  }
  return result;
}

function enrichedDimensions(preferences, itinerary, driving) {
  return {
    ...itinerary,
    nights: Math.max(0, itinerary.days.length - 1),
    rooms: Math.ceil(preferences.travellerCount / 2),
    mealCount: itinerary.days.length * 3,
    ...driving
  };
}

async function evaluateDraft(draft, { preferences, candidatePool, dependencies, anchors, references, driving }) {
  const locations = Object.fromEntries(candidatePool.candidates
    .map(({ candidateId, coordinates }) => [candidateId, coordinates]));
  Object.assign(locations, anchors);
  const routed = await buildTripLegs(draft, {
    locations,
    routeProvider: dependencies.routeProvider ?? dependencies.travelProvider,
    mode: preferences.localTransportPreference,
    routeCostResolver: routeCost
  });
  const scheduled = {
    ...routed,
    days: routed.days.map((day, index) => propagateSchedule(day, {
      dayStartTime: index === 0 ? preferences.arrivalDateTime.slice(11, 16) : "08:00"
    }))
  };
  const measurable = enrichedDimensions(preferences, scheduled, driving);
  const budgetSummary = calculateItineraryBudget({
    preferences,
    itinerary: measurable,
    references,
    profile: draft.variant
  });
  const itinerary = { ...measurable, budgetSummary };
  return {
    itinerary,
    summary: budgetSummary,
    validation: validateItinerary({ preferences, itinerary, candidatePool })
  };
}

async function generateVariant(profile, context) {
  try {
    const draft = await planDraft({
      preferences: context.preferences,
      profile,
      candidatePool: context.candidatePool
    }, { provider: context.dependencies.llmProvider });
    return await repairUntilValid({
      itinerary: draft,
      preferences: context.preferences,
      candidatePool: context.candidatePool,
      evaluate: (itinerary) => evaluateDraft(itinerary, context),
      semanticRepair: ({ itinerary, issues, allowedCandidateIds }) => targetedLlmRepair({
        itinerary,
        issues,
        allowedCandidateIds,
        provider: context.dependencies.llmProvider
      })
    });
  } catch (error) {
    return {
      state: "FAILED",
      itinerary: undefined,
      summary: undefined,
      validation: { valid: false, issues: [issueFor(error)] },
      attempts: 0
    };
  }
}

async function save(dependencies, run) {
  if (dependencies.saveRun) await dependencies.saveRun(run);
  return run;
}

export async function generateValidatedTrip(preferences, dependencies) {
  const tripId = randomUUID();
  const runId = randomUUID();
  const startedAt = dependencies.now();
  try {
    const candidatePool = await candidatePoolFor(preferences, dependencies);
    if (!candidatePool.candidates.length) {
      throw Object.assign(new Error("No verified destination candidates are available."), { code: "CANDIDATE_POOL_EMPTY" });
    }
    const [references, anchors, driving] = await Promise.all([
      dependencies.getCostReferences(preferences),
      dependencies.resolveAnchors(preferences),
      drivingDetails(preferences, dependencies)
    ]);
    const context = { preferences, dependencies, candidatePool, references, anchors, driving };
    const variants = await Promise.all(spendingProfileIds.map((profile) => generateVariant(profile, context)));
    const state = variants.every(({ state: variantState }) => variantState === "FINAL_VALIDATED")
      ? "FINAL_VALIDATED"
      : "FAILED";
    const validation = {
      valid: state === "FINAL_VALIDATED",
      issues: variants.flatMap(({ validation: result }) => result.issues)
    };
    const run = {
      id: runId,
      tripId,
      trip: {
        id: tripId,
        destination: preferences.destination,
        startDate: preferences.startDate,
        endDate: preferences.endDate,
        travellerCount: preferences.travellerCount,
        totalBudgetCny: preferences.totalBudgetCny
      },
      state,
      variants,
      validation,
      candidateCount: candidatePool.candidates.length,
      startedAt,
      completedAt: dependencies.now()
    };
    return await save(dependencies, run);
  } catch (error) {
    return await save(dependencies, {
      id: runId,
      tripId,
      trip: {
        id: tripId,
        destination: preferences.destination,
        startDate: preferences.startDate,
        endDate: preferences.endDate,
        travellerCount: preferences.travellerCount,
        totalBudgetCny: preferences.totalBudgetCny
      },
      state: "FAILED",
      variants: [],
      validation: { valid: false, issues: [issueFor(error)] },
      startedAt,
      completedAt: dependencies.now()
    });
  }
}
