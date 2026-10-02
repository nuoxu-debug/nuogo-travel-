import { AppError } from "../../errors.js";
import { attractionPriceReferenceTiers } from "./attractionPriceResolver.js";

const tieredCategories = Object.freeze({
  ACCOMMODATION_ROOM_NIGHT: ["BUDGET", "MID_RANGE", "COMFORT"],
  LOCAL_TRANSPORT_PERSON_DAY: ["BUDGET", "BALANCED", "COMFORT"],
  PUBLIC_TRANSPORT_DISTANCE_FARE: ["KM_0_32", "KM_32_42", "KM_42_52", "KM_52_72", "KM_72_999"],
  TAXI_OR_RIDE_HAIL_ESTIMATE: ["BASE_FARE", "PER_KM"],
  FOOD_PERSON_DAY: ["ECONOMY", "BALANCED", "COMFORT"],
  MISCELLANEOUS_PERSON_DAY: ["BUDGET", "BALANCED", "COMFORT"]
});
const optionalTiers = Object.freeze({
  ATTRACTION_PERSON_ENTRY: attractionPriceReferenceTiers
});
const referenceTypes = new Set(["EXACT", "FREE", "CATEGORY_FALLBACK", "GENERIC_FALLBACK"]);
const sourceTypes = new Set(["OFFICIAL", "GOVERNMENT", "COMMERCIAL", "SYSTEM_ESTIMATE"]);
const unitTypes = new Set(["PER_PERSON_ENTRY", "PER_PERSON_DAY", "PER_ROOM_NIGHT", "PER_TRIP", "PER_LEG"]);

export const costReferenceRequirements = Object.freeze([
  ...Object.entries(tieredCategories).flatMap(([category, tiers]) => tiers.map((tier) => ({ category, tier }))),
  { category: "ATTRACTION_PERSON_ENTRY" },
  { category: "ENTERTAINMENT_PERSON_ENTRY" }
]);
export const costReferenceCategories = Object.freeze([...Object.keys(tieredCategories), "ATTRACTION_PERSON_ENTRY", "ENTERTAINMENT_PERSON_ENTRY"]);

export class CostReferenceError extends AppError {
  constructor(message, details = {}) {
    super(message, { code: "MISSING_COST_REFERENCE", status: 422 });
    this.details = details;
  }
}

function defaultReferenceType({ category, tier }) {
  return category === "ATTRACTION_PERSON_ENTRY"
    ? (tier ? "CATEGORY_FALLBACK" : "GENERIC_FALLBACK")
    : "GENERIC_FALLBACK";
}
function key(reference) {
  return `${reference.category}:${reference.tier ?? "GENERIC"}:${reference.referenceType ?? defaultReferenceType(reference)}`;
}
function https(value) { try { return new URL(value).protocol === "https:"; } catch { return false; } }
function valid(record) {
  const tiers = tieredCategories[record.category];
  const optional = optionalTiers[record.category];
  const referenceType = record.referenceType ?? defaultReferenceType(record);
  const unitType = record.unitType ?? "PER_PERSON_ENTRY";
  const sourceType = record.sourceType ?? "SYSTEM_ESTIMATE";
  return costReferenceCategories.includes(record.category) &&
    (tiers ? tiers.includes(record.tier) : (record.tier == null || optional?.includes(record.tier))) &&
    referenceTypes.has(referenceType) &&
    unitTypes.has(unitType) &&
    sourceTypes.has(sourceType) &&
    (record.poiId == null || typeof record.poiId === "string") &&
    (record.referenceType !== "EXACT" && record.referenceType !== "FREE" || typeof record.poiId === "string") &&
    Number.isInteger(record.minMinor) && record.minMinor >= 0 &&
    Number.isInteger(record.maxMinor) && record.maxMinor >= record.minMinor &&
    Number.isInteger(record.representativeMinor) && record.representativeMinor >= record.minMinor && record.representativeMinor <= record.maxMinor &&
    record.currency === "SGD" && typeof record.sourceName === "string" && record.sourceName.trim() && https(record.sourceUrl) &&
    /^\d{4}-\d{2}-\d{2}$/.test(record.collectedOn) && Number.isFinite(Date.parse(record.updatedAt));
}

export function resolveCostReferences(records, { city }) {
  const active = (records ?? []).filter((record) => record.city === city && record.status === "ACTIVE");
  const invalidReferenceIds = active.filter((record) => !valid(record)).map(({ id }) => id);
  const validRecords = active.filter(valid).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
  const selected = costReferenceRequirements.map((required) => validRecords.find((record) => key(record) === key(required)));
  const missing = costReferenceRequirements.filter((_, index) => !selected[index]).map(key);
  if (missing.length) throw new CostReferenceError(`Missing active cost references for ${city}.`, { city, references: missing, ...(invalidReferenceIds.length ? { invalidReferenceIds } : {}) });
  const selectedKeys = new Set(selected.map(key));
  const optionalSelected = validRecords.filter((record) => !selectedKeys.has(key(record)));
  return [...selected, ...optionalSelected].map((record) => ({
    ...record,
    tier: record.tier ?? null,
    referenceType: record.referenceType ?? defaultReferenceType(record),
    unitType: record.unitType ?? "PER_PERSON_ENTRY",
    sourceType: record.sourceType ?? "SYSTEM_ESTIMATE"
  }));
}
