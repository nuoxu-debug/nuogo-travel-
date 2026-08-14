import { Plus, Share2, UserPlus, Users } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import ActivityDetailsDialog from "../components/ActivityDetailsDialog.jsx";
import ActivityModal from "../components/ActivityModal.jsx";
import { deriveBudget } from "../components/BudgetPanel.jsx";
import CollaborationDrawer from "../components/CollaborationDrawer.jsx";
import DayTabs from "../components/DayTabs.jsx";
import ExpenseWorkspace from "../components/ExpenseWorkspace.jsx";
import GuidePanel from "../components/GuidePanel.jsx";
import MemberAvatars from "../components/MemberAvatars.jsx";
import ObjectiveTripWorkspace from "../components/ObjectiveTripWorkspace.jsx";
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

function mutationBody(trip, values = {}) {
  return { ...values, expectedRevision: trip.revision };
}

const newActivityTemplate = {
  name: { en: "New activity", zh: "新行程点" },
  description: {
    en: "Add your own stop to this day.",
    zh: "为当天添加自定义行程点。"
  },
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
  const {
    trip,
    setTrip,
    access,
    members,
    loading,
    error,
    permission,
    membersLoading,
    membersError,
    refreshTrip,
    refreshMembers,
    applyTripMutation
  } = useTrip();
  const { language, t } = useLanguage();
  const [activeDayId, setActiveDayId] = useState(null);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [detailActivity, setDetailActivity] = useState(null);
  const [editing, setEditing] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [collaborationOpen, setCollaborationOpen] = useState(false);
  const [mutationStatus, setMutationStatus] = useState("");
  const [budgetOverride, setBudgetOverride] = useState(null);
  const readOnly = forceReadOnly || Boolean(sharedToken) || !access?.canEdit;
  const votingToken = sharedToken && permission === "edit" ? sharedToken : null;
  const openCollaboration = useCallback(() => {
    setCollaborationOpen(true);
  }, []);
  const closeCollaboration = useCallback(() => {
    setCollaborationOpen(false);
  }, []);
  const openShare = useCallback(() => setShareOpen(true), []);
  const closeShare = useCallback(() => setShareOpen(false), []);

  const variant = useMemo(() => {
    if (!trip) return null;
    return trip.variants?.find((item) => item.id === trip.selectedVariantId)
      ?? trip.variants[0];
  }, [trip]);
  const day = useMemo(
    () => variant?.days?.find((item) => item.id === activeDayId) ?? variant?.days?.[0],
    [activeDayId, variant]
  );
  const activity = useMemo(
    () => day?.activities.find((item) => item.id === selectedActivityId)
      ?? day?.activities[0],
    [day, selectedActivityId]
  );
  const budget = budgetOverride ?? (
    variant ? deriveBudget(variant, trip.totalBudget) : null
  );
  const paceLabel = {
    active: { en: "active", zh: "紧凑" },
    balanced: { en: "balanced", zh: "均衡" },
    slow: { en: "slow", zh: "慢游" }
  }[variant?.pace] ?? { en: variant?.pace, zh: variant?.pace };

  if (loading) {
    return (
      <div
        aria-label={t("workspace.loading")}
        className="mx-auto grid min-h-[60vh] max-w-[1520px] gap-4 px-4 py-10 md:grid-cols-2"
      >
        <div className="h-72 animate-pulse rounded-lg bg-ink/8" />
        <div className="h-72 animate-pulse rounded-lg bg-ink/8" />
      </div>
    );
  }

  if (trip?.objectiveAligned) {
    return <ObjectiveTripWorkspace trip={trip} setTrip={setTrip} access={access} />;
  }

  if (error || !trip || !variant || !day) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-5 text-center text-red-700">
        {t("workspace.unavailable")}
      </div>
    );
  }

  async function performMutation(operation) {
    setMutationStatus("");
    try {
      return await operation();
    } catch (requestError) {
      if (requestError.code === "TRIP_VERSION_CONFLICT") {
        await refreshTrip({ force: true }).catch(() => {});
        setBudgetOverride(null);
        setMutationStatus(t("workspace.conflict"));
        return null;
      }
      setMutationStatus(t("workspace.mutationFailed"));
      return null;
    }
  }

  async function saveActivity(values) {
    if (readOnly) return;
    if (values.id) {
      const body = await performMutation(() => apiRequest(`/activities/${values.id}`, {
        method: "PATCH",
        body: JSON.stringify(mutationBody(trip, values))
      }));
      if (!body) return;
      const applied = applyTripMutation(trip.id, body.revision, (current) => (
        updateActivity(current, variant.id, day.id, body.activity)
      ));
      if (!applied) return;
      setBudgetOverride(body.budget);
      setSelectedActivityId(body.activity.id);
    } else {
      const body = await performMutation(() => apiRequest(
        `/trips/${trip.id}/days/${day.id}/activities`,
        {
          method: "POST",
          body: JSON.stringify(mutationBody(trip, values))
        }
      ));
      if (!body) return;
      const applied = applyTripMutation(trip.id, body.revision, (current) => ({
        ...current,
        variants: current.variants.map((item) => item.id !== variant.id ? item : {
          ...item,
          days: item.days.map((currentDay) => currentDay.id !== day.id ? currentDay : {
            ...currentDay,
            activities: [...currentDay.activities, body.activity]
          })
        })
      }));
      if (!applied) return;
      setBudgetOverride(body.budget);
      setSelectedActivityId(body.activity.id);
    }
    setEditing(null);
  }

  async function removeActivity(target) {
    if (readOnly) return;
    const body = await performMutation(() => apiRequest(`/activities/${target.id}`, {
      method: "DELETE",
      body: JSON.stringify(mutationBody(trip))
    }));
    if (!body) return;
    const applied = applyTripMutation(trip.id, body.revision, (current) => ({
      ...current,
      variants: current.variants.map((item) => item.id !== variant.id ? item : {
        ...item,
        days: item.days.map((currentDay) => currentDay.id !== day.id ? currentDay : {
          ...currentDay,
          activities: currentDay.activities.filter((item) => item.id !== target.id)
        })
      })
    }));
    if (!applied) return;
    setBudgetOverride(body.budget);
  }

  async function regenerateActivity(target) {
    if (readOnly) return;
    const body = await performMutation(() => apiRequest(
      `/activities/${target.id}/regenerate`,
      {
        method: "POST",
        body: JSON.stringify(mutationBody(trip))
      }
    ));
    if (!body) return;
    const applied = applyTripMutation(trip.id, body.revision, (current) => (
      updateActivity(current, variant.id, day.id, body.activity)
    ));
    if (!applied) return;
    setBudgetOverride(body.budget);
  }

  async function cheaper() {
    if (readOnly || !activity) return;
    const body = await performMutation(() => apiRequest(
      `/activities/${activity.id}/cheaper-alternative`,
      {
        method: "POST",
        body: JSON.stringify(mutationBody(trip))
      }
    ));
    if (!body) return;
    const applied = applyTripMutation(trip.id, body.revision, (current) => (
      updateActivity(current, variant.id, day.id, body.activity)
    ));
    if (!applied) return;
    setBudgetOverride(body.budget);
  }

  async function favorite(target) {
    if (readOnly) return;
    const requestRevision = trip.revision;
    await apiRequest("/favorites", {
      method: "POST",
      body: JSON.stringify({ activityId: target.id })
    });
    applyTripMutation(trip.id, requestRevision, (current) => {
      const currentVariant = current.variants.find(({ id }) => id === variant.id);
      const currentDay = currentVariant?.days.find(({ id }) => id === day.id);
      const currentActivity = currentDay?.activities.find(({ id }) => id === target.id);
      return currentActivity
        ? updateActivity(
            current,
            variant.id,
            day.id,
            { ...currentActivity, isFavorite: true }
          )
        : current;
    });
  }

  function recordVote(activityId, votes) {
    const target = day.activities.find((item) => item.id === activityId);
    if (target) {
      setTrip((current) => updateActivity(
        current,
        variant.id,
        day.id,
        { ...target, votes }
      ));
    }
  }

  async function reorder(activities) {
    if (readOnly) return;
    const body = await performMutation(() => apiRequest(
      `/trips/${trip.id}/days/${day.id}/reorder`,
      {
        method: "PATCH",
        body: JSON.stringify(mutationBody(trip, {
          activityIds: activities.map((item) => item.id)
        }))
      }
    ));
    if (!body) return;
    applyTripMutation(trip.id, body.revision, (current) => ({
      ...current,
      variants: current.variants.map((item) => item.id !== variant.id ? item : {
        ...item,
        days: item.days.map((currentDay) => currentDay.id !== day.id
          ? currentDay
          : { ...currentDay, activities })
      })
    }));
  }

  async function regenerateDay() {
    if (readOnly) return;
    const body = await performMutation(() => apiRequest(
      `/trips/${trip.id}/days/${day.id}/regenerate`,
      {
        method: "POST",
        body: JSON.stringify(mutationBody(trip))
      }
    ));
    if (!body) return;
    const applied = applyTripMutation(trip.id, body.revision, (current) => ({
      ...current,
      variants: current.variants.map((item) => item.id !== variant.id ? item : {
        ...item,
        days: item.days.map((currentDay) => (
          currentDay.id === day.id ? body.day : currentDay
        ))
      })
    }));
    if (!applied) return;
    setBudgetOverride(body.budget);
  }

  return (
    <div className="min-h-screen bg-mist">
      <section className="border-b border-ink/10 bg-paper px-5 py-6 sm:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-extrabold text-lake">
              <span>{t("workspace.label")}</span>
              <span className="ml-2 text-ink/50">{t("workspace.route")}</span>
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold">
              {variant.title[language]}
            </h1>
            <p className="mt-2 text-sm text-ink/65">
              {trip.startDate} - {trip.endDate} · {paceLabel[language]}
            </p>
          </div>

          {!forceReadOnly && !sharedToken && access && (
            <div className="flex flex-wrap items-center gap-2">
              <MemberAvatars members={members} />
              {access?.isOwner && (
                <button
                  type="button"
                  onClick={openCollaboration}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <UserPlus className="h-4 w-4" />
                  {t("workspace.invite")}
                </button>
              )}
              <button
                type="button"
                onClick={openCollaboration}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ink/15 bg-white px-4 text-sm font-bold text-ink transition-colors hover:border-jade hover:text-jade"
              >
                <Users className="h-4 w-4" />
                {t("workspace.members")}
              </button>
              {access?.isOwner && (
                <button
                  type="button"
                  onClick={openShare}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ink/15 bg-white px-4 text-sm font-bold text-ink transition-colors hover:border-lake hover:text-lake"
                >
                  <Share2 className="h-4 w-4" />
                  {t("workspace.publicShare")}
                </button>
              )}
            </div>
          )}
        </div>
        {mutationStatus && (
          <p
            role="status"
            className="mx-auto mt-4 max-w-[1600px] rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
          >
            {mutationStatus}
          </p>
        )}
      </section>

      <section
        data-testid="workspace-grid"
        className="mx-auto grid max-w-[1520px] gap-4 px-4 py-4 lg:grid-cols-[minmax(360px,.95fr)_minmax(380px,.9fr)] xl:grid-cols-[minmax(360px,.95fr)_minmax(380px,.9fr)_310px]"
      >
        <div className="min-w-0">
          <DayTabs
            days={variant.days}
            activeDayId={day.id}
            onSelect={setActiveDayId}
            onRegenerate={regenerateDay}
            disabled={readOnly}
          />
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
            sharedToken={votingToken}
            onVoted={recordVote}
          />
        </div>
        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <RouteMap
            activities={day.activities}
            selectedActivityId={activity?.id}
            onSelect={setSelectedActivityId}
          />
          <div className="mt-4">
            <GuidePanel activity={activity} />
          </div>
        </div>
        <div className="min-w-0">
          <ExpenseWorkspace
            tripId={trip.id}
            access={sharedToken ? null : access}
            members={members}
            plannedBudget={budget}
            onCheaper={cheaper}
            cheaperDisabled={readOnly || !activity}
          />
          {!readOnly && (
            <button
              type="button"
              onClick={() => setEditing(newActivityTemplate)}
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink text-sm font-bold text-white shadow-lift"
            >
              <Plus className="h-4 w-4" />
              {t("workspace.addActivity")}
            </button>
          )}
        </div>
      </section>

      <ActivityModal
        activity={editing}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        onSave={saveActivity}
      />
      <ActivityDetailsDialog
        activity={detailActivity}
        open={Boolean(detailActivity)}
        onClose={() => setDetailActivity(null)}
      />
      <ShareDialog
        tripId={trip.id}
        open={shareOpen}
        onClose={closeShare}
      />
      <CollaborationDrawer
        tripId={trip.id}
        open={collaborationOpen}
        onClose={closeCollaboration}
        access={access}
        members={members}
        onMembersChanged={refreshMembers}
        membersLoading={membersLoading}
        membersError={membersError}
      />
    </div>
  );
}

export default function TripWorkspacePage() {
  const { tripId } = useParams();
  return (
    <AppShell hideFooter>
      <TripProvider tripId={tripId}>
        <WorkspaceContent />
      </TripProvider>
    </AppShell>
  );
}
