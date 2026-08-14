import { CalendarDays, MapPin, Sparkles, Users, WalletCards } from "lucide-react";
import { supportedDestinations } from "@nuogo/shared/constants";
import { useGsapContext } from "../motion/useGsapContext.js";

const cityName = (id) => supportedDestinations.find((city) => city.id === id)?.name.en ?? id;

export default function PlannerJourneyHorizon({ values }) {
  const signature = [values.origin, values.destination, values.startDate, values.endDate, values.travellerCount, values.interests.length, values.totalBudgetCny].join("|");
  const { scope } = useGsapContext(({ gsap }) => {
    gsap.fromTo(".planner-horizon-route b", { scaleX: 0.2 }, { scaleX: 1, duration: 0.55, ease: "power3.out", transformOrigin: "left" });
    gsap.fromTo(".planner-horizon-item", { y: 5, opacity: 0.55 }, { y: 0, opacity: 1, duration: 0.32, stagger: 0.035, ease: "power2.out" });
  }, [signature]);
  const items = [
    [MapPin, "Origin", values.origin || "Not set"],
    [MapPin, "Destination", cityName(values.destination)],
    [CalendarDays, "Dates", `${values.startDate} to ${values.endDate}`],
    [Users, "Travel party", `${values.travellerCount} travellers`],
    [Sparkles, "Interests", `${values.interests.length} selected`],
    [WalletCards, "Budget", `CNY ${Number(values.totalBudgetCny).toLocaleString()} total`]
  ];
  return <section ref={scope} className="planner-horizon" role="region" aria-label="Trip brief progress">
    <div className="planner-horizon-head"><span>Live journey brief</span><strong>{values.origin || "Origin"} to {cityName(values.destination)}</strong></div>
    <div className="planner-horizon-route" aria-hidden="true"><b /></div>
    <div className="planner-horizon-grid">{items.map(([Icon, label, value]) => <div key={label} className="planner-horizon-item"><Icon aria-hidden="true" /><span>{label}</span><strong>{value}</strong></div>)}</div>
  </section>;
}
