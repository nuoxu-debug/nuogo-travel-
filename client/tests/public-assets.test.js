import { describe, expect, it } from "vitest";
import { publicAssetPath } from "../src/assets.js";

describe("public assets", () => {
  it("prefixes repository base paths for GitHub Pages", () => {
    expect(publicAssetPath("/images/singapore-marina-bay-hero.png", "/nuogo-travel-/"))
      .toBe("/nuogo-travel-/images/singapore-marina-bay-hero.png");
  });

  it("keeps local development paths rooted at slash", () => {
    expect(publicAssetPath("/nuogo-logo.png", "/")).toBe("/nuogo-logo.png");
  });
});
