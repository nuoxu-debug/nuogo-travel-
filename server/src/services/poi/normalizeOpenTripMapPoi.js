const categoryKinds = [
  ["RESTAURANT", ["foods", "restaurants", "cafes"]],
  ["HOTEL", ["accomodations", "hotels", "hostels"]],
  ["TRANSPORT_HUB", ["railway_stations", "airports", "transport"]],
  ["ATTRACTION", ["historic", "cultural", "architecture", "museums", "natural"]]
];

function categoryFor(kinds) {
  const values = new Set(String(kinds).toLowerCase().split(","));
  return categoryKinds.find(([, candidates]) => candidates.some((candidate) => values.has(candidate)))?.[0]
    ?? "OTHER";
}

export function normalizeOpenTripMapPoi(raw, { city, retrievedAt }) {
  if (!raw?.xid || !raw?.point || !Number.isFinite(raw.point.lon) || !Number.isFinite(raw.point.lat)) {
    throw new TypeError("OpenTripMap record requires an xid and coordinates.");
  }
  return {
    provider: "OPENTRIPMAP",
    sourceId: raw.xid,
    sourceUrl: `https://opentripmap.com/en/card/${encodeURIComponent(raw.xid)}`,
    retrievedAt,
    name: String(raw.name ?? "").trim(),
    city,
    category: categoryFor(raw.kinds),
    coordinates: { longitude: raw.point.lon, latitude: raw.point.lat, coordinateSystem: "WGS84" },
    verificationStatus: "SUPPORTING_ONLY"
  };
}
