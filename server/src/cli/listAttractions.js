import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { AttractionSqliteRepository } from "../ingestion/sqliteRepository.js";

const { values } = parseArgs({
  options: {
    status: { type: "string", default: "pending" },
    region: { type: "string" },
    limit: { type: "string", default: "20" },
    database: { type: "string" }
  }
});

const databasePath = values.database ?? process.env.ATTRACTION_SQLITE_PATH ??
  fileURLToPath(new URL("../../../database/local/nuogo-attractions.sqlite", import.meta.url));
const limit = Number(values.limit);

if (!["pending", "approved", "rejected"].includes(values.status)) {
  console.error("The --status value must be pending, approved, or rejected.");
  process.exitCode = 1;
} else if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
  console.error("The --limit value must be an integer from 1 to 500.");
  process.exitCode = 1;
} else {
  const repository = new AttractionSqliteRepository(databasePath);
  try {
    const attractions = repository.listAttractions({
      status: values.status,
      regionId: values.region,
      limit
    });
    console.log(JSON.stringify({
      database: databasePath,
      status: values.status,
      region: values.region ?? "all",
      count: attractions.length,
      attractions
    }, null, 2));
  } finally {
    repository.close();
  }
}
