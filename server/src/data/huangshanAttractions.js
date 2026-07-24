function bilingual(en, zh) {
  return { en, zh };
}

function details({
  descriptionEn,
  descriptionZh,
  durationEn,
  durationZh,
  bestTimeEn,
  bestTimeZh,
  openingEn,
  openingZh,
  ticketEn,
  ticketZh,
  highlightsEn,
  highlightsZh
}) {
  return {
    descriptionEn,
    descriptionZh,
    visitDetails: {
      suggestedDuration: bilingual(durationEn, durationZh),
      bestTime: bilingual(bestTimeEn, bestTimeZh),
      openingHours: bilingual(openingEn, openingZh),
      ticketAdvice: bilingual(ticketEn, ticketZh),
      highlights: bilingual(highlightsEn, highlightsZh)
    }
  };
}

const huangshanDetails = new Map([
  ["宏村", details({
    descriptionEn: "Explore a UNESCO-listed Huizhou village shaped by white-walled residences, reflected water lanes, and the crescent-shaped Moon Pond.",
    descriptionZh: "漫步宏村，欣赏徽派白墙黛瓦、层层水巷与月沼倒影，感受古村落的生活脉络。",
    durationEn: "2-4 hours",
    durationZh: "2-4小时",
    bestTimeEn: "Early morning or late afternoon",
    bestTimeZh: "清晨或傍晚",
    openingEn: "Village access is generally available during daytime; confirm seasonal hours before departure.",
    openingZh: "景区通常白天开放，出发前请确认当季开放时间。",
    ticketEn: "A village admission ticket may be required; verify current validity and included sites.",
    ticketZh: "通常需要古村门票，请确认最新票价、有效期和包含景点。",
    highlightsEn: ["Moon Pond reflections", "Huizhou residential architecture"],
    highlightsZh: ["月沼倒影", "徽派民居建筑"]
  })],
  ["迎客松", details({
    descriptionEn: "Meet Huangshan's best-known pine, rooted beside the Yuping scenic area and framed by granite peaks and mountain cloud.",
    descriptionZh: "在玉屏景区观赏黄山标志性景观迎客松，以奇松、花岗岩峰林与云海为背景留影。",
    durationEn: "30-60 minutes",
    durationZh: "30-60分钟",
    bestTimeEn: "Morning, before the main visitor peak",
    bestTimeZh: "上午客流高峰前",
    openingEn: "Access follows Huangshan Scenic Area operations and weather controls.",
    openingZh: "开放情况跟随黄山风景区运营及天气管控。",
    ticketEn: "Covered by Huangshan Scenic Area admission; cableway tickets are normally separate.",
    ticketZh: "通常包含在黄山风景区门票内，索道票一般需另购。",
    highlightsEn: ["Iconic Huangshan pine", "Yuping peak panorama"],
    highlightsZh: ["黄山标志性奇松", "玉屏峰林全景"]
  })],
  ["光明顶", details({
    descriptionEn: "Reach one of Huangshan's highest accessible summits for broad views across surrounding peaks, sunrise light, and shifting cloud seas.",
    descriptionZh: "登临光明顶，在黄山高处远眺群峰、晨光与流动云海，视野开阔。",
    durationEn: "45-90 minutes",
    durationZh: "45-90分钟",
    bestTimeEn: "Sunrise or clear late afternoon",
    bestTimeZh: "日出时段或晴朗傍晚",
    openingEn: "Trail access depends on scenic-area hours, weather, and safety controls.",
    openingZh: "步道开放受景区时间、天气和安全管控影响。",
    ticketEn: "Covered by Huangshan Scenic Area admission.",
    ticketZh: "通常包含在黄山风景区门票内。",
    highlightsEn: ["Mountain sunrise", "360-degree peak views"],
    highlightsZh: ["高山日出", "群峰环景"]
  })],
  ["屯溪老街", details({
    descriptionEn: "Walk a historic commercial street lined with Huizhou shopfronts, tea houses, ink shops, local snacks, and evening lights.",
    descriptionZh: "漫步屯溪老街，在徽派店铺、茶馆、文房店与本地小吃之间感受黄山市井文化。",
    durationEn: "1.5-3 hours",
    durationZh: "1.5-3小时",
    bestTimeEn: "Late afternoon into evening",
    bestTimeZh: "傍晚至夜间",
    openingEn: "The street is open throughout the day; individual shops set their own hours.",
    openingZh: "街区全天可通行，各店铺营业时间不同。",
    ticketEn: "Street access is free; museums, meals, and shopping are paid separately.",
    ticketZh: "街区免费开放，馆舍参观、餐饮和购物另行消费。",
    highlightsEn: ["Huizhou storefronts", "Tea and regional snacks"],
    highlightsZh: ["徽派街景", "茶叶与徽州小吃"]
  })],
  ["西海大峡谷", details({
    descriptionEn: "Follow a dramatic high-mountain route through granite walls, deep ravines, cliff paths, and layered Huangshan scenery.",
    descriptionZh: "沿西海大峡谷步道穿行于花岗岩峰壁、深谷和悬崖栈道之间，体验黄山的立体山景。",
    durationEn: "3-5 hours",
    durationZh: "3-5小时",
    bestTimeEn: "Clear mornings in the open season",
    bestTimeZh: "开放季节的晴朗上午",
    openingEn: "Seasonal or weather closures are common; confirm trail status on the travel day.",
    openingZh: "步道可能因季节或天气关闭，请在出行当天确认开放状态。",
    ticketEn: "Covered by scenic-area admission; optional monorail or cable transport is separate.",
    ticketZh: "通常包含在景区门票内，可选观光交通需另购。",
    highlightsEn: ["Deep granite canyon", "Cliffside hiking route"],
    highlightsZh: ["花岗岩深谷", "悬崖步道"]
  })],
  ["飞来石", details({
    descriptionEn: "See a massive balanced boulder standing above the mountain ridge, one of Huangshan's most distinctive geological landmarks.",
    descriptionZh: "观赏矗立在山脊之上的巨型巧石飞来石，感受黄山独特的花岗岩地貌。",
    durationEn: "30-60 minutes",
    durationZh: "30-60分钟",
    bestTimeEn: "Morning or late afternoon",
    bestTimeZh: "上午或傍晚",
    openingEn: "Access follows mountain trail and weather controls.",
    openingZh: "开放情况跟随山地步道和天气管控。",
    ticketEn: "Covered by Huangshan Scenic Area admission.",
    ticketZh: "通常包含在黄山风景区门票内。",
    highlightsEn: ["Balanced granite boulder", "Ridge viewpoints"],
    highlightsZh: ["奇特平衡巨石", "山脊观景点"]
  })],
  ["黄山翡翠谷景区", details({
    descriptionEn: "Discover a lower-valley landscape of clear emerald pools, bamboo shade, smooth rocks, and easy waterside paths.",
    descriptionZh: "游览黄山翡翠谷景区，在翠绿潭水、竹林与溪谷步道之间享受轻松的亲水体验。",
    durationEn: "2-3 hours",
    durationZh: "2-3小时",
    bestTimeEn: "Morning in spring, summer, or early autumn",
    bestTimeZh: "春夏及初秋上午",
    openingEn: "Confirm seasonal hours and conditions after heavy rain.",
    openingZh: "请确认当季开放时间，强降雨后留意景区通知。",
    ticketEn: "Separate admission from Huangshan Scenic Area is generally required.",
    ticketZh: "通常需要购买独立于黄山风景区的门票。",
    highlightsEn: ["Emerald pools", "Shaded valley walk"],
    highlightsZh: ["翡翠色潭水", "竹林溪谷步道"]
  })],
  ["始信峰", details({
    descriptionEn: "Climb a compact summit route celebrated for sculptural Huangshan pines, exposed granite, and layered eastern-peak views.",
    descriptionZh: "登临始信峰，近距离欣赏姿态各异的黄山松、裸露花岗岩与层叠东海峰景。",
    durationEn: "1-2 hours",
    durationZh: "1-2小时",
    bestTimeEn: "Early morning with clear visibility",
    bestTimeZh: "能见度良好的清晨",
    openingEn: "Access follows Huangshan Scenic Area trail and weather controls.",
    openingZh: "开放情况跟随黄山风景区步道及天气管控。",
    ticketEn: "Covered by Huangshan Scenic Area admission.",
    ticketZh: "通常包含在黄山风景区门票内。",
    highlightsEn: ["Sculptural pine trees", "Eastern Huangshan views"],
    highlightsZh: ["奇松景观", "黄山东海峰景"]
  })]
]);

const huangshanEnglishNames = new Map([
  ["宏村", "Hongcun Scenic Area"],
  ["迎客松", "The Guest-Greeting Pine"],
  ["光明顶", "Bright Summit"],
  ["屯溪老街", "Tunxi Old Street"],
  ["西海大峡谷", "West Sea Grand Canyon"],
  ["飞来石", "Flying-Over Rock"],
  ["黄山翡翠谷景区", "Emerald Valley Scenic Area"],
  ["始信峰", "Beginning-to-Believe Peak"]
]);

export function getHuangshanDetails(nameZh) {
  const record = huangshanDetails.get(nameZh);
  return record
    ? { ...record, nameEn: huangshanEnglishNames.get(nameZh) }
    : undefined;
}
