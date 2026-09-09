export function validPreferences(overrides = {}) {
  return {
    destination: "chengdu",
    departureCity: "singapore",
    days: 4,
    totalBudget: 4800,
    interests: ["local_street_food", "historical_relics"],
    groupType: "student_group",
    accommodation: "budget_hotel",
    language: "en",
    startDate: "2026-08-10",
    ...overrides
  };
}

export function validVisitDetails(overrides = {}) {
  return {
    suggestedDuration: { en: "1-2 hours", zh: "1-2\u5c0f\u65f6" },
    bestTime: { en: "Early morning", zh: "\u6e05\u6668" },
    openingHours: {
      en: "Confirm current scenic-area hours.",
      zh: "\u8bf7\u786e\u8ba4\u666f\u533a\u6700\u65b0\u5f00\u653e\u65f6\u95f4\u3002"
    },
    ticketAdvice: {
      en: "Confirm current ticket rules.",
      zh: "\u8bf7\u786e\u8ba4\u6700\u65b0\u95e8\u7968\u89c4\u5219\u3002"
    },
    popularity: { reviews: 100, travelNotes: 20, images: 300 },
    highlights: {
      en: ["Mountain views", "Ancient pines"],
      zh: ["\u5c71\u5cb3\u98ce\u5149", "\u9ec4\u5c71\u5947\u677e"]
    },
    ...overrides
  };
}

export function validActivity(overrides = {}) {
  return {
    id: "activity-1",
    order: 0,
    startTime: "09:00",
    endTime: "11:00",
    name: { en: "People's Park", zh: "人民公园" },
    description: { en: "A tea-house morning.", zh: "在茶馆感受慢生活。" },
    category: "city_landmarks",
    address: { en: "12 Shaocheng Road, Chengdu", zh: "成都市少城路12号" },
    location: { longitude: 104.058, latitude: 30.659 },
    estimatedCost: 35,
    transportNote: { en: "Metro Line 2", zh: "地铁2号线" },
    guide: {
      culture: { en: "Tea houses are social living rooms.", zh: "茶馆是成都人的城市客厅。" },
      food: { en: "Order a jasmine gaiwan tea.", zh: "推荐点一杯茉莉花盖碗茶。" },
      crowd: { en: "Arrive before 10:00.", zh: "建议上午十点前到达。" },
      visit: { en: "Sit by the garden path.", zh: "选择靠近园林步道的位置。" }
    },
    votes: 0,
    isFavorite: false,
    ...overrides
  };
}

export function validVariant(overrides = {}) {
  const activity = validActivity();
  return {
    id: "variant-1",
    tripId: "trip-1",
    style: "budget",
    title: { en: "Chengdu in 4 days", zh: "成都四日游" },
    summary: { en: "A balanced Chengdu plan.", zh: "一份节奏平衡的成都行程。" },
    destination: "chengdu",
    startDate: "2026-08-10",
    totalBudget: 4800,
    pace: "balanced",
    highlights: { en: ["Tea culture"], zh: ["茶文化"] },
    budget: {
      scenicTickets: 0,
      localFood: 35,
      transportation: 8,
      accommodation: 0
    },
    days: [{
      id: "day-1",
      dayNumber: 1,
      date: "2026-08-10",
      title: { en: "Old Chengdu", zh: "老成都" },
      activities: [activity]
    }],
    isFallback: false,
    ...overrides
  };
}
