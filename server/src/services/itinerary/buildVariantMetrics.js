function countBy(items, key) {
  return items.reduce((counts, item) => ({
    ...counts,
    [item[key]]: (counts[item[key]] ?? 0) + 1
  }), {});
}

function pointLabel(point) {
  if (point.locationType === "ORIGIN") return "Origin";
  if (point.locationType === "DESTINATION") return "Departure";
  if (point.locationType === "HOTEL") return "Hotel";
  return point.locationId;
}

function daySummary(day) {
  const items = [{ type: "START", label: pointLabel(day.startPoint) }];
  day.activities.forEach((activity, index) => {
    const leg = day.legs[index];
    if (leg) {
      items.push({
        type: "LEG",
        label: `${leg.durationMinutes} min ${leg.mode.replaceAll("_", " ").toLowerCase()}`,
        mode: leg.mode,
        distanceMeters: leg.distanceMeters,
        durationMinutes: leg.durationMinutes,
        estimatedCostFen: leg.estimatedCostFen,
        routeSource: leg.routeSource
      });
    }
    items.push({
      type: activity.activityType === "FOOD" ? "MEAL" : "ACTIVITY",
      label: activity.poi?.name ?? activity.poiId,
      startTime: activity.scheduledStartTime ?? activity.plannedStartTime
    });
  });
  const finalLeg = day.legs[day.activities.length];
  if (finalLeg) {
    items.push({
      type: "LEG",
      label: `${finalLeg.durationMinutes} min ${finalLeg.mode.replaceAll("_", " ").toLowerCase()}`,
      mode: finalLeg.mode,
      distanceMeters: finalLeg.distanceMeters,
      durationMinutes: finalLeg.durationMinutes,
      estimatedCostFen: finalLeg.estimatedCostFen,
      routeSource: finalLeg.routeSource
    });
  }
  items.push({ type: "END", label: pointLabel(day.endPoint) });
  return {
    dayNumber: day.dayNumber,
    date: day.date,
    activityCount: day.activities.filter(({ activityType }) => activityType !== "FOOD").length,
    mealCount: day.activities.filter(({ activityType }) => activityType === "FOOD").length,
    tripLegCount: day.legs.length,
    items
  };
}

export function buildVariantMetrics(itinerary, summary, profileDefinition) {
  const activities = itinerary.days.flatMap((day) => day.activities);
  const legs = itinerary.days.flatMap((day) => day.legs ?? []);
  const transportDistribution = countBy(legs, "mode");
  const paidActivityCount = activities.filter(({ estimatedActivityCostFen }) => estimatedActivityCostFen > 0).length;
  const valueLegCount = (transportDistribution.WALK ?? 0) + (transportDistribution.PUBLIC_TRANSIT ?? 0);
  const differences = itinerary.variant === "BUDGET_SAVING"
    ? [`${valueLegCount} of ${legs.length} local legs use walking or public transit`, "Budget accommodation estimate", "Lower daily meal allowance"]
    : itinerary.variant === "BALANCED"
      ? [`${transportDistribution.TAXI ?? 0} taxi legs balanced with public transit`, "Mid-range accommodation estimate", "Balanced meal allowance"]
      : [`${transportDistribution.TAXI ?? 0} taxi legs reduce transfer effort`, "Comfort accommodation estimate", "Higher meal allowance"];

  return {
    activityCount: activities.length,
    attractionCount: activities.filter(({ activityType }) => activityType !== "FOOD").length,
    mealCount: activities.filter(({ activityType }) => activityType === "FOOD").length,
    paidActivityCount,
    freeActivityCount: activities.length - paidActivityCount,
    tripLegCount: legs.length,
    walkingDistanceMeters: legs
      .filter(({ mode }) => mode === "WALK")
      .reduce((total, { distanceMeters }) => total + distanceMeters, 0),
    transportDistribution,
    accommodationTier: profileDefinition.accommodationTier,
    foodTier: profileDefinition.foodTier,
    pace: profileDefinition.pace,
    estimatedTotalFen: summary.totalFen,
    remainingFen: summary.remainingFen,
    keyAttractions: activities
      .filter(({ activityType }) => activityType !== "FOOD")
      .slice(0, 4)
      .map((activity) => activity.poi?.name ?? activity.poiId),
    differences,
    daySummaries: itinerary.days.map(daySummary)
  };
}
