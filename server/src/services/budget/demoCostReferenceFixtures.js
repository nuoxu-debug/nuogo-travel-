const collectedOn = "2026-09-02";
const updatedAt = "2026-09-02T00:00:00.000Z";
const sources = {
  hotel: ["Trip.com Singapore hotel listings", "https://sg.trip.com/hotels/"],
  transit: ["Public Transport Council fare references", "https://www.ptc.gov.sg/fare-regulation/bus-rail/fare-structure"],
  food: ["Singapore food planning reference", "https://www.visitsingapore.com/dining-drinks-singapore/"],
  gardens: ["Gardens by the Bay admission references", "https://www.gardensbythebay.com.sg/en/ticketing/admission-rates.html"],
  uss: ["Resorts World Sentosa admission reference", "https://www.rwsentosa.com/en/attractions/universal-studios-singapore"],
  misc: ["Nuogo planning allowance derived from report Table 3.11", "https://nuogo.local/report-reference"]
};
const rows = [
  ["ACCOMMODATION_ROOM_NIGHT", "BUDGET", 6800, "hotel", "Robertson Quay Hotel"],
  ["ACCOMMODATION_ROOM_NIGHT", "MID_RANGE", 16500, "hotel", "Furama RiverFront"],
  ["ACCOMMODATION_ROOM_NIGHT", "COMFORT", 66000, "hotel", "Mandarin Oriental Singapore"],
  ["LOCAL_TRANSPORT_PERSON_DAY", "BUDGET", 128, "transit", "Short-distance public transport"],
  ["LOCAL_TRANSPORT_PERSON_DAY", "BALANCED", 190, "transit", "Medium-distance public transport"],
  ["LOCAL_TRANSPORT_PERSON_DAY", "COMFORT", 257, "transit", "Long-distance public transport planning cap"],
  ["FOOD_PERSON_DAY", "ECONOMY", 2750, "food", "Budget daily food midpoint", 2000, 3500],
  ["FOOD_PERSON_DAY", "BALANCED", 4750, "food", "Balanced daily food midpoint", 3500, 6000],
  ["FOOD_PERSON_DAY", "COMFORT", 8000, "food", "Comfort daily food midpoint", 6000, 10000],
  ["ATTRACTION_PERSON_ENTRY", null, 4600, "gardens", "Flower Dome and Cloud Forest adult reference"],
  ["ENTERTAINMENT_PERSON_ENTRY", null, 7600, "uss", "Universal Studios Singapore one-day reference"],
  ["MISCELLANEOUS_PERSON_DAY", "BUDGET", 1000, "misc", "Budget miscellaneous allowance"],
  ["MISCELLANEOUS_PERSON_DAY", "BALANCED", 2000, "misc", "Balanced miscellaneous allowance"],
  ["MISCELLANEOUS_PERSON_DAY", "COMFORT", 3000, "misc", "Comfort miscellaneous allowance"]
];

export function demoCostReferenceFixtures(city) {
  if (city !== "singapore") return [];
  return rows.map(([category, tier, representativeMinor, sourceKey, subject, minMinor = representativeMinor, maxMinor = representativeMinor]) => ({
    id: `demo-sg-${category.toLowerCase()}-${String(tier ?? "generic").toLowerCase()}`,
    city, category, ...(tier ? { tier } : {}), minMinor, maxMinor,
    representativeMinor, currency: "SGD", sourceName: `${sources[sourceKey][0]} - ${subject}`,
    sourceUrl: sources[sourceKey][1], collectedOn, updatedAt, status: "ACTIVE"
  }));
}
