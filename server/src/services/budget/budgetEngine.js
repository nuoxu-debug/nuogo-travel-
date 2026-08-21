import { CostReferenceError } from "./costReferenceService.js";
import { calculateDrivingCost } from "./fuelCalculator.js";
import { getSpendingProfile } from "./spendingProfiles.js";

const requiredReferences = [
  "accommodationRoomNightFen",
  "foodPersonMealFen",
  "attractionPersonEntryFen",
  "entertainmentPersonEntryFen",
  "otherTripFen",
  "fuelLitreFen",
  "parkingDayFen"
];

function cnyToFen(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new TypeError(`${label} must be a nonnegative CNY amount.`);
  return Math.round(number * 100);
}

function integer(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw new TypeError(`${label} must be a nonnegative integer.`);
  return number;
}

function ensureReferences(references) {
  const missing = requiredReferences.filter((key) => !Number.isInteger(references?.[key]) || references[key] < 0);
  if (missing.length) throw new CostReferenceError("Budget calculation is missing cost references.", { keys: missing });
}

function allocateBudget(budgetFen, percentages) {
  const allocations = Object.fromEntries(
    Object.entries(percentages).map(([category, percent]) => [category, Math.floor(budgetFen * percent / 100)])
  );
  const allocated = Object.values(allocations).reduce((sum, value) => sum + value, 0);
  allocations.other += budgetFen - allocated;
  return allocations;
}

function countActivities(itinerary, types) {
  return (itinerary.days ?? []).reduce((count, day) => count +
    (day.activities ?? []).filter(({ activityType }) => types.has(activityType)).length, 0);
}

function applyFactor(amountFen, factorPercent) {
  return Math.round(amountFen * factorPercent / 100);
}

function tripTransportFen(direction, preferences, itinerary, references) {
  const fixedCost = preferences[`${direction}TransportCostCny`];
  if (fixedCost !== undefined) return cnyToFen(fixedCost, `${direction}TransportCostCny`);
  if (preferences[`${direction}TransportMode`] !== "DRIVING" || !itinerary[`${direction}Driving`]) {
    throw new TypeError(`${direction} transport requires a user cost or driving details.`);
  }
  const driving = itinerary[`${direction}Driving`];
  return calculateDrivingCost({
    distanceKm: driving.distanceKm,
    fuelConsumptionLitresPer100Km: preferences.fuelConsumptionLitresPer100Km,
    fuelPricePerLitre: references.fuelLitreFen / 100,
    tollCny: driving.tollCny,
    parkingCny: driving.parkingCny
  }).totalFen;
}

export function validateHardBudget(summary, totalBudgetCny) {
  const budgetFen = cnyToFen(totalBudgetCny, "totalBudgetCny");
  const remainingFen = budgetFen - summary.totalFen;
  if (remainingFen >= 0) {
    return { valid: true, code: null, totalFen: summary.totalFen, budgetFen, exceededByFen: 0, remainingFen };
  }
  return {
    valid: false,
    code: "BUDGET_EXCEEDED",
    totalFen: summary.totalFen,
    budgetFen,
    exceededByFen: Math.abs(remainingFen),
    remainingFen
  };
}

export function calculateItineraryBudget({ preferences, itinerary, references, profile }) {
  ensureReferences(references);
  const travellerCount = integer(preferences.travellerCount, "travellerCount");
  if (travellerCount < 1) throw new TypeError("travellerCount must be at least one.");
  const nights = integer(itinerary.nights, "nights");
  const rooms = integer(itinerary.rooms, "rooms");
  const mealCount = integer(itinerary.mealCount, "mealCount");
  const legsFen = (itinerary.days ?? []).flatMap((day) => day.legs ?? [])
    .reduce((sum, leg) => sum + integer(leg.estimatedCostFen, "leg estimatedCostFen"), 0);
  const attractionCount = countActivities(itinerary, new Set(["CULTURE", "HISTORY", "NATURE", "FAMILY"]));
  const entertainmentCount = countActivities(itinerary, new Set(["ENTERTAINMENT"]));
  const localDriving = itinerary.localDriving
    ? calculateDrivingCost({
      distanceKm: itinerary.localDriving.distanceKm,
      fuelConsumptionLitresPer100Km: preferences.fuelConsumptionLitresPer100Km,
      fuelPricePerLitre: references.fuelLitreFen / 100,
      tollCny: itinerary.localDriving.tollCny,
      parkingCny: references.parkingDayFen / 100 * integer(itinerary.localDriving.parkingDays, "parkingDays")
    }).totalFen
    : 0;

  const categoriesFen = {
    outboundTransport: tripTransportFen("outbound", preferences, itinerary, references),
    returnTransport: tripTransportFen("return", preferences, itinerary, references),
    accommodation: applyFactor(
      references.accommodationRoomNightFen * rooms * nights,
      getSpendingProfile(profile).accommodationFactorPercent
    ),
    localTransportation: legsFen + localDriving,
    foodAndBeverages: applyFactor(
      references.foodPersonMealFen * mealCount * travellerCount,
      getSpendingProfile(profile).foodFactorPercent
    ),
    attractionTickets: references.attractionPersonEntryFen * attractionCount * travellerCount,
    entertainmentActivities: references.entertainmentPersonEntryFen * entertainmentCount * travellerCount,
    other: references.otherTripFen
  };
  const totalFen = Object.values(categoriesFen).reduce((sum, value) => sum + value, 0);
  const budgetFen = cnyToFen(preferences.totalBudgetCny, "totalBudgetCny");
  const remainingFen = budgetFen - totalFen;
  const profileDefinition = getSpendingProfile(profile);
  return {
    profile,
    accommodationTier: profileDefinition.accommodationTier,
    foodTier: profileDefinition.foodTier,
    categoriesFen,
    targetAllocationsFen: allocateBudget(budgetFen, profileDefinition.allocationsPercent),
    totalFen,
    budgetFen,
    remainingFen,
    perPersonFen: Math.round(totalFen / travellerCount),
    withinBudget: remainingFen >= 0,
    provenance: references.provenance ?? {}
  };
}
