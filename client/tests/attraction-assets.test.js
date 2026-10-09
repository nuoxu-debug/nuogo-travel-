import { describe, expect, it } from "vitest";
import { getAttractionImageUrl } from "../src/utils/attractionAssets.js";

describe("attraction assets", () => {
  it("resolves accurate image URLs for Singapore landmarks by XID", () => {
    expect(getAttractionImageUrl({ xid: "demo-sg-artscience-museum" }))
      .toContain("/images/attractions/artscience-museum.jpg");
    expect(getAttractionImageUrl({ xid: "demo-sg-asian-civilisations-museum" }))
      .toContain("/images/attractions/asian-civilisations-museum.jpg");
    expect(getAttractionImageUrl({ xid: "demo-sg-gardens-by-the-bay" }))
      .toContain("/images/attractions/gardens-by-the-bay.png");
    expect(getAttractionImageUrl({ xid: "demo-sg-national-gallery" }))
      .toContain("/images/attractions/national-gallery.jpg");
    expect(getAttractionImageUrl({ xid: "demo-sg-merlion-park" }))
      .toContain("/images/attractions/merlion.png");
    expect(getAttractionImageUrl({ xid: "demo-sg-botanic-gardens" }))
      .toContain("/images/attractions/botanic-gardens.jpg");
    expect(getAttractionImageUrl({ xid: "demo-sg-fort-canning" }))
      .toContain("/images/attractions/fort-canning.jpg");
    expect(getAttractionImageUrl({ xid: "demo-sg-sentosa" }))
      .toContain("/images/attractions/sentosa.jpg");
    expect(getAttractionImageUrl({ xid: "demo-sg-lau-pa-sat" }))
      .toContain("/images/attractions/lau-pa-sat.jpg");
    expect(getAttractionImageUrl({ xid: "demo-sg-maxwell-food-centre" }))
      .toContain("/images/attractions/maxwell-food-centre.jpg");
  });

  it("provides a local image fallback for expanded Singapore demo attractions", () => {
    const expandedDemoXids = [
      "demo-sg-adventure-cove",
      "demo-sg-universal-studios",
      "demo-sg-singapore-zoo",
      "demo-sg-jewel-changi-airport",
      "demo-sg-haw-par-villa",
      "demo-sg-east-coast-park"
    ];

    const adventureCoveImage = getAttractionImageUrl({ xid: "demo-sg-adventure-cove" });
    expect(adventureCoveImage).not.toBeNull();
    expect(adventureCoveImage).toContain("/images/attractions/adventure-cove.jpg");
    expect(getAttractionImageUrl({ xid: "demo-sg-universal-studios" }))
      .toContain("/images/attractions/universal-studios.jpg");
    expect(getAttractionImageUrl({ xid: "demo-sg-singapore-zoo" }))
      .toContain("/images/attractions/singapore-zoo.jpg");
    for (const xid of expandedDemoXids) {
      const imageUrl = getAttractionImageUrl({ xid });
      expect(imageUrl).not.toBeNull();
      expect(imageUrl).toContain("/images/attractions/");
    }
  });

  it("resolves image URLs through keyword fallback when XID is missing or dynamic", () => {
    expect(getAttractionImageUrl({ name: { zh: "艺术科学博物馆", en: "ArtScience Museum" } }))
      .toContain("/images/attractions/artscience-museum.jpg");
    expect(getAttractionImageUrl({ displayName: { zh: "亚洲文明博物馆", en: "Asian Civilisations Museum" } }))
      .toContain("/images/attractions/asian-civilisations-museum.jpg");
  });

  it("prioritizes explicit imageUrl on the attraction if provided", () => {
    expect(getAttractionImageUrl({ imageUrl: "https://example.com/custom.jpg" }))
      .toBe("https://example.com/custom.jpg");
  });

  it("returns null safely for unknown or empty attractions", () => {
    expect(getAttractionImageUrl(null)).toBeNull();
    expect(getAttractionImageUrl({})).toBeNull();
  });
});
