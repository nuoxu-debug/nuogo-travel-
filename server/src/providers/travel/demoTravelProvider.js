const demoPois = Object.freeze([
  ["demo-sg-gardens-by-the-bay", "Gardens by the Bay", "ATTRACTION", 103.8636, 1.2816, "gardens,natural,architecture"],
  ["demo-sg-national-gallery", "National Gallery Singapore", "ATTRACTION", 103.8514, 1.2903, "museums,cultural,indoor"],
  ["demo-sg-asian-civilisations-museum", "Asian Civilisations Museum", "ATTRACTION", 103.8513, 1.2875, "museums,cultural,indoor"],
  ["demo-sg-botanic-gardens", "Singapore Botanic Gardens", "ATTRACTION", 103.8159, 1.3138, "gardens,natural,parks"],
  ["demo-sg-fort-canning", "Fort Canning Park", "ATTRACTION", 103.8465, 1.2955, "parks,natural,historic"],
  ["demo-sg-merlion-park", "Merlion Park", "ATTRACTION", 103.8545, 1.2868, "viewpoints,architecture"],
  ["demo-sg-artscience-museum", "ArtScience Museum", "ATTRACTION", 103.8593, 1.2863, "museums,cultural,indoor"],
  ["demo-sg-chinatown", "Chinatown", "ATTRACTION", 103.8439, 1.2838, "historic,cultural,foods"],
  ["demo-sg-kampong-gelam", "Kampong Gelam", "ATTRACTION", 103.8592, 1.3024, "historic,cultural,foods"],
  ["demo-sg-little-india", "Little India", "ATTRACTION", 103.8520, 1.3066, "historic,cultural,foods"],
  ["demo-sg-maxwell-food-centre", "Maxwell Food Centre", "RESTAURANT", 103.8449, 1.2803, "foods,indoor"],
  ["demo-sg-lau-pa-sat", "Lau Pa Sat", "RESTAURANT", 103.8500, 1.2806, "foods,indoor"]
]);

function haversineMeters(from, to) {
  const radians = (value) => value * Math.PI / 180;
  const lat1 = radians(from.latitude);
  const lat2 = radians(to.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLon = radians(to.longitude - from.longitude);
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)));
}

function requireSingapore(city) {
  if (city !== "singapore") throw new TypeError(`Unsupported demo destination: ${city}.`);
}

export class DemoTravelProvider {
  constructor({ now = () => new Date().toISOString() } = {}) { this.now = now; }

  async searchPois({ city, categories = [] }) {
    requireSingapore(city);
    const selected = categories.length ? demoPois.filter(([, , category]) => categories.includes(category)) : demoPois;
    return selected.map(([id, name, category, longitude, latitude, kinds]) => ({
      id, name, category, type: category, typecode: category === "RESTAURANT" ? "050000" : "110000",
      address: "Singapore", cityname: "Singapore", kinds, location: `${longitude},${latitude}`,
      providerMode: "DEMO", sourceType: "DEMO_FIXTURE", retrievedAt: this.now()
    }));
  }

  async getRoute({ from, to, mode, city = "singapore" }) {
    requireSingapore(city);
    const distanceMeters = haversineMeters(from, to);
    const speedMetersPerMinute = mode === "WALK" ? 75 : mode === "PUBLIC_TRANSIT" ? 300 : 500;
    return {
      provider: "DEMO", sourceType: "DEMO_FIXTURE", mode, distanceMeters,
      durationSeconds: Math.max(60, Math.ceil(distanceMeters / speedMetersPerMinute) * 60),
      estimatedCostMinor: mode === "TAXI" ? Math.max(500, Math.round(distanceMeters / 1000 * 120)) : mode === "PUBLIC_TRANSIT" ? 190 : 0,
      currency: "SGD", retrievedAt: this.now()
    };
  }

  async listAttractions({ city, coordinates, radiusMeters }) {
    const pois = await this.searchPois({ city });
    return pois.map((poi) => {
      const [longitude, latitude] = poi.location.split(",").map(Number);
      return {
        xid: poi.id, name: poi.name, kinds: poi.kinds, dist: haversineMeters(coordinates, { longitude, latitude }),
        rate: 3, point: { lon: longitude, lat: latitude }, radiusMeters,
        providerMode: "DEMO", sourceType: "DEMO_FIXTURE", retrievedAt: this.now()
      };
    }).filter(({ dist }) => dist <= radiusMeters);
  }

  async enrichTourism(input) { return this.listAttractions(input); }
}
