import { describe, expect, it } from "vitest";
import { displayLabel, localizedText } from "../src/i18n/display.js";

describe("closed bilingual display formatting", () => {
  it("formats known Chinese and English labels", () => {
    expect(displayLabel("zh", "profile", "BUDGET_SAVING")).toBe("\u7701\u94b1\u4f18\u5148");
    expect(displayLabel("en", "profile", "COMFORT_FOCUSED")).toBe("Comfort-focused");
    expect(displayLabel("zh", "activity", "MEAL")).toBe("\u7528\u9910");
    expect(displayLabel("en", "transport", "PUBLIC_TRANSIT")).toBe("Public transport");
    expect(displayLabel("zh", "source", "DATABASE_BACKED")).toBe("\u6570\u636e\u5e93\u8d44\u6599");
  });

  it("never returns an unknown raw enum or developer value", () => {
    const cases = [
      ["activity", "UNKNOWN_INTERNAL", "\u5176\u4ed6\u6d3b\u52a8", "Other activity"],
      ["transport", "MAGLEV_INTERNAL", "\u5f53\u5730\u4ea4\u901a", "Local transport"],
      ["source", "UNSAFE_PROVIDER_STATE", "\u6765\u6e90\u4e0d\u53ef\u7528", "Source unavailable"],
      ["verification", "SECRET_MATCH_CODE", "\u72b6\u6001\u4e0d\u53ef\u7528", "Status unavailable"],
      ["profile", "EXPERIMENTAL", "\u884c\u7a0b\u65b9\u6848", "Itinerary option"]
    ];
    for (const [namespace, value, zh, en] of cases) {
      expect(displayLabel("zh", namespace, value)).toBe(zh);
      expect(displayLabel("en", namespace, value)).toBe(en);
      expect(displayLabel("zh", namespace, value)).not.toContain(value);
      expect(displayLabel("en", namespace, value)).not.toContain(value);
    }
  });

  it("resolves localized facts in the selected language with safe fallbacks", () => {
    expect(localizedText({ zh: "\u6545\u5bab\u535a\u7269\u9662", en: "Forbidden City" }, "zh", "common.unavailable"))
      .toBe("\u6545\u5bab\u535a\u7269\u9662");
    expect(localizedText({ en: "Canonical source name" }, "zh", "common.unavailable"))
      .toBe("Canonical source name");
    expect(localizedText(undefined, "zh", "common.descriptionUnavailable"))
      .toBe("\u6682\u65e0\u666f\u70b9\u4ecb\u7ecd");
  });

  it("preserves generated copy in its recorded locale without fabricating a translation", () => {
    const generated = { text: "A history-focused morning.", locale: "en" };
    expect(localizedText(generated, "zh", "common.unavailable")).toBe("A history-focused morning.");
  });
});
