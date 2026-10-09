import { ArrowUpRight, Gauge, HelpCircle, Info, LogOut, Menu, Settings, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import BrandLogo from "../components/BrandLogo.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import ScrollProgress from "../components/ScrollProgress.jsx";
import UserModeBadge from "../components/UserModeBadge.jsx";
import AboutModal from "../components/AboutModal.jsx";
import HelpModal from "../components/HelpModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function AppShell({ children, dark = false }) {
  const { language, t } = useLanguage();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const foreground = dark ? "text-white" : "text-ink";
  const registered = user && user.accountType !== "GUEST";

  const pillClass = ({ isActive }) =>
    isActive ? "nuogo-shell-pill-active" : "nuogo-shell-pill-inactive";

  return (
    <div className="nuogo-app-shell min-h-screen">
      <ScrollProgress />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-lg focus:bg-lake focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
      >
        {t("shell.skipContent")}
      </a>
      <header className={`nuogo-shell ${dark ? "nuogo-shell--dark" : ""} nuogo-shell--${language} ${registered ? "nuogo-shell--registered" : "nuogo-shell--public"}`}>
        <div className={`nuogo-shell-inner ${foreground}`}>
          <Link to="/" className="nuogo-shell-brand" aria-label={t("shell.home")}>
            <BrandLogo />
            <span>Nuogo</span>
            <span
              className={`hidden border-l pl-3 text-[10px] font-bold uppercase leading-4 sm:block ${
                dark ? "border-white/25 text-white/55" : "border-ink/15 text-ink/45"
              }`}
            >
              <span className="block">{t("shell.country")}</span>
              <span className="block">{t("shell.studio")}</span>
            </span>
          </Link>

          <nav className="nuogo-shell-nav hidden lg:flex" aria-label="Primary navigation">
            <NavLink to="/" end className={pillClass}>
              {t("nav.home")}
            </NavLink>
            <NavLink to="/discover/singapore" className={pillClass}>
              {t("nav.discover")}
            </NavLink>
            <NavLink to="/planner" className={pillClass}>
              {t("nav.plan")}
            </NavLink>
            <button
              type="button"
              onClick={() => setAboutOpen(true)}
              className="nuogo-shell-pill-inactive"
            >
              {t("nav.about")}
            </button>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="nuogo-shell-pill-inactive"
            >
              {t("nav.help")}
            </button>
            {registered && (
              <NavLink to="/archive" className={pillClass}>
                {t("nav.archive")}
              </NavLink>
            )}
            {registered && (
              <NavLink to="/profile" className={pillClass}>
                {t("nav.profile")}
              </NavLink>
            )}
            {user?.role === "admin" && (
              <NavLink to="/admin" className={pillClass}>
                {t("nav.administration")}
              </NavLink>
            )}

            <div className="ml-2 flex items-center gap-2">
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
                  <Link to="/login" className="nuogo-shell-login">
                    {t("nav.signIn")}
                  </Link>
                  <Link
                    to="/register"
                    className={`nuogo-shell-register ${dark ? "nuogo-shell-register--dark" : ""}`}
                  >
                    {t("nav.register")}
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </>
              )}
            </div>
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
          <nav
            id="mobile-navigation"
            className="nuogo-shell-mobile lg:hidden"
            aria-label="Mobile navigation"
          >
            {user && (
              <div className="px-3 py-2">
                <UserModeBadge user={user} language={language} />
              </div>
            )}
            <Link
              to="/"
              className="min-h-11 rounded-full px-4 py-2.5 font-bold hover:bg-[#d8f7ff]/50 hover:text-[#0284c7]"
              onClick={() => setOpen(false)}
            >
              {t("nav.home")}
            </Link>
            <Link
              to="/discover/singapore"
              className="min-h-11 rounded-full px-4 py-2.5 font-bold hover:bg-[#d8f7ff]/50 hover:text-[#0284c7]"
              onClick={() => setOpen(false)}
            >
              {t("nav.discover")}
            </Link>
            <Link
              to="/planner"
              className="min-h-11 rounded-full px-4 py-2.5 font-bold hover:bg-[#d8f7ff]/50 hover:text-[#0284c7]"
              onClick={() => setOpen(false)}
            >
              {t("nav.plan")}
            </Link>
            <button
              type="button"
              className="flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 text-left font-bold hover:bg-[#d8f7ff]/50 hover:text-[#0284c7]"
              onClick={() => {
                setOpen(false);
                setAboutOpen(true);
              }}
            >
              <Info className="h-4 w-4 text-[#0284c7]" />
              {t("nav.about")}
            </button>
            <button
              type="button"
              className="flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 text-left font-bold hover:bg-[#d8f7ff]/50 hover:text-[#0284c7]"
              onClick={() => {
                setOpen(false);
                setHelpOpen(true);
              }}
            >
              <HelpCircle className="h-4 w-4 text-[#0284c7]" />
              {t("nav.help")}
            </button>
            {registered && (
              <Link
                to="/archive"
                className="min-h-11 rounded-full px-4 py-2.5 font-bold hover:bg-[#d8f7ff]/50 hover:text-[#0284c7]"
                onClick={() => setOpen(false)}
              >
                {t("nav.archive")}
              </Link>
            )}
            {registered && (
              <Link
                to="/profile"
                className="flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 font-bold hover:bg-[#d8f7ff]/50 hover:text-[#0284c7]"
                onClick={() => setOpen(false)}
              >
                <Settings className="h-4 w-4" />
                {t("nav.profile")}
              </Link>
            )}
            {user?.role === "admin" && (
              <Link
                to="/admin"
                className="flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 font-bold hover:bg-[#d8f7ff]/50 hover:text-[#0284c7]"
                onClick={() => setOpen(false)}
              >
                <Gauge className="h-4 w-4" />
                {t("nav.administration")}
              </Link>
            )}
            <div className="p-2">
              <LanguageToggle tone="light" />
            </div>
            {user && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
                className="flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 text-left font-bold hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" /> {t("nav.signOut")}
              </button>
            )}
            {!user && (
              <div className="mt-2 flex flex-col gap-2">
                <Link
                  to="/login"
                  className="min-h-11 rounded-full px-4 py-2.5 text-center font-bold text-[#0891b2] hover:bg-[#d8f7ff]/40"
                  onClick={() => setOpen(false)}
                >
                  {t("nav.signIn")}
                </Link>
                <Link
                  to="/register"
                  className="min-h-11 rounded-full border border-[#67e8f9] bg-[#d8f7ff] px-4 py-2.5 text-center font-bold text-[#0891b2]"
                  onClick={() => setOpen(false)}
                >
                  {t("nav.register")}
                </Link>
              </div>
            )}
          </nav>
        )}
      </header>

      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      <main id="main-content">{children}</main>
    </div>
  );
}
