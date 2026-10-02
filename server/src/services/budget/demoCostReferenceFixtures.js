const collectedOn = "2026-09-24";
const updatedAt = "2026-09-24T00:00:00.000Z";
const sources = {
  hotel: ["Trip.com Singapore hotel listings", "https://sg.trip.com/hotels/"],
  transit: ["Public Transport Council fare references", "https://www.ptc.gov.sg/fare-regulation/bus-rail/fare-structure"],
  taxi: ["Singapore taxi and ride-hail planning reference", "https://www.lta.gov.sg/content/ltagov/en/getting_around/taxis_private_hire_cars/taxi_fares_payment_methods.html"],
  food: ["Singapore food planning reference", "https://www.visitsingapore.com/dining-drinks-singapore/"],
  gardens: ["Klook Gardens by the Bay ticket references", "https://www.klook.com/en-SG/activity/127-gardens-by-the-bay-singapore/"],
  uss: ["Resorts World Sentosa admission reference", "https://www.rwsentosa.com/en/attractions/universal-studios-singapore"],
  museum: ["Nuogo manually maintained Singapore museum planning references", "https://www.nhb.gov.sg/"],
  category: ["Nuogo manually maintained Singapore attraction category planning references", "https://www.visitsingapore.com/"],
  misc: ["Nuogo planning allowance derived from report Table 3.11", "https://nuogo.local/report-reference"]
};
const sourceTypes = {
  hotel: "COMMERCIAL",
  transit: "GOVERNMENT",
  taxi: "GOVERNMENT",
  food: "GOVERNMENT",
  gardens: "COMMERCIAL",
  uss: "COMMERCIAL",
  museum: "GOVERNMENT",
  category: "SYSTEM_ESTIMATE",
  misc: "SYSTEM_ESTIMATE"
};
const rows = [
  ["ACCOMMODATION_ROOM_NIGHT", "BUDGET", 6800, "hotel", "Robertson Quay Hotel"],
  ["ACCOMMODATION_ROOM_NIGHT", "MID_RANGE", 16500, "hotel", "Furama RiverFront"],
  ["ACCOMMODATION_ROOM_NIGHT", "COMFORT", 66000, "hotel", "Mandarin Oriental Singapore"],
  ["LOCAL_TRANSPORT_PERSON_DAY", "BUDGET", 128, "transit", "Short-distance public transport"],
  ["LOCAL_TRANSPORT_PERSON_DAY", "BALANCED", 190, "transit", "Medium-distance public transport"],
  ["LOCAL_TRANSPORT_PERSON_DAY", "COMFORT", 257, "transit", "Long-distance public transport planning cap"],
  ["PUBLIC_TRANSPORT_DISTANCE_FARE", "KM_0_32", 109, "transit", "Adult card fare 0.0km to 3.2km"],
  ["PUBLIC_TRANSPORT_DISTANCE_FARE", "KM_32_42", 119, "transit", "Adult card fare above 3.2km to 4.2km"],
  ["PUBLIC_TRANSPORT_DISTANCE_FARE", "KM_42_52", 130, "transit", "Adult card fare above 4.2km to 5.2km"],
  ["PUBLIC_TRANSPORT_DISTANCE_FARE", "KM_52_72", 150, "transit", "Adult card fare above 5.2km to 7.2km"],
  ["PUBLIC_TRANSPORT_DISTANCE_FARE", "KM_72_999", 190, "transit", "Adult card fare above 7.2km planning cap"],
  ["TAXI_OR_RIDE_HAIL_ESTIMATE", "BASE_FARE", 420, "taxi", "Vehicle-level base fare planning assumption"],
  ["TAXI_OR_RIDE_HAIL_ESTIMATE", "PER_KM", 85, "taxi", "Vehicle-level per kilometre planning assumption"],
  ["FOOD_PERSON_DAY", "ECONOMY", 2750, "food", "Budget daily food midpoint", 2000, 3500],
  ["FOOD_PERSON_DAY", "BALANCED", 4750, "food", "Balanced daily food midpoint", 3500, 6000],
  ["FOOD_PERSON_DAY", "COMFORT", 8000, "food", "Comfort daily food midpoint", 6000, 10000],
  ["ATTRACTION_PERSON_ENTRY", null, 3550, "gardens", "Floral Fantasy to three-attraction package planning range", 1800, 5050],
  ["ATTRACTION_PERSON_ENTRY", "MUSEUM", 2500, "museum", "Museum admission category estimate", 1200, 4000],
  ["ATTRACTION_PERSON_ENTRY", "GARDEN_NATURE", 3550, "gardens", "Garden and nature attraction category estimate", 1800, 5050],
  ["ATTRACTION_PERSON_ENTRY", "OBSERVATION", 3550, "category", "Observation attraction category estimate", 1800, 5050],
  ["ATTRACTION_PERSON_ENTRY", "WILDLIFE", 5050, "category", "Wildlife attraction category estimate", 3550, 6200],
  ["ATTRACTION_PERSON_ENTRY", "THEME_PARK", 7600, "uss", "Theme park category estimate", 7600, 7600],
  ["ATTRACTION_PERSON_ENTRY", "CULTURAL_ATTRACTION", 2500, "museum", "Cultural attraction category estimate", 0, 4000],
  ["ATTRACTION_PERSON_ENTRY", "GENERAL_PAID_ATTRACTION", 3550, "category", "General paid attraction category estimate", 1800, 5050],
  ["ENTERTAINMENT_PERSON_ENTRY", null, 7600, "uss", "Universal Studios Singapore one-day reference"],
  ["MISCELLANEOUS_PERSON_DAY", "BUDGET", 1000, "misc", "Budget miscellaneous allowance"],
  ["MISCELLANEOUS_PERSON_DAY", "BALANCED", 2000, "misc", "Balanced miscellaneous allowance"],
  ["MISCELLANEOUS_PERSON_DAY", "COMFORT", 3000, "misc", "Comfort miscellaneous allowance"]
];

