import { CalendarDays, ChevronRight, Coins, Users } from "lucide-react";
import { useMemo } from "react";
import {
  accommodationTypes,
  chinaCities,
  groupTypes,
  poiCategories
} from "@nuogo/shared/constants";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAnime } from "../hooks/useAnime.js";

const labels = {
  en: {
    destination: "Destination",
    departure: "Departure city",
    dates: "Trip start",
    days: "Trip length",
    daysUnit: "days",
    budget: "Total budget",
    daily: "day",
    interests: "What draws you there?",
    group: "Who is travelling?",
    stay: "Where would you like to stay?",
    submit: "Generate 3 plans",
    conflict: "This stay choice may be tight for the current daily budget."
  },
  zh: {
    destination: "目的地",
    departure: "出发城市",
    dates: "出发日期",
    days: "旅行天数",
    daysUnit: "天",
    budget: "总预算",
    daily: "每天",
    interests: "你最感兴趣的体验",
    group: "同行人类型",
    stay: "住宿偏好",
    submit: "生成3套方案",
    conflict: "当前每日预算可能难以匹配该住宿偏好。"
  }
};

const categoryLabels = {
  natural_scenery: ["Natural scenery", "自然风光"],
  historical_relics: ["Historical relics", "历史古迹"],
  city_landmarks: ["City landmarks", "城市地标"],
  local_street_food: ["Street food", "街头小吃"],
  regional_cuisines: ["Regional cuisine", "地方菜系"],
  boutique_homestays: ["Boutique stays", "精品民宿"],
  budget_hotels: ["Budget discoveries", "高性价比"],
  family_resorts: ["Family experiences", "亲子体验"]
};

const groupLabels = {
  couple: ["Couple", "情侣"],
  family_with_kids: ["Family", "亲子家庭"],
  elderly_group: ["Elderly group", "长者同行"],
  solo: ["Solo", "独自旅行"],
  student_group: ["Student group", "学生团队"]
};

