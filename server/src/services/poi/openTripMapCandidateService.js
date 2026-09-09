import { z } from "zod";
import { resolveAttractionDisplay } from "@nuogo/shared/destination-discovery";

const pointSchema = z.object({
  lon: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90)
}).passthrough();

const listRecordSchema = z.object({
  xid: z.string().trim().min(1),
  name: z.string().default(""),
  kinds: z.string().default(""),
  point: pointSchema
}).passthrough();

const detailRecordSchema = z.object({
  xid: z.string().trim().min(1),
  name: z.string().optional(),
  kinds: z.string().optional(),
  point: pointSchema.optional(),
  otm: z.string().url().optional(),
  wikipedia_extracts: z.object({ text: z.string().optional() }).passthrough().optional(),
  info: z.object({ descr: z.string().optional() }).passthrough().optional(),
  address: z.record(z.unknown()).optional(),
  preview: z.object({ source: z.string().url().optional() }).passthrough().optional()
}).passthrough();

const settingsSchema = z.object({
  center: z.object({
    longitude: z.number().min(-180).max(180),
    latitude: z.number().min(-90).max(90)
  }),
  radiusMeters: z.number().int().min(100).max(20_000)
});

function normalize(record, detail, { destination, retrievedAt }) {
  const name = detail?.name?.trim() || record.name.trim();
  if (!name) return undefined;
  const point = detail?.point ?? record.point;
  const sourceDescription = detail?.wikipedia_extracts?.text?.trim() || detail?.info?.descr?.trim();
  const english = resolveAttractionDisplay({
    destination,
    xid: record.xid,
    sourceName: name,
    sourceDescription,
    language: "en"
  });
  const chinese = resolveAttractionDisplay({
    destination,
    xid: record.xid,
    sourceName: name,
    language: "zh"
  });
  const kinds = detail?.kinds ?? record.kinds;
  return {
    xid: record.xid,
    name,
    displayName: { en: english.name, zh: chinese.name },
    description: {
      ...(english.description ? { en: english.description } : {}),
      ...(chinese.description ? { zh: chinese.description } : {})
    },
    ...(english.descriptionSourceType || chinese.descriptionSourceType
      ? { descriptionSourceType: "DATABASE_BACKED" }
      : sourceDescription ? { descriptionSourceType: "OPENTRIPMAP_API" } : {}),
    suggestedVisitDurationMinutes: Math.max(
      english.suggestedVisitDurationMinutes,
      chinese.suggestedVisitDurationMinutes
    ),
    durationSourceType: "ESTIMATED",
    kinds,
    category: categoryFor(kinds),
    coordinates: { longitude: point.lon, latitude: point.lat, coordinateSystem: "WGS84" },
    city: destination,
    ...(record.sourceType === "DEMO_FIXTURE" ? {
      providerMode: "DEMO",
      sourceType: "DEMO_FIXTURE"
    } : {
      providerMode: "LIVE",
      sourceType: "OPENTRIPMAP_API",
      sourceUrl: `https://opentripmap.com/en/card/${encodeURIComponent(record.xid)}`
    }),
    retrievedAt,
    matchStatus: "MATCHED",
    verificationStatus: "SUPPORTING_ONLY",
    ...(detail?.address ? { address: detail.address } : {}),
    ...(detail?.preview?.source ? { previewUrl: detail.preview.source } : {})
  };
}

function categoryFor(kinds) {
  const value = String(kinds).toLowerCase();
  if (/foods|restaurants|cafes/.test(value)) return "FOOD";
  if (/natural|parks|gardens/.test(value)) return "NATURE";
  if (/museums|historic|archaeology|monuments/.test(value)) return "HISTORY";
  if (/cultural|architecture|religion|theatres/.test(value)) return "CULTURE";
  if (/shops|markets|malls/.test(value)) return "SHOPPING";
  if (/amusements|entertainments|sport/.test(value)) return "ENTERTAINMENT";
  return "CULTURE";
}

export async function retrieveAttractionCandidates(
  { destination, settings, signal },
  { provider, now = () => new Date().toISOString(), maxDetailCalls = 12 }
) {
  if (!provider?.listAttractions) throw new TypeError("An OpenTripMap provider is required.");
  const parsedSettings = settingsSchema.parse(settings);
  const rawRecords = await provider.listAttractions({
    city: destination,
    coordinates: parsedSettings.center,
    radiusMeters: parsedSettings.radiusMeters,
    signal
  });
  const records = [];
  const seen = new Set();
  for (const raw of rawRecords) {
    const parsed = listRecordSchema.safeParse(raw);
    if (!parsed.success || seen.has(parsed.data.xid)) continue;
    seen.add(parsed.data.xid);
    records.push(parsed.data);
  }

  const detailLimit = Math.min(records.length, Math.max(0, Math.floor(maxDetailCalls)));
  const details = await Promise.all(records.slice(0, detailLimit).map(async ({ xid }) => {
    if (!provider.getAttractionDetails) return undefined;
    try {
      const result = detailRecordSchema.safeParse(await provider.getAttractionDetails({ xid, signal }));
      return result.success && result.data.xid === xid ? result.data : undefined;
    } catch {
      return undefined;
    }
  }));
  const retrievedAt = now();
  return records
    .map((record, index) => normalize(record, details[index], { destination, retrievedAt }))
    .filter(Boolean)
    .sort((left, right) => left.xid.localeCompare(right.xid));
}

export function createOpenTripMapCandidateService(dependencies) {
  return (input) => retrieveAttractionCandidates(input, dependencies);
}
