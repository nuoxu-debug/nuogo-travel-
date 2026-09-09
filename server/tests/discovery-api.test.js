import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { MemoryRepository } from "../src/repositories/memory.js";

function appWith(discoverAttractions) {
  return createApp({
    repository: new MemoryRepository(),
    objectivePlanner: vi.fn(),
    discoverAttractions,
    config: {
      jwtSecret: "test-secret-with-enough-length",
      demoMode: true,
      runtimeMode: "demo",
      aiProvider: "demo",
      travelDataProvider: "demo",
      clientOrigin: "http://localhost:5173"
    }
  });
}

const attraction = {
  xid: "otm-bj-forbidden-city",
  destination: "singapore",
  name: { en: "Forbidden City", zh: "故宫博物院" },
  description: { en: "A palace complex.", zh: "皇家宫殿建筑群。" },
  category: "HISTORY",
  suggestedVisitDurationMinutes: 180,
  coordinates: { longitude: 116.397, latitude: 39.918, coordinateSystem: "WGS84" },
  source: {
    provider: "DEMO",
    sourceType: "DEMO",
    retrievedAt: "2026-08-27T00:00:00.000Z",
    matchStatus: "MATCHED",
    verificationStatus: "SUPPORTING_ONLY"
  }
};

describe("destination discovery API", () => {
  it("returns controlled destination content and normalized candidates", async () => {
    const discoverAttractions = vi.fn(async () => [attraction]);
    const response = await request(appWith(discoverAttractions))
      .get("/api/meta/destinations/singapore/attractions")
      .expect(200);
    expect(response.body).toMatchObject({
      destination: "singapore",
      introduction: { zh: expect.any(String) },
      candidateCount: 1,
      providerMode: "demo",
      attractions: [{ xid: "otm-bj-forbidden-city" }]
    });
    expect(discoverAttractions).toHaveBeenCalledWith({ destination: "singapore", signal: expect.any(AbortSignal) });
  });

  it("returns an empty grounded result without invoking planning", async () => {
    const objectivePlanner = vi.fn();
    const app = createApp({
      repository: new MemoryRepository(),
      objectivePlanner,
      discoverAttractions: vi.fn(async () => []),
      config: {
        jwtSecret: "test-secret-with-enough-length",
        demoMode: true,
        runtimeMode: "demo",
        aiProvider: "demo",
        travelDataProvider: "demo",
        clientOrigin: "http://localhost:5173"
      }
    });
    const response = await request(app)
      .get("/api/meta/destinations/singapore/attractions")
      .expect(200);
    expect(response.body).toMatchObject({ candidateCount: 0, attractions: [] });
    expect(objectivePlanner).not.toHaveBeenCalled();
  });

  it.each(["chengdu", "..%2Fadmin"])("rejects unsupported destination %s", async (destination) => {
    await request(appWith(vi.fn()))
      .get(`/api/meta/destinations/${destination}/attractions`)
      .expect(400);
  });

  it("maps provider failures to a safe response", async () => {
    const error = Object.assign(new Error("private upstream detail"), { code: "PROVIDER_UNAVAILABLE" });
    const response = await request(appWith(vi.fn().mockRejectedValue(error)))
      .get("/api/meta/destinations/singapore/attractions")
      .expect(503);
    expect(response.body.error.code).toBe("ATTRACTION_DISCOVERY_UNAVAILABLE");
    expect(JSON.stringify(response.body)).not.toContain("private upstream detail");
  });
});
