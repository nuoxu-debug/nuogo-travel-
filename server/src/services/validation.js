import { preferenceSchema } from "@nuogo/shared/schemas";

export function validatePreferences(input) {
  const preferences = preferenceSchema.parse(input);
  const dailyBudget = Math.round((preferences.totalBudget / preferences.days) * 100) / 100;
  const conflicts = [];

  if (
    dailyBudget < 450 &&
    ["boutique_homestay", "family_resort"].includes(preferences.accommodation)
  ) {
    conflicts.push("LOW_BUDGET_PREMIUM_STAY");
  }

  if (
    preferences.days === 1 &&
    preferences.departureCity !== preferences.destination
  ) {
    conflicts.push("SHORT_CROSS_CITY_TRIP");
  }

  if (
    preferences.groupType === "elderly_group" &&
    preferences.days <= 2 &&
    preferences.interests.length > 4
  ) {
    conflicts.push("ELDERLY_HIGH_INTENSITY");
  }

  return {
    ...preferences,
    dailyBudget,
    conflicts
  };
}
