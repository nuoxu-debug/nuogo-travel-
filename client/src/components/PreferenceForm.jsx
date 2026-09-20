import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Coins, MapPin, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { deriveTripDurationDays } from "@nuogo/shared/schemas";
import { useLanguage } from "../context/LanguageContext.jsx";
import { displayLabel } from "../i18n/display.js";

const interests = ["CULTURE", "HISTORY", "FOOD", "NATURE", "SHOPPING", "ENTERTAINMENT", "FAMILY"];
const travelStyles = ["BUDGET_SAVING", "BALANCED", "COMFORT_FOCUSED"];
const departureSuggestions = ["Changi Airport", "Woodlands Checkpoint", "HarbourFront Ferry Terminal"];
const staySuggestions = ["Hotel in Singapore", "Orchard stay", "Chinatown stay", "Sentosa stay"];
const exchangeCurrencies = ["MYR", "CNY", "USD"];
const fallbackExchangeRates = { MYR: 3.3, CNY: 5.35, USD: 0.77 };
const copy = {
  zh: {
    destination: "目的地", dates: "旅行日期", start: "开始日期", end: "结束日期", duration: "行程天数",
    party: "同行人数与总预算", travellers: "旅行人数", budget: "总预算（新币）",
    preferences: "兴趣与景点偏好", interests: "旅行兴趣", attractions: "景点选择",
    auto: "自动推荐已开启", edit: "选择景点", style: "旅行风格", rain: "加入雨天备选",
    rainNote: "系统会提供一个独立且不会自动替换原活动的室内备选。",
    other: "其他偏好（可选）", placeholder: "无障碍需求、饮食要求、节奏或其他重要事项。",
    consent: "允许 Nuogo 将这些旅行偏好发送给已配置的 AI 服务商。",
    consentNote: "账户凭据与私人资料不会发送。", submit: "生成一份行程"
  },
  en: {
    destination: "Destination", departurePoint: "Departure point", arrivalPoint: "Destination point", dates: "Travel dates", start: "Start date", end: "End date", duration: "Trip duration",
    party: "Travellers and total budget", travellers: "Travellers", budget: "Total budget (SGD)",
    preferences: "Interests and attraction preferences", interests: "Travel interests", attractions: "Attraction selection",
    auto: "Automatic recommendations enabled", edit: "Choose attractions", style: "Travel style", rain: "Include a rainy-day backup",
    rainNote: "Adds one separate indoor alternative that never replaces the main activity automatically.",
    other: "Other preferences (optional)", placeholder: "Accessibility, dietary needs, pace, or anything else that matters.",
    consent: "Allow Nuogo to send these travel preferences to the configured AI provider.",
    consentNote: "Account credentials and private profile data are excluded.", submit: "Generate ONE itinerary"
  }
};

export const initialPreferenceValues = {
  destination: "singapore", departurePoint: "Changi Airport", arrivalPoint: "Hotel in Singapore", startDate: "2026-10-10", endDate: "2026-10-12", travellerCount: 2,
  budgetSgd: 2000, interests: ["CULTURE", "FOOD"], preferredSightsText: "", travelStyle: "BALANCED",
  rainyDayBackupEnabled: false, otherPreferences: "", consentToLlmProcessing: true
};

function Field({ label, children }) { return <label className="grid gap-2 text-sm font-bold text-ink">{label}{children}</label>; }
function Panel({ icon: Icon, title, children }) { return <fieldset className="planner-fieldset"><legend><span><Icon /></span>{title}</legend>{children}</fieldset>; }

