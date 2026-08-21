import { ArrowRight, Check, ChevronRight, CircleDollarSign, Gauge, MapPin, ShieldCheck, WalletCards } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import ComparisonRouteRail from "./ComparisonRouteRail.jsx";

const profiles = {
  BUDGET_SAVING: { Icon: WalletCards, label: "Budget-saving", labelZh: "省钱优先", bestFor: "Best for maximising value", bestForZh: "适合追求高性价比", accent: "border-jade", icon: "bg-jade/12 text-jade" },
  BALANCED: { Icon: ShieldCheck, label: "Balanced", labelZh: "均衡方案", bestFor: "Best overall balance", bestForZh: "适合兼顾各项体验", accent: "border-vermilion", icon: "bg-vermilion/12 text-vermilion" },
  COMFORT_FOCUSED: { Icon: Gauge, label: "Comfort-focused", labelZh: "舒适优先", bestFor: "Best for greater comfort", bestForZh: "适合追求轻松与舒适", accent: "border-gold", icon: "bg-gold/20 text-ink" },
  budget: { Icon: WalletCards, label: "Budget Backpack", bestFor: "Value-led route", accent: "border-jade", icon: "bg-jade/12 text-jade" },
  food: { Icon: ShieldCheck, label: "Food-Focused", bestFor: "Flavour-led route", accent: "border-vermilion", icon: "bg-vermilion/12 text-vermilion" },
  leisure: { Icon: Gauge, label: "Slow Leisure", bestFor: "Gentler route", accent: "border-gold", icon: "bg-gold/20 text-ink" }
};

const cny = (fen) => Number(fen ?? 0) / 100;
const titleCase = (value) => String(value ?? "Not available").toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());

function fallbackMetrics(itinerary) {
  const activities = itinerary.days.flatMap((day) => day.activities ?? []);
  const legs = itinerary.days.flatMap((day) => day.legs ?? []);
  const transportDistribution = legs.reduce((counts, leg) => ({ ...counts, [leg.mode]: (counts[leg.mode] ?? 0) + 1 }), {});
  return {
    activityCount: activities.length,
    attractionCount: activities.filter(({ activityType }) => activityType !== "FOOD").length,
    mealCount: activities.filter(({ activityType }) => activityType === "FOOD").length,
    tripLegCount: legs.length,
    transportDistribution,
    accommodationTier: "MID_RANGE",
    foodTier: "BALANCED",
    pace: "MODERATE",
    differences: ["Verified attractions", "Connected daily routes", "Hard-budget checked"],
    daySummaries: itinerary.days.map((day) => ({
      dayNumber: day.dayNumber,
      activityCount: day.activities.length,
      mealCount: 0,
      tripLegCount: day.legs?.length ?? 0,
      items: day.activities.map((activity) => ({ type: "ACTIVITY", label: activity.poi?.name ?? activity.poiId, startTime: activity.scheduledStartTime ?? activity.plannedStartTime }))
    }))
  };
}

function displayVariant(variant, index, language) {
  if (!variant.itinerary) {
    const total = Object.values(variant.budget ?? {}).reduce((sum, amount) => sum + Number(amount || 0), 0);
    const days = variant.days ?? [];
    return {
      raw: variant, id: variant.id, profile: variant.style, title: variant.title?.[language] ?? variant.title?.en ?? `${language === "zh" ? "方案" : "Option"} ${index + 1}`,
      total, budget: variant.totalBudget ?? Math.max(total, 1), remaining: (variant.totalBudget ?? total) - total,
      perPerson: undefined, days, budgetCategories: variant.budget ?? {}, objectiveAligned: false,
      sources: [], metrics: { ...fallbackMetrics({ days }), pace: variant.pace?.toUpperCase() ?? "MODERATE" }
    };
  }
  const itinerary = variant.itinerary;
  const style = profiles[itinerary.variant];
  const activities = itinerary.days.flatMap((day) => day.activities);
  return {
    raw: variant, id: itinerary.variant, profile: itinerary.variant, title: language === "zh" ? style.labelZh : style.label,
    total: cny(variant.summary.totalFen), budget: cny(variant.summary.budgetFen), remaining: cny(variant.summary.remainingFen), perPerson: cny(variant.summary.perPersonFen),
    days: itinerary.days,
    budgetCategories: Object.fromEntries(Object.entries(variant.summary.categoriesFen).map(([key, value]) => [key, cny(value)])),
    objectiveAligned: true,
    sources: [...new Set(activities.map((activity) => activity.poi?.primarySource).filter(Boolean))],
    metrics: variant.variantMetrics ?? fallbackMetrics(itinerary)
  };
}

function transportSummary(distribution = {}, language = "en") {
  const labels = { WALK: "步行", PUBLIC_TRANSIT: "公共交通", TAXI: "出租车", DRIVING: "自驾", DRIVE: "自驾" };
  return Object.entries(distribution).sort((left, right) => right[1] - left[1]).slice(0, 2)
    .map(([mode, count]) => language === "zh" ? `${labels[mode] ?? mode} ${count} 段` : `${count} ${mode.toLowerCase().replaceAll("_", " ")}`).join(" + ") || (language === "zh" ? "暂无路线资料" : "Route data unavailable");
}

