import { CheckCircle2, Edit3, ExternalLink, LockKeyhole, MapPinned, RefreshCw, Route, Save, Trash2, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import { ChevronDown, GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import { publicAssetPath } from "../assets.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { displayLabel, localizedText } from "../i18n/display.js";
import LeafletRouteMap from "./LeafletRouteMap.jsx";
import PrivacyDialog from "./PrivacyDialog.jsx";
import TripLegRow from "./TripLegRow.jsx";
import DailyItinerarySummary from "./DailyItinerarySummary.jsx";
import ItineraryActivityDetails from "./ItineraryActivityDetails.jsx";
import MealDetails from "./MealDetails.jsx";
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

const interestOptions = ["CULTURE", "HISTORY", "FOOD", "NATURE", "SHOPPING", "ENTERTAINMENT", "FAMILY"];
const travelStyleOptions = ["BUDGET_SAVING", "BALANCED", "COMFORT_FOCUSED"];
const transportPreferenceOptions = ["AUTO_CHEAPEST", "PUBLIC_TRANSIT", "WALK", "TAXI"];
const dailyAttractionOptions = [1, 2, 3, 4, 5, 6, 7, 8];

const attractionImageById = {
  "demo-sg-gardens-by-the-bay": "gardens-by-the-bay.png",
  "demo-sg-national-gallery": "national-gallery.jpg",
  "demo-sg-asian-civilisations-museum": "asian-civilisations-museum.jpg",
  "demo-sg-botanic-gardens": "botanic-gardens.jpg",
  "demo-sg-fort-canning": "fort-canning.jpg",
  "demo-sg-merlion-park": "merlion.png",
  "demo-sg-artscience-museum": "artscience-museum.jpg",
  "demo-sg-chinatown": "chinatown.png",
  "demo-sg-kampong-gelam": "kampong-glam.png",
  "demo-sg-little-india": "little-india.png",
  "demo-sg-sentosa": "sentosa.jpg",
  "demo-sg-marina-bay-sands": "marina-bay-sands.jpg",
  "demo-sg-jewel-changi-airport": "jewel-changi.jpg",
  "demo-sg-universal-studios": "universal-studios.jpg",
  "demo-sg-singapore-zoo": "singapore-zoo.jpg",
  "demo-sg-night-safari": "night-safari.jpg",
  "demo-sg-river-wonders": "river-wonders.jpg",
  "demo-sg-bird-paradise": "bird-paradise.jpg",
  "demo-sg-sea-aquarium": "sea-aquarium.jpg",
  "demo-sg-adventure-cove": "adventure-cove.jpg",
  "demo-sg-wings-of-time": "wings-of-time.jpg",
  "demo-sg-skyhelix-sentosa": "sentosa.jpg",
  "demo-sg-mount-faber-park": "mount-faber-park.jpg",
  "demo-sg-southern-ridges": "henderson-waves.jpg",
  "demo-sg-henderson-waves": "henderson-waves.jpg",
  "demo-sg-clarke-quay": "clarke-quay.jpg",
  "demo-sg-orchard-road": "orchard-road.jpg",
  "demo-sg-jewel-rain-vortex": "jewel-changi.jpg",
  "demo-sg-national-museum": "national-museum.jpg",
  "demo-sg-peranakan-museum": "peranakan-museum.jpg",
  "demo-sg-singapore-art-museum": "singapore-art-museum.jpg",
  "demo-sg-mint-museum-of-toys": "mint-museum-of-toys.jpg",
  "demo-sg-buddha-tooth-relic-temple": "buddha-tooth-relic-temple.jpg",
  "demo-sg-sri-mariamman-temple": "sri-mariamman-temple.jpg",
  "demo-sg-sultan-mosque": "sultan-mosque.jpg",
  "demo-sg-thian-hock-keng": "thian-hock-keng.jpg",
  "demo-sg-haw-par-villa": "haw-par-villa.jpg",
  "demo-sg-esplanade": "esplanade.jpg",
  "demo-sg-helix-bridge": "helix-bridge.jpg",
  "demo-sg-singapore-flyer": "singapore-flyer.jpg",
  "demo-sg-east-coast-park": "east-coast-park.jpg",
  "demo-sg-macritchie-reservoir": "macritchie-reservoir.jpg",
  "demo-sg-sungei-buloh": "sungei-buloh.jpg",
  "demo-sg-jurong-lake-gardens": "jurong-lake-gardens.jpg",
  "demo-sg-chinese-japanese-gardens": "chinese-japanese-gardens.jpg",
  "demo-sg-lazarus-island": "lazarus-island.jpg",
  "demo-sg-st-johns-island": "st-johns-island.jpg",
  "demo-sg-civic-district": "civic-district.jpg",
  "demo-sg-raffles-hotel": "raffles-hotel.jpg",
  "demo-sg-maxwell-food-centre": "maxwell-food-centre.jpg",
  "demo-sg-lau-pa-sat": "lau-pa-sat.jpg"
};

function sgd(minor) {
  return `S$ ${(Number(minor ?? 0) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function minorToSgdValue(minor) {
  return String(Number(minor ?? 0) / 100);
}

function sgdValueToMinor(value) {
  return Math.round(Number(value) * 100);
}

function editablePreferenceLabels(language) {
  const zh = language === "zh";
  return {
    travellers: zh ? "旅行人数" : "Travellers",
    style: zh ? "旅行风格" : "Travel style",
    dailyTarget: zh ? "每日景点目标" : "Daily attraction target",
    transport: zh ? "交通偏好" : "Transport preference",
    interests: zh ? "旅行兴趣" : "Travel interests",
    rainy: zh ? "加入雨天备选" : "Include rainy-day backup",
    other: zh ? "其他偏好" : "Other preferences",
    autoTransport: zh ? "自动选择" : "Auto choose",
    publicTransit: zh ? "地铁 / 巴士" : "MRT / Bus",
    walk: zh ? "步行" : "Walking",
    taxi: zh ? "出租车 / 网约车" : "Taxi / Ride-hail"
  };
}

function transportPreferenceLabel(labels, value) {
  return {
    AUTO_CHEAPEST: labels.autoTransport,
    PUBLIC_TRANSIT: labels.publicTransit,
    WALK: labels.walk,
    TAXI: labels.taxi
  }[value] ?? labels.autoTransport;
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
    locationIsEstimated: false,
    activityType: activity.activityType,
    durationMinutes: activity.plannedDurationMinutes,
    imageUrl: attractionImage(activity),
    costLabel: activityCostLabel(activity, language),
    canOpenDetails: true
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

function sourceRecordFor(activity) {
  const records = activity.poi?.sourceRecords ?? [];
  return records.find(({ provider, sourceId }) => provider === "OPENTRIPMAP" && sourceId === activity.xid)
    ?? records[0]
    ?? null;
}

function operatingHoursVerification(activity) {
  return activity.operatingHoursVerification ?? activity.openingHoursVerification ?? null;
}

function openingHoursText(activity, language) {
  return operatingHoursVerification(activity)?.state === "VERIFIED_OPEN"
    ? (language === "zh" ? "开放时间已验证" : "Opening hours verified")
    : (language === "zh" ? "开放时间未验证 - 到访前请再次确认。" : "Opening hours not verified - please confirm before visiting.");
}

function sourceBackedPriceReference(activity) {
  const reference = activity.priceReference ?? activity.costReference ?? activity.costProvenance ?? null;
  if (!reference || !["EXACT", "FREE"].includes(reference.referenceType)) return null;
  if (!reference.sourceName && !reference.sourceUrl) return null;
  return reference;
}

function priceVerificationText(activity, language) {
  return sourceBackedPriceReference(activity)
    ? (language === "zh" ? "来源支持型规划价格" : "Source-backed planning price")
    : (language === "zh" ? "估算规划价格" : "Estimated planning price");
}

function activityVerificationChips(activity, language) {
  if (!activity.xid) return [];
  const chips = [openingHoursText(activity, language)];
  if (activity.estimatedActivityCostMinor !== undefined) chips.push(priceVerificationText(activity, language));
  if (sourceRecordFor(activity)) {
    chips.push(language === "zh" ? "来源支持型景点信息" : "Source-backed attraction information");
  }
  return chips;
}

function attractionImage(activity) {
  const file = attractionImageById[activity.xid];
  return file ? publicAssetPath(`/images/attractions/${file}`) : null;
}

function activityChips(activity, language) {
  const chips = [displayLabel(language, "activity", activity.activityType)];
  if (activity.poi?.category) chips.push(displayLabel(language, "category", activity.poi.category));
  if (activity.poi?.kinds?.includes?.("indoor")) chips.push(language === "zh" ? "室内" : "Indoor");
  if (activity.poi?.primarySource) chips.push(displayLabel(language, "source", activity.poi.primarySource));
  return [...new Set(chips.filter(Boolean))].slice(0, 3);
}

function SourcePanel({ title, record, status, language }) {
  const sourceName = record?.sourceName ?? record?.provider ?? record?.sourceType;
  const reviewed = record?.lastReviewedDate ?? record?.collectedOn ?? record?.retrievedAt;
  const sourceUrl = record?.sourceUrl;
  return (
    <section role="region" aria-label={title} className="min-w-0 rounded-lg bg-white p-3">
      <p className="text-xs font-extrabold uppercase text-ink/45">{title}</p>
      {status && <p className="mt-2 text-sm font-bold text-ink">{status}</p>}
      {sourceName && <p className="mt-1 break-words text-sm font-semibold text-ink/65">{sourceName}</p>}
      {reviewed && <p className="mt-1 text-xs font-semibold text-ink/45">{language === "zh" ? "已记录" : "Recorded"}: {reviewed}</p>}
      {sourceUrl
        ? <a href={sourceUrl} target="_blank" rel="noreferrer" aria-label={`View Source for ${title}`} className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-xs font-extrabold text-jade underline"><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />{language === "zh" ? "查看来源" : "View Source"}</a>
        : <p className="mt-3 text-xs font-bold text-ink/50">{language === "zh" ? "来源不可用" : "Source not available"}</p>}
    </section>
  );
}

function DataSourcesNotice({ itinerary, summary, language }) {
  const zh = language === "zh";
  const title = zh ? "数据来源与使用提示" : "Data Sources & Travel Notice";
  const paragraphs = zh ? [
    "本行程由 Nuogo 结合 AI 辅助规划及系统中可用的来源支持型旅游数据生成。景点信息、参考价格及开放时间可能来自 OpenTripMap、景点官方网站、官方票务页面或其他已记录的数据来源。",
    "尽管 Nuogo 会对预算、景点信息及可用的开放时间数据进行验证，旅游信息仍可能因票价调整、节假日安排、临时关闭、天气或其他运营变化而发生改变，AI 生成的建议也可能存在遗漏或误差。",
    "因此，本行程仅作为旅行规划参考。涉及门票购买、营业时间及重要出行安排时，建议用户在出发前再次通过相关景点的官方网站确认最新信息。"
  ] : [
    "This itinerary is generated by Nuogo using AI-assisted planning together with available source-backed tourism data. Attraction information, planning prices, and operating hours may be obtained from OpenTripMap, official attraction websites, official ticketing pages, or other recorded sources.",
    "Although Nuogo validates budget calculations, attraction information, and available operating-hour records, tourism information may change due to price updates, public holidays, temporary closures, weather, or other operational changes. AI-generated recommendations may also contain omissions or inaccuracies.",
    "This itinerary should therefore be used as a planning reference. Users are advised to confirm important information, especially ticket prices and operating hours, with the relevant official source before visiting or making a purchase."
  ];
  const activitySources = itinerary.days.flatMap((day) => day.activities.map((activity) => ({
    activity,
    name: activityLabel(activity, language),
    source: sourceRecordFor(activity),
    price: sourceBackedPriceReference(activity),
    hours: operatingHoursVerification(activity)
  }))).filter(({ source, price, hours }) => source || price || hours);
  const budgetSources = Object.entries(summary.provenance ?? {}).filter(([, record]) => record?.sourceName || record?.sourceUrl);
  return (
    <section role="region" aria-label={title} className="mt-4 rounded-lg border border-ink/10 bg-paper p-4">
      <p className="text-xs font-extrabold uppercase text-lake">{title}</p>
      <div className="mt-3 grid gap-3 text-sm leading-6 text-ink/68">
        {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
      <details className="mt-3 group">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-ink">
          <span>{zh ? "查看数据来源" : "View Data Sources"}</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="mt-3 grid gap-2 text-sm text-ink/62">
          {activitySources.map(({ activity, name, source, price, hours }) => (
            <li key={`${activity.sequence}-${activity.xid ?? name}`} className="rounded-lg bg-white px-3 py-2">
              <strong className="block text-ink">{name}</strong>
              <span className="block">{source?.provider ?? source?.sourceType ?? (zh ? "景点来源未记录" : "Attraction source not recorded")}</span>
              {price && <span className="block">{zh ? "价格来源" : "Price source"}: {price.sourceName ?? (zh ? "已记录" : "Recorded")}</span>}
              {hours && <span className="block">{zh ? "开放时间状态" : "Opening-hours state"}: {hours.state ?? "UNVERIFIED"}</span>}
            </li>
          ))}
          {budgetSources.map(([category, record]) => (
            <li key={category} className="rounded-lg bg-white px-3 py-2">
              <strong className="block text-ink">{budgetLabels[category]?.[zh ? 1 : 0] ?? category}</strong>
              <span>{record.sourceName ?? (zh ? "已记录价格来源" : "Recorded price source")}</span>
            </li>
          ))}
          {activitySources.length === 0 && budgetSources.length === 0 && <li className="rounded-lg bg-white px-3 py-2">{zh ? "当前行程没有可显示的数据来源明细。" : "No displayable source records are attached to this itinerary."}</li>}
        </ul>
      </details>
    </section>
  );
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
        {busy ? (zh ? "正在重新验证..." : "Revalidating...") : (zh ? "保存行程调整" : "Save entry changes")}
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
  const provider = sourceRecordFor(activity);
  const priceReference = sourceBackedPriceReference(activity);
  const hoursVerification = operatingHoursVerification(activity);
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
            <div><dt className="text-ink/45">{language === "zh" ? "鍩庡競" : "City"}</dt><dd className="mt-1 font-semibold">{poi.city}</dd></div>
            <div><dt className="text-ink/45">{language === "zh" ? "匹配状态" : "Match status"}</dt><dd className="mt-1 font-semibold">{displayLabel(language, "verification", poi.matchStatus)}</dd></div>
            <div><dt className="text-ink/45">{language === "zh" ? "核验状态" : "Verification status"}</dt><dd className="mt-1 font-semibold">{displayLabel(language, "verification", poi.verificationStatus)}</dd></div>
            <div><dt className="text-ink/45">{language === "zh" ? "检索时间" : "Retrieved at"}</dt><dd className="mt-1 font-semibold">{provider?.retrievedAt}</dd></div>
            <div><dt className="text-ink/45">{language === "zh" ? "绫诲埆" : "Category"}</dt><dd className="mt-1 font-semibold">{displayLabel(language, "category", poi.category)}</dd></div>
            <div><dt className="text-ink/45">{language === "zh" ? "地址" : "Address"}</dt><dd className="mt-1 font-semibold">{typeof poi.address === "string" ? poi.address : poi.address?.[language] ?? poi.address?.en}</dd></div>
          </dl>
          {provider?.sourceUrl && <a href={provider.sourceUrl} target="_blank" rel="noreferrer" aria-label={language === "zh" ? "查看 OpenTripMap 记录" : "View OpenTripMap record"} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-jade underline"><ExternalLink className="h-4 w-4" aria-hidden="true" />{language === "zh" ? "查看 OpenTripMap 记录" : "View OpenTripMap record"}</a>}
        </section>
        <section role="region" aria-label={language === "zh" ? "来源与验证" : "Source and verification"} className="mt-4 grid gap-3 sm:grid-cols-3">
          <SourcePanel
            title={language === "zh" ? "来源" : "Source"}
            record={provider}
            status={provider ? (language === "zh" ? "来源支持型景点信息" : "Source-backed attraction information") : undefined}
            language={language}
          />
          <SourcePanel
            title={language === "zh" ? "价格来源" : "Price Source"}
            record={priceReference}
            status={priceVerificationText(activity, language)}
            language={language}
          />
          <SourcePanel
            title={language === "zh" ? "开放时间来源" : "Opening Hours Source"}
            record={hoursVerification}
            status={openingHoursText(activity, language)}
            language={language}
          />
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
    <section role="region" aria-label={language === "zh" ? "系统计算的行程预算" : "Deterministic trip budget"} className="rounded-lg border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase text-jade">{language === "zh" ? "预算使用" : "Budget used"}</p>
          <strong className="mt-1 block font-display text-2xl">{sgd(summary.totalMinor)} <span className="text-sm font-bold text-ink/45">/ {sgd(summary.budgetMinor)}</span></strong>
        </div>
        <span className="rounded-full bg-jade/10 px-3 py-1 text-sm font-extrabold text-jade">{Math.round(ratio)}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10"><div className="h-full bg-jade" style={{ width: `${ratio}%` }} /></div>
      <details className="mt-3 group">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-ink/65">
          <span>{language === "zh" ? "查看预算明细" : "View cost details"}</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        {hasCostReferences && <p className="mt-1 text-xs font-semibold text-ink/55">{language === "zh" ? "数据库成本参考" : "Database-backed cost references"}</p>}
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {Object.entries(budgetLabels).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-3 border-b border-ink/8 pb-2 text-sm">
              <dt className="text-ink/55">{label[language === "zh" ? 1 : 0]}</dt><dd className="font-bold">{sgd(summary.categoriesMinor[key])}</dd>
            </div>
          ))}
        </dl>
      </details>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold">
        <span className="text-jade">{language === "zh" ? `剩余 ${sgd(summary.remainingMinor)}` : `${sgd(summary.remainingMinor)} remaining`}</span>
        <span className="text-ink/50">{language === "zh" ? `每人 ${sgd(summary.perPersonMinor)}` : `${sgd(summary.perPersonMinor)} per traveller`}</span>
      </div>
    </section>
  );
}

function itineraryStyle(itinerary, fallback) {
  return itinerary?.travelStyle ?? itinerary?.variant ?? fallback;
}

export default function ObjectiveTripWorkspace({ trip, setTrip, access, refreshTrip }) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const zh = language === "zh";
  const navigate = useNavigate();
  const isPreview = trip.persistenceScope === "PREVIEW" || access?.canSavePreview;
  const archivedVariants = trip.variants ?? [];
  const variant = trip.itineraryRun
    ?? archivedVariants.find((item) => itineraryStyle(item.itinerary, item.summary?.profile) === trip.selectedVariantId)
    ?? archivedVariants[0];
  const selectedTravelStyle = itineraryStyle(variant.itinerary, variant.summary?.profile ?? trip.preferences?.travelStyle);
  const [activeDayNumber, setActiveDayNumber] = useState(variant.itinerary.days[0]?.dayNumber);
  const [detail, setDetail] = useState(null);
  const [activeActivityId, setActiveActivityId] = useState(null);
  const activityRefs = useRef({});
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [status, setStatus] = useState(trip.generationState ?? variant.state);
  const [busy, setBusy] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [versioningOpen, setVersioningOpen] = useState(false);
  const preferences = trip.preferences ?? {};
  const [versionBudget, setVersionBudget] = useState(minorToSgdValue(preferences.budgetMinor ?? trip.budgetMinor));
  const [versionTravellers, setVersionTravellers] = useState(String(preferences.travellerCount ?? trip.travellerCount));
  const [versionTravelStyle, setVersionTravelStyle] = useState(preferences.travelStyle ?? selectedTravelStyle);
  const [versionDailyAttractionTarget, setVersionDailyAttractionTarget] = useState(String(preferences.dailyAttractionTarget ?? 5));
  const [versionTransportPreference, setVersionTransportPreference] = useState(
    preferences.transportPreferenceMode === "MANUAL"
      ? preferences.preferredTransportModes?.[0] ?? "PUBLIC_TRANSIT"
      : "AUTO_CHEAPEST"
  );
  const [versionInterests, setVersionInterests] = useState(preferences.interests ?? preferences.activityPreferences ?? ["CULTURE"]);
  const [versionRainyDayBackupEnabled, setVersionRainyDayBackupEnabled] = useState(preferences.rainyDayBackupEnabled === true);
  const [versionOtherPreferences, setVersionOtherPreferences] = useState(preferences.otherPreferences ?? "");
  const validation = trip.validation ?? variant.validation;
  const openingHourWarnings = (validation?.issues ?? [])
    .filter(({ code, severity }) => code === "POI_OPENING_HOURS_UNVERIFIED" && severity === "WARNING");
  const sourcedAttractionCount = variant.itinerary.days.reduce((count, item) => (
    count + item.activities.filter((activity) => activity.xid && sourceRecordFor(activity)).length
  ), 0);
  const withinBudget = variant.summary.totalMinor <= variant.summary.budgetMinor;
  const day = variant.itinerary.days.find((item) => item.dayNumber === activeDayNumber) ?? variant.itinerary.days[0];
  const preferenceLabels = editablePreferenceLabels(language);
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
    ...(day.startPoint?.coordinates ? [mapAnchor(day.startPoint, zh ? "璧风偣" : "Start", day.activities[0]?.scheduledStartTime ?? "08:00", language)] : []),
    ...day.activities.filter((activity) => activity.xid && activity.poi?.coordinates).map((activity) => mapActivity(activity, language)),
    ...(day.endPoint?.coordinates ? [mapAnchor(day.endPoint, zh ? "缁堢偣" : "End", day.activities.at(-1)?.scheduledEndTime ?? "20:00", language)] : [])
  ], [day, language, zh]);

  function focusActivity(activityId, { open = false } = {}) {
    if (!activityId) return;
    setActiveActivityId(activityId);
    activityRefs.current[activityId]?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    if (open) {
      const activity = day.activities.find((item) => item.xid === activityId);
      if (activity) setDetail(activity);
    }
  }

  const tripTitle = typeof trip.title === "string" ? trip.title : trip.title?.[language] ?? trip.title?.en;
  const staleTitle = displayLabel(language, "staleItinerary", "title");
  const staleDescription = displayLabel(language, "staleItinerary", "description");
  const staleAction = displayLabel(language, "staleItinerary", "action");
  const latestPreferencePatch = () => {
    if (!versioningOpen) return {};
    const transportPatch = versionTransportPreference === "AUTO_CHEAPEST"
      ? { transportPreferenceMode: "AUTO_CHEAPEST", preferredTransportModes: [] }
      : { transportPreferenceMode: "MANUAL", preferredTransportModes: [versionTransportPreference] };
    return {
      budgetMinor: sgdValueToMinor(versionBudget),
      travellerCount: Number(versionTravellers),
      travelStyle: versionTravelStyle,
      dailyAttractionTarget: Number(versionDailyAttractionTarget),
      ...transportPatch,
      interests: versionInterests,
      rainyDayBackupEnabled: versionRainyDayBackupEnabled,
      otherPreferences: versionOtherPreferences.trim() || undefined
    };
  };

  function toggleVersionInterest(interest) {
    setVersionInterests((current) => (
      current.includes(interest)
        ? (current.length === 1 ? current : current.filter((item) => item !== interest))
        : [...current, interest]
    ));
  }

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
    const wasStale = status === "INVALIDATED";
    setBusy(true);
    setStatus("REVALIDATING");
    setActionError("");
    setNotice("");
    try {
      const result = await apiRequest(`/trips/${trip.id}/regenerate`, {
        method: "POST",
        body: JSON.stringify({ expectedRevision: trip.revision, preferences })
      });
      const next = { ...result.trip, itineraryRun: result.itineraryRun, validation: result.validation, generationState: result.state, objectiveAligned: true, revision: result.trip.revision ?? 0 };
      sessionStorage.setItem(`nuogo-trip-${next.id}`, JSON.stringify(next));
      setTrip(next);
      setStatus("FINAL_VALIDATED");
      setVersioningOpen(false);
      navigate(`/trip/${next.id}`);
    } catch (error) {
      setStatus(wasStale ? "INVALIDATED" : "FAILED");
      setActionError(error.message);
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

  async function savePreviewTrip() {
    if (user?.accountType === "GUEST") {
      navigate(`/register?returnTo=${encodeURIComponent(`/trip/${trip.id}`)}`);
      return;
    }
    const preview = sessionStorage.getItem(`nuogo-preview-result-${trip.id}`);
    const previewToken = sessionStorage.getItem(`nuogo-preview-token-${trip.id}`);
    if (!preview || !previewToken) {
      setActionError(zh ? "此预览已过期，请重新生成行程。" : "This preview expired. Generate the itinerary again.");
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      const body = await apiRequest("/trips/save-preview", {
        method: "POST",
        body: JSON.stringify({ preview: JSON.parse(preview), previewToken })
      });
      sessionStorage.removeItem(`nuogo-preview-result-${trip.id}`);
      sessionStorage.removeItem(`nuogo-preview-token-${trip.id}`);
      sessionStorage.setItem(`nuogo-trip-${body.trip.id}`, JSON.stringify(body.trip));
      setTrip(body.trip);
      await refreshTrip?.({ silent: true });
      setNotice(zh ? "行程已保存到我的行程。" : "Itinerary saved to My trips.");
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusy(false);
    }
  }

  function discardPreviewTrip() {
    sessionStorage.removeItem(`nuogo-trip-${trip.id}`);
    sessionStorage.removeItem(`nuogo-preview-result-${trip.id}`);
    sessionStorage.removeItem(`nuogo-preview-token-${trip.id}`);
    navigate("/planner");
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
          {isPreview && <div className="flex flex-wrap gap-2">
            <button type="button" aria-label={zh ? "返回修改偏好" : "Back to edit preferences"} onClick={() => navigate("/planner", { state: { plannerScrollTarget: "preferences" } })} className="flex min-h-11 items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold"><Route className="h-4 w-4" /> {zh ? "返回修改偏好" : "Back to edit"}</button>
            <button type="button" aria-label={zh ? "保存到我的行程" : "Save to My trips"} onClick={savePreviewTrip} disabled={busy} className="flex min-h-11 items-center gap-2 rounded-lg bg-jade px-3 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" /> {user?.accountType === "GUEST" ? (zh ? "注册后保存" : "Sign in to save") : (zh ? "保存到我的行程" : "Save to My trips")}</button>
            <button type="button" aria-label={zh ? "放弃此预览" : "Discard this preview"} onClick={discardPreviewTrip} className="flex min-h-11 items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold"><Trash2 className="h-4 w-4" /> {zh ? "放弃预览" : "Discard preview"}</button>
          </div>}
          {access?.canEdit && !isPreview && <div className="flex flex-wrap gap-2">
            <button type="button" aria-label={zh ? "返回我的行程" : "Back to My trips"} onClick={() => navigate("/archive")} className="flex min-h-11 items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold"><MapPinned className="h-4 w-4" /> {zh ? "返回我的行程" : "Back to My trips"}</button>
            {user?.accountType === "GUEST" && sessionStorage.getItem(`nuogo-guest-claim-${trip.id}`) && <button type="button" aria-label={zh ? "登录后保存行程" : "Sign in to save itinerary"} onClick={() => navigate(`/register?returnTo=${encodeURIComponent(`/trip/${trip.id}`)}`)} className="flex min-h-11 items-center gap-2 rounded-lg bg-jade px-3 text-sm font-bold text-white"><Save className="h-4 w-4" /> {zh ? "登录后保存" : "Sign in to save"}</button>}
            {user?.accountType !== "GUEST" && sessionStorage.getItem(`nuogo-guest-claim-${trip.id}`) && <button type="button" aria-label={zh ? "将行程保存到我的账户" : "Save itinerary to my account"} onClick={claimGuestTrip} disabled={busy} className="flex min-h-11 items-center gap-2 rounded-lg bg-jade px-3 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" /> {zh ? "保存到我的账户" : "Save to my account"}</button>}
            <button type="button" aria-label={zh ? "重命名行程" : "Rename trip"} onClick={rename} className="flex min-h-11 items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold"><Edit3 className="h-4 w-4" /> {zh ? "重命名" : "Rename"}</button>
            <button type="button" aria-label={zh ? "编辑偏好" : "Edit preferences"} onClick={() => { setVersioningOpen((open) => !open); setStatus("INVALIDATED"); setActionError(""); }} className="flex min-h-11 items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold"><Route className="h-4 w-4" /> {zh ? "编辑偏好" : "Edit preferences"}</button>
            <button type="button" aria-label={zh ? "重新生成行程" : "Regenerate trip"} disabled={busy} onClick={() => regenerate()} className="flex min-h-11 items-center gap-2 rounded-lg bg-ink px-3 text-sm font-bold text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> {zh ? "重新生成" : "Regenerate"}</button>
            <button type="button" aria-label={zh ? "隐私与 AI" : "Privacy and AI"} onClick={() => setPrivacyOpen(true)} className="flex min-h-11 items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold"><LockKeyhole className="h-4 w-4" /> {zh ? "隐私与 AI" : "Privacy and AI"}</button>
            <button type="button" aria-label={zh ? "删除行程" : "Delete trip"} onClick={remove} className="grid h-11 w-11 place-items-center rounded-lg border border-red-200 text-red-700"><Trash2 className="h-4 w-4" /></button>
          </div>}
        </div>
        {status === "INVALIDATED" && <section role="region" aria-label={staleTitle} className="mx-auto mt-4 flex max-w-[1520px] flex-col gap-3 rounded-lg border border-lake/20 bg-lake/8 px-4 py-4 text-ink sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">{staleTitle}</h2>
            <p className="mt-1 text-sm font-semibold text-ink/65">{staleDescription}</p>
          </div>
          <button type="button" aria-label={staleAction} disabled={busy} onClick={() => regenerate(latestPreferencePatch())} className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-bold text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> {staleAction}</button>
        </section>}
        {actionError && <p role="alert" className="mx-auto mt-4 max-w-[1520px] rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{actionError}</p>}
        {notice && <p role="status" className="mx-auto mt-4 max-w-[1520px] rounded-lg bg-jade/10 px-4 py-3 text-sm font-bold text-jade">{notice}</p>}
        {versioningOpen && <form onSubmit={(event) => { event.preventDefault(); regenerate(latestPreferencePatch()); }} className="mx-auto mt-4 grid max-w-[1520px] gap-4 border-t border-ink/10 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1.5 text-sm font-semibold text-ink/65">{zh ? "总预算（新币）" : "Hard budget in SGD"}<input aria-label={zh ? "总预算（新币）" : "Hard budget in SGD"} type="number" min="10" max="1000000" step="50" required value={versionBudget} onChange={(event) => setVersionBudget(event.target.value)} className="field-control" disabled={busy} /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink/65">{preferenceLabels.travellers}<input aria-label={preferenceLabels.travellers} type="number" min="1" max="20" required value={versionTravellers} onChange={(event) => setVersionTravellers(event.target.value)} className="field-control" disabled={busy} /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink/65">{preferenceLabels.style}<select aria-label={preferenceLabels.style} value={versionTravelStyle} onChange={(event) => setVersionTravelStyle(event.target.value)} className="field-control" disabled={busy}>{travelStyleOptions.map((style) => <option key={style} value={style}>{displayLabel(language, "profile", style)}</option>)}</select></label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink/65">{preferenceLabels.dailyTarget}<select aria-label={preferenceLabels.dailyTarget} value={versionDailyAttractionTarget} onChange={(event) => setVersionDailyAttractionTarget(event.target.value)} className="field-control" disabled={busy}>{dailyAttractionOptions.map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink/65">{preferenceLabels.transport}<select aria-label={preferenceLabels.transport} value={versionTransportPreference} onChange={(event) => setVersionTransportPreference(event.target.value)} className="field-control" disabled={busy}>{transportPreferenceOptions.map((option) => <option key={option} value={option}>{transportPreferenceLabel(preferenceLabels, option)}</option>)}</select></label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink/65 xl:col-span-2">{preferenceLabels.other}<input aria-label={preferenceLabels.other} type="text" maxLength="500" value={versionOtherPreferences} onChange={(event) => setVersionOtherPreferences(event.target.value)} className="field-control" disabled={busy} /></label>
            <label className="flex min-h-11 items-center gap-3 rounded-lg border border-ink/10 bg-white px-3 text-sm font-bold text-ink/70"><input type="checkbox" checked={versionRainyDayBackupEnabled} onChange={(event) => setVersionRainyDayBackupEnabled(event.target.checked)} disabled={busy} />{preferenceLabels.rainy}</label>
          </div>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-bold text-ink/65">{preferenceLabels.interests}</legend>
            <div className="flex flex-wrap gap-2">
              {interestOptions.map((interest) => <label key={interest} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-ink/10 bg-white px-3 text-sm font-bold text-ink/70"><input type="checkbox" checked={versionInterests.includes(interest)} onChange={() => toggleVersionInterest(interest)} disabled={busy} />{displayLabel(language, "preference", interest)}</label>)}
            </div>
          </fieldset>
          <button type="submit" aria-label={staleAction} disabled={busy} className="min-h-11 rounded-lg bg-lake px-4 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-50">{busy ? (zh ? "正在生成..." : "Generating...") : staleAction}</button>
        </form>}
      </header>

      <main className="mx-auto max-w-[1520px] px-4 pb-10 pt-4">
        {status === "FINAL_VALIDATED" && validation?.valid && <section role="region" aria-label={zh ? "行程校验摘要" : "Itinerary validation summary"} className="mb-4 flex flex-wrap gap-x-6 gap-y-2 border-y border-ink/10 bg-paper px-4 py-3 text-sm font-bold text-jade">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{zh ? "已通过校验" : "Validated"}</span>
          {withinBudget && <span className="flex items-center gap-2"><WalletCards className="h-4 w-4" />{zh ? "符合总预算上限" : "Within hard budget"}</span>}
          <span className="flex items-center gap-2"><MapPinned className="h-4 w-4" />{zh ? `有来源景点：${sourcedAttractionCount}` : `Grounded attractions: ${sourcedAttractionCount}`}</span>
          {openingHourWarnings.length > 0 && <span className="flex basis-full items-center gap-2 text-amber-700">{zh ? "开放时间未验证 - 到访前请再次确认。" : "Opening hours not verified - please confirm before visiting."}</span>}
        </section>}
        <nav aria-label={zh ? "行程日期" : "Trip days"} className="mb-4 flex gap-2 overflow-x-auto border border-ink/10 bg-paper p-2">
          {variant.itinerary.days.map((item) => <button key={item.dayNumber} type="button" onClick={() => setActiveDayNumber(item.dayNumber)} aria-current={item.dayNumber === day.dayNumber ? "page" : undefined} className={`min-h-11 min-w-24 rounded-lg px-4 text-sm font-bold ${item.dayNumber === day.dayNumber ? "bg-ink text-white" : "hover:bg-ink/5"}`}>{zh ? `第 ${item.dayNumber} 天` : `Day ${item.dayNumber}`}</button>)}
        </nav>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,.98fr)_minmax(420px,1.02fr)]">
          <section role="region" aria-label={zh ? `第 ${day.dayNumber} 天连续行程` : `Day ${day.dayNumber} continuous itinerary`} className="min-w-0 border border-ink/10 bg-paper p-4">
            <div className="mb-2 flex items-center justify-between"><div><p className="text-xs font-bold uppercase text-jade">{day.date}</p><h2 className="mt-1 font-display text-xl font-bold">{zh ? `第 ${day.dayNumber} 天路线` : `Day ${day.dayNumber} route`}</h2></div><span className="text-xs font-semibold text-ink/45">{day.activities.length} {zh ? "站" : "stops"}</span></div>
            <DailyItinerarySummary day={day} />
            <div className="mt-4" data-testid="budget-summary-rail"><BudgetSummary summary={variant.summary} language={language} /></div>
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-ink/[0.035] p-3 text-sm font-bold"><span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-white">S</span>{zh ? "起点" : "Start"} {"\u00b7"} {pointLabel(day.startPoint, language)}</div>
            {day.activities.map((activity, index) => (
              <div key={activityKey(activity)}>
                {activityLegs[index] && <TripLegRow leg={activityLegs[index]} />}
                {activity.xid ? (
                  <button ref={(node) => { activityRefs.current[activity.xid] = node; }} type="button" aria-label={activityLabel(activity, language) + (zh ? "详情" : " details")} onMouseEnter={() => setActiveActivityId(activity.xid)} onFocus={() => setActiveActivityId(activity.xid)} onClick={() => setDetail(activity)} className={`w-full rounded-lg border bg-white p-3 text-left transition-colors hover:border-lake focus-visible:outline focus-visible:outline-2 focus-visible:outline-lake ${activeActivityId === activity.xid ? "border-lake shadow-[0_0_0_2px_rgba(46,136,255,.12)]" : "border-ink/10"}`}>
                    <div className="grid gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                      <div data-testid="activity-image-frame" className="relative h-28 overflow-hidden rounded-lg bg-ink/[0.04]">
                        {attractionImage(activity) ? <img src={attractionImage(activity)} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center bg-lake/8 text-lake"><MapPinned className="h-7 w-7" /></div>}
                        <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-ink text-xs font-extrabold text-white">{day.activities.filter((item) => item.xid).findIndex((item) => item.xid === activity.xid) + 1}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-lake">{activity.scheduledStartTime ?? activity.plannedStartTime} - {activity.scheduledEndTime ?? activity.plannedStartTime} {"\u00b7"} {activity.plannedDurationMinutes} {zh ? "分钟" : "min"}</p>
                            <h3 className="mt-1 font-display text-xl font-bold">{activityLabel(activity, language)}</h3>
                          </div>
                          <GripVertical className="mt-1 h-4 w-4 shrink-0 text-ink/25" aria-hidden="true" />
                        </div>
                        <span className="sr-only">{zh ? "AI 生成理由" : "AI rationale"} {activity.reason}</span>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {activityChips(activity, language).map((chip) => <span key={chip} className="rounded-full bg-ink/[0.045] px-2.5 py-1 text-xs font-bold text-ink/62">{chip}</span>)}
                          {activityVerificationChips(activity, language).map((chip) => <span key={chip} className="rounded-full bg-jade/10 px-2.5 py-1 text-xs font-bold text-jade">{chip}</span>)}
                          {activity.poi?.primarySource === "OPENTRIPMAP" && <span className="rounded-full bg-jade/10 px-2.5 py-1 text-xs font-bold text-jade">{zh ? "OpenTripMap 提供方资料" : "OpenTripMap facts"}</span>}
                        </div>
                        {activityCostLabel(activity, language) && <p className="mt-3 text-xs font-bold text-sky"><span className="mr-2 uppercase">{zh ? "估算" : "Estimate"}</span>{activityCostLabel(activity, language)}</p>}
                      </div>
                    </div>
                  </button>
                ) : (
                  <button data-testid={`compact-activity-${activity.sequence}`} type="button" aria-label={activityLabel(activity, language) + (zh ? "详情" : " details")} onClick={() => setDetail(activity)} className="w-full rounded-lg border border-ink/10 bg-ink/[0.025] px-3 py-3 text-left transition-colors hover:border-lake focus-visible:outline focus-visible:outline-2 focus-visible:outline-lake">
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-xs font-extrabold text-ink shadow-sm">{activity.sequence}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-lake">{activity.scheduledStartTime ?? activity.plannedStartTime} - {activity.scheduledEndTime ?? activity.plannedStartTime} {"\u00b7"} {activity.plannedDurationMinutes} {zh ? "分钟" : "min"}</p>
                        <h3 className="mt-1 font-display text-lg font-bold">{activityLabel(activity, language)}</h3>
                        {activity.reason && <p className="mt-1 text-sm font-semibold leading-5 text-ink/62">{activity.reason}</p>}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {activityChips(activity, language).map((chip) => <span key={chip} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-ink/62">{chip}</span>)}
                        </div>
                      </div>
                      <GripVertical className="mt-1 h-4 w-4 shrink-0 text-ink/25" aria-hidden="true" />
                    </div>
                  </button>
                )}
              </div>
            ))}
            {finalLeg && <TripLegRow leg={finalLeg} />}
            <div className="flex items-center gap-3 rounded-lg bg-ink/[0.035] p-3 text-sm font-bold"><span className="grid h-8 w-8 place-items-center rounded-full border border-ink/20 bg-white">E</span>{zh ? "终点" : "End"} {"\u00b7"} {pointLabel(day.endPoint, language)}</div>
          </section>
          <div className="min-w-0 self-start lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]" data-testid="route-side-rail">
            <aside className="h-full min-w-0" data-testid="route-view-aside">
              <section aria-label={zh ? "行程地图" : "Itinerary map"} className="flex h-full flex-col border border-ink/10 bg-paper p-3">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-extrabold uppercase text-lake">{zh ? "当天路线视图" : "Day route view"}</p>
                    <h3 className="mt-1 font-display text-lg font-bold">{zh ? "路线地图" : "Route map"}</h3>
                  </div>
                  <div className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-ink px-3 text-sm font-extrabold text-white">
                    <MapPinned className="h-4 w-4" />{zh ? "路线地图" : "Route map"}
                  </div>
                </div>
                <LeafletRouteMap activities={mapActivities} selectedActivityId={detail?.xid ?? activeActivityId} onSelect={(id) => focusActivity(id)} onOpenDetails={(id) => focusActivity(id, { open: true })} className="min-h-[420px] flex-1 lg:min-h-0" />
                <p className="border-x border-b border-ink/10 bg-paper px-3 py-2 text-xs leading-5 text-ink/55">{zh ? "出发地与酒店位置可能为估算值；景点坐标保留其数据提供方来源。" : "Origin and hotel anchors may be estimated; POI coordinates retain their provider source."}</p>
              </section>
            </aside>
          </div>
        </div>
        <section aria-label={zh ? "整趟行程景点与雨天备选" : "Whole-trip attraction and contingency summary"} className="mt-4 grid gap-4">
          <details className="border border-ink/10 bg-paper">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-extrabold text-ink">
              <span>{zh ? "备选地点库 / 灵感池" : "Backup place library / inspiration pool"}</span>
              <ChevronDown className="h-4 w-4" />
            </summary>
            <div className="border-t border-ink/10 px-4 py-4"><SelectedAttractionOutcome outcome={variant.selectedAttractionOutcome} mode={trip.preferences?.attractionSelectionMode} legacyPreferredSights={trip.preferences?.preferredSights ?? []} /></div>
          </details>
          <RainyDayBackup backups={variant.rainyDayBackups} />
        </section>
        <DataSourcesNotice itinerary={variant.itinerary} summary={variant.summary} language={language} />
        {isPreview && <section role="region" aria-label={zh ? "行程预览尚未保存" : "Itinerary preview not saved"} className="mt-4 flex flex-col gap-3 rounded-lg border border-sun/35 bg-paper px-4 py-4 text-ink sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-bold">{zh ? "当前为未保存草稿" : "Unsaved draft preview"}</h2>
            <p className="mt-1 text-sm font-semibold text-ink/65">{zh ? "确认想使用这份行程后，再保存到“我的行程”。不保存就不会进入你的行程列表。" : "Save it to My trips only after you decide to use it. Unsaved previews will not appear in your trip list."}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" aria-label={zh ? "重新规划行程" : "Regenerate trip"} disabled={busy} onClick={() => regenerate()} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ink/15 bg-white px-4 text-sm font-bold disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> {zh ? "重新规划" : "Regenerate"}</button>
            <button type="button" aria-label={zh ? "保存到我的行程" : "Save to My trips"} onClick={savePreviewTrip} disabled={busy} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" /> {zh ? "保存" : "Save"}</button>
          </div>
        </section>}
      </main>
      <ActivityDetails activity={detail} onClose={() => { setDetail(null); setEditError(""); }} language={language} canEdit={access?.canEdit} onSave={saveEntry} editBusy={editBusy} editError={editError} />
      <PrivacyDialog open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
}
