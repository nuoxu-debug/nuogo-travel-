import { randomUUID } from "node:crypto";
import { getDestinationDiscoveryContent } from "@nuogo/shared/destination-discovery";
import { buildCandidatePool } from "../poi/buildCandidatePool.js";
import { resolveAttractionPreferences } from "../poi/resolveAttractionPreferences.js";
import { calculateItineraryBudget } from "../budget/budgetEngine.js";
import { buildProfileBudgetContext, countAvailableMeals } from "../budget/profileBudget.js";
import { getSpendingProfile } from "../budget/spendingProfiles.js";
import { planDraft } from "../llm/itineraryHarness.js";
import { targetedLlmRepair } from "../repair/targetedLlmRepair.js";
import { repairUntilValid } from "../repair/repairLoop.js";
import { validateItinerary } from "../validation/validationEngine.js";
import { buildTripLegs } from "./buildTripLegs.js";
import { buildVariantMetrics } from "./buildVariantMetrics.js";
import { propagateSchedule } from "./propagateSchedule.js";
import { buildProfilePlan } from "./profilePrePlanner.js";
import { buildRainyDayBackups } from "./rainyDayBackup.js";
import { reconcileSelectedAttractions } from "./reconcileSelectedAttractions.js";
import { buildSelectedAttractionOutcome } from "./selectedAttractionOutcome.js";
import { enrichItineraryPresentation } from "./enrichItineraryPresentation.js";

function issueFor(error) {
  return {
    code: error?.code ?? "GENERATION_FAILED",
    path: [],
    severity: "ERROR",
    metadata: {}
  };
}

async function candidatePoolFor(preferences, dependencies) {
  if (!dependencies.retrieveAttractionCandidates || !dependencies.getDestinationSettings) {
    throw new TypeError("OpenTripMap candidate retrieval is unavailable.");
  }
  const settings = await dependencies.getDestinationSettings({ destination: preferences.destination });
  const candidates = await dependencies.retrieveAttractionCandidates({
    destination: preferences.destination,
    settings
  });
  return buildCandidatePool(preferences, candidates);
}

function requestedDayCount(preferences) {
  const start = Date.parse(`${preferences.startDate}T00:00:00.000Z`);
  const end = Date.parse(`${preferences.endDate}T00:00:00.000Z`);
  return Math.floor((end - start) / 86_400_000) + 1;
}

function tripTitle(preferences) {
  const destination = getDestinationDiscoveryContent(preferences.destination).name;
  return preferences.language === "en" ? `${destination.en} journey` : `${destination.zh}行程`;
}

function enrichedDimensions(preferences, itinerary) {
  const dayCount = requestedDayCount(preferences);
  return {
    ...itinerary,
    nights: Math.max(0, dayCount - 1),
    rooms: Math.ceil(preferences.travellerCount / 2),
    mealCount: countAvailableMeals(preferences, dayCount)
  };
}

function activityEstimateMinor(activityType, references, travellerCount) {
  const category = ["CULTURE", "HISTORY", "NATURE", "FAMILY"].includes(activityType)
    ? "ATTRACTION_PERSON_ENTRY"
    : activityType === "ENTERTAINMENT"
      ? "ENTERTAINMENT_PERSON_ENTRY"
      : activityType === "MEAL"
        ? "FOOD_PERSON_DAY"
        : undefined;
  return category
    ? references.find((record) => record.category === category)?.representativeMinor * travellerCount
    : 0;
}

