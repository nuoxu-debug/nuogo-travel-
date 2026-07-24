import { Languages } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function LanguageToggle({ tone = "light" }) {
  const { language, setLanguage } = useLanguage();
  const dark = tone === "dark";
  const frame = dark
    ? "border-white/25 bg-white/12 text-white"
    : "border-ink/12 bg-white/80 text-ink shadow-sm";
  const active = dark
    ? "bg-white text-ink"
    : "bg-lake text-white";
  const inactive = dark ? "text-white opacity-80 hover:bg-white/10" : "text-ink opacity-70 hover:bg-ink/5";

  return (
    <div className={`inline-flex h-9 items-center gap-1 rounded-lg border p-1 text-xs font-bold backdrop-blur-xl ${frame}`}>
      <Languages aria-hidden="true" className="ml-1 h-4 w-4" />
      <button
        type="button"
        aria-pressed={language === "en"}
        className={`h-7 rounded-md px-2 transition-colors ${language === "en" ? active : inactive}`}
        onClick={() => setLanguage("en")}
      >
        EN
      </button>
      <button
        type="button"
        aria-pressed={language === "zh"}
        className={`h-7 rounded-md px-2 transition-colors ${language === "zh" ? active : inactive}`}
        onClick={() => setLanguage("zh")}
      >
        中文
      </button>
    </div>
  );
}
