import { describe, expect, it } from "vitest";
import {
  attractionCategoryFor,
  resolveAttractionActivityCostMinor,
  resolveAttractionPrice
} from "../src/services/budget/attractionPriceResolver.js";
import { resolveCostReferences } from "../src/services/budget/costReferenceService.js";
import { demoCostReferenceFixtures } from "../src/services/budget/demoCostReferenceFixtures.js";

const references = resolveCostReferences(demoCostReferenceFixtures("singapore"), { city: "singapore" });
const baseReference = references.find(({ category, tier }) => category === "ATTRACTION_PERSON_ENTRY" && tier === null);

function priceReference(overrides = {}) {
  return {
    ...baseReference,
    id: "test-price-reference",
    category: "ATTRACTION_PERSON_ENTRY",
    tier: null,
    referenceType: "EXACT",
    unitType: "PER_PERSON_ENTRY",
    priceBasis: "Test adult planning reference",
    sourceType: "OFFICIAL",
    sourceName: "Test attraction operator",
    sourceUrl: "https://example.edu/attraction-price",
    collectedOn: "2026-09-24",
    lastReviewedDate: "2026-09-24",
    status: "ACTIVE",
    minMinor: 1_234,
    representativeMinor: 1_234,
    maxMinor: 1_234,
    ...overrides
  };
}

function poi(overrides = {}) {
  return {
    xid: "unknown-poi",
    name: "Unknown attraction",
    category: "CULTURE",
    kinds: "interesting_places",
    city: "singapore",
    ...overrides
  };
}

