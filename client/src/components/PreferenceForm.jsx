import { CalendarDays, ChevronRight, Coins, MapPin, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { deriveTripDurationDays } from "@nuogo/shared/schemas";
import { useLanguage } from "../context/LanguageContext.jsx";
import { displayLabel } from "../i18n/display.js";

const interests = ["CULTURE", "HISTORY", "FOOD", "NATURE", "SHOPPING", "ENTERTAINMENT", "FAMILY"];
const travelStyles = ["BUDGET_SAVING", "BALANCED", "COMFORT_FOCUSED"];
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
    destination: "Destination", dates: "Travel dates", start: "Start date", end: "End date", duration: "Trip duration",
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
  destination: "singapore", startDate: "2026-10-10", endDate: "2026-10-12", travellerCount: 2,
  budgetSgd: 2000, interests: ["CULTURE", "FOOD"], preferredSightsText: "", travelStyle: "BALANCED",
  rainyDayBackupEnabled: false, otherPreferences: "", consentToLlmProcessing: true
};

function Field({ label, children }) { return <label className="grid gap-2 text-sm font-bold text-ink">{label}{children}</label>; }
function Panel({ icon: Icon, title, children }) { return <fieldset className="planner-fieldset"><legend><span><Icon /></span>{title}</legend>{children}</fieldset>; }

export default function PreferenceForm({ onSubmit, values, onValuesChange, busy = false }) {
  const { language } = useLanguage();
  const text = copy[language];
  const update = (key, value) => onValuesChange((current) => ({ ...current, [key]: value }));
  const toggle = (item) => onValuesChange((current) => ({ ...current, interests: current.interests.includes(item) ? (current.interests.length === 1 ? current.interests : current.interests.filter((value) => value !== item)) : [...current.interests, item] }));
  let duration = 1;
  try { duration = deriveTripDurationDays(values.startDate, values.endDate); } catch { duration = 0; }

  function submit(event) {
    event.preventDefault();
    onSubmit({
      destination: "singapore", startDate: values.startDate, endDate: values.endDate,
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
    </Panel>
    <Panel icon={CalendarDays} title={text.dates}>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_140px]"><Field label={text.start}><input required aria-label={text.start} type="date" className="field-control" value={values.startDate} onChange={(event) => update("startDate", event.target.value)} /></Field><Field label={text.end}><input required aria-label={text.end} min={values.startDate} type="date" className="field-control" value={values.endDate} onChange={(event) => update("endDate", event.target.value)} /></Field><div className="duration-readout"><span>{text.duration}</span><strong>{duration} {language === "zh" ? "天" : duration === 1 ? "day" : "days"}</strong></div></div>
    </Panel>
    <Panel icon={Users} title={text.party}>
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]"><Field label={text.travellers}><input required aria-label={text.travellers} type="number" min="1" max="20" className="field-control" value={values.travellerCount} onChange={(event) => update("travellerCount", event.target.value)} /></Field><div className="budget-control"><label><span><Coins />{text.budget}</span><output>S$ {Number(values.budgetSgd).toLocaleString()}</output></label><input aria-label={text.budget} type="range" min="100" max="10000" step="50" value={values.budgetSgd} onChange={(event) => update("budgetSgd", Number(event.target.value))} /></div></div>
    </Panel>
    <Panel icon={Sparkles} title={text.preferences}>
      <div className="grid gap-6"><div className="attraction-selection-summary"><div><strong>{text.attractions}</strong><p>{values.attractionDraft?.mode === "MANUAL" ? values.attractionDraft.selectedAttractions.map(({ displayName }) => displayName).join("、") : text.auto}</p></div><Link to="/discover/singapore">{text.edit}<ChevronRight /></Link></div><fieldset><legend className="field-legend">{text.interests}</legend><div className="choice-pills">{interests.map((interest) => <button key={interest} type="button" aria-pressed={values.interests.includes(interest)} onClick={() => toggle(interest)}>{displayLabel(language, "preference", interest)}</button>)}</div></fieldset><fieldset><legend className="field-legend">{text.style}</legend><div className="style-selector">{travelStyles.map((style) => <button key={style} type="button" aria-pressed={values.travelStyle === style} onClick={() => update("travelStyle", style)}><strong>{displayLabel(language, "profile", style)}</strong><small>{displayLabel(language, "profileDescription", style)}</small></button>)}</div></fieldset><label className="rain-toggle"><input type="checkbox" checked={values.rainyDayBackupEnabled} onChange={(event) => update("rainyDayBackupEnabled", event.target.checked)} /><span><strong>{text.rain}</strong><small>{text.rainNote}</small></span></label></div>
    </Panel>
    <Field label={text.other}><textarea className="field-control min-h-24" maxLength="500" value={values.otherPreferences} onChange={(event) => update("otherPreferences", event.target.value)} placeholder={text.placeholder} /></Field>
    <label className="consent-row"><input required type="checkbox" checked={values.consentToLlmProcessing} onChange={(event) => update("consentToLlmProcessing", event.target.checked)} /><ShieldCheck /><span><strong>{text.consent}</strong><small>{text.consentNote}</small></span></label>
    <button disabled={busy} className="generate-button">{text.submit}<ChevronRight /></button>
  </form>;
}
