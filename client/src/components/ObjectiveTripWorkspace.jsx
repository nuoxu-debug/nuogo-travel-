import { CheckCircle2, Edit3, ExternalLink, LockKeyhole, MapPinned, RefreshCw, Route, Save, Trash2, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { displayLabel, localizedText } from "../i18n/display.js";
import LeafletRouteMap from "./LeafletRouteMap.jsx";
import PrivacyDialog from "./PrivacyDialog.jsx";
import TripLegRow from "./TripLegRow.jsx";
import DailyItinerarySummary from "./DailyItinerarySummary.jsx";
import ItineraryActivityDetails from "./ItineraryActivityDetails.jsx";
import MealDetails from "./MealDetails.jsx";
import ProfileBudgetSummary from "./ProfileBudgetSummary.jsx";
import SelectedAttractionOutcome from "./SelectedAttractionOutcome.jsx";
import RainyDayBackup from "./RainyDayBackup.jsx";

const budgetLabels = {
  accommodation: ["Accommodation", "住宿"],
  localTransportation: ["Local transportation", "市内交通"],
  foodAndBeverages: ["Food and beverages", "餐饮"],
  attractionTickets: ["Attraction tickets", "景点门票"],
  entertainmentActivities: ["Entertainment and activities", "娱乐与活动"],
  other: ["Other", "其他"]
};

function sgd(minor) {
  return `S$ ${(Number(minor ?? 0) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function pointLabel(point, language = "en") {
  return displayLabel(language, "point", point?.locationType);
}

function activityLabel(activity, language = "en") {
  if (activity.presentation?.name || activity.poi?.displayName || activity.poi?.name) {
    return localizedText(activity.presentation?.name ?? activity.poi?.displayName ?? activity.poi?.name, language);
  }
  return displayLabel(language, "activity", activity.activityType);
}

function activityKey(activity) {
  return activity.xid ?? `${activity.activityType}-${activity.sequence}`;
}

function mapActivity(activity, language) {
  const address = typeof activity.poi?.address === "string" ? activity.poi.address : activity.poi?.address?.[language] ?? activity.poi?.address?.en;
  return {
    id: activity.xid,
    name: { en: activityLabel(activity), zh: activityLabel(activity, "zh") },
    startTime: activity.scheduledStartTime ?? activity.plannedStartTime,
    endTime: activity.scheduledEndTime ?? activity.plannedStartTime,
    address: { en: address ?? "Source-matched point of interest", zh: address ?? "与来源资料匹配的景点" },
    location: activity.poi?.coordinates,
    locationIsEstimated: false
  };
}

function mapAnchor(point, label, time, language) {
  const name = `${label}: ${pointLabel(point, language)}`;
  return {
    id: `anchor-${label.toLowerCase()}-${point.locationId}`,
    name: { en: name, zh: name },
    startTime: time,
    endTime: time,
    address: { en: "Estimated journey anchor", zh: "估算的行程位置" },
    location: point.coordinates,
    locationIsEstimated: true
  };
}

function activityCostLabel(activity, language = "en") {
  if (!activity.estimatedActivityCostMinor) return null;
  const suffix = language === "zh" ? (activity.activityType === "FOOD" ? "预计餐费" : activity.activityType === "ENTERTAINMENT" ? "预计活动费用" : "预计门票") : activity.activityType === "FOOD"
    ? "estimated meal"
    : activity.activityType === "ENTERTAINMENT" ? "estimated activity" : "estimated entry";
  return `${sgd(activity.estimatedActivityCostMinor)} ${suffix}`;
}

function EntryEditor({ activity, busy, error, language, onSave }) {
  const zh = language === "zh";
  const [plannedStartTime, setPlannedStartTime] = useState(activity.plannedStartTime);
  const [plannedDurationMinutes, setPlannedDurationMinutes] = useState(activity.plannedDurationMinutes);
  useEffect(() => {
    setPlannedStartTime(activity.plannedStartTime);
    setPlannedDurationMinutes(activity.plannedDurationMinutes);
  }, [activity]);
  return (
    <form className="mt-5 border-t border-ink/10 pt-5" onSubmit={(event) => {
      event.preventDefault();
      onSave({ plannedStartTime, plannedDurationMinutes: Number(plannedDurationMinutes) });
    }}>
      <p className="text-sm font-bold text-ink">{zh ? "调整行程时间" : "Adjust itinerary timing"}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold text-ink/65">
          {zh ? "开始时间" : "Start time"}
          <input aria-label={zh ? "开始时间" : "Start time"} type="time" required value={plannedStartTime} onChange={(event) => setPlannedStartTime(event.target.value)} className="field-control" disabled={busy} />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink/65">
          {zh ? "时长（分钟）" : "Duration in minutes"}
          <input aria-label={zh ? "时长（分钟）" : "Duration in minutes"} type="number" min="15" max="720" required value={plannedDurationMinutes} onChange={(event) => setPlannedDurationMinutes(event.target.value)} className="field-control" disabled={busy} />
        </label>
      </div>
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-vermilion">{error}</p>}
      <button type="submit" disabled={busy} className="mt-4 min-h-11 rounded-lg bg-ink px-4 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-50">
        {busy ? (zh ? "正在重新验证…" : "Revalidating…") : (zh ? "保存行程调整" : "Save entry changes")}
      </button>
    </form>
  );
}

function ActivityDetails({ activity, onClose, language, canEdit, onSave, editBusy, editError }) {
  if (!activity) return null;
  const label = activityLabel(activity, language);
  if (!activity.xid) {
    return (
      <div className="fixed inset-0 z-[1200] grid place-items-center bg-ink/45 p-4" onMouseDown={onClose}>
        <section role="dialog" aria-modal="true" aria-label={`${label}${language === "zh" ? "详情" : " details"}`} className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-paper p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase text-lake">{language === "zh" ? "行程条目" : "Schedule entry"}</p>
              <h2 className="mt-2 font-display text-2xl font-bold">{label}</h2>
            </div>
            <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-ink/15 px-4 text-sm font-bold">{language === "zh" ? "关闭" : "Close"}</button>
          </div>
          <section role="region" aria-label={language === "zh" ? "AI 生成理由" : "AI rationale"} className="mt-6 border-t border-ink/10 pt-5">
            <p className="text-xs font-bold uppercase text-lake">{language === "zh" ? "AI 生成理由" : "AI rationale"}</p>
            <p className="mt-2 leading-7 text-ink/65">{activity.reason}</p>
            <p className="mt-3 text-sm text-ink/55">{language === "zh" ? "AI 编排时长" : "AI-sequenced duration"}: {activity.plannedDurationMinutes} {language === "zh" ? "分钟" : "min"}</p>
          </section>
          <MealDetails activity={activity} />
          {canEdit && <EntryEditor activity={activity} busy={editBusy} error={editError} language={language} onSave={onSave} />}
        </section>
      </div>
    );
  }
  const poi = activity.poi ?? {};
  const provider = poi.sourceRecords?.find(({ provider: name, sourceId }) =>
    name === "OPENTRIPMAP" && sourceId === activity.xid);
  return (
    <div className="fixed inset-0 z-[1200] grid place-items-center bg-ink/45 p-4" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-label={`${poi.name}${language === "zh" ? "详情" : " details"}`} className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-paper p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase text-lake">{language === "zh" ? "与来源资料匹配的活动" : "Source-matched activity"}</p>
            <h2 className="mt-2 font-display text-2xl font-bold">{poi.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-ink/15 px-4 text-sm font-bold">{language === "zh" ? "关闭" : "Close"}</button>
        </div>
        <section role="region" aria-label={language === "zh" ? "OpenTripMap 提供方资料" : "OpenTripMap provider facts"} className="mt-6 border-t border-jade/20 bg-jade/5 p-4">
          <p className="text-xs font-bold uppercase text-jade">{language === "zh" ? "OpenTripMap 提供方资料" : "OpenTripMap provider facts"}</p>
          <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            <div><dt className="text-ink/45">{language === "zh" ? "提供方" : "Provider"}</dt><dd className="mt-1 font-semibold">{displayLabel(language, "source", provider?.provider ?? poi.primarySource)}</dd></div>
            <div><dt className="text-ink/45">OpenTripMap xid</dt><dd className="mt-1 break-all font-semibold">{activity.xid}</dd></div>
            <div><dt className="text-ink/45">{language === "zh" ? "城市" : "City"}</dt><dd className="mt-1 font-semibold">{poi.city}</dd></div>
            <div><dt className="text-ink/45">{language === "zh" ? "匹配状态" : "Match status"}</dt><dd className="mt-1 font-semibold">{displayLabel(language, "verification", poi.matchStatus)}</dd></div>
            <div><dt className="text-ink/45">{language === "zh" ? "核验状态" : "Verification status"}</dt><dd className="mt-1 font-semibold">{displayLabel(language, "verification", poi.verificationStatus)}</dd></div>
            <div><dt className="text-ink/45">{language === "zh" ? "检索时间" : "Retrieved at"}</dt><dd className="mt-1 font-semibold">{provider?.retrievedAt}</dd></div>
            <div><dt className="text-ink/45">{language === "zh" ? "类别" : "Category"}</dt><dd className="mt-1 font-semibold">{displayLabel(language, "category", poi.category)}</dd></div>
            <div><dt className="text-ink/45">{language === "zh" ? "地址" : "Address"}</dt><dd className="mt-1 font-semibold">{typeof poi.address === "string" ? poi.address : poi.address?.[language] ?? poi.address?.en}</dd></div>
          </dl>
          {provider?.sourceUrl && <a href={provider.sourceUrl} target="_blank" rel="noreferrer" aria-label={language === "zh" ? "查看 OpenTripMap 记录" : "View OpenTripMap record"} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-jade underline"><ExternalLink className="h-4 w-4" aria-hidden="true" />{language === "zh" ? "查看 OpenTripMap 记录" : "View OpenTripMap record"}</a>}
        </section>
        <section role="region" aria-label={language === "zh" ? "AI 生成理由" : "AI rationale"} className="mt-4 bg-lake/5 p-4">
          <p className="text-xs font-bold uppercase text-lake">{language === "zh" ? "AI 生成理由" : "AI rationale"}</p>
          <p className="mt-2 leading-7 text-ink/65">{activity.reason}</p>
          <p className="mt-3 text-sm text-ink/55">{language === "zh" ? "AI 编排时长" : "AI-sequenced duration"}: {activity.plannedDurationMinutes} {language === "zh" ? "分钟" : "min"}</p>
        </section>
        <section role="region" aria-label={language === "zh" ? "确定性估算" : "Deterministic estimate"} className="mt-4 bg-sky/5 p-4">
          <p className="text-xs font-bold uppercase text-sky">{language === "zh" ? "确定性估算" : "Deterministic estimate"}</p>
          <p className="mt-2 font-semibold">{activityCostLabel(activity, language) ?? (language === "zh" ? "没有单独的门票估算" : "No separate entry estimate")}</p>
        </section>
        <ItineraryActivityDetails activity={activity} />
        {canEdit && <EntryEditor activity={activity} busy={editBusy} error={editError} language={language} onSave={onSave} />}
      </section>
    </div>
  );
}

function BudgetSummary({ summary, language }) {
  const ratio = Math.min(100, Math.max(0, (summary.totalMinor / summary.budgetMinor) * 100));
  const hasCostReferences = Object.keys(summary.provenance ?? {}).length > 0;
  return (
    <section role="region" aria-label={language === "zh" ? "系统计算的行程预算" : "Deterministic trip budget"} className="border border-ink/10 bg-paper p-5">
      <p className="text-xs font-extrabold uppercase text-jade">{language === "zh" ? "系统计算预算" : "Deterministic budget"}</p>
      {hasCostReferences && <p className="mt-1 text-xs font-semibold text-ink/55">{language === "zh" ? "数据库成本参考" : "Database-backed cost references"}</p>}
      <div className="mt-2 flex items-end justify-between gap-3">
        <strong className="font-display text-3xl">{sgd(summary.totalMinor)}</strong>
        <span className="pb-1 text-xs text-ink/45">{language === "zh" ? `总预算 ${sgd(summary.budgetMinor)}` : `of ${sgd(summary.budgetMinor)}`}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink/10"><div className="h-full bg-jade" style={{ width: `${ratio}%` }} /></div>
      <dl className="mt-5 grid gap-2.5">
        {Object.entries(budgetLabels).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-3 border-b border-ink/8 pb-2 text-sm">
            <dt className="text-ink/55">{label[language === "zh" ? 1 : 0]}</dt><dd className="font-bold">{sgd(summary.categoriesMinor[key])}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 font-bold text-jade">{language === "zh" ? `剩余 ${sgd(summary.remainingMinor)}` : `${sgd(summary.remainingMinor)} remaining`}</p>
      <p className="mt-1 text-sm text-ink/55">{language === "zh" ? `每人 ${sgd(summary.perPersonMinor)}` : `${sgd(summary.perPersonMinor)} per traveller`}</p>
    </section>
  );
}

function itineraryStyle(itinerary, fallback) {
  return itinerary?.travelStyle ?? itinerary?.variant ?? fallback;
}

export default function ObjectiveTripWorkspace({ trip, setTrip, access }) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const zh = language === "zh";
  const navigate = useNavigate();
  const archivedVariants = trip.variants ?? [];
  const variant = trip.itineraryRun
    ?? archivedVariants.find((item) => itineraryStyle(item.itinerary, item.summary?.profile) === trip.selectedVariantId)
    ?? archivedVariants[0];
  const selectedTravelStyle = itineraryStyle(variant.itinerary, variant.summary?.profile ?? trip.preferences?.travelStyle);
  const [activeDayNumber, setActiveDayNumber] = useState(variant.itinerary.days[0]?.dayNumber);
  const [detail, setDetail] = useState(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [status, setStatus] = useState(trip.generationState ?? variant.state);
  const [busy, setBusy] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [notice, setNotice] = useState("");
  const [versioningOpen, setVersioningOpen] = useState(false);
  const [versionBudget, setVersionBudget] = useState(trip.budgetMinor);
  const validation = trip.validation ?? variant.validation;
  const groundedAttractionCount = variant.itinerary.days.reduce((count, item) => (
    count + item.activities.filter((activity) => activity.xid && activity.poi).length
  ), 0);
  const withinBudget = variant.summary.totalMinor <= variant.summary.budgetMinor;
  const day = variant.itinerary.days.find((item) => item.dayNumber === activeDayNumber) ?? variant.itinerary.days[0];
  const activityLegs = useMemo(() => {
    let legIndex = 0;
    return day.activities.map((activity) => {
      if (!activity.xid) return undefined;
      const index = legIndex++;
      const leg = day.legs?.[index];
      return leg ? { ...leg, presentation: day.presentation?.transport?.[index] } : undefined;
    });
  }, [day]);
  const finalLegIndex = day.activities.filter((activity) => activity.xid).length;
  const finalLeg = day.legs?.[finalLegIndex]
    ? { ...day.legs[finalLegIndex], presentation: day.presentation?.transport?.[finalLegIndex] }
    : undefined;
  const mapActivities = useMemo(() => [
    ...(day.startPoint?.coordinates ? [mapAnchor(day.startPoint, zh ? "起点" : "Start", day.activities[0]?.scheduledStartTime ?? "08:00", language)] : []),
    ...day.activities.filter((activity) => activity.xid && activity.poi?.coordinates).map((activity) => mapActivity(activity, language)),
    ...(day.endPoint?.coordinates ? [mapAnchor(day.endPoint, zh ? "终点" : "End", day.activities.at(-1)?.scheduledEndTime ?? "20:00", language)] : [])
  ], [day, language, zh]);

  const tripTitle = typeof trip.title === "string" ? trip.title : trip.title?.[language] ?? trip.title?.en;

  async function rename() {
    const title = window.prompt(zh ? "行程名称" : "Trip name", tripTitle);
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

  async function regenerate(preferences = {}) {
    setBusy(true);
    setStatus("REVALIDATING");
    try {
      const result = await apiRequest(`/trips/${trip.id}/regenerate`, {
        method: "POST",
        body: JSON.stringify({ expectedRevision: trip.revision, preferences })
      });
      const next = { ...result.trip, itineraryRun: result.itineraryRun, validation: result.validation, generationState: result.state, objectiveAligned: true, revision: result.trip.revision ?? 0 };
      sessionStorage.setItem(`nuogo-trip-${next.id}`, JSON.stringify(next));
      navigate(`/trip/${next.id}`);
    } catch {
      setStatus("FAILED");
    } finally {
      setBusy(false);
    }
  }

  async function saveEntry(patch) {
    setEditBusy(true);
    setEditError("");
    setNotice("");
    const entryId = `${selectedTravelStyle}:${day.dayNumber}:${detail.sequence}`;
    try {
      const body = await apiRequest(`/trips/${trip.id}/entries/${encodeURIComponent(entryId)}`, {
        method: "PATCH",
        body: JSON.stringify({ expectedRevision: trip.revision, ...patch })
      });
      setTrip(body.trip);
      sessionStorage.setItem(`nuogo-trip-${body.trip.id}`, JSON.stringify(body.trip));
      const updatedVariant = body.trip.itineraryRun
        ?? body.trip.variants?.find((item) => itineraryStyle(item.itinerary, item.summary?.profile) === selectedTravelStyle);
      const updatedDay = updatedVariant?.itinerary.days.find((item) => item.dayNumber === day.dayNumber);
      setDetail(updatedDay?.activities.find((item) => item.sequence === detail.sequence) ?? null);
      setStatus("FINAL_VALIDATED");
      setNotice(zh ? "行程条目已保存并重新验证。" : "Entry saved and itinerary revalidated.");
    } catch (error) {
      const code = error.details?.issueCodes?.[0] ?? error.code;
      setEditError(displayLabel(language, "error", code));
    } finally {
      setEditBusy(false);
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

  async function claimGuestTrip() {
    const key = `nuogo-guest-claim-${trip.id}`;
    const claimToken = sessionStorage.getItem(key);
    if (!claimToken) return;
    setBusy(true);
    try {
      const body = await apiRequest(`/trips/${trip.id}/claim`, {
        method: "POST",
        body: JSON.stringify({ claimToken })
      });
      sessionStorage.removeItem(key);
      setTrip((current) => ({ ...current, ...body.trip }));
      setNotice(zh ? "行程已保存到你的账户。" : "Itinerary saved to your account.");
    } catch {
      setNotice(zh ? "暂时无法保存此行程，请重新登录后再试。" : "This itinerary could not be saved. Sign in again and retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-mist">
      <header className="border-b border-ink/10 bg-paper px-5 py-6 sm:px-8">
        <div className="mx-auto flex max-w-[1520px] flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase text-lake">{zh ? "已验证行程工作区" : "Validated trip workspace"} {"\u00b7"} {displayLabel(language, "profile", selectedTravelStyle)}</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">{tripTitle ?? `${trip.destination}${zh ? "行程" : " journey"}`}</h1>
            <p className="mt-2 text-sm text-ink/55">{trip.startDate} - {trip.endDate} {"\u00b7"} {trip.travellerCount} {zh ? "人" : "travellers"}</p>
          </div>
          {access?.canEdit && <div className="flex flex-wrap gap-2">
            {user?.accountType === "GUEST" && sessionStorage.getItem(`nuogo-guest-claim-${trip.id}`) && <button type="button" aria-label={zh ? "登录后保存行程" : "Sign in to save itinerary"} onClick={() => navigate(`/register?returnTo=${encodeURIComponent(`/trip/${trip.id}`)}`)} className="flex min-h-11 items-center gap-2 rounded-lg bg-jade px-3 text-sm font-bold text-white"><Save className="h-4 w-4" /> {zh ? "登录后保存" : "Sign in to save"}</button>}
            {user?.accountType !== "GUEST" && sessionStorage.getItem(`nuogo-guest-claim-${trip.id}`) && <button type="button" aria-label={zh ? "将行程保存到我的账户" : "Save itinerary to my account"} onClick={claimGuestTrip} disabled={busy} className="flex min-h-11 items-center gap-2 rounded-lg bg-jade px-3 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" /> {zh ? "保存到我的账户" : "Save to my account"}</button>}
            <button type="button" aria-label={zh ? "重命名行程" : "Rename trip"} onClick={rename} className="flex min-h-11 items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold"><Edit3 className="h-4 w-4" /> {zh ? "重命名" : "Rename"}</button>
            <button type="button" aria-label={zh ? "编辑偏好" : "Edit preferences"} onClick={() => { setVersioningOpen((open) => !open); setStatus("INVALIDATED"); }} className="flex min-h-11 items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold"><Route className="h-4 w-4" /> {zh ? "编辑偏好" : "Edit preferences"}</button>
            <button type="button" aria-label={zh ? "重新生成行程" : "Regenerate trip"} disabled={busy} onClick={() => regenerate()} className="flex min-h-11 items-center gap-2 rounded-lg bg-ink px-3 text-sm font-bold text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> {zh ? "重新生成" : "Regenerate"}</button>
            <button type="button" aria-label={zh ? "隐私与 AI" : "Privacy and AI"} onClick={() => setPrivacyOpen(true)} className="flex min-h-11 items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold"><LockKeyhole className="h-4 w-4" /> {zh ? "隐私与 AI" : "Privacy and AI"}</button>
            <button type="button" aria-label={zh ? "删除行程" : "Delete trip"} onClick={remove} className="grid h-11 w-11 place-items-center rounded-lg border border-red-200 text-red-700"><Trash2 className="h-4 w-4" /></button>
          </div>}
        </div>
        {status !== "FINAL_VALIDATED" && <div role="status" className="mx-auto mt-4 flex max-w-[1520px] items-center justify-between gap-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900"><span>{displayLabel(language, "status", status)}: {zh ? "偏好已更改，请创建并验证新的行程版本。" : "Preferences changed; create and validate a new trip version."}</span><button type="button" aria-label={zh ? "重新验证行程" : "Revalidate itinerary"} disabled={busy} onClick={() => regenerate()} className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-ink px-4 text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> {zh ? "重新验证" : "Revalidate itinerary"}</button></div>}
        {notice && <p role="status" className="mx-auto mt-4 max-w-[1520px] rounded-lg bg-jade/10 px-4 py-3 text-sm font-bold text-jade">{notice}</p>}
        {versioningOpen && <form onSubmit={(event) => { event.preventDefault(); regenerate({ budgetMinor: Number(versionBudget) }); }} className="mx-auto mt-4 grid max-w-[1520px] gap-4 border-t border-ink/10 pt-4 sm:grid-cols-[minmax(220px,360px)_auto] sm:items-end">
          <label className="grid gap-1.5 text-sm font-semibold text-ink/65">{zh ? "总预算（新币）" : "Hard budget in SGD"}<input aria-label={zh ? "总预算（新币）" : "Hard budget in SGD"} type="number" min="100" max="1000000" required value={versionBudget} onChange={(event) => setVersionBudget(event.target.value)} className="field-control" disabled={busy} /></label>
          <button type="submit" aria-label={zh ? "创建新的行程版本" : "Create new trip version"} disabled={busy} className="min-h-11 rounded-lg bg-lake px-4 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-50">{busy ? (zh ? "正在生成…" : "Generating…") : (zh ? "创建新版本" : "Create new trip version")}</button>
        </form>}
      </header>

      <main className="mx-auto max-w-[1520px] px-4 py-4">
        {status === "FINAL_VALIDATED" && validation?.valid && <section role="region" aria-label={zh ? "行程校验摘要" : "Itinerary validation summary"} className="mb-4 flex flex-wrap gap-x-6 gap-y-2 border-y border-ink/10 bg-paper px-4 py-3 text-sm font-bold text-jade">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{zh ? "已通过校验" : "Validated"}</span>
          {withinBudget && <span className="flex items-center gap-2"><WalletCards className="h-4 w-4" />{zh ? "符合总预算上限" : "Within hard budget"}</span>}
          <span className="flex items-center gap-2"><MapPinned className="h-4 w-4" />{zh ? `有来源景点：${groundedAttractionCount}` : `Grounded attractions: ${groundedAttractionCount}`}</span>
        </section>}
        <nav aria-label={zh ? "行程日期" : "Trip days"} className="mb-4 flex gap-2 overflow-x-auto border border-ink/10 bg-paper p-2">
          {variant.itinerary.days.map((item) => <button key={item.dayNumber} type="button" onClick={() => setActiveDayNumber(item.dayNumber)} aria-current={item.dayNumber === day.dayNumber ? "page" : undefined} className={`min-h-11 min-w-24 rounded-lg px-4 text-sm font-bold ${item.dayNumber === day.dayNumber ? "bg-ink text-white" : "hover:bg-ink/5"}`}>{zh ? `第 ${item.dayNumber} 天` : `Day ${item.dayNumber}`}</button>)}
        </nav>
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <div className="bg-paper px-4 py-4"><SelectedAttractionOutcome outcome={variant.selectedAttractionOutcome} mode={trip.preferences?.attractionSelectionMode} legacyPreferredSights={trip.preferences?.preferredSights ?? []} /></div>
          <RainyDayBackup backups={variant.rainyDayBackups} />
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,.72fr)] xl:grid-cols-[minmax(0,1fr)_minmax(340px,.72fr)_310px]">
          <section role="region" aria-label={zh ? `第 ${day.dayNumber} 天连续行程` : `Day ${day.dayNumber} continuous itinerary`} className="min-w-0 border border-ink/10 bg-paper p-4">
            <div className="mb-2 flex items-center justify-between"><div><p className="text-xs font-bold uppercase text-jade">{day.date}</p><h2 className="mt-1 font-display text-xl font-bold">{zh ? `第 ${day.dayNumber} 天路线` : `Day ${day.dayNumber} route`}</h2></div><span className="text-xs font-semibold text-ink/45">{day.activities.length} {zh ? "站" : "stops"}</span></div>
            <DailyItinerarySummary day={day} />
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-ink/[0.035] p-3 text-sm font-bold"><span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-white">S</span>{zh ? "起点" : "Start"} {"\u00b7"} {pointLabel(day.startPoint, language)}</div>
            {day.activities.map((activity, index) => (
              <div key={activityKey(activity)}>
                {activityLegs[index] && <TripLegRow leg={activityLegs[index]} />}
                <button type="button" aria-label={activityLabel(activity, language) + (zh ? "详情" : " details")} onClick={() => setDetail(activity)} className="w-full rounded-lg border border-ink/10 bg-white p-4 text-left transition-colors hover:border-lake focus-visible:outline focus-visible:outline-2 focus-visible:outline-lake">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase text-lake">{activity.scheduledStartTime ?? activity.plannedStartTime} {"\u00b7"} {activity.plannedDurationMinutes} {zh ? "分钟" : "min"} {"\u00b7"} {displayLabel(language, "activity", activity.activityType)}</p>
                      <h3 className="mt-1 font-display text-xl font-bold">{activityLabel(activity, language)}</h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/60"><span className="mr-2 text-xs font-bold uppercase text-lake">{zh ? "AI 生成理由" : "AI rationale"}</span>{activity.reason}</p>
                      {activityCostLabel(activity, language) && <p className="mt-2 text-xs font-bold text-sky"><span className="mr-2 uppercase">{zh ? "估算" : "Estimate"}</span>{activityCostLabel(activity, language)}</p>}
                    </div>
                    {activity.xid && activity.poi?.primarySource === "OPENTRIPMAP" && <span className="shrink-0 rounded-full bg-jade/10 px-2.5 py-1 text-xs font-bold text-jade">{zh ? "OpenTripMap 提供方资料" : "OpenTripMap facts"}</span>}
                  </div>
                </button>
              </div>
            ))}
            {finalLeg && <TripLegRow leg={finalLeg} />}
            <div className="flex items-center gap-3 rounded-lg bg-ink/[0.035] p-3 text-sm font-bold"><span className="grid h-8 w-8 place-items-center rounded-full border border-ink/20 bg-white">E</span>{zh ? "终点" : "End"} {"\u00b7"} {pointLabel(day.endPoint, language)}</div>
          </section>
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <LeafletRouteMap activities={mapActivities} selectedActivityId={detail?.xid} onSelect={(id) => setDetail(day.activities.find((activity) => activity.xid === id))} />
            <p className="border-x border-b border-ink/10 bg-paper px-3 py-2 text-xs leading-5 text-ink/55">{zh ? "出发地与酒店位置可能为估算值；景点坐标保留其数据提供方来源。" : "Origin and hotel anchors may be estimated; POI coordinates retain their provider source."}</p>
          </aside>
          <div className="min-w-0 bg-paper px-5 lg:col-span-2 xl:col-span-1"><ProfileBudgetSummary summary={variant.summary} /><BudgetSummary summary={variant.summary} language={language} /></div>
        </div>
      </main>
      <ActivityDetails activity={detail} onClose={() => { setDetail(null); setEditError(""); }} language={language} canEdit={access?.canEdit} onSave={saveEntry} editBusy={editBusy} editError={editError} />
      <PrivacyDialog open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
}
