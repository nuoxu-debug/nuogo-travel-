import { Compass, Eye, EyeOff, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import BrandLogo from "../components/BrandLogo.jsx";
import { safeReturnTo, useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { localizeAuthError } from "../i18n/apiErrors.js";
import AppShell from "../layout/AppShell.jsx";

function authCopy(language) {
  return language === "zh" ? {
    context: "新加坡旅行规划", contextTitle: "从发现景点开始，规划属于你的新加坡行程。", contextBody: "先浏览有来源支持的景点，再按日期、预算与旅行风格生成一份可查看的行程。", guestTitle: "访客模式", guestBody: "无需创建账户即可浏览新加坡公开目的地资料。提交偏好、生成行程和管理行程需要注册或登录。", memberBody: "登录后可跨会话保存和管理你的行程。"
  } : {
    context: "Singapore travel planning", contextTitle: "Discover the city first. Then make the itinerary yours.", contextBody: "Explore supported attractions, then shape one Singapore itinerary around your dates, budget and travel style.", guestTitle: "Guest Mode", guestBody: "Browse public Singapore destination information without creating an account. Preference submission, generation and itinerary management require sign-in.", memberBody: "Sign in to save and manage your itineraries across sessions."
  };
}

export default function LoginPage() {
  const { t, language } = useLanguage();
  const { login, ready } = useAuth();
  const navigate = useNavigate(); const location = useLocation(); const [searchParams] = useSearchParams();
  const sessionExpired = location.state?.reason === "session-expired" || searchParams.get("reason") === "session-expired";
  const loginRequired = location.state?.reason === "login-required" || searchParams.get("reason") === "login-required";
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const continuationQuery = returnTo === "/planner" ? "" : `?returnTo=${encodeURIComponent(returnTo)}`;
  const copy = authCopy(language);
  const [show, setShow] = useState(false); const [values, setValues] = useState({ email: "", password: "" }); const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(() => (sessionExpired ? t("auth.sessionExpiredError") : loginRequired ? t("auth.loginRequiredError") : "")); const [busy, setBusy] = useState(false);

  useEffect(() => { if (sessionExpired) setServerError(t("auth.sessionExpiredError")); }, [sessionExpired, t]);
  useEffect(() => { if (loginRequired && !sessionExpired) setServerError(t("auth.loginRequiredError")); }, [loginRequired, sessionExpired, t]);
  function validate() { const next = {}; if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = t("auth.invalidEmail"); if (values.password.length < 8) next.password = t("auth.passwordRule"); setErrors(next); return Object.keys(next).length === 0; }
  async function submit(event) { event.preventDefault(); if (!validate()) return; setBusy(true); setServerError(""); try { await login(values.email, values.password); navigate(returnTo, { replace: true }); } catch (error) { setServerError(localizeAuthError(error, t)); } finally { setBusy(false); } }

  return <AppShell><section className="auth-entry">
    <aside className="auth-entry-context"><img src="https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1600&q=88" alt={t("auth.signInImageAlt")} /><div className="auth-entry-context-copy"><p>{copy.context}</p><h2>{copy.contextTitle}</h2><span>{copy.contextBody}</span></div></aside>
    <div className="auth-entry-main"><form onSubmit={submit} noValidate className="auth-entry-form">
      <div className="flex items-center gap-3"><BrandLogo /><p className="text-xs font-bold uppercase text-lake">{t("auth.accountLabel")}</p></div><h1>{t("auth.welcome")}</h1><p className="auth-entry-member-copy">{copy.memberBody}</p>
      <div className="auth-guest-panel"><div><p className="auth-guest-title">{copy.guestTitle}</p><p>{copy.guestBody}</p></div><Link to="/discover/singapore" className="auth-guest-button"><span><Compass aria-hidden="true" /> {t("auth.browseAsGuest")}</span></Link></div>
      <div className="auth-divider"><span />{t("auth.accountDivider")}<span /></div>
      <label><span className="text-sm font-bold">{t("auth.email")}</span><input type="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} className="field-control mt-2" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "login-email-error" : undefined} />{errors.email && <span id="login-email-error" className="mt-2 block text-sm font-medium text-vermilion">{errors.email}</span>}</label>
      <label className="mt-5 block"><span className="text-sm font-bold">{t("auth.password")}</span><span className="relative mt-2 block"><input type={show ? "text" : "password"} value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} className="field-control pr-12" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "login-password-error" : undefined} /><button type="button" onClick={() => setShow((value) => !value)} aria-label={show ? t("auth.hidePassword") : t("auth.showPassword")} className="absolute right-0 top-0 grid h-12 w-12 place-items-center text-ink/55">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></span>{errors.password && <span id="login-password-error" className="mt-2 block text-sm font-medium text-vermilion">{errors.password}</span>}</label>
      {serverError && <p role="alert" className="mt-5 border border-red-200 bg-red-50 p-3 text-sm text-red-800">{serverError}</p>}<button disabled={busy || !ready} className="auth-signin-button"><LogIn className="h-4 w-4" /> {busy ? t("common.loading") : t("auth.signIn")}</button>
      <p className="mt-6 text-center text-sm text-ink/60">{t("auth.noAccount")} <Link to={`/register${continuationQuery}`} className="font-bold text-lake">{t("auth.register")}</Link></p><p className="mt-6 text-center text-xs text-ink/45">{t("auth.demoNote")}</p>
    </form></div>
  </section></AppShell>;
}
