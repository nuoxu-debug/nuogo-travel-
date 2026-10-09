import { publicAssetPath } from "../assets.js";

const ATTRACTION_IMAGE_MAP = {
  "demo-sg-artscience-museum": "/images/attractions/artscience-museum.jpg",
  "demo-sg-asian-civilisations-museum": "/images/attractions/asian-civilisations-museum.jpg",
  "demo-sg-gardens-by-the-bay": "/images/attractions/gardens-by-the-bay.png",
  "demo-sg-national-gallery": "/images/attractions/national-gallery.jpg",
  "demo-sg-botanic-gardens": "/images/attractions/botanic-gardens.jpg",
  "demo-sg-fort-canning": "/images/attractions/fort-canning.jpg",
  "demo-sg-merlion-park": "/images/attractions/merlion.png",
  "demo-sg-chinatown": "/images/attractions/chinatown.png",
  "demo-sg-kampong-gelam": "/images/attractions/kampong-glam.png",
  "demo-sg-little-india": "/images/attractions/little-india.png",
  "demo-sg-sentosa": "/images/attractions/sentosa.jpg",
  "demo-sg-lau-pa-sat": "/images/attractions/lau-pa-sat.jpg",
  "demo-sg-maxwell-food-centre": "/images/attractions/maxwell-food-centre.jpg",
  "demo-sg-marina-bay": "/images/attractions/marina-bay.png",
  "demo-sg-marina-bay-sands": "/images/attractions/marina-bay-sands.jpg",
  "demo-sg-jewel-changi-airport": "/images/attractions/jewel-changi.jpg",
  "demo-sg-jewel-rain-vortex": "/images/attractions/jewel-changi.jpg",
  "demo-sg-universal-studios": "/images/attractions/universal-studios.jpg",
  "demo-sg-sea-aquarium": "/images/attractions/sea-aquarium.jpg",
  "demo-sg-adventure-cove": "/images/attractions/adventure-cove.jpg",
  "demo-sg-wings-of-time": "/images/attractions/wings-of-time.jpg",
  "demo-sg-skyhelix-sentosa": "/images/attractions/sentosa.jpg",
  "demo-sg-singapore-zoo": "/images/attractions/singapore-zoo.jpg",
  "demo-sg-night-safari": "/images/attractions/night-safari.jpg",
  "demo-sg-river-wonders": "/images/attractions/river-wonders.jpg",
  "demo-sg-bird-paradise": "/images/attractions/bird-paradise.jpg",
  "demo-sg-mount-faber-park": "/images/attractions/mount-faber-park.jpg",
  "demo-sg-southern-ridges": "/images/attractions/henderson-waves.jpg",
  "demo-sg-henderson-waves": "/images/attractions/henderson-waves.jpg",
  "demo-sg-east-coast-park": "/images/attractions/east-coast-park.jpg",
  "demo-sg-macritchie-reservoir": "/images/attractions/macritchie-reservoir.jpg",
  "demo-sg-sungei-buloh": "/images/attractions/sungei-buloh.jpg",
  "demo-sg-jurong-lake-gardens": "/images/attractions/jurong-lake-gardens.jpg",
  "demo-sg-chinese-japanese-gardens": "/images/attractions/chinese-japanese-gardens.jpg",
  "demo-sg-lazarus-island": "/images/attractions/lazarus-island.jpg",
  "demo-sg-st-johns-island": "/images/attractions/st-johns-island.jpg",
  "demo-sg-clarke-quay": "/images/attractions/clarke-quay.jpg",
  "demo-sg-orchard-road": "/images/attractions/orchard-road.jpg",
  "demo-sg-national-museum": "/images/attractions/national-museum.jpg",
  "demo-sg-peranakan-museum": "/images/attractions/peranakan-museum.jpg",
  "demo-sg-singapore-art-museum": "/images/attractions/singapore-art-museum.jpg",
  "demo-sg-mint-museum-of-toys": "/images/attractions/mint-museum-of-toys.jpg",
  "demo-sg-buddha-tooth-relic-temple": "/images/attractions/buddha-tooth-relic-temple.jpg",
  "demo-sg-sri-mariamman-temple": "/images/attractions/sri-mariamman-temple.jpg",
  "demo-sg-sultan-mosque": "/images/attractions/sultan-mosque.jpg",
  "demo-sg-thian-hock-keng": "/images/attractions/thian-hock-keng.jpg",
  "demo-sg-haw-par-villa": "/images/attractions/haw-par-villa.jpg",
  "demo-sg-esplanade": "/images/attractions/esplanade.jpg",
  "demo-sg-helix-bridge": "/images/attractions/helix-bridge.jpg",
  "demo-sg-singapore-flyer": "/images/attractions/singapore-flyer.jpg",
  "demo-sg-civic-district": "/images/attractions/civic-district.jpg",
  "demo-sg-raffles-hotel": "/images/attractions/raffles-hotel.jpg"
};

