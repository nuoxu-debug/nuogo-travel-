import { getCity } from "@nuogo/shared/constants";

const cityDetails = {
  beijing: { landmark: ["Forbidden City", "故宫博物院"], food: ["Huguosi Snacks", "护国寺小吃"], nature: ["Jingshan Park", "景山公园"] },
  shanghai: { landmark: ["The Bund", "外滩"], food: ["South Yunnan Road", "云南南路美食街"], nature: ["Fuxing Park", "复兴公园"] },
  xian: { landmark: ["Xi'an City Wall", "西安城墙"], food: ["Muslim Quarter", "回民街"], nature: ["Qujiang Pool", "曲江池"] },
  chengdu: { landmark: ["Kuanzhai Alley", "宽窄巷子"], food: ["Jinli Ancient Street", "锦里古街"], nature: ["People's Park", "人民公园"] },
  hangzhou: { landmark: ["Hefang Street", "河坊街"], food: ["Shengli River Food Street", "胜利河美食街"], nature: ["West Lake", "西湖"] },
  guilin: { landmark: ["East West Street", "东西巷"], food: ["Zhengyang Pedestrian Street", "正阳步行街"], nature: ["Elephant Trunk Hill", "象鼻山"] },
  kunming: { landmark: ["Jinma Biji Square", "金马碧鸡坊"], food: ["Zhuanxin Farmers' Market", "篆新农贸市场"], nature: ["Green Lake Park", "翠湖公园"] },
  chongqing: { landmark: ["Hongya Cave", "洪崖洞"], food: ["Bayi Food Street", "八一路好吃街"], nature: ["Nanshan Scenic Area", "南山风景区"] },
  guangzhou: { landmark: ["Yongqing Fang", "永庆坊"], food: ["Xihua Road", "西华路美食街"], nature: ["Yuexiu Park", "越秀公园"] },
  suzhou: { landmark: ["Pingjiang Road", "平江路"], food: ["Shantang Street", "山塘街"], nature: ["Humble Administrator's Garden", "拙政园"] },
  nanjing: { landmark: ["Laomendong", "老门东"], food: ["Kexiang Alley", "科巷"], nature: ["Xuanwu Lake", "玄武湖"] },
  zhangjiajie: { landmark: ["Tujia Folk Customs Park", "土家风情园"], food: ["Nanzhuangping Night Market", "南庄坪夜市"], nature: ["Tianmen Mountain", "天门山"] }
};

const offsets = [
  [0.002, 0.004],
  [0.013, -0.007],
  [-0.009, 0.011],
  [0.006, -0.014]
];

function bilingual(en, zh) {
  return { en, zh };
}

export function getDemoPois(cityId) {
  const city = getCity(cityId);
  const details = cityDetails[cityId] ?? cityDetails.chengdu;
  const [longitude, latitude] = city.center;
  const cityName = city.name;

  return [
    {
      key: "nature",
      name: bilingual(details.nature[0], details.nature[1]),
      description: bilingual(
        `Start gently with the landscape and everyday rhythm of ${cityName.en}.`,
        `从自然风景与日常节奏开始认识${cityName.zh}。`
      ),
      category: "natural_scenery",
      cost: 30,
      address: bilingual(`${details.nature[0]}, ${cityName.en}`, `${cityName.zh}${details.nature[1]}`),
      guide: {
        culture: bilingual("Public landscapes reveal how residents use the city.", "公共景观最能体现当地人的生活方式。"),
        food: bilingual("Look for a nearby breakfast stall used by commuters.", "留意附近本地上班族常去的早餐摊。"),
        crowd: bilingual("Arrive before 09:00 for softer light and fewer tour groups.", "上午九点前到达，光线更柔和且旅行团较少。"),
        visit: bilingual("Walk the quieter outer path before entering the main area.", "先走安静的外围步道，再进入核心区域。")
      }
    },
    {
      key: "landmark",
      name: bilingual(details.landmark[0], details.landmark[1]),
      description: bilingual(
        `Read the history of ${cityName.en} through its streets and architecture.`,
        `从街巷与建筑中读懂${cityName.zh}的历史。`
      ),
      category: "historical_relics",
      cost: 55,
      address: bilingual(`${details.landmark[0]}, ${cityName.en}`, `${cityName.zh}${details.landmark[1]}`),
      guide: {
        culture: bilingual("Notice how old urban patterns meet current community life.", "观察传统城市肌理如何融入今天的社区生活。"),
        food: bilingual("Choose side-lane snacks instead of the busiest entrance stalls.", "优先选择支巷小店，避开入口处最拥挤的摊位。"),
        crowd: bilingual("Visit around lunch when large groups move to restaurants.", "午餐时段旅行团多在用餐，人流相对舒缓。"),
        visit: bilingual("Follow the route in reverse to avoid the main flow.", "逆着常规游线行走，更容易避开主客流。")
      }
    },
    {
      key: "food",
      name: bilingual(details.food[0], details.food[1]),
      description: bilingual(
        `Taste regional dishes in a lively local food district.`,
        `在热闹的本地美食街区品尝地方风味。`
      ),
      category: "regional_cuisines",
      cost: 88,
      address: bilingual(`${details.food[0]}, ${cityName.en}`, `${cityName.zh}${details.food[1]}`),
      guide: {
        culture: bilingual("Shared dishes are the easiest route into local food etiquette.", "合桌分享是理解本地饮食礼仪的最好方式。"),
        food: bilingual("Order one signature staple and two smaller specialties.", "点一份招牌主食，再搭配两份小吃最合适。"),
        crowd: bilingual("Arrive 30 minutes before the standard dinner rush.", "比常规晚餐高峰提前三十分钟到达。"),
        visit: bilingual("Check posted prices before ordering and favor busy local counters.", "点单前看清明码标价，优先选择本地人多的档口。")
      }
    },
    {
      key: "stay",
      name: bilingual(`${cityName.en} Courtyard Stay`, `${cityName.zh}巷里小院`),
      description: bilingual("Check in near transit with a calm neighborhood evening.", "入住交通便利的街区，享受安静的社区夜晚。"),
      category: "budget_hotels",
      cost: 260,
      address: bilingual(`Central ${cityName.en}`, `${cityName.zh}中心城区`),
      guide: {
        culture: bilingual("Small stays often retain more neighborhood character.", "小型住宿通常更能保留街区气质。"),
        food: bilingual("Ask the host where they buy breakfast nearby.", "问问店主平时在附近哪里吃早餐。"),
        crowd: bilingual("Complete check-in before the evening arrival peak.", "尽量在晚间入住高峰前办理入住。"),
        visit: bilingual("Confirm the nearest metro exit before leaving the station.", "出地铁前先确认距离住宿最近的出口。")
      }
    }
  ].map((poi, index) => ({
    ...poi,
    location: {
      longitude: longitude + offsets[index][0],
      latitude: latitude + offsets[index][1]
    }
  }));
}
