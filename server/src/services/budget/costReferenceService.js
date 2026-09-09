import { AppError } from "../../errors.js";

const tieredCategories = Object.freeze({
  ACCOMMODATION_ROOM_NIGHT: ["BUDGET", "MID_RANGE", "COMFORT"],
  LOCAL_TRANSPORT_PERSON_DAY: ["BUDGET", "BALANCED", "COMFORT"],
  FOOD_PERSON_DAY: ["ECONOMY", "BALANCED", "COMFORT"],
  MISCELLANEOUS_PERSON_DAY: ["BUDGET", "BALANCED", "COMFORT"]
});

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

function key({ category, tier }) { return `${category}:${tier ?? "GENERIC"}`; }
function https(value) { try { return new URL(value).protocol === "https:"; } catch { return false; } }
function valid(record) {
  const tiers = tieredCategories[record.category];
  return costReferenceCategories.includes(record.category) &&
    (tiers ? tiers.includes(record.tier) : record.tier == null) &&
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
  return selected.map((record) => ({ ...record, tier: record.tier ?? null }));
}
