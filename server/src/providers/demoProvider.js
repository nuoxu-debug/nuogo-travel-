import { randomUUID } from "node:crypto";
import { getCity } from "@nuogo/shared/constants";
import { calculateBudget } from "../services/budget.js";
import { getDemoPois } from "../data/demoCatalog.js";

const styleMeta = {
  budget: {
    pace: "active",
    en: "Budget Backpack",
    zh: "轻装省钱",
    summaryEn: "Smart transit, neighborhood food, and high-value city highlights.",
    summaryZh: "公共交通、社区美食与高性价比城市精华。",
    multiplier: 0.72
  },
  food: {
    pace: "balanced",
    en: "Food-Focused",
    zh: "寻味当地",
    summaryEn: "A flavor-led route through markets, regional dishes, and local stories.",
    summaryZh: "沿着市场、地方菜与城市故事展开的寻味路线。",
    multiplier: 1
  },
  leisure: {
    pace: "slow",
    en: "Slow Leisure",
    zh: "慢享悠游",
    summaryEn: "Fewer stops, gentler mornings, and room to enjoy each neighborhood.",
    summaryZh: "减少赶场，放慢早晨，在每个街区留出充足时间。",
    multiplier: 1.18
  }
};

function addDays(dateString, offset) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

const huangshanOffsets = [
  [0.002, 0.004],
  [0.013, -0.007],
  [-0.009, 0.011],
  [0.006, -0.014],
  [-0.018, -0.006],
  [0.019, 0.013],
  [-0.014, 0.019],
  [0.022, -0.018]
];

const huangshanCoordinates = {
  "Hongcun Scenic Area": [117.9847312, 30.004784],
  "Xidi Ancient Village": [117.9944, 29.9024],
  "Liyang Old Street": [118.2848, 29.7089],
  "The Guest-Greeting Pine": [118.1703509, 30.1245907],
  "Bright Summit": [118.1640111, 30.1346774],
  "Tunxi Old Street": [118.3009139, 29.710583],
  "West Sea Grand Canyon": [118.1547407, 30.1410213],
  "Flying-Over Rock": [118.1587831, 30.1379374],
  "Emerald Valley Scenic Area": [118.218755, 30.1142578],
  "Beginning-to-Believe Peak": [118.1700947, 30.1435887]
};

const huangshanClusterCenters = {
  city: { en: "Tunxi", zh: "\u5c6f\u6eaa", longitude: 118.3009, latitude: 29.7106 },
  village: { en: "Ancient Villages", zh: "\u5b8f\u6751\u897f\u9012", longitude: 117.9896, latitude: 29.9536 },
  mountain: { en: "Huangshan Scenic Area", zh: "\u9ec4\u5c71\u98ce\u666f\u533a", longitude: 118.1701, latitude: 30.1347 },
  huizhou: { en: "Shexian Huizhou", zh: "\u6b59\u53bf\u5fbd\u5dde", longitude: 118.428, latitude: 29.867 }
};

const huangshanClusterOrder = {
  budget: ["city", "huizhou", "mountain", "village"],
  food: ["city", "huizhou", "mountain", "village"],
  leisure: ["city", "huizhou", "mountain", "village"]
};

const huangshanSupportMediaByCluster = {
  city: {
    food: "https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=900&q=80",
    experience: "https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?auto=format&fit=crop&w=900&q=80",
    stay: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80"
  },
  huizhou: {
    food: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=900&q=80",
    experience: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    stay: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80"
  },
  mountain: {
    food: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80",
    experience: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80",
    stay: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=900&q=80"
  },
  village: {
    food: "https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=900&q=80",
    experience: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80",
    stay: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80"
  }
};

