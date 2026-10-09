import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { MemoryRepository } from "../src/repositories/memory.js";

const config = {
  jwtSecret: "test-secret-with-enough-length",
  demoMode: true,
  aiProvider: "demo",
  clientOrigin: "http://localhost:5173"
};

async function register(app, repository, suffix, role = "user") {
  const response = await request(app).post("/api/auth/register").send({
    name: `${role} Student`,
    email: `${suffix}@nuogo.test`,
    password: "Nuogo123!"
  });
  await repository.setUserRole(response.body.user.id, role);
  return response.body.token;
}

const poi = {
  id: "poi-singapore-palace",
  destinationId: "singapore",
  name: { en: "Palace Museum", zh: "故宫博物院" },
  category: "ATTRACTION",
  coordinates: { latitude: 1.2903, longitude: 103.8514 },
  address: { en: "4 Jingshan Front Street", zh: "景山前街4号" },
  status: "ACTIVE",
  sources: [{
    provider: "AMAP",
    sourceId: "B000A8UIN8",
    sourceUrl: "https://www.amap.com/place/B000A8UIN8",
    retrievedAt: "2026-08-14T00:00:00.000Z"
  }]
};

const costReference = {
  id: "cost-singapore-food",
  city: "singapore",
  category: "FOOD_PERSON_DAY",
  tier: "BALANCED",
  minMinor: 3000,
  maxMinor: 4000,
  representativeMinor: 3500,
  currency: "SGD",
  sourceName: "University travel survey",
  sourceUrl: "https://example.edu/travel-costs",
  collectedOn: "2026-08-14",
  updatedAt: "2026-08-14T12:00:00.000Z",
  status: "ACTIVE"
};

const operatingHour = {
  id: "hours-gallery-saturday",
  poiId: "poi-singapore-palace",
  dayOfWeek: 6,
  opensAt: "10:00",
  closesAt: "19:00",
  isClosed: false,
  sourceName: "Official gallery hours",
  sourceUrl: "https://example.edu/gallery-hours",
  sourceType: "OFFICIAL",
  lastReviewedDate: "2026-09-27",
  verificationStatus: "VERIFIED",
  status: "ACTIVE",
  notes: "Pilot source-backed weekly hours."
};

const operatingHourException = {
  id: "hours-gallery-christmas",
  poiId: "poi-singapore-palace",
  exceptionDate: "2026-12-25",
  opensAt: null,
  closesAt: null,
  isClosed: true,
  reason: "Christmas closure",
  sourceName: "Official gallery hours",
  sourceUrl: "https://example.edu/gallery-hours",
  sourceType: "OFFICIAL",
  lastReviewedDate: "2026-09-27",
  verificationStatus: "VERIFIED",
  status: "ACTIVE",
  notes: "Pilot source-backed exception."
};

