import { describe, expect, it } from "vitest";
import { DemoPlanProvider, optimizeRoute } from "../src/providers/demoProvider.js";
import { generateThreePlans } from "../src/services/generator.js";
import { validPreferences, validVariant, validVisitDetails } from "./helpers.js";

describe("parallel itinerary generation", () => {
  it("starts budget, food, and leisure variants without sequential waits", async () => {
    const calls = [];
    const provider = {
      generate: async (_preferences, style) => {
        calls.push(style);
        await Promise.resolve();
        return JSON.stringify(validVariant({
          id: `variant-${style}`,
          style,
          pace: style === "leisure" ? "slow" : style === "budget" ? "active" : "balanced"
        }));
      }
    };

    const result = await generateThreePlans(validPreferences(), provider);
    expect(calls.sort()).toEqual(["budget", "food", "leisure"]);
    expect(result.variants).toHaveLength(3);
    expect(result.variants.map((item) => item.style).sort()).toEqual(["budget", "food", "leisure"]);
  });

  it("returns an editable fallback only for a repeatedly failed style", async () => {
    const attempts = { budget: 0, food: 0, leisure: 0 };
    const provider = {
      generate: async (_preferences, style) => {
        attempts[style] += 1;
        if (style === "food") {
          return "not-json";
        }
        return JSON.stringify(validVariant({
          id: `variant-${style}`,
          style,
          pace: style === "leisure" ? "slow" : "active"
        }));
      }
    };

    const result = await generateThreePlans(validPreferences(), provider, { retries: 2 });
    expect(result.variants.find((item) => item.style === "food").isFallback).toBe(true);
    expect(result.variants.filter((item) => !item.isFallback)).toHaveLength(2);
    expect(attempts.food).toBe(2);
  });

  it("grounds all Huangshan variants in the supplied attraction catalogue", async () => {
    const attractions = Array.from({ length: 6 }, (_, index) => ({
      id: `attraction-${index + 1}`,
      externalId: `poi-${index + 1}`,
      nameZh: `黄山景点${index + 1}`,
      nameEn: `Huangshan attraction ${index + 1}`,
      locationLabel: "Huangshan Scenic Area",
      descriptionZh: null,
      descriptionEn: null,
      address: null,
      longitude: index === 0 ? 118.1234 : null,
      latitude: index === 0 ? 30.1234 : null,
      ticketPriceMin: index * 10,
      category: "natural_scenery",
      sourceProvider: "Mafengwo",
      sourceUrl: `https://m.mafengwo.cn/poi/${index + 1}.html`,
      thumbnailUrl: `https://p1-q.mafengwo.net/${index + 1}.jpeg`,
      imageAttribution: "Image source: Mafengwo",
      visitDetails: validVisitDetails()
    }));

    const result = await generateThreePlans(
      validPreferences({ destination: "huangshan", days: 6 }),
      new DemoPlanProvider(),
      { attractions }
    );
    const allowed = new Set(attractions.map((item) => item.id));
    const activities = result.variants.flatMap((variant) =>
      variant.days.flatMap((day) => day.activities)
    );

    expect(result.variants).toHaveLength(3);
    expect(result.variants.every((variant) => !variant.isFallback)).toBe(true);
    expect(activities.length).toBeGreaterThan(0);
    const sourcedActivities = activities.filter((activity) => activity.sourceAttractionId);
    expect(sourcedActivities.every((activity) => allowed.has(activity.sourceAttractionId))).toBe(true);
    expect(sourcedActivities.every((activity) =>
      activity.imageUrl === `/api/attractions/${activity.sourceAttractionId}/image`
    )).toBe(true);
    expect(sourcedActivities.every((activity) =>
      activity.visitDetails?.highlights.en.length === 2
    )).toBe(true);
    const knownLocationActivities = sourcedActivities.filter((activity) =>
      activity.sourceAttractionId === "attraction-1"
    );
    expect(knownLocationActivities.every((activity) =>
      activity.location.longitude === 118.1234 &&
      activity.location.latitude === 30.1234
    )).toBe(true);
  });

  it("creates a different attraction sequence for every demo package", async () => {
    const attractions = Array.from({ length: 8 }, (_, index) => ({
      id: `distinct-attraction-${index + 1}`,
      externalId: `distinct-poi-${index + 1}`,
      nameZh: `黄山景点${index + 1}`,
      nameEn: `Huangshan attraction ${index + 1}`,
      locationLabel: "Huangshan Scenic Area",
      longitude: 118.1 + index * 0.01,
      latitude: 30.1 + index * 0.01,
      ticketPriceMin: 40,
      category: index % 2 === 0 ? "natural_scenery" : "historical_relics",
      sourceProvider: "Mafengwo",
      sourceUrl: `https://m.mafengwo.cn/poi/distinct-${index + 1}.html`
    }));

    const result = await generateThreePlans(
      validPreferences({ destination: "huangshan", days: 3 }),
      new DemoPlanProvider(),
      { attractions }
    );
    const firstDaySequences = result.variants.map((variant) =>
      variant.days[0].activities.map((activity) => activity.sourceAttractionId).join(",")
    );
    const firstStops = result.variants.map((variant) =>
      variant.days[0].activities[0].sourceAttractionId
    );

    expect(new Set(firstDaySequences).size).toBe(3);
    expect(new Set(firstStops).size).toBe(3);
  });

  it("does not repeat a POI across days in the same package", async () => {
    const attractions = Array.from({ length: 10 }, (_, index) => ({
      id: `unique-attraction-${index + 1}`,
      externalId: `unique-poi-${index + 1}`,
      nameZh: `黄山景点${index + 1}`,
      nameEn: `Huangshan attraction ${index + 1}`,
      locationLabel: "Huangshan Scenic Area",
      longitude: 118.1 + index * 0.01,
      latitude: 30.1 + index * 0.01,
      ticketPriceMin: 20 + index * 10,
      category: "natural_scenery",
      sourceProvider: "Mafengwo",
      sourceUrl: `https://m.mafengwo.cn/poi/unique-${index + 1}.html`
    }));

    const result = await generateThreePlans(
      validPreferences({ destination: "huangshan", days: 3 }),
      new DemoPlanProvider(),
      { attractions }
    );

    for (const variant of result.variants) {
      const ids = variant.days.flatMap((day) =>
        day.activities.map((activity) => activity.sourceAttractionId)
      ).filter(Boolean);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("orders route points by the nearest unvisited stop", () => {
    const points = [
      { id: "start", location: { longitude: 118, latitude: 30 } },
      { id: "far", location: { longitude: 118.3, latitude: 30 } },
      { id: "near", location: { longitude: 118.01, latitude: 30 } },
      { id: "middle", location: { longitude: 118.02, latitude: 30 } }
    ];

    expect(optimizeRoute(points).map((point) => point.id)).toEqual([
      "start",
      "near",
      "middle",
      "far"
    ]);
  });

  it("keeps Huangshan days inside nearby travel clusters before optimizing the route", async () => {
    const attractions = [
      {
        id: "tunxi-1",
        externalId: "tunxi-1",
        nameZh: "Tunxi Old Street",
        nameEn: "Tunxi Old Street",
        locationLabel: "Tunxi",
        longitude: 118.3009,
        latitude: 29.7106,
        ticketPriceMin: 0,
        category: "city_landmarks",
        sourceProvider: "Mafengwo",
        sourceUrl: "https://m.mafengwo.cn/poi/tunxi-1.html"
      },
      {
        id: "tunxi-2",
        externalId: "tunxi-2",
        nameZh: "Liyang Old Street",
        nameEn: "Liyang Old Street",
        locationLabel: "Tunxi",
        longitude: 118.2848,
        latitude: 29.7089,
        ticketPriceMin: 0,
        category: "city_landmarks",
        sourceProvider: "Mafengwo",
        sourceUrl: "https://m.mafengwo.cn/poi/tunxi-2.html"
      },
      {
        id: "village-1",
        externalId: "village-1",
        nameZh: "Hongcun Scenic Area",
        nameEn: "Hongcun Scenic Area",
        locationLabel: "Ancient Villages",
        longitude: 117.9847,
        latitude: 30.0048,
        ticketPriceMin: 104,
        category: "historical_relics",
        sourceProvider: "Mafengwo",
        sourceUrl: "https://m.mafengwo.cn/poi/village-1.html"
      },
      {
        id: "village-2",
        externalId: "village-2",
        nameZh: "Xidi Ancient Village",
        nameEn: "Xidi Ancient Village",
        locationLabel: "Ancient Villages",
        longitude: 117.9944,
        latitude: 29.9024,
        ticketPriceMin: 104,
        category: "historical_relics",
        sourceProvider: "Mafengwo",
        sourceUrl: "https://m.mafengwo.cn/poi/village-2.html"
      },
      {
        id: "mountain-1",
        externalId: "mountain-1",
        nameZh: "Bright Summit",
        nameEn: "Bright Summit",
        locationLabel: "Huangshan Scenic Area",
        longitude: 118.164,
        latitude: 30.1347,
        ticketPriceMin: 190,
        category: "natural_scenery",
        sourceProvider: "Mafengwo",
        sourceUrl: "https://m.mafengwo.cn/poi/mountain-1.html"
      },
      {
        id: "mountain-2",
        externalId: "mountain-2",
        nameZh: "Beginning-to-Believe Peak",
        nameEn: "Beginning-to-Believe Peak",
        locationLabel: "Huangshan Scenic Area",
        longitude: 118.1701,
        latitude: 30.1436,
        ticketPriceMin: 190,
        category: "natural_scenery",
        sourceProvider: "Mafengwo",
        sourceUrl: "https://m.mafengwo.cn/poi/mountain-2.html"
      }
    ];

    const result = await generateThreePlans(
      validPreferences({ destination: "huangshan", days: 3 }),
      new DemoPlanProvider(),
      { attractions }
    );

    for (const variant of result.variants) {
      for (const day of variant.days) {
        const attractionStops = day.activities.filter((activity) => activity.sourceAttractionId);
        const labels = new Set(attractionStops.map((activity) => activity.address.en));
        expect(labels.size).toBeLessThanOrEqual(1);
      }
    }
  });

  it("adds local food and hotel recommendations to Huangshan demo days", async () => {
    const attractions = Array.from({ length: 4 }, (_, index) => ({
      id: `meal-ready-${index + 1}`,
      externalId: `meal-ready-${index + 1}`,
      nameZh: `Huangshan attraction ${index + 1}`,
      nameEn: `Huangshan attraction ${index + 1}`,
      locationLabel: "Huangshan Scenic Area",
      longitude: 118.16 + index * 0.005,
      latitude: 30.12 + index * 0.005,
      ticketPriceMin: 60,
      category: "natural_scenery",
      sourceProvider: "Mafengwo",
      sourceUrl: `https://m.mafengwo.cn/poi/meal-ready-${index + 1}.html`
    }));

    const result = await generateThreePlans(
      validPreferences({ destination: "huangshan", days: 2, accommodation: "budget_hotel" }),
      new DemoPlanProvider(),
      { attractions }
    );

    for (const variant of result.variants) {
      for (const day of variant.days) {
        expect(day.activities.some((activity) =>
          ["local_street_food", "regional_cuisines"].includes(activity.category)
        )).toBe(true);
        expect(day.activities.some((activity) =>
          ["budget_hotels", "boutique_homestays", "family_resorts"].includes(activity.category)
        )).toBe(true);
        expect(["budget_hotels", "boutique_homestays", "family_resorts"]).toContain(
          day.activities[day.activities.length - 1].category
        );
        expect(Number(day.activities[day.activities.length - 1].startTime.slice(0, 2)))
          .toBeGreaterThanOrEqual(18);
        expect(day.activities[day.activities.length - 1].startTime)
          .not.toBe(day.activities[day.activities.length - 2].startTime);
      }
      expect(variant.budget.localFood).toBeGreaterThan(0);
      expect(variant.budget.accommodation).toBeGreaterThan(0);
    }
  });

  it("builds richer Huangshan days without crossing travel clusters", async () => {
    const attractions = [
      {
        id: "tunxi-rich-1",
        externalId: "tunxi-rich-1",
        nameZh: "Tunxi Old Street",
        nameEn: "Tunxi Old Street",
        locationLabel: "Tunxi",
        longitude: 118.3009,
        latitude: 29.7106,
        ticketPriceMin: 0,
        category: "city_landmarks",
        sourceProvider: "Mafengwo",
        sourceUrl: "https://m.mafengwo.cn/poi/tunxi-rich-1.html"
      },
      {
        id: "tunxi-rich-2",
        externalId: "tunxi-rich-2",
        nameZh: "Liyang Old Street",
        nameEn: "Liyang Old Street",
        locationLabel: "Tunxi",
        longitude: 118.2848,
        latitude: 29.7089,
        ticketPriceMin: 0,
        category: "city_landmarks",
        sourceProvider: "Mafengwo",
        sourceUrl: "https://m.mafengwo.cn/poi/tunxi-rich-2.html"
      },
      {
        id: "village-rich-1",
        externalId: "village-rich-1",
        nameZh: "Hongcun Scenic Area",
        nameEn: "Hongcun Scenic Area",
        locationLabel: "Ancient Villages",
        longitude: 117.9847,
        latitude: 30.0048,
        ticketPriceMin: 104,
        category: "historical_relics",
        sourceProvider: "Mafengwo",
        sourceUrl: "https://m.mafengwo.cn/poi/village-rich-1.html"
      },
      {
        id: "village-rich-2",
        externalId: "village-rich-2",
        nameZh: "Xidi Ancient Village",
        nameEn: "Xidi Ancient Village",
        locationLabel: "Ancient Villages",
        longitude: 117.9944,
        latitude: 29.9024,
        ticketPriceMin: 104,
        category: "historical_relics",
        sourceProvider: "Mafengwo",
        sourceUrl: "https://m.mafengwo.cn/poi/village-rich-2.html"
      }
    ];

    const result = await generateThreePlans(
      validPreferences({ destination: "huangshan", days: 2, accommodation: "boutique_homestay" }),
      new DemoPlanProvider(),
      { attractions }
    );

    for (const variant of result.variants) {
      for (const day of variant.days) {
        expect(day.activities.length).toBeGreaterThanOrEqual(4);
        expect(day.activities.some((activity) =>
          ["local_street_food", "regional_cuisines"].includes(activity.category)
        )).toBe(true);
        expect(day.activities.some((activity) =>
          activity.category === "boutique_homestays"
        )).toBe(true);
        expect(day.activities[day.activities.length - 1].category).toBe("boutique_homestays");
        expect(Number(day.activities[day.activities.length - 1].startTime.slice(0, 2)))
          .toBeGreaterThanOrEqual(18);
        expect(day.activities[day.activities.length - 1].startTime)
          .not.toBe(day.activities[day.activities.length - 2].startTime);

        const clusterAddresses = new Set(day.activities.map((activity) => activity.address.en));
        expect(clusterAddresses.size).toBe(1);
      }
    }
  });

  it("adds media and stable route clusters to Huangshan support stops", async () => {
    const attractions = Array.from({ length: 8 }, (_, index) => ({
      id: `media-cluster-${index + 1}`,
      externalId: `media-cluster-${index + 1}`,
      nameZh: `Huangshan attraction ${index + 1}`,
      nameEn: `Huangshan attraction ${index + 1}`,
      locationLabel: index < 2 ? "Tunxi" : index < 4 ? "Shexian Huizhou" : index < 6 ? "Huangshan Scenic Area" : "Ancient Villages",
      longitude: index < 2 ? 118.3009 + index * 0.002 : index < 4 ? 118.428 + index * 0.002 : index < 6 ? 118.164 + index * 0.002 : 117.9847 + index * 0.002,
      latitude: index < 2 ? 29.7106 + index * 0.002 : index < 4 ? 29.867 + index * 0.002 : index < 6 ? 30.1347 + index * 0.002 : 30.0048 + index * 0.002,
      ticketPriceMin: 40,
      category: "natural_scenery",
      sourceProvider: "Mafengwo",
      sourceUrl: `https://m.mafengwo.cn/poi/media-cluster-${index + 1}.html`
    }));

    const result = await generateThreePlans(
      validPreferences({ destination: "huangshan", days: 4 }),
      new DemoPlanProvider(),
      { attractions }
    );
    const firstVariant = result.variants[0];

    expect(firstVariant.days.map((day) => day.activities[0].routeCluster)).toEqual([
      "city",
      "huizhou",
      "mountain",
      "village"
    ]);

    for (const day of firstVariant.days) {
      const clusters = new Set(day.activities.map((activity) => activity.routeCluster));
      expect(clusters.size).toBe(1);

      const supportStops = day.activities.filter((activity) => !activity.sourceAttractionId);
      expect(supportStops.length).toBeGreaterThanOrEqual(2);
      expect(supportStops.every((activity) => activity.imageUrl?.startsWith("https://"))).toBe(true);
      expect(supportStops.every((activity) => activity.imageAttribution?.length > 0)).toBe(true);
    }
  });

  it("keeps a four-day Huangshan trip connected even when one cluster has only support stops", async () => {
    const attractions = [
      ["city-a", "Tunxi Old Street", "Tunxi", 118.3009, 29.7106],
      ["city-b", "Liyang Old Street", "Tunxi", 118.2848, 29.7089],
      ["mountain-a", "Bright Summit", "Huangshan Scenic Area", 118.164, 30.1347],
      ["mountain-b", "West Sea Grand Canyon", "Huangshan Scenic Area", 118.1547, 30.141],
      ["village-a", "Hongcun Scenic Area", "Ancient Villages", 117.9847, 30.0048],
      ["village-b", "Xidi Ancient Village", "Ancient Villages", 117.9944, 29.9024]
    ].map(([id, nameEn, locationLabel, longitude, latitude]) => ({
      id,
      externalId: id,
      nameZh: nameEn,
      nameEn,
      locationLabel,
      longitude,
      latitude,
      ticketPriceMin: 60,
      category: "natural_scenery",
      sourceProvider: "Mafengwo",
      sourceUrl: `https://m.mafengwo.cn/poi/${id}.html`
    }));

    const result = await generateThreePlans(
      validPreferences({ destination: "huangshan", days: 4 }),
      new DemoPlanProvider(),
      { attractions }
    );
    const firstVariant = result.variants[0];

    expect(firstVariant.days.map((day) => day.activities[0].routeCluster)).toEqual([
      "city",
      "huizhou",
      "mountain",
      "village"
    ]);
    expect(firstVariant.days.every((day) => day.activities.length >= 4)).toBe(true);
    expect(firstVariant.days[1].activities.every((activity) => !activity.sourceAttractionId)).toBe(true);
    expect(["local_street_food", "regional_cuisines"]).not.toContain(firstVariant.days[1].activities[0].category);
    expect(["local_street_food", "regional_cuisines"]).toContain(firstVariant.days[1].activities[1].category);
    expect(firstVariant.days[1].activities.at(-1).category).toBe("budget_hotels");
  });

  it("rejects provider output that changes a Huangshan request destination", async () => {
    const attractions = [{
      id: "approved-1",
      nameZh: "迎客松",
      sourceProvider: "Mafengwo",
      sourceUrl: "https://m.mafengwo.cn/poi/approved-1.html"
    }];
    const provider = {
      generate: async () => JSON.stringify(validVariant({ destination: "chengdu" }))
    };
    const result = await generateThreePlans(
      validPreferences({ destination: "huangshan" }),
      provider,
      { attractions, retries: 1 }
    );

    expect(result.variants.every((variant) => variant.isFallback)).toBe(true);
    expect(result.variants[0].generationError).toMatch(/destination/i);
  });
});
