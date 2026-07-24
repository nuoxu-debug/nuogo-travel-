import { ArrowRight, Eye, EyeOff, LogIn, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAnime } from "../hooks/useAnime.js";
import AppShell from "../layout/AppShell.jsx";

export default function LoginPage() {
  const { language, t } = useLanguage();
  const { login, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const animate = useAnime();
  const formRef = useRef(null);
  const [show, setShow] = useState(false);
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    animate({
      targets: formRef.current?.querySelectorAll(".auth-reveal"),
      translateY: [20, 0],
      opacity: [0, 1],
      delay: (_target, index) => index * 70,
      duration: 650,
      easing: "easeOutExpo"
    });
  }, [animate]);

  function validate() {
    const next = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = t("auth.invalidEmail");
    if (values.password.length < 8) next.password = t("auth.passwordRule");
    setErrors(next);
    if (Object.keys(next).length) {
      animate({ targets: formRef.current, translateX: [-6, 6, -4, 4, 0], duration: 360, easing: "easeInOutSine" });
    }
    return Object.keys(next).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setServerError("");
    try {
      await login(values.email, values.password);
      navigate("/planner");
    } catch (error) {
      setServerError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function continueAsGuest() {
    setBusy(true);
    setServerError("");
    try {
      await loginAsGuest();
      navigate("/planner");
    } catch (error) {
      setServerError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <section className="grid min-h-[calc(100vh-68px)] bg-paper lg:grid-cols-[1.05fr_.95fr]">
        <div className="relative hidden min-h-[680px] overflow-hidden lg:block">
          <img src="https://images.unsplash.com/photo-1537531383496-f4749b8032cf?auto=format&fit=crop&w=1600&q=88" alt="Chinese mountain destination" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-ink/90 p-8 text-white">
            <p className="text-xs font-extrabold uppercase text-gold">Continue your route</p>
            <p className="mt-3 max-w-xl font-display text-3xl font-bold">Your saved plans, budgets, guides, and maps are waiting.</p>
          </div>
        </div>
        <div className="flex items-center justify-center border-l border-ink/10 px-5 py-16 sm:px-10">
          <form ref={formRef} onSubmit={submit} noValidate className="w-full max-w-md rounded-lg border border-ink/10 bg-white/78 p-6 shadow-panel backdrop-blur-2xl sm:p-8">
            <div className="auth-reveal mb-5 flex items-center gap-3 opacity-0">
              <BrandLogo />
              <p className="text-xs font-bold uppercase text-lake">Nuogo account</p>
            </div>
            <h1 className="auth-reveal mt-4 font-display text-4xl font-bold opacity-0">{t("auth.welcome")}</h1>
            <p className="auth-reveal mt-3 text-ink/60 opacity-0">{t("auth.welcomeBody")}</p>

            <button
              type="button"
              disabled={busy}
              onClick={continueAsGuest}
              className="auth-reveal group mt-8 flex min-h-14 w-full items-center justify-between rounded-lg bg-lake px-5 font-bold text-white opacity-0 shadow-lift transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              <span className="flex items-center gap-3">
                <UserRound className="h-5 w-5" />
                {language === "zh" ? "访客身份继续" : "Continue as guest"}
              </span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
            <p className="auth-reveal mt-3 text-center text-xs text-ink/45 opacity-0">
              {language === "zh" ? "无需邮箱或密码，直接体验完整功能。" : "No email or password. Try the complete planner immediately."}
            </p>

            <div className="auth-reveal my-7 flex items-center gap-4 text-xs font-bold uppercase text-ink/35 opacity-0">
              <span className="h-px flex-1 bg-ink/12" />
              {language === "zh" ? "或使用账户" : "or use your account"}
              <span className="h-px flex-1 bg-ink/12" />
            </div>

            <label className="auth-reveal block opacity-0">
              <span className="text-sm font-bold">{t("auth.email")}</span>
              <input
                type="email"
                value={values.email}
                onChange={(event) => setValues({ ...values, email: event.target.value })}
                className="field-control mt-2"
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <span className="mt-2 block text-sm font-medium text-vermilion">{errors.email}</span>}
            </label>

            <label className="auth-reveal mt-5 block opacity-0">
              <span className="text-sm font-bold">{t("auth.password")}</span>
              <span className="relative mt-2 block">
                <input
                  type={show ? "text" : "password"}
                  value={values.password}
                  onChange={(event) => setValues({ ...values, password: event.target.value })}
                  className="field-control pr-12"
                  aria-invalid={Boolean(errors.password)}
                />
                <button
                  type="button"
                  onClick={() => setShow((value) => !value)}
                  aria-label={show ? t("auth.hidePassword") : t("auth.showPassword")}
                  className="absolute right-0 top-0 grid h-12 w-12 place-items-center text-ink/55"
                >
                  {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </span>
              {errors.password && <span className="mt-2 block text-sm font-medium text-vermilion">{errors.password}</span>}
            </label>

            {serverError && <p role="alert" className="mt-5 border-l-4 border-vermilion bg-red-50 p-3 text-sm text-red-800">{serverError}</p>}
            <button disabled={busy} className="auth-reveal mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink px-5 font-bold text-white opacity-0 shadow-lift transition-transform hover:-translate-y-0.5 disabled:opacity-50">
              <LogIn className="h-4 w-4" /> {busy ? t("common.loading") : t("auth.signIn")}
            </button>
            <p className="auth-reveal mt-6 text-center text-sm text-ink/60 opacity-0">
              {t("auth.noAccount")} <Link to="/register" className="font-bold text-lake">{t("auth.register")}</Link>
            </p>
            <p className="auth-reveal mt-8 text-center text-xs text-ink/45 opacity-0">{t("auth.demoNote")}</p>
          </form>
        </div>
      </section>
    </AppShell>
  );
}
