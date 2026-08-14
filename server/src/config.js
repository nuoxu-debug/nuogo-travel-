import "dotenv/config";
import { fileURLToPath } from "node:url";

export function loadConfig() {
  const demoMode = process.env.DEMO_MODE !== "false";
  const aiProvider = process.env.AI_PROVIDER || "demo";
  const openRouterTimeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS) || 30000;
  const openRouterStructuredOutput = process.env.OPENROUTER_STRUCTURED_OUTPUT === "true";
  const travelDataProvider = process.env.TRAVEL_DATA_PROVIDER || "demo";
  const travelProviderTimeoutMs = Number(process.env.TRAVEL_PROVIDER_TIMEOUT_MS) || 8000;
  const enableLegacyFeatures = process.env.ENABLE_LEGACY_FEATURES === "true";
  if (!["demo", "openrouter"].includes(aiProvider)) {
    throw new Error("AI_PROVIDER must be either demo or openrouter.");
  }
  if (openRouterTimeoutMs < 1000 || openRouterTimeoutMs > 120000) {
    throw new Error("OPENROUTER_TIMEOUT_MS must be between 1000 and 120000.");
  }
  if (!["demo", "live"].includes(travelDataProvider)) {
    throw new Error("TRAVEL_DATA_PROVIDER must be either demo or live.");
  }
  if (travelProviderTimeoutMs < 1000 || travelProviderTimeoutMs > 30000) {
    throw new Error("TRAVEL_PROVIDER_TIMEOUT_MS must be between 1000 and 30000.");
  }
  if (travelDataProvider === "live" && !process.env.AMAP_WEB_SERVICE_KEY) {
    throw new Error("AMAP_WEB_SERVICE_KEY is required when TRAVEL_DATA_PROVIDER=live.");
  }
  if (travelDataProvider === "live" && !process.env.OPENTRIPMAP_API_KEY) {
    throw new Error("OPENTRIPMAP_API_KEY is required when TRAVEL_DATA_PROVIDER=live.");
  }
  if (aiProvider === "openrouter" && !process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is required when AI_PROVIDER=openrouter.");
  }
  if (!demoMode && !process.env.MYSQL_PASSWORD) {
    throw new Error("MYSQL_PASSWORD is required when DEMO_MODE=false.");
  }
  if (
    !demoMode &&
    (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
  ) {
    throw new Error("JWT_SECRET must be explicitly set to at least 32 characters in live mode.");
  }

  return {
    port: Number(process.env.PORT) || 8787,
    clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    jwtSecret: process.env.JWT_SECRET || "nuogo-demo-secret-change-in-live-mode",
    demoMode,
    aiProvider,
    openRouterKey: process.env.OPENROUTER_API_KEY || "",
    openRouterModel: process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini",
    openRouterTimeoutMs,
    openRouterStructuredOutput,
    travelDataProvider,
    travelProviderTimeoutMs,
    enableLegacyFeatures,
    amapWebServiceKey: process.env.AMAP_WEB_SERVICE_KEY || "",
    openTripMapKey: process.env.OPENTRIPMAP_API_KEY || "",
    attractionDatabasePath: process.env.ATTRACTION_SQLITE_PATH ||
      fileURLToPath(new URL("../../database/local/nuogo-attractions.sqlite", import.meta.url)),
    attractionMediaStoragePath: process.env.ATTRACTION_MEDIA_STORAGE_PATH ||
      fileURLToPath(new URL("../storage/attractions", import.meta.url)),
    mysql: {
      host: process.env.MYSQL_HOST || "127.0.0.1",
      port: Number(process.env.MYSQL_PORT) || 3306,
      database: process.env.MYSQL_DATABASE || "nuogo",
      user: process.env.MYSQL_USER || "nuogo",
      password: process.env.MYSQL_PASSWORD || ""
    }
  };
}
