import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Coins, Gauge, MapPin, Minus, Plus, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { deriveTripDurationDays } from "@nuogo/shared/schemas";
import { useLanguage } from "../context/LanguageContext.jsx";
import { displayLabel } from "../i18n/display.js";

const interests = ["CULTURE", "HISTORY", "FOOD", "NATURE", "SHOPPING", "ENTERTAINMENT", "FAMILY"];
const travelStyles = ["BUDGET_SAVING", "BALANCED", "COMFORT_FOCUSED"];
const transportModes = ["PUBLIC_TRANSIT", "WALK", "TAXI"];
const departureSuggestions = ["Changi Airport", "Woodlands Checkpoint", "HarbourFront Ferry Terminal"];
const staySuggestions = ["Hotel in Singapore", "Orchard stay", "Chinatown stay", "Sentosa stay"];
const exchangeCurrencies = ["MYR", "CNY", "USD"];
const fallbackExchangeRates = { MYR: 3.3, CNY: 5.35, USD: 0.77 };

const copy = {
  zh: {
    destination: "\u4f60\u60f3\u53bb\u54ea\u91cc\uff1f", departurePoint: "\u51fa\u53d1\u5730", arrivalPoint: "\u76ee\u7684\u5730", dates: "\u65c5\u884c\u65e5\u671f", start: "\u5f00\u59cb\u65e5\u671f", end: "\u7ed3\u675f\u65e5\u671f", duration: "\u884c\u7a0b\u5929\u6570",
    party: "\u540c\u884c\u4eba\u6570\u4e0e\u603b\u9884\u7b97", travellers: "\u65c5\u884c\u4eba\u6570", budget: "\u603b\u9884\u7b97\uff08\u65b0\u5e01\uff09",
    preferences: "\u5174\u8da3\u4e0e\u666f\u70b9\u504f\u597d", interests: "\u65c5\u884c\u5174\u8da3", attractions: "\u666f\u70b9\u9009\u62e9",
    auto: "\u81ea\u52a8\u63a8\u8350\u5df2\u5f00\u542f", edit: "\u9009\u62e9\u666f\u70b9", style: "\u65c5\u884c\u98ce\u683c",
    transport: "\u4ea4\u901a\u504f\u597d", transportAuto: "Nuogo \u81ea\u52a8\u9009\u62e9\u6700\u4fbf\u5b9c\u4e14\u53ef\u884c\u7684\u4ea4\u901a", transportManual: "\u624b\u52a8\u9009\u62e9\u504f\u597d\u7684\u4ea4\u901a\u65b9\u5f0f", transportNote: "\u751f\u6210\u524d\u4f1a\u6309\u4f60\u7684\u9009\u62e9\u9650\u5236\u6bcf\u6bb5\u8def\u7ebf\u7684\u4ea4\u901a\u65b9\u5f0f\u3002",
    rain: "\u52a0\u5165\u96e8\u5929\u5907\u9009", rainNote: "\u7cfb\u7edf\u4f1a\u63d0\u4f9b\u4e00\u4e2a\u72ec\u7acb\u4e14\u4e0d\u4f1a\u81ea\u52a8\u66ff\u6362\u539f\u6d3b\u52a8\u7684\u5ba4\u5185\u5907\u9009\u3002",
    other: "\u5176\u4ed6\u504f\u597d\uff08\u53ef\u9009\uff09", placeholder: "\u65e0\u969c\u788d\u9700\u6c42\u3001\u996e\u98df\u8981\u6c42\u3001\u8282\u594f\u6216\u5176\u4ed6\u91cd\u8981\u4e8b\u9879\u3002",
    consent: "\u5141\u8bb8 Nuogo \u5c06\u8fd9\u4e9b\u65c5\u884c\u504f\u597d\u53d1\u9001\u7ed9\u5df2\u914d\u7f6e\u7684 AI \u670d\u52a1\u5546\u3002",
    consentNote: "\u8d26\u6237\u51ed\u636e\u4e0e\u79c1\u4eba\u8d44\u6599\u4e0d\u4f1a\u53d1\u9001\u3002", submit: "\u751f\u6210\u4e00\u4efd\u884c\u7a0b",
    destinationPilot: "\u8bd5\u70b9\u76ee\u7684\u5730 / \u73b0\u5df2\u53ef\u7528", destinationNote: "\u5f53\u524d\u53ef\u7528\u4e8e\u9a8c\u8bc1\u89c4\u5212\uff1a\u65b0\u52a0\u5761", destinationFuture: "\u66f4\u591a\u76ee\u7684\u5730\u5c06\u5728\u672a\u6765\u7248\u672c\u4e2d\u52a0\u5165"
  },
  en: {
    destination: "Where do you want to go?", departurePoint: "Departure point", arrivalPoint: "Destination point", dates: "Travel dates", start: "Start date", end: "End date", duration: "Trip duration",
    party: "Travellers and total budget", travellers: "Travellers", budget: "Total budget (SGD)",
    preferences: "Interests and attraction preferences", interests: "Travel interests", attractions: "Attraction selection",
    auto: "Automatic recommendations enabled", edit: "Choose attractions", style: "Travel style",
    transport: "Transportation Preference", transportAuto: "Let Nuogo choose the cheapest suitable transport", transportManual: "Choose preferred transport", transportNote: "Used before generation to constrain each route leg.",
    rain: "Include a rainy-day backup", rainNote: "Adds one separate indoor alternative that never replaces the main activity automatically.",
    other: "Other preferences (optional)", placeholder: "Accessibility, dietary needs, pace, or anything else that matters.",
    consent: "Allow Nuogo to send these travel preferences to the configured AI provider.",
    consentNote: "Account credentials and private profile data are excluded.", submit: "Generate ONE itinerary",
    destinationPilot: "Pilot Destination / Available Now", destinationNote: "Currently available for validated planning: Singapore", destinationFuture: "More destinations coming in future releases"
  }
};

