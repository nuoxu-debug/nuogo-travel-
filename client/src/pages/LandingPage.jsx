import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Check,
  Compass,
  MapPinned,
  Sparkles,
  Users
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo.jsx";
import RouteRail from "../components/RouteRail.jsx";
import SectionReveal from "../components/SectionReveal.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAnime } from "../hooks/useAnime.js";
import AppShell from "../layout/AppShell.jsx";

const strategies = [
  {
    id: "01",
    tone: "jade",
    label: { en: "Budget smart", zh: "轻装省钱" },
    detail: { en: "More local transit and high-value stays.", zh: "更多公共交通与高性价比住宿。" },
    price: "¥2,980"
  },
  {
    id: "02",
    tone: "vermilion",
    label: { en: "Balanced route", zh: "均衡路线" },
    detail: { en: "Signature sights with room to wander.", zh: "经典景点与自由探索时间兼顾。" },
    price: "¥4,260"
  },
  {
    id: "03",
    tone: "gold",
    label: { en: "Comfort first", zh: "舒适优先" },
    detail: { en: "Private transfers and slower mornings.", zh: "更从容的早晨与便捷接送。" },
    price: "¥6,120"
  }
];

const workflow = [
  {
    icon: Compass,
    en: "Set the travel brief",
    zh: "建立旅行需求",
    noteEn: "Dates, group, budget, pace, interests, and language.",
    noteZh: "日期、人数、预算、节奏、兴趣与语言。"
  },
  {
    icon: Sparkles,
    en: "Compare three routes",
    zh: "比较三套路线",
    noteEn: "See exactly how each option spends time and money.",
    noteZh: "清楚了解每套方案如何分配时间与预算。"
  },
  {
    icon: MapPinned,
    en: "Shape the final trip",
    zh: "完善最终行程",
    noteEn: "Edit the timeline, map, budget, and local guide.",
    noteZh: "编辑时间线、地图、预算与当地向导。"
  }
];

