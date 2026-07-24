import { CalendarDays, RefreshCw } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function DayTabs({ days, activeDayId, onSelect, onRegenerate, disabled }) {
  const { language } = useLanguage();
  return (
    <div className="flex items-center gap-2 overflow-x-auto border border-ink/10 bg-paper p-3 shadow-sm">
      <CalendarDays className="h-5 w-5 shrink-0 text-jade" />
      {days.map((day) => (
        <button
          key={day.id}
          type="button"
          onClick={() => onSelect(day.id)}
          className={`min-h-11 shrink-0 px-4 text-sm font-bold transition-colors ${activeDayId === day.id ? "bg-ink text-white" : "bg-mist text-ink/55 hover:text-ink"}`}
        >
          {language === "zh" ? `第${day.dayNumber}天` : `Day ${day.dayNumber}`}
        </button>
      ))}
      <button
        type="button"
        onClick={onRegenerate}
        disabled={disabled}
        title={language === "zh" ? "重新生成当天" : "Regenerate this day"}
        aria-label={language === "zh" ? "重新生成当天" : "Regenerate this day"}
        className="ml-auto grid h-11 w-11 shrink-0 place-items-center border border-ink/10 bg-white text-jade disabled:opacity-40"
      >
        <RefreshCw className="h-4 w-4" />
      </button>
    </div>
  );
}
