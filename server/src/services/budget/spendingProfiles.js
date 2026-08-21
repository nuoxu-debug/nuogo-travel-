export const spendingProfileIds = Object.freeze([
  "BUDGET_SAVING",
  "BALANCED",
  "COMFORT_FOCUSED"
]);

const profiles = Object.freeze({
  BUDGET_SAVING: {
    accommodationTier: "BUDGET",
    foodTier: "ECONOMY",
    accommodationFactorPercent: 70,
    foodFactorPercent: 70,
    routeModes: ["PUBLIC_TRANSIT", "WALK"],
    fullDayActivityTarget: 3,
    activityDurationMinutes: 75,
    pace: "ACTIVE",
    allocationsPercent: {
      outboundTransport: 12,
      returnTransport: 12,
      accommodation: 20,
      localTransportation: 10,
      foodAndBeverages: 14,
      attractionTickets: 18,
      entertainmentActivities: 8,
      other: 6
    }
  },
  BALANCED: {
    accommodationTier: "MID_RANGE",
    foodTier: "BALANCED",
    accommodationFactorPercent: 100,
    foodFactorPercent: 100,
    routeModes: ["PUBLIC_TRANSIT", "TAXI", "PUBLIC_TRANSIT"],
    fullDayActivityTarget: 3,
    activityDurationMinutes: 90,
    pace: "MODERATE",
    allocationsPercent: {
      outboundTransport: 12,
      returnTransport: 12,
      accommodation: 25,
      localTransportation: 10,
      foodAndBeverages: 16,
      attractionTickets: 15,
      entertainmentActivities: 6,
      other: 4
    }
  },
  COMFORT_FOCUSED: {
    accommodationTier: "COMFORT",
    foodTier: "COMFORT",
    accommodationFactorPercent: 135,
    foodFactorPercent: 135,
    routeModes: ["TAXI"],
    fullDayActivityTarget: 3,
    activityDurationMinutes: 105,
    pace: "RELAXED",
    allocationsPercent: {
      outboundTransport: 12,
      returnTransport: 12,
      accommodation: 34,
      localTransportation: 12,
      foodAndBeverages: 17,
      attractionTickets: 8,
      entertainmentActivities: 3,
      other: 2
    }
  }
});

export function getSpendingProfile(profile) {
  const value = profiles[profile];
  if (!value) throw new TypeError(`Unknown spending profile: ${profile}.`);
  return value;
}
