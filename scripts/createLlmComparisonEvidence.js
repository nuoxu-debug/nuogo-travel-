import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..");

export const DEEPSEEK_MODEL_ID = "deepseek/deepseek-v4.1-flash";
export const GEMINI_MODEL_ID = "google/gemini-3.1-flash-lite";
export const AI_PROVIDER = "openrouter";
export const RUNS_PER_MODEL = 5;
export const BENCHMARK_OUTPUT_ROOT = "data/benchmarks/llm-comparison";

export const NORMALIZED_BENCHMARK_REQUEST = Object.freeze({
  destination: "singapore",
  departurePoint: "Changi Airport",
  arrivalPoint: "Hotel in Singapore",
  startDate: "2026-10-10",
  endDate: "2026-10-12",
  arrivalDateTime: "2026-10-10T08:00:00+08:00",
  departureDateTime: "2026-10-12T20:00:00+08:00",
  travellerCount: 2,
  budgetMinor: 565000,
  currency: "SGD",
  interests: ["CULTURE", "HISTORY", "NATURE", "ENTERTAINMENT", "FAMILY"],
  preferredSights: [],
  transportPreferenceMode: "AUTO_CHEAPEST",
  preferredTransportModes: [],
  attractionSelectionMode: "AUTO",
  selectedAttractions: [],
  travelStyle: "BALANCED",
  dailyAttractionTarget: 6,
  rainyDayBackupEnabled: true,
  otherPreferences: "",
  language: "en",
  consentToLlmProcessing: true
});

export const RUNS_CSV_HEADER = [
  "model",
  "run",
  "success",
  "rawValid",
  "rawIssueCount",
  "repairCount",
  "finalValidated",
  "requestedAttractions",
  "scheduledAttractions",
  "groundedPoiRate",
  "mealCompliance",
  "travelConflictCount",
  "openingHoursConflictCount",
  "duplicateErrorCount",
  "latencyMs",
  "promptTokens",
  "completionTokens",
  "totalTokens",
  "costUsd"
].join(",");

export const SUMMARY_CSV_HEADER = [
  "model",
  "runs",
  "rawValidCount",
  "rawValidRate",
  "finalValidatedCount",
  "finalValidatedRate",
  "averageRawIssueCount",
  "averageRepairCount",
  "averageScheduledAttractionCount",
  "groundedPoiRate",
  "mealComplianceRate",
  "averageLatencyMs",
  "medianLatencyMs",
  "totalTokens",
  "totalActualReportedApiCostUsd"
].join(",");

const secretVariableNames = [
  "OPENROUTER_API_KEY",
  "DATABASE_URL",
  "MYSQL_PASSWORD",
  "JWT_SECRET",
  "ONEMAP_ACCESS_TOKEN",
  "ONEMAP_API_EMAIL",
  "ONEMAP_API_PASSWORD",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY"
];

function stableJson(value) {
  return JSON.stringify(value, null, 2);
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function fileHash(pathFromRoot) {
  const content = await readFile(join(repoRoot, pathFromRoot), "utf8");
  return { path: pathFromRoot, sha256: sha256(content) };
}

function safeGitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "UNKNOWN";
  }
}

async function readDotEnvValue(name) {
  try {
    const envText = await readFile(join(repoRoot, ".env"), "utf8");
    const line = envText.split(/\r?\n/).find((item) => item.startsWith(`${name}=`));
    return line ? line.slice(name.length + 1).trim() : undefined;
  } catch {
    return undefined;
  }
}

export function scanForSecrets(text, env = process.env) {
  const haystack = String(text);
  for (const name of secretVariableNames) {
    if (haystack.includes(name)) {
      throw new Error(`Benchmark evidence contains secret variable name: ${name}`);
    }
    const value = env[name];
    if (value && value.length >= 8 && haystack.includes(value)) {
      throw new Error(`Benchmark evidence contains a secret value from ${name}`);
    }
  }
}

