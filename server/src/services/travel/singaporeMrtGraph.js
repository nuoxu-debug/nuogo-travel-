import { haversineDistanceMeters } from "./haversine.js";

const WALK_SPEED_METERS_PER_MINUTE = 75;
const MAX_ACCESS_METERS = 1300;
const WAIT_MINUTES = 4;
const PER_STATION_MINUTES = 3;
const TRANSFER_MINUTES = 5;
const BASE_PUBLIC_TRANSPORT_COST_MINOR = 300;

export const MRT_REFERENCE_SOURCE = Object.freeze({
  name: "LTA rail network static reference",
  url: "https://www.lta.gov.sg/content/ltagov/en/getting_around/public_transport/rail_network.html",
  stationNameSource: "Data.gov.sg Train Station Chinese Names"
});

const lines = Object.freeze({
  NS: { code: "NS", name: { en: "North-South Line", zh: "南北线" }, color: "#d42e12" },
  EW: { code: "EW", name: { en: "East-West Line", zh: "东西线" }, color: "#009645" },
  NE: { code: "NE", name: { en: "North East Line", zh: "东北线" }, color: "#9900aa" },
  CC: { code: "CC", name: { en: "Circle Line", zh: "环线" }, color: "#fa9e0d" },
  DT: { code: "DT", name: { en: "Downtown Line", zh: "滨海市区线" }, color: "#005ec4" },
  TE: { code: "TE", name: { en: "Thomson-East Coast Line", zh: "汤申-东海岸线" }, color: "#9d5b25" }
});

const stations = Object.freeze([
  ["botanic-gardens", "CC19/DT9", { en: "Botanic Gardens", zh: "植物园" }, 1.3224, 103.8154, ["CC", "DT"]],
  ["stevens", "DT10/TE11", { en: "Stevens", zh: "史蒂芬" }, 1.3201, 103.8269, ["DT", "TE"]],
  ["newton", "DT11/NS21", { en: "Newton", zh: "纽顿" }, 1.3123, 103.8380, ["DT", "NS"]],
  ["little-india", "DT12/NE7", { en: "Little India", zh: "小印度" }, 1.3073, 103.8496, ["DT", "NE"]],
  ["rochor", "DT13", { en: "Rochor", zh: "梧槽" }, 1.3038, 103.8521, ["DT"]],
  ["bugis", "DT14/EW12", { en: "Bugis", zh: "武吉士" }, 1.3006, 103.8560, ["DT", "EW"]],
  ["promenade", "DT15/CC4", { en: "Promenade", zh: "宝门廊" }, 1.2932, 103.8609, ["DT", "CC"]],
  ["bayfront", "CE1/DT16", { en: "Bayfront", zh: "海湾舫" }, 1.2813, 103.8591, ["DT", "CC"]],
  ["downtown", "DT17", { en: "Downtown", zh: "市中心" }, 1.2794, 103.8528, ["DT"]],
  ["telok-ayer", "DT18", { en: "Telok Ayer", zh: "直落亚逸" }, 1.2822, 103.8486, ["DT"]],
  ["chinatown", "DT19/NE4", { en: "Chinatown", zh: "牛车水" }, 1.2844, 103.8434, ["DT", "NE"]],
  ["fort-canning", "DT20", { en: "Fort Canning", zh: "福康宁" }, 1.2926, 103.8443, ["DT"]],
  ["bencoolen", "DT21", { en: "Bencoolen", zh: "明古连" }, 1.2989, 103.8504, ["DT"]],
  ["jalan-besar", "DT22", { en: "Jalan Besar", zh: "惹兰勿刹" }, 1.3056, 103.8554, ["DT"]],
  ["macpherson", "DT26/CC10", { en: "MacPherson", zh: "麦波申" }, 1.3260, 103.8895, ["DT", "CC"]],
  ["dhoby-ghaut", "NS24/NE6/CC1", { en: "Dhoby Ghaut", zh: "多美歌" }, 1.2990, 103.8458, ["NS", "NE", "CC"]],
  ["city-hall", "NS25/EW13", { en: "City Hall", zh: "政府大厦" }, 1.2931, 103.8520, ["NS", "EW"]],
  ["raffles-place", "NS26/EW14", { en: "Raffles Place", zh: "莱佛士坊" }, 1.2840, 103.8514, ["NS", "EW"]],
  ["marina-bay", "NS27/CE2/TE20", { en: "Marina Bay", zh: "滨海湾" }, 1.2764, 103.8546, ["NS", "CC", "TE"]],
  ["orchard", "NS22/TE14", { en: "Orchard", zh: "乌节" }, 1.3040, 103.8320, ["NS", "TE"]],
  ["somerset", "NS23", { en: "Somerset", zh: "索美塞" }, 1.3003, 103.8385, ["NS"]],
  ["outram-park", "EW16/NE3/TE17", { en: "Outram Park", zh: "欧南园" }, 1.2803, 103.8396, ["EW", "NE", "TE"]],
  ["tanjong-pagar", "EW15", { en: "Tanjong Pagar", zh: "丹戎巴葛" }, 1.2765, 103.8459, ["EW"]],
  ["lavender", "EW11", { en: "Lavender", zh: "劳明达" }, 1.3073, 103.8631, ["EW"]],
  ["clarke-quay", "NE5", { en: "Clarke Quay", zh: "克拉码头" }, 1.2888, 103.8466, ["NE"]],
  ["harbourfront", "NE1/CC29", { en: "HarbourFront", zh: "港湾" }, 1.2653, 103.8215, ["NE", "CC"]],
  ["bras-basah", "CC2", { en: "Bras Basah", zh: "百胜" }, 1.2969, 103.8507, ["CC"]],
  ["esplanade", "CC3", { en: "Esplanade", zh: "滨海中心" }, 1.2936, 103.8559, ["CC"]],
  ["stadium", "CC6", { en: "Stadium", zh: "体育场" }, 1.3028, 103.8753, ["CC"]],
  ["paya-lebar", "CC9/EW8", { en: "Paya Lebar", zh: "巴耶利峇" }, 1.3180, 103.8929, ["CC", "EW"]],
  ["caldecott", "CC17/TE9", { en: "Caldecott", zh: "加利谷" }, 1.3376, 103.8395, ["CC", "TE"]],
  ["maxwell", "TE18", { en: "Maxwell", zh: "麦士威" }, 1.2805, 103.8439, ["TE"]],
  ["shenton-way", "TE19", { en: "Shenton Way", zh: "珊顿道" }, 1.2777, 103.8503, ["TE"]],
  ["gardens-by-the-bay", "TE22", { en: "Gardens by the Bay", zh: "滨海湾花园" }, 1.2785, 103.8683, ["TE"]]
].map(([id, code, name, latitude, longitude, lineCodes]) => ({
  id,
  code,
  name,
  coordinates: { latitude, longitude },
  lineCodes
})));

