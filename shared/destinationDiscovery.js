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
  },
  "demo-sg-sentosa": {
    name: { en: "Sentosa", zh: "\u5723\u6dd8\u6c99" },
    description: { en: "An island resort area with beaches, attractions, viewpoints, and family-friendly entertainment.", zh: "\u96c6\u6d77\u6ee9\u3001\u666f\u70b9\u3001\u89c2\u666f\u70b9\u4e0e\u5bb6\u5ead\u5a31\u4e50\u4e8e\u4e00\u4f53\u7684\u5c9b\u5c7f\u5ea6\u5047\u533a\u3002" },
    suggestedVisitDurationMinutes: 180
  },
  "demo-sg-marina-bay-sands": {
    name: { en: "Marina Bay Sands", zh: "滨海湾金沙" },
    description: { en: "A waterfront landmark with architecture, shopping, dining, and skyline viewpoints.", zh: "滨海湾地标，汇集建筑景观、购物、餐饮与城市天际线视角。" },
    suggestedVisitDurationMinutes: 120
  },
  "demo-sg-jewel-changi-airport": {
    name: { en: "Jewel Changi Airport", zh: "星耀樟宜" },
    description: { en: "An airport lifestyle complex known for the indoor Rain Vortex and gardens.", zh: "以室内雨漩涡与花园景观闻名的机场综合体。" },
    suggestedVisitDurationMinutes: 120
  },
  "demo-sg-universal-studios": {
    name: { en: "Universal Studios Singapore", zh: "新加坡环球影城" },
    description: { en: "A Sentosa theme park with movie-themed rides, shows, and family attractions.", zh: "圣淘沙电影主题乐园，设有游乐设施、演出与亲子项目。" },
    suggestedVisitDurationMinutes: 360
  },
  "demo-sg-singapore-zoo": {
    name: { en: "Singapore Zoo", zh: "新加坡动物园" },
    description: { en: "A wildlife park known for open habitats and family-friendly animal encounters.", zh: "以开放式栖息地与亲子动物体验闻名的野生动物园。" },
    suggestedVisitDurationMinutes: 240
  },
  "demo-sg-night-safari": {
    name: { en: "Night Safari", zh: "夜间野生动物园" },
    description: { en: "An evening wildlife park focused on nocturnal animals and tram experiences.", zh: "以夜行动物和游览车体验为特色的夜间动物园。" },
    suggestedVisitDurationMinutes: 180
  },
  "demo-sg-river-wonders": {
    name: { en: "River Wonders", zh: "河川生态园" },
    description: { en: "A river-themed wildlife park with aquatic habitats and animal exhibits.", zh: "以河流生态为主题，结合水域栖息地与动物展区的园区。" },
    suggestedVisitDurationMinutes: 180
  },
  "demo-sg-bird-paradise": {
    name: { en: "Bird Paradise", zh: "飞禽公园" },
    description: { en: "A Mandai bird park with walk-through aviaries and colourful habitats.", zh: "万礼飞禽园，设有步入式鸟舍与多彩生态展区。" },
    suggestedVisitDurationMinutes: 180
  },
  "demo-sg-sea-aquarium": {
    name: { en: "S.E.A. Aquarium", zh: "S.E.A. 海洋馆" },
    description: { en: "A large indoor aquarium on Sentosa with marine habitats and ocean life.", zh: "位于圣淘沙的大型室内海洋馆，展示多样海洋生态。" },
    suggestedVisitDurationMinutes: 150
  },
  "demo-sg-adventure-cove": {
    name: { en: "Adventure Cove Waterpark", zh: "水上探险乐园" },
    description: { en: "A Sentosa water park with slides, pools, and family water attractions.", zh: "圣淘沙水上乐园，包含滑道、泳池与亲子戏水项目。" },
    suggestedVisitDurationMinutes: 240
  },
  "demo-sg-wings-of-time": {
    name: { en: "Wings of Time", zh: "时光之翼" },
    description: { en: "A Sentosa night show combining music, water, lights, and fireworks effects.", zh: "圣淘沙夜间表演，结合音乐、水幕、灯光与烟火效果。" },
    suggestedVisitDurationMinutes: 60
  },
  "demo-sg-skyhelix-sentosa": {
    name: { en: "SkyHelix Sentosa", zh: "圣淘沙天际螺旋塔" },
    description: { en: "An open-air rotating ride with elevated views over Sentosa and the coast.", zh: "开放式旋转观景项目，可俯瞰圣淘沙与海岸景色。" },
    suggestedVisitDurationMinutes: 60
  },
  "demo-sg-mount-faber-park": {
    name: { en: "Mount Faber Park", zh: "花柏山公园" },
    description: { en: "A hilltop park with harbour views, walking paths, and cable car access.", zh: "山顶公园，可欣赏港湾景色，并连接步道与缆车。" },
    suggestedVisitDurationMinutes: 90
  },
  "demo-sg-southern-ridges": {
    name: { en: "Southern Ridges", zh: "南部山脊" },
    description: { en: "A scenic trail network linking parks, forest walks, and city viewpoints.", zh: "串联多个公园、森林步道与城市观景点的风景步道网络。" },
    suggestedVisitDurationMinutes: 150
  },
  "demo-sg-henderson-waves": {
    name: { en: "Henderson Waves", zh: "亨德森波浪桥" },
    description: { en: "A distinctive pedestrian bridge on the Southern Ridges walking route.", zh: "南部山脊步道上的标志性波浪造型人行桥。" },
    suggestedVisitDurationMinutes: 60
  },
  "demo-sg-clarke-quay": {
    name: { en: "Clarke Quay", zh: "克拉码头" },
    description: { en: "A riverside dining and nightlife district beside the Singapore River.", zh: "新加坡河畔餐饮与夜生活街区。" },
    suggestedVisitDurationMinutes: 120
  },
  "demo-sg-orchard-road": {
    name: { en: "Orchard Road", zh: "乌节路" },
    description: { en: "Singapore's major shopping boulevard with malls, dining, and city energy.", zh: "新加坡主要购物大道，汇集商场、餐饮与城市活力。" },
    suggestedVisitDurationMinutes: 150
  },
  "demo-sg-jewel-rain-vortex": {
    name: { en: "HSBC Rain Vortex", zh: "汇丰雨漩涡" },
    description: { en: "The indoor waterfall centerpiece inside Jewel Changi Airport.", zh: "星耀樟宜内的室内瀑布核心景观。" },
    suggestedVisitDurationMinutes: 45
  },
  "demo-sg-national-museum": {
    name: { en: "National Museum of Singapore", zh: "新加坡国家博物馆" },
    description: { en: "Singapore's oldest museum, presenting national history and culture.", zh: "新加坡历史最悠久的博物馆，展示国家历史与文化。" },
    suggestedVisitDurationMinutes: 150
  },
  "demo-sg-peranakan-museum": {
    name: { en: "Peranakan Museum", zh: "土生文化馆" },
    description: { en: "A museum dedicated to Peranakan culture, design, and heritage.", zh: "展示土生华人文化、设计与传统的博物馆。" },
    suggestedVisitDurationMinutes: 120
  },
  "demo-sg-singapore-art-museum": {
    name: { en: "Singapore Art Museum", zh: "新加坡美术馆" },
    description: { en: "A contemporary art museum focused on Singapore and Southeast Asia.", zh: "聚焦新加坡与东南亚当代艺术的美术馆。" },
    suggestedVisitDurationMinutes: 120
  },
  "demo-sg-mint-museum-of-toys": {
    name: { en: "MINT Museum of Toys", zh: "MINT 玩具博物馆" },
    description: { en: "A private museum displaying vintage toys and childhood collectibles.", zh: "展示复古玩具与童年收藏品的私人博物馆。" },
    suggestedVisitDurationMinutes: 90
  },
  "demo-sg-buddha-tooth-relic-temple": {
    name: { en: "Buddha Tooth Relic Temple", zh: "佛牙寺龙华院" },
    description: { en: "A Chinatown Buddhist temple with ornate architecture and cultural exhibits.", zh: "牛车水佛教寺院，拥有华丽建筑与文化展览。" },
    suggestedVisitDurationMinutes: 75
  },
  "demo-sg-sri-mariamman-temple": {
    name: { en: "Sri Mariamman Temple", zh: "马里安曼兴都庙" },
    description: { en: "Singapore's oldest Hindu temple, located in Chinatown.", zh: "位于牛车水的新加坡最古老印度教寺庙。" },
    suggestedVisitDurationMinutes: 60
  },
  "demo-sg-sultan-mosque": {
    name: { en: "Sultan Mosque", zh: "苏丹回教堂" },
    description: { en: "A major Kampong Gelam landmark with a prominent golden dome.", zh: "甘榜格南重要地标，以醒目的金色圆顶闻名。" },
    suggestedVisitDurationMinutes: 60
  },
  "demo-sg-thian-hock-keng": {
    name: { en: "Thian Hock Keng Temple", zh: "天福宫" },
    description: { en: "A historic Hokkien temple near Telok Ayer with detailed craftsmanship.", zh: "靠近直落亚逸的历史福建庙宇，建筑工艺精细。" },
    suggestedVisitDurationMinutes: 60
  },
  "demo-sg-haw-par-villa": {
    name: { en: "Haw Par Villa", zh: "虎豹别墅" },
    description: { en: "A cultural park known for colourful mythology and folklore sculptures.", zh: "以神话、民间故事与彩色雕塑闻名的文化园区。" },
    suggestedVisitDurationMinutes: 120
  },
  "demo-sg-esplanade": {
    name: { en: "Esplanade - Theatres on the Bay", zh: "滨海艺术中心" },
    description: { en: "A performing arts venue by Marina Bay with distinctive architecture.", zh: "滨海湾旁的表演艺术场馆，建筑外观极具辨识度。" },
    suggestedVisitDurationMinutes: 90
  },
  "demo-sg-helix-bridge": {
    name: { en: "Helix Bridge", zh: "双螺旋桥" },
    description: { en: "A pedestrian bridge linking Marina Centre and Marina Bay Sands.", zh: "连接滨海中心与滨海湾金沙的人行桥。" },
    suggestedVisitDurationMinutes: 45
  },
  "demo-sg-singapore-flyer": {
    name: { en: "Singapore Flyer", zh: "新加坡摩天观景轮" },
    description: { en: "A large observation wheel with broad views of the city and bay.", zh: "大型摩天观景轮，可俯瞰城市与滨海湾景色。" },
    suggestedVisitDurationMinutes: 90
  },
  "demo-sg-east-coast-park": {
    name: { en: "East Coast Park", zh: "东海岸公园" },
    description: { en: "A long coastal park popular for cycling, beaches, and casual dining.", zh: "绵长海滨公园，适合骑行、海滩活动与休闲餐饮。" },
    suggestedVisitDurationMinutes: 150
  },
  "demo-sg-macritchie-reservoir": {
    name: { en: "MacRitchie Reservoir Park", zh: "麦里芝蓄水池公园" },
    description: { en: "A nature reserve area with reservoir views, trails, and forest walks.", zh: "拥有蓄水池景观、步道与森林散步路线的自然保护区。" },
    suggestedVisitDurationMinutes: 180
  },
  "demo-sg-sungei-buloh": {
    name: { en: "Sungei Buloh Wetland Reserve", zh: "双溪布洛湿地保护区" },
    description: { en: "A wetland reserve for mangroves, migratory birds, and nature walks.", zh: "红树林湿地保护区，适合观鸟与自然步道游览。" },
    suggestedVisitDurationMinutes: 150
  },
  "demo-sg-jurong-lake-gardens": {
    name: { en: "Jurong Lake Gardens", zh: "裕廊湖花园" },
    description: { en: "A lakeside garden district with lawns, boardwalks, and family spaces.", zh: "湖畔花园区，设有草坪、栈道与亲子活动空间。" },
    suggestedVisitDurationMinutes: 150
  },
  "demo-sg-chinese-japanese-gardens": {
    name: { en: "Chinese and Japanese Gardens", zh: "裕华园与日本花园" },
    description: { en: "Traditional garden landscapes around Jurong Lake.", zh: "环绕裕廊湖的传统园林景观。" },
    suggestedVisitDurationMinutes: 120
  },
  "demo-sg-lazarus-island": {
    name: { en: "Lazarus Island", zh: "拉扎鲁斯岛" },
    description: { en: "A Southern Islands beach escape with quieter coastal scenery.", zh: "南部岛屿海滩去处，拥有较安静的海岸景色。" },
    suggestedVisitDurationMinutes: 180
  },
  "demo-sg-st-johns-island": {
    name: { en: "St John's Island", zh: "圣约翰岛" },
    description: { en: "A Southern Islands destination with beaches, green spaces, and sea views.", zh: "南部岛屿目的地，包含海滩、绿地与海景。" },
    suggestedVisitDurationMinutes: 180
  },
  "demo-sg-civic-district": {
    name: { en: "Civic District", zh: "市政区" },
    description: { en: "A historic central district with civic buildings, museums, and river views.", zh: "市中心历史街区，汇集市政建筑、博物馆与河畔景观。" },
    suggestedVisitDurationMinutes: 120
  },
  "demo-sg-raffles-hotel": {
    name: { en: "Raffles Hotel", zh: "莱佛士酒店" },
    description: { en: "A colonial-era hotel landmark associated with Singapore heritage.", zh: "殖民时期酒店地标，承载新加坡历史记忆。" },
    suggestedVisitDurationMinutes: 60
  }
});


export function getDestinationDiscoveryContent(destination) {
  const content = destinationContent[destination];
  if (!content) throw new TypeError(`Unsupported destination: ${destination}.`);
  return { ...content, source: { sourceType: "APPLICATION_CONTENT" } };
}

export function resolveAttractionDisplay({ xid, sourceName, sourceDescription, language = "zh" }) {
  const controlled = attractionContent[xid];
  const isZh = language === "zh" || language === "zh-CN" || language === "zh-TW";
  const name = controlled?.name?.[language]
    || (isZh ? (controlled?.name?.zh || controlled?.name?.["zh-CN"]) : controlled?.name?.en)
    || sourceName;
  const description = controlled?.description?.[language]
    || (isZh ? (controlled?.description?.zh || controlled?.description?.["zh-CN"]) : controlled?.description?.en)
    || sourceDescription
    || (isZh ? "暂无景点介绍" : "Description unavailable");
  return {
    name,
    description,
    ...(controlled ? { descriptionSourceType: "DATABASE_BACKED" } : {}),
    suggestedVisitDurationMinutes: controlled?.suggestedVisitDurationMinutes ?? 90,
    durationSourceType: "ESTIMATED"
  };
}
