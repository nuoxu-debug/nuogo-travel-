import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { ExternalServiceTimeoutError } from "../src/errors.js";
import { DemoPlanProvider } from "../src/providers/demoProvider.js";
import { MemoryRepository } from "../src/repositories/memory.js";
import { validPreferences } from "./helpers.js";

describe("Nuogo REST API", () => {
  let app;

  beforeEach(() => {
    app = createApp({
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
  });

  it("registers, authenticates, and exposes mainland-China metadata", async () => {
    const register = await request(app).post("/api/auth/register").send({
      name: "Demo Student",
      email: "student@nuogo.test",
      password: "Nuogo123!"
    }).expect(201);

    expect(register.body.user.email).toBe("student@nuogo.test");
    expect(register.body.token).toBeTypeOf("string");

    await request(app).get("/api/auth/me")
      .set("Authorization", `Bearer ${register.body.token}`)
      .expect(200, { user: register.body.user });

    const meta = await request(app).get("/api/meta/china").expect(200);
    expect(meta.body.cities.every((city) => city.countryCode === "CN")).toBe(true);
    expect(meta.body.aiProvider).toBe("demo");
  });

  it("creates a separate guest identity for each demo session", async () => {
    const first = await request(app)
      .post("/api/auth/guest")
      .expect(200);

    expect(first.body.user.name).toBe("Nuogo Guest");
    expect(first.body.user.email).toMatch(/^guest\+[0-9a-f-]+@nuogo\.local$/);
    expect(first.body.token).toBeTypeOf("string");

    const second = await request(app)
      .post("/api/auth/guest")
      .expect(200);

    expect(second.body.user.id).not.toBe(first.body.user.id);
    expect(second.body.user.email).not.toBe(first.body.user.email);
  });

  it("disables guest authentication outside demo mode", async () => {
    app = createApp({
      repository: new MemoryRepository(),
      planProvider: new DemoPlanProvider(),
      attractionCatalogue: { listApproved: () => [] },
      config: {
        jwtSecret: "test-secret-with-enough-length",
        demoMode: false,
        aiProvider: "demo",
        clientOrigin: "http://localhost:5173"
      }
    });

    const response = await request(app)
      .post("/api/auth/guest")
      .expect(404);

    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("generates three grounded Huangshan variants from approved attractions", async () => {
    const attractions = Array.from({ length: 6 }, (_, index) => ({
      id: `approved-${index}`,
      externalId: `poi-${index}`,
      nameZh: `黄山景点${index}`,
      nameEn: `Huangshan attraction ${index}`,
      locationLabel: "Huangshan Scenic Area",
      longitude: null,
      latitude: null,
      ticketPriceMin: 20,
      category: "natural_scenery",
      sourceProvider: "Mafengwo",
      sourceUrl: `https://m.mafengwo.cn/poi/${index}.html`
    }));
    app = createApp({
      repository: new MemoryRepository(),
      planProvider: new DemoPlanProvider(),
      attractionCatalogue: { listApproved: () => attractions },
      config: {
        jwtSecret: "test-secret-with-enough-length",
        demoMode: true,
        aiProvider: "demo",
        clientOrigin: "http://localhost:5173"
      }
    });
    const register = await request(app).post("/api/auth/register").send({
      name: "Anhui Student",
      email: "anhui@nuogo.test",
      password: "Nuogo123!"
    }).expect(201);
    const generated = await request(app)
      .post("/api/trips/generate")
      .set("Authorization", `Bearer ${register.body.token}`)
      .send(validPreferences({ destination: "huangshan", days: 2 }))
      .expect(201);

    const allowed = new Set(attractions.map((item) => item.id));
    const activities = generated.body.variants.flatMap((variant) =>
      variant.days.flatMap((day) => day.activities)
    );
    expect(generated.body.variants).toHaveLength(3);
    expect(generated.body.variants.every((variant) => !variant.isFallback)).toBe(true);
    expect(activities.length).toBeGreaterThan(0);
    const sourcedActivities = activities.filter((activity) => activity.sourceAttractionId);
    expect(sourcedActivities.every((activity) => allowed.has(activity.sourceAttractionId))).toBe(true);
    expect(activities.some((activity) => activity.category === "local_street_food")).toBe(true);
    expect(activities.some((activity) => activity.category === "budget_hotels")).toBe(true);

    const firstVariant = generated.body.variants[0];
    const firstDay = firstVariant.days[0];
    const regeneratedActivity = await request(app)
      .post(`/api/activities/${firstDay.activities[0].id}/regenerate`)
      .set("Authorization", `Bearer ${register.body.token}`)
      .send({ expectedRevision: 0 })
      .expect(200);
    expect(regeneratedActivity.body.revision).toBe(1);
    expect(allowed.has(regeneratedActivity.body.activity.sourceAttractionId)).toBe(true);

    const costOnlyEdit = await request(app)
      .patch(`/api/activities/${firstDay.activities[0].id}`)
      .set("Authorization", `Bearer ${register.body.token}`)
      .send({
        ...regeneratedActivity.body.activity,
        expectedRevision: 1,
        estimatedCost: regeneratedActivity.body.activity.estimatedCost + 5
      })
      .expect(200);
    expect(costOnlyEdit.body.revision).toBe(2);
    expect(allowed.has(costOnlyEdit.body.activity.sourceAttractionId)).toBe(true);

    const editedActivity = await request(app)
      .patch(`/api/activities/${firstDay.activities[0].id}`)
      .set("Authorization", `Bearer ${register.body.token}`)
      .send({
        ...costOnlyEdit.body.activity,
        expectedRevision: 2,
        name: { en: "Student-custom stop", zh: "学生自定义景点" }
      })
      .expect(200);
    expect(editedActivity.body.revision).toBe(3);
    expect(editedActivity.body.activity.sourceAttractionId).toBeUndefined();
    expect(editedActivity.body.activity.sourceUrl).toBeUndefined();

    const regeneratedDay = await request(app)
      .post(`/api/trips/${generated.body.trip.id}/days/${firstDay.id}/regenerate`)
      .set("Authorization", `Bearer ${register.body.token}`)
      .send({ expectedRevision: 3 })
      .expect(200);
    expect(regeneratedDay.body.revision).toBe(4);
    expect(regeneratedDay.body.day.activities
      .filter((activity) => activity.sourceAttractionId)
      .every((activity) =>
      allowed.has(activity.sourceAttractionId)
    )).toBe(true);
  });

  it("rejects Huangshan generation when no attractions are approved", async () => {
    const register = await request(app).post("/api/auth/register").send({
      name: "Empty Catalogue",
      email: "empty@nuogo.test",
      password: "Nuogo123!"
    }).expect(201);
    const response = await request(app)
      .post("/api/trips/generate")
      .set("Authorization", `Bearer ${register.body.token}`)
      .send(validPreferences({ destination: "huangshan" }))
      .expect(422);

    expect(response.body.error.code).toBe("ATTRACTION_CATALOGUE_EMPTY");
  });

  it("runs the protected trip, activity, budget, share, vote, and favorite workflow", async () => {
    const register = await request(app).post("/api/auth/register").send({
      name: "Nuogo Student",
      email: "workflow@nuogo.test",
      password: "Nuogo123!"
    }).expect(201);
    const auth = { Authorization: `Bearer ${register.body.token}` };

    const validated = await request(app)
      .post("/api/preferences/validate")
      .set(auth)
      .send(validPreferences())
      .expect(200);
    expect(validated.headers.deprecation).toBe("true");
    expect(validated.body.dailyBudget).toBe(1200);

    const generated = await request(app)
      .post("/api/trips/generate")
      .set(auth)
      .send(validPreferences())
      .expect(201);
    expect(generated.body.variants).toHaveLength(3);

    const tripId = generated.body.trip.id;
    const variant = generated.body.variants[0];
    await request(app)
      .post(`/api/trips/${tripId}/select-variant`)
      .set(auth)
      .send({ variantId: variant.id, expectedRevision: 0 })
      .expect(200);

    const day = variant.days[0];
    const activity = day.activities[0];
    const updated = await request(app)
      .patch(`/api/activities/${activity.id}`)
      .set(auth)
      .send({ expectedRevision: 1, estimatedCost: 18 })
      .expect(200);
    expect(updated.body.revision).toBe(2);
    expect(updated.body.activity.estimatedCost).toBe(18);
    expect(updated.body.budget.total).toBeGreaterThanOrEqual(18);

    const added = await request(app)
      .post(`/api/trips/${tripId}/days/${day.id}/activities`)
      .set(auth)
      .send({
        ...activity,
        expectedRevision: 2,
        id: undefined,
        name: { en: "Student-made stop", zh: "学生自定义行程点" }
      })
      .expect(201);
    expect(added.body.revision).toBe(3);

    await request(app)
      .patch(`/api/trips/${tripId}/days/${day.id}/reorder`)
      .set(auth)
      .send({
        expectedRevision: 3,
        activityIds: [added.body.activity.id, ...day.activities.map((item) => item.id)]
      })
      .expect(200);

    const cheaper = await request(app)
      .post(`/api/activities/${activity.id}/cheaper-alternative`)
      .set(auth)
      .send({ expectedRevision: 4 })
      .expect(200);
    expect(cheaper.body.revision).toBe(5);
    expect(cheaper.body.activity.estimatedCost).toBeLessThanOrEqual(18);

    await request(app)
      .post("/api/favorites")
      .set(auth)
      .send({ activityId: activity.id })
      .expect(201);
    const favorites = await request(app).get("/api/favorites").set(auth).expect(200);
    expect(favorites.body.favorites).toHaveLength(1);

    const share = await request(app)
      .post(`/api/trips/${tripId}/shares`)
      .set(auth)
      .send({ permission: "edit" })
      .expect(201);
    expect(share.body.url).toContain("/shared/");

    const shared = await request(app)
      .get(`/api/shared/${share.body.token}`)
      .expect(200);
    expect(shared.body.permission).toBe("edit");

    const vote = await request(app)
      .post(`/api/shared/${share.body.token}/votes`)
      .set(auth)
      .send({ activityId: activity.id })
      .expect(200);
    expect(vote.body.votes).toBe(1);

    const duplicate = await request(app)
      .post(`/api/trips/${tripId}/duplicate`)
      .set(auth)
      .expect(201);
    expect(duplicate.body.trip.id).not.toBe(tripId);

    const archive = await request(app).get("/api/trips").set(auth).expect(200);
    expect(archive.body.trips).toHaveLength(2);
  });

  it("blocks protected routes without a JWT", async () => {
    const response = await request(app).get("/api/trips").expect(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("blocks cross-user trip and activity access", async () => {
    const owner = await request(app).post("/api/auth/register").send({
      name: "Trip Owner",
      email: "owner@nuogo.test",
      password: "Nuogo123!"
    }).expect(201);
    const intruder = await request(app).post("/api/auth/register").send({
      name: "Other User",
      email: "other@nuogo.test",
      password: "Nuogo123!"
    }).expect(201);
    const ownerAuth = { Authorization: `Bearer ${owner.body.token}` };
    const intruderAuth = { Authorization: `Bearer ${intruder.body.token}` };

    const generated = await request(app)
      .post("/api/trips/generate")
      .set(ownerAuth)
      .send(validPreferences())
      .expect(201);
    const tripId = generated.body.trip.id;
    const activity = generated.body.variants[0].days[0].activities[0];

    await request(app).get(`/api/trips/${tripId}`).set(intruderAuth).expect(403);
    await request(app)
      .patch(`/api/activities/${activity.id}`)
      .set(intruderAuth)
      .send({ expectedRevision: 0, estimatedCost: activity.estimatedCost + 10 })
      .expect(403);
    await request(app)
      .delete(`/api/activities/${activity.id}`)
      .set(intruderAuth)
      .send({ expectedRevision: 0 })
      .expect(403);
  });

  it("redirects an approved attraction image without authentication", async () => {
    app = createApp({
      repository: new MemoryRepository(),
      planProvider: new DemoPlanProvider(),
      attractionCatalogue: { listApproved: () => [] },
      attractionMediaService: {
        getMedia: () => ({
          state: "remote",
          sourceUrl: "https://p1-q.mafengwo.net/huangshan.jpeg"
        })
      },
      config: {
        jwtSecret: "test-secret-with-enough-length",
        demoMode: true,
        aiProvider: "demo",
        clientOrigin: "http://localhost:5173"
      }
    });

    await request(app)
      .get("/api/attractions/approved-1/image")
      .expect(302)
      .expect("location", "https://p1-q.mafengwo.net/huangshan.jpeg");
  });

  it("maps typed server errors without exposing stack traces", async () => {
    app = createApp({
      repository: new MemoryRepository(),
      planProvider: new DemoPlanProvider(),
      attractionCatalogue: { listApproved: () => [] },
      attractionMediaService: {
        getMedia: () => {
          throw new ExternalServiceTimeoutError("Image provider timed out.", {
            code: "ATTRACTION_IMAGE_TIMEOUT"
          });
        }
      },
      config: {
        jwtSecret: "test-secret-with-enough-length",
        demoMode: true,
        aiProvider: "demo",
        clientOrigin: "http://localhost:5173"
      }
    });

    const response = await request(app)
      .get("/api/attractions/slow-image/image")
      .expect(504);

    expect(response.body.error).toEqual({
      code: "ATTRACTION_IMAGE_TIMEOUT",
      message: "Image provider timed out."
    });
    expect(JSON.stringify(response.body)).not.toContain("stack");
  });
});