const accommodationLabels = {
  boutique_homestay: ["Boutique homestay", "精品民宿"],
  budget_hotel: ["Budget hotel", "经济酒店"],
  family_resort: ["Family resort", "亲子度假村"]
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export const initialPreferenceValues = {
  destination: "huangshan",
  departureCity: "shanghai",
  days: 4,
  totalBudget: 4800,
  interests: ["local_street_food", "historical_relics", "city_landmarks"],
  groupType: "student_group",
  accommodation: "budget_hotel",
  startDate: "2026-08-10"
};

export default function PreferenceForm({
  onSubmit,
  values,
  onValuesChange,
  busy = false
}) {
  const { language } = useLanguage();
  const copy = labels[language];
  const animate = useAnime();
  const dailyBudget = useMemo(
    () => (Number(values.totalBudget) || 0) / Math.max(1, Number(values.days) || 1),
    [values.days, values.totalBudget]
  );
  const conflict = dailyBudget < 450 && ["boutique_homestay", "family_resort"].includes(values.accommodation);

  function update(key, value) {
    onValuesChange((current) => ({ ...current, [key]: value }));
  }

  function toggleInterest(category, element) {
    onValuesChange((current) => {
      const selected = current.interests.includes(category);
      if (selected && current.interests.length === 1) return current;
      return {
        ...current,
        interests: selected
          ? current.interests.filter((item) => item !== category)
          : [...current.interests, category].slice(0, 6)
      };
    });
    animate({
      targets: element,
      scale: [0.94, 1],
      duration: 320,
      easing: "easeOutBack"
    });
  }

  function submit(event) {
    event.preventDefault();
    onSubmit({
      ...values,
      days: Number(values.days),
      totalBudget: Number(values.totalBudget),
      language
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-9">
      <div className="grid gap-5 sm:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-bold">{copy.destination}</span>
          <select
            value={values.destination}
            onChange={(event) => update("destination", event.target.value)}
            className="field-control font-semibold"
          >
            {chinaCities.map((city) => (
              <option key={city.id} value={city.id}>{city.name[language]}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold">{copy.departure}</span>
          <select
            value={values.departureCity}
            onChange={(event) => update("departureCity", event.target.value)}
            className="field-control font-semibold"
          >
            {chinaCities.map((city) => (
              <option key={city.id} value={city.id}>{city.name[language]}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label>
          <span className="mb-2 flex items-center gap-2 text-sm font-bold"><CalendarDays className="h-4 w-4 text-lake" /> {copy.dates}</span>
          <input
            type="date"
            value={values.startDate}
            onChange={(event) => update("startDate", event.target.value)}
            className="field-control"
          />
        </label>
        <label>
          <span className="mb-2 flex items-center justify-between text-sm font-bold">
            <span>{copy.days}</span>
            <output className="text-lake">{values.days} {copy.daysUnit}</output>
          </span>
          <input
            type="range"
            min="1"
            max="10"
            value={values.days}
            onChange={(event) => update("days", Number(event.target.value))}
            className="h-12 w-full accent-lake"
          />
        </label>
      </div>

      <div className="wayfinding-rule border-y border-ink/10 bg-mist/60 py-7 pl-6 pr-4 sm:pr-6">
        <div className="grid items-end gap-4 sm:grid-cols-[1fr_180px]">
          <div>
            <span className="mb-2 flex items-center gap-2 text-sm font-bold"><Coins className="h-4 w-4 text-gold" /> {copy.budget}</span>
            <input
              aria-label="Budget slider"
              type="range"
              min="500"
              max="50000"
              step="100"
              value={values.totalBudget}
              onChange={(event) => update("totalBudget", Number(event.target.value))}
              className="h-10 w-full accent-lake"
            />
          </div>
          <label>
            <span className="sr-only">{copy.budget}</span>
            <span className="flex min-h-12 items-center rounded-lg border border-ink/15 bg-white px-3">
              <b className="mr-1">¥</b>
              <input
                aria-label={copy.budget}
                type="number"
                min="500"
                max="50000"
                value={values.totalBudget}
                onChange={(event) => update("totalBudget", event.target.value)}
                className="w-full border-0 bg-transparent p-0 font-display text-xl font-bold outline-none"
              />
            </span>
          </label>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-ink/45">¥500</span>
          <output className="font-display text-lg font-bold text-lake">¥{formatCurrency(dailyBudget)} / {copy.daily}</output>
          <span className="text-xs text-ink/45">¥50,000</span>
        </div>
        {conflict && <p className="mt-3 border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">{copy.conflict}</p>}
      </div>

      <fieldset>
        <legend className="mb-3 text-sm font-bold">{copy.interests}</legend>
        <div className="flex flex-wrap gap-2">
          {poiCategories.map((category) => {
            const active = values.interests.includes(category);
            return (
              <button
                key={category}
                type="button"
                aria-pressed={active}
                onClick={(event) => toggleInterest(category, event.currentTarget)}
                className={`interactive-lift min-h-11 rounded-lg border px-4 text-sm font-semibold ${active ? "border-lake bg-lake text-white" : "border-ink/15 bg-white text-ink/65"}`}
              >
                {categoryLabels[category][language === "zh" ? 1 : 0]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 flex items-center gap-2 text-sm font-bold"><Users className="h-4 w-4 text-lake" /> {copy.group}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {groupTypes.map((group) => (
            <label key={group} className={`interactive-lift cursor-pointer rounded-lg border p-3 text-center text-xs font-bold ${values.groupType === group ? "border-lake bg-lake text-white" : "border-ink/15 bg-white"}`}>
              <input
                className="sr-only"
                type="radio"
                name="groupType"
                value={group}
                checked={values.groupType === group}
                onChange={() => update("groupType", group)}
              />
              {groupLabels[group][language === "zh" ? 1 : 0]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-bold">{copy.stay}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {accommodationTypes.map((type) => (
            <label key={type} className={`interactive-lift cursor-pointer rounded-lg border p-4 ${values.accommodation === type ? "border-lake bg-blue-50" : "border-ink/15 bg-white"}`}>
              <input
                type="radio"
                name="accommodation"
                className="mr-2 accent-lake"
                checked={values.accommodation === type}
                onChange={() => update("accommodation", type)}
              />
              <span className="text-sm font-bold">{accommodationLabels[type][language === "zh" ? 1 : 0]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        disabled={busy}
        className="group flex min-h-14 items-center justify-between rounded-lg bg-lake px-6 font-display text-lg font-bold text-white shadow-lift transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {copy.submit}
        <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </button>
    </form>
  );
}
