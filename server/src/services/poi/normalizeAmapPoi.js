import { canonicalPoiSchema } from "@nuogo/shared/schemas";

function categoryFor(raw) {
  if (["ATTRACTION", "HOTEL", "RESTAURANT", "TRANSPORT_HUB", "OTHER"].includes(raw.category)) {
    return raw.category;
  }
  const prefix = String(raw.typecode ?? "").slice(0, 2);
  if (prefix === "05") return "RESTAURANT";
  if (prefix === "10") return "HOTEL";
  if (prefix === "15") return "TRANSPORT_HUB";
  if (prefix === "11") return "ATTRACTION";
  return "OTHER";
}

function parseCoordinates(location) {
  const [longitude, latitude] = String(location).split(",").map(Number);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    throw new TypeError("AMap POI coordinates are invalid.");
  }
  if (longitude < 73 || longitude > 135 || latitude < 18 || latitude > 54) {
    throw new RangeError("AMap POI coordinates must be within mainland China bounds.");
  }
  return { longitude, latitude };
}

function optionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function normalizeAmapPoi(raw, { city, retrievedAt }) {
  if (!raw?.id || !raw?.name) throw new TypeError("AMap POI requires an ID and name.");
  const poi = {
    canonicalPoiId: `amap:${city}:${raw.id}`,
    name: raw.name.trim(),
    city,
    category: categoryFor(raw),
    coordinates: parseCoordinates(raw.location),
    address: optionalString(raw.address),
    primarySource: "AMAP",
    amapPoiId: raw.id,
    sourceRecords: [{ provider: "AMAP", sourceId: raw.id, retrievedAt }],
    retrievedAt,
    verificationStatus: "PRIMARY_ONLY"
  };
  return canonicalPoiSchema.parse(poi);
}
