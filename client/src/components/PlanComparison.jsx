import { ArrowRight, Check, Gauge, Utensils, WalletCards } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAnime } from "../hooks/useAnime.js";
import RouteRail from "./RouteRail.jsx";

const styles = {
  budget: {
    Icon: WalletCards,
    label: { en: "Budget smart", zh: "轻装省钱" },
    tone: "jade",
    bar: "bg-jade",
    block: "bg-jade",
    tint: "bg-white/72"
  },
  food: {
    Icon: Utensils,
    label: { en: "Local flavour", zh: "寻味当地" },
    tone: "vermilion",
    bar: "bg-vermilion",
    block: "bg-vermilion",
    tint: "bg-white/72"
  },
  leisure: {
    Icon: Gauge,
    label: { en: "Slow comfort", zh: "舒适慢游" },
    tone: "gold",
    bar: "bg-gold",
    block: "bg-gold text-ink",
    tint: "bg-white/72"
  }
};

export default function PlanComparison({ variants, onChoose, choosing }) {
  const { language } = useLanguage();
  const animate = useAnime();
  const root = useRef(null);

  useEffect(() => {
    animate({
      targets: root.current?.querySelectorAll(".plan-column"),
      translateY: [32, 0],
      opacity: [0, 1],
      delay: (_target, index) => 100 + index * 130,
      duration: 800,
      easing: "easeOutExpo"
    });
  }, [animate]);

  function choose(variant, element) {
    animate({
      targets: element,
      scale: [1, 1.018, 1],
      duration: 420,
      easing: "easeOutBack"
    });
    onChoose(variant);
  }

  return (
    <div ref={root} className="grid snap-x snap-mandatory gap-5 overflow-x-auto pb-4 xl:grid-cols-3 xl:overflow-visible">
      {variants.map((variant, index) => {
        const style = styles[variant.style] ?? styles.budget;
        const Icon = style.Icon;
        const total = Object.values(variant.budget).reduce((sum, amount) => sum + amount, 0);
        const routeStops = variant.days[0]?.activities.slice(0, 3).map((activity) => ({
          label: activity.name?.[language] ?? activity.name?.en ?? "Stop",
          meta: activity.startTime
        })) ?? [];
        const budgetRatio = Math.min(100, Math.round((total / Math.max(total, 5000)) * 100));

        return (
          <article
            key={variant.id}
            className="plan-column flex min-h-[690px] min-w-[min(88vw,390px)] snap-center flex-col overflow-hidden rounded-lg border border-ink/10 bg-white/78 opacity-0 shadow-panel backdrop-blur-2xl xl:min-w-0"
          >
            <div className={`${style.tint} border-b border-ink/10 p-6`}>
              <div className="flex items-start justify-between">
                <span className={`grid h-12 w-12 place-items-center ${style.block}`}><Icon className="h-5 w-5" /></span>
                <div className="text-right">
                  <span className="block text-[10px] font-extrabold uppercase text-ink/38">Option 0{index + 1}</span>
                  <span className="mt-1 block text-xs font-bold uppercase text-ink/60">{variant.pace}</span>
                </div>
              </div>
              <p className="mt-8 text-xs font-extrabold uppercase text-vermilion">{style.label[language]}</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold leading-tight">{variant.title[language]}</h2>
              <p className="mt-3 min-h-16 text-sm leading-6 text-ink/60">{variant.summary[language]}</p>
            </div>

            <div className="grid grid-cols-2 border-b border-ink/10 p-5">
              <div>
                <span className="block text-xs text-ink/45">{language === "zh" ? "预计花费" : "Estimated"}</span>
                <strong className="mt-1 block font-display text-2xl">¥{total.toLocaleString()}</strong>
              </div>
              <div className="border-l border-ink/10 pl-5">
                <span className="block text-xs text-ink/45">{language === "zh" ? "行程天数" : "Duration"}</span>
                <strong className="mt-1 block font-display text-2xl">{variant.days.length} {language === "zh" ? "天" : "days"}</strong>
              </div>
              <div className="col-span-2 mt-4 h-1.5 overflow-hidden rounded-full bg-ink/8">
                <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${budgetRatio}%` }} />
              </div>
            </div>

            {routeStops.length > 0 && (
              <div className="border-b border-ink/10 bg-ink px-5 py-5 text-white">
                <p className="mb-4 text-[10px] font-extrabold uppercase text-white/42">
                  {language === "zh" ? "第一天路线预览" : "Day one route preview"}
                </p>
                <RouteRail stops={routeStops} tone={style.tone} compact />
              </div>
            )}

            <div className="flex-1 p-5">
              <ul className="grid gap-3 text-sm">
                {variant.highlights[language].slice(0, 3).map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-lake" /> {highlight}
                  </li>
                ))}
              </ul>
              <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-ink/10">
                {variant.days.slice(0, 3).map((day) => (
                  <div key={day.id} className="bg-paper p-3">
                    <span className="text-[10px] font-extrabold text-ink/38">DAY {day.dayNumber}</span>
                    <p className="mt-1 text-xs font-bold">{day.activities.length} {language === "zh" ? "站" : "stops"}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={choosing}
              onClick={(event) => choose(variant, event.currentTarget.closest("article"))}
              className="group mx-5 mb-5 flex min-h-13 items-center justify-between rounded-lg bg-lake px-5 font-bold text-white transition-colors hover:bg-[#0068d9] disabled:opacity-50"
            >
              {choosing
                ? (language === "zh" ? "正在打开行程…" : "Opening itinerary...")
                : (language === "zh" ? "选择此方案" : "Choose this plan")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </article>
        );
      })}
    </div>
  );
}
