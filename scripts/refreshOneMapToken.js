import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const ENV_PATH = path.join(projectRoot, ".env");
const ONEMAP_TOKEN_URL = "https://www.onemap.gov.sg/api/auth/post/getToken";

export function upsertEnvValue(content, key, value) {
  const lines = String(content ?? "").split(/\r?\n/);
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}=`);
  let replaced = false;
  const nextLines = lines.map((line) => {
    if (pattern.test(line)) {
      replaced = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!replaced) {
    if (nextLines.length && nextLines.at(-1) !== "") nextLines.push(`${key}=${value}`);
    else nextLines.splice(Math.max(0, nextLines.length - 1), 0, `${key}=${value}`);
  }
  return nextLines.join("\n").replace(/\n{3,}$/g, "\n\n");
}

function expiryToDateTime(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "unknown";
  const milliseconds = numeric > 10_000_000_000 ? numeric : numeric * 1000;
  return new Date(milliseconds).toISOString();
}

async function requestOneMapToken({ email, password, fetchImpl = fetch }) {
  const response = await fetchImpl(ONEMAP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    throw new Error(`OneMap authentication failed with HTTP ${response.status}.`);
  }
  const body = await response.json();
  if (!body?.access_token) {
    throw new Error("OneMap authentication response did not include an access token.");
  }
  return {
    accessToken: String(body.access_token),
    expiryTimestamp: body.expiry_timestamp
  };
}

async function run() {
  dotenv.config({ path: ENV_PATH });
  const email = process.env.ONEMAP_API_EMAIL;
  const password = process.env.ONEMAP_API_PASSWORD;

  if (!email || !password) {
    throw new Error("ONEMAP_API_EMAIL and ONEMAP_API_PASSWORD must be filled in .env before refreshing the OneMap token.");
  }

  const { accessToken, expiryTimestamp } = await requestOneMapToken({ email, password });
  const current = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
  const withPlaceholders = upsertEnvValue(
    upsertEnvValue(current, "ONEMAP_API_EMAIL", email),
    "ONEMAP_API_PASSWORD",
    password
  );
  const updated = upsertEnvValue(withPlaceholders, "ONEMAP_ACCESS_TOKEN", accessToken);
  fs.writeFileSync(ENV_PATH, updated.endsWith("\n") ? updated : `${updated}\n`, "utf8");

  console.log("OneMap authentication successful");
  console.log(`Expiry: ${expiryToDateTime(expiryTimestamp)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
