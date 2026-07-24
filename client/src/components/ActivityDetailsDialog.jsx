import {
  Clock3,
  ExternalLink,
  MapPin,
  NotebookText,
  ShieldCheck,
  Ticket,
  Users,
  X
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAnime } from "../hooks/useAnime.js";
import AttractionImage from "./AttractionImage.jsx";

const ticketCategories = new Set(["natural_scenery", "historical_relics", "city_landmarks"]);

function currency(value) {
  return `¥${Math.max(0, Math.round(Number(value) || 0)).toLocaleString()}`;
}

function ticketRows(activity, language) {
  if (!ticketCategories.has(activity.category)) return [];
  const adult = Number(activity.estimatedCost) || 0;
  if (adult <= 0) {
    return [[
      language === "zh" ? "入场参考" : "Entry reference",
      language === "zh" ? "可能免费或另按现场项目收费" : "May be free or charged by on-site item"
    ]];
  }
  return [
    [language === "zh" ? "成人票" : "Adult", currency(adult)],
    [language === "zh" ? "儿童/学生票" : "Child / student", currency(adult * 0.5)],
    [language === "zh" ? "长者票" : "Elderly", language === "zh" ? "以景区政策为准" : "Depends on site policy"]
  ];
}

export default function ActivityDetailsDialog({ activity, open, onClose }) {
  const { language } = useLanguage();
  const animate = useAnime();
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return;
    animate({
      targets: panel.current,
      translateY: [18, 0],
      opacity: [0, 1],
      duration: 360,
      easing: "easeOutExpo"
    });
  }, [animate, open, activity?.id]);

  useEffect(() => {
    if (!open) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open || !activity) return null;

  const details = activity.visitDetails;
  const tickets = ticketRows(activity, language);

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-ink/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={language === "zh" ? "行程详情" : "Activity details"}>
      <section ref={panel} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-ink/10 bg-paper shadow-panel">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink/10 bg-paper/88 p-4 backdrop-blur-2xl sm:p-5">
          <div>
            <p className="text-xs font-extrabold uppercase text-lake">
              {language === "zh" ? "行程详情" : "Activity details"}
            </p>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-ink">{activity.name[language]}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={language === "zh" ? "关闭详情" : "Close details"} className="grid h-10 w-10 place-items-center rounded-lg border border-ink/10 bg-white text-ink/65">
            <X className="h-5 w-5" />
          </button>
        </div>

        {activity.imageUrl && (
          <div className="border-b border-ink/10">
            <AttractionImage activity={activity} eager className="h-[240px] w-full sm:h-[320px]" />
          </div>
        )}

        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0">
            <p className="text-sm leading-7 text-ink/68">{activity.description[language]}</p>
            <div className="mt-5 grid gap-3 text-sm">
              <p className="flex gap-3">
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-lake" />
                <span>{activity.startTime} - {activity.endTime}</span>
              </p>
              <p className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-lake" />
                <span>{activity.address[language]}</span>
              </p>
              <p className="flex gap-3">
                <NotebookText className="mt-0.5 h-5 w-5 shrink-0 text-lake" />
                <span>{activity.transportNote[language]}</span>
              </p>
            </div>

            {details && (
              <div className="mt-6 grid gap-3 rounded-lg border border-ink/10 bg-white p-4">
                <h3 className="font-display text-lg font-bold">{language === "zh" ? "游览信息" : "Visit information"}</h3>
                <p className="text-sm leading-6 text-ink/65">{details.openingHours[language]}</p>
                <p className="text-sm leading-6 text-ink/65">{details.ticketAdvice[language]}</p>
                <div className="flex flex-wrap gap-2">
                  {details.highlights[language].map((highlight) => (
                    <span key={highlight} className="rounded-md bg-mist px-2 py-1 text-xs font-bold text-ink/70">
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-3 rounded-lg border border-ink/10 bg-white p-4">
              <h3 className="font-display text-lg font-bold">{language === "zh" ? "本地建议" : "Local guide notes"}</h3>
              {[activity.guide.culture, activity.guide.food, activity.guide.crowd, activity.guide.visit].map((item) => (
                <p key={item[language]} className="text-sm leading-6 text-ink/65">{item[language]}</p>
              ))}
            </div>
          </div>

          <aside className="grid content-start gap-4">
            <div className="rounded-lg border border-ink/10 bg-white p-4">
              <div className="flex items-center justify-between">
                <Ticket className="h-5 w-5 text-vermilion" />
                <span className="text-xs font-extrabold uppercase text-ink/40">
                  {language === "zh" ? "票价参考" : "Ticket estimate"}
                </span>
              </div>
              <dl className="mt-4 grid gap-3">
                {tickets.length ? tickets.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 border-b border-ink/8 pb-2 text-sm last:border-b-0 last:pb-0">
                    <dt className="text-ink/55">{label}</dt>
                    <dd className="text-right font-bold">{value}</dd>
                  </div>
                )) : (
                  <p className="text-sm leading-6 text-ink/55">
                    {language === "zh" ? "此项目主要按餐饮、住宿或活动消费估算。" : "This item is estimated as meal, stay, or activity spending."}
                  </p>
                )}
              </dl>
              {tickets.length > 1 && (
                <p className="mt-3 text-xs leading-5 text-ink/45">
                  {language === "zh" ? "儿童、学生与长者价格为演示估算，最终以景区现场政策为准。" : "Child, student, and elderly prices are demo estimates; confirm with the site."}
                </p>
              )}
            </div>

            {details && (
              <div className="rounded-lg border border-ink/10 bg-white p-4">
                <div className="flex items-center gap-2 font-bold">
                  <Users className="h-5 w-5 text-lake" />
                  {language === "zh" ? "热度参考" : "Popularity"}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <span className="rounded-md bg-mist p-2"><b>{details.popularity.reviews.toLocaleString()}</b><br />{language === "zh" ? "评论" : "reviews"}</span>
                  <span className="rounded-md bg-mist p-2"><b>{details.popularity.images.toLocaleString()}</b><br />{language === "zh" ? "图片" : "images"}</span>
                </div>
              </div>
            )}

            {activity.sourceUrl && activity.sourceProvider && (
              <div className="rounded-lg border border-ink/10 bg-white p-4">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldCheck className="h-5 w-5 text-jade" />
                  {language === "zh" ? "资料来源" : "Source"}
                </div>
                <a href={activity.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-lake underline">
                  {activity.sourceProvider}
                  <ExternalLink className="h-4 w-4" />
                </a>
                {activity.imageAttribution && (
                  <p className="mt-2 text-xs text-ink/45">{activity.imageAttribution}</p>
                )}
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
