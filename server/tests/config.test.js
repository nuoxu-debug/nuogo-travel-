import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

const original = {
  AI_PROVIDER: process.env.AI_PROVIDER,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  DEMO_MODE: process.env.DEMO_MODE,
  MYSQL_PASSWORD: process.env.MYSQL_PASSWORD,
  JWT_SECRET: process.env.JWT_SECRET,
  OPENROUTER_TIMEOUT_MS: process.env.OPENROUTER_TIMEOUT_MS
};

afterEach(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("runtime configuration", () => {
  it("rejects an unknown AI provider", () => {
    process.env.AI_PROVIDER = "typo-provider";
    expect(() => loadConfig()).toThrow(/AI_PROVIDER/i);
  });

  it("requires an API key when OpenRouter is selected", () => {
    process.env.AI_PROVIDER = "openrouter";
    delete process.env.OPENROUTER_API_KEY;
    expect(() => loadConfig()).toThrow(/OPENROUTER_API_KEY/i);
  });

  it("allows grounded demo AI with memory persistence", () => {
    process.env.AI_PROVIDER = "demo";
    process.env.DEMO_MODE = "true";
    delete process.env.OPENROUTER_API_KEY;
    expect(loadConfig()).toMatchObject({
      aiProvider: "demo",
      demoMode: true,
      openRouterTimeoutMs: 30000
    });
  });

  it("loads a configured OpenRouter timeout", () => {
    process.env.AI_PROVIDER = "openrouter";
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    process.env.OPENROUTER_TIMEOUT_MS = "15000";

    expect(loadConfig().openRouterTimeoutMs).toBe(15000);
  });

  it("requires MySQL credentials when memory persistence is disabled", () => {
    process.env.AI_PROVIDER = "demo";
    process.env.DEMO_MODE = "false";
    delete process.env.MYSQL_PASSWORD;
    expect(() => loadConfig()).toThrow(/MYSQL_PASSWORD/i);
  });

  it("requires an explicit strong JWT secret outside demo persistence", () => {
    process.env.AI_PROVIDER = "demo";
    process.env.DEMO_MODE = "false";
    process.env.MYSQL_PASSWORD = "database-password";
    delete process.env.JWT_SECRET;
    expect(() => loadConfig()).toThrow(/JWT_SECRET/i);
  });
});
