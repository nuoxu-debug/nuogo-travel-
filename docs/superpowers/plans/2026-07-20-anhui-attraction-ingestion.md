# Anhui Attraction Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bounded Mafengwo catalogue importer that creates a real local Anhui attraction database with attribution and review status.

**Architecture:** A source manifest feeds a robots-aware sequential fetcher and a Cheerio catalogue parser. Normalized attraction records are upserted into a file-backed SQLite repository; an equivalent MySQL migration preserves the deployment architecture.

**Tech Stack:** Node.js 20, Cheerio, sql.js SQLite WebAssembly, Zod, Vitest, MySQL migration SQL.

## Global Constraints

- Geography is limited to Anhui Province.
- Only approved `m.mafengwo.cn/gl/catalog/index` URLs may be fetched.
- No authentication, CAPTCHA, paywall, or robots-policy bypass.
- Do not ingest user diary or review bodies.
- Store source attribution and imported image URLs; do not bulk-download images.
- All new records default to `pending`.
- Requests are sequential and delayed by at least 2.5 seconds.
- The default test suite performs no live network requests.
- Git is unavailable, so each task ends with a test checkpoint instead of a commit.

---

### Task 1: Dependencies, Manifest, and Normalized Contract

**Files:**
- Modify: `server/package.json`
- Create: `server/src/ingestion/anhuiSources.js`
- Create: `server/src/ingestion/contracts.js`
- Create: `server/tests/ingestion-contracts.test.js`

**Interfaces:**
- Produces: `anhuiRegions`, `getRegionSource(regionId)`, `rawAttractionSchema`, and `attractionRecordSchema`.

- [ ] **Step 1: Write the failing contract test**

```js
it("keeps every expansion region while activating only approved sources", () => {
  expect(Object.keys(anhuiRegions)).toEqual([
    "huangshan", "hefei", "chizhou", "xuancheng", "anqing", "wuhu"
  ]);
  expect(getRegionSource("huangshan").url).toContain("catalog_id=2981");
  expect(() => getRegionSource("hefei")).toThrow(/approved source/i);
});
```

- [ ] **Step 2: Run and verify the missing modules fail**

Run: `npm --workspace server test -- ingestion-contracts.test.js`

Expected: FAIL because `src/ingestion` does not exist.

- [ ] **Step 3: Install parser and SQLite dependencies**

Run: `npm install --workspace server cheerio@1.0.0 sql.js@1.13.0`

- [ ] **Step 4: Implement the manifest and Zod records**

The Huangshan source is:

```js
{
  provider: "mafengwo",
  regionId: "huangshan",
  province: "Anhui",
  url: "https://m.mafengwo.cn/gl/catalog/index?catalog_id=2981&id=18",
  sourceType: "destination_catalog",
  approved: true
}
```

The normalized contract requires provider, external ID, Chinese name, region, province, source URLs, review status, and retrieval timestamp. English name, location, image, and counts are nullable/defaulted.

- [ ] **Step 5: Run the contract test**

Run: `npm --workspace server test -- ingestion-contracts.test.js`

Expected: PASS.

### Task 2: URL Policy, Robots Policy, and Catalogue Parser

**Files:**
- Create: `server/src/ingestion/sourcePolicy.js`
- Create: `server/src/ingestion/robots.js`
- Create: `server/src/ingestion/mafengwoParser.js`
- Create: `server/tests/fixtures/mafengwo-catalog.html`
- Create: `server/tests/ingestion-parser.test.js`

**Interfaces:**
- Produces: `validateSourceUrl(url)`, `parseRobots(text, userAgent)`, `isPathAllowed(rules, pathname)`, and `parseMafengwoCatalog(html, context)`.

- [ ] **Step 1: Write failing policy and parser tests**

```js
it("allows only the approved Mafengwo catalogue path", () => {
  expect(validateSourceUrl("https://m.mafengwo.cn/gl/catalog/index?id=18")).toBeInstanceOf(URL);
  expect(() => validateSourceUrl("https://m.mafengwo.cn/i/9389665")).toThrow();
  expect(() => validateSourceUrl("https://example.com/gl/catalog/index")).toThrow();
});

it("extracts POI-card facts without article paragraphs", () => {
  const [record] = parseMafengwoCatalog(fixture, context);
  expect(record).toMatchObject({
    externalId: "6339966",
    nameZh: "迎客松",
    nameEn: "The Guest-Greeting Pine",
    reviewCount: 5152,
    travelNoteCount: 203
  });
  expect(JSON.stringify(record)).not.toContain("完整攻略正文");
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm --workspace server test -- ingestion-parser.test.js`

Expected: FAIL because policy and parser modules are missing.

- [ ] **Step 3: Implement deterministic parsing**

Use Cheerio selectors:

```js
$("a.spot.poi").map((_index, element) => ({
  externalId: $(element).attr("data-id"),
  nameZh: $(element).find(".t1").text().trim(),
  nameEn: $(element).find(".t2").text().trim() || null,
  thumbnailUrl: $(element).find(".photo img").attr("src") || null,
  locationLabel: $(element).find(".t4").text().trim() || null
}));
```

Parse the two `.t3 strong` values as review/travel-note counts and the first integer in `.go` as image count.

- [ ] **Step 4: Run parser tests**

Run: `npm --workspace server test -- ingestion-parser.test.js`

Expected: PASS.

### Task 3: File-Backed SQLite and MySQL Schema

**Files:**
- Create: `server/src/ingestion/sqliteRepository.js`
- Create: `database/migrations/002_anhui_ingestion.sql`
- Modify: `.gitignore`
- Create: `server/tests/ingestion-repository.test.js`
- Modify: `server/tests/schema.test.js`

