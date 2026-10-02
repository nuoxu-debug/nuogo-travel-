import { CostReferenceError } from "./costReferenceService.js";
import { getSpendingProfile } from "./spendingProfiles.js";
import { buildProfileBudgetContext, summarizeProfileSpend } from "./profileBudget.js";
import { resolveAttractionPrice } from "./attractionPriceResolver.js";

const ref = (references, category, tier = null) => {
  const value = references.find((item) => item.category === category && (item.tier ?? null) === tier);
  if (!value) throw new CostReferenceError("Budget calculation is missing a selected cost reference.", { reference: `${category}:${tier ?? "GENERIC"}` });
  return value;
};
const activityCount = (itinerary, types) => (itinerary.days ?? []).flatMap((day) => day.activities ?? []).filter((activity) => types.has(activity.activityType)).length;
const attractionTypes = new Set(["CULTURE", "HISTORY", "NATURE", "FAMILY"]);

function attractionTicketMinor({ itinerary, references, travellers, candidatesById = new Map() }) {
  return (itinerary.days ?? [])
    .flatMap((day) => day.activities ?? [])
    .filter((activity) => attractionTypes.has(activity.activityType))
    .reduce((sum, activity) => {
      const poi = activity.poi ?? candidatesById.get(activity.xid) ?? activity;
      return sum + resolveAttractionPrice({ activity, poi, references }).representativeMinor * travellers;
    }, 0);
}

function routeLegTransportationMinor(itinerary) {
  const days = itinerary.days ?? [];
  if (!days.length) return undefined;
  let total = 0;
  for (const day of days) {
    const expectedLegCount = (day.activities ?? []).filter(({ xid }) => xid).length + 1;
    const legs = day.legs ?? [];
    if (expectedLegCount <= 0 || legs.length !== expectedLegCount) return undefined;
    for (const leg of legs) {
      if (!Number.isInteger(leg.estimatedCostMinor) || leg.estimatedCostMinor < 0) return undefined;
      total += leg.estimatedCostMinor;
    }
  }
  return total;
}

export function validateHardBudget(summary, budgetMinor) {
  const remainingMinor = Number(budgetMinor) - summary.totalMinor;
  return { valid: remainingMinor >= 0, code: remainingMinor >= 0 ? null : "BUDGET_EXCEEDED", totalMinor: summary.totalMinor, budgetMinor: Number(budgetMinor), exceededByMinor: Math.max(0, -remainingMinor), remainingMinor };
}

export function calculateItineraryBudget({ preferences, itinerary, references, profile, candidatePool }) {
  const style = getSpendingProfile(profile);
  const context = buildProfileBudgetContext(preferences, references);
  const { travellers, days, nights, rooms } = context.dimensions;
  const selected = {
    accommodation: ref(references, "ACCOMMODATION_ROOM_NIGHT", style.accommodationTier),
    localTransportation: ref(references, "LOCAL_TRANSPORT_PERSON_DAY", style.localTransportationTier),
    foodAndBeverages: ref(references, "FOOD_PERSON_DAY", style.foodTier),
    attractionTickets: ref(references, "ATTRACTION_PERSON_ENTRY"),
    entertainmentActivities: ref(references, "ENTERTAINMENT_PERSON_ENTRY"),
    other: ref(references, "MISCELLANEOUS_PERSON_DAY", style.miscellaneousTier)
  };
  const routeLegTransportation = routeLegTransportationMinor(itinerary);
  const candidatesById = new Map((candidatePool?.candidates ?? []).map((candidate) => [candidate.xid ?? candidate.candidateId, candidate]));
  const categoriesMinor = {
    accommodation: selected.accommodation.representativeMinor * rooms * nights,
    localTransportation: routeLegTransportation ?? selected.localTransportation.representativeMinor * travellers * days,
    foodAndBeverages: selected.foodAndBeverages.representativeMinor * travellers * days,
    attractionTickets: attractionTicketMinor({ itinerary, references, travellers, candidatesById }),
    entertainmentActivities: selected.entertainmentActivities.representativeMinor * activityCount(itinerary, new Set(["ENTERTAINMENT"])) * travellers,
    other: selected.other.representativeMinor * travellers * days
  };
  const summary = summarizeProfileSpend({
    budgetContext: context,
    categoriesMinor,
    exactCategories: routeLegTransportation === undefined ? [] : ["localTransportation"]
  });
  return { profile, accommodationTier: style.accommodationTier, localTransportationTier: style.localTransportationTier, foodTier: style.foodTier, miscellaneousTier: style.miscellaneousTier, ...summary, budgetMinor: context.userBudgetMinor, perPersonMinor: Math.round(summary.totalMinor / travellers), provenance: selected };
}
