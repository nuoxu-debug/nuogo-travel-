import { haversineDistanceMeters } from "./haversine.js";

// These are fixed planning estimates, not provider routes, live traffic, or commercial quotes.
export const travelTimeAssumptions = Object.freeze({
  WALK: { speedKph: 5, waitMinutes: 0, baseCostMinor: 0, perStartedKmMinor: 0 },
  PUBLIC_TRANSIT: { speedKph: 25, waitMinutes: 8, baseCostMinor: 300, perStartedKmMinor: 0 },
  TAXI: { speedKph: 30, waitMinutes: 4, baseCostMinor: 1000, perStartedKmMinor: 250 },
  DRIVE: { speedKph: 35, waitMinutes: 3, baseCostMinor: 200, perStartedKmMinor: 100 },
  MIXED: { speedKph: 22, waitMinutes: 6, baseCostMinor: 500, perStartedKmMinor: 100 }
});

export function estimateTravelLeg({ from, to, mode }) {
  const assumptions = travelTimeAssumptions[mode];
  if (!assumptions) throw new TypeError(`Unsupported local travel mode: ${mode}.`);
  const distanceMeters = Math.round(haversineDistanceMeters(from, to));
  const movingMinutes = distanceMeters / 1000 / assumptions.speedKph * 60;
  const estimatedCostMinor = assumptions.baseCostMinor +
    Math.ceil(distanceMeters / 1000) * assumptions.perStartedKmMinor;
  return {
    distanceMeters,
    durationMinutes: Math.max(1, Math.ceil(movingMinutes + assumptions.waitMinutes)),
    estimatedCostMinor,
    sourceType: "ESTIMATED"
  };
}
