import { translate } from "./translations.js";

const labels = {
  profile: { BUDGET_SAVING: ["Budget-Saving", "省钱优先"], BALANCED: ["Balanced", "均衡舒适"], COMFORT_FOCUSED: ["Comfort-focused", "舒适优先"] },
  profileDescription: { BUDGET_SAVING: ["Value-led choices", "优先高性价比选择"], BALANCED: ["A practical balance", "兼顾体验、节奏与预算"], COMFORT_FOCUSED: ["More ease where valuable", "在有价值之处提升舒适度"] },
  activity: { CULTURE: ["Culture", "文化"], HISTORY: ["History", "历史"], NATURE: ["Nature", "自然"], SHOPPING: ["Shopping", "购物"], ENTERTAINMENT: ["Entertainment", "娱乐"], FAMILY: ["Family", "亲子"], FOOD: ["Food", "美食"], MEAL: ["Meal", "用餐"], TRANSFER: ["Transfer", "交通"], ACCOMMODATION: ["Accommodation", "住宿"], REST: ["Rest", "休息"], DEPARTURE: ["Departure", "离开"] },
  category: { ATTRACTION: ["Attraction", "景点"], CULTURE: ["Culture", "文化"], HISTORY: ["History", "历史"], NATURE: ["Nature", "自然"], SHOPPING: ["Shopping", "购物"], ENTERTAINMENT: ["Entertainment", "娱乐"], FAMILY: ["Family", "亲子"], FOOD: ["Food", "美食"] },
  transport: { WALK: ["Walk", "步行"], PUBLIC_TRANSIT: ["Public transport", "公共交通"], TAXI: ["Taxi", "出租车"], MIXED: ["Mixed transport", "混合交通"] },
  source: { OPENTRIPMAP: ["OpenTripMap API", "OpenTripMap API"], OPENTRIPMAP_API: ["OpenTripMap API", "OpenTripMap API"], DATABASE_BACKED: ["Database-backed", "数据库资料"], AI_GENERATED: ["AI-generated", "AI 生成"], ESTIMATED: ["Estimated", "估算"], ONEMAP: ["OneMap route", "OneMap 路线"], STATIC_REFERENCE: ["Static reference", "静态参考"], USER_PROVIDED: ["User-provided", "用户提供"], DEMO_FIXTURE: ["Demo fixture", "演示资料"], UNAVAILABLE: ["Unavailable", "暂无资料"], APPLICATION_CONTENT: ["Nuogo content", "Nuogo 内容"] },
  verification: { MATCHED: ["Matched", "已匹配"], SUPPORTING_ONLY: ["Supporting information", "辅助资料"], PRIMARY_ONLY: ["Primary source only", "仅主要来源"], AMBIGUOUS: ["Ambiguous", "匹配不明确"], UNMATCHED: ["Unmatched", "未匹配"] },
  pace: { ACTIVE: ["Active", "紧凑"], MODERATE: ["Moderate", "适中"], RELAXED: ["Relaxed", "轻松"] },
  accommodation: { BUDGET: ["Budget", "经济型"], MID_RANGE: ["Mid-range", "中档"], COMFORT: ["Comfort", "舒适型"] },
  food: { ECONOMY: ["Economy", "实惠"], BALANCED: ["Balanced", "均衡"], COMFORT: ["Comfort", "舒适"] },
  status: { FINAL_VALIDATED: ["Validated", "已验证"], INVALIDATED: ["Needs revalidation", "需要重新验证"], FAILED: ["Unavailable", "暂不可用"] },
  lifecycle: { ACTIVE: ["Active", "有效"], OUTDATED: ["Outdated", "已过期"], UNAVAILABLE: ["Unavailable", "不可用"] },
  costCategory: { ACCOMMODATION_ROOM_NIGHT: ["Accommodation", "住宿"], LOCAL_TRANSPORT_PERSON_DAY: ["Local transport", "本地交通"], PUBLIC_TRANSPORT_DISTANCE_FARE: ["Public transport fare", "公共交通票价"], TAXI_OR_RIDE_HAIL_ESTIMATE: ["Taxi estimate", "出租车估算"], FOOD_PERSON_DAY: ["Food", "餐饮"], ATTRACTION_PERSON_ENTRY: ["Attraction tickets", "景点门票"], ENTERTAINMENT_PERSON_ENTRY: ["Entertainment", "娱乐活动"], MISCELLANEOUS_PERSON_DAY: ["Miscellaneous", "其他费用"] },
  point: { ORIGIN: ["Departure point", "出发地"], HOTEL: ["Accommodation", "住宿地点"], DESTINATION: ["Destination", "目的地"], TRANSPORT_HUB: ["Transport hub", "交通枢纽"], POI: ["Attraction", "景点"] },
  timeline: { START: ["Start", "开始"], END: ["End", "结束"], LEG: ["Transport", "交通"], ACTIVITY: ["Activity", "活动"], MEAL: ["Meal", "用餐"] },
  preference: { CULTURE: ["Culture", "文化"], HISTORY: ["History", "历史"], FOOD: ["Food", "美食"], NATURE: ["Nature", "自然"], SHOPPING: ["Shopping", "购物"], ENTERTAINMENT: ["Entertainment", "娱乐"], FAMILY: ["Family", "亲子"] },
  error: { TRAVEL_TIME_CONFLICT: ["This time conflicts with the route.", "所选时间与路线安排冲突。"], BUDGET_EXCEEDED: ["This would exceed the total budget.", "此更改将超出总预算。"], UNKNOWN_ATTRACTION_XID: ["This attraction is no longer supported.", "当前资料中已找不到该景点。"], ITINERARY_EDIT_INVALID: ["This change cannot keep the itinerary feasible.", "此更改无法维持行程的可行性。"] }
};

