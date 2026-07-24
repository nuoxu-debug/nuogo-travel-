import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import AppShell from "../layout/AppShell.jsx";

export default function RegisterPage() {
  const { t } = useLanguage();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const next = {};
    if (values.name.trim().length < 2) next.name = t("auth.nameRule");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = t("auth.invalidEmail");
    if (values.password.length < 8) next.password = t("auth.passwordRule");
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await register(values.name.trim(), values.email, values.password);
      navigate("/planner");
    } catch (error) {
      setServerError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <section className="grid min-h-[calc(100vh-68px)] bg-paper lg:grid-cols-[.95fr_1.05fr]">
        <div className="flex items-center justify-center px-5 py-16 sm:px-10">
          <form onSubmit={submit} noValidate className="w-full max-w-md rounded-lg border border-ink/10 bg-white/78 p-6 shadow-panel backdrop-blur-2xl sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <BrandLogo />
              <p className="text-xs font-bold uppercase text-lake">Nuogo account</p>
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold">{t("auth.createTitle")}</h1>
            <p className="mt-3 text-ink/60">{t("auth.createBody")}</p>
            {[
              ["name", "text", t("auth.name")],
              ["email", "email", t("auth.email")],
              ["password", "password", t("auth.password")]
            ].map(([key, type, label]) => (
              <label key={key} className="mt-5 block">
                <span className="text-sm font-bold">{label}</span>
                <input
                  type={type}
                  value={values[key]}
                  onChange={(event) => setValues({ ...values, [key]: event.target.value })}
                  className="field-control mt-2"
                  aria-invalid={Boolean(errors[key])}
                />
                {errors[key] && <span className="mt-2 block text-sm font-medium text-vermilion">{errors[key]}</span>}
              </label>
            ))}
            {serverError && <p role="alert" className="mt-5 border-l-4 border-vermilion bg-red-50 p-3 text-sm text-red-800">{serverError}</p>}
            <button disabled={busy} className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-lake px-5 font-bold text-white shadow-lift transition-transform hover:-translate-y-0.5">
              <UserPlus className="h-4 w-4" /> {busy ? t("common.loading") : t("auth.register")}
            </button>
            <p className="mt-6 text-center text-sm text-ink/60">
              {t("auth.hasAccount")} <Link to="/login" className="font-bold text-lake">{t("auth.signIn")}</Link>
            </p>
          </form>
        </div>
        <div className="relative hidden min-h-[680px] overflow-hidden lg:block">
          <img src="https://images.unsplash.com/photo-1529921879218-f99546d03a9d?auto=format&fit=crop&w=1600&q=88" alt="Mountain landscape in China" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-ink/90 p-8 text-white">
            <p className="text-xs font-extrabold uppercase text-gold">Build your first route</p>
            <p className="mt-3 max-w-xl font-display text-3xl font-bold">Three itinerary options. One trip that feels like yours.</p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