export const initialPreferenceValues = {
  destination: "singapore", departurePoint: "Changi Airport", arrivalPoint: "Hotel in Singapore", startDate: "2026-10-10", endDate: "2026-10-12", travellerCount: 2,
  budgetSgd: 2000, interests: ["CULTURE", "FOOD"], preferredSightsText: "", travelStyle: "BALANCED", dailyAttractionTarget: 2,
  transportPreferenceMode: "AUTO_CHEAPEST", preferredTransportModes: [],
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
  const intensityTitle = language === "zh" ? "\u6bcf\u65e5\u666f\u70b9\u76ee\u6807" : "Daily attraction target";
  const intensityNote = language === "zh" ? "\u7cfb\u7edf\u4f1a\u6309\u8fd9\u4e2a\u6570\u91cf\u5b89\u6392\u6bcf\u5929\u666f\u70b9\uff1b\u5982\u679c\u9884\u7b97\u3001\u4ea4\u901a\u6216\u65f6\u95f4\u4e0d\u5141\u8bb8\uff0c\u4f1a\u63d0\u793a\u4f60\u8c03\u6574\u3002" : "Nuogo plans this many attractions per day; if budget, route, or time makes it unworkable, it will ask you to adjust.";
  const transportLabels = language === "zh"
    ? { PUBLIC_TRANSIT: "\u5730\u94c1 / \u5df4\u58eb", WALK: "\u6b65\u884c", TAXI: "\u51fa\u79df\u8f66 / \u7f51\u7ea6\u8f66" }
    : { PUBLIC_TRANSIT: "MRT / Bus", WALK: "Walking", TAXI: "Taxi / Ride-hail" };
  const [exchange, setExchange] = useState({ status: "loading", rates: fallbackExchangeRates, date: "" });
  const update = (key, value) => onValuesChange((current) => ({ ...current, [key]: value }));
  const stepTravellers = (delta) => onValuesChange((current) => ({ ...current, travellerCount: Math.min(20, Math.max(1, Number(current.travellerCount || 1) + delta)) }));
  const toggle = (item) => onValuesChange((current) => ({ ...current, interests: current.interests.includes(item) ? (current.interests.length === 1 ? current.interests : current.interests.filter((value) => value !== item)) : [...current.interests, item] }));
  const setTransportPreferenceMode = (mode) => onValuesChange((current) => ({ ...current, transportPreferenceMode: mode, preferredTransportModes: mode === "AUTO_CHEAPEST" ? [] : (current.preferredTransportModes ?? []) }));
  const toggleTransportMode = (mode) => onValuesChange((current) => {
    const selected = current.preferredTransportModes ?? [];
    return { ...current, transportPreferenceMode: "MANUAL", preferredTransportModes: selected.includes(mode) ? selected.filter((value) => value !== mode) : [...selected, mode] };
  });
  const convertedBudget = useMemo(() => exchangeCurrencies.map((currency) => ({ currency, value: `${currency} ${Math.round(Number(values.budgetSgd) * exchange.rates[currency]).toLocaleString()}` })), [exchange.rates, values.budgetSgd]);
  const dailyAttractionTarget = Number(values.dailyAttractionTarget ?? 2);
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
      dailyAttractionTarget: Number(values.dailyAttractionTarget ?? 2),
      transportPreferenceMode: values.transportPreferenceMode ?? "AUTO_CHEAPEST",
      preferredTransportModes: values.transportPreferenceMode === "MANUAL" ? (values.preferredTransportModes ?? []) : [],
      rainyDayBackupEnabled: values.rainyDayBackupEnabled, otherPreferences: values.otherPreferences.trim() || undefined,
      language, consentToLlmProcessing: values.consentToLlmProcessing
    });
  }

  return <form className="grid gap-8" onSubmit={submit}>
    <Panel icon={MapPin} title={text.destination}>
      <div className="destination-selector">
        <div className="destination-fixed destination-fixed--available">
          <span className="destination-orchid" />
          <div><strong>{language === "zh" ? "\u65b0\u52a0\u5761" : "Singapore"}</strong><small>{text.destinationPilot}</small><em>{text.destinationNote}</em></div>
        </div>
        <div className="destination-coming" aria-disabled="true">{text.destinationFuture}</div>
      </div>
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
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_140px]"><Field label={text.start}><input required aria-label={text.start} type="date" className="field-control" value={values.startDate} onChange={(event) => update("startDate", event.target.value)} /></Field><Field label={text.end}><input required aria-label={text.end} min={values.startDate} type="date" className="field-control" value={values.endDate} onChange={(event) => update("endDate", event.target.value)} /></Field><div className="duration-readout"><span>{text.duration}</span><strong>{duration} {language === "zh" ? "\u5929" : duration === 1 ? "day" : "days"}</strong></div></div>
    </Panel>
    <Panel icon={Users} title={text.party}>
      <div className="grid gap-4 sm:grid-cols-[220px_1fr]"><Field label={text.travellers}><div className="traveller-stepper"><button type="button" aria-label={language === "zh" ? "\u51cf\u5c11\u65c5\u884c\u4eba\u6570" : "Decrease travellers" } onClick={() => stepTravellers(-1)} disabled={Number(values.travellerCount) <= 1}><Minus aria-hidden="true" /></button><input required aria-label={text.travellers} type="number" min="1" max="20" value={values.travellerCount} onChange={(event) => update("travellerCount", event.target.value)} /><button type="button" aria-label={language === "zh" ? "\u589e\u52a0\u65c5\u884c\u4eba\u6570" : "Increase travellers" } onClick={() => stepTravellers(1)} disabled={Number(values.travellerCount) >= 20}><Plus aria-hidden="true" /></button></div></Field><div className="budget-control"><label><span><Coins />{text.budget}</span><output>S$ {Number(values.budgetSgd).toLocaleString()}</output></label><input aria-label={text.budget} type="range" min="100" max="10000" step="50" value={values.budgetSgd} onChange={(event) => update("budgetSgd", Number(event.target.value))} /><div className="exchange-reference" aria-live="polite"><div><strong>{exchangeTitle}</strong><small>{exchange.status === "live" && exchange.date ? `${exchangeSource} - ${exchange.date}` : exchange.status === "fallback" ? (language === "zh" ? "\u6682\u7528\u4f30\u7b97\u6c47\u7387" : "Using fallback estimates") : (language === "zh" ? "\u6b63\u5728\u8bfb\u53d6\u6c47\u7387" : "Loading rates")}</small></div><div>{convertedBudget.map(({ currency, value }) => <span key={currency}>{value}</span>)}</div></div></div></div>
    </Panel>
    <Panel icon={Sparkles} title={text.preferences}>
      <div className="grid gap-6">
        <div className="attraction-selection-summary"><div><strong>{text.attractions}</strong><p>{values.attractionDraft?.mode === "MANUAL" ? values.attractionDraft.selectedAttractions.map(({ displayName }) => displayName).join(", ") : text.auto}</p></div><Link to="/discover/singapore">{text.edit}<ChevronRight /></Link></div>
        <fieldset><legend className="field-legend">{text.interests}</legend><div className="choice-pills">{interests.map((interest) => <button key={interest} type="button" aria-pressed={values.interests.includes(interest)} onClick={() => toggle(interest)}>{displayLabel(language, "preference", interest)}</button>)}</div></fieldset>
        <fieldset><legend className="field-legend">{text.style}</legend><div className="style-selector">{travelStyles.map((style) => <button key={style} type="button" aria-pressed={values.travelStyle === style} onClick={() => update("travelStyle", style)}><strong>{displayLabel(language, "profile", style)}</strong><small>{displayLabel(language, "profileDescription", style)}</small></button>)}</div></fieldset>
        <fieldset>
          <legend className="field-legend">{text.transport}</legend>
          <div className="transport-preference-grid">
            <label className="rain-toggle"><input type="radio" name="transportPreferenceMode" checked={(values.transportPreferenceMode ?? "AUTO_CHEAPEST") === "AUTO_CHEAPEST"} onChange={() => setTransportPreferenceMode("AUTO_CHEAPEST")} /><span><strong>{text.transportAuto}</strong><small>{text.transportNote}</small></span></label>
            <label className="rain-toggle"><input type="radio" name="transportPreferenceMode" checked={values.transportPreferenceMode === "MANUAL"} onChange={() => setTransportPreferenceMode("MANUAL")} /><span><strong>{text.transportManual}</strong><small>{transportModes.map((mode) => transportLabels[mode]).join(" / ")}</small></span></label>
            <div className="transport-mode-pills">{transportModes.map((mode) => <label key={mode}><input type="checkbox" disabled={values.transportPreferenceMode !== "MANUAL"} checked={(values.preferredTransportModes ?? []).includes(mode)} onChange={() => toggleTransportMode(mode)} /><span>{transportLabels[mode]}</span></label>)}</div>
          </div>
        </fieldset>
        <div className="density-control"><div><span><Gauge />{intensityTitle}</span><strong>{dailyAttractionTarget}</strong></div><input aria-label={intensityTitle} type="range" min="1" max="12" step="1" value={dailyAttractionTarget} onChange={(event) => update("dailyAttractionTarget", Number(event.target.value))} /><small>{intensityNote}</small></div>
        <label className="rain-toggle"><input type="checkbox" checked={values.rainyDayBackupEnabled} onChange={(event) => update("rainyDayBackupEnabled", event.target.checked)} /><span><strong>{text.rain}</strong><small>{text.rainNote}</small></span></label>
      </div>
    </Panel>
    <Field label={text.other}><textarea className="field-control min-h-24" maxLength="500" value={values.otherPreferences} onChange={(event) => update("otherPreferences", event.target.value)} placeholder={text.placeholder} /></Field>
    <label className="consent-row"><input required type="checkbox" checked={values.consentToLlmProcessing} onChange={(event) => update("consentToLlmProcessing", event.target.checked)} /><ShieldCheck /><span><strong>{text.consent}</strong><small>{text.consentNote}</small></span></label>
    <button disabled={busy} className="generate-button">{text.submit}<ChevronRight /></button>
  </form>;
}
