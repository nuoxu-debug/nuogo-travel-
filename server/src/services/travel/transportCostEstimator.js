function activeReferences(references, category) {
  return (references ?? []).filter((record) =>
    record.category === category && (record.status === undefined || record.status === "ACTIVE"));
}

function parseDistanceBand(tier) {
  const match = String(tier ?? "").match(/^KM_(\d+)_(\d+)$/);
  if (!match) return null;
  return {
    minMeters: Number(match[1]) * 100,
    maxMeters: Number(match[2]) * 100
  };
}

function publicTransportFareMinor({ distanceMeters, travellerCount, references }) {
  const distance = Math.max(0, Math.round(Number(distanceMeters) || 0));
  const bands = activeReferences(references, "PUBLIC_TRANSPORT_DISTANCE_FARE")
    .map((record) => ({ record, band: parseDistanceBand(record.tier) }))
    .filter(({ band }) => band)
    .sort((left, right) => left.band.minMeters - right.band.minMeters || left.band.maxMeters - right.band.maxMeters);
  const match = bands.find(({ band }) => distance >= band.minMeters && distance <= band.maxMeters);
  if (!match) return undefined;
  return match.record.representativeMinor * Math.max(1, Number(travellerCount) || 1);
}

function taxiEstimateMinor({ distanceMeters, references }) {
  const rows = activeReferences(references, "TAXI_OR_RIDE_HAIL_ESTIMATE");
  const base = rows.find(({ tier }) => tier === "BASE_FARE")?.representativeMinor;
  const perKm = rows.find(({ tier }) => tier === "PER_KM")?.representativeMinor;
  if (!Number.isInteger(base) || !Number.isInteger(perKm)) return undefined;
  return base + Math.ceil(Math.max(0, Number(distanceMeters) || 0) / 1000) * perKm;
}

export function estimateTransportCostMinor({ mode, distanceMeters, travellerCount, references }) {
  if (mode === "WALK") return 0;
  if (["PUBLIC_TRANSIT", "MIXED"].includes(mode)) {
    return publicTransportFareMinor({ distanceMeters, travellerCount, references });
  }
  if (mode === "TAXI") {
    return taxiEstimateMinor({ distanceMeters, references });
  }
  return undefined;
}
