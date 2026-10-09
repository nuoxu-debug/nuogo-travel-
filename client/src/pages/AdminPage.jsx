import { AlertTriangle, CheckCircle2, Database, ExternalLink, Pencil, Plus, RefreshCw, Save, ShieldCheck, Trash2, X, XCircle } from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { displayLabel } from "../i18n/display.js";
import AppShell from "../layout/AppShell.jsx";

const copy = {
  en: {
    title: "Admin Dashboard",
    intro: "Maintain the supporting records that keep destination, attraction, and planning-price data reliable.",
    loading: "Loading administration data...",
    retry: "Retry loading administration data",
    destinations: "Destination Management",
    pois: "Attraction / POI Management",
    costs: "Price Reference Management",
    name: "Name",
    status: "Status",
    category: "Category",
    source: "Source",
    identity: "POI identity",
    providerId: "Provider ID",
    coordinates: "Coordinates",
    actions: "Actions",
    collected: "Collected Date",
    range: "Planning Price",
    empty: "No records are available for this section.",
    saving: "Saving...",
    failed: "The change could not be saved. Try again."
  },
  zh: {
    title: "系统管理员",
    intro: "维护用于生成行程的已验证资料。",
    loading: "正在加载管理数据...",
    retry: "重新加载管理数据",
    destinations: "目的地",
    pois: "兴趣点",
    costs: "费用参考",
    name: "名称",
    status: "状态",
    category: "类别",
    source: "来源",
    identity: "兴趣点标识",
    providerId: "提供方标识",
    coordinates: "坐标",
    actions: "操作",
    collected: "采集日期",
    range: "参考范围",
    empty: "此部分暂无记录。",
    saving: "保存中...",
    failed: "无法保存更改，请重试。"
  }
};

const tabIds = ["destinations", "pois", "costs"];
const cityOptions = [{ id: "singapore", en: "Singapore", zh: "新加坡" }];
const referenceTypeOptions = ["EXACT", "FREE", "CATEGORY_FALLBACK", "GENERIC_FALLBACK"];
const sourceTypeOptions = ["OFFICIAL", "GOVERNMENT", "COMMERCIAL", "SYSTEM_ESTIMATE"];
const unitTypeOptions = ["PER_PERSON_ENTRY", "PER_PERSON_DAY", "PER_ROOM_NIGHT", "PER_TRIP", "PER_LEG"];
const weekdayOptions = [
  { value: 0, label: "Sunday", short: "SUN" },
  { value: 1, label: "Monday", short: "MON" },
  { value: 2, label: "Tuesday", short: "TUE" },
  { value: 3, label: "Wednesday", short: "WED" },
  { value: 4, label: "Thursday", short: "THU" },
  { value: 5, label: "Friday", short: "FRI" },
  { value: 6, label: "Saturday", short: "SAT" }
];
const weekdayLookup = new Map(weekdayOptions.flatMap((day) => [
  [day.short, day.value],
  [day.label.toUpperCase(), day.value],
  [String(day.value), day.value]
]));
const allWeekdays = weekdayOptions.map(({ value }) => value);
const workWeekdays = [1, 2, 3, 4, 5];
const weekendDays = [0, 6];

function displayName(value, language) {
  if (typeof value === "string") return value;
  return value?.[language] || value?.en || value?.zh || "-";
}

function formatCoordinate(value) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(4) : "—";
}

function formatCoordinates(coordinates) {
  if (!coordinates) return "—";
  return `${formatCoordinate(coordinates.latitude)}, ${formatCoordinate(coordinates.longitude)}`;
}

function StatusSelect({ label, value, values, disabled, onChange, language }) {
  return (
    <select
      aria-label={label}
      className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold text-ink disabled:cursor-wait disabled:opacity-55"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {values.map((status) => <option key={status} value={status}>{displayLabel(language, "lifecycle", status)}</option>)}
    </select>
  );
}