function directDistanceMeters(from, to) {
  const radians = (value) => value * Math.PI / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const leftLatitude = radians(from.latitude);
  const rightLatitude = radians(to.latitude);
  const value = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function routeModeFor(profile, preferences) {
  const strategy = getSpendingProfile(profile);
  if (preferences.localTransportPreference === "WALK") {
    return () => preferences.localTransportPreference;
  }
  return ({ day, legIndex, from, to }) => {
    const preferred = strategy.routeModes[
      (day.dayNumber + legIndex - 1) % strategy.routeModes.length
    ];
    return preferred === "WALK" && directDistanceMeters(from, to) > 1500
      ? "PUBLIC_TRANSIT"
      : preferred;
  };
}

function costReferenceSource(reference) {
  return {
    sourceType: "DATABASE_BACKED",
    referenceId: reference.id,
    city: reference.city,
    category: reference.category,
    tier: reference.tier,
    sourceName: reference.sourceName,
    sourceUrl: reference.sourceUrl,
    collectedOn: reference.collectedOn,
    updatedAt: reference.updatedAt
  };
}

export function buildVariantProvenance(itinerary, summary, rainyDayBackups = []) {
  const provenance = [{
    path: "trip.preferences",
    source: { sourceType: "USER_PROVIDED" }
  }];
  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      const path = `days.${day.dayNumber}.activities.${activity.sequence}`;
      provenance.push(
        { path: `${path}.sequence`, source: { sourceType: "AI_GENERATED" } },
        { path: `${path}.reason`, source: { sourceType: "AI_GENERATED" } }
      );
      if (activity.estimatedActivityCostMinor !== undefined) {
        provenance.push({
          path: `${path}.estimatedActivityCostMinor`,
          source: { sourceType: "ESTIMATED" }
        });
      }
      if (activity.xid) {
        const record = activity.poi?.sourceRecords?.[0];
        provenance.push({
          path: `${path}.poi`,
          source: {
            sourceType: record?.provider === "DEMO" ? "DEMO_FIXTURE" : "OPENTRIPMAP_API",
            xid: activity.xid,
            provider: record?.provider,
            sourceUrl: record?.sourceUrl,
            retrievedAt: record?.retrievedAt,
            city: activity.poi?.city,
            matchStatus: activity.poi?.matchStatus,
            verificationStatus: activity.poi?.verificationStatus
          }
        });
      }
    }
    for (const [index] of (day.legs ?? []).entries()) {
      provenance.push({
        path: `days.${day.dayNumber}.legs.${index}`,
        source: { sourceType: "ESTIMATED" }
      });
    }
  }
  provenance.push({
    path: "summary.categoriesMinor",
    source: { sourceType: "ESTIMATED" }
  });
  for (const [category, reference] of Object.entries(summary.provenance ?? {})) {
    provenance.push({
      path: `summary.costReferences.${category}`,
      source: costReferenceSource(reference)
    });
  }
  rainyDayBackups.forEach((backup, index) => {
    const candidate = backup.alternative;
    const record = candidate.sourceRecords?.[0];
    provenance.push({
      path: `rainyDayBackups.${index}.alternative`,
      source: {
        sourceType: record?.provider === "DEMO" ? "DEMO_FIXTURE" : "OPENTRIPMAP_API",
        xid: candidate.xid ?? candidate.candidateId,
        provider: record?.provider,
        sourceUrl: record?.sourceUrl,
        retrievedAt: record?.retrievedAt,
        city: candidate.city,
        matchStatus: candidate.matchStatus,
        verificationStatus: candidate.verificationStatus
      }
    });
  });
  return provenance;
}

function attachPoiFacts(itinerary, candidatePool, { anchors, references, preferences }) {
  const byId = new Map(candidatePool.candidates.map((candidate) => [candidate.candidateId, candidate]));
  const attachAnchor = (point) => ({
    ...point,
    coordinates: anchors[point.locationId],
    locationIsEstimated: true,
    locationSource: "SYSTEM_ESTIMATE"
  });
  return {
    ...itinerary,
    days: itinerary.days.map((day) => ({
      ...day,
      startPoint: attachAnchor(day.startPoint),
      endPoint: attachAnchor(day.endPoint),
      activities: day.activities.map((activity) => {
        const poi = activity.xid ? byId.get(activity.xid) : undefined;
        return poi ? {
          ...activity,
          estimatedActivityCostMinor: activityEstimateMinor(activity.activityType, references, preferences.travellerCount),
          poi: {
            canonicalPoiId: poi.canonicalPoiId,
            name: poi.name,
            displayName: poi.displayName,
            description: poi.description,
            descriptionSourceType: poi.descriptionSourceType,
            suggestedVisitDurationMinutes: poi.suggestedVisitDurationMinutes,
            durationSourceType: poi.durationSourceType,
            city: poi.city,
            category: poi.category,
            coordinates: poi.coordinates,
            address: poi.address,
            primarySource: poi.primarySource,
            matchStatus: poi.matchStatus,
            verificationStatus: poi.verificationStatus,
            sourceRecords: poi.sourceRecords
          }
        } : activity;
      })
    }))
  };
}

