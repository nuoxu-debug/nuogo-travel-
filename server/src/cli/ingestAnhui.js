import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { AttractionSqliteRepository } from "../ingestion/sqliteRepository.js";
import { runIngestion } from "../ingestion/runner.js";

const { values } = parseArgs({
  options: {
    region: { type: "string", default: "huangshan" },
    refresh: { type: "boolean", default: false },
    delay: { type: "string", default: process.env.INGESTION_DELAY_MS || "2500" },
    database: { type: "string" }
  }
});

const databasePath = values.database ?? process.env.ATTRACTION_SQLITE_PATH ??
  fileURLToPath(new URL("../../../database/local/nuogo-attractions.sqlite", import.meta.url));
const cacheDir = fileURLToPath(new URL("../../.cache/mafengwo", import.meta.url));
const delayMs = Number(values.delay);

if (!Number.isFinite(delayMs) || delayMs < 0) {
  console.error("The --delay value must be a non-negative number.");
  process.exitCode = 1;
} else {
  const repository = new AttractionSqliteRepository(databasePath);
  try {
    const result = await runIngestion(values.region, {
      repository,
      delayMs,
      cacheDir,
      refresh: values.refresh
    });
    console.log(JSON.stringify({
      product: "Nuogo",
      province: "Anhui",
      region: values.region,
      database: databasePath,
      ...result
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      status: "failed",
      code: error.code ?? "INGESTION_FAILED",
      message: error.message
    }, null, 2));
    process.exitCode = 1;
  } finally {
    repository.close();
  }
}
