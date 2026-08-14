import { ShieldCheck } from "lucide-react";
import { useGsapContext } from "../motion/useGsapContext.js";

const objectiveCategories = [
  { label: "Accommodation", keys: ["accommodation"] },
  { label: "Outbound", keys: ["outboundTransport"] },
  { label: "Return", keys: ["returnTransport"] },
  { label: "Local transport", keys: ["localTransportation", "transportation", "transport"] },
  { label: "Food", keys: ["foodAndBeverages", "localFood", "food"] },
  { label: "Attractions", keys: ["attractionTickets", "scenicTickets", "attractions"] },
  { label: "Entertainment", keys: ["entertainmentActivities", "entertainment"] },
  { label: "Other", keys: ["other"] }
];

const legacyCategories = [
  { label: "Accommodation", keys: ["accommodation"] },
  { label: "Transport", keys: ["transportation", "transport"] },
  { label: "Food", keys: ["localFood", "food"] },
  { label: "Attractions", keys: ["scenicTickets", "attractions"] },
  { label: "Entertainment", keys: ["entertainment"] },
  { label: "Other", keys: ["other"] }
];

function amountFor(budget = {}, keys) {
  return keys.reduce((total, key) => total + (Number(budget[key]) || 0), 0);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US").format(Number(value) || 0);
}

export default function ComparisonRouteRail({ variants, activeId, language = "en" }) {
  const categories = variants.some((variant) => "outboundTransport" in (variant.budget ?? {}))
    ? objectiveCategories
    : legacyCategories;
  const budget = variants[0]?.totalBudget ?? 0;
  const signature = `${activeId}|${variants.map((variant) => variant.id).join("|")}`;
  const { scope } = useGsapContext(({ gsap }) => {
    gsap.fromTo(".comparison-allocation-fill", { scaleX: 0 }, {
      scaleX: 1,
      duration: 0.55,
      stagger: 0.018,
      ease: "power3.out",
      transformOrigin: "left"
    });
  }, [signature]);

  const labels = language === "zh"
    ? { aria: "方案比较概览", budget: "硬性总预算", active: "当前查看" }
    : { aria: "Plan comparison overview", budget: "hard budget", active: "Previewing" };
  const active = variants.find((variant) => variant.id === activeId) ?? variants[0];

  return (
    <section ref={scope} className="comparison-overview" role="region" aria-label={labels.aria}>
      <div className="comparison-overview-head">
        <span><ShieldCheck aria-hidden="true" /> ¥{formatCurrency(budget)} {labels.budget}</span>
        <strong>{labels.active}: {active?.title?.[language] ?? active?.title?.en}</strong>
      </div>

      <div className="comparison-profile-route" aria-hidden="true">
        {variants.map((variant, index) => (
          <i key={variant.id} className={variant.id === activeId ? "is-active" : ""}>
            <b>{String(index + 1).padStart(2, "0")}</b>
          </i>
        ))}
      </div>

      <div className="comparison-allocation-grid">
        {categories.map((category) => {
          const amounts = variants.map((variant) => amountFor(variant.budget, category.keys));
          const maximum = Math.max(1, ...amounts);
          return (
            <div key={category.label} className="comparison-allocation">
              <span>{category.label}</span>
              <div className="comparison-allocation-bars" aria-label={`${category.label} allocations`}>
                {amounts.map((amount, index) => (
                  <i key={variants[index].id} className={variants[index].id === activeId ? "is-active" : ""}>
                    <b
                      className="comparison-allocation-fill"
                      style={{ width: `${Math.max(amount > 0 ? 8 : 2, (amount / maximum) * 100)}%` }}
                    />
                  </i>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
