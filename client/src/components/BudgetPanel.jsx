import { AlertTriangle, ArrowDownRight, Coins } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useGsapContext } from "../motion/useGsapContext.js";

const labels = {
  scenicTickets: { en: "Scenic tickets", zh: "景点门票" },
  localFood: { en: "Local food", zh: "本地美食" },
  transportation: { en: "Transportation", zh: "交通" },
  accommodation: { en: "Accommodation", zh: "住宿" }
};

export function deriveBudget(variant, limit) {
  const categories = { ...variant.budget };
  const total = Object.values(categories).reduce((sum, value) => sum + Number(value || 0), 0);
  return { categories, total, remaining: limit - total, limit, overBudget: total > limit };
}

export default function BudgetPanel({ budget, onCheaper, disabled }) {
  const { language } = useLanguage();
  const ratio = useMemo(
    () => Math.min(100, (budget.total / Math.max(1, budget.limit)) * 100),
    [budget]
  );
  const previousTotal = useRef(budget.total);
  const [delta, setDelta] = useState(0);
  const { scope } = useGsapContext(({ gsap }) => {
    gsap.fromTo("[data-budget-total]", { y: 6, opacity: 0.55 }, {
      y: 0,
      opacity: 1,
      duration: 0.34,
      ease: "power2.out"
    });
  }, [budget.total]);

  useEffect(() => {
    setDelta(budget.total - previousTotal.current);
    previousTotal.current = budget.total;
  }, [budget.total]);

  const deltaText = delta === 0
    ? ""
    : language === "zh"
      ? `¥${Math.abs(delta).toLocaleString()} ${delta > 0 ? "增加" : "减少"}`
      : `¥${Math.abs(delta).toLocaleString()} ${delta > 0 ? "increase" : "decrease"}`;

  return (
    <section ref={scope} className="rounded-lg border border-ink/10 bg-white/78 p-5 shadow-panel backdrop-blur-2xl">
      <div className="flex items-center justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-gold/15 text-amber-800"><Coins className="h-5 w-5" /></span>
        <span className={`text-xs font-bold uppercase ${budget.overBudget ? "text-vermilion" : "text-jade"}`}>
          {budget.overBudget
            ? (language === "zh" ? "超出预算" : "Over budget")
            : (language === "zh" ? "预算正常" : "On budget")}
        </span>
      </div>
      <p className="mt-5 text-xs font-bold uppercase text-ink/45">{language === "zh" ? "当前行程花费" : "Current plan cost"}</p>
      <div className="flex items-end justify-between gap-3">
        <strong data-budget-total data-testid="budget-total" className="mt-1 block font-display text-4xl">¥{Number(budget.total).toLocaleString()}</strong>
        <output
          role="status"
          aria-label={language === "zh" ? "预算变化" : "Budget change"}
          aria-live="polite"
          className={`pb-1 text-xs font-bold ${delta > 0 ? "text-vermilion" : "text-jade"}`}
        >
          {deltaText}
        </output>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink/10">
        <div className={`h-full rounded-full ${budget.overBudget ? "bg-vermilion" : "bg-jade"}`} style={{ width: `${ratio}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-ink/45"><span>¥0</span><span>¥{budget.limit.toLocaleString()}</span></div>
      <dl className="mt-6 grid gap-3">
        {Object.entries(budget.categories).map(([key, value]) => (
          <div key={key} className="flex justify-between border-b border-ink/8 pb-2 text-sm">
            <dt className="text-ink/55">{labels[key]?.[language] ?? key}</dt>
            <dd className="font-bold">¥{Number(value).toLocaleString()}</dd>
          </div>
        ))}
      </dl>
      <div className={`mt-5 flex items-center justify-between rounded-lg p-3 ${budget.remaining < 0 ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"}`}>
        <span className="text-xs font-bold uppercase">{language === "zh" ? "剩余预算" : "Remaining"}</span>
        <strong>¥{budget.remaining.toLocaleString()}</strong>
      </div>
      <button disabled={disabled} type="button" onClick={onCheaper} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-ink/15 text-sm font-bold transition-colors hover:border-lake hover:text-lake disabled:opacity-40">
        {budget.overBudget ? <AlertTriangle className="h-4 w-4 text-vermilion" /> : <ArrowDownRight className="h-4 w-4 text-jade" />}
        {language === "zh" ? "寻找更省钱的替代项" : "Find a cheaper alternative"}
      </button>
    </section>
  );
}
