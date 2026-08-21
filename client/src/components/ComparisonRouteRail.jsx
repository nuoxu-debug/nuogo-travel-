import { ShieldCheck } from "lucide-react";

const categories = [
  ["Outbound", "outboundTransport"], ["Accommodation", "accommodation"],
  ["Local transport", "localTransportation"], ["Food", "foodAndBeverages"],
  ["Attractions", "attractionTickets"], ["Entertainment", "entertainmentActivities"],
  ["Other", "other"], ["Return", "returnTransport"]
];

const categoryLabelsZh = {
  Outbound: "去程交通", Accommodation: "住宿", "Local transport": "市内交通", Food: "餐饮",
  Attractions: "景点门票", Entertainment: "娱乐活动", Other: "其他", Return: "返程交通", Transport: "交通"
};

const legacyCategories = [
  ["Accommodation", "accommodation"], ["Transport", "transportation"],
  ["Food", "localFood"], ["Attractions", "scenicTickets"],
  ["Entertainment", "entertainment"], ["Other", "other"]
];

const money = (value) => `CNY ${Number(value ?? 0).toLocaleString("en-US")}`;
const titleCase = (value) => String(value ?? "Not available")
  .toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());

function transportLabel(distribution = {}, language = "en") {
  const entries = Object.entries(distribution).sort((left, right) => right[1] - left[1]);
  if (!entries.length) return language === "zh" ? "暂无资料" : "Not available";
  const labels = { WALK: "步行", PUBLIC_TRANSIT: "公共交通", TAXI: "出租车", DRIVING: "自驾", DRIVE: "自驾" };
  return entries.slice(0, 2).map(([mode, count]) => language === "zh" ? `${labels[mode] ?? mode} ${count} 段` : `${count} ${mode.toLowerCase().replaceAll("_", " ")}`).join(" + ");
}

export default function ComparisonRouteRail({ variants, activeId, language = "en" }) {
  const objective = variants.some(({ objectiveAligned }) => objectiveAligned);
  const rows = objective ? categories : legacyCategories;
  const active = variants.find(({ id }) => id === activeId) ?? variants[0];
  const largestCategoryAmount = Math.max(1, ...variants.flatMap(({ budget }) => Object.values(budget ?? {})));

  return (
    <section className="mb-8 overflow-hidden rounded-lg border border-ink/10 bg-white shadow-panel" role="region" aria-label={language === "zh" ? "方案比较概览" : "Plan comparison overview"}>
      <div className="flex flex-col justify-between gap-3 border-b border-ink/10 bg-ink px-5 py-4 text-white sm:flex-row sm:items-center">
        <span className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-jade" /> {money(variants[0]?.totalBudget)} {language === "zh" ? "总预算" : "hard budget"}</span>
        <strong className="text-sm">{language === "zh" ? "正在预览" : "Previewing"}: {active?.title?.en}</strong>
      </div>

      {objective && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <caption className="sr-only">{language === "zh" ? "三套生成方案的主要区别" : "Key differences between the three generated plans"}</caption>
            <thead><tr className="border-b border-ink/10 bg-paper text-xs uppercase text-ink/45"><th className="px-5 py-3 font-bold">{language === "zh" ? "比较项目" : "Compare"}</th>{variants.map((variant) => <th key={variant.id} className="px-4 py-3 font-bold">{variant.title.en}</th>)}</tr></thead>
            <tbody>
              {[
                [language === "zh" ? "预计费用" : "Estimated cost", (variant) => money(variant.total)],
                [language === "zh" ? "剩余预算" : "Remaining", (variant) => money(variant.remaining)],
                [language === "zh" ? "活动数量" : "Events", (variant) => String(variant.metrics.activityCount)],
                [language === "zh" ? "市内移动" : "Local movement", (variant) => transportLabel(variant.metrics.transportDistribution, language)],
                [language === "zh" ? "住宿档次" : "Accommodation", (variant) => language === "zh" ? ({ BUDGET: "经济型", MID_RANGE: "中档", COMFORT: "舒适型" }[variant.metrics.accommodationTier] ?? variant.metrics.accommodationTier) : titleCase(variant.metrics.accommodationTier)],
                [language === "zh" ? "餐饮档次" : "Food tier", (variant) => language === "zh" ? ({ ECONOMY: "实惠", BALANCED: "均衡", COMFORT: "舒适" }[variant.metrics.foodTier] ?? variant.metrics.foodTier) : titleCase(variant.metrics.foodTier)]
              ].map(([label, value]) => <tr key={label} className="border-b border-ink/8 last:border-b-0"><th className="px-5 py-3 font-bold text-ink/55">{label}</th>{variants.map((variant) => <td key={variant.id} className="px-4 py-3 font-semibold">{value(variant)}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-ink/10 px-5 py-5">
        <p className="mb-4 text-xs font-extrabold uppercase text-ink/45">{language === "zh" ? "系统计算的分类费用" : "Calculated category breakdown"}</p>
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          {rows.map(([label, key]) => <div key={label}>
            <span className="mb-2 block text-xs font-bold text-ink/55">{language === "zh" ? (categoryLabelsZh[label] ?? label) : label}</span>
            <div className="grid gap-1.5">{variants.map((variant) => {
              const amount = Number(variant.budget?.[key] ?? 0);
              return <div key={variant.id} className="grid grid-cols-[112px_1fr_72px] items-center gap-2 text-[11px]"><span className="truncate font-semibold">{variant.title.en}</span><span className="h-1.5 overflow-hidden rounded-full bg-ink/8"><i className="block h-full rounded-full bg-lake" style={{ width: `${amount === 0 ? 0 : Math.max(3, amount / largestCategoryAmount * 100)}%` }} /></span><strong className="text-right">{money(amount)}</strong></div>;
            })}</div>
          </div>)}
        </div>
      </div>
    </section>
  );
}
