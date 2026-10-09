const staticSingaporeAttractions = [
  ["demo-sg-gardens-by-the-bay", "Gardens by the Bay", "A waterfront garden known for its conservatories and Supertree Grove.", "NATURE", 1.2816, 103.8636, 150],
  ["demo-sg-national-gallery", "National Gallery Singapore", "A major visual-arts museum in the former City Hall and Supreme Court buildings.", "CULTURE", 1.2903, 103.8514, 150],
  ["demo-sg-asian-civilisations-museum", "Asian Civilisations Museum", "A museum exploring the cultures and connections of Asia.", "HISTORY", 1.2875, 103.8513, 120],
  ["demo-sg-botanic-gardens", "Singapore Botanic Gardens", "A historic tropical garden and UNESCO World Heritage Site.", "NATURE", 1.3138, 103.8159, 150],
  ["demo-sg-fort-canning", "Fort Canning Park", "A central hilltop park with layers of Singapore history.", "HISTORY", 1.2955, 103.8465, 90],
  ["demo-sg-merlion-park", "Merlion Park", "A waterfront viewpoint beside Singapore's well-known Merlion landmark.", "CULTURE", 1.2868, 103.8545, 60],
  ["demo-sg-artscience-museum", "ArtScience Museum", "A lotus-shaped museum presenting art, science, culture, and technology exhibitions.", "CULTURE", 1.2863, 103.8593, 120],
  ["demo-sg-chinatown", "Chinatown", "A heritage district with temples, shophouses, markets, and local food.", "FOOD", 1.2838, 103.8439, 120],
  ["demo-sg-kampong-gelam", "Kampong Gelam", "A colourful heritage quarter shaped by craft, textiles, cafes, and Sultan Mosque.", "CULTURE", 1.3024, 103.8592, 120],
  ["demo-sg-little-india", "Little India", "A vivid neighbourhood known for temples, markets, colour, food, and everyday life.", "CULTURE", 1.3066, 103.8520, 120],
  ["demo-sg-sentosa", "Sentosa", "An island resort area with beaches, attractions, viewpoints, and family-friendly entertainment.", "ENTERTAINMENT", 1.2540, 103.8238, 180],
  ["demo-sg-marina-bay-sands", "Marina Bay Sands", "A waterfront landmark with architecture, shopping, dining, and skyline viewpoints.", "ENTERTAINMENT", 1.2834, 103.8607, 120],
  ["demo-sg-jewel-changi-airport", "Jewel Changi Airport", "An airport lifestyle complex known for the indoor Rain Vortex and gardens.", "FAMILY", 1.3602, 103.9894, 120],
  ["demo-sg-singapore-zoo", "Singapore Zoo", "A wildlife park known for open habitats and family-friendly animal encounters.", "FAMILY", 1.4043, 103.7930, 240],
  ["demo-sg-clarke-quay", "Clarke Quay", "A riverside dining and nightlife district beside the Singapore River.", "FOOD", 1.2906, 103.8467, 120],
  ["demo-sg-orchard-road", "Orchard Road", "Singapore's major shopping boulevard with malls, dining, and city energy.", "ENTERTAINMENT", 1.3048, 103.8320, 150]
];

export function getStaticSingaporeDiscovery(destination) {
  if (destination !== "singapore") return null;
  const attractions = staticSingaporeAttractions.map(([xid, name, description, category, latitude, longitude, suggestedVisitDurationMinutes]) => ({
    xid,
    destination: "singapore",
    name: { en: name },
    description: { en: description },
    category,
    suggestedVisitDurationMinutes,
    coordinates: { latitude, longitude, coordinateSystem: "WGS84" },
    source: {
      provider: "NUOGO_STATIC",
      sourceType: "APPLICATION_CONTENT",
      verificationStatus: "PUBLIC_BROWSING_FALLBACK"
    }
  }));
  return {
    destination: "singapore",
    introduction: {
      en: "Singapore brings waterfront landmarks, gardens, museums, heritage districts, parks, and celebrated food culture into a compact city-state."
    },
    themes: ["CULTURE", "HISTORY", "FOOD", "NATURE", "ENTERTAINMENT"],
    attractions,
    candidateCount: attractions.length,
    providerMode: "static"
  };
}
