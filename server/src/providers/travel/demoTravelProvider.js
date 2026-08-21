const demoPois = Object.freeze({
  beijing: [
    ["amap-bj-forbidden-city", "Forbidden City", "ATTRACTION", 116.397026, 39.918058],
    ["amap-bj-temple-heaven", "Temple of Heaven", "ATTRACTION", 116.406605, 39.881903],
    ["amap-bj-summer-palace", "Summer Palace", "ATTRACTION", 116.272701, 39.999413],
    ["amap-bj-jingshan", "Jingshan Park", "ATTRACTION", 116.3967, 39.9251],
    ["amap-bj-beihai", "Beihai Park", "ATTRACTION", 116.389, 39.9255],
    ["amap-bj-lama-temple", "Lama Temple", "ATTRACTION", 116.4173, 39.9471],
    ["amap-bj-national-museum", "National Museum of China", "ATTRACTION", 116.401, 39.905],
    ["amap-bj-olympic-park", "Beijing Olympic Park", "ATTRACTION", 116.397, 40.001],
    ["amap-bj-798", "798 Art District", "ATTRACTION", 116.497, 39.984],
    ["amap-bj-drum-tower", "Drum Tower", "ATTRACTION", 116.3937, 39.9406],
    ["amap-bj-hutong-food", "Shichahai Hutong Food Street", "RESTAURANT", 116.3839, 39.9372],
    ["amap-bj-wangfujing-food", "Wangfujing Food Quarter", "RESTAURANT", 116.412, 39.914],
    ["amap-bj-niujie-food", "Niujie Food Street", "RESTAURANT", 116.363, 39.885],
    ["amap-bj-guijie-food", "Guijie Food Street", "RESTAURANT", 116.43, 39.94],
    ["amap-bj-qianmen-food", "Qianmen Food Quarter", "RESTAURANT", 116.397, 39.899]
  ],
  shanghai: [
    ["amap-sh-bund", "The Bund", "ATTRACTION", 121.490317, 31.241701],
    ["amap-sh-yuyuan", "Yu Garden", "ATTRACTION", 121.492115, 31.227019],
    ["amap-sh-museum", "Shanghai Museum", "ATTRACTION", 121.475203, 31.228484],
    ["amap-sh-jade-buddha", "Jade Buddha Temple", "ATTRACTION", 121.44, 31.245],
    ["amap-sh-tianzifang", "Tianzifang", "ATTRACTION", 121.468, 31.209],
    ["amap-sh-french-concession", "Former French Concession", "ATTRACTION", 121.46, 31.215],
    ["amap-sh-longhua", "Longhua Temple", "ATTRACTION", 121.452, 31.174],
    ["amap-sh-m50", "M50 Creative Park", "ATTRACTION", 121.449, 31.247],
    ["amap-sh-history-museum", "Shanghai History Museum", "ATTRACTION", 121.47, 31.235],
    ["amap-sh-food", "Yunnan South Road Food Street", "RESTAURANT", 121.4792, 31.2247],
    ["amap-sh-huanghe-food", "Huanghe Road Food Street", "RESTAURANT", 121.469, 31.238],
    ["amap-sh-old-city-food", "Old City Food Quarter", "RESTAURANT", 121.49, 31.218],
    ["amap-sh-wujiaochang-food", "Wujiaochang Food Quarter", "RESTAURANT", 121.515, 31.3],
    ["amap-sh-changli-food", "Changli Road Food Street", "RESTAURANT", 121.49, 31.175]
  ],
  xian: [
    ["amap-xa-warriors", "Terracotta Army", "ATTRACTION", 109.273111, 34.385916],
    ["amap-xa-wall", "Xi'an City Wall", "ATTRACTION", 108.94234, 34.26166],
    ["amap-xa-pagoda", "Giant Wild Goose Pagoda", "ATTRACTION", 108.96444, 34.21895],
    ["amap-xa-bell-tower", "Xi'an Bell Tower", "ATTRACTION", 108.94, 34.261],
    ["amap-xa-drum-tower", "Xi'an Drum Tower", "ATTRACTION", 108.937, 34.261],
    ["amap-xa-shaanxi-museum", "Shaanxi History Museum", "ATTRACTION", 108.956, 34.225],
    ["amap-xa-small-pagoda", "Small Wild Goose Pagoda", "ATTRACTION", 108.93, 34.239],
    ["amap-xa-daming-palace", "Daming Palace Park", "ATTRACTION", 108.968, 34.289],
    ["amap-xa-stele-forest", "Stele Forest Museum", "ATTRACTION", 108.95, 34.253],
    ["amap-xa-food", "Muslim Quarter Food Street", "RESTAURANT", 108.9422, 34.2669],
    ["amap-xa-yongxing-food", "Yongxingfang Food Street", "RESTAURANT", 108.968, 34.267],
    ["amap-xa-sajinqiao-food", "Sajinqiao Food Street", "RESTAURANT", 108.925, 34.269],
    ["amap-xa-datang-food", "Datang Everbright Food Quarter", "RESTAURANT", 108.967, 34.211],
    ["amap-xa-xiaozhai-food", "Xiaozhai Food Quarter", "RESTAURANT", 108.953, 34.219]
  ]
});

function haversineMeters(from, to) {
  const radians = (value) => value * Math.PI / 180;
  const lat1 = radians(from.latitude);
  const lat2 = radians(to.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLon = radians(to.longitude - from.longitude);
  const value = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)));
}

export class DemoTravelProvider {
  constructor({ now = () => new Date().toISOString() } = {}) {
    this.now = now;
  }

  async searchPois({ city, categories = [] }) {
    const records = demoPois[city];
    if (!records) throw new TypeError(`Unsupported demo city: ${city}.`);
    const selected = categories.length ? records.filter(([, , category]) => categories.includes(category)) : records;
    return selected.map(([id, name, category, longitude, latitude]) => ({
      id,
      name,
      category,
      type: category,
      typecode: category === "RESTAURANT" ? "050000" : "110000",
      address: city,
      cityname: city,
      location: `${longitude},${latitude}`,
      retrievedAt: this.now()
    }));
  }

  async getRoute({ from, to, mode }) {
    const distanceMeters = haversineMeters(from, to);
    const speedMetersPerMinute = mode === "WALK" ? 75 : mode === "PUBLIC_TRANSIT" ? 300 : 500;
    return {
      provider: "DEMO",
      mode,
      distanceMeters,
      durationSeconds: Math.max(60, Math.ceil(distanceMeters / speedMetersPerMinute) * 60),
      tollsCny: 0,
      taxiCostCny: mode === "TAXI" ? Math.max(13, Math.round(distanceMeters / 1000 * 2.4)) : 0,
      retrievedAt: this.now()
    };
  }

  async enrichTourism({ city, coordinates, radiusMeters }) {
    const pois = await this.searchPois({ city });
    return pois.map((poi) => {
      const [longitude, latitude] = poi.location.split(",").map(Number);
      return {
        xid: `otm-${poi.id}`,
        name: poi.name,
        kinds: poi.category === "RESTAURANT" ? "foods" : "cultural,historic",
        dist: haversineMeters(coordinates, { longitude, latitude }),
        rate: 3,
        point: { lon: longitude, lat: latitude },
        radiusMeters,
        retrievedAt: this.now()
      };
    }).filter(({ dist }) => dist <= radiusMeters);
  }
}
