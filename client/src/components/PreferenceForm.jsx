import { CalendarDays, ChevronRight, Coins, Route, ShieldCheck, Sparkles, Users } from "lucide-react";
import { supportedDestinations } from "@nuogo/shared/constants";
import { useLanguage } from "../context/LanguageContext.jsx";

const interests = ["CULTURE", "HISTORY", "FOOD", "NATURE", "SHOPPING", "ENTERTAINMENT", "FAMILY"];
const transportModes = ["TRAIN", "FLIGHT", "DRIVING", "USER_PROVIDED"];

const copy = {
  en: {
    routeTitle: "Route and timing", routeNote: "Your arrival and departure are hard schedule boundaries.", origin: "Origin", destination: "Destination", startDate: "Start date", endDate: "End date", arrival: "Arrival date and time", departure: "Departure date and time",
    partyTitle: "Party and hard budget", partyNote: "Every profile must stay within this same trip total.", travellers: "Travellers", totalBudget: "Total budget",
    characterTitle: "Travel character", characterNote: "Interests guide selection; preferences shape cost and pace.", interests: "Interests", preferredSights: "Preferred sights (optional, comma separated)", preferredSightsPlaceholder: "Palace Museum, old neighbourhoods", accommodation: "Accommodation", food: "Food", localTransport: "Local transport", activityPreferences: "Activity preferences",
    transportTitle: "Intercity transport", transportNote: "Enter known group totals; driving can be estimated from fuel use.", outbound: "Outbound", return: "Return", transport: "transport", transportCost: "transport cost (CNY)", transportCostPlaceholder: "Leave blank to estimate driving", fuel: "Fuel consumption (L/100 km)",
    other: "Other preferences (optional)", otherPlaceholder: "Accessibility, pace, dietary needs, or anything else that matters.", consent: "Allow Nuogo to send these travel preferences to the configured AI provider.", consentNote: "Account credentials and private profile data are excluded.", submit: "Generate 3 validated plans"
  },
  zh: {
    routeTitle: "路线与时间", routeNote: "到达和离开时间是行程安排的硬性边界。", origin: "出发地", destination: "目的地", startDate: "开始日期", endDate: "结束日期", arrival: "到达日期与时间", departure: "离开日期与时间",
    partyTitle: "同行人数与总预算", partyNote: "三套方案都必须遵守同一旅行总预算。", travellers: "旅行人数", totalBudget: "总预算",
    characterTitle: "旅行偏好", characterNote: "兴趣决定地点选择，偏好影响费用与节奏。", interests: "旅行兴趣", preferredSights: "想去的景点（可选，以逗号分隔）", preferredSightsPlaceholder: "故宫博物院、老街区", accommodation: "住宿偏好", food: "餐饮偏好", localTransport: "市内交通", activityPreferences: "活动偏好",
    transportTitle: "城际交通", transportNote: "填写已知的团队总费用；自驾费用可按油耗估算。", outbound: "去程", return: "返程", transport: "交通方式", transportCost: "交通费用（人民币）", transportCostPlaceholder: "留空则估算自驾费用", fuel: "百公里油耗（升）",
    other: "其他偏好（可选）", otherPlaceholder: "无障碍需求、行程节奏、饮食要求或其他重要事项。", consent: "允许 Nuogo 将这些旅行偏好发送给已配置的 AI 服务商。", consentNote: "账户凭据和个人资料不会被发送。", submit: "生成 3 套已验证方案"
  }
};

const optionLabels = {
  zh: {
    CULTURE: "文化", HISTORY: "历史", FOOD: "美食", NATURE: "自然", SHOPPING: "购物", ENTERTAINMENT: "娱乐", FAMILY: "亲子",
    BUDGET: "经济型", MID_RANGE: "中档", COMFORT: "舒适型", ECONOMY: "实惠", LOCAL: "本地特色", BALANCED: "均衡",
    WALK: "步行", PUBLIC_TRANSIT: "公共交通", TAXI: "出租车", DRIVE: "自驾", MIXED: "混合交通",
    TRAIN: "火车", FLIGHT: "飞机", DRIVING: "自驾", USER_PROVIDED: "自行安排"
  }
};

export const initialPreferenceValues = {
  origin: "Shanghai",
  destination: "beijing",
  startDate: "2026-10-10",
  endDate: "2026-10-11",
  travellerCount: 2,
  totalBudgetCny: 5000,
  interests: ["HISTORY", "FOOD"],
  preferredSightsText: "",
  accommodationPreference: "MID_RANGE",
  foodPreference: "LOCAL",
  localTransportPreference: "PUBLIC_TRANSIT",
  activityPreferences: ["HISTORY", "FOOD"],
  arrivalDateTime: "2026-10-10T08:00",
  departureDateTime: "2026-10-11T20:00",
  outboundTransportMode: "TRAIN",
  returnTransportMode: "TRAIN",
  outboundTransportCostCny: 300,
  returnTransportCostCny: 300,
  fuelConsumptionLitresPer100Km: 8,
  otherPreferences: "",
  consentToLlmProcessing: true
};