**Interfaces:**
- Produces: `AttractionSqliteRepository`, `upsertSource`, `startJob`, `completeJob`, `failJob`, `upsertAttractions`, and `listAttractions`.

- [ ] **Step 1: Write failing repository tests**

```js
it("persists and idempotently updates attributed attractions", () => {
  const repository = new AttractionSqliteRepository(":memory:");
  repository.upsertAttractions([record({ reviewCount: 10 })]);
  repository.upsertAttractions([record({ reviewCount: 12 })]);
  const rows = repository.listAttractions({ status: "pending" });
  expect(rows).toHaveLength(1);
  expect(rows[0].reviewCount).toBe(12);
  expect(rows[0].sourceUrl).toContain("mafengwo.cn");
});
```

Update the schema test to require:

```js
[
  "ingestion_sources",
  "scrape_jobs",
  "attractions",
  "attraction_images",
  "attraction_sources"
]
```

- [ ] **Step 2: Run and verify failure**

Run: `npm --workspace server test -- ingestion-repository.test.js schema.test.js`

Expected: FAIL because the repository and second migration are absent.

- [ ] **Step 3: Implement SQLite schema and upserts**

Create tables in a transaction. Use `UNIQUE(external_source, external_id)` and update mutable factual fields on conflict while preserving review decisions.

- [ ] **Step 4: Add the equivalent MySQL migration**

Use `utf8mb4`, InnoDB, JSON facts, decimal coordinates/prices, indexed status/region columns, and foreign keys from images/sources to attractions.

- [ ] **Step 5: Ignore local runtime data**

Add:

```gitignore
database/local/
server/.cache/
```

- [ ] **Step 6: Run repository and schema tests**

Run: `npm --workspace server test -- ingestion-repository.test.js schema.test.js`

Expected: PASS.

### Task 4: Polite Fetcher, Runner, and CLI

**Files:**
- Create: `server/src/ingestion/fetcher.js`
- Create: `server/src/ingestion/runner.js`
- Create: `server/src/cli/ingestAnhui.js`
- Create: `server/src/cli/listAttractions.js`
- Modify: `server/package.json`
- Modify: `package.json`
- Create: `server/tests/ingestion-runner.test.js`

**Interfaces:**
- Produces: `fetchSourcePage(source, options)`, `runIngestion(regionId, options)`, and runnable npm commands.

- [ ] **Step 1: Write the failing runner test**

```js
it("records one successful job and upserts parsed POIs", async () => {
  const result = await runIngestion("huangshan", {
    repository,
    fetchImpl: fixtureFetch,
    delayMs: 0
  });
  expect(result.itemsFound).toBe(2);
  expect(result.itemsCreated).toBe(2);
  expect(repository.listAttractions({ status: "pending" })).toHaveLength(2);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm --workspace server test -- ingestion-runner.test.js`

Expected: FAIL because fetcher and runner are missing.

- [ ] **Step 3: Implement robots-aware sequential fetching**

Fetch `/robots.txt`, evaluate wildcard rules, then fetch the source page. Require an HTML content type, validate final redirect URL, cache HTML by SHA-256 of source URL, and wait 2.5 seconds between uncached requests.

- [ ] **Step 4: Implement CLI commands**

Root scripts:

```json
{
  "ingest:anhui": "npm --workspace server run ingest:anhui --",
  "attractions:list": "npm --workspace server run attractions:list --"
}
```

The CLI defaults to `database/local/nuogo-attractions.sqlite`, prints source/job/item counts, and exits non-zero on policy, fetch, parse, or persistence failure.

- [ ] **Step 5: Run runner tests**

Run: `npm --workspace server test -- ingestion-runner.test.js`

Expected: PASS.

### Task 5: Live Huangshan Ingestion and Inspection

**Files:**
- Runtime output only: `database/local/nuogo-attractions.sqlite`

**Interfaces:**
- Consumes: completed CLI and approved source.
- Produces: attributed pending Huangshan attraction records.

- [ ] **Step 1: Run the bounded live importer**

Run:

```powershell
npm run ingest:anhui -- --region huangshan
```

Expected: one completed job and more than ten pending attractions.

- [ ] **Step 2: Inspect records**

Run:

```powershell
npm run attractions:list -- --status pending --limit 20
```

Expected: Chinese attraction names, POI IDs, counts, and Mafengwo source URLs.

- [ ] **Step 3: Verify idempotency**

Run the importer again without `--refresh`.

Expected: cache used and zero duplicate records.

### Task 6: Documentation and Full Verification

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `docs/API.md`
- Modify: `docs/MANUAL_ACCEPTANCE.md`

**Interfaces:**
- Produces: safe operating instructions and a clear boundary between imported facts and approved itinerary data.

- [ ] **Step 1: Document commands and source policy**

Explain the local SQLite path, source attribution, review status, expansion manifest, optional OpenRouter/Amap enrichment, and MySQL migration.

- [ ] **Step 2: Run focused ingestion tests**

Run: `npm --workspace server test -- ingestion`

Expected: all ingestion tests pass with no network calls.

- [ ] **Step 3: Run all tests**

Run: `npm test`

Expected: shared, server, and client suites pass.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: server syntax check and Vite production build pass.

- [ ] **Step 5: Run scope scan**

Run:

```powershell
rg -n "mafengwo" server database docs README.md
```

Expected: all occurrences belong to ingestion, attribution, policy, migration, or documentation; no copied article fixture is present.
