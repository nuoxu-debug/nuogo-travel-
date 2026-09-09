import { describe, expect, it } from "vitest";
import { getDestinationDiscoveryContent, resolveAttractionDisplay } from "./destinationDiscovery.js";

describe("Singapore discovery content", () => {
  it("provides bilingual Singapore introduction", () => {
    const content = getDestinationDiscoveryContent("singapore");
    expect(content.name).toEqual({ en: "Singapore", zh: "新加坡" });
    expect(content.introduction.en).toContain("Singapore");
    expect(content.introduction.zh).toContain("新加坡");
    expect(content.source.sourceType).toBe("APPLICATION_CONTENT");
  });

  it("uses controlled bilingual POI content and safe missing descriptions", () => {
    expect(resolveAttractionDisplay({ xid: "demo-sg-gardens-by-the-bay", sourceName: "Gardens by the Bay", language: "zh" })).toMatchObject({
      name: "滨海湾花园", descriptionSourceType: "DATABASE_BACKED"
    });
    expect(resolveAttractionDisplay({ xid: "live-xid", sourceName: "Source Name", language: "zh" })).toMatchObject({
      name: "Source Name", description: "暂无景点介绍"
    });
  });

  it("rejects unsupported active destinations", () => {
    expect(() => getDestinationDiscoveryContent("beijing")).toThrow(/Unsupported destination/);
  });
});
