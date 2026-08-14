export const spendingProfileIds = Object.freeze([
  "BUDGET_SAVING",
  "BALANCED",
  "COMFORT_FOCUSED"
]);

const profiles = Object.freeze({
  BUDGET_SAVING: {
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
