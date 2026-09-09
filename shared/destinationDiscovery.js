const destinationContent = Object.freeze({
  singapore: {
    id: "singapore",
    name: { en: "Singapore", zh: "新加坡" },
    introduction: {
      en: "Singapore brings waterfront landmarks, gardens, museums, heritage districts, parks, and celebrated food culture into a compact city-state.",
      zh: "新加坡在紧凑的城市空间内汇集滨水地标、花园、博物馆、文化街区、公园与多元美食。"
    },
    themes: ["CULTURE", "HISTORY", "FOOD", "NATURE", "ENTERTAINMENT"]
  }
});

const attractionContent = Object.freeze({
  "demo-sg-gardens-by-the-bay": {
    name: { en: "Gardens by the Bay", zh: "滨海湾花园" },
    description: { en: "A waterfront garden known for its conservatories and Supertree Grove.", zh: "以植物冷室与擎天树丛闻名的滨水花园。" },
    suggestedVisitDurationMinutes: 150
  },
  "demo-sg-national-gallery": {
    name: { en: "National Gallery Singapore", zh: "新加坡国家美术馆" },
    description: { en: "A major visual-arts museum in the former City Hall and Supreme Court buildings.", zh: "位于旧市政厅与最高法院建筑内的重要视觉艺术博物馆。" },
    suggestedVisitDurationMinutes: 150
  },
  "demo-sg-asian-civilisations-museum": {
    name: { en: "Asian Civilisations Museum", zh: "亚洲文明博物馆" },
    description: { en: "A museum exploring the cultures and connections of Asia.", zh: "展示亚洲文化与区域交流历史的博物馆。" },
    suggestedVisitDurationMinutes: 120
  },
  "demo-sg-botanic-gardens": {
    name: { en: "Singapore Botanic Gardens", zh: "新加坡植物园" },
    description: { en: "A historic tropical garden and UNESCO World Heritage Site.", zh: "历史悠久的热带花园，也是联合国教科文组织世界遗产。" },
    suggestedVisitDurationMinutes: 150
  },
  "demo-sg-fort-canning": {
    name: { en: "Fort Canning Park", zh: "福康宁公园" },
    description: { en: "A central hilltop park with layers of Singapore history.", zh: "位于市中心、承载多层新加坡历史的山丘公园。" },
    suggestedVisitDurationMinutes: 90
  },
  "demo-sg-merlion-park": {
    name: { en: "Merlion Park", zh: "鱼尾狮公园" },
    description: { en: "A waterfront viewpoint beside Singapore's well-known Merlion landmark.", zh: "可欣赏滨海景观与新加坡著名鱼尾狮地标的地点。" },
    suggestedVisitDurationMinutes: 60
  },
  "demo-sg-artscience-museum": {
    name: { en: "ArtScience Museum", zh: "艺术科学博物馆" },
    description: { en: "A lotus-shaped museum presenting art, science, culture, and technology exhibitions.", zh: "以莲花造型闻名，展示艺术、科学、文化与科技主题的博物馆。" },
    suggestedVisitDurationMinutes: 120
  },
  "demo-sg-chinatown": {
    name: { en: "Chinatown", zh: "牛车水" },
    description: { en: "A heritage district with temples, shophouses, markets, and local food.", zh: "汇集寺庙、店屋、市场与本地美食的历史街区。" },
    suggestedVisitDurationMinutes: 120
  }
});

export function getDestinationDiscoveryContent(destination) {
  const content = destinationContent[destination];
  if (!content) throw new TypeError(`Unsupported destination: ${destination}.`);
  return { ...content, source: { sourceType: "APPLICATION_CONTENT" } };
}

export function resolveAttractionDisplay({ xid, sourceName, sourceDescription, language = "zh" }) {
  const controlled = attractionContent[xid];
  const description = controlled?.description?.[language] || sourceDescription || (language === "zh" ? "暂无景点介绍" : "Description unavailable");
  return {
    name: controlled?.name?.[language] || sourceName,
    description,
    ...(controlled ? { descriptionSourceType: "DATABASE_BACKED" } : {}),
    suggestedVisitDurationMinutes: controlled?.suggestedVisitDurationMinutes ?? 90,
    durationSourceType: "ESTIMATED"
  };
}