const exactPoiReferences = [
  ["demo-sg-singapore-zoo", "Singapore Zoo", 4900, "Mandai Wildlife Reserve", "https://www.mandai.com/en/tickets-and-passes/single-attractions/singapore-zoo.html", "Non-Resident Adult"],
  ["demo-sg-night-safari", "Night Safari", 5800, "Mandai Wildlife Reserve", "https://www.mandai.com/en/tickets-and-passes/single-attractions/night-safari.html", "Non-Resident Adult"],
  ["demo-sg-river-wonders", "River Wonders", 4500, "Mandai Wildlife Reserve", "https://www.mandai.com/en/tickets-and-passes/single-attractions/river-wonders.html", "Non-Resident Adult"],
  ["demo-sg-bird-paradise", "Bird Paradise", 4900, "Mandai Wildlife Reserve", "https://www.mandai.com/en/tickets-and-passes/single-attractions/bird-paradise.html", "Non-Resident Adult"],
  ["demo-sg-national-museum", "National Museum of Singapore", 2000, "National Museum of Singapore / NHB", "https://www.nhb.gov.sg/nationalmuseum/plan-your-visit/visitor-information/admissions", "Tourist / Foreign Resident Standard Adult General Admission"],
  ["demo-sg-flower-dome-cloud-forest", "Flower Dome + Cloud Forest", 4600, "Gardens by the Bay", "https://www.gardensbythebay.com.sg/en/frequently-asked-questions/general.html", "Non-Resident Adult"],
  ["demo-sg-ocbc-skyway", "OCBC Skyway", 1400, "Gardens by the Bay", "https://www.gardensbythebay.com.sg/en/frequently-asked-questions/general.html", "Non-Resident Adult"],
  ["demo-sg-supertree-observatory", "Supertree Observatory", 1400, "Gardens by the Bay", "https://www.gardensbythebay.com.sg/en/frequently-asked-questions/general.html", "Non-Resident Adult"],
  ["demo-sg-floral-fantasy", "Disney Garden of Wonder at Floral Fantasy", 2400, "Gardens by the Bay", "https://www.gardensbythebay.com.sg/en/frequently-asked-questions/general.html", "Non-Resident Adult"]
];

