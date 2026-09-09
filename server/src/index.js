import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { DemoPlanProvider } from "./providers/demoProvider.js";
import { OpenRouterProvider } from "./providers/openRouter.js";
import { DemoTravelProvider } from "./providers/travel/demoTravelProvider.js";
import { OpenTripMapProvider } from "./providers/travel/openTripMapProvider.js";
import { createRepository } from "./runtime/createRepository.js";
import { resolveCostReferences } from "./services/budget/costReferenceService.js";
import { generateValidatedTrip } from "./services/itinerary/generateValidatedTrip.js";
import { createLogger, createRepositoryLogSink } from "./services/logger.js";
import { createOpenTripMapCandidateService } from "./services/poi/openTripMapCandidateService.js";
import { buildDiscoveryResponse } from "./services/poi/buildDiscoveryResponse.js";
import { getCity } from "@nuogo/shared/constants";
import { initializeDemoRuntime } from "./runtime/initializeDemoRuntime.js";

const config = loadConfig();
const repository = createRepository(config);
await initializeDemoRuntime({ repository, config });
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
const attractionProvider = demoTravelProvider ?? new OpenTripMapProvider({
  apiKey: config.openTripMapKey,
  timeoutMs: config.travelProviderTimeoutMs
});
const now = () => new Date().toISOString();
const retrieveAttractionCandidates = createOpenTripMapCandidateService({
  provider: attractionProvider,
  now
});
const objectivePlanner = (preferences) => generateValidatedTrip(preferences, {
  retrieveAttractionCandidates,
  getDestinationSettings: async ({ destination }) => {
    const city = getCity(destination);
    const [longitude, latitude] = city.center;
    return {
      center: { longitude, latitude },
      radiusMeters: city.attractionRadiusMeters
    };
  },
  llmProvider: planProvider,
  getCostReferences: async ({ destination }) => resolveCostReferences(
    await repository.listCostReferences(destination),
    { city: destination }
  ),
  resolveAnchors: async ({ destination }) => {
    const [longitude, latitude] = getCity(destination).center;
    const anchor = { longitude, latitude };
    return { origin: anchor, hotel: anchor, destination: anchor };
  },
  now
});
const discoverAttractions = async ({ destination, signal }) => {
  const city = getCity(destination);
  const [longitude, latitude] = city.center;
  const candidates = await retrieveAttractionCandidates({
    destination,
    settings: {
      center: { longitude, latitude },
      radiusMeters: city.attractionRadiusMeters
    },
    signal
  });
  return buildDiscoveryResponse(destination, candidates, {
    runtimeMode: config.travelDataProvider
  });
};
const logger = createLogger({ sink: createRepositoryLogSink({ repository }) });

const app = createApp({
  repository,
  objectivePlanner,
  discoverAttractions,
  config,
  logger
});
app.listen(config.port, () => {
  console.log(
    `Nuogo API listening on http://localhost:${config.port} ` +
    `(${config.runtimeMode} runtime, ${config.aiProvider} AI)`
  );
});
