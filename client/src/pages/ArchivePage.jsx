import { Archive, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import TripArchive from "../components/TripArchive.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import AppShell from "../layout/AppShell.jsx";

const tabs = [
  { id: "draft", en: "Drafts", zh: "草稿" },
  { id: "upcoming", en: "Upcoming", zh: "即将出发" },
  { id: "completed", en: "Completed", zh: "已完成" }
];

export default function ArchivePage() {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [active, setActive] = useState("draft");
  const [trips, setTrips] = useState([]);
  const [tripsState, setTripsState] = useState("loading");

  async function loadTrips() {
    setTripsState("loading");
    try {
      const body = await apiRequest("/trips");
      setTrips(body.trips ?? []);
      setTripsState("ready");
    } catch {
      setTripsState("error");
    }
  }

  useEffect(() => {
    loadTrips();
  }, []);

  const filtered = useMemo(() => trips.filter((trip) => trip.status === active), [active, trips]);

  async function duplicate(trip) {
    const body = await apiRequest(`/trips/${trip.id}/duplicate`, { method: "POST" });
    setTrips((current) => [body.trip, ...current]);
  }

  function reuse(trip) {
    sessionStorage.setItem("nuogo-reused-preferences", JSON.stringify(trip.preferences));
    navigate("/planner");
  }

  return (
    <AppShell>
      <section className="relative overflow-hidden bg-paper px-5 py-14 text-ink sm:px-8 sm:py-18">
        <div className="absolute right-0 top-0 hidden h-full w-1/3 border-l border-ink/10 bg-lake/5 lg:block" />
        <div className="relative mx-auto max-w-[1440px]">
          <span className="flex items-center gap-2 text-xs font-bold uppercase text-lake"><Archive className="h-4 w-4" /> {t("archive.eyebrow")}</span>
          <h1 className="mt-4 font-display text-4xl font-bold sm:text-6xl">{language === "zh" ? "你的新加坡旅行资料库。" : "Your Singapore travel library."}</h1>
        </div>
      </section>
      <section className="px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div role="tablist" className="flex gap-1 overflow-x-auto rounded-lg border border-ink/10 bg-white/78 p-2 shadow-panel backdrop-blur-2xl">
            {tabs.map((tab) => (
              <button key={tab.id} role="tab" aria-selected={active === tab.id} onClick={() => setActive(tab.id)} className={`min-h-11 shrink-0 rounded-lg px-5 text-sm font-bold ${active === tab.id ? "bg-lake text-white" : "bg-transparent text-ink/62 hover:bg-ink/5"}`}>
                {tab[language]}
              </button>
            ))}
          </div>
          <div className="mt-6">
            {tripsState === "loading" ? (
              <ArchiveStatus label={t("archive.loadingTrips")} />
            ) : tripsState === "error" ? (
              <ArchiveError label={t("archive.tripsLoadFailed")} retry={loadTrips} retryLabel={t("common.retry")} />
            ) : (
              <TripArchive trips={filtered} onDuplicate={duplicate} onReuse={reuse} onOpen={(trip) => navigate(`/trip/${trip.id}`)} />
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function ArchiveStatus({ label, compact = false }) {
  return (
    <div role="status" aria-label={label} className={`flex items-center gap-3 border border-ink/10 bg-white/70 px-5 text-sm font-bold text-ink/55 ${compact ? "min-h-24" : "min-h-64 justify-center"}`}>
      <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin text-lake" />
      <span>{label}</span>
    </div>
  );
}

function ArchiveError({ label, retry, retryLabel, compact = false }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 border border-vermilion/25 bg-vermilion/5 px-5 ${compact ? "min-h-24" : "min-h-64"}`}>
      <p role="alert" aria-label={label} className="font-bold text-ink">{label}</p>
      <button type="button" onClick={retry} className="flex min-h-10 items-center gap-2 bg-ink px-4 text-sm font-bold text-white">
        <RefreshCw aria-hidden="true" className="h-4 w-4" />
        {retryLabel}
      </button>
    </div>
  );
}