async function hashEvidenceVersions(gitHead) {
  return {
    prompt: {
      version: "buildItineraryPrompt.js",
      files: [await fileHash("server/src/services/llm/buildItineraryPrompt.js")]
    },
    validator: {
      version: gitHead,
      files: [
        await fileHash("server/src/services/validation/validationEngine.js"),
        await fileHash("server/src/services/validation/validators/poiValidator.js"),
        await fileHash("server/src/services/validation/validators/scheduleValidator.js"),
        await fileHash("server/src/services/validation/validators/dailyDensityValidator.js"),
        await fileHash("server/src/services/validation/validators/genericActivityQualityValidator.js")
      ]
    },
    repairPipeline: {
      version: gitHead,
      files: [
        await fileHash("server/src/services/repair/repairLoop.js"),
        await fileHash("server/src/services/repair/deterministicRepair.js"),
        await fileHash("server/src/services/repair/targetedLlmRepair.js")
      ]
    }
  };
}

export function buildBenchmarkArtifacts({
  timestamp = new Date().toISOString(),
  gitHead = safeGitHead(),
  travelDataProvider = process.env.TRAVEL_DATA_PROVIDER ?? "database",
  outputRoot = BENCHMARK_OUTPUT_ROOT,
  versions = {
    prompt: { version: "buildItineraryPrompt.js", files: [] },
    validator: { version: gitHead, files: [] },
    repairPipeline: { version: gitHead, files: [] }
  }
} = {}) {
  const requestHash = sha256(stableJson(NORMALIZED_BENCHMARK_REQUEST));
  const config = {
    benchmarkTimestamp: timestamp,
    gitCommitHead: gitHead,
    models: {
      deepseek: DEEPSEEK_MODEL_ID,
      gemini: GEMINI_MODEL_ID
    },
    aiProvider: AI_PROVIDER,
    travelDataProvider,
    candidateCount: 25,
    destination: "singapore",
    trip: {
      startDate: NORMALIZED_BENCHMARK_REQUEST.startDate,
      endDate: NORMALIZED_BENCHMARK_REQUEST.endDate,
      arrivalDateTime: NORMALIZED_BENCHMARK_REQUEST.arrivalDateTime,
      departureDateTime: NORMALIZED_BENCHMARK_REQUEST.departureDateTime
    },
    travellers: NORMALIZED_BENCHMARK_REQUEST.travellerCount,
    budgetPackageProfile: {
      travelStyle: NORMALIZED_BENCHMARK_REQUEST.travelStyle,
      budgetMinor: NORMALIZED_BENCHMARK_REQUEST.budgetMinor,
      currency: NORMALIZED_BENCHMARK_REQUEST.currency
    },
    interests: NORMALIZED_BENCHMARK_REQUEST.interests,
    dailyAttractionTarget: NORMALIZED_BENCHMARK_REQUEST.dailyAttractionTarget,
    runsPerModel: RUNS_PER_MODEL,
    samePromptUsed: true,
    sameCandidatePoolUsed: true,
    onlyChangedVariable: "model ID",
    promptVersion: versions.prompt,
    promptRequestHash: requestHash,
    validatorVersion: versions.validator,
    repairPipelineVersion: versions.repairPipeline,
    openRouterUsageCapture: {
      requestedWhenSupported: true,
      unavailableValue: null,
      note: "If OpenRouter does not return usage or cost metadata for a run, the run evidence records those fields as null. Nuogo does not fabricate API cost."
    },
    liveRunsExecuted: false,
    productionItineraryLogicModified: false
  };
  const readme = `# Nuogo LLM Comparison Evidence

## Experiment Objective

Capture reproducible FYP evidence comparing two OpenRouter model IDs on the same Nuogo Singapore itinerary task.

## Models

- DeepSeek: \`${DEEPSEEK_MODEL_ID}\`
- Gemini: \`${GEMINI_MODEL_ID}\`

## Controlled Variables

- AI provider: \`${AI_PROVIDER}\`
- Travel data provider: \`${travelDataProvider}\`
- Candidate pool: 25 Singapore canonical POIs
- Destination: Singapore
- Trip dates: ${NORMALIZED_BENCHMARK_REQUEST.startDate} to ${NORMALIZED_BENCHMARK_REQUEST.endDate}
- Arrival: ${NORMALIZED_BENCHMARK_REQUEST.arrivalDateTime}
- Departure: ${NORMALIZED_BENCHMARK_REQUEST.departureDateTime}
- Travellers: ${NORMALIZED_BENCHMARK_REQUEST.travellerCount}
- Budget: SGD ${(NORMALIZED_BENCHMARK_REQUEST.budgetMinor / 100).toFixed(2)}
- Travel style: ${NORMALIZED_BENCHMARK_REQUEST.travelStyle}
- Interests: ${NORMALIZED_BENCHMARK_REQUEST.interests.join(", ")}
- Daily attraction target: ${NORMALIZED_BENCHMARK_REQUEST.dailyAttractionTarget}
- Runs per model: ${RUNS_PER_MODEL}

Only changed variable = model ID.

## Evidence Files

- \`benchmark-config.json\`: benchmark configuration and code/version hashes.
- \`benchmark-request.json\`: exact normalized Nuogo request reused for both models.
- \`runs/\`: raw per-run evidence JSON files when live runs are explicitly executed.
- \`model-comparison-runs.csv\`: per-run machine-readable summary.
- \`model-comparison-summary.csv\`: per-model aggregate summary.

Do not declare a winner from this scaffold. Live model runs have not been executed yet.
`;
  return {
    outputRoot,
    config,
    request: NORMALIZED_BENCHMARK_REQUEST,
    readme,
    runsCsv: `${RUNS_CSV_HEADER}\n`,
    summaryCsv: `${SUMMARY_CSV_HEADER}\n`,
    filesToCreate: [
      "benchmark-config.json",
      "benchmark-request.json",
      "README.md",
      "model-comparison-runs.csv",
      "model-comparison-summary.csv",
      "runs/"
    ]
  };
}