const sequences = Object.freeze({
  NS: ["orchard", "somerset", "dhoby-ghaut", "city-hall", "raffles-place", "marina-bay"],
  EW: ["lavender", "bugis", "city-hall", "raffles-place", "tanjong-pagar", "outram-park"],
  NE: ["harbourfront", "outram-park", "chinatown", "clarke-quay", "dhoby-ghaut", "little-india"],
  CC: ["dhoby-ghaut", "bras-basah", "esplanade", "promenade", "bayfront", "marina-bay", "stadium", "paya-lebar", "macpherson", "caldecott", "botanic-gardens", "harbourfront"],
  DT: ["botanic-gardens", "stevens", "newton", "little-india", "rochor", "bugis", "promenade", "bayfront", "downtown", "telok-ayer", "chinatown", "fort-canning", "bencoolen", "jalan-besar", "macpherson"],
  TE: ["caldecott", "stevens", "orchard", "outram-park", "maxwell", "shenton-way", "marina-bay", "gardens-by-the-bay"]
});

const stationById = new Map(stations.map((station) => [station.id, station]));

function walkMinutes(distanceMeters) {
  return Math.max(1, Math.ceil(distanceMeters / WALK_SPEED_METERS_PER_MINUTE));
}

function publicStation(station, extra = {}) {
  return {
    id: station.id,
    code: station.code,
    name: station.name,
    lineCodes: station.lineCodes,
    ...extra
  };
}

export function findNearestMrtStation(point, { maxDistanceMeters = MAX_ACCESS_METERS } = {}) {
  if (!point) return null;
  const nearest = stations
    .map((station) => ({
      station,
      distanceMeters: Math.round(haversineDistanceMeters(point, station.coordinates))
    }))
    .sort((left, right) => left.distanceMeters - right.distanceMeters)[0];
  if (!nearest || nearest.distanceMeters > maxDistanceMeters) return null;
  return {
    station: publicStation(nearest.station),
    distanceMeters: nearest.distanceMeters,
    walkMinutes: walkMinutes(nearest.distanceMeters)
  };
}