const freePoiReferences = [
  ["demo-sg-merlion-park", "Merlion Park"],
  ["demo-sg-botanic-gardens", "Singapore Botanic Gardens"],
  ["demo-sg-chinatown", "Chinatown"],
  ["demo-sg-kampong-gelam", "Kampong Gelam"],
  ["demo-sg-little-india", "Little India"],
  ["demo-sg-marina-bay-sands", "Marina Bay"],
  ["demo-sg-fort-canning", "Fort Canning Park"],
  ["demo-sg-mount-faber-park", "Mount Faber Park"],
  ["demo-sg-southern-ridges", "Southern Ridges"],
  ["demo-sg-henderson-waves", "Henderson Waves"],
  ["demo-sg-east-coast-park", "East Coast Park"],
  ["demo-sg-macritchie-reservoir", "MacRitchie Reservoir Park"],
  ["demo-sg-sungei-buloh", "Sungei Buloh Wetland Reserve"],
  ["demo-sg-jurong-lake-gardens", "Jurong Lake Gardens"],
  ["demo-sg-chinese-japanese-gardens", "Chinese and Japanese Gardens"],
  ["demo-sg-lazarus-island", "Lazarus Island"],
  ["demo-sg-st-johns-island", "St John's Island"],
  ["demo-sg-civic-district", "Civic District"],
  ["demo-sg-helix-bridge", "Helix Bridge"],
  ["demo-sg-jewel-rain-vortex", "HSBC Rain Vortex"]
];

export function demoCostReferenceFixtures(city) {
  if (city !== "singapore") return [];
  const fallbackReferences = rows.map(([category, tier, representativeMinor, sourceKey, subject, minMinor = representativeMinor, maxMinor = representativeMinor]) => ({
    id: `demo-sg-${category.toLowerCase()}-${String(tier ?? "generic").toLowerCase()}`,
    city, category, ...(tier ? { tier } : {}), minMinor, maxMinor,
    representativeMinor, currency: "SGD", sourceName: `${sources[sourceKey][0]} - ${subject}`,
    sourceUrl: sources[sourceKey][1], collectedOn, updatedAt, status: "ACTIVE",
    destinationId: city,
    referenceType: category === "ATTRACTION_PERSON_ENTRY"
      ? (tier ? "CATEGORY_FALLBACK" : "GENERIC_FALLBACK")
      : "GENERIC_FALLBACK",
    unitType: category === "ACCOMMODATION_ROOM_NIGHT"
      ? "PER_ROOM_NIGHT"
      : category === "LOCAL_TRANSPORT_PERSON_DAY" || category === "FOOD_PERSON_DAY" || category === "MISCELLANEOUS_PERSON_DAY"
        ? "PER_PERSON_DAY"
        : category === "PUBLIC_TRANSPORT_DISTANCE_FARE" || category === "TAXI_OR_RIDE_HAIL_ESTIMATE"
          ? "PER_LEG"
          : "PER_PERSON_ENTRY",
    sourceType: sourceTypes[sourceKey],
    priceBasis: subject,
    lastReviewedDate: collectedOn,
    notes: "Source-backed planning reference, not a guaranteed live price."
  }));
  const exactReferences = exactPoiReferences.map(([poiId, subject, representativeMinor, sourceName, sourceUrl, priceBasis]) => ({
    id: `demo-sg-poi-${poiId}-exact`,
    city,
    destinationId: city,
    poiId,
    category: "ATTRACTION_PERSON_ENTRY",
    tier: null,
    minMinor: representativeMinor,
    maxMinor: representativeMinor,
    representativeMinor,
    currency: "SGD",
    sourceName,
    sourceUrl,
    collectedOn,
    updatedAt,
    status: "ACTIVE",
    referenceType: "EXACT",
    unitType: "PER_PERSON_ENTRY",
    priceBasis,
    sourceType: "OFFICIAL",
    lastReviewedDate: collectedOn,
    notes: `${subject} planning price reference; not a guaranteed live booking price.`
  }));
  const freeReferences = freePoiReferences.map(([poiId, subject]) => ({
    id: `demo-sg-poi-${poiId}-free`,
    city,
    destinationId: city,
    poiId,
    category: "ATTRACTION_PERSON_ENTRY",
    tier: null,
    minMinor: 0,
    maxMinor: 0,
    representativeMinor: 0,
    currency: "SGD",
    sourceName: "Nuogo curated Singapore free public-attraction reference",
    sourceUrl: "https://www.visitsingapore.com/",
    collectedOn,
    updatedAt,
    status: "ACTIVE",
    referenceType: "FREE",
    unitType: "PER_PERSON_ENTRY",
    priceBasis: "Free public attraction",
    sourceType: "SYSTEM_ESTIMATE",
    lastReviewedDate: collectedOn,
    notes: `${subject} is explicitly treated as a free planning reference; unknown attractions never default to zero.`
  }));
  return [...fallbackReferences, ...exactReferences, ...freeReferences];
}
