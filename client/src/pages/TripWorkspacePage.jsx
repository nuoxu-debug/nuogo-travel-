import { Plus, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import ActivityDetailsDialog from "../components/ActivityDetailsDialog.jsx";
import ActivityModal from "../components/ActivityModal.jsx";
import BudgetPanel, { deriveBudget } from "../components/BudgetPanel.jsx";
import DayTabs from "../components/DayTabs.jsx";
import GuidePanel from "../components/GuidePanel.jsx";
import RouteMap from "../components/RouteMap.jsx";
import ShareDialog from "../components/ShareDialog.jsx";
import Timeline from "../components/Timeline.jsx";
import { TripProvider, useTrip } from "../context/TripContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import AppShell from "../layout/AppShell.jsx";

function updateActivity(trip, variantId, dayId, activity) {
  return {
    ...trip,
    variants: trip.variants.map((variant) => variant.id !== variantId ? variant : {
      ...variant,
      days: variant.days.map((day) => day.id !== dayId ? day : {
        ...day,
        activities: day.activities.map((item) => item.id === activity.id ? activity : item)
      })
    })
  };
}

const newActivityTemplate = {
  name: { en: "New activity", zh: "新行程点" },
  description: { en: "Add your own stop to this day.", zh: "为当天添加自定义行程点。" },
  startTime: "18:00",
  endTime: "19:30",
  category: "city_landmarks",
  address: { en: "Central district", zh: "中心城区" },
  location: { longitude: 104.0665, latitude: 30.5728 },
  estimatedCost: 0,
  transportNote: { en: "Add transport details", zh: "补充交通信息" },
  guide: {
    culture: { en: "Add local context.", zh: "补充本地文化背景。" },
    food: { en: "Add a food tip.", zh: "补充美食建议。" },
    crowd: { en: "Add a crowd tip.", zh: "补充客流建议。" },
    visit: { en: "Add a visit tip.", zh: "补充游览技巧。" }
  },
  votes: 0,
  isFavorite: false
};

export function WorkspaceContent({ forceReadOnly = false, sharedToken }) {
  const { trip, setTrip, loading, error, permission } = useTrip();
  const { language } = useLanguage();
  const [activeDayId, setActiveDayId] = useState(null);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [detailActivity, setDetailActivity] = useState(null);
  const [editing, setEditing] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [budgetOverride, setBudgetOverride] = useState(null);
  const readOnly = forceReadOnly || permission === "view";

  const variant = useMemo(() => {
    if (!trip) return null;
    return trip.variants.find((item) => item.id === trip.selectedVariantId) ?? trip.variants[0];
  }, [trip]);
  const day = useMemo(() => variant?.days.find((item) => item.id === activeDayId) ?? variant?.days[0], [activeDayId, variant]);
  const activity = useMemo(() => day?.activities.find((item) => item.id === selectedActivityId) ?? day?.activities[0], [day, selectedActivityId]);
  const budget = budgetOverride ?? (variant ? deriveBudget(variant, trip.totalBudget) : null);
  const paceLabel = {
    active: { en: "active", zh: "紧凑" },
    balanced: { en: "balanced", zh: "均衡" },
    slow: { en: "slow", zh: "慢游" }
  }[variant?.pace] ?? { en: variant?.pace, zh: variant?.pace };

  if (loading) return <div className="grid min-h-[60vh] place-items-center">Loading workspace...</div>;
  if (error || !trip || !variant || !day) return <div className="grid min-h-[60vh] place-items-center text-vermilion">{error || "Trip unavailable"}</div>;

  async function saveActivity(values) {
    if (values.id) {
      const body = await apiRequest(`/activities/${values.id}`, { method: "PATCH", body: JSON.stringify(values) });
      setTrip((current) => updateActivity(current, variant.id, day.id, body.activity));
      setBudgetOverride(body.budget);
      setSelectedActivityId(body.activity.id);
    } else {
      const body = await apiRequest(`/trips/${trip.id}/days/${day.id}/activities`, { method: "POST", body: JSON.stringify(values) });
      setTrip((current) => ({
        ...current,
        variants: current.variants.map((item) => item.id !== variant.id ? item : {
          ...item,
          days: item.days.map((currentDay) => currentDay.id !== day.id ? currentDay : {
            ...currentDay,
            activities: [...currentDay.activities, body.activity]
          })
        })
      }));
      setBudgetOverride(body.budget);
      setSelectedActivityId(body.activity.id);
    }
    setEditing(null);
  }

  async function removeActivity(target) {
    const body = await apiRequest(`/activities/${target.id}`, { method: "DELETE" });
    setTrip((current) => ({
      ...current,
      variants: current.variants.map((item) => item.id !== variant.id ? item : {
        ...item,
        days: item.days.map((currentDay) => currentDay.id !== day.id ? currentDay : {
          ...currentDay,
          activities: currentDay.activities.filter((item) => item.id !== target.id)
        })
      })
    }));
    setBudgetOverride(body.budget);
  }

  async function regenerateActivity(target) {
    const body = await apiRequest(`/activities/${target.id}/regenerate`, { method: "POST" });
    setTrip((current) => updateActivity(current, variant.id, day.id, body.activity));
    setBudgetOverride(body.budget);
  }

  async function cheaper() {
    if (!activity) return;
    const body = await apiRequest(`/activities/${activity.id}/cheaper-alternative`, { method: "POST" });
    setTrip((current) => updateActivity(current, variant.id, day.id, body.activity));
    setBudgetOverride(body.budget);
  }

  async function favorite(target) {
    await apiRequest("/favorites", { method: "POST", body: JSON.stringify({ activityId: target.id }) });
    setTrip((current) => updateActivity(current, variant.id, day.id, { ...target, isFavorite: true }));
  }

  function recordVote(activityId, votes) {
    const target = day.activities.find((item) => item.id === activityId);
    if (target) {
      setTrip((current) => updateActivity(current, variant.id, day.id, { ...target, votes }));
    }
  }

  async function reorder(activities) {
    const original = day.activities;
    setTrip((current) => ({
      ...current,
      variants: current.variants.map((item) => item.id !== variant.id ? item : {
        ...item,
        days: item.days.map((currentDay) => currentDay.id !== day.id ? currentDay : { ...currentDay, activities })
      })
    }));
    try {
      await apiRequest(`/trips/${trip.id}/days/${day.id}/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ activityIds: activities.map((item) => item.id) })
      });
    } catch {
      setTrip((current) => ({
        ...current,
        variants: current.variants.map((item) => item.id !== variant.id ? item : {
          ...item,
          days: item.days.map((currentDay) => currentDay.id !== day.id ? currentDay : { ...currentDay, activities: original })
        })
      }));
    }
  }

  async function regenerateDay() {
    const body = await apiRequest(`/trips/${trip.id}/days/${day.id}/regenerate`, { method: "POST" });
    setTrip((current) => ({
      ...current,
      variants: current.variants.map((item) => item.id !== variant.id ? item : {
        ...item,
        days: item.days.map((currentDay) => currentDay.id === day.id ? body.day : currentDay)
      })
    }));
    setBudgetOverride(body.budget);
  }

  return (
    <div className="min-h-screen bg-mist">
      <section className="border-b border-ink/10 bg-paper px-5 py-7 sm:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase text-lake">
              <span>{language === "zh" ? "行程工作台" : "Trip workspace"}</span>
              <span className="ml-2 text-ink/35">{language === "zh" ? "· 路线 03" : "· route 03"}</span>
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold">{variant.title[language]}</h1>
            <p className="mt-2 text-sm text-ink/50">{trip.startDate} → {trip.endDate} · {paceLabel[language]}</p>
          </div>
          {!forceReadOnly && (
            <button type="button" onClick={() => setShareOpen(true)} aria-label="Share trip" className="group flex min-h-11 items-center justify-center gap-2 rounded-lg bg-lake px-5 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5">
              <Share2 className="h-4 w-4" /> {language === "zh" ? "分享行程" : "Share trip"}
            </button>
          )}
        </div>
      </section>

      <section
        data-testid="workspace-grid"
        className="mx-auto grid max-w-[1520px] gap-4 px-4 py-4 lg:grid-cols-[minmax(360px,.95fr)_minmax(380px,.9fr)] xl:grid-cols-[minmax(360px,.95fr)_minmax(380px,.9fr)_310px]"
      >
        <div className="min-w-0">
          <DayTabs days={variant.days} activeDayId={day.id} onSelect={setActiveDayId} onRegenerate={regenerateDay} disabled={readOnly} />
          <Timeline
            day={day}
            selectedActivityId={activity?.id}
            readOnly={readOnly}
            onSelect={setSelectedActivityId}
            onOpenDetails={setDetailActivity}
            onEdit={setEditing}
            onDelete={removeActivity}
            onRegenerate={regenerateActivity}
            onFavorite={favorite}
            onAdd={() => setEditing(newActivityTemplate)}
            onReorder={reorder}
            sharedToken={sharedToken}
            onVoted={recordVote}
          />
        </div>
        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <RouteMap activities={day.activities} selectedActivityId={activity?.id} onSelect={setSelectedActivityId} />
          <div className="mt-4"><GuidePanel activity={activity} /></div>
        </div>
        <div className="min-w-0">
          <BudgetPanel budget={budget} onCheaper={cheaper} disabled={readOnly || !activity} />
          {!readOnly && (
            <button type="button" onClick={() => setEditing(newActivityTemplate)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-lake text-sm font-bold text-white shadow-lift">
              <Plus className="h-4 w-4" /> {language === "zh" ? "添加活动" : "Add activity"}
            </button>
          )}
        </div>
      </section>

      <ActivityModal activity={editing} open={Boolean(editing)} onClose={() => setEditing(null)} onSave={saveActivity} />
      <ActivityDetailsDialog activity={detailActivity} open={Boolean(detailActivity)} onClose={() => setDetailActivity(null)} />
      <ShareDialog tripId={trip.id} open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

export default function TripWorkspacePage() {
  const { tripId } = useParams();
  return (
    <AppShell hideFooter>
      <TripProvider tripId={tripId}><WorkspaceContent /></TripProvider>
    </AppShell>
  );
}
