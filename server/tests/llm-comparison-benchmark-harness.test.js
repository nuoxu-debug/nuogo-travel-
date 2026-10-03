import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildBenchmarkArtifacts,
  createBenchmarkEvidence,
  GEMINI_MODEL_ID,
  DEEPSEEK_MODEL_ID,
  NORMALIZED_BENCHMARK_REQUEST,
  RUNS_CSV_HEADER,
  SUMMARY_CSV_HEADER,
  scanForSecrets
} from "../../scripts/createLlmComparisonEvidence.js";

describe("LLM comparison benchmark evidence harness", () => {
  it("builds reproducible benchmark configuration without secrets or production behavior changes", async () => {
    const artifacts = buildBenchmarkArtifacts({
      timestamp: "2026-10-03T07:00:00.000Z",
      gitHead: "abc1234",
      travelDataProvider: "database",
      outputRoot: "data/benchmarks/llm-comparison"
    });

    expect(artifacts.config.models).toEqual({
      deepseek: DEEPSEEK_MODEL_ID,
      gemini: GEMINI_MODEL_ID
    });
    expect(artifacts.config.aiProvider).toBe("openrouter");
    expect(artifacts.config.travelDataProvider).toBe("database");
    expect(artifacts.config.candidateCount).toBe(25);
    expect(artifacts.config.runsPerModel).toBe(5);
    expect(artifacts.config.onlyChangedVariable).toBe("model ID");
    expect(artifacts.request).toEqual(NORMALIZED_BENCHMARK_REQUEST);
    expect(artifacts.request.dailyAttractionTarget).toBe(6);
    expect(artifacts.filesToCreate).toEqual([
      "benchmark-config.json",
      "benchmark-request.json",
      "README.md",
      "model-comparison-runs.csv",
      "model-comparison-summary.csv",
      "runs/"
    ]);
    expect(artifacts.runsCsv).toBe(`${RUNS_CSV_HEADER}\n`);
    expect(artifacts.summaryCsv).toBe(`${SUMMARY_CSV_HEADER}\n`);
    expect(artifacts.readme).toContain("Do not declare a winner");
    expect(artifacts.readme).toContain(DEEPSEEK_MODEL_ID);
    expect(artifacts.readme).toContain(GEMINI_MODEL_ID);
    expect(artifacts.readme).not.toMatch(/OPENROUTER_API_KEY|JWT_SECRET|DATABASE_URL|ONEMAP_API/i);
  });

  it("writes the prepare-only evidence scaffold and preserves the exact normalized request", async () => {
    const temp = await mkdtemp(join(tmpdir(), "nuogo-llm-evidence-"));
    try {
      const result = await createBenchmarkEvidence({
        outputRoot: temp,
        timestamp: "2026-10-03T07:00:00.000Z",
        gitHead: "abc1234",
        travelDataProvider: "database"
      });

      expect(result.liveRunsExecuted).toBe(false);
      expect(result.createdFiles.map((file) => file.replace(temp, "").replace(/^[/\\]/, "").replaceAll("\\", "/"))).toEqual([
        "benchmark-config.json",
        "benchmark-request.json",
        "README.md",
        "model-comparison-runs.csv",
        "model-comparison-summary.csv"
      ]);

      const savedRequest = JSON.parse(await readFile(join(temp, "benchmark-request.json"), "utf8"));
      expect(savedRequest).toEqual(NORMALIZED_BENCHMARK_REQUEST);
      const savedConfig = JSON.parse(await readFile(join(temp, "benchmark-config.json"), "utf8"));
      expect(savedConfig.liveRunsExecuted).toBe(false);
      expect(savedConfig.productionItineraryLogicModified).toBe(false);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("rejects evidence text containing secret variable names or secret values", () => {
    expect(() => scanForSecrets("OPENROUTER_API_KEY=secret")).toThrow(/secret/i);
    expect(() => scanForSecrets("safe text", { OPENROUTER_API_KEY: "sk-or-test-secret" })).not.toThrow();
    expect(() => scanForSecrets("contains sk-or-test-secret", { OPENROUTER_API_KEY: "sk-or-test-secret" })).toThrow(/secret/i);
  });
});
