import { Edit3, LockKeyhole, RefreshCw, Route, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import LeafletRouteMap from "./LeafletRouteMap.jsx";
import PrivacyDialog from "./PrivacyDialog.jsx";
import TripLegRow from "./TripLegRow.jsx";

const budgetLabels = {
  outboundTransport: "Outbound transport",
  returnTransport: "Return transport",
  accommodation: "Accommodation",
  localTransportation: "Local transportation",
  foodAndBeverages: "Food and beverages",
  attractionTickets: "Attraction tickets",
  entertainmentActivities: "Entertainment and activities",
  other: "Other"
};

function cny(fen) {
  return `CNY ${(Number(fen ?? 0) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function pointLabel(point) {
  return point?.locationType?.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase()) ?? "Point";
}

function mapActivity(activity) {
  const address = typeof activity.poi?.address === "string" ? activity.poi.address : activity.poi?.address?.en;
  return {
    id: activity.poiId,
    name: { en: activity.poi?.name ?? activity.poiId, zh: activity.poi?.name ?? activity.poiId },
    startTime: activity.scheduledStartTime ?? activity.plannedStartTime,
    endTime: activity.scheduledEndTime ?? activity.plannedStartTime,
    address: { en: address ?? "Verified point of interest", zh: address ?? "Verified point of interest" },
    location: activity.poi?.coordinates,
    locationIsEstimated: false
  };
}

function ActivityDetails({ activity, onClose }) {
  if (!activity) return null;
  const poi = activity.poi ?? {};
  return (
    <div className="fixed inset-0 z-[1200] grid place-items-center bg-ink/45 p-4" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-label={`${poi.name} details`} className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-paper p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase text-lake">Verified activity</p>
            <h2 className="mt-2 font-display text-2xl font-bold">{poi.name}</h2>
            <p className="mt-3 leading-7 text-ink/65">{activity.reason}</p>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-ink/15 px-4 text-sm font-bold">Close</button>
        </div>
        <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-ink/10 pt-5 text-sm sm:grid-cols-2">
          <div><dt className="text-ink/45">Canonical POI</dt><dd className="mt-1 font-semibold">{poi.canonicalPoiId}</dd></div>
          <div><dt className="text-ink/45">Primary source</dt><dd className="mt-1 font-semibold">{poi.primarySource}</dd></div>
          <div><dt className="text-ink/45">Category</dt><dd className="mt-1 font-semibold">{poi.category}</dd></div>
          <div><dt className="text-ink/45">Address</dt><dd className="mt-1 font-semibold">{typeof poi.address === "string" ? poi.address : poi.address?.en}</dd></div>
        </dl>
        <div className="mt-5 rounded-lg bg-ink/[0.035] p-4 text-xs text-ink/55">
          {(poi.sourceRecords ?? []).map((record) => <p key={`${record.provider}-${record.sourceId}`}>{record.provider} source record {record.sourceId}</p>)}
        </div>
      </section>
    </div>
  );
}

function BudgetSummary({ summary }) {
  const ratio = Math.min(100, Math.max(0, (summary.totalFen / summary.budgetFen) * 100));
  return (
    <section role="region" aria-label="Deterministic trip budget" className="border border-ink/10 bg-paper p-5">
      <p className="text-xs font-extrabold uppercase text-jade">Deterministic budget</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <strong className="font-display text-3xl">{cny(summary.totalFen)}</strong>
        <span className="pb-1 text-xs text-ink/45">of {cny(summary.budgetFen)}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink/10"><div className="h-full bg-jade" style={{ width: `${ratio}%` }} /></div>
      <dl className="mt-5 grid gap-2.5">
        {Object.entries(budgetLabels).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-3 border-b border-ink/8 pb-2 text-sm">
            <dt className="text-ink/55">{label}</dt><dd className="font-bold">{cny(summary.categoriesFen[key])}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 font-bold text-jade">{cny(summary.remainingFen)} remaining</p>
      <p className="mt-1 text-sm text-ink/55">{cny(summary.perPersonFen)} per traveller</p>
    </section>
  );
}

export default function ObjectiveTripWorkspace({ trip, setTrip, access }) {
  const navigate = useNavigate();
  const variant = trip.variants.find((item) => item.itinerary?.variant === trip.selectedVariantId) ?? trip.variants[0];
  const [activeDayNumber, setActiveDayNumber] = useState(variant.itinerary.days[0]?.dayNumber);
  const [detail, setDetail] = useState(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [status, setStatus] = useState(trip.generationState ?? variant.state);
  const [busy, setBusy] = useState(false);
  const day = variant.itinerary.days.find((item) => item.dayNumber === activeDayNumber) ?? variant.itinerary.days[0];
  const mapActivities = useMemo(() => day.activities.filter((activity) => activity.poi?.coordinates).map(mapActivity), [day]);

  const tripTitle = typeof trip.title === "string" ? trip.title : trip.title?.en;

  async function rename() {
    const title = window.prompt("Trip name", tripTitle);
    if (!title?.trim()) return;
    setBusy(true);
    try {
      const body = await apiRequest(`/trips/${trip.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: { en: title.trim(), zh: title.trim() },
          expectedRevision: trip.revision
        })
      });
      setTrip((current) => ({ ...current, ...body.trip, title: body.trip.title?.en ?? body.trip.title, revision: body.revision }));
    } catch {
      setStatus("FAILED");
    } finally {
      setBusy(false);
    }
  }

  async function revalidate() {
    setBusy(true);
    setStatus("REVALIDATING");
    try {
      const result = await apiRequest("/trips/generate", { method: "POST", body: JSON.stringify(trip.preferences) });
      const next = { ...result.trip, variants: result.variants, validation: result.validation, generationState: result.state, objectiveAligned: true, revision: 0, selectedVariantId: null };
      sessionStorage.setItem(`nuogo-trip-${next.id}`, JSON.stringify(next));
      navigate(`/compare/${next.id}`);
    } catch {
      setStatus("FAILED");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await apiRequest(`/trips/${trip.id}`, { method: "DELETE" });
      sessionStorage.removeItem(`nuogo-trip-${trip.id}`);
      navigate("/archive");
    } catch {
      setStatus("FAILED");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-mist">
      <header className="border-b border-ink/10 bg-paper px-5 py-6 sm:px-8">
        <div className="mx-auto flex max-w-[1520px] flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase text-lake">Validated trip workspace {"\u00b7"} {variant.itinerary.variant}</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">{tripTitle ?? `${trip.destination} journey`}</h1>
            <p className="mt-2 text-sm text-ink/55">{trip.startDate} - {trip.endDate} {"\u00b7"} {trip.travellerCount} travellers</p>
          </div>
          {access?.canEdit && <div className="flex flex-wrap gap-2">
            <button type="button" aria-label="Rename trip" onClick={rename} className="flex min-h-11 items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold"><Edit3 className="h-4 w-4" /> Rename</button>
            <button type="button" aria-label="Edit preferences" onClick={() => setStatus("INVALIDATED")} className="flex min-h-11 items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold"><Route className="h-4 w-4" /> Edit preferences</button>
            <button type="button" aria-label="Regenerate trip" disabled={busy} onClick={revalidate} className="flex min-h-11 items-center gap-2 rounded-lg bg-ink px-3 text-sm font-bold text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Regenerate</button>
            <button type="button" aria-label="Privacy and AI" onClick={() => setPrivacyOpen(true)} className="flex min-h-11 items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold"><LockKeyhole className="h-4 w-4" /> Privacy and AI</button>
            <button type="button" aria-label="Delete trip" onClick={remove} className="grid h-11 w-11 place-items-center rounded-lg border border-red-200 text-red-700"><Trash2 className="h-4 w-4" /></button>
          </div>}
        </div>
        {status !== "FINAL_VALIDATED" && <div role="status" className="mx-auto mt-4 flex max-w-[1520px] items-center justify-between gap-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900"><span>{status}: preferences changed; validate before relying on this itinerary.</span><button type="button" aria-label="Revalidate itinerary" disabled={busy} onClick={revalidate} className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-ink px-4 text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Revalidate itinerary</button></div>}
      </header>

      <main className="mx-auto max-w-[1520px] px-4 py-4">
        <nav aria-label="Trip days" className="mb-4 flex gap-2 overflow-x-auto border border-ink/10 bg-paper p-2">
          {variant.itinerary.days.map((item) => <button key={item.dayNumber} type="button" onClick={() => setActiveDayNumber(item.dayNumber)} aria-current={item.dayNumber === day.dayNumber ? "page" : undefined} className={`min-h-11 min-w-24 rounded-lg px-4 text-sm font-bold ${item.dayNumber === day.dayNumber ? "bg-ink text-white" : "hover:bg-ink/5"}`}>Day {item.dayNumber}</button>)}
        </nav>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,.72fr)] xl:grid-cols-[minmax(0,1fr)_minmax(340px,.72fr)_310px]">
          <section role="region" aria-label={`Day ${day.dayNumber} continuous itinerary`} className="min-w-0 border border-ink/10 bg-paper p-4">
            <div className="mb-2 flex items-center justify-between"><div><p className="text-xs font-bold uppercase text-jade">{day.date}</p><h2 className="mt-1 font-display text-xl font-bold">Day {day.dayNumber} route</h2></div><span className="text-xs font-semibold text-ink/45">{day.activities.length} stops</span></div>
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-ink/[0.035] p-3 text-sm font-bold"><span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-white">S</span>Start {"\u00b7"} {pointLabel(day.startPoint)}</div>
            {day.activities.map((activity, index) => <div key={activity.poiId}>{day.legs[index] && <TripLegRow leg={day.legs[index]} />}<button type="button" aria-label={`${activity.poi?.name ?? activity.poiId} details`} onClick={() => setDetail(activity)} className="w-full rounded-lg border border-ink/10 bg-white p-4 text-left transition-colors hover:border-lake focus-visible:outline focus-visible:outline-2 focus-visible:outline-lake"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase text-lake">{activity.scheduledStartTime ?? activity.plannedStartTime} {"\u00b7"} {activity.activityType.replaceAll("_", " ")}</p><h3 className="mt-1 font-display text-xl font-bold">{activity.poi?.name ?? activity.poiId}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/60">{activity.reason}</p></div><span className="rounded-full bg-jade/10 px-2.5 py-1 text-xs font-bold text-jade">{activity.poi?.primarySource}</span></div></button></div>)}
            {day.legs.at(-1) && <TripLegRow leg={day.legs.at(-1)} />}
            <div className="flex items-center gap-3 rounded-lg bg-ink/[0.035] p-3 text-sm font-bold"><span className="grid h-8 w-8 place-items-center rounded-full border border-ink/20 bg-white">E</span>End {"\u00b7"} {pointLabel(day.endPoint)}</div>
          </section>
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <LeafletRouteMap activities={mapActivities} selectedActivityId={detail?.poiId} onSelect={(id) => setDetail(day.activities.find((activity) => activity.poiId === id))} />
            <p className="border-x border-b border-ink/10 bg-paper px-3 py-2 text-xs leading-5 text-ink/55">Origin and hotel anchors may be estimated; POI coordinates retain their provider source.</p>
          </aside>
          <div className="min-w-0 lg:col-span-2 xl:col-span-1"><BudgetSummary summary={variant.summary} /></div>
        </div>
      </main>
      <ActivityDetails activity={detail} onClose={() => setDetail(null)} />
      <PrivacyDialog open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
}
