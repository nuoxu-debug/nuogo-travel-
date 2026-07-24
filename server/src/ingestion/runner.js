import { getRegionSource } from "./anhuiSources.js";
import { fetchSourcePage } from "./fetcher.js";
import { parseMafengwoCatalog } from "./mafengwoParser.js";

export async function runIngestion(regionId, {
  repository,
  fetchImpl = fetch,
  delayMs = 2500,
  cacheDir,
  refresh = false
}) {
  const source = getRegionSource(regionId);
  const sourceId = repository.upsertSource(source);
  const jobId = repository.startJob(sourceId);

  try {
    const fetched = await fetchSourcePage(source, { fetchImpl, delayMs, cacheDir, refresh });
    const retrievedAt = new Date().toISOString();
    const records = parseMafengwoCatalog(fetched.html, {
      provider: source.provider,
      province: source.province,
      regionId: source.regionId,
      sourcePageUrl: source.url,
      retrievedAt
    });
    const result = repository.upsertAttractions(records);
    const metrics = {
      status: "completed",
      itemsFound: records.length,
      itemsCreated: result.created,
      itemsUpdated: result.updated,
      fromCache: fetched.fromCache
    };
    repository.completeJob(jobId, metrics);
    repository.updateSourceFetch(sourceId, {
      status: "completed",
      etag: fetched.etag,
      contentHash: fetched.contentHash
    });
    return metrics;
  } catch (error) {
    repository.failJob(jobId, error);
    repository.updateSourceFetch(sourceId, { status: "failed" });
    throw error;
  }
}