export async function createBenchmarkEvidence({
  outputRoot = join(repoRoot, BENCHMARK_OUTPUT_ROOT),
  timestamp = new Date().toISOString(),
  gitHead = safeGitHead(),
  travelDataProvider,
  env = process.env
} = {}) {
  const resolvedTravelDataProvider = travelDataProvider ?? await readDotEnvValue("TRAVEL_DATA_PROVIDER") ?? "database";
  const versions = await hashEvidenceVersions(gitHead);
  const artifacts = buildBenchmarkArtifacts({
    timestamp,
    gitHead,
    travelDataProvider: resolvedTravelDataProvider,
    outputRoot,
    versions
  });
  const payloads = [
    stableJson(artifacts.config),
    stableJson(artifacts.request),
    artifacts.readme,
    artifacts.runsCsv,
    artifacts.summaryCsv
  ];
  for (const payload of payloads) scanForSecrets(payload, env);

  await mkdir(join(outputRoot, "runs"), { recursive: true });
  const writes = [
    ["benchmark-config.json", stableJson(artifacts.config) + "\n"],
    ["benchmark-request.json", stableJson(artifacts.request) + "\n"],
    ["README.md", artifacts.readme],
    ["model-comparison-runs.csv", artifacts.runsCsv],
    ["model-comparison-summary.csv", artifacts.summaryCsv]
  ];
  const createdFiles = [];
  for (const [name, content] of writes) {
    const target = join(outputRoot, name);
    await writeFile(target, content, "utf8");
    createdFiles.push(target);
  }
  return {
    outputRoot,
    createdFiles,
    filesToCreate: artifacts.filesToCreate,
    modelIds: artifacts.config.models,
    normalizedRequest: artifacts.request,
    liveRunsExecuted: false
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await createBenchmarkEvidence();
  console.log("LLM comparison evidence scaffold created");
  console.log(`Output directory: ${relative(repoRoot, result.outputRoot)}`);
  console.log(`DeepSeek model: ${result.modelIds.deepseek}`);
  console.log(`Gemini model: ${result.modelIds.gemini}`);
  console.log(`Live runs executed: ${result.liveRunsExecuted ? "yes" : "no"}`);
  console.log("Files:");
  for (const file of result.createdFiles) {
    console.log(`- ${relative(repoRoot, file)}`);
  }
}
