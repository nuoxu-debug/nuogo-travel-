import { CalendarDays, MapPin, Sparkles, Users, WalletCards } from "lucide-react";
import { supportedDestinations } from "@nuogo/shared/constants";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useGsapContext } from "../motion/useGsapContext.js";

export default function PlannerJourneyHorizon({ values }) {
  const { language } = useLanguage();
  const zh = language === "zh";
  const cityName = (id) => supportedDestinations.find((city) => city.id === id)?.name[language] ?? id;
  const origin = zh && values.origin === "Shanghai" ? "上海" : values.origin;
  const signature = [values.origin, values.destination, values.startDate, values.endDate, values.travellerCount, values.interests.length, values.totalBudgetCny].join("|");
  const { scope } = useGsapContext(({ gsap }) => {
    gsap.fromTo(".planner-horizon-route b", { scaleX: 0.2 }, { scaleX: 1, duration: 0.55, ease: "power3.out", transformOrigin: "left" });
    gsap.fromTo(".planner-horizon-item", { y: 5, opacity: 0.55 }, { y: 0, opacity: 1, duration: 0.32, stagger: 0.035, ease: "power2.out" });
  }, [signature]);
  const items = [
    [MapPin, zh ? "出发地" : "Origin", origin || (zh ? "未设置" : "Not set")],
    [MapPin, zh ? "目的地" : "Destination", cityName(values.destination)],
    [CalendarDays, zh ? "日期" : "Dates", `${values.startDate} ${zh ? "至" : "to"} ${values.endDate}`],
    [Users, zh ? "同行人数" : "Travel party", zh ? `${values.travellerCount} 人` : `${values.travellerCount} travellers`],
    [Sparkles, zh ? "兴趣" : "Interests", zh ? `已选 ${values.interests.length} 项` : `${values.interests.length} selected`],
    [WalletCards, zh ? "预算" : "Budget", zh ? `总计 CNY ${Number(values.totalBudgetCny).toLocaleString()}` : `CNY ${Number(values.totalBudgetCny).toLocaleString()} total`]
  ];
  return <section ref={scope} className="planner-horizon" role="region" aria-label={zh ? "行程概览" : "Trip brief progress"}>
    <div className="planner-horizon-head"><span>{zh ? "实时行程概览" : "Live journey brief"}</span><strong>{origin || (zh ? "出发地" : "Origin")}{zh ? "到" : " to "}{cityName(values.destination)}</strong></div>
    <div className="planner-horizon-route" aria-hidden="true"><b /></div>
    <div className="planner-horizon-grid">{items.map(([Icon, label, value]) => <div key={label} className="planner-horizon-item"><Icon aria-hidden="true" /><span>{label}</span><strong>{value}</strong></div>)}</div>
  </section>;
}
