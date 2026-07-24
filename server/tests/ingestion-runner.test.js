import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { fetchSourcePage } from "../src/ingestion/fetcher.js";
import { AttractionSqliteRepository } from "../src/ingestion/sqliteRepository.js";
import { runIngestion } from "../src/ingestion/runner.js";

const fixture = readFileSync(new URL("./fixtures/mafengwo-catalog.html", import.meta.url), "utf8");
let repository;
let cacheDir;

afterEach(() => {
  repository?.close();
  if (cacheDir) rmSync(cacheDir, { recursive: true, force: true });
  repository = undefined;
  cacheDir = undefined;
});

describe("Anhui ingestion runner", () => {
  it("records one successful job and upserts parsed POIs", async () => {
    repository = new AttractionSqliteRepository(":memory:");
    const requests = [];
    const fetchImpl = async (url) => {
      requests.push(String(url));
      if (String(url).endsWith("/robots.txt")) {
        return new Response("User-agent: *\nDisallow: /po\n", {
          headers: { "content-type": "text/plain" }
        });
      }
      return new Response(fixture, {
        headers: { "content-type": "text/html; charset=UTF-8", etag: "fixture-v1" }
      });
    };

    const result = await runIngestion("huangshan", {
      repository,
      fetchImpl,
      delayMs: 0,
      cache: false
    });

    expect(result).toMatchObject({
      status: "completed",
      itemsFound: 2,
      itemsCreated: 2,
      itemsUpdated: 0
    });
    expect(requests).toHaveLength(2);
    expect(repository.listAttractions({ status: "pending" })).toHaveLength(2);
    expect(repository.listJobs()).toEqual([
      expect.objectContaining({ status: "completed", itemsFound: 2 })
    ]);
  });

  it("fails before fetching content when robots disallows the catalogue path", async () => {
    repository = new AttractionSqliteRepository(":memory:");
    const fetchImpl = async () => new Response("User-agent: *\nDisallow: /gl\n");

    await expect(runIngestion("huangshan", {
      repository,
      fetchImpl,
      delayMs: 0,
      cache: false
    })).rejects.toMatchObject({ code: "ROBOTS_DISALLOWED" });

    expect(repository.listJobs()[0]).toMatchObject({ status: "failed" });
  });

  it("refreshes robots policy but reuses a cached catalogue response", async () => {
    cacheDir = mkdtempSync(join(tmpdir(), "nuogo-ingestion-"));
    let sourceFetches = 0;
    const source = {
      url: "https://m.mafengwo.cn/gl/catalog/index?catalog_id=2981&id=18"
    };
    const fetchImpl = async (url) => {
      if (String(url).endsWith("/robots.txt")) return new Response("User-agent: *\n");
      sourceFetches += 1;
      return new Response(fixture, { headers: { "content-type": "text/html" } });
    };

    await fetchSourcePage(source, { fetchImpl, delayMs: 0, cacheDir });
    const cached = await fetchSourcePage(source, { fetchImpl, delayMs: 0, cacheDir });

    expect(sourceFetches).toBe(1);
    expect(cached.fromCache).toBe(true);
  });
});
