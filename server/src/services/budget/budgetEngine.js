import { CostReferenceError } from "./costReferenceService.js";
import { getSpendingProfile } from "./spendingProfiles.js";
import { buildProfileBudgetContext, summarizeProfileSpend } from "./profileBudget.js";

const ref = (references, category, tier = null) => {
  const value = references.find((item) => item.category === category && (item.tier ?? null) === tier);
  if (!value) throw new CostReferenceError("Budget calculation is missing a selected cost reference.", { reference: `${category}:${tier ?? "GENERIC"}` });
  return value;
};
const activityCount = (itinerary, types) => (itinerary.days ?? []).flatMap((day) => day.activities ?? []).filter((activity) => types.has(activity.activityType)).length;

export function validateHardBudget(summary, budgetMinor) {
  const remainingMinor = Number(budgetMinor) - summary.totalMinor;
  return { valid: remainingMinor >= 0, code: remainingMinor >= 0 ? null : "BUDGET_EXCEEDED", totalMinor: summary.totalMinor, budgetMinor: Number(budgetMinor), exceededByMinor: Math.max(0, -remainingMinor), remainingMinor };
}

export function calculateItineraryBudget({ preferences, itinerary, references, profile }) {
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
  const categoriesMinor = {
    accommodation: selected.accommodation.representativeMinor * rooms * nights,
    localTransportation: selected.localTransportation.representativeMinor * travellers * days,
    foodAndBeverages: selected.foodAndBeverages.representativeMinor * travellers * days,
    attractionTickets: selected.attractionTickets.representativeMinor * activityCount(itinerary, new Set(["CULTURE", "HISTORY", "NATURE", "FAMILY"])) * travellers,
    entertainmentActivities: selected.entertainmentActivities.representativeMinor * activityCount(itinerary, new Set(["ENTERTAINMENT"])) * travellers,
    other: selected.other.representativeMinor * travellers * days
  };
  const summary = summarizeProfileSpend({ budgetContext: context, categoriesMinor });
  return { profile, accommodationTier: style.accommodationTier, localTransportationTier: style.localTransportationTier, foodTier: style.foodTier, miscellaneousTier: style.miscellaneousTier, ...summary, budgetMinor: context.userBudgetMinor, perPersonMinor: Math.round(summary.totalMinor / travellers), provenance: selected };
}
