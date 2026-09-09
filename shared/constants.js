export const supportedDestinations = Object.freeze([{
  id: "singapore",
  name: { en: "Singapore", zh: "新加坡" },
  countryCode: "SG",
  center: [103.8198, 1.3521],
  attractionRadiusMeters: 20_000
}]);

export const supportedDestinationIds = supportedDestinations.map(({ id }) => id);
export const spendingProfiles = ["BUDGET_SAVING", "BALANCED", "COMFORT_FOCUSED"];
export const localTransportModes = ["WALK", "PUBLIC_TRANSIT", "TAXI", "MIXED"];
export const supportedCurrencies = ["SGD"];
export const attractionSelectionModes = ["MANUAL", "AUTO"];
export const sourceTypes = [
  "USER_PROVIDED", "OPENTRIPMAP_API", "DATABASE_BACKED", "AI_GENERATED",
  "ESTIMATED", "DEMO_FIXTURE", "APPLICATION_CONTENT", "UNAVAILABLE"
];

export function getCity(id) {
  return supportedDestinations.find((destination) => destination.id === id);
}
