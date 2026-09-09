import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { DemoPlanProvider } from "../src/providers/demoProvider.js";
import { MemoryRepository } from "../src/repositories/memory.js";

describe("assessed MVP scope", () => {
  it("does not mount removed legacy APIs in any runtime mode", async () => {
    const app = createApp({
      repository: new MemoryRepository(),
      planProvider: new DemoPlanProvider(),
      attractionCatalogue: { listApproved: () => [] },
      config: {
        jwtSecret: "test-secret-with-enough-length",
        demoMode: true,
        aiProvider: "demo",
        clientOrigin: "http://localhost:5173"
      }
    });

    const paths = [
      "/api/shared/legacy-token",
      "/api/trips/legacy-trip/invitations",
      "/api/trips/legacy-trip/members",
      "/api/trips/legacy-trip/expenses",
      "/api/favorites",
      "/api/attractions/legacy-attraction/image",
      "/api/destinations"
    ];
    const session = await request(app).post("/api/auth/guest").expect(200);
    for (const path of paths) {
      const response = await request(app).get(path)
        .set("Authorization", `Bearer ${session.body.token}`)
        .expect(404);
      expect(response.body.error).toEqual({ code: "NOT_FOUND", message: "Route was not found." });
    }
  });
});
