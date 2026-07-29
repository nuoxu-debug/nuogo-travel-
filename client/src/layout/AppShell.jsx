import { ArrowUpRight, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import BrandLogo from "../components/BrandLogo.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import ScrollProgress from "../components/ScrollProgress.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function AppShell({ children, dark = false, hideFooter = false }) {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const foreground = dark ? "text-white" : "text-ink";
  const navClass = ({ isActive }) =>
    `text-sm font-bold transition-colors hover:text-lake ${isActive ? (dark ? "text-white" : "text-lake") : (dark ? "text-white/82" : "text-ink/70")}`;

  return (
    <div className="min-h-screen">
      <ScrollProgress />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-lg focus:bg-lake focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-white">
        {t("shell.skipContent")}
      </a>
      <header className={`z-40 ${dark ? "absolute inset-x-0 top-0 border-b border-white/12 bg-ink/12 backdrop-blur-2xl" : "sticky top-0 border-b border-ink/10 bg-paper/78 backdrop-blur-2xl"}`}>
        <div className={`mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-5 sm:px-8 ${foreground}`}>
          <Link to="/" className="group flex items-center gap-3 font-display text-xl font-extrabold" aria-label={t("shell.home")}>
            <BrandLogo />
            <span>Nuogo</span>
            <span className={`hidden border-l pl-3 text-[10px] font-bold uppercase leading-4 sm:block ${dark ? "border-white/25 text-white/55" : "border-ink/15 text-ink/45"}`}>
              <span className="block">{t("shell.country")}</span>
              <span className="block">{t("shell.studio")}</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <NavLink to="/planner" className={navClass}>{t("nav.plan")}</NavLink>
            {user && <NavLink to="/archive" className={navClass}>{t("nav.archive")}</NavLink>}
            <LanguageToggle tone={dark ? "dark" : "light"} />
            {user ? (
              <button type="button" onClick={logout} className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold transition-colors hover:text-lake">
                <LogOut className="h-4 w-4" /> {t("nav.signOut")}
              </button>
            ) : (
              <>
                <Link to="/login" className={`rounded-lg px-2 py-2 text-sm font-bold transition-colors hover:text-lake ${dark ? "text-white/82" : "text-ink/70"}`}>{t("nav.signIn")}</Link>
                <Link to="/register" className={`group flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-bold shadow-sm transition-transform hover:-translate-y-0.5 ${dark ? "bg-white text-ink" : "bg-lake text-white"}`}>
                  {t("nav.register")} <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </>
            )}
          </nav>

          <button
            type="button"
            className={`grid h-10 w-10 place-items-center rounded-lg border transition-colors md:hidden ${dark ? "border-white/18 bg-white/10" : "border-ink/12 bg-white/80"}`}
            aria-label={open ? t("shell.closeMenu") : t("shell.openMenu")}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>

        {open && (
          <nav id="mobile-navigation" className="apple-material mx-4 grid gap-1 p-3 text-ink md:hidden">
            <Link to="/planner" className="min-h-11 rounded-lg px-3 py-3 font-bold" onClick={() => setOpen(false)}>{t("nav.plan")}</Link>
            {user && <Link to="/archive" className="min-h-11 rounded-lg px-3 py-3 font-bold" onClick={() => setOpen(false)}>{t("nav.archive")}</Link>}
            <div className="p-2"><LanguageToggle tone="light" /></div>
            {!user && <Link to="/login" className="min-h-11 rounded-lg px-3 py-3 font-bold">{t("nav.signIn")}</Link>}
          </nav>
        )}
      </header>

      <main id="main-content">{children}</main>

      {!hideFooter && (
        <footer className="border-t border-ink/10 bg-paper px-5 py-10 text-sm text-ink/58">
          <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <span className="flex items-center gap-3 font-display text-lg font-bold text-ink"><BrandLogo small /> Nuogo</span>
            <span className="max-w-xl">{t("landing.finalBody")}</span>
            <span className="rounded-lg border border-ink/10 bg-white px-3 py-2 font-bold text-lake">{t("common.demo")}</span>
          </div>
        </footer>
      )}
    </div>
  );
}
