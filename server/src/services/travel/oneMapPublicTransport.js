const ONEMAP_BASE_URL = "https://www.onemap.gov.sg";
const ONEMAP_ROUTE_SOURCE = Object.freeze({
  name: "OneMap public transport routing",
  url: "https://www.onemap.gov.sg/apidocs/routing",
  stationNameSource: "OneMap Public Transport Routing API"
});

const LINE_DETAILS = Object.freeze({
  NS: { code: "NS", name: { en: "North-South Line", zh: "North-South Line" }, color: "#d42e12" },
  EW: { code: "EW", name: { en: "East-West Line", zh: "East-West Line" }, color: "#009645" },
  CG: { code: "CG", name: { en: "Changi Airport Branch Line", zh: "Changi Airport Branch Line" }, color: "#009645" },
  NE: { code: "NE", name: { en: "North East Line", zh: "North East Line" }, color: "#9900aa" },
  CC: { code: "CC", name: { en: "Circle Line", zh: "Circle Line" }, color: "#fa9e0d" },
  CE: { code: "CE", name: { en: "Circle Line Extension", zh: "Circle Line Extension" }, color: "#fa9e0d" },
  DT: { code: "DT", name: { en: "Downtown Line", zh: "Downtown Line" }, color: "#005ec4" },
  TE: { code: "TE", name: { en: "Thomson-East Coast Line", zh: "Thomson-East Coast Line" }, color: "#9d5b25" },
  JS: { code: "JS", name: { en: "Jurong Region Line", zh: "Jurong Region Line" }, color: "#0099aa" }
});

let cachedToken = null;

function numeric(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
}

function minutesFromSeconds(value) {
  const seconds = numeric(value);
  return seconds === undefined ? undefined : Math.max(0, Math.ceil(seconds / 60));
}

function minorFromFare(value) {
  const fare = numeric(value);
  return fare === undefined ? undefined : Math.max(0, Math.round(fare * 100));
}

