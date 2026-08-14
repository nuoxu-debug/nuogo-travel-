import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { DemoPlanProvider } from "../src/providers/demoProvider.js";
import { MemoryRepository } from "../src/repositories/memory.js";

describe("assessed MVP scope", () => {
  it("does not mount bearer-link sharing when legacy features are disabled", async () => {
    const app = createApp({
      repository: new MemoryRepository(),
      planProvider: new DemoPlanProvider(),
      attractionCatalogue: { listApproved: () => [] },
      config: {
        jwtSecret: "test-secret-with-enough-length",
        demoMode: true,
        aiProvider: "demo",
        clientOrigin: "http://localhost:5173",
        enableLegacyFeatures: false
      }
    });

    const response = await request(app).get("/api/shared/legacy-token").expect(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(response.body.error.message).toBe("Route was not found.");
  });
});
