import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import xlsx from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const INPUT_PATH = path.join(projectRoot, "data", "Nuogo_Singapore_POI_Master_Official_2026-09-30.xlsx");
const OUTPUT_PATH = path.join(projectRoot, "data", "Nuogo_Singapore_POI_Master_Official_Geocoded_2026-09-30.xlsx");
const AUDIT_PATH = path.join(projectRoot, "data", "Nuogo_Singapore_POI_OneMap_Audit_2026-09-30.csv");
const ONEMAP_SEARCH_URL = "https://www.onemap.gov.sg/api/common/elastic/search";
const GEO_SOURCE_NAME = "OneMap / Singapore Land Authority";
const GEO_SOURCE_URL = "https://www.onemap.gov.sg/";
const THIRD_PASS_CONFIG = Object.freeze({
  "sg-flower-dome-cloud-forest": {
    officialAddress: "18 Marina Gardens Drive, Singapore 018953",
    searchQueries: ["018953", "Gardens by the Bay", "18 Marina Gardens Drive", "Gardens by the Bay 018953"],
    officialPostal: "018953",
    preferredSearchVal: "GARDENS BY THE BAY",
    forceAddressLevel: true,
    addressLevelNote: "OneMap address-level coordinate for Gardens by the Bay official venue; sub-attraction not separately indexed."
  },
  "sg-ocbc-skyway": {
    officialAddress: "18 Marina Gardens Drive, Singapore 018953",
    searchQueries: ["018953", "Gardens by the Bay", "18 Marina Gardens Drive", "Gardens by the Bay 018953"],
    officialPostal: "018953",
    preferredSearchVal: "GARDENS BY THE BAY",
    forceAddressLevel: true,
    addressLevelNote: "OneMap address-level coordinate for Gardens by the Bay official venue; sub-attraction not separately indexed."
  },
  "sg-supertree-observatory": {
    officialAddress: "18 Marina Gardens Drive, Singapore 018953",
    searchQueries: ["018953", "Gardens by the Bay", "18 Marina Gardens Drive", "Gardens by the Bay 018953"],
    officialPostal: "018953",
    preferredSearchVal: "GARDENS BY THE BAY",
    forceAddressLevel: true,
    addressLevelNote: "OneMap address-level coordinate for Gardens by the Bay official venue; sub-attraction not separately indexed."
  },
  "sg-singapore-city-gallery": {
    officialAddress: "45 Maxwell Road, The URA Centre, Singapore 069118",
    searchQueries: ["069118", "THE URA CENTRE", "Singapore City Gallery", "Singapore City Gallery 069118"],
    forceAddressLevel: true,
    addressLevelNote: "OneMap address-level coordinate for The URA Centre, the official location of Singapore City Gallery."
  },
  "sg-national-orchid-garden": {
    officialAddress: "National Orchid Garden, Singapore Botanic Gardens, 1 Cluny Road, Singapore 257683",
    searchQueries: ["National Orchid Garden", "257683", "National Orchid Garden 257683", "1 Cluny Road 257683"],
    addressLevelNote: "OneMap address-level coordinate for the official National Orchid Garden / Singapore Botanic Gardens address; exact attraction centroid not separately indexed."
  }
});
const REQUIRED_COLUMNS = [
  "poi_id",
  "name_en",
  "name_zh",
  "category",
  "area",
  "address",
  "latitude",
  "longitude",
  "price_type",
  "min_fen",
  "representative_fen",
  "max_fen",
  "currency",
  "opening_hours",
  "closed_days",
  "price_source_name",
  "price_source_url",
  "hours_source_name",
  "hours_source_url",
  "geo_source_name",
  "geo_source_url",
  "last_reviewed",
  "verification_status",
  "notes"
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function valueOf(value) {
  return String(value ?? "").trim();
}

function normalizeText(value) {
  return valueOf(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPostalCode(value) {
  const match = valueOf(value).match(/\b(\d{6})\b/);
  return match?.[1] ?? "";
}

function tokenize(value) {
  return normalizeText(value).split(" ").filter((token) => token.length > 1);
}

function tokenOverlapRatio(needle, haystack) {
  const needleTokens = tokenize(needle);
  if (needleTokens.length === 0) return 0;
  const haystackText = normalizeText(haystack);
  const matched = needleTokens.filter((token) => haystackText.includes(token)).length;
  return matched / needleTokens.length;
}

function coordinatePair(candidate) {
  const latitude = Number(candidate?.LATITUDE);
  const longitude = Number(candidate?.LONGITUDE);
  return { latitude, longitude };
}

export function isPlausibleSingaporeCoordinate(latitudeValue, longitudeValue) {
  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= 1.10
    && latitude <= 1.50
    && longitude >= 103.50
    && longitude <= 104.10;
}

export function normalizeGeoVerificationStatus(status) {
  const current = valueOf(status);
  if (!current) return "NEEDS_REVIEW";
  return current.replace(/_GEO_PENDING\b/g, "");
}

export function shouldRetryRow(row) {
  return valueOf(row.verification_status) === "NEEDS_REVIEW"
    || !isPlausibleSingaporeCoordinate(row.latitude, row.longitude);
}

function scoreCandidate(row, candidate) {
  const candidatePostal = valueOf(candidate.POSTAL);
  const expectedPostal = extractPostalCode(row.address);
  const nameText = `${candidate.SEARCHVAL ?? ""} ${candidate.BUILDING ?? ""}`;
  const addressText = `${candidate.ADDRESS ?? ""} ${candidate.ROAD_NAME ?? ""} ${candidate.BLK_NO ?? ""}`;
  const combinedText = `${nameText} ${addressText}`;
  const { latitude, longitude } = coordinatePair(candidate);

  if (!isPlausibleSingaporeCoordinate(latitude, longitude)) {
    return { score: -1, reason: "OneMap result has missing or implausible Singapore coordinates." };
  }

  if (expectedPostal && candidatePostal && candidatePostal !== expectedPostal) {
    return { score: -1, reason: `Postal code differs: expected ${expectedPostal}, got ${candidatePostal}.` };
  }

  if (expectedPostal && candidatePostal === expectedPostal) {
    return { score: 100, reason: "Exact postal-code match." };
  }

  const addressOverlap = tokenOverlapRatio(row.address, addressText);
  const nameOverlap = tokenOverlapRatio(row.name_en, nameText);
  const areaOverlap = tokenOverlapRatio(row.area, combinedText);

  if (addressOverlap >= 0.72) return { score: 80 + addressOverlap, reason: "Strong full-address match." };
  if (nameOverlap >= 0.75) return { score: 70 + nameOverlap, reason: "Strong POI/building-name match." };
  if (nameOverlap >= 0.55 && areaOverlap >= 0.5) {
    return { score: 60 + nameOverlap + areaOverlap, reason: "POI name and Singapore area match." };
  }

  return { score: -1, reason: "No confident address, postal-code, name, or area match." };
}

export function evaluateOneMapCandidates(row, candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { matchStatus: "NEEDS_REVIEW", reason: "OneMap returned no results." };
  }

  const scored = candidates
    .map((candidate) => ({ candidate, ...scoreCandidate(row, candidate) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { matchStatus: "NEEDS_REVIEW", reason: "No confident OneMap match." };
  }

  if (scored.length > 1 && Math.abs(scored[0].score - scored[1].score) < 0.01) {
    return { matchStatus: "NEEDS_REVIEW", reason: "Ambiguous match: multiple OneMap results are equally plausible." };
  }

  return {
    matchStatus: "MATCHED",
    candidate: scored[0].candidate,
    reason: scored[0].reason
  };
}

function uniqueCandidateKey(candidate) {
  return [
    normalizeText(candidate.SEARCHVAL),
    normalizeText(candidate.ADDRESS),
    valueOf(candidate.POSTAL),
    valueOf(candidate.LATITUDE),
    valueOf(candidate.LONGITUDE)
  ].join("|");
}

function candidateText(candidate) {
  return `${candidate.SEARCHVAL ?? ""} ${candidate.BUILDING ?? ""} ${candidate.ADDRESS ?? ""}`;
}

export function selectConfiguredAddressLevelCandidate(candidates, config) {
  if (!config?.preferredSearchVal || !Array.isArray(candidates)) return null;
  const preferred = normalizeText(config.preferredSearchVal);
  const officialPostal = valueOf(config.officialPostal);
  return candidates.find((candidate) => {
    const postalMatches = !officialPostal || valueOf(candidate.POSTAL) === officialPostal;
    const searchValMatches = normalizeText(candidate.SEARCHVAL) === preferred;
    const { latitude, longitude } = coordinatePair(candidate);
    return postalMatches && searchValMatches && isPlausibleSingaporeCoordinate(latitude, longitude);
  }) ?? null;
}

function secondPassBasis(row, candidate, samePostalCount) {
  const nameOverlap = tokenOverlapRatio(row.name_en, `${candidate.SEARCHVAL ?? ""} ${candidate.BUILDING ?? ""}`);
  const addressOverlap = tokenOverlapRatio(row.address, `${candidate.ADDRESS ?? ""} ${candidate.ROAD_NAME ?? ""}`);
  if (nameOverlap >= 0.55) {
    return {
      matchBasis: "EXACT_POI",
      score: 100 + nameOverlap + addressOverlap,
      reason: "Exact postal code and clear OneMap POI/building-name match."
    };
  }
  if (addressOverlap >= 0.35) {
    return {
      matchBasis: "ADDRESS_LEVEL",
      score: 85 + addressOverlap,
      reason: "OneMap address-level coordinate for official venue; exact sub-attraction centroid not separately indexed."
    };
  }
  if (samePostalCount === 1 && addressOverlap >= 0.55) {
    return {
      matchBasis: "EXACT_POSTAL",
      score: 90 + addressOverlap,
      reason: "Exact postal code with one clear official address result."
    };
  }
  if (samePostalCount === 1) {
    return {
      matchBasis: "ADDRESS_LEVEL",
      score: 80 + addressOverlap,
      reason: "OneMap address-level coordinate for official venue; exact sub-attraction centroid not separately indexed."
    };
  }
  return null;
}

export function evaluateSecondPassOneMapCandidates(row, candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { matchStatus: "NEEDS_REVIEW", matchBasis: "NEEDS_REVIEW", reason: "OneMap returned no results." };
  }

  const expectedPostal = extractPostalCode(row.address);
  const validCandidates = candidates.filter((candidate) => {
    const { latitude, longitude } = coordinatePair(candidate);
    return isPlausibleSingaporeCoordinate(latitude, longitude);
  });
  if (validCandidates.length === 0) {
    return { matchStatus: "NEEDS_REVIEW", matchBasis: "NEEDS_REVIEW", reason: "OneMap results had missing or implausible Singapore coordinates." };
  }

  const postalCandidates = expectedPostal
    ? validCandidates.filter((candidate) => valueOf(candidate.POSTAL) === expectedPostal)
    : validCandidates;

  if (expectedPostal && postalCandidates.length === 0) {
    return { matchStatus: "NEEDS_REVIEW", matchBasis: "NEEDS_REVIEW", reason: `No OneMap result matched official postal code ${expectedPostal}.` };
  }

  const uniquePostalCandidates = [...new Map(postalCandidates.map((candidate) => [uniqueCandidateKey(candidate), candidate])).values()];
  const scoredPostal = uniquePostalCandidates
    .map((candidate) => ({ candidate, ...secondPassBasis(row, candidate, uniquePostalCandidates.length) }))
    .filter((item) => item.matchBasis)
    .sort((a, b) => b.score - a.score);

  if (scoredPostal.length > 0) {
    if (
      scoredPostal.length > 1
      && scoredPostal[0].matchBasis !== "EXACT_POI"
      && Math.abs(scoredPostal[0].score - scoredPostal[1].score) < 0.01
    ) {
      return { matchStatus: "NEEDS_REVIEW", matchBasis: "NEEDS_REVIEW", reason: "Ambiguous match: multiple exact-postal OneMap results are equally plausible." };
    }
    return {
      matchStatus: "MATCHED",
      matchBasis: scoredPostal[0].matchBasis,
      candidate: scoredPostal[0].candidate,
      reason: scoredPostal[0].reason
    };
  }

  if (!expectedPostal) {
    const named = validCandidates
      .map((candidate) => ({
        candidate,
        nameOverlap: tokenOverlapRatio(row.name_en, candidateText(candidate))
      }))
      .filter(({ nameOverlap }) => nameOverlap >= 0.7)
      .sort((a, b) => b.nameOverlap - a.nameOverlap);
    if (named.length > 0) {
      return {
        matchStatus: "MATCHED",
        matchBasis: "EXACT_POI",
        candidate: named[0].candidate,
        reason: "Clear OneMap POI/building-name match."
      };
    }
  }

  return { matchStatus: "NEEDS_REVIEW", matchBasis: "NEEDS_REVIEW", reason: "No confident second-pass OneMap match." };
}

export function validateWorkbookRows(rows) {
  if (!Array.isArray(rows) || rows.length !== 25) {
    throw new Error(`Input workbook must contain exactly 25 POI rows; found ${rows?.length ?? 0}.`);
  }
  const ids = rows.map((row) => valueOf(row.poi_id));
  if (ids.some((id) => !id)) throw new Error("Every POI row must have a poi_id.");
  if (new Set(ids).size !== ids.length) throw new Error("All poi_id values must be unique.");
}

function appendNote(existing, note) {
  const current = valueOf(existing);
  return current ? `${current} | Geo review: ${note}` : `Geo review: ${note}`;
}

function buildSearchQueries(row) {
  const queries = [];
  if (valueOf(row.address)) queries.push(valueOf(row.address));
  if (valueOf(row.name_en)) queries.push(valueOf(row.name_en));
  const nameArea = `${valueOf(row.name_en)} ${valueOf(row.area)}`.trim();
  if (nameArea && !queries.includes(nameArea)) queries.push(nameArea);
  return queries;
}

export function buildSecondPassSearchQueries(row) {
  const config = THIRD_PASS_CONFIG[valueOf(row.poi_id)];
  if (config) return [...config.searchQueries];
  const postalCode = extractPostalCode(row.address);
  return [
    postalCode,
    valueOf(row.name_en),
    postalCode ? `${valueOf(row.name_en)} ${postalCode}` : ""
  ].filter(Boolean);
}

async function fetchOneMapCandidates(query, token, fetchImpl = fetch) {
  const url = new URL(ONEMAP_SEARCH_URL);
  url.searchParams.set("searchVal", query);
  url.searchParams.set("returnGeom", "Y");
  url.searchParams.set("getAddrDetails", "Y");
  url.searchParams.set("pageNum", "1");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    });
    if (response.status === 401 || response.status === 403) {
      throw new Error("OneMap authentication failed. Renew ONEMAP_ACCESS_TOKEN.");
    }
    if (!response.ok) {
      throw new Error(`OneMap request failed with HTTP ${response.status}.`);
    }
    const payload = await response.json();
    return Array.isArray(payload?.results) ? payload.results : [];
  } finally {
    clearTimeout(timeout);
  }
}