const KEYWORD_RULES = [
  { test: /artscience|艺术科学|莲花/i, path: "/images/attractions/artscience-museum.jpg" },
  { test: /asian\s*civil|亚洲文明/i, path: "/images/attractions/asian-civilisations-museum.jpg" },
  { test: /gardens\s*by\s*the\s*bay|滨海湾花园|supertree|擎天树/i, path: "/images/attractions/gardens-by-the-bay.png" },
  { test: /national\s*gallery|国家美术馆/i, path: "/images/attractions/national-gallery.jpg" },
  { test: /botanic\s*garden|植物园/i, path: "/images/attractions/botanic-gardens.jpg" },
  { test: /fort\s*canning|福康宁/i, path: "/images/attractions/fort-canning.jpg" },
  { test: /merlion|鱼尾狮/i, path: "/images/attractions/merlion.png" },
  { test: /buddha\s*tooth|佛牙寺/i, path: "/images/attractions/buddha-tooth-relic-temple.jpg" },
  { test: /sri\s*mariamman|马里安曼/i, path: "/images/attractions/sri-mariamman-temple.jpg" },
  { test: /sultan\s*mosque|苏丹回教/i, path: "/images/attractions/sultan-mosque.jpg" },
  { test: /thian\s*hock\s*keng|天福宫/i, path: "/images/attractions/thian-hock-keng.jpg" },
  { test: /chinatown|牛车水/i, path: "/images/attractions/chinatown.png" },
  { test: /kampong\s*g[el]am|甘榜格南/i, path: "/images/attractions/kampong-glam.png" },
  { test: /little\s*india|小印度/i, path: "/images/attractions/little-india.png" },
  { test: /adventure\s*cove|水上探险/i, path: "/images/attractions/adventure-cove.jpg" },
  { test: /universal|环球影城/i, path: "/images/attractions/universal-studios.jpg" },
  { test: /sea\s*aquarium|海洋馆/i, path: "/images/attractions/sea-aquarium.jpg" },
  { test: /rain\s*vortex|jewel|星耀樟宜|雨漩涡/i, path: "/images/attractions/jewel-changi.jpg" },
  { test: /wings\s*of\s*time|时光之翼/i, path: "/images/attractions/wings-of-time.jpg" },
  { test: /sentosa|圣淘沙/i, path: "/images/attractions/sentosa.jpg" },
  { test: /singapore\s*zoo|动物园/i, path: "/images/attractions/singapore-zoo.jpg" },
  { test: /night\s*safari|夜间野生动物园/i, path: "/images/attractions/night-safari.jpg" },
  { test: /river\s*wonders|river\s*safari|河川生态/i, path: "/images/attractions/river-wonders.jpg" },
  { test: /bird\s*paradise|飞禽公园/i, path: "/images/attractions/bird-paradise.jpg" },
  { test: /henderson\s*waves|亨德森波浪/i, path: "/images/attractions/henderson-waves.jpg" },
  { test: /clarke\s*quay|克拉码头/i, path: "/images/attractions/clarke-quay.jpg" },
  { test: /flyer|摩天轮|摩天观景轮/i, path: "/images/attractions/singapore-flyer.jpg" },
  { test: /esplanade|滨海艺术中心|大榴莲/i, path: "/images/attractions/esplanade.jpg" },
  { test: /raffles\s*hotel|莱佛士/i, path: "/images/attractions/raffles-hotel.jpg" },
  { test: /national\s*museum|国家博物馆/i, path: "/images/attractions/national-museum.jpg" },
  { test: /peranakan|土生文化/i, path: "/images/attractions/peranakan-museum.jpg" },
  { test: /haw\s*par\s*villa|虎豹别墅/i, path: "/images/attractions/haw-par-villa.jpg" },
  { test: /orchard|乌节路/i, path: "/images/attractions/orchard-road.jpg" },
  { test: /marina\s*bay\s*sands|金沙/i, path: "/images/attractions/marina-bay-sands.jpg" },
  { test: /lau\s*pa\s*sat|老巴刹/i, path: "/images/attractions/lau-pa-sat.jpg" },
  { test: /maxwell|麦士威/i, path: "/images/attractions/maxwell-food-centre.jpg" },
  { test: /marina\s*bay|滨海湾/i, path: "/images/attractions/marina-bay.png" }
];

export function getAttractionImageUrl(attraction) {
  if (!attraction) return null;
  if (attraction.imageUrl) return attraction.imageUrl;

  const xid = attraction.xid || attraction.id;
  if (xid && ATTRACTION_IMAGE_MAP[xid]) {
    return publicAssetPath(ATTRACTION_IMAGE_MAP[xid]);
  }

  const nameStr = [
    typeof attraction.name === "string" ? attraction.name : "",
    attraction.name?.en,
    attraction.name?.zh,
    typeof attraction.displayName === "string" ? attraction.displayName : "",
    attraction.displayName?.en,
    attraction.displayName?.zh,
    attraction.presentation?.name?.en,
    attraction.presentation?.name?.zh,
    xid
  ].filter(Boolean).join(" ");

  for (const rule of KEYWORD_RULES) {
    if (rule.test.test(nameStr)) {
      return publicAssetPath(rule.path);
    }
  }

  return null;
}