export default function PreferenceForm({ onSubmit, values, onValuesChange, busy = false }) {
  const { language } = useLanguage();
  const text = copy[language];
  const departurePointLabel = language === "zh" ? "\u51fa\u53d1\u5730" : text.departurePoint;
  const arrivalPointLabel = language === "zh" ? "\u4f4f\u5bbf / \u7ed3\u675f\u5730\u70b9" : "Stay / end point";
  const placeHint = language === "zh" ? "\u4e0d\u7528\u81ea\u5df1\u77e5\u9053\u666f\u70b9\uff1a\u8fd9\u91cc\u53ea\u662f\u884c\u7a0b\u8d77\u70b9\u4e0e\u4f4f\u5bbf\u533a\u57df\uff0c\u666f\u70b9\u53ef\u5728\u540e\u9762\u81ea\u52a8\u63a8\u8350\u6216\u624b\u52a8\u9009\u3002" : "No attraction knowledge needed here: pick the trip start and likely stay area; attractions can still be recommended automatically.";
  const exchangeTitle = language === "zh" ? "\u5b9e\u65f6\u6c47\u7387\u53c2\u8003" : "Live exchange reference";
  const exchangeSource = language === "zh" ? "\u6bcf\u65e5\u6c47\u7387\uff0c\u4ec5\u4f9b\u53c2\u8003" : "Daily market rate, estimate only";
  const [exchange, setExchange] = useState({ status: "loading", rates: fallbackExchangeRates, date: "" });
  const update = (key, value) => onValuesChange((current) => ({ ...current, [key]: value }));
  const toggle = (item) => onValuesChange((current) => ({ ...current, interests: current.interests.includes(item) ? (current.interests.length === 1 ? current.interests : current.interests.filter((value) => value !== item)) : [...current.interests, item] }));
  const convertedBudget = useMemo(() => exchangeCurrencies.map((currency) => ({
    currency,
    value: `${currency} ${Math.round(Number(values.budgetSgd) * exchange.rates[currency]).toLocaleString()}`
  })), [exchange.rates, values.budgetSgd]);
  let duration = 1;
  try { duration = deriveTripDurationDays(values.startDate, values.endDate); } catch { duration = 0; }

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      Promise.all(exchangeCurrencies.map(async (currency) => {
        const response = await fetch(`https://api.frankfurter.dev/v2/rate/sgd/${currency.toLowerCase()}`);
        if (!response.ok) throw new Error("Exchange rate unavailable");
        const data = await response.json();
        return [currency, Number(data.rate), data.date];
      })).then((entries) => {
        if (!active) return;
        setExchange({
          status: "live",
          rates: Object.fromEntries(entries.map(([currency, rate]) => [currency, Number.isFinite(rate) ? rate : fallbackExchangeRates[currency]])),
          date: entries.find(([, , date]) => date)?.[2] ?? ""
        });
      }).catch(() => {
        if (active) setExchange({ status: "fallback", rates: fallbackExchangeRates, date: "" });
      });
    }, 1200);
    return () => { active = false; window.clearTimeout(timer); };
  }, []);

  function submit(event) {
    event.preventDefault();
    onSubmit({
      destination: "singapore", departurePoint: values.departurePoint.trim(), arrivalPoint: values.arrivalPoint.trim(), startDate: values.startDate, endDate: values.endDate,
      travellerCount: Number(values.travellerCount), budgetMinor: Math.round(Number(values.budgetSgd) * 100), currency: "SGD",
      interests: values.interests, preferredSights: values.preferredSightsText.split(",").map((value) => value.trim()).filter(Boolean),
      attractionSelectionMode: values.attractionDraft?.mode ?? "AUTO",
      selectedAttractions: values.attractionDraft?.selectedAttractions ?? [], travelStyle: values.travelStyle,
      rainyDayBackupEnabled: values.rainyDayBackupEnabled, otherPreferences: values.otherPreferences.trim() || undefined,
      language, consentToLlmProcessing: values.consentToLlmProcessing
    });
  }

  return <form className="grid gap-8" onSubmit={submit}>
    <Panel icon={MapPin} title={text.destination}>
      <div className="destination-fixed"><span className="destination-orchid" /><div><strong>{language === "zh" ? "新加坡" : "Singapore"}</strong><small>{language === "zh" ? "唯一支持的 MVP 目的地" : "Supported MVP destination"}</small></div></div>
      <p className="place-hint">{placeHint}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label={departurePointLabel}>
          <input required aria-label={departurePointLabel} type="text" className="field-control" value={values.departurePoint} onChange={(event) => update("departurePoint", event.target.value)} />
          <div className="quick-place-row">{departureSuggestions.map((place) => <button key={place} type="button" onClick={() => update("departurePoint", place)}>{place}</button>)}</div>
        </Field>
        <Field label={arrivalPointLabel}>
          <input required aria-label={arrivalPointLabel} type="text" className="field-control" value={values.arrivalPoint} onChange={(event) => update("arrivalPoint", event.target.value)} />
          <div className="quick-place-row">{staySuggestions.map((place) => <button key={place} type="button" onClick={() => update("arrivalPoint", place)}>{place}</button>)}</div>
        </Field>
      </div>
    </Panel>
    <Panel icon={CalendarDays} title={text.dates}>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_140px]"><Field label={text.start}><input required aria-label={text.start} type="date" className="field-control" value={values.startDate} onChange={(event) => update("startDate", event.target.value)} /></Field><Field label={text.end}><input required aria-label={text.end} min={values.startDate} type="date" className="field-control" value={values.endDate} onChange={(event) => update("endDate", event.target.value)} /></Field><div className="duration-readout"><span>{text.duration}</span><strong>{duration} {language === "zh" ? "天" : duration === 1 ? "day" : "days"}</strong></div></div>
    </Panel>
    <Panel icon={Users} title={text.party}>
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]"><Field label={text.travellers}><input required aria-label={text.travellers} type="number" min="1" max="20" className="field-control" value={values.travellerCount} onChange={(event) => update("travellerCount", event.target.value)} /></Field><div className="budget-control"><label><span><Coins />{text.budget}</span><output>S$ {Number(values.budgetSgd).toLocaleString()}</output></label><input aria-label={text.budget} type="range" min="100" max="10000" step="50" value={values.budgetSgd} onChange={(event) => update("budgetSgd", Number(event.target.value))} /><div className="exchange-reference" aria-live="polite"><div><strong>{exchangeTitle}</strong><small>{exchange.status === "live" && exchange.date ? `${exchangeSource} · ${exchange.date}` : exchange.status === "fallback" ? (language === "zh" ? "\u6682\u7528\u4f30\u7b97\u6c47\u7387" : "Using fallback estimates") : (language === "zh" ? "\u6b63\u5728\u8bfb\u53d6\u6c47\u7387" : "Loading rates")}</small></div><div>{convertedBudget.map(({ currency, value }) => <span key={currency}>{value}</span>)}</div></div></div></div>
    </Panel>
    <Panel icon={Sparkles} title={text.preferences}>
      <div className="grid gap-6"><div className="attraction-selection-summary"><div><strong>{text.attractions}</strong><p>{values.attractionDraft?.mode === "MANUAL" ? values.attractionDraft.selectedAttractions.map(({ displayName }) => displayName).join("、") : text.auto}</p></div><Link to="/discover/singapore">{text.edit}<ChevronRight /></Link></div><fieldset><legend className="field-legend">{text.interests}</legend><div className="choice-pills">{interests.map((interest) => <button key={interest} type="button" aria-pressed={values.interests.includes(interest)} onClick={() => toggle(interest)}>{displayLabel(language, "preference", interest)}</button>)}</div></fieldset><fieldset><legend className="field-legend">{text.style}</legend><div className="style-selector">{travelStyles.map((style) => <button key={style} type="button" aria-pressed={values.travelStyle === style} onClick={() => update("travelStyle", style)}><strong>{displayLabel(language, "profile", style)}</strong><small>{displayLabel(language, "profileDescription", style)}</small></button>)}</div></fieldset><label className="rain-toggle"><input type="checkbox" checked={values.rainyDayBackupEnabled} onChange={(event) => update("rainyDayBackupEnabled", event.target.checked)} /><span><strong>{text.rain}</strong><small>{text.rainNote}</small></span></label></div>
    </Panel>
    <Field label={text.other}><textarea className="field-control min-h-24" maxLength="500" value={values.otherPreferences} onChange={(event) => update("otherPreferences", event.target.value)} placeholder={text.placeholder} /></Field>
    <label className="consent-row"><input required type="checkbox" checked={values.consentToLlmProcessing} onChange={(event) => update("consentToLlmProcessing", event.target.checked)} /><ShieldCheck /><span><strong>{text.consent}</strong><small>{text.consentNote}</small></span></label>
    <button disabled={busy} className="generate-button">{text.submit}<ChevronRight /></button>
  </form>;
}