async function geocodeRow(row, token) {
  let lastReason = "No search query available.";
  for (const query of buildSearchQueries(row)) {
    const candidates = await fetchOneMapCandidates(query, token);
    const evaluation = evaluateOneMapCandidates(row, candidates);
    if (evaluation.matchStatus === "MATCHED") {
      return { ...evaluation, searchQueryUsed: query };
    }
    lastReason = evaluation.reason;
    await sleep(350);
  }
  return { matchStatus: "NEEDS_REVIEW", reason: lastReason, searchQueryUsed: buildSearchQueries(row).at(-1) ?? "" };
}

async function geocodeRowSecondPass(row, token) {
  const config = THIRD_PASS_CONFIG[valueOf(row.poi_id)];
  const searchRow = config?.officialAddress ? { ...row, address: config.officialAddress } : row;
  let lastReason = "No second-pass search query available.";
  for (const query of buildSecondPassSearchQueries(searchRow)) {
    const candidates = await fetchOneMapCandidates(query, token);
    const configuredCandidate = selectConfiguredAddressLevelCandidate(candidates, config);
    if (configuredCandidate) {
      return {
        matchStatus: "MATCHED",
        matchBasis: "ADDRESS_LEVEL",
        candidate: configuredCandidate,
        reason: config.addressLevelNote,
        addressLevelNote: config.addressLevelNote,
        officialAddress: config.officialAddress,
        searchQueryUsed: query
      };
    }
    const evaluation = evaluateSecondPassOneMapCandidates(searchRow, candidates);
    if (evaluation.matchStatus === "MATCHED") {
      return {
        ...evaluation,
        matchBasis: config?.forceAddressLevel ? "ADDRESS_LEVEL" : evaluation.matchBasis,
        reason: config?.forceAddressLevel ? config.addressLevelNote : evaluation.reason,
        addressLevelNote: config?.addressLevelNote,
        officialAddress: config?.officialAddress,
        searchQueryUsed: query
      };
    }
    lastReason = evaluation.reason;
    await sleep(350);
  }
  return {
    matchStatus: "NEEDS_REVIEW",
    matchBasis: "NEEDS_REVIEW",
    reason: lastReason,
    officialAddress: config?.officialAddress,
    searchQueryUsed: buildSecondPassSearchQueries(searchRow).at(-1) ?? ""
  };
}