function edgesFor(stationId) {
  const edges = [];
  for (const [lineCode, sequence] of Object.entries(sequences)) {
    const index = sequence.indexOf(stationId);
    if (index < 0) continue;
    for (const neighbor of [sequence[index - 1], sequence[index + 1]].filter(Boolean)) {
      edges.push({ to: neighbor, lineCode, minutes: PER_STATION_MINUTES });
    }
  }
  return edges;
}

function stateKey(stationId, lineCode) {
  return `${stationId}:${lineCode ?? "START"}`;
}

export function shortestMrtRoute(fromStationId, toStationId) {
  if (!stationById.has(fromStationId) || !stationById.has(toStationId)) return null;
  if (fromStationId === toStationId) {
    const station = stationById.get(fromStationId);
    return {
      from: publicStation(station),
      to: publicStation(station),
      stations: [publicStation(station)],
      lines: [],
      segments: [],
      stationCount: 1,
      transferCount: 0,
      durationMinutes: 1,
      sourceType: "ESTIMATED"
    };
  }

  const start = { stationId: fromStationId, lineCode: null };
  const queue = [{ ...start, minutes: 0, path: [fromStationId], linePath: [] }];
  const best = new Map([[stateKey(start.stationId, start.lineCode), 0]]);

  while (queue.length) {
    queue.sort((left, right) => left.minutes - right.minutes);
    const current = queue.shift();
    if (current.stationId === toStationId) return routeFromState(fromStationId, toStationId, current);
    if (current.minutes > best.get(stateKey(current.stationId, current.lineCode))) continue;
    for (const edge of edgesFor(current.stationId)) {
      const transfer = current.lineCode && current.lineCode !== edge.lineCode ? TRANSFER_MINUTES : 0;
      const minutes = current.minutes + edge.minutes + transfer;
      const key = stateKey(edge.to, edge.lineCode);
      if (minutes >= (best.get(key) ?? Infinity)) continue;
      best.set(key, minutes);
      queue.push({
        stationId: edge.to,
        lineCode: edge.lineCode,
        minutes,
        path: [...current.path, edge.to],
        linePath: [...current.linePath, edge.lineCode]
      });
    }
  }
  return null;
}

function routeFromState(fromStationId, toStationId, state) {
  const usedLineCodes = [...new Set(state.linePath)];
  const segments = [];
  for (const [index, lineCode] of state.linePath.entries()) {
    const previous = segments.at(-1);
    const stationPair = [state.path[index], state.path[index + 1]];
    if (previous?.lineCode === lineCode) previous.stationIds.push(stationPair[1]);
    else segments.push({ lineCode, stationIds: stationPair });
  }
  return {
    from: publicStation(stationById.get(fromStationId)),
    to: publicStation(stationById.get(toStationId)),
    stations: state.path.map((id) => publicStation(stationById.get(id))),
    lines: usedLineCodes.map((lineCode) => lines[lineCode]),
    segments,
    stationCount: state.path.length,
    transferCount: Math.max(0, usedLineCodes.length - 1),
    durationMinutes: Math.max(1, Math.ceil(state.minutes + WAIT_MINUTES)),
    sourceType: "ESTIMATED"
  };
}

export function estimateSingaporeMrtLeg({ from, to, mode }) {
  if (!["PUBLIC_TRANSIT", "MIXED"].includes(mode)) return null;
  const access = findNearestMrtStation(from);
  const egress = findNearestMrtStation(to);
  if (!access || !egress) return null;
  const route = shortestMrtRoute(access.station.id, egress.station.id);
  if (!route) return null;
  const walkTotal = access.walkMinutes + egress.walkMinutes;
  const directDistanceMeters = Math.round(haversineDistanceMeters(from, to));
  return {
    distanceMeters: directDistanceMeters,
    durationMinutes: route.durationMinutes + walkTotal,
    estimatedCostMinor: BASE_PUBLIC_TRANSPORT_COST_MINOR,
    sourceType: "ESTIMATED",
    mrtRoute: {
      accessStation: { ...access.station, distanceMeters: access.distanceMeters, walkMinutes: access.walkMinutes },
      egressStation: { ...egress.station, distanceMeters: egress.distanceMeters, walkMinutes: egress.walkMinutes },
      stations: route.stations,
      lines: route.lines,
      segments: route.segments,
      stationCount: route.stationCount,
      transferCount: route.transferCount,
      railMinutes: route.durationMinutes,
      walkMinutes: walkTotal,
      distanceMeters: directDistanceMeters,
      fareMinor: BASE_PUBLIC_TRANSPORT_COST_MINOR,
      provider: "STATIC_REFERENCE",
      source: MRT_REFERENCE_SOURCE
    }
  };
}
