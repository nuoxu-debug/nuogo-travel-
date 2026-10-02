import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import xlsx from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const inputWorkbookPath = path.join(projectRoot, "data", "Nuogo_Singapore_POI_Master_Official_Geocoded_2026-09-30.xlsx");
const auditCsvPath = path.join(projectRoot, "data", "Nuogo_Singapore_POI_OneMap_Audit_2026-09-30.csv");
const seedDir = path.join(projectRoot, "database", "seeds");
const seedSqlPath = path.join(seedDir, "singapore_pilot_25_pois.sql");
const verifySqlPath = path.join(seedDir, "verify_singapore_pilot_25_pois.sql");

const dayIndexes = Object.freeze({
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
});

const dayAbbreviations = Object.freeze({
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6
});

const calendarBasedIds = new Set([
  "sg-universal-studios",
  "sg-singapore-oceanarium",
  "sg-adventure-cove"
]);

function q(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function jsonb(value) {
  return `${q(JSON.stringify(value))}::jsonb`;
}

function numeric(value) {
  if (value === null || value === undefined || value === "") return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function sqlNumber(value) {
  const next = numeric(value);
  return next === null ? "NULL" : String(next);
}

function slug(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function readWorkbookRows() {
  const workbook = xlsx.readFile(inputWorkbookPath);
  const sheet = workbook.Sheets.POI_Master;
  if (!sheet) throw new Error("Missing POI_Master sheet.");
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  if (rows.length !== 25) throw new Error(`Expected 25 POIs, found ${rows.length}.`);
  const ids = rows.map((row) => row.poi_id);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate poi_id in workbook.");
  return rows;
}

function readAuditByPoiId() {
  const workbook = xlsx.readFile(auditCsvPath, { raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  return new Map(rows.map((row) => {
    const postal = String(row.matched_postal_code ?? "").trim();
    return [row.poi_id, {
      ...row,
      matched_postal_code: postal && /^\d+$/.test(postal) ? postal.padStart(6, "0") : postal
    }];
  }));
}

function priceReferenceType(priceType) {
  if (priceType === "FREE") return "FREE";
  if (priceType === "FIXED") return "EXACT";
  return null;
}

function priceBasis(row) {
  if (row.price_type === "FREE") return "Free public attraction";
  if (row.price_type === "FIXED") return "Published adult admission";
  if (row.price_type === "VARIABLE") return "Published variable/from adult admission";
  return null;
}

function hasPriceRecord(row) {
  return priceReferenceType(row.price_type) && numeric(row.min_fen) !== null && numeric(row.representative_fen) !== null;
}

function maxFen(row) {
  const max = numeric(row.max_fen);
  const rep = numeric(row.representative_fen);
  return max ?? rep;
}

function expandDayRange(start, end) {
  const days = [];
  let current = start;
  for (let guard = 0; guard < 7; guard += 1) {
    days.push(current);
    if (current === end) break;
    current = (current + 1) % 7;
  }
  return days;
}

function parseDayPrefix(prefix) {
  const clean = prefix.trim().toLowerCase();
  if (clean === "daily" || clean === "open") return [0, 1, 2, 3, 4, 5, 6];
  const range = clean.match(/^(sun|mon|tue|wed|thu|fri|sat)[a-z]*-(sun|mon|tue|wed|thu|fri|sat)[a-z]*$/);
  if (range) return expandDayRange(dayAbbreviations[range[1]], dayAbbreviations[range[2]]);
  const single = clean.match(/^(sun|mon|tue|wed|thu|fri|sat)[a-z]*$/);
  if (single) return [dayAbbreviations[single[1]]];
  return [];
}

function parseOpeningHours(row) {
  const text = String(row.opening_hours ?? "").trim();
  if (!text || calendarBasedIds.has(row.poi_id) || /calendar-based/i.test(text)) return [];

  if (/24 hours/i.test(text) || /^open 24 hours$/i.test(text)) {
    return [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, opensAt: "00:00", closesAt: "23:59" }));
  }

  if (/^non-peak/i.test(text) && /peak/i.test(text)) {
    const intervals = [...text.matchAll(/(\d{2}:\d{2})-(\d{2}:\d{2})/g)]
      .map((item) => ({ opensAt: item[1], closesAt: item[2] === "00:00" ? "23:59" : item[2] }))
      .filter(({ opensAt, closesAt }) => opensAt < closesAt);
    return [0, 1, 2, 3, 4, 5, 6].flatMap((day) => intervals.map((interval) => ({ day, ...interval })));
  }

  const daySections = text.split(";").map((part) => part.trim()).filter(Boolean);
  const records = [];
  const replacements = [];
  for (const section of daySections) {
    const match = section.match(/^([A-Za-z-]+)\s+(.+)$/);
    if (!match) continue;
    const days = parseDayPrefix(match[1]);
    if (!days.length) continue;
    const intervalText = match[2].replace(/\(.+?\)/g, "");
    const untilMatch = intervalText.match(/^until\s+(\d{2}:\d{2})$/i);
    if (untilMatch && records.length) {
      const base = records.find((record) => days.includes(record.day));
      if (base && base.opensAt < untilMatch[1]) {
        replacements.push(...days.map((day) => ({ day, opensAt: base.opensAt, closesAt: untilMatch[1] === "00:00" ? "23:59" : untilMatch[1] })));
      }
      continue;
    }
    const intervals = [...intervalText.matchAll(/(\d{2}:\d{2})-(\d{2}:\d{2})/g)]
      .map((item) => ({ opensAt: item[1], closesAt: item[2] === "00:00" ? "23:59" : item[2] }))
      .filter(({ opensAt, closesAt }) => opensAt < closesAt);
    for (const day of days) {
      for (const interval of intervals) records.push({ day, ...interval });
    }
  }
  for (const replacement of replacements) {
    for (let index = records.length - 1; index >= 0; index -= 1) {
      if (records[index].day === replacement.day) records.splice(index, 1);
    }
    records.push(replacement);
  }
  return records.sort((left, right) => left.day - right.day || left.opensAt.localeCompare(right.opensAt));
}

function sourceRecordsFor(row, audit) {
  const raw = {
    name_en: row.name_en,
    category: row.category,
    price_type: row.price_type,
    opening_hours: row.opening_hours,
    closed_days: row.closed_days,
    verification_status: row.verification_status,
    match_basis: audit?.match_basis ?? null,
    matched_name: audit?.matched_name ?? null,
    matched_postal_code: audit?.matched_postal_code ?? null,
    notes: row.notes
  };
  const records = [
    {
      id: `sg25-src-${row.poi_id}-geo`,
      provider: "ONEMAP",
      sourceId: audit?.matched_postal_code ? `onemap-${audit.matched_postal_code}-${slug(audit.matched_name)}` : `onemap-${row.poi_id}`,
      sourceUrl: row.geo_source_url,
      raw: { ...raw, source_kind: "GEO" }
    },
    {
      id: `sg25-src-${row.poi_id}-price`,
      provider: "OFFICIAL",
      sourceId: `price-${slug(row.price_source_name)}-${row.poi_id}`,
      sourceUrl: row.price_source_url,
      raw: { ...raw, source_kind: "PRICE", source_name: row.price_source_name }
    },
    {
      id: `sg25-src-${row.poi_id}-hours`,
      provider: "OFFICIAL",
      sourceId: `hours-${slug(row.hours_source_name)}-${row.poi_id}`,
      sourceUrl: row.hours_source_url,
      raw: { ...raw, source_kind: "OPERATING_HOURS", source_name: row.hours_source_name }
    }
  ];
  return records;
}

function canonicalPoiSql(rows) {
  const values = rows.map((row) => `  (${[
    q(row.poi_id),
    q("singapore"),
    jsonb({ en: row.name_en, zh: row.name_zh || row.name_en }),
    q(row.category),
    sqlNumber(row.latitude),
    sqlNumber(row.longitude),
    jsonb({ en: row.address, zh: row.address }),
    q("ACTIVE")
  ].join(", ")})`).join(",\n");
  return `INSERT INTO canonical_pois
  (id, destination_id, name_json, category, latitude, longitude, address_json, status)
VALUES
${values}
ON CONFLICT (id) DO UPDATE SET
  destination_id = EXCLUDED.destination_id,
  name_json = EXCLUDED.name_json,
  category = EXCLUDED.category,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  address_json = EXCLUDED.address_json,
  status = EXCLUDED.status;`;
}

function sourceRecordsSql(rows, auditById) {
  const records = rows.flatMap((row) => sourceRecordsFor(row, auditById.get(row.poi_id)));
  const values = records.map((record) => `  (${[
    q(record.id),
    q(record.id.split("-").slice(2, -1).join("-")),
    q(record.provider),
    q(record.sourceId),
    q(record.sourceUrl),
    q("2026-09-30T00:00:00+08:00"),
    "NULL",
    jsonb(record.raw)
  ].join(", ")})`).join(",\n");
  return `INSERT INTO poi_source_records
  (id, poi_id, provider, source_id, source_url, retrieved_at, expires_at, raw_json)
VALUES
${values}
ON CONFLICT (id) DO UPDATE SET
  poi_id = EXCLUDED.poi_id,
  provider = EXCLUDED.provider,
  source_id = EXCLUDED.source_id,
  source_url = EXCLUDED.source_url,
  retrieved_at = EXCLUDED.retrieved_at,
  expires_at = EXCLUDED.expires_at,
  raw_json = EXCLUDED.raw_json;`;
}

function operatingHoursRows(rows) {
  const output = [];
  for (const row of rows) {
    const intervals = parseOpeningHours(row);
    intervals.forEach((interval, index) => {
      output.push({
        id: `sg25-hours-${row.poi_id}-${interval.day}-${index + 1}`,
        poiId: row.poi_id,
        day: interval.day,
        opensAt: interval.opensAt,
        closesAt: interval.closesAt,
        sourceName: row.hours_source_name,
        sourceUrl: row.hours_source_url,
        lastReviewedDate: row.last_reviewed,
        notes: `Seeded from Singapore pilot POI master. Closed days: ${row.closed_days || "NONE"}. ${row.notes || ""}`.trim()
      });
    });
  }
  return output;
}

function operatingHoursSql(rows) {
  const records = operatingHoursRows(rows);
  const values = records.map((record) => `  (${[
    q(record.id),
    q(record.poiId),
    record.day,
    q(record.opensAt),
    q(record.closesAt),
    "false",
    q(record.sourceName),
    q(record.sourceUrl),
    q("OFFICIAL"),
    q(record.lastReviewedDate),
    q("VERIFIED"),
    "now()",
    "NULL",
    q("ACTIVE"),
    q(record.notes)
  ].join(", ")})`).join(",\n");
  return `INSERT INTO poi_operating_hours
  (id, poi_id, day_of_week, opens_at, closes_at, is_closed,
   source_name, source_url, source_type, last_reviewed_date,
   verification_status, verified_at, verified_by_user_id, status, notes)
VALUES
${values}
ON CONFLICT (id) DO UPDATE SET
  poi_id = EXCLUDED.poi_id,
  day_of_week = EXCLUDED.day_of_week,
  opens_at = EXCLUDED.opens_at,
  closes_at = EXCLUDED.closes_at,
  is_closed = EXCLUDED.is_closed,
  source_name = EXCLUDED.source_name,
  source_url = EXCLUDED.source_url,
  source_type = EXCLUDED.source_type,
  last_reviewed_date = EXCLUDED.last_reviewed_date,
  verification_status = EXCLUDED.verification_status,
  verified_at = EXCLUDED.verified_at,
  verified_by_user_id = EXCLUDED.verified_by_user_id,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = now();`;
}

export function costReferenceRows(rows) {
  return rows.filter(hasPriceRecord).map((row) => ({
    id: `sg25-cost-${row.poi_id}`,
    poiId: row.poi_id,
    minFen: numeric(row.min_fen),
    representativeFen: numeric(row.representative_fen),
    maxFen: maxFen(row),
    currency: row.currency,
    sourceName: row.price_source_name,
    sourceUrl: row.price_source_url,
    collectedOn: row.last_reviewed,
    referenceType: priceReferenceType(row.price_type),
    priceBasis: priceBasis(row),
    sourceType: "OFFICIAL",
    notes: `Singapore pilot POI-specific planning price. price_type=${row.price_type}. ${row.notes || ""}`.trim()
  }));
}

export function omittedVariablePriceRows(rows) {
  return rows
    .filter((row) => row.price_type === "VARIABLE")
    .map((row) => ({
      poi_id: row.poi_id,
      name_en: row.name_en,
      min_fen: numeric(row.min_fen),
      representative_fen: numeric(row.representative_fen),
      max_fen: numeric(row.max_fen),
      reason: "Current cost_references reference_type constraints do not distinguish variable/range/from pricing from fixed EXACT pricing."
    }));
}

function costReferencesSql(rows) {
  const records = costReferenceRows(rows);
  const values = records.map((record) => `  (${[
    q(record.id),
    q("singapore"),
    q("singapore"),
    q(record.poiId),
    q("ATTRACTION_PERSON_ENTRY"),
    "NULL",
    record.minFen,
    record.representativeFen,
    record.maxFen,
    q(record.currency),
    q(record.sourceName),
    q(record.sourceUrl),
    q(record.collectedOn),
    "now()",
    q(record.referenceType),
    q("PER_PERSON_ENTRY"),
    q(record.priceBasis),
    q(record.sourceType),
    q(record.collectedOn),
    q(record.notes),
    q("ACTIVE")
  ].join(", ")})`).join(",\n");
  return `INSERT INTO cost_references
  (id, city, destination_id, poi_id, category, tier, min_fen, representative_fen, max_fen,
   currency, source_name, source_url, collected_on, updated_at, reference_type, unit_type,
   price_basis, source_type, last_reviewed_date, notes, status)
VALUES
${values}
ON CONFLICT (id) DO UPDATE SET
  city = EXCLUDED.city,
  destination_id = EXCLUDED.destination_id,
  poi_id = EXCLUDED.poi_id,
  category = EXCLUDED.category,
  tier = EXCLUDED.tier,
  min_fen = EXCLUDED.min_fen,
  representative_fen = EXCLUDED.representative_fen,
  max_fen = EXCLUDED.max_fen,
  currency = EXCLUDED.currency,
  source_name = EXCLUDED.source_name,
  source_url = EXCLUDED.source_url,
  collected_on = EXCLUDED.collected_on,
  updated_at = EXCLUDED.updated_at,
  reference_type = EXCLUDED.reference_type,
  unit_type = EXCLUDED.unit_type,
  price_basis = EXCLUDED.price_basis,
  source_type = EXCLUDED.source_type,
  last_reviewed_date = EXCLUDED.last_reviewed_date,
  notes = EXCLUDED.notes,
  status = EXCLUDED.status;`;
}

function verifySql() {
  return `-- Run manually in Supabase SQL editor after applying singapore_pilot_25_pois.sql.
SELECT 'singapore_canonical_poi_count' AS check_name, count(*)::text AS result
FROM canonical_pois
WHERE destination_id = 'singapore'
  AND id IN (SELECT unnest(ARRAY[
    'demo-sg-merlion-park','demo-sg-singapore-zoo','sg-flower-dome-cloud-forest','sg-ocbc-skyway',
    'sg-supertree-observatory','sg-mbs-skypark','sg-artscience-museum','sg-singapore-flyer',
    'sg-national-gallery','sg-asian-civilisations-museum','sg-singapore-city-gallery',
    'sg-buddha-tooth-relic-temple','sg-sri-mariamman-temple','sg-sultan-mosque',
    'sg-indian-heritage-centre','sg-botanic-gardens','sg-national-orchid-garden',
    'sg-fort-canning-park','sg-sungei-buloh','sg-river-wonders','sg-bird-paradise',
    'sg-night-safari','sg-universal-studios','sg-singapore-oceanarium','sg-adventure-cove'
  ]))
UNION ALL
SELECT 'duplicate_poi_ids', count(*)::text
FROM (
  SELECT id FROM canonical_pois GROUP BY id HAVING count(*) > 1
) duplicates
UNION ALL
SELECT 'null_latitude_longitude', count(*)::text
FROM canonical_pois
WHERE destination_id = 'singapore' AND (latitude IS NULL OR longitude IS NULL)
UNION ALL
SELECT 'coordinates_outside_singapore_bounds', count(*)::text
FROM canonical_pois
WHERE destination_id = 'singapore'
  AND (latitude < 1.10 OR latitude > 1.50 OR longitude < 103.50 OR longitude > 104.10)
UNION ALL
SELECT 'pois_with_cost_references', count(DISTINCT poi_id)::text
FROM cost_references
WHERE city = 'singapore' AND id LIKE 'sg25-cost-%' AND status = 'ACTIVE'
UNION ALL
SELECT 'pois_with_operating_hour_records', count(DISTINCT poi_id)::text
FROM poi_operating_hours
WHERE id LIKE 'sg25-hours-%' AND status = 'ACTIVE'
UNION ALL
SELECT 'pois_with_source_records', count(DISTINCT poi_id)::text
FROM poi_source_records
WHERE id LIKE 'sg25-src-%'
UNION ALL
SELECT 'orphan_source_records', count(*)::text
FROM poi_source_records source
LEFT JOIN canonical_pois poi ON poi.id = source.poi_id
WHERE source.id LIKE 'sg25-src-%' AND poi.id IS NULL
UNION ALL
SELECT 'orphan_operating_hour_records', count(*)::text
FROM poi_operating_hours hours
LEFT JOIN canonical_pois poi ON poi.id = hours.poi_id
WHERE hours.id LIKE 'sg25-hours-%' AND poi.id IS NULL
UNION ALL
SELECT 'orphan_cost_reference_records', count(*)::text
FROM cost_references cost
LEFT JOIN canonical_pois poi ON poi.id = cost.poi_id
WHERE cost.id LIKE 'sg25-cost-%' AND poi.id IS NULL
UNION ALL
SELECT 'duplicate_operating_hour_rows', count(*)::text
FROM (
  SELECT poi_id, day_of_week, opens_at, closes_at, count(*)
  FROM poi_operating_hours
  WHERE id LIKE 'sg25-hours-%'
  GROUP BY poi_id, day_of_week, opens_at, closes_at
  HAVING count(*) > 1
) duplicates
UNION ALL
SELECT 'duplicate_cost_reference_rows', count(*)::text
FROM (
  SELECT poi_id, category, reference_type, price_basis, count(*)
  FROM cost_references
  WHERE id LIKE 'sg25-cost-%'
  GROUP BY poi_id, category, reference_type, price_basis
  HAVING count(*) > 1
) duplicates;`;
}

function validateGenerated(rows, auditById, seedSql) {
  for (const row of rows) {
    if (!seedSql.includes(q(row.poi_id))) throw new Error(`Missing POI id in SQL: ${row.poi_id}`);
    if (!seedSql.includes(String(row.latitude)) || !seedSql.includes(String(row.longitude))) {
      throw new Error(`Missing coordinates in SQL: ${row.poi_id}`);
    }
    for (const url of [row.price_source_url, row.hours_source_url, row.geo_source_url]) {
      if (url && !seedSql.includes(String(url))) throw new Error(`Missing source URL in SQL for ${row.poi_id}: ${url}`);
    }
    const audit = auditById.get(row.poi_id);
    if (!audit || audit.match_status !== "MATCHED") throw new Error(`Missing matched audit row: ${row.poi_id}`);
  }
  if (!seedSql.includes(q("demo-sg-merlion-park")) || !seedSql.includes(q("demo-sg-singapore-zoo"))) {
    throw new Error("Existing demo IDs are not preserved.");
  }
}

export function main() {
  const rows = readWorkbookRows();
  const auditById = readAuditByPoiId();
  fs.mkdirSync(seedDir, { recursive: true });

  const seedSql = [
    "-- Singapore pilot 25-POI seed generated from Nuogo_Singapore_POI_Master_Official_Geocoded_2026-09-30.xlsx.",
    "-- Do not run automatically. Review first, then run manually in Supabase SQL editor if approved.",
    "BEGIN;",
    canonicalPoiSql(rows),
    sourceRecordsSql(rows, auditById),
    operatingHoursSql(rows),
    costReferencesSql(rows),
    "COMMIT;"
  ].join("\n\n");

  validateGenerated(rows, auditById, seedSql);
  fs.writeFileSync(seedSqlPath, `${seedSql}\n`, "utf8");
  fs.writeFileSync(verifySqlPath, `${verifySql()}\n`, "utf8");

  const withPrice = costReferenceRows(rows).length;
  const withHours = new Set(operatingHoursRows(rows).map((record) => record.poiId)).size;
  const withSources = rows.length;
  const omittedVariablePrices = omittedVariablePriceRows(rows);
  console.log(`Canonical POIs prepared: ${rows.length} / 25`);
  console.log(`POIs with price records: ${withPrice} / 25`);
  console.log(`POIs with operating-hour records: ${withHours} / 25`);
  console.log(`POIs with official source records: ${withSources} / 25`);
  console.log(`Variable price rows omitted: ${omittedVariablePrices.length}`);
  console.log(seedSqlPath);
  console.log(verifySqlPath);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
