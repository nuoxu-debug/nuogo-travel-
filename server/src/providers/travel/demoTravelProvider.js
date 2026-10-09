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
  ["demo-sg-sentosa", "Sentosa", "ATTRACTION", 103.8238, 1.2540, "entertainment,beaches,viewpoints"],
  ["demo-sg-marina-bay-sands", "Marina Bay Sands", "ATTRACTION", 103.8607, 1.2834, "architecture,viewpoints,entertainments"],
  ["demo-sg-jewel-changi-airport", "Jewel Changi Airport", "ATTRACTION", 103.9894, 1.3602, "architecture,shops,gardens,indoor"],
  ["demo-sg-universal-studios", "Universal Studios Singapore", "ATTRACTION", 103.8238, 1.2543, "amusements,entertainments,family"],
  ["demo-sg-singapore-zoo", "Singapore Zoo", "ATTRACTION", 103.7930, 1.4043, "zoos,natural,family"],
  ["demo-sg-night-safari", "Night Safari", "ATTRACTION", 103.7886, 1.4021, "zoos,natural,entertainments"],
  ["demo-sg-river-wonders", "River Wonders", "ATTRACTION", 103.7907, 1.4040, "zoos,natural,family"],
  ["demo-sg-bird-paradise", "Bird Paradise", "ATTRACTION", 103.7065, 1.4125, "zoos,natural,family"],
  ["demo-sg-sea-aquarium", "S.E.A. Aquarium", "ATTRACTION", 103.8203, 1.2586, "aquariums,indoor,family"],
  ["demo-sg-adventure-cove", "Adventure Cove Waterpark", "ATTRACTION", 103.8190, 1.2581, "waterparks,amusements,entertainments"],
  ["demo-sg-wings-of-time", "Wings of Time", "ATTRACTION", 103.8197, 1.2512, "theatres,entertainments,beaches"],
  ["demo-sg-skyhelix-sentosa", "SkyHelix Sentosa", "ATTRACTION", 103.8171, 1.2537, "viewpoints,amusements,entertainments"],
  ["demo-sg-mount-faber-park", "Mount Faber Park", "ATTRACTION", 103.8173, 1.2725, "parks,natural,viewpoints"],
  ["demo-sg-southern-ridges", "Southern Ridges", "ATTRACTION", 103.8098, 1.2800, "parks,natural,viewpoints"],
  ["demo-sg-henderson-waves", "Henderson Waves", "ATTRACTION", 103.8203, 1.2789, "architecture,parks,viewpoints"],
  ["demo-sg-clarke-quay", "Clarke Quay", "ATTRACTION", 103.8467, 1.2906, "cultural,restaurants,nightlife"],
  ["demo-sg-orchard-road", "Orchard Road", "ATTRACTION", 103.8320, 1.3048, "shops,architecture"],
  ["demo-sg-jewel-rain-vortex", "HSBC Rain Vortex", "ATTRACTION", 103.9890, 1.3600, "architecture,gardens,indoor"],
  ["demo-sg-national-museum", "National Museum of Singapore", "ATTRACTION", 103.8476, 1.2966, "museums,historic,indoor"],
  ["demo-sg-peranakan-museum", "Peranakan Museum", "ATTRACTION", 103.8493, 1.2944, "museums,cultural,indoor"],
  ["demo-sg-singapore-art-museum", "Singapore Art Museum", "ATTRACTION", 103.8510, 1.2974, "museums,cultural,indoor"],
  ["demo-sg-mint-museum-of-toys", "MINT Museum of Toys", "ATTRACTION", 103.8555, 1.2969, "museums,cultural,indoor"],
  ["demo-sg-buddha-tooth-relic-temple", "Buddha Tooth Relic Temple", "ATTRACTION", 103.8442, 1.2815, "religion,cultural,historic"],
  ["demo-sg-sri-mariamman-temple", "Sri Mariamman Temple", "ATTRACTION", 103.8455, 1.2826, "religion,cultural,historic"],
  ["demo-sg-sultan-mosque", "Sultan Mosque", "ATTRACTION", 103.8590, 1.3021, "religion,cultural,historic"],
  ["demo-sg-thian-hock-keng", "Thian Hock Keng Temple", "ATTRACTION", 103.8474, 1.2808, "religion,cultural,historic"],
  ["demo-sg-haw-par-villa", "Haw Par Villa", "ATTRACTION", 103.7817, 1.2837, "cultural,parks,historic"],
  ["demo-sg-esplanade", "Esplanade - Theatres on the Bay", "ATTRACTION", 103.8555, 1.2898, "theatres,architecture,cultural"],
  ["demo-sg-helix-bridge", "Helix Bridge", "ATTRACTION", 103.8602, 1.2877, "architecture,viewpoints"],
  ["demo-sg-singapore-flyer", "Singapore Flyer", "ATTRACTION", 103.8639, 1.2893, "viewpoints,amusements,architecture"],
  ["demo-sg-east-coast-park", "East Coast Park", "ATTRACTION", 103.9125, 1.3008, "parks,natural,beaches"],
  ["demo-sg-macritchie-reservoir", "MacRitchie Reservoir Park", "ATTRACTION", 103.8338, 1.3448, "parks,natural,walking"],
  ["demo-sg-sungei-buloh", "Sungei Buloh Wetland Reserve", "ATTRACTION", 103.7304, 1.4467, "parks,natural,wildlife"],
  ["demo-sg-jurong-lake-gardens", "Jurong Lake Gardens", "ATTRACTION", 103.7292, 1.3386, "gardens,parks,natural"],
  ["demo-sg-chinese-japanese-gardens", "Chinese and Japanese Gardens", "ATTRACTION", 103.7303, 1.3380, "gardens,parks,cultural"],
  ["demo-sg-lazarus-island", "Lazarus Island", "ATTRACTION", 103.8545, 1.2249, "beaches,natural,islands"],
  ["demo-sg-st-johns-island", "St John's Island", "ATTRACTION", 103.8470, 1.2209, "beaches,natural,islands"],
  ["demo-sg-civic-district", "Civic District", "ATTRACTION", 103.8519, 1.2897, "historic,cultural,architecture"],
  ["demo-sg-raffles-hotel", "Raffles Hotel", "ATTRACTION", 103.8546, 1.2949, "historic,architecture,cultural"],
  ["demo-sg-maxwell-food-centre", "Maxwell Food Centre", "RESTAURANT", 103.8449, 1.2803, "foods,indoor"],
  ["demo-sg-lau-pa-sat", "Lau Pa Sat", "RESTAURANT", 103.8500, 1.2806, "foods,indoor"]
]);

const demoEstimatedCostMinor = Object.freeze({
  "demo-sg-national-gallery": 4000,
  "demo-sg-asian-civilisations-museum": 2500,
  "demo-sg-artscience-museum": 3000,
  "demo-sg-national-museum": 1500,
  "demo-sg-peranakan-museum": 1200,
  "demo-sg-singapore-art-museum": 0,
  "demo-sg-mint-museum-of-toys": 2500,
  "demo-sg-sea-aquarium": 4400,
  "demo-sg-lau-pa-sat": 0,
  "demo-sg-maxwell-food-centre": 0,
  "demo-sg-jewel-rain-vortex": 0
});

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
        estimatedCostMinor: demoEstimatedCostMinor[poi.id] ?? 4600,
        providerMode: "DEMO", sourceType: "DEMO_FIXTURE", retrievedAt: this.now()
      };
    }).filter(({ dist }) => dist <= radiusMeters);
  }

  async enrichTourism(input) { return this.listAttractions(input); }
}
