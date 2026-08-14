import { CalendarDays, ChevronRight, Coins, Route, ShieldCheck, Sparkles, Users } from "lucide-react";
import { supportedDestinations } from "@nuogo/shared/constants";

const interests = ["CULTURE", "HISTORY", "FOOD", "NATURE", "SHOPPING", "ENTERTAINMENT", "FAMILY"];
const transportModes = ["TRAIN", "FLIGHT", "DRIVING", "USER_PROVIDED"];

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
      language: "en",
      consentToLlmProcessing: values.consentToLlmProcessing
    };
    onSubmit(payload);
  }

  return (
    <form onSubmit={submit} className="grid gap-8">
      <Section icon={Route} title="Route and timing" note="Your arrival and departure are hard schedule boundaries.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Origin"><input required aria-label="Origin" className="field-control" value={values.origin} onChange={(e) => update("origin", e.target.value)} /></Field>
          <Field label="Destination">
            <select aria-label="Destination" className="field-control" value={values.destination} onChange={(e) => update("destination", e.target.value)}>
              {supportedDestinations.map((city) => <option key={city.id} value={city.id}>{city.name.en}</option>)}
            </select>
          </Field>
          <Field label="Start date"><input required type="date" className="field-control" value={values.startDate} onChange={(e) => update("startDate", e.target.value)} /></Field>
          <Field label="End date"><input required type="date" className="field-control" min={values.startDate} value={values.endDate} onChange={(e) => update("endDate", e.target.value)} /></Field>
          <Field label="Arrival date and time"><input required aria-label="Arrival date and time" type="datetime-local" className="field-control" value={values.arrivalDateTime} onChange={(e) => update("arrivalDateTime", e.target.value)} /></Field>
          <Field label="Departure date and time"><input required aria-label="Departure date and time" type="datetime-local" className="field-control" value={values.departureDateTime} onChange={(e) => update("departureDateTime", e.target.value)} /></Field>
        </div>
      </Section>

      <Section icon={Users} title="Party and hard budget" note="Every profile must stay within this same trip total.">
        <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
          <Field label="Travellers"><input required aria-label="Travellers" type="number" min="1" max="20" className="field-control" value={values.travellerCount} onChange={(e) => update("travellerCount", e.target.value)} /></Field>
          <div className="rounded-lg bg-mist/70 p-4">
            <label className="flex items-center justify-between text-sm font-bold"><span className="flex items-center gap-2"><Coins className="h-4 w-4 text-gold" /> Total budget</span><output>CNY {Number(values.totalBudgetCny).toLocaleString()}</output></label>
            <input aria-label="Total budget" type="range" min="100" max="100000" step="100" className="mt-3 w-full accent-lake" value={values.totalBudgetCny} onChange={(e) => update("totalBudgetCny", Number(e.target.value))} />
          </div>
        </div>
      </Section>

      <Section icon={Sparkles} title="Travel character" note="Interests guide selection; preferences shape cost and pace.">
        <div className="grid gap-6">
          <fieldset><legend className="mb-3 text-sm font-bold">Interests</legend><div className="flex flex-wrap gap-2">{interests.map((interest) => <button key={interest} type="button" aria-pressed={values.interests.includes(interest)} onClick={() => toggle("interests", interest)} className={`min-h-10 rounded-lg border px-3 text-xs font-bold ${values.interests.includes(interest) ? "border-lake bg-lake text-white" : "border-ink/15 bg-white"}`}>{interest.replace("_", " ")}</button>)}</div></fieldset>
          <Field label="Preferred sights (optional, comma separated)"><input className="field-control" value={values.preferredSightsText} onChange={(e) => update("preferredSightsText", e.target.value)} placeholder="Palace Museum, old neighbourhoods" /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Accommodation"><select className="field-control" value={values.accommodationPreference} onChange={(e) => update("accommodationPreference", e.target.value)}><option value="BUDGET">Budget</option><option value="MID_RANGE">Mid-range</option><option value="COMFORT">Comfort</option></select></Field>
            <Field label="Food"><select className="field-control" value={values.foodPreference} onChange={(e) => update("foodPreference", e.target.value)}><option value="ECONOMY">Economy</option><option value="LOCAL">Local</option><option value="BALANCED">Balanced</option><option value="COMFORT">Comfort</option></select></Field>
            <Field label="Local transport"><select className="field-control" value={values.localTransportPreference} onChange={(e) => update("localTransportPreference", e.target.value)}><option value="WALK">Walk</option><option value="PUBLIC_TRANSIT">Public transit</option><option value="TAXI">Taxi</option><option value="DRIVE">Drive</option><option value="MIXED">Mixed</option></select></Field>
          </div>
          <fieldset><legend className="mb-3 text-sm font-bold">Activity preferences</legend><div className="flex flex-wrap gap-2">{interests.map((interest) => <button key={interest} type="button" aria-pressed={values.activityPreferences.includes(interest)} onClick={() => toggle("activityPreferences", interest)} className={`min-h-10 rounded-lg border px-3 text-xs font-bold ${values.activityPreferences.includes(interest) ? "border-vermilion bg-vermilion text-white" : "border-ink/15 bg-white"}`}>{interest.replace("_", " ")}</button>)}</div></fieldset>
        </div>
      </Section>

      <Section icon={CalendarDays} title="Intercity transport" note="Enter known group totals; driving can be estimated from fuel use.">
        <div className="grid gap-4 sm:grid-cols-2">
          {[["outbound", "Outbound"], ["return", "Return"]].map(([direction, label]) => <div key={direction} className="grid gap-3 rounded-lg border border-ink/10 p-4">
            <Field label={`${label} transport`}><select aria-label={`${label} transport`} className="field-control" value={values[`${direction}TransportMode`]} onChange={(e) => update(`${direction}TransportMode`, e.target.value)}>{transportModes.map((mode) => <option key={mode} value={mode}>{mode.replace("_", " ")}</option>)}</select></Field>
            <Field label={`${label} transport cost (CNY)`}><input aria-label={`${label} transport cost (CNY)`} type="number" min="0" className="field-control" value={values[`${direction}TransportCostCny`]} onChange={(e) => update(`${direction}TransportCostCny`, e.target.value)} placeholder="Leave blank to estimate driving" /></Field>
          </div>)}
          {needsFuel && <Field label="Fuel consumption (L/100 km)"><input required aria-label="Fuel consumption (L/100 km)" type="number" min="1" max="40" step="0.1" className="field-control" value={values.fuelConsumptionLitresPer100Km} onChange={(e) => update("fuelConsumptionLitresPer100Km", e.target.value)} /></Field>}
        </div>
      </Section>

      <Field label="Other preferences (optional)"><textarea className="field-control min-h-24" maxLength="500" value={values.otherPreferences} onChange={(e) => update("otherPreferences", e.target.value)} placeholder="Accessibility, pace, dietary needs, or anything else that matters." /></Field>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-lake/20 bg-lake/5 p-4 text-sm leading-6"><input required type="checkbox" className="mt-1 accent-lake" checked={values.consentToLlmProcessing} onChange={(e) => update("consentToLlmProcessing", e.target.checked)} /><span><strong className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-lake" /> Allow Nuogo to send these travel preferences to the configured AI provider.</strong><small className="block text-ink/55">Account credentials and private profile data are excluded.</small></span></label>
      <button disabled={busy} className="group flex min-h-14 items-center justify-between rounded-lg bg-lake px-6 font-display text-lg font-bold text-white shadow-lift transition-transform hover:-translate-y-0.5 disabled:opacity-60">Generate 3 validated plans<ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></button>
    </form>
  );
}