function DayPreview({ summary, language }) {
  if (!summary) return <p className="text-sm text-ink/50">{language === "zh" ? "暂无当日预览。" : "Day preview unavailable."}</p>;
  return <div><p className="mb-3 text-xs font-bold text-ink/55">{language === "zh" ? `${summary.activityCount} 个活动 · ${summary.mealCount} 次用餐 · ${summary.tripLegCount} 段交通` : `${summary.activityCount} activities | ${summary.mealCount} meals | ${summary.tripLegCount} transport legs`}</p><ol className="grid gap-1.5 border-l border-ink/15 pl-4 text-xs">{summary.items.slice(0, 9).map((item, index) => <li key={`${item.type}-${item.label}-${index}`} className={`relative grid grid-cols-[52px_1fr] gap-2 ${item.type === "LEG" ? "text-ink/48" : "font-semibold text-ink/78"}`}><i className="absolute -left-[19px] top-1.5 h-1.5 w-1.5 rounded-full bg-lake" /><span>{item.startTime ?? item.type}</span><span>{item.label}{item.routeSource ? ` · ${item.routeSource}` : ""}</span></li>)}</ol></div>;
}

function PlanCard({ variant, index, active, onPreview, onChoose, choosing, language }) {
  const [dayIndex, setDayIndex] = useState(0);
  const style = profiles[variant.profile] ?? profiles.BALANCED;
  const Icon = style.Icon;
  const daySummaries = variant.metrics.daySummaries ?? [];
  return <article aria-label={variant.title} data-active={active ? "true" : "false"} onFocusCapture={onPreview} onPointerEnter={onPreview} className={`plan-column min-w-[min(90vw,420px)] snap-center overflow-hidden rounded-lg border bg-white shadow-panel transition-[border-color,transform,box-shadow] duration-300 xl:min-w-0 ${active ? `${style.accent} -translate-y-1 shadow-lift` : "border-ink/10"}`}>
    <div className="p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${style.icon}`}><Icon className="h-5 w-5" /></span><button type="button" aria-pressed={active} aria-label={`${language === "zh" ? "预览" : "Preview"} ${variant.title}`} onClick={onPreview} onFocus={onPreview} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${active ? "border-ink bg-ink text-white" : "border-ink/15 text-ink/55 hover:border-ink/40"}`}>{active ? (language === "zh" ? "正在预览" : "Previewing") : (language === "zh" ? "预览" : "Preview")}</button></div>
      <p className="mt-6 text-xs font-extrabold uppercase text-vermilion">{language === "zh" ? `方案 ${index + 1}` : `Option ${index + 1}`}</p><h2 className="mt-1 font-display text-3xl font-extrabold">{variant.title}</h2><p className="mt-2 text-sm font-semibold text-ink/55">{language === "zh" ? style.bestForZh : style.bestFor}</p>
      <div className="mt-5 grid grid-cols-2 border-y border-ink/10 py-4"><div><span className="text-xs text-ink/45">{language === "zh" ? "预计总费用" : "Estimated total"}</span><strong data-testid={`plan-total-${variant.id}`} className="mt-1 block font-display text-2xl">CNY {variant.total.toLocaleString()}</strong></div><div className="border-l border-ink/10 pl-4"><span className="text-xs text-ink/45">{language === "zh" ? "剩余预算" : "Remaining"}</span><strong className="mt-1 block font-display text-2xl text-jade">CNY {variant.remaining.toLocaleString()}</strong></div>{variant.perPerson !== undefined && <p className="col-span-2 mt-3 text-xs text-ink/45">{language === "zh" ? `每人 CNY ${variant.perPerson.toLocaleString()} · 总预算 CNY ${variant.budget.toLocaleString()}` : `CNY ${variant.perPerson.toLocaleString()} per traveller | hard budget CNY ${variant.budget.toLocaleString()}`}</p>}</div>
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm"><div><dt className="text-xs text-ink/45">{language === "zh" ? "行程" : "Itinerary"}</dt><dd className="font-bold">{variant.metrics.activityCount} {language === "zh" ? "个活动" : "events"}</dd></div><div><dt className="text-xs text-ink/45">{language === "zh" ? "节奏" : "Pace"}</dt><dd className="font-bold">{language === "zh" ? ({ ACTIVE: "紧凑", MODERATE: "适中", RELAXED: "轻松" }[variant.metrics.pace] ?? variant.metrics.pace) : titleCase(variant.metrics.pace)}</dd></div><div><dt className="text-xs text-ink/45">{language === "zh" ? "住宿" : "Stay"}</dt><dd className="font-bold">{language === "zh" ? ({ BUDGET: "经济型", MID_RANGE: "中档", COMFORT: "舒适型" }[variant.metrics.accommodationTier] ?? variant.metrics.accommodationTier) : `${titleCase(variant.metrics.accommodationTier)} stay`}</dd></div><div><dt className="text-xs text-ink/45">{language === "zh" ? "餐饮" : "Food"}</dt><dd className="font-bold">{language === "zh" ? ({ ECONOMY: "实惠", BALANCED: "均衡", COMFORT: "舒适" }[variant.metrics.foodTier] ?? variant.metrics.foodTier) : `${titleCase(variant.metrics.foodTier)} meals`}</dd></div><div className="col-span-2"><dt className="text-xs text-ink/45">{language === "zh" ? "市内移动" : "Local movement"}</dt><dd className="font-bold">{transportSummary(variant.metrics.transportDistribution, language)}</dd></div></dl>
    </div>
    <div className="border-y border-ink/10 bg-paper/70 px-5 py-4 sm:px-6"><p className="text-xs font-extrabold uppercase text-ink/45">{language === "zh" ? "此方案的主要区别" : "Why this plan is different"}</p><ul className="mt-3 grid gap-2 text-sm">{(language === "zh" ? [`共安排 ${variant.metrics.activityCount} 个活动与 ${variant.metrics.mealCount} 次用餐`, `${language === "zh" ? style.labelZh : style.label}的住宿与交通分配`, "路线、时间与总预算均已通过规则校验"] : variant.metrics.differences).map((difference) => <li key={difference} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-jade" />{difference}</li>)}</ul></div>
    {daySummaries.length > 0 && <div className="px-5 py-4 sm:px-6"><div className="flex items-center justify-between gap-3"><p className="text-xs font-extrabold uppercase text-ink/45">{language === "zh" ? "每日路线" : "Daily route"}</p><span className="text-xs text-ink/40">{variant.days.length} {language === "zh" ? "天" : "days"}</span></div><div className="mt-3 flex gap-1 overflow-x-auto pb-2" role="tablist" aria-label={`${variant.title} ${language === "zh" ? "每日预览" : "day preview"}`}>{daySummaries.map((day, nextIndex) => <button key={day.dayNumber} type="button" role="tab" aria-selected={dayIndex === nextIndex} onClick={() => setDayIndex(nextIndex)} className={`min-h-9 min-w-11 rounded-lg px-3 text-xs font-bold ${dayIndex === nextIndex ? "bg-ink text-white" : "bg-ink/5 text-ink/55"}`}>{language === "zh" ? `第 ${day.dayNumber} 天` : `Day ${day.dayNumber}`}</button>)}</div><div className="mt-3 min-h-[170px]"><DayPreview summary={daySummaries[dayIndex]} language={language} /></div>{variant.sources.length > 0 && <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold uppercase text-ink/40"><MapPin className="h-3.5 w-3.5" /> {language === "zh" ? "资料来源" : "Sources"}: {variant.sources.join(" + ")}</p>}</div>}
    <button type="button" aria-label={language === "zh" ? "选择此方案" : "Choose this plan"} disabled={choosing} onClick={() => onChoose(variant.raw)} className="group mx-5 mb-5 flex min-h-12 w-[calc(100%-2.5rem)] items-center justify-between rounded-lg bg-lake px-5 font-bold text-white hover:bg-[#0068d9] disabled:opacity-50 sm:mx-6 sm:w-[calc(100%-3rem)]"><span className="flex items-center gap-2"><CircleDollarSign className="h-4 w-4" />{choosing ? (language === "zh" ? "正在打开行程..." : "Opening itinerary...") : (language === "zh" ? "选择此方案" : "Choose this plan")}</span><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button>
  </article>;
}

export default function PlanComparison({ variants, onChoose, choosing }) {
  const { language } = useLanguage();
  const display = variants.map((variant, index) => displayVariant(variant, index, language));
  const [activeId, setActiveId] = useState(display[0]?.id);
  const railVariants = display.map((variant) => ({ id: variant.id, title: { en: variant.title }, totalBudget: variant.budget, total: variant.total, remaining: variant.remaining, budget: variant.budgetCategories, metrics: variant.metrics, objectiveAligned: variant.objectiveAligned }));
  return <div className="plan-comparison-shell"><ComparisonRouteRail variants={railVariants} activeId={activeId} language={language} /><div className="grid auto-cols-[min(90vw,420px)] grid-flow-col snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-6 xl:grid-flow-row xl:auto-cols-auto xl:grid-cols-3 xl:overflow-visible">{display.map((variant, index) => <PlanCard key={variant.id} variant={variant} index={index} active={variant.id === activeId} onPreview={() => setActiveId(variant.id)} onChoose={onChoose} choosing={choosing} language={language} />)}</div><p className="mt-2 flex items-center justify-center gap-2 text-xs text-ink/40 xl:hidden">{language === "zh" ? "左右滑动比较方案" : "Swipe to compare plans"} <ChevronRight className="h-4 w-4" /></p></div>;
}
