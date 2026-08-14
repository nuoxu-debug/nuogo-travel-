import { CalendarDays, MapPin, Sparkles, Users, WalletCards } from "lucide-react";
import { chinaCities } from "@nuogo/shared/constants";
import { useGsapContext } from "../motion/useGsapContext.js";

const copy = {
  en: {
    aria: "Trip brief progress",
    eyebrow: "Live journey brief",
    origin: "Origin",
    destination: "Destination",
    dates: "Dates",
    party: "Travel party",
    interests: "Interests",
    budget: "Budget",
    days: "days",
    selected: "selected",
    total: "total",
    groups: {
      couple: "Couple",
      family_with_kids: "Family",
      elderly_group: "Elderly group",
      solo: "Solo",
      student_group: "Student group"
    }
  },
  zh: {
    aria: "行程概览",
    eyebrow: "实时行程概览",
    origin: "出发地",
    destination: "目的地",
    dates: "日期",
    party: "同行人",
    interests: "兴趣",
    budget: "预算",
    days: "天",
    selected: "项已选择",
    total: "总计",
    groups: {
      couple: "情侣",
      family_with_kids: "亲子家庭",
      elderly_group: "长者同行",
      solo: "独自旅行",
      student_group: "学生团队"
    }
  }
};

function cityName(id, language) {
  return chinaCities.find((city) => city.id === id)?.name[language] ?? id;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US").format(Number(value) || 0);
}

export default function PlannerJourneyHorizon({ values, language = "en" }) {
  const labels = copy[language];
  const signature = [
    values.departureCity,
    values.destination,
    values.startDate,
    values.days,
    values.groupType,
    values.interests.length,
    values.totalBudget
  ].join("|");
  const { scope } = useGsapContext(({ gsap }) => {
    gsap.fromTo(".planner-horizon-route b", { scaleX: 0.2 }, {
      scaleX: 1,
      duration: 0.55,
      ease: "power3.out",
      transformOrigin: "left"
    });
    gsap.fromTo(".planner-horizon-item", { y: 5, opacity: 0.55 }, {
      y: 0,
      opacity: 1,
      duration: 0.32,
      stagger: 0.035,
      ease: "power2.out"
    });
  }, [signature]);

  const route = `${cityName(values.departureCity, language)} → ${cityName(values.destination, language)}`;
  const items = [
    [MapPin, labels.origin, cityName(values.departureCity, language)],
    [MapPin, labels.destination, cityName(values.destination, language)],
    [CalendarDays, labels.dates, `${values.startDate} · ${values.days} ${labels.days}`],
    [Users, labels.party, labels.groups[values.groupType]],
    [Sparkles, labels.interests, `${values.interests.length} ${labels.selected}`],
    [WalletCards, labels.budget, `¥${formatCurrency(values.totalBudget)} ${labels.total}`]
  ];

  return (
    <section ref={scope} className="planner-horizon" role="region" aria-label={labels.aria}>
      <div className="planner-horizon-head">
        <span>{labels.eyebrow}</span>
        <strong>{route}</strong>
      </div>
      <div className="planner-horizon-route" aria-hidden="true"><b /></div>
      <div className="planner-horizon-grid">
        {items.map(([Icon, label, value]) => (
          <div key={label} className="planner-horizon-item">
            <Icon aria-hidden="true" />
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
