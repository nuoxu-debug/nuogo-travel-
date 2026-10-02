export const attractionPriceReferenceTiers = Object.freeze([
  "MUSEUM",
  "GARDEN_NATURE",
  "OBSERVATION",
  "WILDLIFE",
  "THEME_PARK",
  "CULTURAL_ATTRACTION",
  "GENERAL_PAID_ATTRACTION"
]);

function kindsFor(poi = {}) {
  return String(poi.kinds ?? poi.poi?.kinds ?? "")
    .toLowerCase()
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function poiIds(poi = {}) {
  return new Set([
    poi.id,
    poi.poiId,
    poi.canonicalPoiId,
    poi.xid,
    poi.candidateId,
    poi.openTripMapXid
  ].filter(Boolean));
}

export function attractionCategoryFor(poi = {}) {
  const kinds = new Set(kindsFor(poi));
  if (kinds.has("museums")) return "MUSEUM";
  if (["gardens", "parks", "natural"].some((kind) => kinds.has(kind))) return "GARDEN_NATURE";
  if (["viewpoints", "architecture"].some((kind) => kinds.has(kind))) return "OBSERVATION";
  if (["zoos", "aquariums", "wildlife"].some((kind) => kinds.has(kind))) return "WILDLIFE";
  if (["amusements", "waterparks", "theme_parks"].some((kind) => kinds.has(kind))) return "THEME_PARK";
  if (["historic", "cultural", "religion"].some((kind) => kinds.has(kind))) return "CULTURAL_ATTRACTION";
  return undefined;
}

function referenceFor(references, tier = null) {
  const referenceType = tier ? "CATEGORY_FALLBACK" : "GENERIC_FALLBACK";
  return references.find((item) =>
    item.status === "ACTIVE" &&
    item.category === "ATTRACTION_PERSON_ENTRY" &&
    (item.tier ?? null) === tier &&
    (item.referenceType ?? referenceType) === referenceType);
}

function unitToPriceUnit(unitType) {
  return unitType === "PER_PERSON_ENTRY" ? "PER_PERSON" : unitType ?? "PER_PERSON";
}

function fromReference(reference, { sourceType, confidence, admissionType, tier, referenceType, isEstimate }) {
  return {
    admissionType,
    minMinor: reference.minMinor,
    representativeMinor: reference.representativeMinor,
    maxMinor: reference.maxMinor,
    currency: reference.currency,
    priceUnit: unitToPriceUnit(reference.unitType),
    referenceType: reference.referenceType ?? referenceType,
    unitType: reference.unitType ?? "PER_PERSON_ENTRY",
    priceBasis: reference.priceBasis ?? reference.basis,
    basis: reference.priceBasis ?? reference.basis,
    sourceType: reference.sourceType ?? sourceType,
    sourceName: reference.sourceName,
    sourceUrl: reference.sourceUrl,
    confidence,
    isPlanningReference: true,
    isEstimate,
    lastCheckedAt: reference.lastReviewedDate ?? reference.collectedOn ?? null,
    lastReviewedDate: reference.lastReviewedDate ?? reference.collectedOn ?? null,
    notes: reference.notes,
    ...(tier ? { tier } : {})
  };
}

function poiSpecificReference(references, target, referenceType) {
  const ids = poiIds(target);
  return references.find((item) =>
    item.status === "ACTIVE" &&
    item.category === "ATTRACTION_PERSON_ENTRY" &&
    item.referenceType === referenceType &&
    item.poiId &&
    ids.has(item.poiId));
}

export function resolveAttractionPrice({ activity = {}, poi = activity.poi, references = [] }) {
  const target = { ...poi, xid: poi?.xid ?? activity.xid };
  const exact = poiSpecificReference(references, target, "EXACT");
  if (exact) return { ...fromReference(exact, { admissionType: "PAID", confidence: "HIGH", referenceType: "EXACT", isEstimate: false }), poi: target };

  const free = poiSpecificReference(references, target, "FREE");
  if (free) return { ...fromReference(free, { admissionType: "FREE", confidence: "HIGH", referenceType: "FREE", isEstimate: false }), poi: target };

  const tier = attractionCategoryFor(target);
  const categoryReference = tier ? referenceFor(references, tier) : undefined;
  if (categoryReference) {
    return { ...fromReference(categoryReference, { sourceType: "SYSTEM_ESTIMATE", confidence: "LOW", admissionType: "ESTIMATED", tier, referenceType: "CATEGORY_FALLBACK", isEstimate: true }), poi: target };
  }

  const fallback = referenceFor(references);
  return {
    ...fromReference(fallback, { sourceType: "SYSTEM_ESTIMATE", confidence: "LOW", admissionType: "UNKNOWN", referenceType: "GENERIC_FALLBACK", isEstimate: true }),
    poi: target
  };
}

export function resolveAttractionActivityCostMinor({ activity, poi = activity.poi, references, travellerCount }) {
  return resolveAttractionPrice({ activity, poi, references }).representativeMinor * Number(travellerCount ?? 1);
}
