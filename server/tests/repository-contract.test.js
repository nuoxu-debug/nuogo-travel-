import { describe, expect, it, vi } from "vitest";
import { MemoryRepository } from "../src/repositories/memory.js";
import { MySqlRepository } from "../src/repositories/mysql.js";
import { validActivity, validVisitDetails } from "./helpers.js";

const requiredMethods = [
  "createUser", "findUserByEmail", "findUserById", "createTrip", "listTrips",
  "getTrip", "updateTrip", "deleteTrip", "duplicateTrip", "selectVariant",
  "findActivityContext", "findDayContext", "addActivity", "updateActivity",
  "deleteActivity", "reorderDay", "replaceDay", "createShare", "getShare",
  "vote", "listFavorites", "addFavorite", "deleteFavorite"
];

describe("repository adapters", () => {
  it("expose the same controller-facing method contract", () => {
    for (const method of requiredMethods) {
      expect(typeof MemoryRepository.prototype[method]).toBe("function");
      expect(typeof MySqlRepository.prototype[method]).toBe("function");
    }
  });

  it("persists grounded activity provenance through the MySQL adapter", async () => {
    const execute = vi.fn(async () => [{ affectedRows: 1 }]);
    const repository = new MySqlRepository({ execute, query: vi.fn() });
    await repository.insertActivity({ execute }, "day-1", validActivity({
      sourceAttractionId: "approved-1",
      sourceProvider: "Mafengwo",
      sourceUrl: "https://m.mafengwo.cn/poi/approved-1.html",
      imageUrl: "/api/attractions/approved-1/image",
      imageAttribution: "Image source: Mafengwo",
      visitDetails: validVisitDetails(),
      locationIsEstimated: true
    }));

    expect(execute.mock.calls[0][0]).toContain("source_attraction_id");
    expect(execute.mock.calls[0][0]).toContain("location_is_estimated");
    expect(execute.mock.calls[0][0]).toContain("image_url");
    expect(execute.mock.calls[0][0]).toContain("visit_details_json");
    expect(execute.mock.calls[0][1]).toEqual(expect.arrayContaining([
      "approved-1",
      "Mafengwo",
      "https://m.mafengwo.cn/poi/approved-1.html",
      "/api/attractions/approved-1/image",
      "Image source: Mafengwo",
      JSON.stringify(validVisitDetails()),
      1
    ]));
  });

  it("loads a MySQL trip graph with fixed queries instead of nested day queries", async () => {
    const execute = vi.fn(async (sql) => {
      if (sql.includes("FROM trips WHERE id IN")) {
        return [[{
          id: "trip-1",
          ownerId: "user-1",
          status: "draft",
          title_en: "Trip",
          title_zh: "行程",
          destination: "huangshan",
          startDate: "2026-08-10",
          endDate: "2026-08-11",
          totalBudget: 2000,
          selectedVariantId: "variant-1",
          preferences_json: "{}",
          createdAt: "created",
          updatedAt: "updated"
        }]];
      }
      if (sql.includes("FROM itinerary_variants")) {
        return [[{
          id: "variant-1",
          tripId: "trip-1",
          style: "budget",
          title_json: "{}",
          summary_json: "{}",
          pace: "active",
          highlights_json: "[]",
          budget_json: "{}",
          is_fallback: 0
        }]];
      }
      if (sql.includes("FROM trip_days")) {
        return [[
          { id: "day-1", variantId: "variant-1", dayNumber: 1, tripDate: "2026-08-10", title_json: "{}" },
          { id: "day-2", variantId: "variant-1", dayNumber: 2, tripDate: "2026-08-11", title_json: "{}" }
        ]];
      }
      if (sql.includes("FROM activities")) {
        return [[
          {
            id: "activity-1",
            dayId: "day-1",
            sortOrder: 0,
            startTime: "09:00:00",
            endTime: "10:00:00",
            name_json: "{}",
            description_json: "{}",
            category: "natural_scenery",
            address_json: "{}",
            longitude: 118,
            latitude: 30,
            estimatedCost: 20,
            transport_note_json: "{}",
            guide_json: "{}",
            locationIsEstimated: null,
            votes: 0
          }
        ]];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repository = new MySqlRepository({ execute, query: vi.fn() });

    const trip = await repository.getTrip("trip-1");

    expect(trip.variants[0].days).toHaveLength(2);
    expect(trip.variants[0].days[0].activities).toHaveLength(1);
    expect(execute).toHaveBeenCalledTimes(4);
  });
});
