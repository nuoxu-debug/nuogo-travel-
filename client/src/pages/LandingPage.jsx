import {
  ArrowDown,
  ArrowRight,
  Check,
  Database,
  MapPinned,
  Route,
  ShieldCheck,
  Sparkles,
  WalletCards
} from "lucide-react";
import { Link } from "react-router-dom";
import RouteConstellation from "../components/RouteConstellation.jsx";
import ScrollJourneyMap from "../components/ScrollJourneyMap.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import AppShell from "../layout/AppShell.jsx";
import { useGsapContext } from "../motion/useGsapContext.js";

const journeyStops = [
  { label: ["Departure", "出发"], meta: ["Your starting point", "你的起点"], type: "origin" },
  { label: ["Stop 01", "停留点 01"], meta: ["First stay", "第一站"], type: "city" },
  { label: ["Stop 02", "停留点 02"], meta: ["Connected route", "衔接路线"], type: "connection" },
  { label: ["Stop 03", "停留点 03"], meta: ["Final stay", "最后一站"], type: "city" }
];

const strategies = [
  {
    name: ["Budget-Saving", "省钱优先"],
    code: "BS",
    tone: "jade",
    location: ["Lower-cost route", "更实惠的路线"],
    position: "18% center",
    promise: ["Protect more of your budget without dropping the sights that matter.", "保留更多预算，同时不错过真正重要的景点。"],
    choices: [["Lower reference tiers", "采用较低参考价位"], ["Public transport first", "优先公共交通"], ["Free and high-value POIs", "优先免费与高性价比景点"]]
  },
  {
    name: ["Balanced", "均衡方案"],
    code: "BA",
    tone: "sky",
    location: ["Flexible route", "灵活路线"],
    position: "54% center",
    promise: ["Distribute spending across comfort, food, movement, and attractions.", "在住宿、餐饮、交通与景点之间合理分配支出。"],
    choices: [["Mid-range stays", "中档住宿"], ["Mixed local transport", "组合使用市内交通"], ["Paid and free experiences", "付费与免费体验搭配"]]
  },
  {
    name: ["Comfort-Focused", "舒适优先"],
    code: "CF",
    tone: "coral",
    location: ["Easier route", "更轻松的路线"],
    position: "88% center",
    promise: ["Use the same hard budget for easier movement and more comfortable choices.", "在相同总预算内，获得更轻松的移动与更舒适的选择。"],
    choices: [["Comfort tiers when feasible", "预算允许时选择舒适档次"], ["More taxi flexibility", "更灵活地使用出租车"], ["Budget-safe fallback choices", "保留符合预算的替代方案"]]
  }
];

const sourceBoundaries = [
  {
    icon: MapPinned,
    label: ["Place and route data", "地点与路线资料"],
    value: ["AMap primary", "高德地图为主要来源"],
    note: ["Operational POIs, coordinates, and route information for China.", "提供中国境内可用的地点、坐标与路线信息。"]
  },
  {
    icon: Database,
    label: ["Tourism context", "旅游背景资料"],
    value: ["OpenTripMap support", "OpenTripMap 辅助"],
    note: ["Supporting attraction details and source identity where available.", "在资料可用时补充景点详情与来源标识。"]
  },
  {
    icon: Sparkles,
    label: ["Schedule", "行程安排"],
    value: ["AI-assisted", "AI 辅助"],
    note: ["The model proposes POI order, duration, and personalised reasons.", "模型提出景点顺序、停留时长与个性化推荐理由。"]
  },
  {
    icon: WalletCards,
    label: ["Trip cost", "旅行费用"],
    value: ["System estimate", "系统估算"],
    note: ["Nuogo calculates costs from user, provider, and reference values.", "Nuogo 根据用户输入、数据来源与参考价格计算费用。"]
  }
];