function enrichMatchedRow(row, candidate, geocodeResult = {}) {
  const note = geocodeResult.matchBasis === "ADDRESS_LEVEL"
    ? appendNote(row.notes, geocodeResult.addressLevelNote ?? "OneMap address-level coordinate for official venue; exact sub-attraction centroid not separately indexed.")
    : row.notes;
  return {
    ...row,
    ...(geocodeResult.officialAddress ? { address: geocodeResult.officialAddress } : {}),
    latitude: valueOf(candidate.LATITUDE),
    longitude: valueOf(candidate.LONGITUDE),
    geo_source_name: GEO_SOURCE_NAME,
    geo_source_url: GEO_SOURCE_URL,
    verification_status: normalizeGeoVerificationStatus(row.verification_status),
    notes: note
  };
}

function enrichNeedsReviewRow(row, reason) {
  const config = THIRD_PASS_CONFIG[valueOf(row.poi_id)];
  return {
    ...row,
    ...(config?.officialAddress ? { address: config.officialAddress } : {}),
    latitude: "",
    longitude: "",
    verification_status: "NEEDS_REVIEW",
    notes: appendNote(row.notes, reason)
  };
}

function auditRecord(row, geocodeResult, enrichedRow) {
  const candidate = geocodeResult.candidate ?? {};
  return {
    poi_id: row.poi_id,
    name_en: row.name_en,
    input_address: row.address,
    search_query_used: geocodeResult.searchQueryUsed ?? "",
    match_status: geocodeResult.matchStatus,
    match_basis: geocodeResult.matchBasis ?? (geocodeResult.matchStatus === "MATCHED" ? "EXACT_POI" : "NEEDS_REVIEW"),
    matched_name: candidate.SEARCHVAL ?? "",
    matched_address: candidate.ADDRESS ?? "",
    matched_postal_code: candidate.POSTAL ?? "",
    latitude: enrichedRow.latitude ?? "",
    longitude: enrichedRow.longitude ?? "",
    review_note: geocodeResult.reason ?? ""
  };
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeAuditCsv(records) {
  const headers = [
    "poi_id",
    "name_en",
    "input_address",
    "search_query_used",
    "match_status",
    "match_basis",
    "matched_name",
    "matched_address",
    "matched_postal_code",
    "latitude",
    "longitude",
    "review_note"
  ];
  const lines = [headers.join(",")];
  for (const record of records) {
    lines.push(headers.map((header) => escapeCsv(record[header])).join(","));
  }
  fs.writeFileSync(AUDIT_PATH, `${lines.join("\n")}\n`, "utf8");
}

function validateOutputRows(originalRows, enrichedRows) {
  validateWorkbookRows(enrichedRows);
  const originalIds = originalRows.map((row) => valueOf(row.poi_id));
  const enrichedIds = enrichedRows.map((row) => valueOf(row.poi_id));
  if (originalIds.join("\u0000") !== enrichedIds.join("\u0000")) {
    throw new Error("Output workbook must preserve original POI row order and IDs.");
  }
  for (const row of enrichedRows) {
    if (row.verification_status === "NEEDS_REVIEW") {
      if (valueOf(row.latitude) || valueOf(row.longitude)) {
        throw new Error(`NEEDS_REVIEW row ${row.poi_id} must have blank coordinates.`);
      }
    } else if (valueOf(row.latitude) || valueOf(row.longitude)) {
      if (!isPlausibleSingaporeCoordinate(row.latitude, row.longitude)) {
        throw new Error(`Matched row ${row.poi_id} has invalid Singapore coordinates.`);
      }
    }
  }
}

function readPoiWorkbook() {
  const workbookPath = fs.existsSync(OUTPUT_PATH) ? OUTPUT_PATH : INPUT_PATH;
  const workbook = xlsx.readFile(workbookPath, { cellDates: false });
  const sheet = workbook.Sheets.POI_Master;
  if (!sheet) throw new Error("Input workbook must contain a POI_Master sheet.");
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  const columns = Object.keys(rows[0] ?? {});
  if (REQUIRED_COLUMNS.some((column) => !columns.includes(column))) {
    throw new Error("Input workbook is missing one or more required POI_Master columns.");
  }
  validateWorkbookRows(rows);
  return { workbook, rows };
}

function readOriginalPoiRowsById() {
  const workbook = xlsx.readFile(INPUT_PATH, { cellDates: false });
  const sheet = workbook.Sheets.POI_Master;
  if (!sheet) throw new Error("Input workbook must contain a POI_Master sheet.");
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  validateWorkbookRows(rows);
  return new Map(rows.map((row) => [valueOf(row.poi_id), row]));
}

function readPreviousAuditRows() {
  if (!fs.existsSync(AUDIT_PATH)) return [];
  const workbook = xlsx.readFile(AUDIT_PATH, { raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet, { defval: "" });
}

function writePoiWorkbook(workbook, rows) {
  workbook.Sheets.POI_Master = xlsx.utils.json_to_sheet(rows, { header: REQUIRED_COLUMNS });
  xlsx.writeFile(workbook, OUTPUT_PATH);
}

async function run() {
  dotenv.config({ path: path.join(projectRoot, ".env") });
  const token = process.env.ONEMAP_ACCESS_TOKEN;
  if (!token) throw new Error("ONEMAP_ACCESS_TOKEN is missing. Add or renew it in .env.");

  const originalHash = fs.readFileSync(INPUT_PATH);
  const { workbook, rows } = readPoiWorkbook();
  const originalRowsById = readOriginalPoiRowsById();
  const previousAuditRows = readPreviousAuditRows();
  const previousAuditById = new Map(previousAuditRows.map((row) => [valueOf(row.poi_id), row]));
  const previouslyMatchedIds = new Set(previousAuditRows
    .filter((row) => valueOf(row.match_status) === "MATCHED")
    .map((row) => valueOf(row.poi_id)));
  const enrichedRows = [];
  const auditRows = [];
  const newlyMatchedRows = [];

  for (const row of rows) {
    const previousAudit = previousAuditById.get(valueOf(row.poi_id));
    const result = shouldRetryRow(row)
      ? await geocodeRowSecondPass(row, token)
      : {
          matchStatus: "MATCHED",
          matchBasis: previousAudit?.match_basis || "EXACT_POI",
          candidate: {
            SEARCHVAL: previousAudit?.matched_name || row.name_en,
            ADDRESS: previousAudit?.matched_address || row.address,
            POSTAL: previousAudit?.matched_postal_code || extractPostalCode(row.address),
            LATITUDE: row.latitude,
            LONGITUDE: row.longitude
          },
          searchQueryUsed: previousAudit?.search_query_used || "",
          reason: previousAudit?.review_note || "Previously matched by OneMap."
        };
    const statusSourceRow = valueOf(row.verification_status) === "NEEDS_REVIEW"
      ? { ...row, verification_status: originalRowsById.get(valueOf(row.poi_id))?.verification_status ?? row.verification_status }
      : row;
    const enriched = result.matchStatus === "MATCHED"
      ? enrichMatchedRow(statusSourceRow, result.candidate, result)
      : enrichNeedsReviewRow(row, result.reason);
    enrichedRows.push(enriched);
    const record = auditRecord(row, result, enriched);
    auditRows.push(record);
    if (record.match_status === "MATCHED" && !previouslyMatchedIds.has(valueOf(row.poi_id))) {
      newlyMatchedRows.push(record);
    }
    await sleep(500);
  }

  validateOutputRows(rows, enrichedRows);
  writePoiWorkbook(workbook, enrichedRows);
  writeAuditCsv(auditRows);

  const afterHash = fs.readFileSync(INPUT_PATH);
  if (!originalHash.equals(afterHash)) {
    throw new Error("Original workbook changed unexpectedly.");
  }

  const matched = auditRows.filter((row) => row.match_status === "MATCHED");
  const needsReview = auditRows.filter((row) => row.match_status === "NEEDS_REVIEW");

  console.log(`Total POIs: ${rows.length}`);
  console.log(`Previously matched: ${previouslyMatchedIds.size}`);
  console.log(`Newly matched in second pass: ${newlyMatchedRows.length}`);
  console.log(`Final matched: ${matched.length} / ${rows.length}`);
  console.log(`Still NEEDS_REVIEW: ${needsReview.length}`);
  console.log("");
  console.log("NEWLY MATCHED:");
  for (const row of newlyMatchedRows) {
    console.log(`${row.poi_id} | ${row.name_en} | ${row.latitude} | ${row.longitude} | ${row.match_basis} | ${row.matched_name} | ${row.matched_postal_code}`);
  }
  console.log("");
  console.log("STILL NEEDS REVIEW:");
  for (const row of needsReview) console.log(`${row.poi_id} | ${row.name_en} | ${row.review_note}`);
  console.log("");
  console.log(OUTPUT_PATH);
  console.log(AUDIT_PATH);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
