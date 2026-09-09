import { Languages } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function LanguageToggle({ tone = "light" }) {
  const { language, setLanguage } = useLanguage();
  const dark = tone === "dark";
  const active = "language-toggle__option--active";
  const inactive = "language-toggle__option";

  return (
    <div className={`language-toggle ${dark ? "language-toggle--dark" : ""}`}>
      <Languages aria-hidden="true" className="ml-1 h-4 w-4" />
      <button
        type="button"
        aria-pressed={language === "en"}
        className={`${language === "en" ? active : inactive}`}
        onClick={() => setLanguage("en")}
      >
        EN
      </button>
      <button
        type="button"
        aria-pressed={language === "zh"}
        className={`${language === "zh" ? active : inactive}`}
        onClick={() => setLanguage("zh")}
      >
        中文
      </button>
    </div>
  );
}
