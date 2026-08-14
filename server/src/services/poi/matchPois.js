function normalizedName(value) {
  return String(value).toLocaleLowerCase("en").normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, "");
}

function bigrams(value) {
  if (value.length < 2) return new Set([value]);
  return new Set(Array.from({ length: value.length - 1 }, (_, index) => value.slice(index, index + 2)));
}

function nameSimilarity(left, right) {
  const a = normalizedName(left);
  const b = normalizedName(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const leftPairs = bigrams(a);
  const rightPairs = bigrams(b);
  const overlap = [...leftPairs].filter((pair) => rightPairs.has(pair)).length;
  return (2 * overlap) / (leftPairs.size + rightPairs.size);
}

function distanceMeters(left, right) {
  const radians = (value) => value * Math.PI / 180;
  const lat1 = radians(left.latitude);
  const lat2 = radians(right.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLon = radians(right.longitude - left.longitude);
  const value = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function compatibleCategory(primary, supporting) {
  return primary === supporting || supporting === "OTHER";
}

export function matchPois(primaryPois, supportingRecords, threshold = 0.8) {
  return primaryPois.map((primary) => {
    const candidates = supportingRecords.filter((supporting) => (
      supporting.city === primary.city &&
      compatibleCategory(primary.category, supporting.category) &&
      distanceMeters(primary.coordinates, supporting.coordinates) <= 500 &&
      nameSimilarity(primary.name, supporting.name) >= threshold
    ));

    if (candidates.length > 1) {
      return { ...primary, verificationStatus: "AMBIGUOUS" };
    }
    if (!candidates.length) return { ...primary, verificationStatus: "PRIMARY_ONLY" };

    const [match] = candidates;
    return {
      ...primary,
      openTripMapXid: match.sourceId,
      sourceRecords: [
        ...primary.sourceRecords,
        {
          provider: "OPENTRIPMAP",
          sourceId: match.sourceId,
          sourceUrl: match.sourceUrl,
          retrievedAt: match.retrievedAt
        }
      ],
      verificationStatus: "MATCHED"
    };
  });
}
