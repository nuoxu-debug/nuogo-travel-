function activity(id, name, zh, order, longitude, latitude, cost, category = "city_landmarks") {
  return {
    id,
    order,
    startTime: ["09:00", "11:30", "15:00"][order] ?? "18:00",
    endTime: ["11:00", "13:30", "17:00"][order] ?? "20:00",
    name: { en: name, zh },
    description: { en: `Explore ${name} with local context.`, zh: `带着本地视角探索${zh}。` },
    category,
    address: { en: `${name}, Chengdu`, zh: `成都市${zh}` },
    location: { longitude, latitude },
    estimatedCost: cost,
    transportNote: { en: "Metro and walk", zh: "地铁后步行" },
    guide: {
      culture: { en: "A window into Chengdu life.", zh: "了解成都生活的一扇窗口。" },
      food: { en: "Try a nearby local snack.", zh: "试试附近的本地小吃。" },
      crowd: { en: "Arrive before the afternoon peak.", zh: "下午高峰前到达。" },
      visit: { en: "Take the quieter side route.", zh: "选择更安静的支线路线。" }
    },
    votes: 0,
    isFavorite: false
  };
}

function variant(style, index) {
  const styleName = {
    budget: ["Budget Backpack", "轻装省钱"],
    food: ["Food-Focused", "寻味当地"],
    leisure: ["Slow Leisure", "慢享悠游"]
  }[style];
  return {
    id: `variant-${style}`,
    tripId: "trip-1",
    style,
    title: { en: `${styleName[0]}: 4 day itinerary`, zh: `${styleName[1]}：四日行程` },
    summary: { en: "A complete Chengdu route.", zh: "一份完整的成都路线。" },
    destination: "chengdu",
    startDate: "2026-08-10",
    totalBudget: 4800,
    pace: style === "leisure" ? "slow" : style === "budget" ? "active" : "balanced",
    highlights: { en: ["Tea culture", "Sichuan food"], zh: ["茶文化", "川味美食"] },
    budget: { scenicTickets: 80 + index * 10, localFood: 260 + index * 40, transportation: 90, accommodation: 1040 },
    days: [{
      id: `day-${style}-1`,
      dayNumber: 1,
      date: "2026-08-10",
      title: { en: "Old Chengdu", zh: "老成都" },
      activities: [
        activity(`jinli-${style}`, "Jinli Ancient Street", "锦里古街", 0, 104.055, 30.647, 80, "historical_relics"),
        activity(`people-park-${style}`, "People's Park", "人民公园", 1, 104.058, 30.659, 35),
        activity(`food-${style}`, "Sichuan Food Market", "川味市集", 2, 104.071, 30.665, 120, "regional_cuisines")
      ]
    }],
    isFallback: false
  };
}

export function demoTrip() {
  return {
    id: "trip-1",
    ownerId: "user-1",
    status: "draft",
    title: { en: "Chengdu food and culture", zh: "成都寻味与文化" },
    destination: "chengdu",
    startDate: "2026-08-10",
    endDate: "2026-08-13",
    totalBudget: 4800,
    selectedVariantId: "variant-budget",
    preferences: {
      destination: "chengdu",
      departureCity: "shanghai",
      days: 4,
      totalBudget: 4800,
      interests: ["local_street_food"],
      groupType: "student_group",
      accommodation: "budget_hotel",
      language: "en",
      startDate: "2026-08-10"
    },
    variants: [variant("budget", 0), variant("food", 1), variant("leisure", 2)]
  };
}
