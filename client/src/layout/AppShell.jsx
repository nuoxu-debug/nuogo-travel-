import { ArrowUpRight, Gauge, LogOut, Menu, Settings, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import BrandLogo from "../components/BrandLogo.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import ScrollProgress from "../components/ScrollProgress.jsx";
import UserModeBadge from "../components/UserModeBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function AppShell({ children, dark = false }) {
  const { language, t } = useLanguage();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const foreground = dark ? "text-white" : "text-ink";
  const registered = user && user.accountType !== "GUEST";
  const navClass = ({ isActive }) =>
    `text-sm font-bold transition-colors hover:text-lake ${isActive ? (dark ? "text-white" : "text-lake") : (dark ? "text-white/82" : "text-ink/70")}`;

  return (
    <div className="nuogo-app-shell min-h-screen">
      <ScrollProgress />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-lg focus:bg-lake focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-white">
        {t("shell.skipContent")}
      </a>
      <header className={`nuogo-shell ${dark ? "nuogo-shell--dark" : ""}`}>
        <div className={`nuogo-shell-inner ${foreground}`}>
          <Link to="/" className="nuogo-shell-brand" aria-label={t("shell.home")}>
            <BrandLogo />
            <span>Nuogo</span>
            <span className={`hidden border-l pl-3 text-[10px] font-bold uppercase leading-4 sm:block ${dark ? "border-white/25 text-white/55" : "border-ink/15 text-ink/45"}`}>
              <span className="block">{t("shell.country")}</span>
              <span className="block">{t("shell.studio")}</span>
            </span>
          </Link>

          <nav className="nuogo-shell-nav hidden lg:flex" aria-label="Primary navigation">
            <NavLink to="/planner" className={navClass}>{t("nav.plan")}</NavLink>
            {registered && <NavLink to="/archive" className={navClass}>{t("nav.archive")}</NavLink>}
            {registered && <NavLink to="/profile" className={navClass}>{t("nav.profile")}</NavLink>}
            {user?.role === "admin" && <NavLink to="/admin" className={navClass}>{t("nav.administration")}</NavLink>}
            <LanguageToggle tone={dark ? "dark" : "light"} />
            {user ? (
              <div className="flex items-center gap-2">
                <UserModeBadge user={user} language={language} tone={dark ? "dark" : "light"} />
                <button type="button" onClick={logout} className="nuogo-shell-signout">
                  <LogOut className="h-4 w-4" /> {t("nav.signOut")}
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="nuogo-shell-login">{t("nav.signIn")}</Link>
                <Link to="/register" className={`nuogo-shell-register ${dark ? "nuogo-shell-register--dark" : ""}`}>
                  {t("nav.register")} <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </>
            )}
          </nav>

          <button
            type="button"
            className={`nuogo-shell-menu lg:hidden ${dark ? "nuogo-shell-menu--dark" : ""}`}
            aria-label={open ? t("shell.closeMenu") : t("shell.openMenu")}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>

        {open && (
          <nav id="mobile-navigation" className="nuogo-shell-mobile lg:hidden" aria-label="Mobile navigation">
            {user && <div className="px-3 py-2"><UserModeBadge user={user} language={language} /></div>}
            <Link to="/planner" className="min-h-11 rounded-lg px-3 py-3 font-bold" onClick={() => setOpen(false)}>{t("nav.plan")}</Link>
            {registered && <Link to="/archive" className="min-h-11 rounded-lg px-3 py-3 font-bold" onClick={() => setOpen(false)}>{t("nav.archive")}</Link>}
            {registered && <Link to="/profile" className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-3 font-bold" onClick={() => setOpen(false)}><Settings className="h-4 w-4" />{t("nav.profile")}</Link>}
            {user?.role === "admin" && <Link to="/admin" className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-3 font-bold" onClick={() => setOpen(false)}><Gauge className="h-4 w-4" />{t("nav.administration")}</Link>}
            <div className="p-2"><LanguageToggle tone="light" /></div>
            {user && (
              <button type="button" onClick={() => { logout(); setOpen(false); }} className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-3 text-left font-bold">
                <LogOut className="h-4 w-4" /> {t("nav.signOut")}
              </button>
            )}
            {!user && (
              <>
                <Link to="/login" className="min-h-11 rounded-lg px-3 py-3 font-bold" onClick={() => setOpen(false)}>{t("nav.signIn")}</Link>
                <Link to="/register" className="min-h-11 rounded-lg bg-ink px-3 py-3 font-bold text-white" onClick={() => setOpen(false)}>{t("nav.register")}</Link>
              </>
            )}
          </nav>
        )}
      </header>

      <main id="main-content">{children}</main>
    </div>
  );
}
