import { Archive, CalendarDays, CheckCircle2, Clock3, LoaderCircle, MapPin, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import TripArchive from "../components/TripArchive.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import AppShell from "../layout/AppShell.jsx";

const tabs = [
  { id: "draft", en: "Drafts", zh: "草稿", Icon: Archive },
  { id: "upcoming", en: "Upcoming", zh: "即将出发", Icon: Clock3 },
  { id: "completed", en: "Completed", zh: "已完成", Icon: CheckCircle2 }
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
  const counts = useMemo(() => Object.fromEntries(tabs.map((tab) => [tab.id, trips.filter((trip) => trip.status === tab.id).length])), [trips]);

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
      <section className="archive-hero" aria-labelledby="archive-title">
        <div className="archive-hero__content">
          <span><Archive aria-hidden="true" /> {t("archive.eyebrow")}</span>
          <h1 id="archive-title">{language === "zh" ? "你的新加坡旅行资料库。" : "Your Singapore travel library."}</h1>
          <p>{language === "zh" ? "随时查看、管理和继续你的新加坡行程，把每一段回忆都收藏在这里。" : "View, manage and continue your Singapore trips whenever you are ready."}</p>
        </div>
        <div className="archive-hero__postmark" aria-hidden="true">
          <b>Singapore</b>
          <span>{language === "zh" ? "一座城市，许多故事" : "A City of Many Stories"}</span>
        </div>
      </section>
      <section className="archive-library">
        <div className="archive-library__inner">
          <div role="tablist" className="archive-tabs">
            {tabs.map((tab) => (
              <button key={tab.id} role="tab" aria-selected={active === tab.id} onClick={() => setActive(tab.id)}>
                <tab.Icon aria-hidden="true" />
                <span>{tab[language]}</span>
                <b>{counts[tab.id] ?? 0}</b>
              </button>
            ))}
          </div>
          <div className="archive-library__head">
            <div>
              <p><MapPin aria-hidden="true" /> Singapore <CalendarDays aria-hidden="true" /> 2026-10-10 <span>{language === "zh" ? "已验证" : "Validated"}</span></p>
              <h2>{language === "zh" ? "新加坡行程" : "Singapore trips"}</h2>
              <small>{language === "zh" ? "继续你的旅程，查看已保存的行程，或从这里再次出发。" : "Continue your journey, inspect saved trips, or begin again from here."}</small>
            </div>
          </div>
          <div className="archive-library__body">
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
