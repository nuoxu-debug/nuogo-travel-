import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { DemoPlanProvider } from "./providers/demoProvider.js";
import { OpenRouterProvider } from "./providers/openRouter.js";
import { AmapTravelProvider } from "./providers/travel/amapProvider.js";
import { DemoTravelProvider } from "./providers/travel/demoTravelProvider.js";
import { OpenTripMapProvider } from "./providers/travel/openTripMapProvider.js";
import { AttractionSqliteRepository } from "./ingestion/sqliteRepository.js";
import { MemoryRepository } from "./repositories/memory.js";
import { MySqlRepository } from "./repositories/mysql.js";
import { SqliteAttractionCatalogue } from "./services/attractionCatalogue.js";
import { AttractionMediaService } from "./services/attractionMedia.js";
import { resolveCostReferences } from "./services/budget/costReferenceService.js";
import { generateValidatedTrip } from "./services/itinerary/generateValidatedTrip.js";
import { createLogger } from "./services/logger.js";
import { getCity } from "@nuogo/shared/constants";

const config = loadConfig();
const repository = config.demoMode
  ? new MemoryRepository()
  : new MySqlRepository(config.mysql);
const planProvider = config.aiProvider === "openrouter"
  ? new OpenRouterProvider({
      apiKey: config.openRouterKey,
      model: config.openRouterModel,
      timeoutMs: config.openRouterTimeoutMs,
      supportsStructuredOutput: config.openRouterStructuredOutput
    })
  : new DemoPlanProvider();
const demoTravelProvider = config.travelDataProvider === "demo"
  ? new DemoTravelProvider()
  : undefined;
const primaryTravelProvider = demoTravelProvider ?? new AmapTravelProvider({
  apiKey: config.amapWebServiceKey,
  timeoutMs: config.travelProviderTimeoutMs
});
const tourismProvider = demoTravelProvider ?? new OpenTripMapProvider({
  apiKey: config.openTripMapKey,
  timeoutMs: config.travelProviderTimeoutMs
});
const demoReferences = {
  accommodationRoomNightFen: 28_000,
  foodPersonMealFen: 3_000,
  attractionPersonEntryFen: 5_000,
  entertainmentPersonEntryFen: 4_000,
  otherTripFen: 3_000,
  fuelLitreFen: 800,
  parkingDayFen: 2_000,
  provenance: { mode: "DEMO" }
};
const objectivePlanner = (preferences) => generateValidatedTrip(preferences, {
  primaryProvider: primaryTravelProvider,
  tourismProvider,
  routeProvider: primaryTravelProvider,
  llmProvider: planProvider,
  getCostReferences: async ({ destination, startDate }) => config.travelDataProvider === "demo"
    ? demoReferences
    : resolveCostReferences(await repository.listCostReferences(destination), {
        destinationId: destination,
        onDate: startDate
      }),
  resolveAnchors: async ({ destination }) => {
    const [longitude, latitude] = getCity(destination).center;
    const anchor = { longitude, latitude };
    return { origin: anchor, hotel: anchor, destination: anchor };
  },
  saveRun: (run) => repository.saveItineraryRun(run),
  now: () => new Date().toISOString()
});
const attractionRepository = new AttractionSqliteRepository(config.attractionDatabasePath);
const attractionCatalogue = new SqliteAttractionCatalogue(attractionRepository);
const attractionMediaService = new AttractionMediaService({
  repository: attractionRepository,
  storageDir: config.attractionMediaStoragePath
});
const logger = createLogger();

const app = createApp({
  repository,
  planProvider,
  objectivePlanner,
  attractionCatalogue,
  attractionMediaService,
  config,
  logger
});
app.listen(config.port, () => {
  console.log(
    `Nuogo API listening on http://localhost:${config.port} ` +
    `(${config.demoMode ? "memory" : "mysql"} persistence, ${config.aiProvider} AI)`
  );
});