const staleItineraryLabels = {
  title: ["Itinerary Update Required", "行程需要更新"],
  description: ["Your travel preferences have changed. Please regenerate the itinerary to apply your latest preferences.", "您的旅行偏好已更改。请重新生成行程，以应用最新的偏好设置。"],
  action: ["Regenerate Itinerary", "重新生成行程"]
};

const fallback = {
  profile: ["Itinerary option", "行程方案"], profileDescription: ["Planning preference", "规划偏好"], activity: ["Other activity", "其他活动"],
  category: ["Category", "类别"], transport: ["Local transport", "当地交通"], source: ["Source unavailable", "来源不可用"],
  verification: ["Status unavailable", "状态不可用"], pace: ["Flexible", "灵活"], accommodation: ["Accommodation", "住宿"],
  food: ["Meal style", "餐饮安排"], status: ["Status unavailable", "状态不可用"], lifecycle: ["Status unavailable", "状态不可用"],
  costCategory: ["Cost category", "费用类别"], point: ["Travel point", "行程地点"], timeline: ["Itinerary item", "行程项目"],
  preference: ["Other", "其他"], error: ["This change could not be applied.", "暂时无法应用此更改。"]
};

export function displayLabel(language, namespace, value) {
  const index = language === "zh" ? 1 : 0;
  if (namespace === "staleItinerary") return staleItineraryLabels[value]?.[index] ?? staleItineraryLabels.title[index];
  return labels[namespace]?.[value]?.[index] ?? fallback[namespace]?.[index] ?? (language === "zh" ? "信息不可用" : "Information unavailable");
}

export function localizedText(value, language, fallbackKey = "common.unavailable") {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    if (typeof value.text === "string" && value.text.trim()) return value.text;
    if (typeof value[language] === "string" && value[language].trim()) return value[language];
    const alternate = value.en ?? value.zh;
    if (typeof alternate === "string" && alternate.trim()) return alternate;
  }
  const translated = translate(language === "en" ? "en" : "zh", fallbackKey);
  return translated === fallbackKey ? (language === "zh" ? "信息不可用" : "Information unavailable") : translated;
}

const defaultDestinationTitles = {
  singapore: { en: "Singapore journey", zh: "新加坡行程" },
  chengdu: { en: "Chengdu journey", zh: "成都行程" },
  beijing: { en: "Beijing journey", zh: "北京行程" }
};

export function resolveTripTitle(title, language = "zh", destination = "singapore") {
  const isEn = language === "en";
  const normalizedDest = String(destination || "singapore").toLowerCase();
  const defaultNames = defaultDestinationTitles[normalizedDest] || {
    en: `${destination || "Singapore"} journey`,
    zh: `${destination || "新加坡"}行程`
  };

  if (!title) {
    return isEn ? defaultNames.en : defaultNames.zh;
  }

  if (typeof title === "object") {
    if (isEn) {
      return title.en || title.zh || defaultNames.en;
    }
    return title.zh || title.en || defaultNames.zh;
  }

  if (typeof title !== "string") {
    return String(title);
  }

  const trimmed = title.trim();

  // Check for copy / duplicate suffixes in either language
  const copySuffixRegex = /(?:\s*(?:\(copy\)|copy|\(副本\)|副本))+$/i;
  const hasCopySuffix = copySuffixRegex.test(trimmed);
  const baseTitle = trimmed.replace(copySuffixRegex, "").trim();

  // Check if baseTitle matches known Singapore journey / itinerary titles
  const isSingaporeTrip = (
    baseTitle === "新加坡行程" ||
    /^Singapore\s+(?:journey|itinerary|trip)$/i.test(baseTitle) ||
    baseTitle === "Nuogo Singapore itinerary draft"
  );

  if (isSingaporeTrip) {
    if (isEn) {
      return hasCopySuffix ? "Singapore journey copy" : "Singapore journey";
    }
    return hasCopySuffix ? "新加坡行程 副本" : "新加坡行程";
  }

  // Check if baseTitle matches other known destinations
  for (const [, destObj] of Object.entries(defaultDestinationTitles)) {
    if (baseTitle === destObj.zh || baseTitle.toLowerCase() === destObj.en.toLowerCase()) {
      if (isEn) {
        return hasCopySuffix ? `${destObj.en} copy` : destObj.en;
      }
      return hasCopySuffix ? `${destObj.zh} 副本` : destObj.zh;
    }
  }

  return trimmed;
}