describe("administration API", () => {
  let app;
  let repository;
  let adminToken;

  beforeEach(async () => {
    repository = new MemoryRepository();
    app = createApp({
      repository,
      planProvider: {},
      attractionCatalogue: { listApproved: () => [] },
      config
    });
    adminToken = await register(app, repository, "admin", "admin");
  });

  it("requires authentication and the admin role", async () => {
    await request(app).get("/api/admin/destinations").expect(401);
    const userToken = await register(app, repository, "ordinary");
    const denied = await request(app).get("/api/admin/destinations")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(403);
    expect(denied.body.error.code).toBe("ADMIN_REQUIRED");
  });

  it("lists destinations and updates lifecycle status", async () => {
    const listed = await request(app).get("/api/admin/destinations")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(listed.body.destinations.map(({ id }) => id)).toEqual(["singapore"]);

    await request(app).patch("/api/admin/destinations/singapore")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "OUTDATED" })
      .expect(200, { destination: { id: "singapore", status: "OUTDATED" } });
    await request(app).patch("/api/admin/destinations/singapore")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "deleted" })
      .expect(400);
  });

  it("creates, lists, updates, and retires canonical POI metadata", async () => {
    await request(app).put(`/api/admin/pois/${poi.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(poi)
      .expect(200);
    const listed = await request(app).get("/api/admin/pois?destinationId=singapore")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(listed.body.pois).toEqual([poi]);

    await request(app).put(`/api/admin/pois/${poi.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...poi, status: "OUTDATED" })
      .expect(200);
    const retired = await request(app).delete(`/api/admin/pois/${poi.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(retired.body.poi.status).toBe("UNAVAILABLE");
  });

  it("rejects POIs with invalid source metadata or coordinates", async () => {
    await request(app).put(`/api/admin/pois/${poi.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...poi, coordinates: { latitude: 70, longitude: 116 }, sources: [] })
      .expect(400);
    await request(app).put(`/api/admin/pois/${poi.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...poi, sources: [{ ...poi.sources[0], sourceUrl: "http://insecure.test" }] })
      .expect(400);
  });

  it("creates, lists, updates, and retires evidenced cost references", async () => {
    await request(app).put(`/api/admin/cost-references/${costReference.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(costReference)
      .expect(200);
    const listed = await request(app).get("/api/admin/cost-references?city=singapore")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(listed.body.costReferences).toEqual([costReference]);

    await request(app).put(`/api/admin/cost-references/${costReference.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...costReference, maxMinor: 4500, representativeMinor: 4200 })
      .expect(200);
    const retired = await request(app).delete(`/api/admin/cost-references/${costReference.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(retired.body.costReference.status).toBe("UNAVAILABLE");
  });

  it("accepts and returns null tiers for untiered cost references", async () => {
    const untiered = {
      ...costReference,
      id: "cost-singapore-entry",
      category: "ATTRACTION_PERSON_ENTRY",
      tier: null,
      sourceName: "  University entry survey  "
    };
    const persisted = { ...untiered, sourceName: "University entry survey" };
    await request(app).put(`/api/admin/cost-references/${untiered.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(untiered)
      .expect(200, { costReference: persisted });

    const listed = await request(app).get("/api/admin/cost-references?city=singapore")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(listed.body.costReferences).toEqual([persisted]);
  });

  it("maintains source-backed POI-specific attraction price references", async () => {
    const sourceBackedReference = {
      ...costReference,
      id: "sg-poi-singapore-zoo-exact",
      city: "singapore",
      destinationId: "singapore",
      poiId: "demo-sg-singapore-zoo",
      category: "ATTRACTION_PERSON_ENTRY",
      tier: null,
      minMinor: 4900,
      representativeMinor: 4900,
      maxMinor: 4900,
      referenceType: "EXACT",
      unitType: "PER_PERSON_ENTRY",
      priceBasis: "Non-Resident Adult",
      sourceType: "OFFICIAL",
      sourceName: "Mandai Wildlife Reserve",
      sourceUrl: "https://www.mandai.com/en/tickets-and-passes/single-attractions/singapore-zoo.html",
      lastReviewedDate: "2026-09-24",
      notes: "Planning price reference, not a guaranteed live ticket price."
    };

    await request(app).put(`/api/admin/cost-references/${sourceBackedReference.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(sourceBackedReference)
      .expect(200, { costReference: sourceBackedReference });

    const listed = await request(app).get("/api/admin/cost-references?city=singapore")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(listed.body.costReferences).toEqual([sourceBackedReference]);

    const reviewedReference = {
      ...sourceBackedReference,
      representativeMinor: 5200,
      minMinor: 5200,
      maxMinor: 5200,
      priceBasis: "Non-Resident Adult, reviewed planning reference",
      sourceType: "OFFICIAL",
      lastReviewedDate: "2026-09-27",
      notes: "Reviewed by the system administrator."
    };
    await request(app).put(`/api/admin/cost-references/${reviewedReference.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(reviewedReference)
      .expect(200, { costReference: reviewedReference });

    const reloaded = await request(app).get("/api/admin/cost-references?city=singapore")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(reloaded.body.costReferences).toEqual([reviewedReference]);
  });

  it("does not let normal travellers modify source-backed cost references", async () => {
    const userToken = await register(app, repository, "price-maintenance-user");

    await request(app).put(`/api/admin/cost-references/${costReference.id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send(costReference)
      .expect(403);
  });

  it("maintains source-backed POI operating hours and exceptions", async () => {
    await repository.upsertCanonicalPoi(poi);

    await request(app).put(`/api/admin/poi-operating-hours/${operatingHour.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(operatingHour)
      .expect(200, { operatingHour });
    await request(app).put(`/api/admin/poi-operating-hour-exceptions/${operatingHourException.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(operatingHourException)
      .expect(200, { operatingHourException });

    const listed = await request(app).get("/api/admin/poi-operating-hours?destinationId=singapore")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(listed.body).toEqual({
      operatingHours: [operatingHour],
      operatingHourExceptions: [operatingHourException],
      coverage: {
        canonicalPoiCount: 1,
        activeOperatingHoursPoiCount: 1,
        activeOperatingHoursPoiPercentage: 100
      }
    });

    const reviewed = { ...operatingHour, closesAt: "18:00", lastReviewedDate: "2026-10-01" };
    await request(app).put(`/api/admin/poi-operating-hours/${operatingHour.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(reviewed)
      .expect(200, { operatingHour: reviewed });

    await request(app).delete(`/api/admin/poi-operating-hour-exceptions/${operatingHourException.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200, {
        operatingHourException: { ...operatingHourException, status: "UNAVAILABLE" }
      });
  });

  it("preserves operating-hour date-only fields through the admin API", async () => {
    await repository.upsertCanonicalPoi(poi);
    const reviewedHour = {
      ...operatingHour,
      id: "hours-gallery-date-only",
      lastReviewedDate: "2026-09-28"
    };
    const reviewedException = {
      ...operatingHourException,
      id: "hours-gallery-exception-date-only",
      exceptionDate: "2026-09-28",
      lastReviewedDate: "2026-09-28"
    };

    await request(app).put(`/api/admin/poi-operating-hours/${reviewedHour.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(reviewedHour)
      .expect(200, { operatingHour: reviewedHour });
    await request(app).put(`/api/admin/poi-operating-hour-exceptions/${reviewedException.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(reviewedException)
      .expect(200, { operatingHourException: reviewedException });

    const listed = await request(app).get("/api/admin/poi-operating-hours?destinationId=singapore")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(listed.body.operatingHours).toContainEqual(reviewedHour);
    expect(listed.body.operatingHourExceptions).toContainEqual(reviewedException);
  });

  it("lets admins verify pending operating-hour records and excludes pending records from coverage", async () => {
    await repository.upsertCanonicalPoi(poi);
    const pending = {
      ...operatingHour,
      verificationStatus: "PENDING_REVIEW"
    };

    await request(app).put(`/api/admin/poi-operating-hours/${pending.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(pending)
      .expect(200, { operatingHour: pending });

    const pendingCoverage = await request(app).get("/api/admin/poi-operating-hours?destinationId=singapore")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(pendingCoverage.body.coverage).toEqual({
      canonicalPoiCount: 1,
      activeOperatingHoursPoiCount: 0,
      activeOperatingHoursPoiPercentage: 0
    });

    const verified = await request(app).patch(`/api/admin/poi-operating-hours/${pending.id}/verification`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ verificationStatus: "VERIFIED" })
      .expect(200);
    expect(verified.body.operatingHour).toMatchObject({
      id: pending.id,
      verificationStatus: "VERIFIED",
      verifiedByUserId: expect.any(String)
    });
    expect(verified.body.operatingHour.verifiedAt).toEqual(expect.any(String));

    const verifiedCoverage = await request(app).get("/api/admin/poi-operating-hours?destinationId=singapore")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(verifiedCoverage.body.coverage.activeOperatingHoursPoiCount).toBe(1);
  });

  it("does not let normal travellers modify POI operating hours", async () => {
    const userToken = await register(app, repository, "hours-maintenance-user");

    await request(app).put(`/api/admin/poi-operating-hours/${operatingHour.id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send(operatingHour)
      .expect(403);
    await request(app).put(`/api/admin/poi-operating-hour-exceptions/${operatingHourException.id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send(operatingHourException)
      .expect(403);
    await request(app).delete(`/api/admin/poi-operating-hour-exceptions/${operatingHourException.id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .expect(403);
    await request(app).patch(`/api/admin/poi-operating-hours/${operatingHour.id}/verification`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ verificationStatus: "VERIFIED" })
      .expect(403);
  });

  it("accepts public transport fare-band cost references", async () => {
    const fareBand = {
      ...costReference,
      id: "cost-singapore-public-transport-km-0-32",
      category: "PUBLIC_TRANSPORT_DISTANCE_FARE",
      tier: "KM_0_32",
      minMinor: 109,
      maxMinor: 109,
      representativeMinor: 109,
      sourceName: "Public Transport Council fare table",
      sourceUrl: "https://www.ptc.gov.sg/fare-regulation/bus-rail/fare-structure"
    };
    await request(app).put(`/api/admin/cost-references/${fareBand.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(fareBand)
      .expect(200, { costReference: fareBand });
  });

  it("rejects incoherent ranges, tiers, statuses, and missing evidence", async () => {
    await request(app).put(`/api/admin/cost-references/${costReference.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...costReference, representativeMinor: 5000 })
      .expect(400);
    await request(app).put(`/api/admin/cost-references/${costReference.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...costReference, sourceUrl: undefined })
      .expect(400);
    await request(app).put(`/api/admin/cost-references/${costReference.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...costReference, status: "DRAFT" })
      .expect(400);
    await request(app).put(`/api/admin/cost-references/${costReference.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...costReference, tier: "LUXURY" })
      .expect(400);
    await request(app).put(`/api/admin/cost-references/${costReference.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...costReference, amountFen: 3500 })
      .expect(400);
    await request(app).put(`/api/admin/cost-references/${costReference.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...costReference, sourceName: "   " })
      .expect(400);
  });

  it("does not expose user, system-record, or separate provider-cache maintenance", async () => {
    for (const path of ["/api/admin/users", "/api/admin/system-records", "/api/admin/provider-records?destinationId=singapore"]) {
      await request(app).get(path)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    }
  });
});
