const detailedCategories = new Set([
  "FOOD", "HISTORY", "CULTURE", "NATURE", "SHOPPING", "ENTERTAINMENT", "FAMILY"
]);

const categoryByPoiId = Object.freeze({
  "demo-sg-merlion-park": "CULTURE",
  "demo-sg-singapore-zoo": "FAMILY",
  "sg-flower-dome-cloud-forest": "NATURE",
  "sg-ocbc-skyway": "ENTERTAINMENT",
  "sg-supertree-observatory": "ENTERTAINMENT",
  "sg-mbs-skypark": "ENTERTAINMENT",
  "sg-artscience-museum": "CULTURE",
  "sg-singapore-flyer": "ENTERTAINMENT",
  "sg-national-gallery": "CULTURE",
  "sg-asian-civilisations-museum": "HISTORY",
  "sg-singapore-city-gallery": "CULTURE",
  "sg-buddha-tooth-relic-temple": "CULTURE",
  "sg-sri-mariamman-temple": "CULTURE",
  "sg-sultan-mosque": "CULTURE",
  "sg-indian-heritage-centre": "HISTORY",
  "sg-botanic-gardens": "NATURE",
  "sg-national-orchid-garden": "NATURE",
  "sg-fort-canning-park": "NATURE",
  "sg-sungei-buloh": "NATURE",
  "sg-river-wonders": "FAMILY",
  "sg-bird-paradise": "FAMILY",
  "sg-night-safari": "FAMILY",
  "sg-universal-studios": "ENTERTAINMENT",
  "sg-singapore-oceanarium": "FAMILY",
  "sg-adventure-cove": "ENTERTAINMENT"
});

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function localizedName(name, fallback) {
  if (typeof name === "string") return { en: name, zh: name };
  return {
    en: name?.en || fallback,
    zh: name?.zh || name?.en || fallback
  };
}

function categoryFor(poi) {
  if (detailedCategories.has(poi.category)) return poi.category;
  return categoryByPoiId[poi.id] ?? "CULTURE";
}

function sourceUrlFor(sources = []) {
  return sources.find(({ sourceUrl }) => sourceUrl)?.sourceUrl;
}

function sourceNameFor(source) {
  return source.raw?.source_name ?? source.raw?.sourceName ?? source.raw?.name;
}

function sourceTypeFor(source) {
  return source.raw?.source_kind ?? source.raw?.sourceType;
}

function toCandidate(poi, { destination, retrievedAt }) {
  if (poi.status !== "ACTIVE") return undefined;
  const latitude = number(poi.coordinates?.latitude);
  const longitude = number(poi.coordinates?.longitude);
  if (latitude === undefined || longitude === undefined) return undefined;

  const displayName = localizedName(poi.name, poi.id);
  return {
    xid: poi.id,
    name: displayName.en,
    displayName,
    description: {},
    descriptionSourceType: "DATABASE_BACKED",
    kinds: categoryFor(poi).toLowerCase(),
    category: categoryFor(poi),
    suggestedVisitDurationMinutes: 90,
    durationSourceType: "ESTIMATED",
    coordinates: { latitude, longitude, coordinateSystem: "WGS84" },
    ...(poi.address ? { address: poi.address } : {}),
    city: destination,
    providerMode: "DATABASE",
    sourceType: "DATABASE_BACKED",
    ...(sourceUrlFor(poi.sources) ? { sourceUrl: sourceUrlFor(poi.sources) } : {}),
    retrievedAt,
    matchStatus: "MATCHED",
    verificationStatus: "SOURCE_BACKED",
    canonicalPoiId: poi.id,
    primarySource: "DATABASE",
    sourceRecords: (poi.sources ?? []).map((source) => ({
      provider: source.provider,
      sourceId: source.sourceId,
      ...(sourceNameFor(source) ? { sourceName: sourceNameFor(source) } : {}),
      ...(sourceTypeFor(source) ? { sourceType: sourceTypeFor(source) } : {}),
      ...(source.sourceUrl ? { sourceUrl: source.sourceUrl } : {}),
      retrievedAt: source.retrievedAt ?? retrievedAt,
      ...(source.expiresAt ? { expiresAt: source.expiresAt } : {})
    }))
  };
}

export async function retrieveDatabaseAttractionCandidates(
  { destination },
  { repository, now = () => new Date().toISOString() }
) {
  if (!repository?.listCanonicalPois) {
    throw new TypeError("A repository with listCanonicalPois is required.");
  }
  const retrievedAt = now();
  const pois = await repository.listCanonicalPois(destination);
  return pois
    .map((poi) => toCandidate(poi, { destination, retrievedAt }))
    .filter(Boolean)
    .sort((left, right) => left.xid.localeCompare(right.xid));
}

export function createDatabaseCandidateService(dependencies) {
  return (input) => retrieveDatabaseAttractionCandidates(input, dependencies);
}
