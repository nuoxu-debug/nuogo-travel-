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
    revision: 0,
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

export function demoMembers() {
  return [
    {
      id: "member-owner",
      tripId: "trip-1",
      userId: "user-1",
      name: "Chen Yu",
      role: "owner",
      status: "active",
      joinedAt: "2026-07-20T08:00:00.000Z"
    },
    {
      id: "member-editor",
      tripId: "trip-1",
      userId: "user-2",
      name: "Li Wei",
      role: "editor",
      status: "active",
      joinedAt: "2026-07-21T08:00:00.000Z"
    },
    {
      id: "member-viewer",
      tripId: "trip-1",
      userId: "user-3",
      name: "Wang Min",
      role: "viewer",
      status: "active",
      joinedAt: "2026-07-22T08:00:00.000Z"
    }
  ];
}

export function demoExpenses() {
  return [
    {
      id: "expense-lunch",
      tripId: "trip-1",
      description: "Hongcun lunch",
      category: "food",
      amountFen: 30000,
      expenseDate: "2026-08-10",
      paidByUserId: "user-1",
      paidByName: "Chen Yu",
      createdByUserId: "user-1",
      createdByName: "Chen Yu",
      note: "Shared lunch near the south gate",
      participants: [
        { userId: "user-1", name: "Chen Yu", shareFen: 10000 },
        { userId: "user-2", name: "Li Wei", shareFen: 10000 },
        { userId: "user-3", name: "Wang Min", shareFen: 10000 }
      ],
      createdAt: "2026-08-10T06:00:00.000Z",
      updatedAt: "2026-08-10T06:00:00.000Z"
    },
    {
      id: "expense-taxi",
      tripId: "trip-1",
      description: "Station transfer",
      category: "transportation",
      amountFen: 9000,
      expenseDate: "2026-08-10",
      paidByUserId: "user-2",
      paidByName: "Li Wei",
      createdByUserId: "user-2",
      createdByName: "Li Wei",
      note: "",
      participants: [
        { userId: "user-1", name: "Chen Yu", shareFen: 3000 },
        { userId: "user-2", name: "Li Wei", shareFen: 3000 },
        { userId: "user-3", name: "Wang Min", shareFen: 3000 }
      ],
      createdAt: "2026-08-10T07:00:00.000Z",
      updatedAt: "2026-08-10T07:00:00.000Z"
    }
  ];
}

export function demoExpenseSummary() {
  return {
    totalSpentFen: 39000,
    members: [
      { userId: "user-1", name: "Chen Yu", paidFen: 30000, shareFen: 13000, netFen: 17000 },
      { userId: "user-2", name: "Li Wei", paidFen: 9000, shareFen: 13000, netFen: -4000 },
      { userId: "user-3", name: "Wang Min", paidFen: 0, shareFen: 13000, netFen: -13000 }
    ],
    settlements: [
      {
        fromUserId: "user-3",
        fromName: "Wang Min",
        toUserId: "user-1",
        toName: "Chen Yu",
        amountFen: 13000
      },
      {
        fromUserId: "user-2",
        fromName: "Li Wei",
        toUserId: "user-1",
        toName: "Chen Yu",
        amountFen: 4000
      }
    ]
  };
}
