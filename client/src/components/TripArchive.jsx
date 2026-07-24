import { CalendarDays, Copy, MapPin } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function TripArchive({ trips, onDuplicate, onReuse }) {
  const { language } = useLanguage();
  if (!trips.length) {
    return <div className="grid min-h-64 place-items-center border border-dashed border-ink/20 text-ink/45">{language === "zh" ? "这里还没有行程" : "No trips here yet"}</div>;
  }
  return (
    <div className="divide-y divide-ink/10 border-y border-ink/10">
      {trips.map((trip) => (
        <article key={trip.id} className="interactive-lift grid gap-5 bg-paper px-5 py-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase text-ink/40">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-vermilion" /> {trip.destination}</span>
              <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-jade" /> {trip.startDate}</span>
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold">{trip.title[language]}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onReuse(trip)} className="min-h-10 border border-ink/15 px-3 text-sm font-bold">{language === "zh" ? "复用偏好" : "Reuse preferences"}</button>
            <button type="button" onClick={() => onDuplicate(trip)} className="flex min-h-10 items-center gap-2 bg-ink px-3 text-sm font-bold text-white"><Copy className="h-4 w-4" /> {language === "zh" ? "复制行程" : "Duplicate"}</button>
          </div>
        </article>
      ))}
    </div>
  );
}