const huangshanFoodByCluster = {
  city: [
    ["Tunxi Old Street Huizhou Snack Walk", "\u5c6f\u6eaa\u8001\u8857\u5fbd\u5473\u5c0f\u5403", 55, 118.3006, 29.7108],
    ["Liyang Lane Local Dinner", "\u9ece\u9633\u5df7\u672c\u5730\u665a\u9910", 75, 118.2849, 29.7087]
  ],
  village: [
    ["Hongcun Village Huizhou Lunch", "\u5b8f\u6751\u5fbd\u83dc\u5348\u9910", 70, 117.9851, 30.0041],
    ["Xidi Farmhouse Dinner", "\u897f\u9012\u519c\u5bb6\u665a\u9910", 80, 117.9948, 29.9021]
  ],
  mountain: [
    ["Tangkou Mountain Base Meal", "\u6c64\u53e3\u5c71\u4e0b\u8865\u7ed9\u9910", 65, 118.1831, 30.0815],
    ["Scenic Area Light Meal", "\u9ec4\u5c71\u666f\u533a\u8f7b\u98df", 85, 118.1666, 30.1328]
  ],
  huizhou: [
    ["Huizhou Ancient City Noodle Lunch", "\u5fbd\u5dde\u53e4\u57ce\u9762\u9986\u5348\u9910", 50, 118.4286, 29.8674],
    ["Shexian Local Cuisine Dinner", "\u6b59\u53bf\u5fbd\u83dc\u665a\u9910", 85, 118.4275, 29.8668]
  ]
};

const huangshanExperienceByCluster = {
  city: [
    ["Huizhou Ink Workshop Visit", "\u5fbd\u58a8\u5c0f\u4f5c\u574a\u4f53\u9a8c", 35, 118.2988, 29.7114],
    ["Xin'an River Evening Walk", "\u65b0\u5b89\u6c5f\u508d\u665a\u6f2b\u6b65", 0, 118.3032, 29.7132]
  ],
  village: [
    ["Moon Pond Photo Route", "\u6708\u6cbc\u5149\u5f71\u62cd\u7167\u7ebf", 0, 117.9849, 30.0052],
    ["Huizhou Courtyard Tea Break", "\u5fbd\u6d3e\u9662\u843d\u8336\u6b47", 45, 117.9951, 29.9027]
  ],
  mountain: [
    ["Cloud Sea Viewpoint Pause", "\u4e91\u6d77\u89c2\u666f\u70b9\u505c\u7559", 0, 118.1661, 30.1363],
    ["Tangkou Hot Spring Foot Bath", "\u6c64\u53e3\u6e29\u6cc9\u6ce1\u811a", 68, 118.1837, 30.0808]
  ],
  huizhou: [
    ["Huizhou Archway Photo Stop", "\u5fbd\u5dde\u724c\u574a\u62cd\u7167\u70b9", 0, 118.4292, 29.8679],
    ["Shexian Tea House Rest", "\u6b59\u53bf\u8336\u9986\u5c0f\u61a9", 40, 118.4268, 29.8664]
  ]
};

const huangshanStayByCluster = {
  city: {
    budget_hotel: ["Tunxi Station Budget Hotel Area", "\u5c6f\u6eaa\u8f66\u7ad9\u7ecf\u6d4e\u9152\u5e97\u533a", 180],
    boutique_homestay: ["Tunxi Old Street Boutique Stay", "\u5c6f\u6eaa\u8001\u8857\u7cbe\u54c1\u6c11\u5bbf", 320],
    family_resort: ["Tunxi Riverside Family Hotel", "\u5c6f\u6eaa\u6cb3\u7554\u4eb2\u5b50\u9152\u5e97", 460]
  },
  village: {
    budget_hotel: ["Yi County Value Inn Area", "\u9edf\u53bf\u6027\u4ef7\u6bd4\u5ba2\u6808\u533a", 220],
    boutique_homestay: ["Hongcun Huizhou Courtyard Stay", "\u5b8f\u6751\u5fbd\u6d3e\u9662\u843d\u6c11\u5bbf", 420],
    family_resort: ["Ancient Village Family Guesthouse", "\u53e4\u6751\u4eb2\u5b50\u5ba2\u6808", 520]
  },
  mountain: {
    budget_hotel: ["Tangkou Transfer Budget Hotel", "\u6c64\u53e3\u6362\u4e58\u7ecf\u6d4e\u9152\u5e97", 240],
    boutique_homestay: ["Tangkou Mountain View Homestay", "\u6c64\u53e3\u5c71\u666f\u6c11\u5bbf", 430],
    family_resort: ["Huangshan Hot Spring Family Resort", "\u9ec4\u5c71\u6e29\u6cc9\u4eb2\u5b50\u5ea6\u5047\u533a", 680]
  },
  huizhou: {
    budget_hotel: ["Shexian Old Town Budget Stay", "\u6b59\u53bf\u53e4\u57ce\u7ecf\u6d4e\u4f4f\u5bbf", 190],
    boutique_homestay: ["Huizhou Courtyard Boutique Stay", "\u5fbd\u5dde\u9662\u843d\u7cbe\u54c1\u6c11\u5bbf", 360],
    family_resort: ["Shexian Family Hotel Area", "\u6b59\u53bf\u4eb2\u5b50\u9152\u5e97\u533a", 480]
  }
};

