import { Compass, Luggage, MapPin, Route, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAnime } from "../hooks/useAnime.js";

const stages = {
  en: [
    "Collecting China travel preferences",
    "Verifying budget & trip length constraints",
    "Building structured domestic travel LLM prompt",
    "Fetching three unique itinerary styles",
    "Parsing validated structured itinerary JSON",
    "Rendering timeline & map routes"
  ],
  zh: [
    "正在收集中国旅行偏好",
    "正在核验预算与行程天数",
    "正在构建境内旅行结构化提示词",
    "正在获取三种独特行程风格",
    "正在解析并验证行程JSON数据",
    "正在渲染时间线与地图路线"
  ]
};

export const pipelineDuration = import.meta.env.MODE === "test" ? 45 : 620;

export default function PipelineOverlay({ open }) {
  const { language } = useLanguage();
  const animate = useAnime();
  const root = useRef(null);
  const [stage, setStage] = useState(0);
  const activeStages = useMemo(() => stages[language], [language]);

  useEffect(() => {
    if (!open) return undefined;
    setStage(0);
    const timer = window.setInterval(() => {
      setStage((current) => Math.min(activeStages.length - 1, current + 1));
    }, pipelineDuration);
    animate({
      targets: root.current?.querySelectorAll(".float-glyph"),
      translateY: [-12, 12],
      rotate: [-4, 4],
      direction: "alternate",
      loop: true,
      delay: (_target, index) => index * 140,
      duration: 1200,
      easing: "easeInOutSine"
    });
    animate({
      targets: root.current?.querySelector(".route-runner"),
      translateX: ["0%", "620%"],
      direction: "alternate",
      loop: true,
      duration: 2100,
      easing: "easeInOutQuad"
    });
    return () => window.clearInterval(timer);
  }, [activeStages.length, animate, open]);

  useEffect(() => {
    if (!open) return;
    animate({
      targets: root.current?.querySelector(".pipeline-status"),
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 420,
      easing: "easeOutExpo"
    });
  }, [animate, open, stage]);

  if (!open) return null;
  const progress = ((stage + 1) / activeStages.length) * 100;

  return (
    <div ref={root} className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-ink px-5 text-white" role="dialog" aria-modal="true" aria-label="Generating itinerary">
      <div className="absolute inset-y-0 left-[12%] hidden w-px bg-white/10 lg:block" />
      <div className="absolute inset-y-0 right-[12%] hidden w-px bg-white/10 lg:block" />
      <div className="absolute left-[8%] top-[16%] text-white/15"><Luggage className="float-glyph h-16 w-16" /></div>
      <div className="absolute right-[10%] top-[22%] text-gold/25"><Compass className="float-glyph h-20 w-20" /></div>
      <div className="absolute bottom-[16%] left-[14%] text-vermilion/25"><MapPin className="float-glyph h-14 w-14" /></div>
      <div className="w-full max-w-3xl">
        <div className="mx-auto grid h-20 w-20 place-items-center border border-white/20 bg-white/10">
          <Sparkles className="h-8 w-8 text-gold" />
        </div>
        <p className="mt-8 text-center text-xs font-bold uppercase tracking-[0.18em] text-white/45">
          Nuogo AI pipeline · {stage + 1}/6
        </p>
        <h2 key={`${language}-${stage}`} aria-live="polite" className="pipeline-status mx-auto mt-4 min-h-[96px] max-w-2xl text-center font-display text-3xl font-bold leading-tight sm:text-5xl">
          {activeStages[stage]}
        </h2>
        <div className="relative mx-auto mt-12 max-w-xl">
          <div className="h-1 bg-white/15">
            <div
              className="h-full bg-vermilion transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-5 flex items-center gap-3 text-white/30">
            <MapPin className="h-4 w-4" />
            <div className="relative h-px flex-1 bg-white/20">
              <Route className="route-runner absolute -top-3 left-0 h-6 w-6 text-gold" />
            </div>
            <MapPin className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
