import { tripLegSchema } from "@nuogo/shared/schemas";
import { estimateTravelLeg } from "../travel/estimateTravelTime.js";

function pointSequence(day) {
  return [
    day.startPoint.locationId,
    ...day.activities.flatMap(({ xid }) => xid ? [xid] : []),
    day.endPoint.locationId
  ];
}

export async function buildTripLegs(itinerary, {
  locations,
  mode
}) {
  const days = [];
  for (const day of itinerary.days) {
    const points = pointSequence(day);
    const legs = [];
    let routeUnavailable;
    for (let index = 0; index < points.length - 1; index += 1) {
      const fromLocationId = points[index];
      const toLocationId = points[index + 1];
      try {
        const from = locations[fromLocationId];
        const to = locations[toLocationId];
        if (!from || !to) throw Object.assign(new Error("Route coordinates are unavailable."), { code: "ROUTE_UNAVAILABLE" });
        const resolvedMode = typeof mode === "function"
          ? mode({ day, legIndex: index, fromLocationId, toLocationId, from, to })
          : mode;
        const estimate = estimateTravelLeg({ from, to, mode: resolvedMode });
        const leg = tripLegSchema.parse({
          id: `${itinerary.travelStyle}:${day.dayNumber}:leg:${index + 1}`,
          fromLocationId,
          toLocationId,
          mode: resolvedMode,
          distanceMeters: estimate.distanceMeters,
          durationMinutes: estimate.durationMinutes,
          estimatedCostMinor: estimate.estimatedCostMinor,
          routeSource: "ESTIMATED",
          sourceType: estimate.sourceType
        });
        legs.push(leg);
      } catch (error) {
        routeUnavailable = {
          code: "ROUTE_UNAVAILABLE",
          fromLocationId,
          toLocationId,
          providerCode: error.code
        };
        break;
      }
    }
    days.push({
      ...day,
      legs: routeUnavailable ? [] : legs,
      ...(routeUnavailable ? { routeUnavailable } : {})
    });
  }
  return { ...itinerary, days };
}
