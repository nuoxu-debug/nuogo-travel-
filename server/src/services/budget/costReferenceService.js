import { AppError } from "../../errors.js";

const referenceKeys = Object.freeze({
  ACCOMMODATION_ROOM_NIGHT: "accommodationRoomNightFen",
  FOOD_PERSON_MEAL: "foodPersonMealFen",
  ATTRACTION_PERSON_ENTRY: "attractionPersonEntryFen",
  ENTERTAINMENT_PERSON_ENTRY: "entertainmentPersonEntryFen",
  OTHER_TRIP: "otherTripFen",
  FUEL_LITRE: "fuelLitreFen",
  PARKING_DAY: "parkingDayFen"
});

export class CostReferenceError extends AppError {
  constructor(message, details = {}) {
    super(message, { code: "MISSING_COST_REFERENCE", status: 422 });
    this.details = details;
  }
}

function effectiveOn(record, onDate) {
  return (!record.effectiveFrom || record.effectiveFrom <= onDate) &&
    (!record.effectiveTo || record.effectiveTo >= onDate);
}

export function resolveCostReferences(records, { destinationId, onDate }) {
  const selected = new Map();
  const eligible = records
    .filter((record) => record.destinationId === destinationId)
    .filter((record) => record.status === "ACTIVE" && effectiveOn(record, onDate))
    .sort((left, right) => String(right.effectiveFrom ?? "").localeCompare(String(left.effectiveFrom ?? "")));

  for (const record of eligible) {
    if (referenceKeys[record.category] && !selected.has(record.category)) selected.set(record.category, record);
  }
  const missing = Object.keys(referenceKeys).filter((category) => !selected.has(category));
  if (missing.length) {
    throw new CostReferenceError(`Missing active cost references for ${destinationId}.`, {
      destinationId,
      categories: missing
    });
  }

  const result = { provenance: {} };
  for (const [category, key] of Object.entries(referenceKeys)) {
    const record = selected.get(category);
    result[key] = record.amountFen;
    result.provenance[key] = {
      referenceId: record.id,
      category,
      source: record.source,
      effectiveFrom: record.effectiveFrom,
      effectiveTo: record.effectiveTo
    };
  }
  return result;
}
