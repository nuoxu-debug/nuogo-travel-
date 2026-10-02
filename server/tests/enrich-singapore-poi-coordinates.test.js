import { describe, expect, it } from "vitest";
import {
  buildSecondPassSearchQueries,
  evaluateOneMapCandidates,
  evaluateSecondPassOneMapCandidates,
  isPlausibleSingaporeCoordinate,
  normalizeGeoVerificationStatus,
  selectConfiguredAddressLevelCandidate,
  shouldRetryRow,
  validateWorkbookRows
} from "../../scripts/enrichSingaporePoiCoordinates.js";

describe("Singapore POI OneMap coordinate enrichment helpers", () => {
  it("prefers an exact postal-code match instead of blindly selecting the first result", () => {
    const row = {
      poi_id: "sg-national-gallery",
      name_en: "National Gallery Singapore",
      area: "Civic District",
      address: "1 St Andrew's Road, Singapore 178957"
    };
    const result = evaluateOneMapCandidates(row, [
      {
        SEARCHVAL: "Different Building",
        ADDRESS: "1 Example Road Singapore 999999",
        POSTAL: "999999",
        LATITUDE: "1.300000",
        LONGITUDE: "103.800000"
      },
      {
        SEARCHVAL: "NATIONAL GALLERY SINGAPORE",
        ADDRESS: "1 ST. ANDREW'S ROAD NATIONAL GALLERY SINGAPORE SINGAPORE 178957",
        POSTAL: "178957",
        LATITUDE: "1.290270",
        LONGITUDE: "103.851959"
      }
    ]);

    expect(result.matchStatus).toBe("MATCHED");
    expect(result.candidate.SEARCHVAL).toBe("NATIONAL GALLERY SINGAPORE");
  });

  it("marks ambiguous candidates as needing review", () => {
    const row = {
      poi_id: "sg-ambiguous",
      name_en: "Museum",
      area: "City",
      address: "Singapore"
    };
    const result = evaluateOneMapCandidates(row, [
      { SEARCHVAL: "MUSEUM A", ADDRESS: "CITY SINGAPORE", LATITUDE: "1.29", LONGITUDE: "103.85" },
      { SEARCHVAL: "MUSEUM B", ADDRESS: "CITY SINGAPORE", LATITUDE: "1.30", LONGITUDE: "103.86" }
    ]);

    expect(result).toMatchObject({
      matchStatus: "NEEDS_REVIEW",
      reason: expect.stringMatching(/ambiguous/i)
    });
  });

  it("removes only the geo-pending part of successful verification status", () => {
    expect(normalizeGeoVerificationStatus("VERIFIED_GEO_PENDING")).toBe("VERIFIED");
    expect(normalizeGeoVerificationStatus("VERIFIED_VARIABLE_GEO_PENDING")).toBe("VERIFIED_VARIABLE");
    expect(normalizeGeoVerificationStatus("PARTIAL_PRICE_GEO_PENDING")).toBe("PARTIAL_PRICE");
  });

  it("rejects coordinates outside conservative Singapore bounds", () => {
    expect(isPlausibleSingaporeCoordinate("1.290270", "103.851959")).toBe(true);
    expect(isPlausibleSingaporeCoordinate("51.5074", "-0.1278")).toBe(false);
    expect(isPlausibleSingaporeCoordinate("", "103.851959")).toBe(false);
  });

  it("requires exactly 25 unique POI rows before writing output", () => {
    const rows = Array.from({ length: 25 }, (_, index) => ({ poi_id: `poi-${index}` }));
    expect(() => validateWorkbookRows(rows)).not.toThrow();
    expect(() => validateWorkbookRows(rows.slice(0, 24))).toThrow(/exactly 25/i);
    expect(() => validateWorkbookRows([...rows.slice(0, 24), { poi_id: "poi-0" }])).toThrow(/unique/i);
  });

  it("uses postal code as the first second-pass search query", () => {
    expect(buildSecondPassSearchQueries({
      poi_id: "sg-botanic-gardens",
      name_en: "Singapore Botanic Gardens",
      address: "1 Cluny Road, Singapore 259569"
    })).toEqual([
      "259569",
      "Singapore Botanic Gardens",
      "Singapore Botanic Gardens 259569"
    ]);
  });

  it("uses the corrected third-pass search order for National Orchid Garden", () => {
    expect(buildSecondPassSearchQueries({
      poi_id: "sg-national-orchid-garden",
      name_en: "National Orchid Garden",
      address: "1 Cluny Road, Singapore 259569 (inside Singapore Botanic Gardens)"
    })).toEqual([
      "National Orchid Garden",
      "257683",
      "National Orchid Garden 257683",
      "1 Cluny Road 257683"
    ]);
  });

  it("uses venue-level Gardens by the Bay searches for unresolved sub-attractions", () => {
    expect(buildSecondPassSearchQueries({
      poi_id: "sg-ocbc-skyway",
      name_en: "OCBC Skyway",
      address: "18 Marina Gardens Drive, Singapore 018953"
    })).toEqual([
      "018953",
      "Gardens by the Bay",
      "18 Marina Gardens Drive",
      "Gardens by the Bay 018953"
    ]);
  });

  it("selects the configured official venue from multiple same-postal address-level OneMap candidates", () => {
    const candidate = selectConfiguredAddressLevelCandidate([
      { SEARCHVAL: "EXHIBITION CENTRE", ADDRESS: "18 MARINA GARDENS DRIVE EXHIBITION CENTRE SINGAPORE 018953", POSTAL: "018953", LATITUDE: "1.281297", LONGITUDE: "103.861149" },
      { SEARCHVAL: "GARDENS BY THE BAY", ADDRESS: "18 MARINA GARDENS DRIVE GARDENS BY THE BAY SINGAPORE 018953", POSTAL: "018953", LATITUDE: "1.284588", LONGITUDE: "103.864656" }
    ], { preferredSearchVal: "GARDENS BY THE BAY", officialPostal: "018953" });

    expect(candidate.SEARCHVAL).toBe("GARDENS BY THE BAY");
  });

  it("accepts an address-level match for a sub-attraction at its official venue postal code", () => {
    const result = evaluateSecondPassOneMapCandidates({
      name_en: "Flower Dome & Cloud Forest",
      address: "18 Marina Gardens Drive, Singapore 018953"
    }, [
      {
        SEARCHVAL: "GARDENS BY THE BAY",
        ADDRESS: "18 MARINA GARDENS DRIVE GARDENS BY THE BAY SINGAPORE 018953",
        POSTAL: "018953",
        LATITUDE: "1.2815683",
        LONGITUDE: "103.8636132"
      }
    ]);

    expect(result).toMatchObject({
      matchStatus: "MATCHED",
      matchBasis: "ADDRESS_LEVEL",
      reason: expect.stringMatching(/address-level/i)
    });
  });

  it("does not retry already matched rows with coordinates", () => {
    expect(shouldRetryRow({
      latitude: "1.29",
      longitude: "103.85",
      verification_status: "VERIFIED"
    })).toBe(false);
    expect(shouldRetryRow({
      latitude: "",
      longitude: "",
      verification_status: "NEEDS_REVIEW"
    })).toBe(true);
  });
});