function Field({ label, children }) {
  return <label className="grid gap-2 text-sm font-bold text-ink">{label}{children}</label>;
}

function Section({ icon: Icon, title, note, children }) {
  return (
    <fieldset className="border-t border-ink/10 pt-7">
      <legend className="flex w-full items-center gap-3 pb-5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-lake/10 text-lake"><Icon className="h-4 w-4" /></span>
        <span><strong className="block text-base">{title}</strong><small className="font-normal text-ink/45">{note}</small></span>
      </legend>
      {children}
    </fieldset>
  );
}

function localDateTime(value) {
  return value ? `${value}:00+08:00` : value;
}

export default function PreferenceForm({ onSubmit, values, onValuesChange, busy = false }) {
  const { language } = useLanguage();
  const text = copy[language];
  const labelFor = (value) => optionLabels[language]?.[value] ?? value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
  const update = (key, value) => onValuesChange((current) => ({ ...current, [key]: value }));
  const toggle = (key, item) => onValuesChange((current) => {
    const selected = current[key].includes(item);
    if (selected && current[key].length === 1) return current;
    return { ...current, [key]: selected ? current[key].filter((value) => value !== item) : [...current[key], item] };
  });
  const needsFuel = ["outbound", "return"].some((direction) =>
    values[`${direction}TransportMode`] === "DRIVING" && values[`${direction}TransportCostCny`] === ""
  );

  function submit(event) {
    event.preventDefault();
    const payload = {
      origin: values.origin.trim(),
      destination: values.destination,
      startDate: values.startDate,
      endDate: values.endDate,
      travellerCount: Number(values.travellerCount),
      totalBudgetCny: Number(values.totalBudgetCny),
      interests: values.interests,
      preferredSights: values.preferredSightsText.split(",").map((value) => value.trim()).filter(Boolean),
      accommodationPreference: values.accommodationPreference,
      foodPreference: values.foodPreference,
      localTransportPreference: values.localTransportPreference,
      activityPreferences: values.activityPreferences,
      arrivalDateTime: localDateTime(values.arrivalDateTime),
      departureDateTime: localDateTime(values.departureDateTime),
      outboundTransportMode: values.outboundTransportMode,
      returnTransportMode: values.returnTransportMode,
      ...(values.outboundTransportCostCny !== "" ? { outboundTransportCostCny: Number(values.outboundTransportCostCny) } : {}),
      ...(values.returnTransportCostCny !== "" ? { returnTransportCostCny: Number(values.returnTransportCostCny) } : {}),
      ...(needsFuel ? { fuelConsumptionLitresPer100Km: Number(values.fuelConsumptionLitresPer100Km) } : {}),
      otherPreferences: values.otherPreferences.trim(),
      language,
      consentToLlmProcessing: values.consentToLlmProcessing
    };
    onSubmit(payload);
  }

  return (
    <form onSubmit={submit} className="grid gap-8">
      <Section icon={Route} title={text.routeTitle} note={text.routeNote}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={text.origin}><input required aria-label={text.origin} className="field-control" value={values.origin} onChange={(e) => update("origin", e.target.value)} /></Field>
          <Field label={text.destination}>
            <select aria-label={text.destination} className="field-control" value={values.destination} onChange={(e) => update("destination", e.target.value)}>
              {supportedDestinations.map((city) => <option key={city.id} value={city.id}>{city.name[language]}</option>)}
            </select>
          </Field>
          <Field label={text.startDate}><input required aria-label={text.startDate} type="date" className="field-control" value={values.startDate} onChange={(e) => update("startDate", e.target.value)} /></Field>
          <Field label={text.endDate}><input required aria-label={text.endDate} type="date" className="field-control" min={values.startDate} value={values.endDate} onChange={(e) => update("endDate", e.target.value)} /></Field>
          <Field label={text.arrival}><input required aria-label={text.arrival} type="datetime-local" className="field-control" value={values.arrivalDateTime} onChange={(e) => update("arrivalDateTime", e.target.value)} /></Field>
          <Field label={text.departure}><input required aria-label={text.departure} type="datetime-local" className="field-control" value={values.departureDateTime} onChange={(e) => update("departureDateTime", e.target.value)} /></Field>
        </div>
      </Section>

      <Section icon={Users} title={text.partyTitle} note={text.partyNote}>
        <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
          <Field label={text.travellers}><input required aria-label={text.travellers} type="number" min="1" max="20" className="field-control" value={values.travellerCount} onChange={(e) => update("travellerCount", e.target.value)} /></Field>
          <div className="rounded-lg bg-mist/70 p-4">
            <label className="flex items-center justify-between text-sm font-bold"><span className="flex items-center gap-2"><Coins className="h-4 w-4 text-gold" /> {text.totalBudget}</span><output>CNY {Number(values.totalBudgetCny).toLocaleString()}</output></label>
            <input aria-label={text.totalBudget} type="range" min="100" max="100000" step="100" className="mt-3 w-full accent-lake" value={values.totalBudgetCny} onChange={(e) => update("totalBudgetCny", Number(e.target.value))} />
          </div>
        </div>
      </Section>

      <Section icon={Sparkles} title={text.characterTitle} note={text.characterNote}>
        <div className="grid gap-6">
          <fieldset><legend className="mb-3 text-sm font-bold">{text.interests}</legend><div className="flex flex-wrap gap-2">{interests.map((interest) => <button key={interest} type="button" aria-pressed={values.interests.includes(interest)} onClick={() => toggle("interests", interest)} className={`min-h-10 rounded-lg border px-3 text-xs font-bold ${values.interests.includes(interest) ? "border-lake bg-lake text-white" : "border-ink/15 bg-white"}`}>{labelFor(interest)}</button>)}</div></fieldset>
          <Field label={text.preferredSights}><input className="field-control" value={values.preferredSightsText} onChange={(e) => update("preferredSightsText", e.target.value)} placeholder={text.preferredSightsPlaceholder} /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={text.accommodation}><select aria-label={text.accommodation} className="field-control" value={values.accommodationPreference} onChange={(e) => update("accommodationPreference", e.target.value)}>{["BUDGET", "MID_RANGE", "COMFORT"].map((value) => <option key={value} value={value}>{labelFor(value)}</option>)}</select></Field>
            <Field label={text.food}><select aria-label={text.food} className="field-control" value={values.foodPreference} onChange={(e) => update("foodPreference", e.target.value)}>{["ECONOMY", "LOCAL", "BALANCED", "COMFORT"].map((value) => <option key={value} value={value}>{labelFor(value)}</option>)}</select></Field>
            <Field label={text.localTransport}><select aria-label={text.localTransport} className="field-control" value={values.localTransportPreference} onChange={(e) => update("localTransportPreference", e.target.value)}>{["WALK", "PUBLIC_TRANSIT", "TAXI", "DRIVE", "MIXED"].map((value) => <option key={value} value={value}>{labelFor(value)}</option>)}</select></Field>
          </div>
          <fieldset><legend className="mb-3 text-sm font-bold">{text.activityPreferences}</legend><div className="flex flex-wrap gap-2">{interests.map((interest) => <button key={interest} type="button" aria-pressed={values.activityPreferences.includes(interest)} onClick={() => toggle("activityPreferences", interest)} className={`min-h-10 rounded-lg border px-3 text-xs font-bold ${values.activityPreferences.includes(interest) ? "border-vermilion bg-vermilion text-white" : "border-ink/15 bg-white"}`}>{labelFor(interest)}</button>)}</div></fieldset>
        </div>
      </Section>

      <Section icon={CalendarDays} title={text.transportTitle} note={text.transportNote}>
        <div className="grid gap-4 sm:grid-cols-2">
          {[["outbound", text.outbound], ["return", text.return]].map(([direction, label]) => <div key={direction} className="grid gap-3 rounded-lg border border-ink/10 p-4">
            <Field label={`${label}${language === "zh" ? "" : " "}${text.transport}`}><select aria-label={`${label}${language === "zh" ? "" : " "}${text.transport}`} className="field-control" value={values[`${direction}TransportMode`]} onChange={(e) => update(`${direction}TransportMode`, e.target.value)}>{transportModes.map((mode) => <option key={mode} value={mode}>{labelFor(mode)}</option>)}</select></Field>
            <Field label={`${label}${language === "zh" ? "" : " "}${text.transportCost}`}><input aria-label={`${label}${language === "zh" ? "" : " "}${text.transportCost}`} type="number" min="0" className="field-control" value={values[`${direction}TransportCostCny`]} onChange={(e) => update(`${direction}TransportCostCny`, e.target.value)} placeholder={text.transportCostPlaceholder} /></Field>
          </div>)}
          {needsFuel && <Field label={text.fuel}><input required aria-label={text.fuel} type="number" min="1" max="40" step="0.1" className="field-control" value={values.fuelConsumptionLitresPer100Km} onChange={(e) => update("fuelConsumptionLitresPer100Km", e.target.value)} /></Field>}
        </div>
      </Section>

      <Field label={text.other}><textarea className="field-control min-h-24" maxLength="500" value={values.otherPreferences} onChange={(e) => update("otherPreferences", e.target.value)} placeholder={text.otherPlaceholder} /></Field>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-lake/20 bg-lake/5 p-4 text-sm leading-6"><input required type="checkbox" className="mt-1 accent-lake" checked={values.consentToLlmProcessing} onChange={(e) => update("consentToLlmProcessing", e.target.checked)} /><span><strong className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-lake" /> {text.consent}</strong><small className="block text-ink/55">{text.consentNote}</small></span></label>
      <button disabled={busy} className="group flex min-h-14 items-center justify-between rounded-lg bg-lake px-6 font-display text-lg font-bold text-white shadow-lift transition-transform hover:-translate-y-0.5 disabled:opacity-60">{text.submit}<ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></button>
    </form>
  );
}
