import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { MySqlRepository } from "../src/repositories/mysql.js";
import { createRepository } from "../src/runtime/createRepository.js";

const original = {
  AI_PROVIDER: process.env.AI_PROVIDER,
  APP_RUNTIME_MODE: process.env.APP_RUNTIME_MODE,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
  MYSQL_PASSWORD: process.env.MYSQL_PASSWORD,
  JWT_SECRET: process.env.JWT_SECRET,
  OPENROUTER_TIMEOUT_MS: process.env.OPENROUTER_TIMEOUT_MS,
  TRAVEL_DATA_PROVIDER: process.env.TRAVEL_DATA_PROVIDER,
  TRAVEL_PROVIDER_TIMEOUT_MS: process.env.TRAVEL_PROVIDER_TIMEOUT_MS,
  AMAP_WEB_SERVICE_KEY: process.env.AMAP_WEB_SERVICE_KEY,
  OPENTRIPMAP_API_KEY: process.env.OPENTRIPMAP_API_KEY,
  OPENROUTER_STRUCTURED_OUTPUT: process.env.OPENROUTER_STRUCTURED_OUTPUT,
  NODE_ENV: process.env.NODE_ENV,
  DEMO_ADMIN_EMAIL: process.env.DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD: process.env.DEMO_ADMIN_PASSWORD
};

afterEach(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("runtime configuration", () => {
  it("defaults OpenRouter generation to the approved DeepSeek model", () => {
    delete process.env.OPENROUTER_MODEL;
    expect(loadConfig().openRouterModel).toBe("deepseek/deepseek-chat-v3.1");
  });

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
    process.env.APP_RUNTIME_MODE = "demo";
    delete process.env.OPENROUTER_API_KEY;
    expect(loadConfig()).toMatchObject({
      aiProvider: "demo",
      runtimeMode: "demo",
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

  it("enables strict OpenRouter schema mode only when explicitly configured", () => {
    delete process.env.OPENROUTER_STRUCTURED_OUTPUT;
    expect(loadConfig().openRouterStructuredOutput).toBe(false);
    process.env.OPENROUTER_STRUCTURED_OUTPUT = "true";
    expect(loadConfig().openRouterStructuredOutput).toBe(true);
  });

  it("requires MySQL credentials when memory persistence is disabled", () => {
    process.env.AI_PROVIDER = "demo";
    process.env.APP_RUNTIME_MODE = "live";
    delete process.env.MYSQL_PASSWORD;
    expect(() => loadConfig()).toThrow(/MYSQL_PASSWORD/i);
  });

  it("requires an explicit strong JWT secret outside demo persistence", () => {
    process.env.AI_PROVIDER = "demo";
    process.env.APP_RUNTIME_MODE = "live";
    process.env.MYSQL_PASSWORD = "database-password";
    delete process.env.JWT_SECRET;
    expect(() => loadConfig()).toThrow(/JWT_SECRET/i);
  });

  it("exposes optional demo administrator credentials only in demo runtime", () => {
    process.env.APP_RUNTIME_MODE = "demo";
    process.env.DEMO_ADMIN_EMAIL = "admin@nuogo.test";
    process.env.DEMO_ADMIN_PASSWORD = "NuogoAdmin123!";
    expect(loadConfig()).toMatchObject({
      demoAdminEmail: "admin@nuogo.test",
      demoAdminPassword: "NuogoAdmin123!"
    });

    process.env.APP_RUNTIME_MODE = "live";
    process.env.AI_PROVIDER = "demo";
    process.env.TRAVEL_DATA_PROVIDER = "demo";
    process.env.MYSQL_PASSWORD = "database-password";
    process.env.JWT_SECRET = "a".repeat(32);
    expect(loadConfig()).toMatchObject({ demoAdminEmail: "", demoAdminPassword: "" });
  });

  it("rejects an unknown application runtime mode", () => {
    process.env.APP_RUNTIME_MODE = "temporary";
    expect(() => loadConfig()).toThrow(/APP_RUNTIME_MODE/i);
  });

  it("fails normal production startup clearly when MySQL credentials are missing", () => {
    process.env.NODE_ENV = "production";
    delete process.env.APP_RUNTIME_MODE;
    delete process.env.MYSQL_PASSWORD;
    expect(() => loadConfig()).toThrow(/MYSQL_PASSWORD/i);
  });

  it("selects MySQL instead of memory for normal production", async () => {
    process.env.NODE_ENV = "production";
    process.env.APP_RUNTIME_MODE = "live";
    process.env.AI_PROVIDER = "demo";
    process.env.TRAVEL_DATA_PROVIDER = "demo";
    process.env.MYSQL_PASSWORD = "database-password";
    process.env.JWT_SECRET = "a".repeat(32);

    const repository = createRepository(loadConfig());
    expect(repository).toBeInstanceOf(MySqlRepository);
    await repository.pool.end();
  });

  it("uses deterministic travel data by default", () => {
    delete process.env.TRAVEL_DATA_PROVIDER;
    const config = loadConfig();
    expect(config).toMatchObject({
      travelDataProvider: "demo",
      travelProviderTimeoutMs: 8000,
      openTripMapKey: ""
    });
    expect(config).not.toHaveProperty("amapWebServiceKey");
  });

  it("requires only the server-side OpenTripMap key in live travel mode", () => {
    process.env.TRAVEL_DATA_PROVIDER = "live";
    delete process.env.AMAP_WEB_SERVICE_KEY;
    delete process.env.OPENTRIPMAP_API_KEY;
    expect(() => loadConfig()).toThrow(/OPENTRIPMAP_API_KEY/i);

    process.env.OPENTRIPMAP_API_KEY = "test-otm-key";
    expect(loadConfig()).not.toHaveProperty("amapWebServiceKey");
  });

  it("loads bounded live travel provider configuration", () => {
    process.env.TRAVEL_DATA_PROVIDER = "live";
    process.env.OPENTRIPMAP_API_KEY = "test-otm-key";
    process.env.TRAVEL_PROVIDER_TIMEOUT_MS = "12000";
    expect(loadConfig()).toMatchObject({
      travelDataProvider: "live",
      travelProviderTimeoutMs: 12000,
      openTripMapKey: "test-otm-key"
    });
  });
});