function normalizeStationName(name) {
  return String(name ?? "")
    .replace(/\bMRT\s+STATION\b/gi, "")
    .replace(/\bLRT\s+STATION\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value) {
  return normalizeStationName(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stationFromName(name, lineCode) {
  const cleanName = normalizeStationName(name);
  if (!cleanName) return null;
  return {
    id: slug(cleanName),
    name: { en: cleanName, zh: cleanName },
    lineCodes: lineCode ? [lineCode] : ["PT"]
  };
}

function uniqueById(items) {
  return [...new Map(items.filter(Boolean).map((item) => [item.id ?? item.code, item])).values()];
}

function lineDetails(lineCode) {
  if (!lineCode) return null;
  return LINE_DETAILS[lineCode] ?? {
    code: lineCode,
    name: { en: `${lineCode} Line`, zh: `${lineCode} Line` },
    color: "#2e88ff"
  };
}

function transportLegSummary(leg) {
  return {
    mode: String(leg.mode ?? "UNKNOWN"),
    ...(leg.route ? { route: String(leg.route) } : {}),
    ...(leg.from?.name ? { fromName: normalizeStationName(leg.from.name) } : {}),
    ...(leg.to?.name ? { toName: normalizeStationName(leg.to.name) } : {}),
    ...(minutesFromSeconds(leg.duration) !== undefined ? { durationMinutes: minutesFromSeconds(leg.duration) } : {}),
    ...(numeric(leg.distance) !== undefined ? { distanceMeters: Math.round(numeric(leg.distance)) } : {})
  };
}

function stationNamesForSubwayLeg(leg) {
  return [
    leg.from?.name,
    ...(leg.intermediateStops ?? []).map((stop) => stop?.name),
    leg.to?.name
  ].map(normalizeStationName).filter(Boolean);
}

export function parseOneMapPublicTransportRoute(payload) {
  const itinerary = payload?.plan?.itineraries?.[0];
  if (!itinerary) return null;
  const legs = Array.isArray(itinerary.legs) ? itinerary.legs : [];
  const subwayLegs = legs.filter((leg) => String(leg.mode).toUpperCase() === "SUBWAY");
  if (!subwayLegs.length) return null;

  const stationEntries = [];
  const segments = [];
  const lineCodes = [];
  for (const leg of subwayLegs) {
    const lineCode = String(leg.route ?? leg.routeId ?? "").match(/[A-Z]+/)?.[0];
    const stationIds = stationNamesForSubwayLeg(leg)
      .map((name) => {
        const station = stationFromName(name, lineCode);
        if (station) stationEntries.push(station);
        return station?.id;
      })
      .filter(Boolean);
    if (lineCode) lineCodes.push(lineCode);
    if (lineCode && stationIds.length >= 2) segments.push({ lineCode, stationIds });
  }

  const stations = uniqueById(stationEntries);
  if (stations.length < 2 || !segments.length) return null;
  const lines = uniqueById(lineCodes.map(lineDetails));
  const distanceMeters = Math.round(
    numeric(itinerary.distance) ??
    legs.reduce((sum, leg) => sum + (numeric(leg.distance) ?? 0), 0)
  );
  const railMinutes = minutesFromSeconds(itinerary.transitTime) ??
    subwayLegs.reduce((sum, leg) => sum + (minutesFromSeconds(leg.duration) ?? 0), 0);
  const walkMinutes = minutesFromSeconds(itinerary.walkTime) ??
    legs.filter((leg) => String(leg.mode).toUpperCase() === "WALK")
      .reduce((sum, leg) => sum + (minutesFromSeconds(leg.duration) ?? 0), 0);
  const fareMinor = minorFromFare(itinerary.fare);
  const durationMinutes = minutesFromSeconds(itinerary.duration) ?? Math.max(1, railMinutes + walkMinutes);

  return {
    distanceMeters,
    durationMinutes: Math.max(1, durationMinutes),
    estimatedCostMinor: fareMinor ?? 0,
    sourceType: "ESTIMATED",
    mrtRoute: {
      accessStation: stations[0],
      egressStation: stations.at(-1),
      stations,
      lines,
      segments,
      stationCount: stations.length,
      transferCount: Math.max(0, Number(itinerary.transfers ?? lines.length - 1)),
      railMinutes: Math.max(1, railMinutes),
      walkMinutes: Math.max(0, walkMinutes),
      distanceMeters,
      ...(fareMinor !== undefined ? { fareMinor } : {}),
      provider: "ONEMAP",
      legs: legs.map(transportLegSummary),
      source: ONEMAP_ROUTE_SOURCE
    }
  };
}

async function getOneMapAccessToken({ fetchImpl, baseUrl }) {
  if (process.env.ONEMAP_ACCESS_TOKEN) return process.env.ONEMAP_ACCESS_TOKEN;
  if (cachedToken?.value && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const email = process.env.ONEMAP_API_EMAIL;
  const password = process.env.ONEMAP_API_PASSWORD;
  if (!email || !password) return "";
  const response = await fetchImpl(`${baseUrl}/api/auth/post/getToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) return "";
  const body = await response.json();
  const token = body?.access_token;
  if (!token) return "";
  cachedToken = {
    value: token,
    expiresAt: (numeric(body.expiry_timestamp) ?? (Date.now() / 1000 + 60 * 60)) * 1000
  };
  return token;
}

export async function estimateOneMapPublicTransportLeg({
  from,
  to,
  mode,
  token,
  fetchImpl = globalThis.fetch,
  baseUrl = ONEMAP_BASE_URL
}) {
  if (!["PUBLIC_TRANSIT", "MIXED"].includes(mode)) return null;
  if (!from || !to || typeof fetchImpl !== "function") return null;
  try {
    const accessToken = token ?? await getOneMapAccessToken({ fetchImpl, baseUrl });
    if (!accessToken) return null;
    const url = new URL("/api/public/routingsvc/route", baseUrl);
    url.searchParams.set("start", `${from.latitude},${from.longitude}`);
    url.searchParams.set("end", `${to.latitude},${to.longitude}`);
    url.searchParams.set("routeType", "pt");
    url.searchParams.set("mode", "TRANSIT");
    url.searchParams.set("maxWalkDistance", "1000");
    url.searchParams.set("numItineraries", "1");
    const response = await fetchImpl(url, {
      headers: {
        Authorization: accessToken,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) return null;
    return parseOneMapPublicTransportRoute(await response.json());
  } catch {
    return null;
  }
}
