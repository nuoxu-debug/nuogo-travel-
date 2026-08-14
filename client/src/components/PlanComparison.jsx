import { ArrowRight, Check, Gauge, ShieldCheck, WalletCards } from "lucide-react";
import { useState } from "react";
import { useGsapContext } from "../motion/useGsapContext.js";
import ComparisonRouteRail from "./ComparisonRouteRail.jsx";
import RouteRail from "./RouteRail.jsx";

const profiles = {
  BUDGET_SAVING: { Icon: WalletCards, label: "Budget-saving", description: "More room in the budget through value-led choices.", tone: "jade", block: "bg-jade", bar: "bg-jade" },
  BALANCED: { Icon: ShieldCheck, label: "Balanced", description: "A measured mix of sights, meals, movement, and rest.", tone: "vermilion", block: "bg-vermilion", bar: "bg-vermilion" },
  COMFORT_FOCUSED: { Icon: Gauge, label: "Comfort-focused", description: "A gentler rhythm with more spending directed to comfort.", tone: "gold", block: "bg-gold text-ink", bar: "bg-gold" },
  budget: { Icon: WalletCards, label: "Budget smart", description: "A value-led route.", tone: "jade", block: "bg-jade", bar: "bg-jade" },
  food: { Icon: ShieldCheck, label: "Local flavour", description: "A food-led route.", tone: "vermilion", block: "bg-vermilion", bar: "bg-vermilion" },
  leisure: { Icon: Gauge, label: "Slow comfort", description: "A gentler route.", tone: "gold", block: "bg-gold text-ink", bar: "bg-gold" }
};

const cny = (fen) => Number(fen ?? 0) / 100;

function displayVariant(variant, index) {
  if (!variant.itinerary) {
    const total = Object.values(variant.budget ?? {}).reduce((sum, amount) => sum + Number(amount || 0), 0);
    return {
      raw: variant, id: variant.id, profile: variant.style,
      title: variant.title?.en ?? `Option ${index + 1}`,
      description: variant.summary?.en ?? profiles[variant.style]?.description,
      pace: variant.pace, total, budget: variant.totalBudget ?? Math.max(total, 1),
      remaining: (variant.totalBudget ?? total) - total, perPerson: undefined,
      days: variant.days,
      routeStops: variant.days?.[0]?.activities?.slice(0, 3).map((activity) => ({ label: activity.name?.en ?? "Stop", meta: activity.startTime })) ?? [],
      highlights: variant.highlights?.en ?? [], sources: []
    };
  }
  const itinerary = variant.itinerary;
  const meta = profiles[itinerary.variant];
  const activities = itinerary.days.flatMap((day) => day.activities);
  return {
    raw: variant, id: itinerary.variant, profile: itinerary.variant, title: meta.label,
    description: meta.description,
    pace: itinerary.variant === "COMFORT_FOCUSED" ? "gentle" : itinerary.variant === "BALANCED" ? "moderate" : "efficient",
    total: cny(variant.summary.totalFen), budget: cny(variant.summary.budgetFen),
    remaining: cny(variant.summary.remainingFen), perPerson: cny(variant.summary.perPersonFen),
    days: itinerary.days,
    routeStops: itinerary.days[0]?.activities.slice(0, 3).map((activity) => ({ label: activity.poi?.name ?? activity.poiId, meta: activity.scheduledStartTime ?? activity.plannedStartTime })) ?? [],
    highlights: activities.slice(0, 3).map((activity) => activity.poi?.name ?? activity.poiId),
    sources: [...new Set(activities.map((activity) => activity.poi?.primarySource).filter(Boolean))]
  };
}

