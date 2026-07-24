import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { DemoPlanProvider } from "./providers/demoProvider.js";
import { OpenRouterProvider } from "./providers/openRouter.js";
import { AttractionSqliteRepository } from "./ingestion/sqliteRepository.js";
import { MemoryRepository } from "./repositories/memory.js";
import { MySqlRepository } from "./repositories/mysql.js";
import { SqliteAttractionCatalogue } from "./services/attractionCatalogue.js";
import { AttractionMediaService } from "./services/attractionMedia.js";

const config = loadConfig();
const repository = config.demoMode
  ? new MemoryRepository()
  : new MySqlRepository(config.mysql);
const planProvider = config.aiProvider === "openrouter"
  ? new OpenRouterProvider({
      apiKey: config.openRouterKey,
      model: config.openRouterModel,
      timeoutMs: config.openRouterTimeoutMs
    })
  : new DemoPlanProvider();
const attractionRepository = new AttractionSqliteRepository(config.attractionDatabasePath);
const attractionCatalogue = new SqliteAttractionCatalogue(attractionRepository);
const attractionMediaService = new AttractionMediaService({
  repository: attractionRepository,
  storageDir: config.attractionMediaStoragePath
});

const app = createApp({
  repository,
  planProvider,
  attractionCatalogue,
  attractionMediaService,
  config
});
app.listen(config.port, () => {
  console.log(
    `Nuogo API listening on http://localhost:${config.port} ` +
    `(${config.demoMode ? "memory" : "mysql"} persistence, ${config.aiProvider} AI)`
  );
});
