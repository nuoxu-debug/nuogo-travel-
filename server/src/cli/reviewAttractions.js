import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { AttractionSqliteRepository } from "../ingestion/sqliteRepository.js";

const { values } = parseArgs({
  options: {
    region: { type: "string" },
    status: { type: "string" },
    ids: { type: "string" },
    database: { type: "string" }
  }
});

const databasePath = values.database ?? process.env.ATTRACTION_SQLITE_PATH ??
  fileURLToPath(new URL("../../../database/local/nuogo-attractions.sqlite", import.meta.url));
const ids = values.ids?.split(",").map((id) => id.trim()).filter(Boolean) ?? [];

if (!values.region || !["approved", "rejected", "pending"].includes(values.status) || !ids.length) {
  console.error("Use --region <id> --status <approved|rejected|pending> --ids <id,id,...>.");
  process.exitCode = 1;
} else {
  const repository = new AttractionSqliteRepository(databasePath);
  try {
    const count = repository.reviewAttractions({
      regionId: values.region,
      ids,
      status: values.status
    });
    console.log(JSON.stringify({
      database: databasePath,
      region: values.region,
      status: values.status,
      reviewed: count
    }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    repository.close();
  }
}