describe("attraction price resolver", () => {
  it("keeps generic Gardens by the Bay on category fallback instead of a fixed component price", () => {
    const price = resolveAttractionPrice({
      poi: poi({ xid: "demo-sg-gardens-by-the-bay", name: "Gardens by the Bay", kinds: "gardens,natural" }),
      references
    });

    expect(price).toMatchObject({
      admissionType: "ESTIMATED",
      representativeMinor: 3_550,
      referenceType: "CATEGORY_FALLBACK",
      tier: "GARDEN_NATURE",
      confidence: "LOW"
    });
  });

  it("prefers an active POI-specific database exact reference over category fallback", () => {
    const price = resolveAttractionPrice({
      poi: poi({
        xid: "demo-sg-gardens-by-the-bay",
        canonicalPoiId: "demo-sg-gardens-by-the-bay",
        name: "Gardens by the Bay",
        kinds: "gardens,natural"
      }),
      references: [
        ...references,
        priceReference({
          id: "sg-poi-gardens-entry",
          poiId: "demo-sg-gardens-by-the-bay",
          representativeMinor: 1_234,
          minMinor: 1_234,
          maxMinor: 1_234
        })
      ]
    });

    expect(price).toMatchObject({
      admissionType: "PAID",
      representativeMinor: 1_234,
      referenceType: "EXACT",
      sourceType: "OFFICIAL",
      priceBasis: "Test adult planning reference",
      isEstimate: false
    });
  });

  it("uses an active POI-specific database free reference as the only zero-price path", () => {
    const price = resolveAttractionPrice({
      poi: poi({
        xid: "test-free-park",
        canonicalPoiId: "test-free-park",
        name: "Test Free Park",
        kinds: "viewpoints,architecture"
      }),
      references: [
        ...references,
        priceReference({
          id: "sg-poi-test-free-park",
          poiId: "test-free-park",
          referenceType: "FREE",
          sourceType: "GOVERNMENT",
          sourceName: "Test parks authority",
          minMinor: 0,
          representativeMinor: 0,
          maxMinor: 0,
          priceBasis: "Free public attraction"
        })
      ]
    });

    expect(price).toMatchObject({
      admissionType: "FREE",
      representativeMinor: 0,
      referenceType: "FREE",
      sourceType: "GOVERNMENT",
      isEstimate: false
    });
  });

  it("ignores outdated and unavailable exact references before falling back", () => {
    const target = poi({
      xid: "outdated-museum",
      canonicalPoiId: "outdated-museum",
      name: "Outdated Museum",
      kinds: "museums,cultural"
    });
    const price = resolveAttractionPrice({
      poi: target,
      references: [
        ...references,
        priceReference({
          id: "sg-poi-outdated-museum",
          poiId: "outdated-museum",
          status: "OUTDATED",
          representativeMinor: 9_999,
          minMinor: 9_999,
          maxMinor: 9_999
        }),
        priceReference({
          id: "sg-poi-unavailable-museum",
          poiId: "outdated-museum",
          status: "UNAVAILABLE",
          representativeMinor: 8_888,
          minMinor: 8_888,
          maxMinor: 8_888
        })
      ]
    });

    expect(price).toMatchObject({
      admissionType: "ESTIMATED",
      representativeMinor: 2_500,
      referenceType: "CATEGORY_FALLBACK",
      tier: "MUSEUM"
    });
  });

  it.each([
    ["Singapore Zoo", "demo-sg-singapore-zoo", 4_900, "Mandai Wildlife Reserve", "https://www.mandai.com/en/tickets-and-passes/single-attractions/singapore-zoo.html", "Non-Resident Adult"],
    ["Night Safari", "demo-sg-night-safari", 5_800, "Mandai Wildlife Reserve", "https://www.mandai.com/en/tickets-and-passes/single-attractions/night-safari.html", "Non-Resident Adult"],
    ["River Wonders", "demo-sg-river-wonders", 4_500, "Mandai Wildlife Reserve", "https://www.mandai.com/en/tickets-and-passes/single-attractions/river-wonders.html", "Non-Resident Adult"],
    ["Bird Paradise", "demo-sg-bird-paradise", 4_900, "Mandai Wildlife Reserve", "https://www.mandai.com/en/tickets-and-passes/single-attractions/bird-paradise.html", "Non-Resident Adult"],
    ["National Museum of Singapore", "demo-sg-national-museum", 2_000, "National Museum of Singapore / NHB", "https://www.nhb.gov.sg/nationalmuseum/plan-your-visit/visitor-information/admissions", "Tourist / Foreign Resident Standard Adult General Admission"]
  ])("uses official POI-specific planning references for %s", (name, xid, expectedMinor, sourceName, sourceUrl, basis) => {
    const price = resolveAttractionPrice({
      poi: poi({ xid, name, kinds: "zoos,museums" }),
      references
    });

    expect(price).toMatchObject({
      admissionType: "PAID",
      minMinor: expectedMinor,
      representativeMinor: expectedMinor,
      maxMinor: expectedMinor,
      currency: "SGD",
      priceUnit: "PER_PERSON",
      sourceType: "OFFICIAL",
      sourceName,
      sourceUrl,
      basis,
      confidence: "HIGH",
      isPlanningReference: true,
      lastCheckedAt: "2026-09-24"
    });
    expect(price.tier).toBeUndefined();
  });

  it.each([
    ["Flower Dome + Cloud Forest", "demo-sg-flower-dome-cloud-forest", 4_600],
    ["OCBC Skyway", "demo-sg-ocbc-skyway", 1_400],
    ["Supertree Observatory", "demo-sg-supertree-observatory", 1_400],
    ["Disney Garden of Wonder at Floral Fantasy", "demo-sg-floral-fantasy", 2_400]
  ])("uses exact Gardens by the Bay component planning references for %s", (name, poiId, expectedMinor) => {
    const price = resolveAttractionPrice({
      poi: poi({ xid: poiId, canonicalPoiId: poiId, name, kinds: "gardens,natural" }),
      references
    });

    expect(price).toMatchObject({
      admissionType: "PAID",
      minMinor: expectedMinor,
      representativeMinor: expectedMinor,
      maxMinor: expectedMinor,
      sourceType: "OFFICIAL",
      sourceName: "Gardens by the Bay",
      sourceUrl: "https://www.gardensbythebay.com.sg/en/frequently-asked-questions/general.html",
      basis: "Non-Resident Adult",
      confidence: "HIGH"
    });
  });

  it("keeps known free attractions distinct from unknown prices", () => {
    const price = resolveAttractionPrice({
      poi: poi({ xid: "demo-sg-merlion-park", name: "Merlion Park", kinds: "viewpoints,architecture" }),
      references
    });

    expect(price).toMatchObject({
      admissionType: "FREE",
      minMinor: 0,
      representativeMinor: 0,
      maxMinor: 0,
      referenceType: "FREE",
      confidence: "HIGH"
    });
  });

  it("uses a category estimate for an unknown museum", () => {
    const price = resolveAttractionPrice({
      poi: poi({ xid: "otm-museum", name: "Small Museum", kinds: "museums,cultural,indoor" }),
      references
    });

    expect(attractionCategoryFor(price.poi)).toBe("MUSEUM");
    expect(price).toMatchObject({
      admissionType: "ESTIMATED",
      representativeMinor: 2_500,
      referenceType: "CATEGORY_FALLBACK",
      confidence: "LOW"
    });
  });

  it("falls back to the generic attraction reference when no category is usable", () => {
    const price = resolveAttractionPrice({
      poi: poi({ xid: "otm-unknown", name: "Unclassified Place", kinds: "" }),
      references
    });

    expect(price).toMatchObject({
      admissionType: "UNKNOWN",
      representativeMinor: 3_550,
      referenceType: "GENERIC_FALLBACK",
      confidence: "LOW"
    });
  });

  it("never treats an unknown price as zero", () => {
    const price = resolveAttractionPrice({
      poi: poi({ xid: "otm-unknown", name: "Unclassified Place", kinds: "" }),
      references
    });

    expect(price.admissionType).toBe("UNKNOWN");
    expect(price.representativeMinor).toBeGreaterThan(0);
  });

  it("multiplies resolved per-person prices by traveller count", () => {
    expect(resolveAttractionActivityCostMinor({
      activity: { xid: "demo-sg-singapore-zoo", activityType: "ATTRACTION" },
      poi: poi({ xid: "demo-sg-singapore-zoo", name: "Singapore Zoo", kinds: "zoos,wildlife" }),
      references,
      travellerCount: 3
    })).toBe(14_700);
  });

  it("ignores LLM-provided prices in favour of system references", () => {
    expect(resolveAttractionActivityCostMinor({
      activity: {
        xid: "priced-by-db",
        activityType: "CULTURE",
        estimatedActivityCostMinor: 1,
        llmTicketPriceMinor: 1
      },
      poi: poi({ xid: "priced-by-db", canonicalPoiId: "priced-by-db", name: "Priced by DB", kinds: "museums" }),
      references: [
        ...references,
        priceReference({
          id: "sg-poi-priced-by-db",
          poiId: "priced-by-db",
          representativeMinor: 4_900,
          minMinor: 4_900,
          maxMinor: 4_900
        })
      ],
      travellerCount: 2
    })).toBe(9_800);
  });

  it("prefers POI-specific references before category estimates", () => {
    const price = resolveAttractionPrice({
      poi: poi({ xid: "demo-sg-singapore-zoo", name: "Singapore Zoo", kinds: "zoos,wildlife" }),
      references
    });

    expect(price.sourceType).toBe("OFFICIAL");
    expect(price.tier).toBeUndefined();
  });

  it("does not use broad partial-name matching for POI-specific prices", () => {
    const price = resolveAttractionPrice({
      poi: poi({ xid: "otm-singapore-zoo-cafe", name: "Singapore Zoo Cafe", kinds: "zoos,wildlife" }),
      references
    });

    expect(price).toMatchObject({
      admissionType: "ESTIMATED",
      referenceType: "CATEGORY_FALLBACK",
      tier: "WILDLIFE"
    });
  });

  it("leaves Universal Studios Singapore on category fallback because the official source is a starting price", () => {
    const price = resolveAttractionPrice({
      poi: poi({ xid: "demo-sg-universal-studios", name: "Universal Studios Singapore", kinds: "amusements,theme_parks" }),
      references
    });

    expect(price).toMatchObject({
      admissionType: "ESTIMATED",
      referenceType: "CATEGORY_FALLBACK",
      tier: "THEME_PARK"
    });
  });
});
