import { useLanguage } from "../context/LanguageContext.jsx";

const sgd = (minor) => `S$ ${(Number(minor ?? 0) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export default function ProfileBudgetSummary({ summary, totalTestId }) {
  const { language } = useLanguage();
  const zh = language === "zh";
  const budget = Number(summary?.budgetMinor ?? 0);
  const total = Number(summary?.totalMinor ?? 0);
  const baseline = Number(summary?.baselineMandatoryCostMinor ?? 0);
  const planned = Number(summary?.profileControlledCostMinor ?? Math.max(0, total - baseline));
  const utilization = Number(summary?.utilisationPercent ?? (budget ? total / budget * 100 : 0));
  const rows = [
    [zh ? "用户总预算" : "User budget", budget],
    ...(baseline > 0 ? [[zh ? "基础预计费用" : "Baseline estimated cost", baseline]] : []),
    [zh ? "计划体验费用" : "Planned experience cost", planned],
    [zh ? "预计总支出" : "Estimated total spend", total],
    [zh ? "剩余预算" : "Remaining budget", Number(summary?.remainingMinor ?? budget - total)]
  ];
  return <section aria-label={zh ? "方案预算摘要" : "Profile budget summary"} className="border-y border-ink/10 py-4">
    <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase text-jade">{zh ? "预算使用率" : "Budget utilization"}</p><strong className="font-display text-2xl">{Math.round(utilization)}%</strong></div><span className="text-xs font-semibold text-ink/45">{zh ? "总预算为硬性上限" : "Hard total-budget limit"}</span></div>
    <div className="h-2 overflow-hidden rounded-full bg-ink/10"><div className="h-full bg-jade" style={{ width: `${Math.min(100, Math.max(0, utilization))}%` }} /></div>
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-2 border-b border-ink/8 pb-1"><dt className="text-ink/50">{label}</dt><dd data-testid={label === (zh ? "预计总支出" : "Estimated total spend") ? totalTestId : undefined} className="font-bold">{sgd(value)}</dd></div>)}</dl>
  </section>;
}