async function evaluateDraft(draft, { preferences, candidatePool, anchors, references }) {
  const locations = Object.fromEntries(candidatePool.candidates
    .map(({ xid, coordinates }) => [xid, coordinates]));
  Object.assign(locations, anchors);
  const routed = await buildTripLegs(draft, {
    locations,
    mode: routeModeFor(draft.travelStyle, preferences)
  });
  const scheduled = {
    ...routed,
    days: routed.days.map((day) => propagateSchedule(day, {
      dayStartTime: "09:00"
    }))
  };
  const measurable = enrichedDimensions(preferences, scheduled);
  const budgetSummary = calculateItineraryBudget({
    preferences,
    itinerary: measurable,
    references,
    profile: draft.travelStyle
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
    const candidatePool = poolForPlan(context.candidatePool, context.profilePlan);
    const variantContext = { ...context, candidatePool };
    const draft = await planDraft({
      preferences: context.preferences,
      profilePlan: context.profilePlan,
      candidatePool
    }, { provider: context.dependencies.llmProvider });
    const result = await repairUntilValid({
      itinerary: draft,
      preferences: context.preferences,
      candidatePool,
      evaluate: (itinerary) => evaluateDraft(itinerary, variantContext),
      semanticRepair: ({ itinerary, issues, allowedCandidateIds }) => targetedLlmRepair({
        itinerary,
        issues,
        allowedCandidateIds,
        provider: context.dependencies.llmProvider
      })
    });
    if (result.state !== "FINAL_VALIDATED") return result;
    const supportedIds = new Set(context.resolvedPreferences.supported.map(({ xid, candidateId }) => xid ?? candidateId));
    const reconciliation = await reconcileSelectedAttractions({
      evaluation: result,
      requested: context.selectedRequests.filter(({ xid }) => supportedIds.has(xid)),
      provisionallyDeferredSelected: context.profilePlan.provisionallyDeferredSelected,
      candidatePool,
      evaluate: (itinerary) => evaluateDraft(itinerary, variantContext)
    });
    const reconciled = reconciliation.evaluation === result ? result : { ...result, ...reconciliation.evaluation, state: "FINAL_VALIDATED" };
    const factualItinerary = attachPoiFacts(reconciled.itinerary, candidatePool, variantContext);
    const itinerary = enrichItineraryPresentation({
      itinerary: factualItinerary,
      preferences: context.preferences,
      summary: reconciled.summary
    });
    const rainyDayBackups = buildRainyDayBackups({
      enabled: context.preferences.rainyDayBackupEnabled,
      itinerary,
      candidatePool: context.candidatePool,
      remainingBudgetMinor: reconciled.summary.remainingMinor,
      estimateCostMinor: (candidate) => activityEstimateMinor(
        candidate.category,
        context.references,
        context.preferences.travellerCount
      )
    });
    const selectedAttractionOutcome = buildSelectedAttractionOutcome({
      requested: context.selectedRequests,
      itinerary,
      structurallyExcluded: context.structuralOutcomes,
      finalEvaluationRejected: reconciliation.finalEvaluationRejected
    });
    return {
      ...reconciled,
      itinerary,
      rainyDayBackups,
      selectedAttractionOutcome,
      provenance: buildVariantProvenance(itinerary, reconciled.summary, rainyDayBackups),
      variantMetrics: buildVariantMetrics(
        itinerary,
        reconciled.summary,
        getSpendingProfile(profile)
      )
    };
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

function poolForPlan(candidatePool, profilePlan) {
  const allowed = new Set(profilePlan.allowedCandidateIds);
  return { ...candidatePool, candidateIds: [...profilePlan.allowedCandidateIds], candidates: candidatePool.candidates.filter(({ candidateId, xid }) => allowed.has(candidateId ?? xid)) };
}

async function save(dependencies, run) {
  if (dependencies.saveRun) await dependencies.saveRun(run);
  return run;
}

function withLegacyVariants(run, variants) {
  Object.defineProperty(run, "variants", {
    value: variants,
    enumerable: false
  });
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
    const [references, anchors] = await Promise.all([
      dependencies.getCostReferences(preferences),
      dependencies.resolveAnchors(preferences)
    ]);
    const resolvedPreferences = resolveAttractionPreferences(preferences, candidatePool);
    const budgetContext = buildProfileBudgetContext(preferences, references);
    const selectedRequests = resolvedPreferences.requested.map((request, index) => {
      const candidate = candidatePool.candidates.find(({ xid, candidateId, name, displayName }) =>
        request.xid ? (xid ?? candidateId) === request.xid : [name, displayName?.en, displayName?.zh].includes(request.displayName));
      const xid = candidate?.xid ?? candidate?.candidateId ?? request.xid;
      const fallback = request.displayName ?? xid;
      return { requestId: `${resolvedPreferences.mode.toLowerCase()}:${xid ?? fallback}:${index}`, ...(xid ? { xid } : {}), displayName: candidate?.displayName ?? { en: candidate?.name ?? fallback, zh: candidate?.name ?? fallback } };
    });
    const structuralOutcomes = resolvedPreferences.unresolved.map((item) => {
      const request = selectedRequests.find(({ xid, displayName }) => xid === item.xid || displayName.en === item.displayName || displayName.zh === item.displayName);
      return { ...item, requestId: request?.requestId, reasonCode: item.reason };
    });
    const context = { preferences, dependencies, candidatePool, references, anchors, resolvedPreferences, budgetContext, selectedRequests, structuralOutcomes };
    const profilePlan = buildProfilePlan({ profile: preferences.travelStyle, preferences, candidatePool, resolvedPreferences, budgetContext, costReferences: references, anchors });
    const variant = await generateVariant(preferences.travelStyle, { ...context, profilePlan });
    const variants = [variant];
    const state = variant.state;
    const validation = {
      valid: state === "FINAL_VALIDATED",
      issues: variant.validation?.issues ?? []
    };
    const run = withLegacyVariants({
      id: runId,
      tripId,
      trip: {
        id: tripId,
        title: tripTitle(preferences),
        destination: preferences.destination,
        startDate: preferences.startDate,
        endDate: preferences.endDate,
        travellerCount: preferences.travellerCount,
        budgetMinor: preferences.budgetMinor,
        preferences
      },
      state,
      itineraryRun: variant,
      validation,
      candidateCount: candidatePool.candidates.length,
      startedAt,
      completedAt: dependencies.now()
    }, variants);
    return await save(dependencies, run);
  } catch (error) {
    return await save(dependencies, withLegacyVariants({
      id: runId,
      tripId,
      trip: {
        id: tripId,
        title: tripTitle(preferences),
        destination: preferences.destination,
        startDate: preferences.startDate,
        endDate: preferences.endDate,
        travellerCount: preferences.travellerCount,
        budgetMinor: preferences.budgetMinor,
        preferences
      },
      state: "FAILED",
      itineraryRun: null,
      validation: { valid: false, issues: [issueFor(error)] },
      startedAt,
      completedAt: dependencies.now()
    }, []));
  }
}