export default function PlanComparison({ variants, onChoose, choosing }) {
  const display = variants.map(displayVariant);
  const [activeId, setActiveId] = useState(display[0]?.id);
  const { scope } = useGsapContext(({ gsap }) => {
    gsap.to(".plan-column", { y: 0, opacity: (_i, el) => el.dataset.active === "true" ? 1 : 0.82, scale: (_i, el) => el.dataset.active === "true" ? 1 : 0.985, duration: 0.42, stagger: 0.04, ease: "power3.out" });
  }, [activeId]);
  const railVariants = display.map((item) => ({
    id: item.id, title: { en: item.title }, totalBudget: item.budget,
    budget: item.raw.summary?.categoriesFen ? Object.fromEntries(Object.entries(item.raw.summary.categoriesFen).map(([key, value]) => [key, cny(value)])) : item.raw.budget
  }));

  return <div ref={scope} className="plan-comparison-shell">
    <ComparisonRouteRail variants={railVariants} activeId={activeId} language="en" />
    <div className="grid snap-x snap-mandatory gap-5 overflow-x-auto pb-4 xl:grid-cols-3 xl:overflow-visible">
      {display.map((variant, index) => {
        const style = profiles[variant.profile] ?? profiles.BALANCED;
        const Icon = style.Icon;
        const ratio = Math.min(100, Math.round(variant.total / Math.max(variant.budget, 1) * 100));
        return <article key={variant.id} aria-label={variant.title} data-active={variant.id === activeId ? "true" : "false"} onFocusCapture={() => setActiveId(variant.id)} onPointerEnter={() => setActiveId(variant.id)} className="plan-column flex min-h-[650px] min-w-[min(88vw,390px)] snap-center flex-col overflow-hidden rounded-lg border border-ink/10 bg-white/82 opacity-0 shadow-panel backdrop-blur-2xl xl:min-w-0">
          <div className="border-b border-ink/10 p-6"><div className="flex items-start justify-between"><span className={`grid h-12 w-12 place-items-center ${style.block}`}><Icon className="h-5 w-5" /></span><div className="text-right"><span className="block text-[10px] font-extrabold uppercase text-ink/38">Option 0{index + 1}</span><span className="mt-1 block text-xs font-bold uppercase text-ink/60">{variant.pace}</span></div></div><p className="mt-8 text-xs font-extrabold uppercase text-vermilion">{style.label}</p><h2 className="mt-2 font-display text-3xl font-extrabold">{variant.title}</h2><p className="mt-3 min-h-14 text-sm leading-6 text-ink/60">{variant.description}</p></div>
          <div className="grid grid-cols-2 gap-4 border-b border-ink/10 p-5 text-sm"><div><span className="block text-xs text-ink/45">Estimated total</span><strong className="mt-1 block font-display text-2xl">CNY {variant.total.toLocaleString()}</strong></div><div className="border-l border-ink/10 pl-4"><span className="block text-xs text-ink/45">Remaining</span><strong className="mt-1 block font-display text-2xl text-jade">CNY {variant.remaining.toLocaleString()}</strong></div><div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-ink/8"><div className={`h-full ${style.bar}`} style={{ width: `${ratio}%` }} /></div>{variant.perPerson !== undefined && <span className="col-span-2 text-xs text-ink/50">CNY {variant.perPerson.toLocaleString()} per traveller · hard budget CNY {variant.budget.toLocaleString()}</span>}</div>
          {variant.routeStops.length > 0 && <div className="border-b border-ink/10 bg-ink px-5 py-5 text-white"><p className="mb-4 text-[10px] font-extrabold uppercase text-white/42">Day one route preview</p><RouteRail stops={variant.routeStops} tone={style.tone} compact /></div>}
          <div className="flex-1 p-5"><ul className="grid gap-3 text-sm">{variant.highlights.map((highlight) => <li key={highlight} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-lake" />{highlight}</li>)}</ul>{variant.sources.length > 0 && <p className="mt-6 text-xs font-bold uppercase text-ink/45">Sources: {variant.sources.join(" + ")}</p>}<div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-ink/10">{variant.days.slice(0, 3).map((day) => <div key={day.id ?? day.date} className="bg-paper p-3"><span className="text-[10px] font-extrabold text-ink/38">DAY {day.dayNumber}</span><p className="mt-1 text-xs font-bold">{day.activities.length} stops</p></div>)}</div></div>
          <button type="button" disabled={choosing} onClick={() => onChoose(variant.raw)} className="group mx-5 mb-5 flex min-h-13 items-center justify-between rounded-lg bg-lake px-5 font-bold text-white hover:bg-[#0068d9] disabled:opacity-50">{choosing ? "Opening itinerary..." : "Choose this plan"}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button>
        </article>;
      })}
    </div>
  </div>;
}
