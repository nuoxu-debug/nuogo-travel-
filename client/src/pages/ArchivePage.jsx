import { Archive, Heart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import FavoritesGrid from "../components/FavoritesGrid.jsx";
import TripArchive from "../components/TripArchive.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import AppShell from "../layout/AppShell.jsx";

const tabs = [
  { id: "draft", en: "Drafts", zh: "草稿" },
  { id: "upcoming", en: "Upcoming", zh: "即将出发" },
  { id: "completed", en: "Completed", zh: "已完成" }
];

export default function ArchivePage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [active, setActive] = useState("draft");
  const [trips, setTrips] = useState([]);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    apiRequest("/trips").then((body) => setTrips(body.trips ?? [])).catch(() => {});
    apiRequest("/favorites").then((body) => setFavorites(body.favorites ?? [])).catch(() => {});
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
          <span className="flex items-center gap-2 text-xs font-bold uppercase text-lake"><Archive className="h-4 w-4" /> Nuogo archive</span>
          <h1 className="mt-4 font-display text-4xl font-bold sm:text-6xl">{language === "zh" ? "你的中国旅行资料库。" : "Your China travel library."}</h1>
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
          <div className="mt-6"><TripArchive trips={filtered} onDuplicate={duplicate} onReuse={reuse} /></div>
          <section className="mt-14 border-t border-ink/10 pt-8">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><Heart className="h-5 w-5 text-vermilion" /> {language === "zh" ? "收藏地点" : "Favorite places"}</h2>
            <div className="mt-5"><FavoritesGrid favorites={favorites} /></div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
