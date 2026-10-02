import { describe, expect, it } from "vitest";
import { upsertEnvValue } from "../../scripts/refreshOneMapToken.js";

describe("OneMap token refresh utility", () => {
  it("adds OneMap credential placeholders without overwriting unrelated env values", () => {
    const next = upsertEnvValue("APP_RUNTIME_MODE=live\nJWT_SECRET=keep-me\n", "ONEMAP_API_EMAIL", "");

    expect(next).toContain("APP_RUNTIME_MODE=live");
    expect(next).toContain("JWT_SECRET=keep-me");
    expect(next).toContain("ONEMAP_API_EMAIL=");
  });

  it("updates only the OneMap access token value", () => {
    const next = upsertEnvValue(
      "OPENROUTER_API_KEY=secret\nONEMAP_ACCESS_TOKEN=old-token\nONEMAP_API_PASSWORD=password\n",
      "ONEMAP_ACCESS_TOKEN",
      "new-token"
    );

    expect(next).toContain("OPENROUTER_API_KEY=secret");
    expect(next).toContain("ONEMAP_ACCESS_TOKEN=new-token");
    expect(next).not.toContain("old-token");
  });
});
