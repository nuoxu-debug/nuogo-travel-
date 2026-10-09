import { TrainFront } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { localizedText } from "../i18n/display.js";

const SMRT_NETWORK_MAP_URL = "/images/reference/singapore-mrt-network-map.png";
const SMRT_NETWORK_MAP_PAGE = "https://journey.smrt.com.sg/journey/mrt_network_map/";

const zhText = {
  ariaRoute: (day) => `\u7b2c ${day} \u5929\u4f30\u7b97\u5730\u94c1\u8def\u7ebf`,
  officialMap: "\u65b0\u52a0\u5761 MRT \u5b98\u65b9\u7f51\u7edc\u56fe",
  openOfficialMap: "\u6253\u5f00 SMRT \u5b98\u65b9\u5730\u94c1\u56fe",
  estimate: "MRT \u4f30\u7b97\u8def\u7ebf",
  noEstimate: (day) => `\u7b2c ${day} \u5929\u6682\u65e0 MRT \u4f30\u7b97\u8def\u7ebf`,
  estimatedOnly: "\u4ec5\u4e3a\u4f30\u7b97",
  noRouteCopy: "\u8fd9\u4e00\u5929\u6ca1\u6709\u89e3\u6790\u51fa\u53ef\u7528\u7684 MRT \u8def\u7ebf\u3002\u53ef\u80fd\u662f\u5f53\u524d\u884c\u7a0b\u672a\u4f7f\u7528 PUBLIC_TRANSIT / MIXED\uff0c\u6216\u666f\u70b9\u79bb\u53c2\u8003 MRT \u7ad9\u70b9\u592a\u8fdc\uff1bNuogo \u4f1a\u7ee7\u7eed\u4f7f\u7528\u539f\u6709\u4ea4\u901a\u65f6\u95f4\u4f30\u7b97\u3002",
  noLive: "\u4e0d\u5305\u542b\u5b9e\u65f6\u5230\u7ad9\u3001\u670d\u52a1\u4e2d\u65ad\u6216\u4ea4\u901a\u72b6\u51b5\u3002",
  routeEstimate: "MRT \u8def\u7ebf\u4f30\u7b97",
  publicTransport: (day) => `\u7b2c ${day} \u5929\u516c\u5171\u4ea4\u901a`,
  rail: "\u8f66\u7a0b",
  walk: "\u6b65\u884c\u63a5\u9a73",
  transfer: "\u6362\u4e58",
  time: "\u65f6\u95f4",
  distance: "\u8ddd\u79bb",
  fare: "\u7968\u4ef7",
  routeLegs: "\u516c\u5171\u4ea4\u901a\u5206\u6bb5",
  routeStations: "\u5f53\u5929\u4f30\u7b97\u7ad9\u70b9",
  minutes: "\u5206\u949f",
  imageSource: "\u56fe\u50cf\u6765\u6e90\uff1aSMRT Journeys",
  oneMapSourceCopy: "\u4f7f\u7528 OneMap \u516c\u5171\u4ea4\u901a\u8def\u7ebf\u56de\u5e94\u4f5c\u4e3a\u884c\u7a0b\u4f30\u7b97\uff1b\u4e0d\u5305\u542b\u5b9e\u65f6\u5230\u7ad9\u3001\u670d\u52a1\u4e2d\u65ad\u6216\u4ea4\u901a\u72b6\u51b5\u3002",
  sourceCopy: "\u4f7f\u7528\u9759\u6001\u5730\u94c1\u7ad9\u70b9\u4e0e\u7ebf\u8def\u53c2\u8003\u8d44\u6599\u4f30\u7b97\uff1b\u4e0d\u5305\u542b\u5b9e\u65f6\u5230\u7ad9\u3001\u670d\u52a1\u4e2d\u65ad\u6216\u4ea4\u901a\u72b6\u51b5\u3002"
};

