export const spendingProfileIds = Object.freeze([
  "BUDGET_SAVING",
  "BALANCED",
  "COMFORT_FOCUSED"
]);

export const profileWeights = Object.freeze({
  BUDGET_SAVING: Object.freeze({ selectedAttractionPriority: .30, preferenceMatch: .20, costEfficiency: .18, travelEfficiency: .14, categoryDiversity: .06, comfortScore: .03, activityValue: .09 }),
  BALANCED: Object.freeze({ selectedAttractionPriority: .30, preferenceMatch: .18, costEfficiency: .10, travelEfficiency: .12, categoryDiversity: .12, comfortScore: .10, activityValue: .08 }),
  COMFORT_FOCUSED: Object.freeze({ selectedAttractionPriority: .30, preferenceMatch: .18, costEfficiency: .04, travelEfficiency: .14, categoryDiversity: .06, comfortScore: .18, activityValue: .10 })
});

export function validateProfileWeights(weights) {
  const values = Object.values(weights);
  const issues = values.some((value) => !Number.isFinite(value) || value < 0 || value > 1) ? ["INVALID_WEIGHT"] : [];
  if (Math.abs(values.reduce((sum, value) => sum + value, 0) - 1) > 1e-9) issues.push("INVALID_TOTAL");
  return issues;
}

const profiles = Object.freeze({
  BUDGET_SAVING: {
    accommodationTier: "BUDGET",
    localTransportationTier: "BUDGET",
    foodTier: "ECONOMY",
    miscellaneousTier: "BUDGET",
    routeModes: ["PUBLIC_TRANSIT", "WALK"],
    fullDayActivityTarget: 3,
    activityDurationMinutes: 75,
    pace: "ACTIVE",
    allocationsPercent: {
      accommodation: 35, localTransportation: 10, foodAndBeverages: 25,
      attractionTickets: 15, entertainmentActivities: 5, other: 10
    }
  },
  BALANCED: {
    accommodationTier: "MID_RANGE",
    localTransportationTier: "BALANCED",
    foodTier: "BALANCED",
    miscellaneousTier: "BALANCED",
    routeModes: ["PUBLIC_TRANSIT", "TAXI", "PUBLIC_TRANSIT"],
    fullDayActivityTarget: 3,
    activityDurationMinutes: 90,
    pace: "MODERATE",
    allocationsPercent: {
      accommodation: 40, localTransportation: 10, foodAndBeverages: 22,
      attractionTickets: 15, entertainmentActivities: 8, other: 5
    }
  },
  COMFORT_FOCUSED: {
    accommodationTier: "COMFORT",
    localTransportationTier: "COMFORT",
    foodTier: "COMFORT",
    miscellaneousTier: "COMFORT",
    routeModes: ["TAXI"],
    fullDayActivityTarget: 3,
    activityDurationMinutes: 105,
    pace: "RELAXED",
    allocationsPercent: {
      accommodation: 52, localTransportation: 10, foodAndBeverages: 20,
      attractionTickets: 8, entertainmentActivities: 7, other: 3
    }
  }
});

export function getSpendingProfile(profile) {
  const value = profiles[profile];
  if (!value) throw new TypeError(`Unknown spending profile: ${profile}.`);
  return value;
}
