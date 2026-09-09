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
  let legIndex = 0;
  day.activities.forEach((activity) => {
    const leg = activity.xid ? day.legs[legIndex++] : undefined;
    if (leg) {
      items.push({
        type: "LEG",
        label: `${leg.durationMinutes} min ${leg.mode.replaceAll("_", " ").toLowerCase()}`,
        mode: leg.mode,
        distanceMeters: leg.distanceMeters,
        durationMinutes: leg.durationMinutes,
        estimatedCostMinor: leg.estimatedCostMinor,
        routeSource: leg.routeSource,
        sourceType: leg.sourceType
      });
    }
    items.push({
      type: activity.activityType === "MEAL" ? "MEAL" : "ACTIVITY",
      label: activity.poi?.name ?? activity.activityType,
      startTime: activity.scheduledStartTime ?? activity.plannedStartTime
    });
  });
  const finalLeg = day.legs[legIndex];
  if (finalLeg) {
    items.push({
      type: "LEG",
      label: `${finalLeg.durationMinutes} min ${finalLeg.mode.replaceAll("_", " ").toLowerCase()}`,
      mode: finalLeg.mode,
      distanceMeters: finalLeg.distanceMeters,
      durationMinutes: finalLeg.durationMinutes,
      estimatedCostMinor: finalLeg.estimatedCostMinor,
      routeSource: finalLeg.routeSource,
      sourceType: finalLeg.sourceType
    });
  }
  items.push({ type: "END", label: pointLabel(day.endPoint) });
  return {
    dayNumber: day.dayNumber,
    date: day.date,
    activityCount: day.activities.filter(({ activityType }) => activityType !== "MEAL").length,
    mealCount: day.activities.filter(({ activityType }) => activityType === "MEAL").length,
    tripLegCount: day.legs.length,
    items
  };
}

export function buildVariantMetrics(itinerary, summary, profileDefinition) {
  const activities = itinerary.days.flatMap((day) => day.activities);
  const legs = itinerary.days.flatMap((day) => day.legs ?? []);
  const transportDistribution = countBy(legs, "mode");
  const paidActivityCount = activities.filter(({ estimatedActivityCostMinor }) => estimatedActivityCostMinor > 0).length;
  const valueLegCount = (transportDistribution.WALK ?? 0) + (transportDistribution.PUBLIC_TRANSIT ?? 0);
  const differences = itinerary.travelStyle === "BUDGET_SAVING"
    ? [`${valueLegCount} of ${legs.length} local legs use walking or public transit`, "Budget accommodation estimate", "Lower daily meal allowance"]
    : itinerary.travelStyle === "BALANCED"
      ? [`${transportDistribution.TAXI ?? 0} taxi legs balanced with public transit`, "Mid-range accommodation estimate", "Balanced meal allowance"]
      : [`${transportDistribution.TAXI ?? 0} taxi legs reduce transfer effort`, "Comfort accommodation estimate", "Higher meal allowance"];

  return {
    activityCount: activities.length,
    attractionCount: activities.filter(({ xid }) => xid).length,
    mealCount: activities.filter(({ activityType }) => activityType === "MEAL").length,
    paidActivityCount,
    freeActivityCount: activities.length - paidActivityCount,
    tripLegCount: legs.length,
    walkingDistanceMeters: legs
      .filter(({ mode }) => mode === "WALK")
      .reduce((total, { distanceMeters }) => total + distanceMeters, 0),
    transportDistribution,
    accommodationTier: profileDefinition.accommodationTier,
    localTransportationTier: profileDefinition.localTransportationTier,
    foodTier: profileDefinition.foodTier,
    pace: profileDefinition.pace,
    estimatedTotalMinor: summary.totalMinor,
    baselineMandatoryCostMinor: summary.baselineMandatoryCostMinor,
    profileControlledCostMinor: summary.profileControlledCostMinor,
    utilisationPercent: summary.utilisationPercent,
    remainingMinor: summary.remainingMinor,
    keyAttractions: activities
      .filter(({ xid }) => xid)
      .slice(0, 4)
      .map((activity) => activity.poi?.name ?? activity.xid),
    differences,
    daySummaries: itinerary.days.map(daySummary)
  };
}