function formatSgd(minor) {
  return `S$ ${(Number(minor ?? 0) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function formatDistance(meters) {
  const value = Number(meters ?? 0);
  if (value < 1000) return `${Math.round(value)} m`;
  return `${(value / 1000).toFixed(1)} km`;
}

function uniqueById(items) {
  return [...new Map(items.map((item) => [item.id ?? item.code, item])).values()];
}

function OfficialMrtNetworkMap({ zh }) {
  return (
    <figure className="mt-4 overflow-hidden rounded-lg border border-ink/10 bg-white" data-testid="mrt-route-diagram">
      <div className="max-h-[520px] overflow-auto bg-[#dceff7]">
        <img
          src={SMRT_NETWORK_MAP_URL}
          alt={zh ? zhText.officialMap : "Official Singapore MRT network map"}
          className="block min-w-[760px] max-w-none"
          loading="lazy"
        />
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 bg-paper px-3 py-2 text-xs font-semibold text-ink/55">
        <span>{zh ? zhText.imageSource : "Image source: SMRT Journeys"}</span>
        <a href={SMRT_NETWORK_MAP_PAGE} target="_blank" rel="noreferrer" className="font-bold text-lake underline">
          {zh ? zhText.openOfficialMap : "Open official SMRT map"}
        </a>
      </figcaption>
    </figure>
  );
}

function EstimateBadge({ zh }) {
  return (
    <span className="shrink-0 rounded-lg bg-sky/10 px-2.5 py-1 text-xs font-bold text-sky">
      {zh ? zhText.estimatedOnly : "Estimated only"}
    </span>
  );
}

export default function MrtItineraryMap({ day }) {
  const { language } = useLanguage();
  const zh = language === "zh";
  const legs = (day?.legs ?? []).filter((leg) => leg.mrtRoute);
  const dayNumber = day?.dayNumber ?? "";
  const label = zh ? zhText.ariaRoute(dayNumber) : `Estimated MRT route for Day ${dayNumber}`;

  if (!legs.length) {
    return (
      <section role="region" aria-label={label} className="border border-sky/25 bg-sky/5 p-4">
        <OfficialMrtNetworkMap zh={zh} />
        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase text-sky">
              <TrainFront className="h-4 w-4" aria-hidden="true" />
              {zh ? zhText.estimate : "MRT estimate"}
            </p>
            <h3 className="mt-2 font-display text-lg font-bold">
              {zh ? zhText.noEstimate(dayNumber) : `No MRT estimate for Day ${dayNumber}`}
            </h3>
          </div>
          <EstimateBadge zh={zh} />
        </div>
        <p className="mt-3 text-sm leading-6 text-ink/60">
          {zh ? zhText.noRouteCopy : "No MRT route was resolved for this day. The itinerary may not be using PUBLIC_TRANSIT / MIXED, or the places may be too far from the reference MRT stations; Nuogo falls back to the existing travel-time estimate."}
        </p>
        <p className="mt-2 text-xs leading-5 text-ink/50">
          {zh ? zhText.noLive : "Does not include real-time arrivals, service disruptions, or traffic."}
        </p>
      </section>
    );
  }

  const stations = uniqueById(legs.flatMap((leg) => leg.mrtRoute.stations));
  const lines = uniqueById(legs.flatMap((leg) => leg.mrtRoute.lines));
  const totalRail = legs.reduce((sum, leg) => sum + (leg.mrtRoute.railMinutes ?? 0), 0);
  const totalWalk = legs.reduce((sum, leg) => sum + (leg.mrtRoute.walkMinutes ?? 0), 0);
  const totalDuration = legs.reduce((sum, leg) => sum + (leg.durationMinutes ?? 0), 0);
  const totalDistance = legs.reduce((sum, leg) => sum + (leg.mrtRoute.distanceMeters ?? leg.distanceMeters ?? 0), 0);
  const totalFareMinor = legs.reduce((sum, leg) => sum + (leg.mrtRoute.fareMinor ?? leg.estimatedCostMinor ?? 0), 0);
  const transfers = legs.reduce((sum, leg) => sum + (leg.mrtRoute.transferCount ?? 0), 0);
  const source = legs[0].mrtRoute.source;
  const provider = legs[0].mrtRoute.provider;
  const publicTransportLegs = legs.flatMap((leg) => leg.mrtRoute.legs ?? []);
  const sourceCopy = provider === "ONEMAP"
    ? (zh ? zhText.oneMapSourceCopy : "Uses OneMap public transport routing responses for itinerary estimates. It does not include real-time arrivals, service disruptions, or traffic.")
    : (zh ? zhText.sourceCopy : "Uses static station and line reference data for planning estimates. It does not include real-time arrivals, service disruptions, or traffic.");

  return (
    <section role="region" aria-label={label} className="border border-ink/10 bg-paper p-3">
      <OfficialMrtNetworkMap zh={zh} />

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase text-lake">
            <TrainFront className="h-4 w-4" aria-hidden="true" />
            {zh ? zhText.routeEstimate : "MRT route estimate"}
          </p>
          <h3 className="mt-1 font-display text-lg font-bold">
            {zh ? zhText.publicTransport(dayNumber) : `Day ${dayNumber} public transport`}
          </h3>
        </div>
        <EstimateBadge zh={zh} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-ink/10 pt-3 text-xs sm:grid-cols-5">
        <div><dt className="text-ink/45">{zh ? zhText.time : "Time"}</dt><dd className="font-bold">{totalDuration} {zh ? zhText.minutes : "min"}</dd></div>
        <div><dt className="text-ink/45">{zh ? zhText.distance : "Distance"}</dt><dd className="font-bold">{formatDistance(totalDistance)}</dd></div>
        <div><dt className="text-ink/45">{zh ? zhText.fare : "Fare"}</dt><dd className="font-bold">{formatSgd(totalFareMinor)}</dd></div>
        <div><dt className="text-ink/45">{zh ? zhText.rail : "Rail"}</dt><dd className="font-bold">{totalRail} {zh ? zhText.minutes : "min"}</dd></div>
        <div><dt className="text-ink/45">{zh ? zhText.walk : "Access walk"}</dt><dd className="font-bold">{totalWalk} {zh ? zhText.minutes : "min"}</dd></div>
      </dl>

      <div className="mt-2 text-xs font-bold text-ink/60">
        {zh ? zhText.transfer : "Transfers"}: {transfers}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {lines.map((line) => (
          <span key={line.code} className="inline-flex items-center gap-2 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-ink/75">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: line.color }} aria-hidden="true" />
            {localizedText(line.name, language)}
          </span>
        ))}
      </div>

      <div className="mt-3 border-t border-ink/10 pt-3">
        <p className="text-xs font-extrabold uppercase text-ink/50">{zh ? zhText.routeStations : "Estimated stations used today"}</p>
        <ol className="mt-2 grid gap-2">
          {stations.map((station, index) => (
            <li key={station.id} className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 text-sm">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-xs font-bold text-white">{index + 1}</span>
              <span className="min-w-0">
                <strong className="block truncate">{localizedText(station.name, language)}</strong>
                {station.code && <span className="text-xs font-semibold text-ink/45">{station.code}</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {publicTransportLegs.length > 0 && (
        <div className="mt-3 border-t border-ink/10 pt-3">
          <p className="text-xs font-extrabold uppercase text-ink/50">{zh ? zhText.routeLegs : "Public transport legs"}</p>
          <ol className="mt-2 grid gap-2">
            {publicTransportLegs.map((routeLeg, index) => (
              <li key={`${routeLeg.mode}-${routeLeg.route ?? "walk"}-${index}`} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-xs">
                <span className="rounded-md bg-ink/5 px-1.5 py-1 text-center font-extrabold text-ink/70">{routeLeg.route ?? routeLeg.mode}</span>
                <span className="min-w-0 truncate font-semibold text-ink/70">
                  {[routeLeg.fromName, routeLeg.toName].filter(Boolean).join(" -> ") || routeLeg.mode}
                </span>
                <span className="font-bold text-ink/50">
                  {routeLeg.durationMinutes ?? 0} {zh ? zhText.minutes : "min"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="mt-3 text-xs leading-5 text-ink/55">
        {sourceCopy}
      </p>
      {source?.url && <a href={source.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-lake underline">
        {source.name}
      </a>}
    </section>
  );
}
