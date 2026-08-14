const demoPois = Object.freeze({
  beijing: [
    ["amap-bj-forbidden-city", "Forbidden City", "ATTRACTION", 116.397026, 39.918058],
    ["amap-bj-temple-heaven", "Temple of Heaven", "ATTRACTION", 116.406605, 39.881903],
    ["amap-bj-summer-palace", "Summer Palace", "ATTRACTION", 116.272701, 39.999413],
    ["amap-bj-hutong-food", "Shichahai Hutong Food Street", "RESTAURANT", 116.3839, 39.9372]
  ],
  shanghai: [
    ["amap-sh-bund", "The Bund", "ATTRACTION", 121.490317, 31.241701],
    ["amap-sh-yuyuan", "Yu Garden", "ATTRACTION", 121.492115, 31.227019],
    ["amap-sh-museum", "Shanghai Museum", "ATTRACTION", 121.475203, 31.228484],
    ["amap-sh-food", "Yunnan South Road Food Street", "RESTAURANT", 121.4792, 31.2247]
  ],
  xian: [
    ["amap-xa-warriors", "Terracotta Army", "ATTRACTION", 109.273111, 34.385916],
    ["amap-xa-wall", "Xi'an City Wall", "ATTRACTION", 108.94234, 34.26166],
    ["amap-xa-pagoda", "Giant Wild Goose Pagoda", "ATTRACTION", 108.96444, 34.21895],
    ["amap-xa-food", "Muslim Quarter Food Street", "RESTAURANT", 108.9422, 34.2669]
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
