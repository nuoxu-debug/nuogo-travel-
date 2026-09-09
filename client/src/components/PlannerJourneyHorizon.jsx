import { CalendarDays, MapPin, Sparkles, Users, WalletCards } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useGsapContext } from "../motion/useGsapContext.js";

export default function PlannerJourneyHorizon({ values }) {
  const { language } = useLanguage();
  const zh = language === "zh";
  const signature = [values.startDate, values.endDate, values.travellerCount, values.interests.length, values.budgetSgd].join("|");
  const { scope } = useGsapContext(({ gsap }) => {
    gsap.fromTo(".planner-horizon-route b", { scaleX: 0.2 }, { scaleX: 1, duration: 0.55, ease: "power3.out", transformOrigin: "left" });
    gsap.fromTo(".planner-horizon-item", { y: 5, opacity: 0.55 }, { y: 0, opacity: 1, duration: 0.32, stagger: 0.035 });
  }, [signature]);
  const items = [
    [MapPin, zh ? "目的地" : "Destination", zh ? "新加坡" : "Singapore"],
    [CalendarDays, zh ? "日期" : "Dates", `${values.startDate} ${zh ? "至" : "to"} ${values.endDate}`],
    [Users, zh ? "同行人数" : "Travel party", zh ? `${values.travellerCount} 人` : `${values.travellerCount} travellers`],
    [Sparkles, zh ? "兴趣" : "Interests", zh ? `已选 ${values.interests.length} 项` : `${values.interests.length} selected`],
    [WalletCards, zh ? "预算" : "Budget", `S$ ${Number(values.budgetSgd).toLocaleString()}`]
  ];
  return <section ref={scope} className="planner-horizon" role="region" aria-label={zh ? "行程概览" : "Trip brief progress"}><div className="planner-horizon-head"><span>{zh ? "实时行程概览" : "Live journey brief"}</span><strong>{zh ? "探索新加坡" : "Explore Singapore"}</strong></div><div className="planner-horizon-route" aria-hidden="true"><b /></div><div className="planner-horizon-grid">{items.map(([Icon, label, value]) => <div key={label} className="planner-horizon-item"><Icon aria-hidden="true" /><span>{label}</span><strong>{value}</strong></div>)}</div></section>;
}
