const find = (references, category, tier = null) => references.find((item) => item.category === category && (item.tier ?? null) === tier)?.representativeMinor ?? 0;
const categories = ["accommodation", "localTransportation", "foodAndBeverages", "attractionTickets", "entertainmentActivities", "other"];

export function countAvailableMeals(_preferences, days) { return Math.max(0, Number(days) || 0) * 3; }

export function buildProfileBudgetContext(preferences, references) {
  const days = Math.floor((Date.parse(`${preferences.endDate}T00:00:00Z`) - Date.parse(`${preferences.startDate}T00:00:00Z`)) / 86400000) + 1;
  const travellers = Number(preferences.travellerCount);
  const nights = Math.max(0, days - 1);
  const rooms = Math.ceil(travellers / 2);
  const baselineCategoriesMinor = {
    accommodation: find(references, "ACCOMMODATION_ROOM_NIGHT", "BUDGET") * rooms * nights,
    localTransportation: find(references, "LOCAL_TRANSPORT_PERSON_DAY", "BUDGET") * travellers * days,
    foodAndBeverages: find(references, "FOOD_PERSON_DAY", "ECONOMY") * travellers * days,
    attractionTickets: 0, entertainmentActivities: 0,
    other: find(references, "MISCELLANEOUS_PERSON_DAY", "BUDGET") * travellers * days
  };
  const userBudgetMinor = Number(preferences.budgetMinor);
  const baselineMandatoryCostMinor = Object.values(baselineCategoriesMinor).reduce((sum, value) => sum + value, 0);
  return { userBudgetMinor, baselineMandatoryCostMinor, allocatableBudgetMinor: Math.max(0, userBudgetMinor - baselineMandatoryCostMinor), baselineCategoriesMinor, dimensions: { days, nights, rooms, meals: days * 3, travellers } };
}

export function summarizeProfileSpend({ budgetContext, categoriesMinor }) {
  const categoryComponentsMinor = Object.fromEntries(categories.map((category) => {
    const baselineMinor = budgetContext.baselineCategoriesMinor[category] ?? 0;
    const finalMinor = Math.max(baselineMinor, Math.round(categoriesMinor[category] ?? 0));
    return [category, { baselineMinor, profileUpliftMinor: finalMinor - baselineMinor, finalMinor }];
  }));
  const finalCategoriesMinor = Object.fromEntries(categories.map((category) => [category, categoryComponentsMinor[category].finalMinor]));
  const totalMinor = Object.values(finalCategoriesMinor).reduce((sum, value) => sum + value, 0);
  return { userBudgetMinor: budgetContext.userBudgetMinor, baselineMandatoryCostMinor: budgetContext.baselineMandatoryCostMinor, profileControlledCostMinor: totalMinor - budgetContext.baselineMandatoryCostMinor, totalMinor, utilisationPercent: budgetContext.userBudgetMinor ? Math.round(totalMinor / budgetContext.userBudgetMinor * 10000) / 100 : 0, remainingMinor: budgetContext.userBudgetMinor - totalMinor, withinBudget: totalMinor <= budgetContext.userBudgetMinor, categoryComponentsMinor, categoriesMinor: finalCategoriesMinor };
}

export function targetProfileControlledSpend(budgetContext, utilisationBand) {
  const targetTotal = Math.round(budgetContext.userBudgetMinor * utilisationBand[0]);
  return Math.max(0, Math.min(budgetContext.allocatableBudgetMinor, targetTotal - budgetContext.baselineMandatoryCostMinor));
}
