const unavailableDescription = Object.freeze({
  en: "Description unavailable",
  zh: "暂无景点介绍"
});

const pointLabels = Object.freeze({
  ORIGIN: { en: "Departure point", zh: "出发地" },
  HOTEL: { en: "Accommodation", zh: "住宿地点" },
  DESTINATION: { en: "Arrival point", zh: "抵达地" },
  TRANSPORT_HUB: { en: "Transport hub", zh: "交通枢纽" },
  POI: { en: "Attraction", zh: "景点" }
});

const transportLabels = Object.freeze({
  WALK: { en: "Walk", zh: "步行" },
  PUBLIC_TRANSIT: { en: "Public transit", zh: "公共交通" },
  TAXI: { en: "Taxi", zh: "出租车" },
  DRIVE: { en: "Drive", zh: "驾车" },
  CYCLING: { en: "Cycle", zh: "骑行" }
});

const mealStyles = Object.freeze({
  ECONOMY: { en: "Good-value local meal", zh: "实惠当地餐食" },
  BALANCED: { en: "Balanced local meal", zh: "均衡当地餐食" },
  COMFORT: { en: "Comfort-focused meal", zh: "舒适型餐食" }
});

function localizedName(activity) {
  const source = activity.poi?.displayName;
  const fallback = activity.poi?.name ?? "Attraction";
  return {
    en: source?.en ?? fallback,
    zh: source?.zh ?? fallback
  };
}

function mealName(time) {
  const hour = Number(String(time ?? "12:00").slice(0, 2));
  if (hour < 11) return { en: "Breakfast", zh: "早餐" };
  if (hour < 15) return { en: "Lunch", zh: "午餐" };
  return { en: "Dinner", zh: "晚餐" };
}

function pointName(point, activitiesById) {
  return activitiesById.get(point.locationId) ?? pointLabels[point.locationType] ?? {
    en: "Travel point",
    zh: "行程地点"
  };
}

function transportPresentation(leg, points) {
  return {
    origin: points.get(leg.fromLocationId) ?? { en: "Travel point", zh: "行程地点" },
    destination: points.get(leg.toLocationId) ?? { en: "Travel point", zh: "行程地点" },
    mode: transportLabels[leg.mode] ?? { en: "Local transport", zh: "当地交通" },
    distanceMeters: leg.distanceMeters,
    durationMinutes: leg.durationMinutes,
    estimatedCostMinor: leg.estimatedCostMinor,
    sourceType: "ESTIMATED"
  };
}

function mealArea(activities, index) {
  const previous = activities.slice(0, index).reverse().find(({ xid }) => xid);
  const next = activities.slice(index + 1).find(({ xid }) => xid);
  const nearby = previous ?? next;
  if (!nearby) return { en: "Within the day's route", zh: "当日路线沿线" };
  const name = localizedName(nearby);
  return { en: `Near ${name.en}`, zh: `${name.zh}附近` };
}

function activityPresentation(activity, context) {
  const startTime = activity.scheduledStartTime ?? activity.plannedStartTime;
  const base = {
    name: localizedName(activity),
    startTime,
    endTime: activity.scheduledEndTime,
    durationMinutes: activity.plannedDurationMinutes,
    durationSourceType: activity.poi?.durationSourceType ?? "ESTIMATED",
    estimatedCostMinor: activity.estimatedActivityCostMinor ?? 0,
    costSourceType: "ESTIMATED",
    ...(activity.reason ? {
      reason: { [context.language]: activity.reason },
      reasonSourceType: "AI_GENERATED"
    } : {})
  };
  if (activity.activityType === "MEAL") {
    const estimatedCostMinor = context.mealEstimateMinor;
    return {
      ...base,
      name: mealName(startTime),
      area: mealArea(context.activities, context.activityIndex),
      style: mealStyles[context.foodTier] ?? mealStyles.BALANCED,
      estimatedCostMinor,
      estimatedCostPerTravellerMinor: Math.round(estimatedCostMinor / context.travellerCount)
    };
  }
  if (!activity.xid) return base;
  return {
    ...base,
    description: activity.poi?.description ?? unavailableDescription,
    ...(activity.poi?.description && activity.poi.descriptionSourceType
      ? { descriptionSourceType: activity.poi.descriptionSourceType }
      : {}),
    ...(context.nextTransport ? { nextTransport: context.nextTransport } : {})
  };
}

function dayTheme(activities) {
  const names = activities.filter(({ xid }) => xid).slice(0, 2).map(localizedName);
  if (!names.length) return { en: "A flexible travel day", zh: "灵活行程日" };
  return {
    en: `Discover ${names.map(({ en }) => en).join(" and ")}`,
    zh: `探索${names.map(({ zh }) => zh).join("与")}`
  };
}

export function enrichItineraryPresentation({ itinerary, preferences = {}, summary = {} }) {
  const language = preferences.language === "en" ? "en" : "zh";
  const travellerCount = Math.max(1, Number(preferences.travellerCount) || 1);
  const totalMealCount = itinerary.days.reduce((count, day) =>
    count + day.activities.filter(({ activityType }) => activityType === "MEAL").length, 0);
  const mealEstimateMinor = totalMealCount
    ? Math.round((summary.categoriesMinor?.foodAndBeverages ?? 0) / totalMealCount)
    : 0;

  return {
    ...itinerary,
    days: itinerary.days.map((day) => {
      const points = new Map();
      for (const activity of day.activities) {
        if (activity.xid) points.set(activity.xid, localizedName(activity));
      }
      points.set(day.startPoint.locationId, pointName(day.startPoint, points));
      points.set(day.endPoint.locationId, pointName(day.endPoint, points));
      const transport = (day.legs ?? []).map((leg) => transportPresentation(leg, points));
      let groundedIndex = 0;
      const activities = day.activities.map((activity, activityIndex) => {
        const nextTransport = activity.xid ? transport[groundedIndex + 1] : undefined;
        if (activity.xid) groundedIndex += 1;
        return {
          ...activity,
          presentation: activityPresentation(activity, {
            language,
            travellerCount,
            foodTier: preferences.foodPreference,
            mealEstimateMinor,
            activities: day.activities,
            activityIndex,
            nextTransport
          })
        };
      });
      const activitySpend = activities.reduce((total, activity) =>
        total + (activity.presentation.estimatedCostMinor ?? 0), 0);
      const transportSpend = transport.reduce((total, leg) =>
        total + (leg.estimatedCostMinor ?? 0), 0);
      return {
        ...day,
        activities,
        presentation: {
          theme: dayTheme(activities),
          themeSourceType: "AI_GENERATED",
          activityCount: activities.length,
          attractionCount: activities.filter(({ xid }) => xid).length,
          mealCount: activities.filter(({ activityType }) => activityType === "MEAL").length,
          transportLegCount: transport.length,
          estimatedDailyCostMinor: activitySpend + transportSpend,
          costSourceType: "ESTIMATED",
          transport
        }
      };
    })
  };
}