const supportedCategories = new Set([
  "natural_scenery",
  "historical_relics",
  "city_landmarks",
  "local_street_food",
  "regional_cuisines",
  "boutique_homestays",
  "budget_hotels",
  "family_resorts"
]);

function bilingual(en, zh) {
  return { en, zh };
}

function groundedPois(attractions, city) {
  if (!attractions?.length) {
    throw new Error("No approved Huangshan attractions are available.");
  }

  return attractions.map((attraction, index) => {
    const offset = huangshanOffsets[index % huangshanOffsets.length];
    const englishName = attraction.nameEn || attraction.nameZh;
    const curatedCoordinates = huangshanCoordinates[englishName];
    const hasSourceCoordinates = Number.isFinite(attraction.longitude) &&
      Number.isFinite(attraction.latitude);
    return {
      name: bilingual(englishName, attraction.nameZh),
      description: bilingual(
        attraction.descriptionEn || `Visit ${englishName} using Nuogo's approved Huangshan catalogue.`,
        attraction.descriptionZh || `游览${attraction.nameZh}，行程依据 Nuogo 已审核的黄山景点资料生成。`
      ),
      category: supportedCategories.has(attraction.category)
        ? attraction.category
        : "natural_scenery",
      cost: attraction.ticketPriceMin ?? 40,
      address: bilingual(
        attraction.address || attraction.locationLabel || city.name.en,
        attraction.address || attraction.locationLabel || city.name.zh
      ),
      location: {
        longitude: hasSourceCoordinates
          ? attraction.longitude
          : curatedCoordinates?.[0] ?? city.center[0] + offset[0],
        latitude: hasSourceCoordinates
          ? attraction.latitude
          : curatedCoordinates?.[1] ?? city.center[1] + offset[1]
      },
      routeCluster: huangshanClusterFor({
        nameEn: englishName,
        locationLabel: attraction.locationLabel,
        longitude: hasSourceCoordinates ? attraction.longitude : curatedCoordinates?.[0],
        latitude: hasSourceCoordinates ? attraction.latitude : curatedCoordinates?.[1]
      }),
      locationIsEstimated: !hasSourceCoordinates,
      guide: {
        culture: bilingual(
          "Review the local landscape and cultural context at the site.",
          "在现场了解黄山的自然景观与地方文化背景。"
        ),
        food: bilingual(
          "Plan meals around verified local restaurants near the route.",
          "沿路线选择信息可核实的本地餐馆用餐。"
        ),
        crowd: bilingual(
          "Start early and confirm current visitor controls before departure.",
          "建议提早出发，并在出行前确认最新客流管理安排。"
        ),
        visit: bilingual(
          "Confirm current opening hours and ticket rules before visiting.",
          "游览前请确认最新开放时间与门票规则。"
        )
      },
      sourceAttractionId: attraction.id,
      sourceProvider: attraction.sourceProvider,
      sourceUrl: attraction.sourceUrl,
      imageUrl: attraction.thumbnailUrl
        ? `/api/attractions/${attraction.id}/image`
        : undefined,
      imageAttribution: attraction.imageAttribution,
      visitDetails: attraction.visitDetails
    };
  });
}

