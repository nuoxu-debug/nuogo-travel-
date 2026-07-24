const categoryGroups = {
  natural_scenery: "scenicTickets",
  historical_relics: "scenicTickets",
  city_landmarks: "scenicTickets",
  local_street_food: "localFood",
  regional_cuisines: "localFood",
  boutique_homestays: "accommodation",
  budget_hotels: "accommodation",
  family_resorts: "accommodation"
};

export function calculateBudget(variant, limit = variant.totalBudget) {
  const categories = {
    scenicTickets: 0,
    localFood: 0,
    transportation: 0,
    accommodation: 0
  };

  for (const day of variant.days ?? []) {
    for (const activity of day.activities ?? []) {
      const group = categoryGroups[activity.category];
      if (group) {
        categories[group] += Number(activity.estimatedCost) || 0;
      }
      categories.transportation += Number(activity.transportCost) || 0;
    }
  }

  const total = Object.values(categories).reduce((sum, amount) => sum + amount, 0);

  return {
    categories,
    total,
    limit,
    remaining: limit - total,
    overBudget: total > limit
  };
}
