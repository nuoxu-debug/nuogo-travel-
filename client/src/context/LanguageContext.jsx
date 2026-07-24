import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { translate } from "../i18n/translations.js";

const LanguageContext = createContext(null);
const LANGUAGE_DEFAULT_VERSION = "zh-v2";

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const migrated = localStorage.getItem("nuogo-language-default") === LANGUAGE_DEFAULT_VERSION;
    if (!migrated) return "zh";
    return localStorage.getItem("nuogo-language") === "en" ? "en" : "zh";
  });

  useEffect(() => {
    localStorage.setItem("nuogo-language", language);
    localStorage.setItem("nuogo-language-default", LANGUAGE_DEFAULT_VERSION);
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage: setLanguageState,
    t: (key) => translate(language, key)
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider.");
  return value;
}