function huangshanClusterFor(poi) {
  const text = `${poi.nameEn ?? ""} ${poi.locationLabel ?? ""}`.toLowerCase();
  if (text.includes("tunxi") || text.includes("liyang")) return "city";
  if (text.includes("hongcun") || text.includes("xidi") || text.includes("village") || text.includes("yi county")) return "village";
  if (text.includes("shexian") || text.includes("huizhou")) return "huizhou";
  if (Number.isFinite(poi.longitude) && Number.isFinite(poi.latitude)) {
    const synthetic = {
      location: { longitude: poi.longitude, latitude: poi.latitude }
    };
    return Object.entries(huangshanClusterCenters)
      .map(([cluster, center]) => ({
        cluster,
        distance: distanceBetween(synthetic, {
          location: { longitude: center.longitude, latitude: center.latitude }
        })
      }))
      .sort((left, right) => left.distance - right.distance)[0].cluster;
  }
  return "mountain";
}

function distanceBetween(left, right) {
  const toRadians = (value) => value * Math.PI / 180;
  const lat1 = toRadians(left.location.latitude);
  const lat2 = toRadians(right.location.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(right.location.longitude - left.location.longitude);
  const a = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function optimizeRoute(points) {
  if (points.length < 3) return [...points];

  const remaining = points.slice(1);
  const route = [points[0]];
  while (remaining.length) {
    const current = route[route.length - 1];
    let nearestIndex = 0;
    let nearestDistance = distanceBetween(current, remaining[0]);
    for (let index = 1; index < remaining.length; index += 1) {
      const distance = distanceBetween(current, remaining[index]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }
    route.push(remaining.splice(nearestIndex, 1)[0]);
  }
  return route;
}

function prioritizeForStyle(pool, style) {
  if (style === "budget") {
    return [...pool].sort((left, right) => left.cost - right.cost);
  }
  if (style === "leisure") {
    return pool
      .map((poi, index) => ({ poi, index }))
      .sort((left, right) =>
        right.poi.cost - left.poi.cost || right.index - left.index
      )
      .map(({ poi }) => poi);
  }

  const foodCategories = new Set(["local_street_food", "regional_cuisines"]);
  const foodStops = pool.filter((poi) => foodCategories.has(poi.category));
  const otherStops = pool.filter((poi) => !foodCategories.has(poi.category));
  if (foodStops.length) return [...foodStops, ...otherStops];

  const offset = Math.max(1, Math.floor(pool.length / 3));
  return [...pool.slice(offset), ...pool.slice(0, offset)];
}

function distributeAcrossDays(route, dayCount, maxStopsPerDay) {
  const selected = route.slice(0, dayCount * maxStopsPerDay);
  const baseSize = Math.floor(selected.length / dayCount);
  const extraDays = selected.length % dayCount;
  let cursor = 0;

  return Array.from({ length: dayCount }, (_, dayIndex) => {
    const size = baseSize + (dayIndex < extraDays ? 1 : 0);
    const day = selected.slice(cursor, cursor + size);
    cursor += size;
    return day;
  });
}

const scheduleByStyle = {
  budget: [["08:00", "10:00"], ["10:30", "12:00"], ["12:15", "13:15"], ["14:00", "15:30"], ["16:00", "17:10"]],
  food: [["09:00", "10:45"], ["11:30", "12:50"], ["13:30", "15:00"], ["15:30", "17:00"], ["17:10", "18:00"]],
  leisure: [["10:00", "12:00"], ["12:30", "13:50"], ["14:30", "16:00"], ["16:20", "17:20"]]
};

const stayCategories = new Set(["boutique_homestays", "budget_hotels", "family_resorts"]);

function toActivity(poi, dayIndex, index, meta, style) {
  const slots = scheduleByStyle[style];
  const [startTime, endTime] = stayCategories.has(poi.category)
    ? ["20:00", "20:20"]
    : slots[index] ?? ["17:30", "18:30"];

  return {
    id: randomUUID(),
    order: index,
    startTime,
    endTime,
    name: poi.name,
    description: poi.description,
    category: poi.category,
    address: poi.address,
    location: {
      longitude: poi.location.longitude + (poi.sourceAttractionId ? 0 : dayIndex * 0.0007),
      latitude: poi.location.latitude - (poi.sourceAttractionId ? 0 : dayIndex * 0.0005)
    },
    estimatedCost: Math.round(poi.cost * meta.multiplier),
    transportNote: {
      en: index === 0
        ? "Start from the nearest practical transport hub"
        : "Next stop selected to reduce route backtracking",
      zh: index === 0 ? "地铁后步行一小段" : "地铁或公交约20分钟"
    },
    guide: poi.guide,
    routeCluster: poi.routeCluster,
    ...(poi.imageUrl ? {
      imageUrl: poi.imageUrl,
      imageAttribution: poi.imageAttribution
    } : {}),
    ...(poi.sourceAttractionId ? {
      sourceAttractionId: poi.sourceAttractionId,
      sourceProvider: poi.sourceProvider,
      sourceUrl: poi.sourceUrl,
      ...(poi.visitDetails ? { visitDetails: poi.visitDetails } : {}),
      locationIsEstimated: poi.locationIsEstimated
    } : {}),
    votes: 0,
    isFavorite: false
  };
}

function makeSupportPoi({ nameEn, nameZh, category, cost, longitude, latitude, cluster, mediaRole }) {
  const center = huangshanClusterCenters[cluster];
  const media = huangshanSupportMediaByCluster[cluster]?.[mediaRole];
  return {
    name: bilingual(nameEn, nameZh),
    description: bilingual(
      category.includes("hotel") || category.includes("homestays") || category.includes("resorts")
        ? `Recommended stay base in ${center.en}; confirm live room price before booking.`
        : `Local meal stop in ${center.en}, chosen to keep the day route compact.`,
      category.includes("hotel") || category.includes("homestays") || category.includes("resorts")
        ? `${center.zh}\u63a8\u8350\u4f4f\u5bbf\u533a\uff0c\u9884\u8ba2\u524d\u8bf7\u786e\u8ba4\u5b9e\u65f6\u623f\u4ef7\u3002`
        : `${center.zh}\u9644\u8fd1\u7684\u672c\u5730\u7528\u9910\u70b9\uff0c\u7528\u4e8e\u4fdd\u6301\u5f53\u65e5\u8def\u7ebf\u7d27\u51d1\u3002`
    ),
    category,
    cost,
    address: bilingual(center.en, center.zh),
    location: { longitude, latitude },
    routeCluster: cluster,
    ...(media ? {
      imageUrl: media,
      imageAttribution: "Illustrative image: Unsplash"
    } : {}),
    guide: {
      culture: bilingual("Use this stop as local context between scenic visits.", "\u7528\u8fd9\u4e00\u7ad9\u8854\u63a5\u666f\u70b9\u4e0e\u5730\u65b9\u751f\u6d3b\u3002"),
      food: bilingual("Try Anhui-style dishes and keep orders within the selected budget.", "\u5c1d\u8bd5\u5fbd\u83dc\u6216\u672c\u5730\u5c0f\u5403\uff0c\u5e76\u6309\u9884\u7b97\u63a7\u5236\u70b9\u5355\u3002"),
      crowd: bilingual("Book ahead during weekends and holidays.", "\u5468\u672b\u548c\u8282\u5047\u65e5\u5efa\u8bae\u63d0\u524d\u9884\u8ba2\u3002"),
      visit: bilingual("Keep it close to the day's route instead of crossing the city.", "\u4f18\u5148\u9009\u62e9\u5f53\u65e5\u8def\u7ebf\u9644\u8fd1\uff0c\u51cf\u5c11\u8de8\u533a\u6298\u8fd4\u3002")
    }
  };
}

function supportPoisForCluster(cluster, dayIndex, accommodation, style) {
  const foodOptions = huangshanFoodByCluster[cluster] ?? huangshanFoodByCluster.mountain;
  const food = foodOptions[(style === "food" ? dayIndex + 1 : dayIndex) % foodOptions.length];
  const experienceOptions = huangshanExperienceByCluster[cluster] ?? huangshanExperienceByCluster.mountain;
  const experience = experienceOptions[(style === "leisure" ? dayIndex + 1 : dayIndex) % experienceOptions.length];
  const secondExperience = experienceOptions[(style === "leisure" ? dayIndex : dayIndex + 1) % experienceOptions.length];
  const stay = (huangshanStayByCluster[cluster] ?? huangshanStayByCluster.mountain)[accommodation] ??
    huangshanStayByCluster[cluster].budget_hotel;
  const center = huangshanClusterCenters[cluster];
  return [
    makeSupportPoi({
      nameEn: food[0],
      nameZh: food[1],
      category: style === "food" ? "regional_cuisines" : "local_street_food",
      cost: food[2],
      longitude: food[3],
      latitude: food[4],
      cluster,
      mediaRole: "food"
    }),
    makeSupportPoi({
      nameEn: experience[0],
      nameZh: experience[1],
      category: cluster === "mountain" ? "natural_scenery" : "city_landmarks",
      cost: experience[2],
      longitude: experience[3],
      latitude: experience[4],
      cluster,
      mediaRole: "experience"
    }),
    makeSupportPoi({
      nameEn: secondExperience[0],
      nameZh: secondExperience[1],
      category: cluster === "mountain" ? "natural_scenery" : "city_landmarks",
      cost: secondExperience[2],
      longitude: secondExperience[3],
      latitude: secondExperience[4],
      cluster,
      mediaRole: "experience"
    }),
    makeSupportPoi({
      nameEn: stay[0],
      nameZh: stay[1],
      category: accommodation === "boutique_homestay"
        ? "boutique_homestays"
        : accommodation === "family_resort" ? "family_resorts" : "budget_hotels",
      cost: stay[2],
      longitude: center.longitude + 0.002,
      latitude: center.latitude - 0.002,
      cluster,
      mediaRole: "stay"
    })
  ];
}

function distributeHuangshanByCluster(pool, preferences, style, maxAttractionsPerDay) {
  const ordered = prioritizeForStyle(pool, style);
  const groups = new Map();
  for (const poi of ordered) {
    const cluster = poi.routeCluster ?? "mountain";
    if (!groups.has(cluster)) groups.set(cluster, []);
    groups.get(cluster).push(poi);
  }

  const clusterOrder = preferences.days >= 4
    ? [...huangshanClusterOrder[style]]
    : huangshanClusterOrder[style].filter((cluster) => groups.has(cluster));
  const fallbackOrder = [...groups.keys()].filter((cluster) => !clusterOrder.includes(cluster));
  const orderedClusters = [...clusterOrder, ...fallbackOrder];
  const used = new Set();

  return Array.from({ length: preferences.days }, (_, dayIndex) => {
    const cluster = orderedClusters[dayIndex % orderedClusters.length] ?? "mountain";
    const candidates = groups.get(cluster) ?? [];
    const attractionStops = [];
    for (const poi of candidates) {
      const key = poi.sourceAttractionId ?? poi.name.en;
      if (!used.has(key)) {
        used.add(key);
        attractionStops.push(poi);
      }
      if (attractionStops.length === maxAttractionsPerDay) break;
    }
    const [mealStop, localExperience, secondLocalExperience, stayStop] = supportPoisForCluster(
      cluster,
      dayIndex,
      preferences.accommodation,
      style
    );
    const scenicStops = optimizeRoute(attractionStops);
    if (!scenicStops.length) {
      return [
        localExperience,
        mealStop,
        secondLocalExperience,
        stayStop
      ];
    }
    return [
      ...scenicStops.slice(0, 2),
      mealStop,
      ...scenicStops.slice(2),
      localExperience,
      secondLocalExperience,
      stayStop
    ];
  });
}

/**
 * FYP novelty: deterministic demo generation mirrors the live provider's
 * contract so the entire triple-plan workflow remains presentable offline.
 */
export class DemoPlanProvider {
  async generateStructured({ user }) {
    const payload = JSON.parse(user);
    const data = payload.UNTRUSTED_USER_DATA ?? payload.UNTRUSTED_REPAIR_DATA;
    const source = data.preferences ? data.preferences : data.draft.trip;
    const profile = data.profile ?? data.draft.variant;
    const candidateIds = data.allowedCandidateIds;
    const profileOffset = ["BUDGET_SAVING", "BALANCED", "COMFORT_FOCUSED"].indexOf(profile);
    const dayCount = Math.round(
      (new Date(`${source.endDate}T00:00:00Z`) - new Date(`${source.startDate}T00:00:00Z`)) / 86_400_000
    ) + 1;
    if (candidateIds.length < dayCount) throw new Error("The demo candidate pool is too small for this trip duration.");
    return JSON.stringify({
      variant: profile,
      trip: {
        origin: source.origin,
        destination: source.destination,
        startDate: source.startDate,
        endDate: source.endDate,
        travellerCount: source.travellerCount,
        totalBudgetCny: source.totalBudgetCny
      },
      days: Array.from({ length: dayCount }, (_, index) => ({
        dayNumber: index + 1,
        date: addDays(source.startDate, index),
        startPoint: index === 0
          ? { locationId: "origin", locationType: "ORIGIN" }
          : { locationId: "hotel", locationType: "HOTEL" },
        activities: [{
          sequence: 1,
          poiId: candidateIds[(profileOffset + index) % candidateIds.length],
          activityType: index % 2 ? "FOOD" : "HISTORY",
          plannedStartTime: "10:00",
          plannedDurationMinutes: profile === "COMFORT_FOCUSED" ? 75 : 90,
          reason: "Grounded demo stop selected for this spending profile."
        }],
        endPoint: index === dayCount - 1
          ? { locationId: "destination", locationType: "DESTINATION" }
          : { locationId: "hotel", locationType: "HOTEL" }
      }))
    });
  }

  async generate(preferences, style, context = {}) {
    const meta = styleMeta[style];
    const city = getCity(preferences.destination);
    const pool = preferences.destination === "huangshan"
      ? groundedPois(context.attractions, city)
      : getDemoPois(preferences.destination);
    const tripId = preferences.tripId ?? randomUUID();
    const variantId = randomUUID();
    const maxStops = style === "budget" ? 5 : style === "food" ? 5 : 4;
    const dayPools = preferences.destination === "huangshan"
      ? distributeHuangshanByCluster(pool, preferences, style, Math.max(1, maxStops - 2))
      : distributeAcrossDays(optimizeRoute(prioritizeForStyle(pool, style)), preferences.days, maxStops);

    const days = Array.from({ length: preferences.days }, (_, dayIndex) => {
      const activities = dayPools[dayIndex].map((poi, index) =>
        toActivity(poi, dayIndex, index, meta, style)
      );

      return {
        id: randomUUID(),
        dayNumber: dayIndex + 1,
        date: addDays(preferences.startDate, dayIndex),
        title: {
          en: dayIndex === 0 ? `First rhythm of ${city.name.en}` : `${city.name.en} neighborhood trail`,
          zh: dayIndex === 0 ? `初识${city.name.zh}` : `${city.name.zh}街区漫游`
        },
        activities
      };
    });

    const draft = {
      id: variantId,
      tripId,
      style,
      title: {
        en: `${meta.en}: ${preferences.days} days in ${city.name.en}`,
        zh: `${meta.zh}：${city.name.zh}${preferences.days}日`
      },
      summary: { en: meta.summaryEn, zh: meta.summaryZh },
      destination: preferences.destination,
      startDate: preferences.startDate,
      totalBudget: preferences.totalBudget,
      pace: meta.pace,
      highlights: {
        en: pool.slice(0, 3).map((poi) => poi.name.en),
        zh: pool.slice(0, 3).map((poi) => poi.name.zh)
      },
      budget: {
        scenicTickets: 0,
        localFood: 0,
        transportation: 0,
        accommodation: 0
      },
      days,
      isFallback: false
    };

    draft.budget = calculateBudget(draft, preferences.totalBudget).categories;
    return JSON.stringify(draft);
  }
}
