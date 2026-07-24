import {
  Clock3,
  Images,
  Lightbulb,
  NotebookText,
  Soup,
  Sunrise,
  Ticket,
  University
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAnime } from "../hooks/useAnime.js";
import AttractionImage from "./AttractionImage.jsx";

export default function GuidePanel({ activity }) {
  const { language } = useLanguage();
  const animate = useAnime();
  const root = useRef(null);

  useEffect(() => {
    if (!activity) return;
    animate({
      targets: root.current?.querySelectorAll("[data-detail-reveal]"),
      translateY: [10, 0],
      opacity: [0, 1],
      delay: (_target, index) => index * 45,
      duration: 420,
      easing: "easeOutExpo"
    });
  }, [activity?.id, animate]);

  if (!activity) return null;
  const details = activity.visitDetails;
  const items = [
    [University, language === "zh" ? "文化背景" : "Cultural context", activity.guide.culture[language]],
    [Soup, language === "zh" ? "本地吃法" : "Hidden food tip", activity.guide.food[language]],
    [Clock3, language === "zh" ? "避开人流" : "Crowd strategy", activity.guide.crowd[language]],
    [Lightbulb, language === "zh" ? "游览技巧" : "Visit hack", activity.guide.visit[language]]
  ];
  return (
    <section ref={root} data-testid="guide-panel" className="max-h-[360px] overflow-y-auto border border-ink/10 bg-ink p-4 text-white">
      {activity.imageUrl && (
        <div data-detail-reveal className="-mx-4 -mt-4 mb-4 opacity-0">
          <AttractionImage activity={activity} eager className="h-[132px] w-full sm:h-[150px]" />
        </div>
      )}
      <p className="text-xs font-bold uppercase text-gold">
        {language === "zh" ? "Nuogo 本地指南" : "Nuogo local guide"}
      </p>
      <h2 data-detail-reveal className="mt-2 font-display text-lg font-bold opacity-0">
        {activity.name[language]}
      </h2>
      {details && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-px bg-white/15">
            {[
              [Clock3, language === "zh" ? "\u5efa\u8bae\u65f6\u957f" : "Duration", details.suggestedDuration[language]],
              [Sunrise, language === "zh" ? "\u6700\u4f73\u65f6\u6bb5" : "Best time", details.bestTime[language]]
            ].map(([Icon, label, value]) => (
              <div key={label} data-detail-reveal className="bg-ink p-2.5 opacity-0">
                <Icon className="h-4 w-4 text-gold" aria-hidden="true" />
                <span className="mt-2 block text-[10px] font-bold uppercase text-white/45">{label}</span>
                <strong className="mt-1 block text-xs leading-5">{value}</strong>
              </div>
            ))}
          </div>
          <div data-detail-reveal className="mt-3 grid gap-2 border-y border-white/15 py-3 text-xs leading-5 opacity-0">
            <p className="flex gap-3">
              <NotebookText className="mt-0.5 h-4 w-4 shrink-0 text-vermilion" aria-hidden="true" />
              <span>{details.openingHours[language]}</span>
            </p>
            <p className="flex gap-3">
              <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-vermilion" aria-hidden="true" />
              <span>{details.ticketAdvice[language]}</span>
            </p>
          </div>
          <div data-detail-reveal className="mt-3 flex flex-wrap gap-2 opacity-0">
            {details.highlights[language].map((highlight) => (
              <span key={highlight} className="border border-white/20 px-2 py-1 text-xs font-semibold">
                {highlight}
              </span>
            ))}
          </div>
          <div data-detail-reveal className="mt-3 flex items-center gap-4 text-xs text-white/55 opacity-0">
            <span className="flex items-center gap-1.5">
              <University className="h-4 w-4" aria-hidden="true" />
              {details.popularity.reviews.toLocaleString()} {language === "zh" ? "\u6761\u8bc4\u8bba" : "reviews"}
            </span>
            <span className="flex items-center gap-1.5">
              <Images className="h-4 w-4" aria-hidden="true" />
              {details.popularity.images.toLocaleString()} {language === "zh" ? "\u5f20\u56fe\u7247" : "images"}
            </span>
          </div>
          {activity.imageAttribution && (
            <p data-detail-reveal className="mt-3 text-[10px] text-white/40 opacity-0">
              {activity.imageAttribution}
            </p>
          )}
        </>
      )}
      <div className="mt-4 grid gap-3">
        {items.map(([Icon, label, text]) => (
          <div key={label} data-detail-reveal className="grid grid-cols-[28px_1fr] gap-2.5 border-t border-white/12 pt-3 opacity-0">
            <Icon className="h-4 w-4 text-vermilion" />
            <div><h3 className="text-[10px] font-bold uppercase text-white/45">{label}</h3><p className="mt-1 text-xs leading-5 text-white/72">{text}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}
