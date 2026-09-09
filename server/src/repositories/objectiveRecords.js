const approvedSourceTypes = new Set([
  "USER_PROVIDED",
  "OPENTRIPMAP_API",
  "DATABASE_BACKED",
  "AI_GENERATED",
  "ESTIMATED",
  "DEMO_FIXTURE",
  "UNAVAILABLE"
]);
const supportedCities = new Set(["singapore"]);
const matchStatuses = new Set(["MATCHED"]);
const verificationStatuses = new Set([
  "SUPPORTING_ONLY",
  "MATCHED",
  "PRIMARY_ONLY",
  "AMBIGUOUS",
  "UNMATCHED"
]);

function validIsoTimestamp(value) {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function canonicalOpenTripMapUrl(xid) {
  return `https://opentripmap.com/en/card/${encodeURIComponent(xid)}`;
}

function validOpenTripMapXid(xid) {
  return typeof xid === "string" && /^[A-Za-z0-9_-]+$/.test(xid);
}

function completeOpenTripMapSource(source) {
  return source.provider === "OPENTRIPMAP" &&
    validOpenTripMapXid(source.xid) &&
    source.sourceUrl === canonicalOpenTripMapUrl(source.xid) &&
    validIsoTimestamp(source.retrievedAt) &&
    supportedCities.has(source.city) &&
    matchStatuses.has(source.matchStatus) &&
    verificationStatuses.has(source.verificationStatus);
}

function validateProvenance(provenance) {
  for (const item of provenance) {
    if (typeof item.path !== "string" || !approvedSourceTypes.has(item.source?.sourceType)) {
      throw new TypeError("Itinerary provenance must use an approved source category.");
    }
    if (item.source.sourceType === "OPENTRIPMAP_API" && !completeOpenTripMapSource(item.source)) {
      throw new TypeError("Attractions require complete OpenTripMap provenance.");
    }
  }
}

function validateRepairs(repairs, state) {
  for (const repair of repairs) {
    if (!Number.isInteger(repair.attempt) || repair.attempt < 1 ||
        !Array.isArray(repair.issueCodes) || repair.issueCodes.length === 0 ||
        repair.issueCodes.some((code) => typeof code !== "string" || !code.trim()) ||
        typeof repair.action !== "string" || !repair.action || repair.finalState !== state) {
      throw new TypeError("Repair records require attempt, issue codes, action, and final state.");
    }
  }
}

function sameOpenTripMapFacts(activity, source) {
  const poi = activity.poi;
  const records = poi?.sourceRecords?.filter((item) => item.provider === "OPENTRIPMAP") ?? [];
  const [record] = records;
  return poi?.primarySource === "OPENTRIPMAP" &&
    records.length === 1 &&
    record.sourceId === activity.xid &&
    record?.sourceUrl === source.sourceUrl &&
    record.retrievedAt === source.retrievedAt &&
    source.xid === activity.xid &&
    source.provider === record.provider &&
    source.city === poi.city &&
    source.matchStatus === poi.matchStatus &&
    source.verificationStatus === poi.verificationStatus;
}

function validateAttractionMappings(variant, provenance) {
  const grounded = new Map();
  for (const day of variant.itinerary?.days ?? []) {
    for (const activity of day.activities ?? []) {
      const activityPath = `days.${day.dayNumber}.activities.${activity.sequence}`;
      const path = `${activityPath}.poi`;
      if (!activity.xid) {
        if (activity.poi) {
          throw new TypeError("Generic itinerary entries cannot contain POI provider facts.");
        }
        if (provenance.some((item) =>
          item.source.sourceType === "OPENTRIPMAP_API" &&
          (item.path === activityPath || item.path.startsWith(`${activityPath}.`)))) {
          throw new TypeError("Generic itinerary entries cannot have attraction provider provenance.");
        }
        continue;
      }
      grounded.set(path, activity);
      if (activity.poi?.primarySource === "DEMO_FIXTURE") {
        const demoSources = provenance.filter((item) => item.path === path && item.source.sourceType === "DEMO_FIXTURE");
        if (demoSources.length !== 1) throw new TypeError("Demo attractions require explicit fixture provenance.");
        continue;
      }
      const providerSources = provenance.filter((item) =>
        item.path === path && item.source.sourceType === "OPENTRIPMAP_API");
      if (providerSources.length !== 1 || !sameOpenTripMapFacts(activity, providerSources[0].source)) {
        throw new TypeError("Attractions require complete OpenTripMap provenance.");
      }
    }
  }
  for (const [index, backup] of (variant.rainyDayBackups ?? []).entries()) {
    const path = `rainyDayBackups.${index}.alternative`;
    const activity = { xid: backup.alternative?.xid, poi: backup.alternative };
    grounded.set(path, activity);
    if (activity.poi?.primarySource === "DEMO_FIXTURE") {
      const demoSources = provenance.filter((item) => item.path === path && item.source.sourceType === "DEMO_FIXTURE");
      if (demoSources.length !== 1) throw new TypeError("Demo rainy-day alternatives require explicit fixture provenance.");
      continue;
    }
    const providerSources = provenance.filter((item) =>
      item.path === path && item.source.sourceType === "OPENTRIPMAP_API");
    if (providerSources.length !== 1 || !sameOpenTripMapFacts(activity, providerSources[0].source)) {
      throw new TypeError("Rainy-day alternatives require complete OpenTripMap provenance.");
    }
  }
  for (const item of provenance) {
    if (item.source.sourceType === "OPENTRIPMAP_API" && !grounded.has(item.path)) {
      throw new TypeError("OpenTripMap provenance must map to a grounded attraction path.");
    }
  }
}

export function validateItineraryRun(run) {
  const variant = run.summary ?? {};
  if (variant.selectedAttractionOutcome) selectedAttractionOutcomeSchema.parse(variant.selectedAttractionOutcome);
  if (variant.summary) {
    const budgetFields = Object.fromEntries(["userBudgetMinor", "baselineMandatoryCostMinor", "profileControlledCostMinor", "totalMinor", "utilisationPercent", "remainingMinor"].filter((key) => variant.summary[key] !== undefined).map((key) => [key, variant.summary[key]]));
    profileBudgetSummarySchema.parse(budgetFields);
  }
  validateProvenance(run.provenance ?? []);
  validateAttractionMappings(run.summary ?? {}, run.provenance ?? []);
  validateRepairs(run.repairs ?? [], run.state);
  return run;
}

export function buildObjectiveRuns(result) {
  const itineraryRuns = result.itineraryRun ? [result.itineraryRun] : (result.variants ?? []);
  return itineraryRuns.map((variant) => {
    const profile = variant.itinerary?.travelStyle ?? variant.summary?.profile;
    const provenance = variant.provenance ?? [];
    return validateItineraryRun({
      id: `${result.id}:${profile}`,
      tripId: result.trip.id,
      profile,
      state: variant.state,
      estimatedTotalMinor: variant.summary?.totalMinor,
      summary: variant,
      legs: (variant.itinerary?.days ?? []).flatMap((day) =>
        (day.legs ?? []).map((leg, sequence) => ({ ...leg, dayNumber: day.dayNumber, sequence }))),
      provenance,
      validationIssues: (variant.validation?.issues ?? []).map((issue) => ({
        ...issue,
        path: Array.isArray(issue.path) ? issue.path.join(".") : issue.path
      })),
      repairs: variant.repairs ?? []
    });
  });
}
import { profileBudgetSummarySchema, selectedAttractionOutcomeSchema } from "@nuogo/shared/schemas";
