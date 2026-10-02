import { describe, expect, it } from "vitest";
import {
  costReferenceRows,
  omittedVariablePriceRows
} from "../../scripts/generateSingaporePilotSeedSql.js";

describe("Singapore pilot seed generator cost semantics", () => {
  it("does not emit cost_references rows for VARIABLE prices under the current fixed-price schema", () => {
    const rows = [
      {
        poi_id: "sg-mbs-skypark",
        price_type: "VARIABLE",
        min_fen: 3500,
        representative_fen: 3900,
        max_fen: 4600,
        currency: "SGD",
        price_source_name: "Marina Bay Sands",
        price_source_url: "https://example.test/skypark",
        last_reviewed: "2026-09-30",
        notes: "Variable published prices."
      },
      {
        poi_id: "sg-singapore-flyer",
        price_type: "FIXED",
        min_fen: 4000,
        representative_fen: 4000,
        max_fen: 4000,
        currency: "SGD",
        price_source_name: "Singapore Flyer",
        price_source_url: "https://example.test/flyer",
        last_reviewed: "2026-09-30",
        notes: "Fixed published price."
      }
    ];

    expect(costReferenceRows(rows)).toEqual([
      expect.objectContaining({
        id: "sg25-cost-sg-singapore-flyer",
        referenceType: "EXACT",
        minFen: 4000,
        representativeFen: 4000,
        maxFen: 4000
      })
    ]);
    expect(omittedVariablePriceRows(rows)).toEqual([
      expect.objectContaining({
        poi_id: "sg-mbs-skypark",
        min_fen: 3500,
        representative_fen: 3900,
        max_fen: 4600
      })
    ]);
  });
});
