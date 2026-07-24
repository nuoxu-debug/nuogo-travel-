import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isPathAllowed, parseRobots } from "./robots.js";
import { validateSourceUrl } from "./sourcePolicy.js";

export const INGESTION_USER_AGENT = "NuogoFYPBot/0.1 (+local academic attraction catalogue)";

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function ingestionError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export async function fetchSourcePage(source, {
  fetchImpl = fetch,
  delayMs = 2500,
  cacheDir,
  refresh = false
} = {}) {
  const sourceUrl = validateSourceUrl(source.url);
  const headers = {
    "User-Agent": INGESTION_USER_AGENT,
    Accept: "text/html,application/xhtml+xml"
  };
  const robotsUrl = new URL("/robots.txt", sourceUrl.origin);
  const robotsResponse = await fetchImpl(robotsUrl, { headers });
  if (!robotsResponse.ok) {
    throw ingestionError("ROBOTS_FETCH_FAILED", `robots.txt returned ${robotsResponse.status}.`);
  }
  const rules = parseRobots(await robotsResponse.text(), INGESTION_USER_AGENT);
  const pathWithQuery = `${sourceUrl.pathname}${sourceUrl.search}`;
  if (!isPathAllowed(rules, pathWithQuery)) {
    throw ingestionError("ROBOTS_DISALLOWED", `robots.txt disallows ${pathWithQuery}.`);
  }

  const cacheKey = createHash("sha256").update(sourceUrl.href).digest("hex");
  const cachePath = cacheDir ? join(cacheDir, `${cacheKey}.html`) : null;
  if (!refresh && cachePath && existsSync(cachePath)) {
    const html = readFileSync(cachePath, "utf8");
    return {
      html,
      etag: null,
      contentHash: createHash("sha256").update(html).digest("hex"),
      fromCache: true
    };
  }

  if (delayMs > 0) await wait(delayMs);
  const response = await fetchImpl(sourceUrl, { headers, redirect: "follow" });
  if (!response.ok) {
    throw ingestionError("SOURCE_FETCH_FAILED", `Source returned ${response.status}.`);
  }
  if (response.url) validateSourceUrl(response.url);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("text/html")) {
    throw ingestionError("SOURCE_CONTENT_TYPE_INVALID", `Expected HTML, received ${contentType || "unknown"}.`);
  }
  const html = await response.text();
  if (cachePath) {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cachePath, html, "utf8");
  }
  return {
    html,
    etag: response.headers.get("etag"),
    contentHash: createHash("sha256").update(html).digest("hex"),
    fromCache: false
  };
}
