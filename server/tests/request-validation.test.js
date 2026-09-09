import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { MemoryRepository } from "../src/repositories/memory.js";

function app() {
  return createApp({
    repository: new MemoryRepository(),
    planProvider: {},
    objectivePlanner: async () => ({ state: "FAILED", validation: { valid: false, issues: [] } }),
    config: {
      jwtSecret: "test-secret-with-enough-length",
      demoMode: true,
      aiProvider: "demo",
      enableLegacyFeatures: false,
      clientOrigin: "http://localhost:5173"
    }
  });
}

describe("Express request validation boundaries", () => {
  it("returns stable field errors for invalid registration input", async () => {
    const response = await request(app()).post("/api/auth/register").send({
      name: " ",
      email: "not-an-email",
      password: "short"
    }).expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "name" }),
      expect.objectContaining({ field: "email" }),
      expect.objectContaining({ field: "password" })
    ]));
  });

  it("rejects invalid planner fields before calling the objective planner", async () => {
    const application = app();
    const response = await request(application).post("/api/auth/register").send({
      name: "Validation User",
      email: "validation@nuogo.test",
      password: "Nuogo123!"
    });
    const generated = await request(application).post("/api/trips/generate")
      .set("Authorization", `Bearer ${response.body.token}`)
      .send({ destination: "guangzhou", travellerCount: -1, budgetMinor: -100 })
      .expect(400);

    expect(generated.body.error.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "destination" }),
      expect.objectContaining({ field: "travellerCount" }),
      expect.objectContaining({ field: "budgetMinor" }),
      expect.objectContaining({ field: "travelStyle" }),
      expect.objectContaining({ field: "rainyDayBackupEnabled" })
    ]));
  });

  it("accepts the structured automatic attraction-selection contract", async () => {
    const application = app();
    const auth = await request(application).post("/api/auth/register").send({
      name: "Structured Preference User",
      email: "structured-preferences@nuogo.test",
      password: "Nuogo123!"
    });

    const generated = await request(application).post("/api/trips/generate")
      .set("Authorization", `Bearer ${auth.body.token}`)
      .send({
        destination: "singapore",
        startDate: "2026-10-10",
        endDate: "2026-10-11",
        travellerCount: 2,
        budgetMinor: 6000,
        currency: "SGD",
        interests: ["HISTORY", "FOOD"],
        preferredSights: [],
        attractionSelectionMode: "AUTO",
        selectedAttractions: [],
        travelStyle: "BALANCED",
        rainyDayBackupEnabled: true,
        otherPreferences: "",
        language: "en",
        consentToLlmProcessing: true
      })
      .expect(422);

    expect(generated.body.error.code).toBe("GENERATION_CONSTRAINTS_UNSATISFIED");
  });
});