export default function LandingPage() {
  const { language, t } = useLanguage();
  const animate = useAnime();
  const root = useRef(null);

  useEffect(() => {
    animate({
      targets: root.current?.querySelectorAll(".hero-reveal"),
      translateY: [30, 0],
      opacity: [0, 1],
      delay: (_target, index) => 130 + index * 85,
      duration: 850,
      easing: "easeOutExpo"
    });
    animate({
      targets: root.current?.querySelector(".hero-photo"),
      scale: [1.08, 1],
      duration: 1800,
      easing: "easeOutCubic"
    });
  }, [animate]);

  return (
    <AppShell dark>
      <div ref={root}>
        <section className="relative flex h-[88svh] min-h-[650px] max-h-[900px] items-end overflow-hidden bg-ink text-white">
          <img
            className="hero-photo absolute inset-0 h-full w-full object-cover"
            src="https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=2400&q=90"
            alt="Great Wall of China crossing green mountains"
          />
          <div className="absolute inset-0 bg-ink/58" />
          <div className="absolute inset-y-0 left-[55%] hidden w-px bg-white/18 lg:block" />
          <div className="relative mx-auto grid w-full max-w-[1440px] gap-8 px-5 pb-10 pt-28 sm:px-8 sm:pb-14 lg:grid-cols-[1.2fr_.8fr] lg:items-end lg:pb-16">
            <div className="min-w-0">
              <div className="hero-reveal mb-5 flex items-center gap-4 opacity-0">
                <BrandLogo variant="full" className="h-24 w-24 rounded-lg bg-white object-contain shadow-lift sm:h-28 sm:w-28" />
                <span className="border-l border-white/25 pl-4 text-xs font-bold uppercase leading-5 text-gold">
                  Anhui route edition<br />AI travel planning
                </span>
              </div>
              <p className="hero-reveal text-sm font-extrabold uppercase text-white/66 opacity-0">{t("landing.eyebrow")}</p>
              <h1 className="hero-reveal mt-3 font-display text-6xl font-extrabold leading-none opacity-0 sm:text-8xl lg:text-[7.5rem]">
                Nuogo
              </h1>
              <p className="hero-reveal mt-4 max-w-3xl font-display text-3xl font-semibold leading-tight opacity-0 sm:text-5xl">
                {t("landing.title")}
              </p>
              <p className="hero-reveal mt-5 max-w-2xl text-base leading-7 text-white/76 opacity-0 sm:text-lg">
                {t("landing.subtitle")}
              </p>
              <div className="hero-reveal mt-7 flex flex-wrap gap-3 opacity-0">
                <Link to="/planner" className="group inline-flex min-h-13 items-center gap-3 rounded-lg bg-lake px-6 py-3.5 font-bold text-white shadow-lift transition-transform hover:-translate-y-0.5">
                  {t("landing.primary")} <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <a href="#routes" className="inline-flex min-h-13 items-center gap-3 rounded-lg border border-white/35 bg-white/12 px-6 py-3.5 font-bold backdrop-blur-xl">
                  {t("landing.secondary")} <ArrowDown className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="hero-reveal hidden rounded-lg border border-white/25 bg-ink/62 p-6 opacity-0 shadow-lift backdrop-blur-2xl sm:block" aria-label="Sample Anhui itinerary route">
              <div className="flex items-start justify-between gap-4 border-b border-white/15 pb-5">
                <div>
                  <p className="text-xs font-bold uppercase text-gold">Route AH · 05 days</p>
                  <h2 className="mt-2 font-display text-2xl font-bold">
                    {language === "zh" ? "黄山古村落环线" : "Huangshan heritage loop"}
                  </h2>
                </div>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-extrabold text-ink">READY</span>
              </div>
              <RouteRail
                className="mt-6 text-white"
                stops={[
                  { label: language === "zh" ? "黄山北站" : "Huangshan North", meta: "08:10" },
                  { label: language === "zh" ? "宏村" : "Hongcun", meta: "10:00" },
                  { label: language === "zh" ? "屯溪老街" : "Tunxi", meta: "17:20" }
                ]}
              />
              <div className="mt-7 grid grid-cols-3 border-t border-white/15 pt-5 text-xs">
                <span><b className="block text-base text-white">12</b><i className="not-italic text-white/50">stops</i></span>
                <span><b className="block text-base text-white">¥4,260</b><i className="not-italic text-white/50">estimate</i></span>
                <span><b className="block text-base text-white">2</b><i className="not-italic text-white/50">travellers</i></span>
              </div>
            </div>
          </div>
        </section>

        <section id="routes" className="bg-paper px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-[1440px]">
            <SectionReveal className="grid gap-7 border-b border-ink/12 pb-12 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
              <div>
                <p className="text-xs font-extrabold uppercase text-vermilion">One brief · three answers</p>
                <h2 className="mt-4 max-w-xl font-display text-4xl font-extrabold leading-tight sm:text-6xl">
                  {language === "zh" ? "不是一个答案，而是三个清晰选择。" : "Not one answer. Three clear ways to go."}
                </h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-ink/62">
                {language === "zh"
                  ? "Nuogo 同时建立省钱、均衡与舒适方案，让路线、节奏和预算差异一目了然。"
                  : "Nuogo builds budget, balanced, and comfort routes in parallel, then shows how time, pace, and cost change between them."}
              </p>
            </SectionReveal>

            <div className="mt-10 grid border-y border-ink/12 lg:grid-cols-3 lg:divide-x lg:divide-ink/12">
              {strategies.map((strategy, index) => (
                <SectionReveal key={strategy.id} delay={index * 80} as="article" className="interactive-lift min-h-[330px] border-b border-ink/12 p-6 last:border-b-0 lg:border-b-0 lg:p-8">
                  <div className="flex items-center justify-between">
                    <span className={`grid h-11 w-11 place-items-center rounded-lg text-sm font-extrabold text-white ${strategy.tone === "jade" ? "bg-jade" : strategy.tone === "gold" ? "bg-gold text-ink" : "bg-vermilion"}`}>
                      {strategy.id}
                    </span>
                    <span className="font-display text-2xl font-extrabold">{strategy.price}</span>
                  </div>
                  <h3 className="mt-16 font-display text-3xl font-bold">{strategy.label[language]}</h3>
                  <p className="mt-3 max-w-sm leading-7 text-ink/58">{strategy.detail[language]}</p>
                  <div className="mt-8 flex items-center gap-2 text-sm font-bold text-jade">
                    <Check className="h-4 w-4" /> {language === "zh" ? "符合总预算" : "Within total budget"}
                  </div>
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="grid min-h-[680px] bg-ink text-white lg:grid-cols-[1.05fr_.95fr]">
          <div className="relative min-h-[480px] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1529921879218-f99546d03a9d?auto=format&fit=crop&w=1600&q=88"
              alt="Traditional Chinese mountain landscape"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute bottom-0 left-0 bg-paper p-5 text-ink sm:p-7">
              <p className="text-xs font-extrabold uppercase text-vermilion">China · route reference</p>
              <p className="mt-2 font-display text-2xl font-bold">{language === "zh" ? "从地点开始，而不是从提示词开始。" : "Start with places, not prompts."}</p>
            </div>
          </div>
          <div className="flex items-center px-6 py-16 sm:px-12 lg:px-16">
            <SectionReveal className="w-full max-w-xl">
              <p className="text-xs font-extrabold uppercase text-gold">Plan · compare · shape</p>
              <h2 className="mt-5 font-display text-4xl font-extrabold leading-tight sm:text-6xl">
                {language === "zh" ? "一条能看懂、能调整、能出发的路线。" : "A route you can read, reshape, and actually take."}
              </h2>
              <div className="mt-10 divide-y divide-white/14 border-y border-white/14">
                {workflow.map(({ icon: Icon, en, zh, noteEn, noteZh }, index) => (
                  <div key={en} className="grid grid-cols-[46px_1fr] gap-5 py-6">
                    <span className="grid h-11 w-11 place-items-center border border-white/22 text-gold"><Icon className="h-5 w-5" /></span>
                    <div>
                      <p className="text-xs font-bold text-white/38">0{index + 1}</p>
                      <h3 className="mt-1 font-display text-xl font-bold">{language === "zh" ? zh : en}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/58">{language === "zh" ? noteZh : noteEn}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionReveal>
          </div>
        </section>

        <section className="bg-mist px-5 py-20 sm:px-8 sm:py-28">
          <SectionReveal className="mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-[1fr_440px] lg:items-end">
            <div>
              <p className="text-xs font-extrabold uppercase text-jade">Budget and guide intelligence</p>
              <h2 className="mt-4 max-w-4xl font-display text-4xl font-extrabold leading-tight sm:text-6xl">
                {language === "zh" ? "预算改变，路线也跟着改变。" : "Move the budget. Watch the journey move with it."}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/62">
                {language === "zh"
                  ? "住宿、交通、餐饮、门票与活动分配会连接到行程再生成，而不是停留在手动计算。"
                  : "Accommodation, transport, food, tickets, and activities stay connected to itinerary regeneration instead of behaving like a separate calculator."}
              </p>
            </div>
            <div className="ticket-cuts rounded-lg border border-ink/12 bg-paper p-6 shadow-panel">
              <div className="flex items-center justify-between">
                <BarChart3 className="h-6 w-6 text-jade" />
                <span className="text-xs font-extrabold uppercase text-jade">On budget</span>
              </div>
              <p className="mt-7 text-sm text-ink/45">{language === "zh" ? "预计总费用" : "Estimated trip total"}</p>
              <p className="mt-1 font-display text-5xl font-extrabold">¥4,260</p>
              <div className="mt-7 h-2 overflow-hidden rounded-full bg-ink/10"><div className="h-full w-[71%] rounded-full bg-jade" /></div>
              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><Users className="h-4 w-4 text-lake" /> 2 travellers</span>
                <span className="font-bold">¥2,130 / person</span>
              </div>
            </div>
          </SectionReveal>
        </section>

        <section className="bg-lake px-5 py-16 text-white sm:px-8 sm:py-20">
          <SectionReveal className="mx-auto flex max-w-[1440px] flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase text-white/65">Your next route starts here</p>
              <h2 className="mt-3 font-display text-4xl font-extrabold sm:text-6xl">{t("landing.finalTitle")}</h2>
            </div>
            <Link to="/planner" className="group inline-flex min-h-14 items-center justify-between gap-10 rounded-lg bg-white px-6 font-bold text-ink shadow-lift">
              {t("landing.primary")} <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </SectionReveal>
        </section>
      </div>
    </AppShell>
  );
}
