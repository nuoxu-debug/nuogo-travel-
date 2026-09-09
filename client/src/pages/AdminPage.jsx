import { AlertTriangle, Database, Pencil, RefreshCw, Save, ShieldCheck, Trash2, X } from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { displayLabel } from "../i18n/display.js";
import AppShell from "../layout/AppShell.jsx";

const copy = {
  en: {
    title: "System Administrator",
    intro: "Maintain the verified records that support itinerary generation.",
    loading: "Loading administration data...",
    retry: "Retry loading administration data",
    destinations: "Destinations",
    pois: "POIs",
    costs: "Cost references",
    name: "Name",
    status: "Status",
    category: "Category",
    source: "Source",
    identity: "POI identity",
    providerId: "Provider ID",
    coordinates: "Coordinates",
    actions: "Actions",
    collected: "Collected",
    range: "Reference range",
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

function displayName(value, language) {
  if (typeof value === "string") return value;
  return value?.[language] || value?.en || value?.zh || "-";
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

export default function AdminPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const c = copy[language];
  const [activeTab, setActiveTab] = useState("destinations");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [editingCost, setEditingCost] = useState(null);
  const [city, setCity] = useState("singapore");

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [destinations, pois, costReferences] = await Promise.all([
        apiRequest("/admin/destinations"),
        apiRequest(`/admin/pois?destinationId=${city}`),
        apiRequest(`/admin/cost-references?city=${city}`)
      ]);
      setData({ ...destinations, ...pois, ...costReferences });
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
        costReferences: current.costReferences.map((item) => item.id === result.costReference.id ? result.costReference : item)
      }));
      setEditingCost(null);
    } catch {
      setError(c.failed);
    } finally {
      setSaving("");
    }
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

  return (
    <AppShell hideFooter>
      <section className="border-b border-ink/10 bg-paper px-5 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2 text-sm font-extrabold text-lake"><ShieldCheck className="h-5 w-5" />{user?.email}</div>
            <h1 className="mt-3 font-display text-4xl font-extrabold text-ink sm:text-5xl">{c.title}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-ink/58">{c.intro}</p>
          </div>
          <button type="button" onClick={loadData} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ink/12 bg-white px-4 text-sm font-bold text-ink transition-colors hover:border-lake hover:text-lake">
            <RefreshCw className="h-4 w-4" /> {language === "zh" ? "刷新数据" : "Refresh data"}
          </button>
        </div>
      </section>

      <section className="px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-4 flex justify-end">
            <label className="flex items-center gap-3 text-xs font-extrabold text-ink/58">
              {language === "zh" ? "数据城市" : "Data city"}
              <select aria-label="Data city" value={city} onChange={(event) => { setCity(event.target.value); setEditingCost(null); }} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-bold text-ink">
                {cityOptions.map((option) => <option key={option.id} value={option.id}>{option[language]}</option>)}
              </select>
            </label>
          </div>
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
            {activeTab === "destinations" && <DataTable headers={[c.name, c.status]} empty={c.empty} colSpan={2}>
              {data.destinations?.map((item) => <tr key={item.id}>
                <td className="px-5 py-4 font-bold text-ink">{displayName(item.name, language)}</td>
                <td className="px-5 py-4"><StatusSelect label={`${displayName(item.name, language)} status`} value={item.status} values={["ACTIVE", "OUTDATED", "UNAVAILABLE"]} disabled={saving === `destinations:${item.id}`} onChange={(status) => updateStatus("destinations", item.id, status)} language={language} /></td>
              </tr>)}
            </DataTable>}

            {activeTab === "pois" && <DataTable headers={[c.name, c.identity, c.providerId, c.category, c.coordinates, c.source, c.status, c.actions]} empty={c.empty} colSpan={8}>
              {data.pois?.map((item) => <tr key={item.id}>
                <td className="px-5 py-4 font-bold text-ink">{displayName(item.name, language)}</td>
                <td className="px-5 py-4 font-mono text-xs text-ink/65">{item.id}</td>
                <td className="px-5 py-4 font-mono text-xs text-ink/65">{item.sources?.map((source) => source.sourceId).filter(Boolean).join(", ") || "-"}</td>
                <td className="px-5 py-4 text-ink/65">{displayLabel(language, "category", item.category)}</td>
                <td className="whitespace-nowrap px-5 py-4 text-ink/65">{item.coordinates ? `${item.coordinates.latitude.toFixed(4)}, ${item.coordinates.longitude.toFixed(4)}` : "-"}</td>
                <td className="px-5 py-4 text-ink/65">{item.sources?.map((source) => displayLabel(language, "source", source.provider)).join(", ")}</td>
                <td className="px-5 py-4 text-ink/65">{displayLabel(language, "lifecycle", item.status)}</td>
                <td className="px-5 py-4">
                  <button type="button" aria-label={`Retire ${displayName(item.name, language)}`} disabled={item.status === "UNAVAILABLE" || Boolean(saving)} onClick={() => retirePoi(item)} className="grid h-11 w-11 place-items-center rounded-lg border border-ink/15 text-ink transition-colors hover:border-red-500 hover:text-red-700 disabled:opacity-35" title={language === "zh" ? "停用兴趣点" : "Retire POI"}><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>)}
            </DataTable>}

            {activeTab === "costs" && <>
              {editingCost && <form onSubmit={saveCostReference} className="mb-6 border-y border-ink/10 bg-ink/[0.025] px-5 py-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr_180px_auto] lg:items-end">
                  <label className="grid gap-2 text-xs font-extrabold text-ink/60">
                    {language === "zh" ? "来源名称" : "Source name"}
                    <input aria-label="Source name" required maxLength={160} value={editingCost.sourceName} onChange={(event) => setEditingCost((current) => ({ ...current, sourceName: event.target.value }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-medium text-ink" />
                  </label>
                  <label className="grid gap-2 text-xs font-extrabold text-ink/60">
                    {language === "zh" ? "HTTPS 来源网址" : "HTTPS source URL"}
                    <input aria-label="HTTPS source URL" type="url" required value={editingCost.sourceUrl} onChange={(event) => setEditingCost((current) => ({ ...current, sourceUrl: event.target.value }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-medium text-ink" />
                  </label>
                  <label className="grid gap-2 text-xs font-extrabold text-ink/60">
                    {language === "zh" ? "采集日期" : "Collected date"}
                    <input aria-label="Collected date" type="date" required value={editingCost.collectedOn} onChange={(event) => setEditingCost((current) => ({ ...current, collectedOn: event.target.value }))} className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm font-medium text-ink" />
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" aria-label="Save cost reference" disabled={Boolean(saving)} className="grid h-11 w-11 place-items-center rounded-lg bg-lake text-white disabled:opacity-50" title={language === "zh" ? "保存费用参考" : "Save cost reference"}><Save className="h-4 w-4" /></button>
                    <button type="button" aria-label="Cancel editing cost reference" onClick={() => setEditingCost(null)} className="grid h-11 w-11 place-items-center rounded-lg border border-ink/15 bg-white text-ink" title={language === "zh" ? "取消" : "Cancel"}><X className="h-4 w-4" /></button>
                  </div>
                </div>
              </form>}
              <DataTable headers={[c.category, c.range, c.source, c.collected, c.status, language === "zh" ? "操作" : "Actions"]} empty={c.empty} colSpan={6}>
                {data.costReferences?.map((item) => <tr key={item.id}>
                  <td className="px-5 py-4 font-bold text-ink">{displayLabel(language, "costCategory", item.category)}</td>
                  <td className="px-5 py-4 text-ink/65">S$ {(item.minMinor / 100).toFixed(0)} - {(item.maxMinor / 100).toFixed(0)}</td>
                  <td className="px-5 py-4 text-ink/65">{item.sourceName}</td>
                  <td className="px-5 py-4 text-ink/65">{item.collectedOn}</td>
                  <td className="px-5 py-4 text-ink/65">{displayLabel(language, "lifecycle", item.status)}</td>
                  <td className="px-5 py-4"><div className="flex gap-2">
                    <button type="button" aria-label={`Edit ${item.sourceName}`} onClick={() => setEditingCost({ ...item })} className="grid h-11 w-11 place-items-center rounded-lg border border-ink/15 text-ink transition-colors hover:border-lake hover:text-lake"><Pencil className="h-4 w-4" /></button>
                    <button type="button" aria-label={`Retire ${item.sourceName}`} disabled={item.status === "UNAVAILABLE" || Boolean(saving)} onClick={() => retireCostReference(item)} className="grid h-11 w-11 place-items-center rounded-lg border border-ink/15 text-ink transition-colors hover:border-red-500 hover:text-red-700 disabled:opacity-35"><Trash2 className="h-4 w-4" /></button>
                  </div></td>
                </tr>)}
              </DataTable>
            </>}

          </div>}
          {saving && <p role="status" className="mt-4 text-sm font-bold text-lake">{c.saving}</p>}
        </div>
      </section>
    </AppShell>
  );
}
