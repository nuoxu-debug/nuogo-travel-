import { tripLegSchema } from "@nuogo/shared/schemas";

function pointSequence(day) {
  return [
    day.startPoint.locationId,
    ...day.activities.map(({ poiId }) => poiId),
    day.endPoint.locationId
  ];
}

export async function buildTripLegs(itinerary, {
  locations,
  routeProvider,
  mode,
  routeCostResolver
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
        const route = await routeProvider.getRoute({
          from,
          to,
          mode: resolvedMode,
          city: itinerary.trip.destination
        });
        const durationMinutes = Math.ceil(Number(route.durationSeconds) / 60);
        const estimatedCostFen = routeCostResolver(route, {
          mode: resolvedMode,
          fromLocationId,
          toLocationId
        });
        const leg = tripLegSchema.parse({
          id: `${itinerary.variant}:${day.dayNumber}:leg:${index + 1}`,
          fromLocationId,
          toLocationId,
          mode: resolvedMode,
          distanceMeters: Math.round(Number(route.distanceMeters)),
          durationMinutes,
          estimatedCostFen,
          routeSource: route.provider,
          routeRetrievedAt: route.retrievedAt
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