function DataTable({ headers, children, empty, colSpan }) {
  return (
    <div className="overflow-x-auto border-y border-ink/10 bg-white">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead className="bg-ink/[0.035] text-xs font-extrabold text-ink/58">
          <tr>{headers.map((header) => <th key={header} className="px-5 py-4">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-ink/10">
          {children || <tr><td colSpan={colSpan} className="px-5 py-10 text-center text-ink/50">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function plural(count, singular, pluralLabel = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

function verificationLabel(value) {
  return {
    PENDING_REVIEW: "Pending Review",
    VERIFIED: "Verified",
    REJECTED: "Rejected"
  }[value ?? "PENDING_REVIEW"] ?? "Pending Review";
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === "\"" && line[index + 1] === "\"") {
      value += "\"";
      index += 1;
    } else if (character === "\"") {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
}

function parseWeekdayList(value) {
  const days = [];
  const invalid = [];
  for (const token of String(value || "").split("|").map((item) => item.trim()).filter(Boolean)) {
    const day = weekdayLookup.get(token.toUpperCase());
    if (day === undefined) invalid.push(token);
    else if (!days.includes(day)) days.push(day);
  }
  return { days, invalid };
}

function weekdayLabel(day) {
  return weekdayOptions.find((option) => option.value === day)?.label ?? `Day ${day}`;
}

function hasValidTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export default function AdminPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const c = copy[language];
  const [activeTab, setActiveTab] = useState("destinations");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [editingCost, setEditingCost] = useState(null);
  const [editingOperatingHour, setEditingOperatingHour] = useState(null);
  const [editingOperatingHourException, setEditingOperatingHourException] = useState(null);
  const [bulkOperatingHoursCsv, setBulkOperatingHoursCsv] = useState("");
  const [bulkOperatingHoursPreview, setBulkOperatingHoursPreview] = useState([]);
  const [city, setCity] = useState("singapore");

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [destinations, pois, costReferences, operatingHours] = await Promise.all([
        apiRequest("/admin/destinations"),
        apiRequest(`/admin/pois?destinationId=${city}`),
        apiRequest(`/admin/cost-references?city=${city}`),
        apiRequest(`/admin/poi-operating-hours?destinationId=${city}`)
      ]);
      setData({ ...destinations, ...pois, ...costReferences, ...operatingHours });
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [city]);

  useEffect(() => { loadData(); }, [loadData]);

  async function updateStatus(kind, id, status) {
    setSaving(`${kind}:${id}`);
    setError("");
    try {
      const result = await apiRequest(`/admin/${kind}/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setData((current) => ({
        ...current,
        destinations: current.destinations.map((item) => item.id === id ? { ...item, ...result.destination } : item)
      }));
    } catch {
      setError(c.failed);
    } finally {
      setSaving("");
    }
  }

  async function saveCostReference(event) {
    event.preventDefault();
    setSaving(`costs:${editingCost.id}`);
    setError("");
    try {
      const result = await apiRequest(`/admin/cost-references/${editingCost.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...editingCost, updatedAt: new Date().toISOString() })
      });
      setData((current) => ({
        ...current,
        costReferences: current.costReferences.some((item) => item.id === result.costReference.id)
          ? current.costReferences.map((item) => item.id === result.costReference.id ? result.costReference : item)
          : [...current.costReferences, result.costReference]
      }));
      setEditingCost(null);
    } catch {
      setError(c.failed);
    } finally {
      setSaving("");
    }
  }

  function updatePlanningPrice(value) {
    const amount = Math.max(0, Math.round(Number(value || 0) * 100));
    setEditingCost((current) => ({
      ...current,
      minMinor: amount,
      representativeMinor: amount,
      maxMinor: amount
    }));
  }

  function createCostReference() {
    const today = new Date().toISOString().slice(0, 10);
    setEditingCost({
      id: "new-cost-reference",
      city,
      destinationId: city,
      category: "ATTRACTION_PERSON_ENTRY",
      tier: null,
      minMinor: 0,
      representativeMinor: 0,
      maxMinor: 0,
      currency: "SGD",
      sourceName: "",
      sourceUrl: "",
      collectedOn: today,
      updatedAt: new Date().toISOString(),
      referenceType: "GENERIC_FALLBACK",
      unitType: "PER_PERSON_ENTRY",
      priceBasis: "",
      sourceType: "SYSTEM_ESTIMATE",
      lastReviewedDate: today,
      notes: "Planning reference, not a live ticket price.",
      status: "ACTIVE"
    });
  }

  async function retireCostReference(item) {
    setSaving(`costs:${item.id}`);
    setError("");
    try {
      const result = await apiRequest(`/admin/cost-references/${item.id}`, { method: "DELETE" });
      setData((current) => ({
        ...current,
        costReferences: current.costReferences.map((record) => record.id === item.id ? { ...record, ...result.costReference } : record)
      }));
    } catch {
      setError(c.failed);
    } finally {
      setSaving("");
    }
  }

  function createOperatingHour() {
    const poiId = data?.pois?.[0]?.id ?? "";
    setEditingOperatingHour({
      id: "new-operating-hour",
      poiId,
      dayOfWeek: 1,
      opensAt: "10:00",
      closesAt: "19:00",
      isClosed: false,
      applyDays: [1],
      sourceName: "",
      sourceUrl: "",
      sourceType: "OFFICIAL",
      lastReviewedDate: new Date().toISOString().slice(0, 10),
      verificationStatus: "PENDING_REVIEW",
      status: "ACTIVE",
      notes: "Opening hours verified from stored source-backed information."
    });
  }

  function createOperatingHourException() {
    const poiId = data?.pois?.[0]?.id ?? "";
    setEditingOperatingHourException({
      id: "new-operating-hour-exception",
      poiId,
      exceptionDate: new Date().toISOString().slice(0, 10),
      opensAt: null,
      closesAt: null,
      isClosed: true,
      reason: "Special-date closure",
      sourceName: "",
      sourceUrl: "",
      sourceType: "OFFICIAL",
      lastReviewedDate: new Date().toISOString().slice(0, 10),
      verificationStatus: "PENDING_REVIEW",
      status: "ACTIVE",
      notes: "Specific-date exception overrides weekly hours."
    });
  }

  async function saveOperatingHour(event) {
    event.preventDefault();
    setSaving(`hours:${editingOperatingHour.id}`);
    setError("");
    try {
      const selectedDays = (editingOperatingHour.applyDays?.length ? editingOperatingHour.applyDays : [editingOperatingHour.dayOfWeek]).slice().sort();
      const results = [];
      for (const dayOfWeek of selectedDays) {
        const id = editingOperatingHour.id === "new-operating-hour"
          ? `new-operating-hour-${dayOfWeek}-${(editingOperatingHour.opensAt || "closed").replace(":", "")}-${(editingOperatingHour.closesAt || "closed").replace(":", "")}`
          : editingOperatingHour.id;
        const operatingHour = {
          ...editingOperatingHour,
          id,
          dayOfWeek,
          verificationStatus: editingOperatingHour.id === "new-operating-hour" ? "PENDING_REVIEW" : (editingOperatingHour.verificationStatus ?? "PENDING_REVIEW")
        };
        delete operatingHour.applyDays;
        const result = await apiRequest(`/admin/poi-operating-hours/${operatingHour.id}`, {
          method: "PUT",
          body: JSON.stringify(operatingHour)
        });
        results.push(result.operatingHour);
      }
      setData((current) => ({
        ...current,
        operatingHours: results.reduce((records, operatingHour) => (
          records.some((item) => item.id === operatingHour.id)
            ? records.map((item) => item.id === operatingHour.id ? operatingHour : item)
            : [...records, operatingHour]
        ), current.operatingHours)
      }));
      setEditingOperatingHour(null);
    } catch {
      setError(c.failed);
    } finally {
      setSaving("");
    }
  }

  async function saveOperatingHourException(event) {
    event.preventDefault();
    setSaving(`hour-exceptions:${editingOperatingHourException.id}`);
    setError("");
    try {
      const result = await apiRequest(`/admin/poi-operating-hour-exceptions/${editingOperatingHourException.id}`, {
        method: "PUT",
        body: JSON.stringify(editingOperatingHourException)
      });
      setData((current) => ({
        ...current,
        operatingHourExceptions: current.operatingHourExceptions.some((item) => item.id === result.operatingHourException.id)
          ? current.operatingHourExceptions.map((item) => item.id === result.operatingHourException.id ? result.operatingHourException : item)
          : [...current.operatingHourExceptions, result.operatingHourException]
      }));
      setEditingOperatingHourException(null);
    } catch {
      setError(c.failed);
    } finally {
      setSaving("");
    }
  }

  async function retireOperatingHour(item) {
    const isException = Boolean(item.exceptionDate);
    setSaving(`hours:${item.id}`);
    setError("");
    try {
      const result = await apiRequest(`/admin/${isException ? "poi-operating-hour-exceptions" : "poi-operating-hours"}/${item.id}`, { method: "DELETE" });
      setData((current) => isException ? {
        ...current,
        operatingHourExceptions: current.operatingHourExceptions.map((record) => record.id === item.id ? { ...record, ...result.operatingHourException } : record)
      } : {
        ...current,
        operatingHours: current.operatingHours.map((record) => record.id === item.id ? { ...record, ...result.operatingHour } : record)
      });
    } catch {
      setError(c.failed);
    } finally {
      setSaving("");
    }
  }

  async function reviewOperatingHour(item, verificationStatus) {
    const isException = Boolean(item.exceptionDate);
    setSaving(`review:${item.id}`);
    setError("");
    try {
      const result = await apiRequest(`/admin/${isException ? "poi-operating-hour-exceptions" : "poi-operating-hours"}/${item.id}/verification`, {
        method: "PATCH",
        body: JSON.stringify({ verificationStatus })
      });
      setData((current) => isException ? {
        ...current,
        operatingHourExceptions: current.operatingHourExceptions.map((record) => record.id === item.id ? result.operatingHourException : record)
      } : {
        ...current,
        operatingHours: current.operatingHours.map((record) => record.id === item.id ? result.operatingHour : record)
      });
    } catch {
      setError(c.failed);
    } finally {
      setSaving("");
    }
  }

  async function reviewOperatingHourGroup(records, verificationStatus) {
    setSaving(`review-group:${records[0]?.poiId ?? "unknown"}`);
    setError("");
    try {
      const reviewed = [];
      for (const item of records) {
        const result = await apiRequest(`/admin/poi-operating-hours/${item.id}/verification`, {
          method: "PATCH",
          body: JSON.stringify({ verificationStatus })
        });
        reviewed.push(result.operatingHour);
      }
      setData((current) => ({
        ...current,
        operatingHours: current.operatingHours.map((record) => reviewed.find(({ id }) => id === record.id) ?? record)
      }));
    } catch {
      setError(c.failed);
    } finally {
      setSaving("");
    }
  }

  function buildBulkOperatingHoursPreview() {
    const poiIds = new Set((data?.pois ?? []).map(({ id }) => id));
    const rows = bulkOperatingHoursCsv.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
    const preview = rows.flatMap((row, index) => {
      const columns = parseCsvLine(row);
      if (index === 0 && columns[0]?.toLowerCase() === "poi_id") return [];
      if (columns.length < 10) {
        return [{ id: `row-${index}`, rowNumber: index + 1, poiId: columns[0] ?? "-", weekdays: "-", opensAt: "-", closesAt: "-", sourceName: "-", status: "-", result: "Malformed row", valid: false, records: [] }];
      }
      const [poiId, weekdays, opensAt, closesAt, isClosedValue, sourceName, sourceUrl, sourceType, lastReviewedDate, status, notes] = columns;
      const { days, invalid } = parseWeekdayList(weekdays);
      const isClosed = isClosedValue.toLowerCase() === "true";
      const issues = [];
      if (!poiIds.has(poiId)) issues.push("Unknown POI ID");
      if (invalid.length || days.length === 0) issues.push("Invalid weekday");
      if (!isClosed && (!hasValidTime(opensAt) || !hasValidTime(closesAt) || opensAt >= closesAt)) issues.push("Invalid time");
      if (!sourceName) issues.push("Missing source name");
      if (!sourceUrl) issues.push("Missing source URL");
      const duplicate = days.some((dayOfWeek) => (data?.operatingHours ?? []).some((record) => (
        record.status !== "UNAVAILABLE" &&
        record.poiId === poiId &&
        record.dayOfWeek === dayOfWeek &&
        record.opensAt === (isClosed ? null : opensAt) &&
        record.closesAt === (isClosed ? null : closesAt) &&
        record.sourceUrl === sourceUrl
      )));
      if (duplicate) issues.push("Duplicate weekly record");
      const records = days.map((dayOfWeek) => ({
        id: `import-${poiId}-${dayOfWeek}-${(opensAt || "closed").replace(":", "")}-${index + 1}`,
        poiId,
        dayOfWeek,
        opensAt: isClosed ? null : opensAt,
        closesAt: isClosed ? null : closesAt,
        isClosed,
        sourceName,
        sourceUrl,
        sourceType: sourceType || "OFFICIAL",
        lastReviewedDate,
        verificationStatus: "PENDING_REVIEW",
        status: status || "ACTIVE",
        notes: notes || undefined
      }));
      return [{
        id: `row-${index}`,
        rowNumber: index + 1,
        poiId,
        weekdays: days.map(weekdayLabel).join(", ") || weekdays,
        opensAt: isClosed ? "Closed" : opensAt,
        closesAt: isClosed ? "Closed" : closesAt,
        sourceName,
        status: status || "ACTIVE",
        result: issues.length ? issues.join("; ") : "Ready to import",
        valid: issues.length === 0,
        records
      }];
    });
    setBulkOperatingHoursPreview(preview);
  }

  async function importValidOperatingHours() {
    const records = bulkOperatingHoursPreview.filter(({ valid }) => valid).flatMap(({ records }) => records);
    setSaving("operating-hours-import");
    setError("");
    try {
      const imported = [];
      for (const record of records) {
        const result = await apiRequest(`/admin/poi-operating-hours/${record.id}`, {
          method: "PUT",
          body: JSON.stringify({ ...record, verificationStatus: "PENDING_REVIEW" })
        });
        imported.push(result.operatingHour);
      }
      setData((current) => ({
        ...current,
        operatingHours: imported.reduce((records, operatingHour) => (
          records.some((item) => item.id === operatingHour.id)
            ? records.map((item) => item.id === operatingHour.id ? operatingHour : item)
            : [...records, operatingHour]
        ), current.operatingHours)
      }));
    } catch {
      setError(c.failed);
    } finally {
      setSaving("");
    }
  }

  async function retirePoi(item) {
    setSaving(`pois:${item.id}`);
    setError("");
    try {
      const result = await apiRequest(`/admin/pois/${item.id}`, { method: "DELETE" });
      setData((current) => ({
        ...current,
        pois: current.pois.map((record) => record.id === item.id ? { ...record, ...result.poi } : record)
      }));
    } catch {
      setError(c.failed);
    } finally {
      setSaving("");
    }
  }

  const tabs = {
    destinations: c.destinations,
    pois: c.pois,
    costs: c.costs
  };
  const overview = data ? {
    supportedPois: (data.pois ?? []).filter(({ status }) => status !== "UNAVAILABLE").length,
    activePriceReferences: (data.costReferences ?? []).filter(({ status }) => status === "ACTIVE").length,
    poisWithActiveOperatingHours: data.coverage?.activeOperatingHoursPoiCount ?? 0,
    outdatedOrUnavailableRecords: [
      ...(data.destinations ?? []),
      ...(data.pois ?? []),
      ...(data.costReferences ?? []),
      ...(data.operatingHours ?? []),
      ...(data.operatingHourExceptions ?? [])
    ].filter(({ status }) => status === "OUTDATED" || status === "UNAVAILABLE").length,
    poisWithoutActiveOperatingHours: Math.max(0, ((data.pois ?? []).filter(({ status }) => status !== "UNAVAILABLE").length) - (data.coverage?.activeOperatingHoursPoiCount ?? 0)),
    outdatedPriceReferences: (data.costReferences ?? []).filter(({ status }) => status === "OUTDATED").length,
    unavailablePriceReferences: (data.costReferences ?? []).filter(({ status }) => status === "UNAVAILABLE").length,
    outdatedOperatingHours: [
      ...(data.operatingHours ?? []),
      ...(data.operatingHourExceptions ?? [])
    ].filter(({ status }) => status === "OUTDATED").length
  } : null;
  const operatingHourReviewGroups = data ? Object.values((data.operatingHours ?? [])
    .filter((item) => (item.verificationStatus ?? "PENDING_REVIEW") === "PENDING_REVIEW")
    .reduce((groups, item) => {
      const key = [item.poiId, item.sourceUrl, item.lastReviewedDate, item.opensAt, item.closesAt, item.isClosed, item.sourceName].join("|");
      groups[key] = groups[key] ?? { key, records: [], label: `${item.poiId} · ${item.sourceName} · ${item.lastReviewedDate}`, sourceUrl: item.sourceUrl };
      groups[key].records.push(item);
      return groups;
    }, {})) : [];

  return (
    <AppShell hideFooter>
      <section className="border-b border-ink/10 bg-ink px-5 py-10 text-white sm:px-8 sm:py-14">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-sun"><ShieldCheck className="h-5 w-5" /><span>System Administrator</span><span className="rounded-full border border-sun/40 bg-sun/18 px-2.5 py-1 text-xs font-black text-sun">ADMIN</span><span className="text-white/60">{user?.email}</span></div>
            <h1 className="mt-3 font-display text-4xl font-extrabold text-white sm:text-5xl">Nuogo Admin Console</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/68">{c.intro}</p>
          </div>
          <button type="button" onClick={loadData} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white px-4 text-sm font-bold text-ink transition-colors hover:border-sun hover:text-ink">
            <RefreshCw className="h-4 w-4" /> {language === "zh" ? "刷新数据" : "Refresh data"}
          </button>
        </div>
      </section>

      <section className="px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-4 flex justify-end">
            <label className="flex items-center gap-3 text-xs font-extrabold text-ink/58">
              {language === "zh" ? "数据城市" : "Data city"}
              <select aria-label="Data city" value={city} onChange={(event) => { setCity(event.target.value); setEditingCost(null); setEditingOperatingHour(null); setEditingOperatingHourException(null); }} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold text-ink">
                {cityOptions.map((option) => <option key={option.id} value={option.id}>{option[language]}</option>)}
              </select>
            </label>
          </div>
          {data && <>
            <section aria-label="Admin maintenance overview" className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                plural(overview.supportedPois, "supported POI", "supported POIs"),
                plural(overview.activePriceReferences, "active price reference"),
                plural(overview.poisWithActiveOperatingHours, "POI with active operating hours", "POIs with active operating hours"),
                plural(overview.outdatedOrUnavailableRecords, "outdated / unavailable record")
              ].map((label) => <div key={label} className="border border-ink/10 bg-white px-4 py-4">
                <p className="text-sm font-extrabold text-ink">{label}</p>
                <p className="mt-1 text-xs font-semibold text-ink/55">Real records loaded from the Admin API.</p>
              </div>)}
            </section>

            <section aria-label="Needs Attention" className="mb-6 border border-sun/30 bg-sun/8 px-4 py-4">
              <h2 className="font-display text-lg font-extrabold text-ink">Needs Attention</h2>
              <div className="mt-3 grid gap-2 text-sm font-bold text-ink/68 sm:grid-cols-2 xl:grid-cols-4">
                <span>POIs without active operating hours: {overview.poisWithoutActiveOperatingHours}</span>
                <span>Outdated price references: {overview.outdatedPriceReferences}</span>
                <span>Unavailable price references: {overview.unavailablePriceReferences}</span>
                <span>Outdated operating-hour records: {overview.outdatedOperatingHours}</span>
              </div>
            </section>
          </>}

          <div role="tablist" aria-label={c.title} className="flex gap-1 overflow-x-auto border-b border-ink/10">
            {tabIds.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={`min-h-12 shrink-0 border-b-2 px-4 text-sm font-extrabold transition-colors ${activeTab === id ? "border-lake text-lake" : "border-transparent text-ink/52 hover:text-ink"}`}
              >
                {tabs[id]}
              </button>
            ))}
          </div>

          {error && (
            <div role="alert" className="mt-6 flex flex-col justify-between gap-4 border border-red-200 bg-red-50 p-5 text-red-800 sm:flex-row sm:items-center">
              <span className="flex items-center gap-2 font-bold"><AlertTriangle className="h-5 w-5 shrink-0" />{error}</span>
              {!data && <button type="button" aria-label={c.retry} onClick={loadData} className="min-h-11 rounded-lg bg-red-800 px-4 text-sm font-bold text-white">{c.retry}</button>}
            </div>
          )}

          {!data && !error && <div role="status" className="flex min-h-56 items-center justify-center gap-3 text-ink/55"><Database className="h-5 w-5" />{c.loading}</div>}

          {data && <div className="pt-6">
            {activeTab === "destinations" && <section role="region" aria-label={c.destinations}>
              <DataTable headers={[c.name, c.status]} empty={c.empty} colSpan={2}>
              {data.destinations?.map((item) => <tr key={item.id}>
                <td className="px-5 py-4 font-bold text-ink">{displayName(item.name, language)}</td>
                <td className="px-5 py-4"><StatusSelect label={`${displayName(item.name, language)} status`} value={item.status} values={["ACTIVE", "OUTDATED", "UNAVAILABLE"]} disabled={saving === `destinations:${item.id}`} onChange={(status) => updateStatus("destinations", item.id, status)} language={language} /></td>
              </tr>)}
              </DataTable>
            </section>}

            {activeTab === "pois" && <section role="region" aria-label={c.pois}>
              <DataTable headers={[c.name, c.identity, c.providerId, c.category, c.coordinates, c.source, c.status, c.actions]} empty={c.empty} colSpan={8}>
              {data.pois?.map((item) => <tr key={item.id}>
                <td className="px-5 py-4 font-bold text-ink">{displayName(item.name, language)}</td>
                <td className="px-5 py-4 font-mono text-xs text-ink/65">{item.id}</td>
                <td className="px-5 py-4 font-mono text-xs text-ink/65">{item.sources?.map((source) => source.sourceId).filter(Boolean).join(", ") || "-"}</td>
                <td className="px-5 py-4 text-ink/65">{displayLabel(language, "category", item.category)}</td>
                <td className="whitespace-nowrap px-5 py-4 text-ink/65">{formatCoordinates(item.coordinates)}</td>
                <td className="px-5 py-4 text-ink/65">{item.sources?.map((source) => displayLabel(language, "source", source.provider)).join(", ")}</td>
                <td className="px-5 py-4 text-ink/65">{displayLabel(language, "lifecycle", item.status)}</td>
                <td className="px-5 py-4">
                  <button type="button" aria-label={`Retire ${displayName(item.name, language)}`} disabled={item.status === "UNAVAILABLE" || Boolean(saving)} onClick={() => retirePoi(item)} className="grid h-11 w-11 place-items-center rounded-lg border border-ink/15 text-ink transition-colors hover:border-red-500 hover:text-red-700 disabled:opacity-35" title={language === "zh" ? "停用兴趣点" : "Retire POI"}><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>)}
              </DataTable>

              <section className="mt-8 border-t border-ink/10 pt-6">
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-display text-2xl font-extrabold text-ink">Operating Hours</h2>
                  <p className="mt-1 text-sm font-semibold text-ink/55">Opening hours verified from stored source-backed information. Not a real-time guarantee.</p>
                  {data.coverage && <p className="mt-1 text-sm font-extrabold text-lake">
                    {data.coverage.activeOperatingHoursPoiCount} / {data.coverage.canonicalPoiCount} POIs with active operating-hour records ({data.coverage.activeOperatingHoursPoiPercentage ?? 0}%)
                  </p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" aria-label="Create weekly operating hours" onClick={createOperatingHour} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-lake px-4 text-sm font-extrabold text-white"><Plus className="h-4 w-4" /> Weekly hours</button>
                  <button type="button" aria-label="Create operating hours exception" onClick={createOperatingHourException} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ink/15 bg-white px-4 text-sm font-extrabold text-ink"><Plus className="h-4 w-4" /> Exception</button>
                </div>
              </div>
              {editingOperatingHour && <form onSubmit={saveOperatingHour} className="mb-4 grid gap-4 border-y border-ink/10 bg-ink/[0.025] px-5 py-5 md:grid-cols-2 xl:grid-cols-6">
                <label className="grid gap-2 text-xs font-extrabold text-ink/60">POI ID<input aria-label="Operating Hours POI ID" required value={editingOperatingHour.poiId} onChange={(event) => setEditingOperatingHour((current) => ({ ...current, poiId: event.target.value }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 font-mono text-sm text-ink" /></label>
                <label className="grid gap-2 text-xs font-extrabold text-ink/60">Weekday<select aria-label="Weekday" value={editingOperatingHour.dayOfWeek} onChange={(event) => {
                  const dayOfWeek = Number(event.target.value);
                  setEditingOperatingHour((current) => ({ ...current, dayOfWeek, applyDays: [dayOfWeek] }));
                }} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold text-ink">{weekdayOptions.map(({ label, value }) => <option key={label} value={value}>{label}</option>)}</select></label>
                <label className="grid gap-2 text-xs font-extrabold text-ink/60">Opens At<input aria-label="Opens At" type="time" value={editingOperatingHour.opensAt ?? ""} onChange={(event) => setEditingOperatingHour((current) => ({ ...current, opensAt: event.target.value || null }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink" /></label>
                <label className="grid gap-2 text-xs font-extrabold text-ink/60">Closes At<input aria-label="Closes At" type="time" value={editingOperatingHour.closesAt ?? ""} onChange={(event) => setEditingOperatingHour((current) => ({ ...current, closesAt: event.target.value || null }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink" /></label>
                <label className="flex min-h-11 items-center gap-2 self-end rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold text-ink"><input aria-label="Closed Weekday" type="checkbox" checked={editingOperatingHour.isClosed} onChange={(event) => setEditingOperatingHour((current) => ({ ...current, isClosed: event.target.checked, ...(event.target.checked ? { opensAt: null, closesAt: null } : {}) }))} /> Closed</label>
                <div className="flex gap-2 self-end"><button type="submit" aria-label="Save operating hours" disabled={Boolean(saving)} className="grid h-11 w-11 place-items-center rounded-lg bg-lake text-white"><Save className="h-4 w-4" /></button><button type="button" aria-label="Cancel operating hours" onClick={() => setEditingOperatingHour(null)} className="grid h-11 w-11 place-items-center rounded-lg border border-ink/15 bg-white text-ink"><X className="h-4 w-4" /></button></div>
                <label className="grid gap-2 text-xs font-extrabold text-ink/60">Source Name<input aria-label="Operating Hours Source Name" required value={editingOperatingHour.sourceName} onChange={(event) => setEditingOperatingHour((current) => ({ ...current, sourceName: event.target.value }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink" /></label>
                <label className="grid gap-2 text-xs font-extrabold text-ink/60">Source URL<input aria-label="Operating Hours Source URL" type="url" required value={editingOperatingHour.sourceUrl} onChange={(event) => setEditingOperatingHour((current) => ({ ...current, sourceUrl: event.target.value }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink" /></label>
                <label className="grid gap-2 text-xs font-extrabold text-ink/60">Source Type<select aria-label="Operating Hours Source Type" value={editingOperatingHour.sourceType} onChange={(event) => setEditingOperatingHour((current) => ({ ...current, sourceType: event.target.value }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold text-ink">{sourceTypeOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                <label className="grid gap-2 text-xs font-extrabold text-ink/60">Last Reviewed<input aria-label="Operating Hours Last Reviewed" type="date" required value={editingOperatingHour.lastReviewedDate} onChange={(event) => setEditingOperatingHour((current) => ({ ...current, lastReviewedDate: event.target.value }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink" /></label>
                <label className="grid gap-2 text-xs font-extrabold text-ink/60">Status<select aria-label="Operating Hours Status" value={editingOperatingHour.status} onChange={(event) => setEditingOperatingHour((current) => ({ ...current, status: event.target.value }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold text-ink">{["ACTIVE", "OUTDATED", "UNAVAILABLE"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                <label className="grid gap-2 text-xs font-extrabold text-ink/60 md:col-span-2 xl:col-span-1">Notes<input aria-label="Operating Hours Notes" value={editingOperatingHour.notes ?? ""} onChange={(event) => setEditingOperatingHour((current) => ({ ...current, notes: event.target.value || undefined }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink" /></label>
                <fieldset className="grid gap-3 md:col-span-2 xl:col-span-6">
                  <legend className="text-xs font-extrabold text-ink/60">Apply to weekdays</legend>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" aria-label="Select all weekdays" onClick={() => setEditingOperatingHour((current) => ({ ...current, applyDays: allWeekdays }))} className="min-h-10 rounded-lg border border-ink/15 bg-white px-3 text-xs font-extrabold text-ink">Select All</button>
                    <button type="button" aria-label="Select work weekdays" onClick={() => setEditingOperatingHour((current) => ({ ...current, applyDays: workWeekdays }))} className="min-h-10 rounded-lg border border-ink/15 bg-white px-3 text-xs font-extrabold text-ink">Weekdays</button>
                    <button type="button" aria-label="Select weekend days" onClick={() => setEditingOperatingHour((current) => ({ ...current, applyDays: weekendDays }))} className="min-h-10 rounded-lg border border-ink/15 bg-white px-3 text-xs font-extrabold text-ink">Weekend</button>
                    <button type="button" aria-label="Clear selected weekdays" onClick={() => setEditingOperatingHour((current) => ({ ...current, applyDays: [] }))} className="min-h-10 rounded-lg border border-ink/15 bg-white px-3 text-xs font-extrabold text-ink">Clear</button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {weekdayOptions.map(({ label, value }) => <label key={label} className="flex min-h-10 items-center gap-2 rounded-lg border border-ink/10 bg-white px-3 text-sm font-bold text-ink/75">
                      <input
                        type="checkbox"
                        checked={(editingOperatingHour.applyDays ?? [editingOperatingHour.dayOfWeek]).includes(value)}
                        onChange={(event) => setEditingOperatingHour((current) => {
                          const currentDays = current.applyDays ?? [current.dayOfWeek];
                          const applyDays = event.target.checked
                            ? [...new Set([...currentDays, value])].sort()
                            : currentDays.filter((day) => day !== value);
                          return { ...current, applyDays };
                        })}
                      />
                      {label}
                    </label>)}
                  </div>
                </fieldset>
              </form>}
              {editingOperatingHourException && <form onSubmit={saveOperatingHourException} className="mb-4 grid gap-4 border-y border-ink/10 bg-ink/[0.025] px-5 py-5 md:grid-cols-2 xl:grid-cols-6">
                <label className="grid gap-2 text-xs font-extrabold text-ink/60">POI ID<input aria-label="Exception POI ID" required value={editingOperatingHourException.poiId} onChange={(event) => setEditingOperatingHourException((current) => ({ ...current, poiId: event.target.value }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 font-mono text-sm text-ink" /></label>
                <label className="grid gap-2 text-xs font-extrabold text-ink/60">Exception Date<input aria-label="Exception Date" type="date" required value={editingOperatingHourException.exceptionDate} onChange={(event) => setEditingOperatingHourException((current) => ({ ...current, exceptionDate: event.target.value }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink" /></label>
                <label className="grid gap-2 text-xs font-extrabold text-ink/60">Opens At<input aria-label="Exception Opens At" type="time" value={editingOperatingHourException.opensAt ?? ""} onChange={(event) => setEditingOperatingHourException((current) => ({ ...current, opensAt: event.target.value || null }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink" /></label>
                <label className="grid gap-2 text-xs font-extrabold text-ink/60">Closes At<input aria-label="Exception Closes At" type="time" value={editingOperatingHourException.closesAt ?? ""} onChange={(event) => setEditingOperatingHourException((current) => ({ ...current, closesAt: event.target.value || null }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink" /></label>
                <label className="flex min-h-11 items-center gap-2 self-end rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold text-ink"><input aria-label="Closed Exception" type="checkbox" checked={editingOperatingHourException.isClosed} onChange={(event) => setEditingOperatingHourException((current) => ({ ...current, isClosed: event.target.checked, ...(event.target.checked ? { opensAt: null, closesAt: null } : {}) }))} /> Closed</label>
                <div className="flex gap-2 self-end"><button type="submit" aria-label="Save operating hours exception" disabled={Boolean(saving)} className="grid h-11 w-11 place-items-center rounded-lg bg-lake text-white"><Save className="h-4 w-4" /></button><button type="button" aria-label="Cancel operating hours exception" onClick={() => setEditingOperatingHourException(null)} className="grid h-11 w-11 place-items-center rounded-lg border border-ink/15 bg-white text-ink"><X className="h-4 w-4" /></button></div>
                <label className="grid gap-2 text-xs font-extrabold text-ink/60">Reason<input aria-label="Exception Reason" value={editingOperatingHourException.reason ?? ""} onChange={(event) => setEditingOperatingHourException((current) => ({ ...current, reason: event.target.value || undefined }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink" /></label>
                <label className="grid gap-2 text-xs font-extrabold text-ink/60">Source Name<input aria-label="Exception Source Name" required value={editingOperatingHourException.sourceName} onChange={(event) => setEditingOperatingHourException((current) => ({ ...current, sourceName: event.target.value }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink" /></label>
                <label className="grid gap-2 text-xs font-extrabold text-ink/60">Source URL<input aria-label="Exception Source URL" type="url" required value={editingOperatingHourException.sourceUrl} onChange={(event) => setEditingOperatingHourException((current) => ({ ...current, sourceUrl: event.target.value }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink" /></label>
                <label className="grid gap-2 text-xs font-extrabold text-ink/60">Source Type<select aria-label="Exception Source Type" value={editingOperatingHourException.sourceType} onChange={(event) => setEditingOperatingHourException((current) => ({ ...current, sourceType: event.target.value }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold text-ink">{sourceTypeOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                <label className="grid gap-2 text-xs font-extrabold text-ink/60">Last Reviewed<input aria-label="Exception Last Reviewed" type="date" required value={editingOperatingHourException.lastReviewedDate} onChange={(event) => setEditingOperatingHourException((current) => ({ ...current, lastReviewedDate: event.target.value }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink" /></label>
                <label className="grid gap-2 text-xs font-extrabold text-ink/60">Status<select aria-label="Exception Status" value={editingOperatingHourException.status} onChange={(event) => setEditingOperatingHourException((current) => ({ ...current, status: event.target.value }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold text-ink">{["ACTIVE", "OUTDATED", "UNAVAILABLE"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              </form>}
              <section className="mb-5 grid gap-4 border-y border-ink/10 bg-white px-5 py-5 lg:grid-cols-[1fr_1fr]">
                <div className="grid gap-3">
                  <h3 className="font-display text-lg font-extrabold text-ink">Bulk Import</h3>
                  <label className="grid gap-2 text-xs font-extrabold text-ink/60">
                    Bulk operating hours CSV
                    <textarea
                      aria-label="Bulk operating hours CSV"
                      value={bulkOperatingHoursCsv}
                      onChange={(event) => setBulkOperatingHoursCsv(event.target.value)}
                      rows={6}
                      className="min-h-32 rounded-lg border border-ink/15 bg-white px-3 py-3 font-mono text-xs text-ink"
                      placeholder="poi_id,weekdays,opens_at,closes_at,is_closed,source_name,source_url,source_type,last_reviewed_date,status,notes"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" aria-label="Preview operating hours CSV" onClick={buildBulkOperatingHoursPreview} className="min-h-11 rounded-lg bg-lake px-4 text-sm font-extrabold text-white">Preview CSV</button>
                    <button type="button" aria-label="Import valid operating hours" disabled={!bulkOperatingHoursPreview.some(({ valid }) => valid) || Boolean(saving)} onClick={importValidOperatingHours} className="min-h-11 rounded-lg border border-ink/15 bg-white px-4 text-sm font-extrabold text-ink disabled:opacity-35">Import valid rows</button>
                  </div>
                </div>
                <div className="grid gap-3">
                  <h3 className="font-display text-lg font-extrabold text-ink">Grouped Review</h3>
                  <div className="grid gap-2">
                    {operatingHourReviewGroups.length === 0 && <p className="text-sm font-semibold text-ink/55">No pending weekly groups.</p>}
                    {operatingHourReviewGroups.map((group) => <div key={group.key} className="border border-ink/10 bg-paper px-4 py-3">
                      <div className="text-sm font-extrabold text-ink">{group.label}</div>
                      <div className="mt-1 text-xs font-semibold text-ink/55">{group.records.length} weekly records</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {group.sourceUrl && <a href={group.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center px-3 text-xs font-extrabold text-jade underline">View Source</a>}
                        <button type="button" aria-label={`Verify group ${group.records[0].poiId} ${group.records[0].sourceName}`} disabled={Boolean(saving)} onClick={() => reviewOperatingHourGroup(group.records, "VERIFIED")} className="min-h-10 rounded-lg border border-jade/25 px-3 text-xs font-extrabold text-jade disabled:opacity-35">Verify Group</button>
                        <button type="button" aria-label={`Reject group ${group.records[0].poiId} ${group.records[0].sourceName}`} disabled={Boolean(saving)} onClick={() => reviewOperatingHourGroup(group.records, "REJECTED")} className="min-h-10 rounded-lg border border-red-200 px-3 text-xs font-extrabold text-red-700 disabled:opacity-35">Reject Group</button>
                      </div>
                    </div>)}
                  </div>
                </div>
                {bulkOperatingHoursPreview.length > 0 && <div className="lg:col-span-2">
                  <DataTable headers={["POI", "Weekdays", "Opening Time", "Closing Time", "Source", "Status", "Import Result"]} empty={c.empty} colSpan={7}>
                    {bulkOperatingHoursPreview.map((item) => <tr key={item.id}>
                      <td className="px-5 py-4 font-mono text-xs text-ink/65">{item.poiId}</td>
                      <td className="px-5 py-4 text-ink/65">{item.weekdays}</td>
                      <td className="px-5 py-4 text-ink/65">{item.opensAt}</td>
                      <td className="px-5 py-4 text-ink/65">{item.closesAt}</td>
                      <td className="px-5 py-4 text-ink/65">{item.sourceName}</td>
                      <td className="px-5 py-4 text-ink/65">{item.status}</td>
                      <td className={`px-5 py-4 font-extrabold ${item.valid ? "text-jade" : "text-red-700"}`}>{item.result}</td>
                    </tr>)}
                  </DataTable>
                </div>}
              </section>
              <DataTable headers={["POI ID", "Schedule", "Source", "Last Reviewed", "Status", "Verification Status", "Actions"]} empty={c.empty} colSpan={7}>
                {[...(data.operatingHours ?? []), ...(data.operatingHourExceptions ?? [])].map((item) => <tr key={item.id}>
                  <td className="px-5 py-4 font-mono text-xs text-ink/65">{item.poiId}</td>
                  <td className="px-5 py-4 text-ink/65">{item.exceptionDate ? `${item.exceptionDate} exception` : `Weekday ${item.dayOfWeek}`} {" · "} {item.isClosed ? "Closed" : `${item.opensAt} - ${item.closesAt}`}</td>
                  <td className="px-5 py-4 text-ink/65">
                    <div>{item.sourceName}</div>
                    {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" aria-label={`View Source for operating hours ${item.id}`} className="mt-1 inline-flex min-h-8 items-center gap-1 text-xs font-extrabold text-jade underline"><ExternalLink className="h-3.5 w-3.5" /> View Source</a>}
                  </td>
                  <td className="px-5 py-4 text-ink/65">{item.lastReviewedDate}</td>
                  <td className="px-5 py-4 text-ink/65">{displayLabel(language, "lifecycle", item.status)}</td>
                  <td className="px-5 py-4 text-ink/65">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${item.verificationStatus === "VERIFIED" ? "bg-jade/10 text-jade" : item.verificationStatus === "REJECTED" ? "bg-red-50 text-red-700" : "bg-sun/18 text-amber-800"}`}>{verificationLabel(item.verificationStatus)}</span>
                    {item.verifiedAt && <div className="mt-1 text-xs font-semibold text-ink/45">{item.verifiedAt.slice(0, 10)}</div>}
                  </td>
                  <td className="px-5 py-4"><div className="flex flex-wrap gap-2">
                    {(item.verificationStatus ?? "PENDING_REVIEW") === "PENDING_REVIEW" && <>
                      <button type="button" aria-label={`Verify operating hours ${item.id}`} disabled={Boolean(saving)} onClick={() => reviewOperatingHour(item, "VERIFIED")} className="grid h-11 w-11 place-items-center rounded-lg border border-jade/25 text-jade transition-colors hover:bg-jade/10 disabled:opacity-35"><CheckCircle2 className="h-4 w-4" /></button>
                      <button type="button" aria-label={`Reject operating hours ${item.id}`} disabled={Boolean(saving)} onClick={() => reviewOperatingHour(item, "REJECTED")} className="grid h-11 w-11 place-items-center rounded-lg border border-red-200 text-red-700 transition-colors hover:bg-red-50 disabled:opacity-35"><XCircle className="h-4 w-4" /></button>
                    </>}
                    <button type="button" aria-label={`Edit operating hours ${item.id}`} onClick={() => item.exceptionDate ? setEditingOperatingHourException({ ...item }) : setEditingOperatingHour({ ...item })} className="grid h-11 w-11 place-items-center rounded-lg border border-ink/15 text-ink transition-colors hover:border-lake hover:text-lake"><Pencil className="h-4 w-4" /></button>
                    <button type="button" aria-label={`Retire operating hours ${item.id}`} disabled={item.status === "UNAVAILABLE" || Boolean(saving)} onClick={() => retireOperatingHour(item)} className="grid h-11 w-11 place-items-center rounded-lg border border-ink/15 text-ink transition-colors hover:border-red-500 hover:text-red-700 disabled:opacity-35"><Trash2 className="h-4 w-4" /></button>
                  </div></td>
                </tr>)}
              </DataTable>
              </section>
            </section>}

            {activeTab === "costs" && <section role="region" aria-label={c.costs}>
              {editingCost && <form onSubmit={saveCostReference} className="mb-6 border-y border-ink/10 bg-ink/[0.025] px-5 py-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto] xl:items-end">
                  <label className="grid gap-2 text-xs font-extrabold text-ink/60">
                    {language === "zh" ? "来源名称" : "Source Name"}
                    <input aria-label="Source Name" required maxLength={160} value={editingCost.sourceName} onChange={(event) => setEditingCost((current) => ({ ...current, sourceName: event.target.value }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-medium text-ink" />
                  </label>
                  <label className="grid gap-2 text-xs font-extrabold text-ink/60">
                    {language === "zh" ? "HTTPS 来源网址" : "Source URL"}
                    <input aria-label="Source URL" type="url" required value={editingCost.sourceUrl} onChange={(event) => setEditingCost((current) => ({ ...current, sourceUrl: event.target.value }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-medium text-ink" />
                  </label>
                  <label className="grid gap-2 text-xs font-extrabold text-ink/60">
                    {language === "zh" ? "采集日期" : "Collected Date"}
                    <input aria-label="Collected Date" type="date" required value={editingCost.collectedOn} onChange={(event) => setEditingCost((current) => ({ ...current, collectedOn: event.target.value }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-medium text-ink" />
                  </label>
                  <label className="grid gap-2 text-xs font-extrabold text-ink/60">
                    Reference Type
                    <select
                      aria-label="Reference Type"
                      value={editingCost.referenceType ?? ""}
                      onChange={(event) => {
                        const referenceType = event.target.value || undefined;
                        setEditingCost((current) => ({
                          ...current,
                          referenceType,
                          ...(referenceType === "FREE" ? { minMinor: 0, representativeMinor: 0, maxMinor: 0 } : {})
                        }));
                      }}
                      className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold text-ink"
                    >
                      <option value="">Legacy</option>
                      {referenceTypeOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <div className="flex gap-2 md:col-span-2 xl:col-span-1">
                    <button type="submit" aria-label="Save cost reference" disabled={Boolean(saving)} className="grid h-11 w-11 place-items-center rounded-lg bg-lake text-white disabled:opacity-50" title={language === "zh" ? "保存费用参考" : "Save cost reference"}><Save className="h-4 w-4" /></button>
                    <button type="button" aria-label="Cancel editing cost reference" onClick={() => setEditingCost(null)} className="grid h-11 w-11 place-items-center rounded-lg border border-ink/15 bg-white text-ink" title={language === "zh" ? "取消" : "Cancel"}><X className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <label className="grid gap-2 text-xs font-extrabold text-ink/60">
                    Planning Price
                    <input aria-label="Planning price" type="number" min="0" step="0.01" value={(editingCost.representativeMinor ?? 0) / 100} onChange={(event) => updatePlanningPrice(event.target.value)} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-medium text-ink" />
                    {editingCost.referenceType === "FREE" && <span className="text-xs font-bold text-jade">FREE records must remain S$0.</span>}
                  </label>
                  <label className="grid gap-2 text-xs font-extrabold text-ink/60">
                    POI ID
                    <input aria-label="POI ID" maxLength={120} value={editingCost.poiId ?? ""} onChange={(event) => setEditingCost((current) => ({ ...current, poiId: event.target.value || undefined }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 font-mono text-sm text-ink" />
                  </label>
                  <label className="grid gap-2 text-xs font-extrabold text-ink/60">
                    Source Type
                    <select aria-label="Source Type" value={editingCost.sourceType ?? ""} onChange={(event) => setEditingCost((current) => ({ ...current, sourceType: event.target.value || undefined }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold text-ink">
                      <option value="">Legacy</option>
                      {sourceTypeOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2 text-xs font-extrabold text-ink/60">
                    Unit Type
                    <select aria-label="Unit Type" value={editingCost.unitType ?? ""} onChange={(event) => setEditingCost((current) => ({ ...current, unitType: event.target.value || undefined }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold text-ink">
                      <option value="">Legacy</option>
                      {unitTypeOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2 text-xs font-extrabold text-ink/60">
                    Last Reviewed
                    <input aria-label="Last Reviewed" type="date" value={editingCost.lastReviewedDate ?? ""} onChange={(event) => setEditingCost((current) => ({ ...current, lastReviewedDate: event.target.value || undefined }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-medium text-ink" />
                  </label>
                  <label className="grid gap-2 text-xs font-extrabold text-ink/60">
                    Price Basis
                    <input aria-label="Price Basis" maxLength={160} value={editingCost.priceBasis ?? ""} onChange={(event) => setEditingCost((current) => ({ ...current, priceBasis: event.target.value || undefined }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-medium text-ink" />
                  </label>
                  <label className="grid gap-2 text-xs font-extrabold text-ink/60">
                    Status
                    <select aria-label="Status" value={editingCost.status ?? "ACTIVE"} onChange={(event) => setEditingCost((current) => ({ ...current, status: event.target.value }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold text-ink">
                      {["ACTIVE", "OUTDATED", "UNAVAILABLE"].map((value) => <option key={value} value={value}>{displayLabel(language, "lifecycle", value)}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2 text-xs font-extrabold text-ink/60 md:col-span-2 xl:col-span-5">
                    Notes
                    <input aria-label="Notes" maxLength={500} value={editingCost.notes ?? ""} onChange={(event) => setEditingCost((current) => ({ ...current, notes: event.target.value || undefined }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-medium text-ink" />
                  </label>
                </div>
              </form>}
              <div className="mb-4 flex justify-end">
                <button type="button" aria-label="Create price reference" onClick={createCostReference} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-lake px-4 text-sm font-extrabold text-white transition-colors hover:bg-ink">
                  <Plus className="h-4 w-4" /> Create price reference
                </button>
              </div>
              <DataTable headers={[c.category, c.range, "Reference", c.source, c.collected, c.status, language === "zh" ? "操作" : "Actions"]} empty={c.empty} colSpan={7}>
                {data.costReferences?.map((item) => <tr key={item.id}>
                  <td className="px-5 py-4 font-bold text-ink">{displayLabel(language, "costCategory", item.category)}</td>
                  <td className="px-5 py-4 text-ink/65">S$ {(item.minMinor / 100).toFixed(0)} - {(item.maxMinor / 100).toFixed(0)}</td>
                  <td className="px-5 py-4 text-ink/65">
                    <div className="font-bold text-ink">{item.referenceType ?? "-"}</div>
                    <div className="mt-1 font-mono text-xs text-ink/55">{item.poiId ?? item.tier ?? "generic"}</div>
                    {item.priceBasis && <div className="mt-1 text-xs font-semibold text-ink/55">{item.priceBasis}</div>}
                  </td>
                  <td className="px-5 py-4 text-ink/65">{item.sourceName}</td>
                  <td className="px-5 py-4 text-ink/65">{item.collectedOn}</td>
                  <td className="px-5 py-4 text-ink/65">{displayLabel(language, "lifecycle", item.status)}</td>
                  <td className="px-5 py-4"><div className="flex gap-2">
                    <button type="button" aria-label={`Edit ${item.sourceName}`} onClick={() => setEditingCost({ ...item })} className="grid h-11 w-11 place-items-center rounded-lg border border-ink/15 text-ink transition-colors hover:border-lake hover:text-lake"><Pencil className="h-4 w-4" /></button>
                    <button type="button" aria-label={`Retire ${item.sourceName}`} disabled={item.status === "UNAVAILABLE" || Boolean(saving)} onClick={() => retireCostReference(item)} className="grid h-11 w-11 place-items-center rounded-lg border border-ink/15 text-ink transition-colors hover:border-red-500 hover:text-red-700 disabled:opacity-35"><Trash2 className="h-4 w-4" /></button>
                  </div></td>
                </tr>)}
              </DataTable>
            </section>}

          </div>}
          {saving && <p role="status" className="mt-4 text-sm font-bold text-lake">{c.saving}</p>}
        </div>
      </section>
    </AppShell>
  );
}