export default function LandingPage() {
  const { language } = useLanguage();
  const zh = language === "zh";
  const index = zh ? 1 : 0;
  const localizedStops = journeyStops.map((stop) => ({ ...stop, label: stop.label[index], meta: stop.meta[index] }));
  const { scope } = useGsapContext(({ gsap, ScrollTrigger }) => {
    gsap.fromTo("[data-flight-intro]", {
      y: 32,
      opacity: 0,
      clipPath: "inset(0 0 22% 0)"
    }, {
      y: 0,
      opacity: 1,
      clipPath: "inset(0 0 0% 0)",
      duration: 1,
      stagger: 0.09,
      ease: "expo.out"
    });

    const media = gsap.matchMedia();
    if (ScrollTrigger) {
      media.add("(min-width: 900px)", () => {
        gsap.to(".strategy-track", {
          xPercent: -66.666,
          ease: "none",
          scrollTrigger: {
            trigger: ".strategy-stage",
            start: "top top",
            end: "+=2200",
            pin: true,
            scrub: 0.85,
            anticipatePin: 1
          }
        });
      });
    }

    return () => media.revert();
  }, []);

  return (
    <AppShell dark>
      <div ref={scope} className="flight-atlas">
        <section className="flight-hero">
          <div className="flight-hero-media" aria-hidden="true">
            <img src="/images/china-journey-hero.png" alt="" />
          </div>

          <div className="flight-hero-inner">
            <div className="flight-hero-copy">
              <div data-flight-intro className="flight-edition">
                <span>{zh ? "中国旅程图谱" : "China journey atlas"}</span>
                <span>{zh ? "一条连贯路线" : "One connected route"}</span>
              </div>
              <p data-flight-intro className="flight-kicker">{zh ? "AI 辅助 · 来源可追溯 · 预算有约束" : "AI-assisted. Source-aware. Budget-bound."}</p>
              <h1 data-flight-intro>{zh ? "规划完整旅程，" : "Plan the whole journey,"}<br /><span>{zh ? "而不只是目的地。" : "not just the destination."}</span></h1>
              <p data-flight-intro className="flight-hero-lede">
                {zh ? "Nuogo 将一份旅行需求转化为三套有资料依据的中国旅行方案，从出发一直规划到返程。" : "Nuogo turns one travel brief into three grounded ways to move through China, from your origin to your return."}
              </p>
              <div data-flight-intro className="flight-actions">
                <Link to="/planner" className="flight-primary-action">
                  {zh ? "开始规划" : "Start planning"} <ArrowRight aria-hidden="true" />
                </Link>
                <a href="#journey-map" className="flight-secondary-action">
                  {zh ? "查看路线" : "Follow the route"} <ArrowDown aria-hidden="true" />
                </a>
              </div>
            </div>

            <div data-flight-intro className="flight-manifest">
              <div className="flight-manifest-head">
                <span>{zh ? "路线预览" : "Route preview"}</span>
                <span className="flight-status"><i /> {zh ? "规划模型" : "Planning model"}</span>
              </div>
              <RouteConstellation stops={localizedStops} ariaLabel={zh ? "旅程路线" : "Journey route"} />
            </div>
          </div>

          <a href="#journey-map" className="flight-scroll-cue" aria-label={zh ? "滚动查看行程地图" : "Scroll to journey map"}>
            <span>{zh ? "向下滚动，沿路线前行" : "Scroll to trace the journey"}</span>
            <ArrowDown aria-hidden="true" />
          </a>
        </section>

        <ScrollJourneyMap />

        <section id="approaches" className="strategy-stage">
          <div className="strategy-track">
            {strategies.map((strategy, index) => (
              <article
                key={strategy.name}
                className={`strategy-panel strategy-${strategy.tone}`}
                style={{ "--strategy-position": strategy.position }}
              >
                <div className="strategy-panel-inner">
                  <div className="strategy-heading">
                    <span className="strategy-code">{strategy.code}</span>
                    <p>{zh ? `方案 ${index + 1} / 3` : `Approach ${index + 1} of 3`} <em>{strategy.location[zh ? 1 : 0]}</em></p>
                  </div>
                  <h2>{strategy.name[zh ? 1 : 0]}</h2>
                  <p className="strategy-promise">{strategy.promise[zh ? 1 : 0]}</p>
                  <ul>
                    {strategy.choices.map((choice) => (
                      <li key={choice[0]}><Check aria-hidden="true" /> {choice[zh ? 1 : 0]}</li>
                    ))}
                  </ul>
                  <div className="strategy-budget-rule">
                    <ShieldCheck aria-hidden="true" />
                    <span><b>{zh ? "相同总预算" : "Same total budget"}</b>{zh ? "每套方案都必须遵守的硬约束" : "Hard constraint for every approach"}</span>
                  </div>
                </div>
                <div className="strategy-route-mark" aria-hidden="true">
                  <span>{index + 1}</span>
                  <Route />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="source-boundary-section">
          <div className="source-boundary-intro">
            <p className="flight-kicker">{zh ? "了解每条信息的来源" : "Know where every answer comes from"}</p>
            <h2>{zh ? "旅行信息应该附带来源，而不是看似自信的猜测。" : "Travel information should arrive with a source, not a confident guess."}</h2>
            <p>
              {zh ? "Nuogo 将事实、建议与估算清楚区分，让你知道系统掌握了什么，又计算了什么。" : "Nuogo separates facts, suggestions, and estimates so you can understand what the system knows and what it has calculated."}
            </p>
          </div>
          <div className="source-boundary-list">
            {sourceBoundaries.map(({ icon: Icon, label, value, note }) => (
              <article key={label[0]} className="source-boundary-row">
                <Icon aria-hidden="true" />
                <span>{label[zh ? 1 : 0]}</span>
                <strong>{value[zh ? 1 : 0]}</strong>
                <p>{note[zh ? 1 : 0]}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="journey-close">
          <div>
            <p>{zh ? "准备好你的条件，就可以开始。" : "Ready when your constraints are."}</p>
            <h2>{zh ? "选择日期，设定预算，查看三种旅行方式。" : "Choose the dates. Set the budget. See three ways forward."}</h2>
          </div>
          <Link to="/planner" className="journey-close-action">
            {zh ? "创建我的行程" : "Build my trip"} <ArrowRight aria-hidden="true" />
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
