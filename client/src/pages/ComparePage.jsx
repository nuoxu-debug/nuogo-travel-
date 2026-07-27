import { ArrowLeftRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import PlanComparison from "../components/PlanComparison.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { TripProvider, useTrip } from "../context/TripContext.jsx";
import AppShell from "../layout/AppShell.jsx";

function CompareContent() {
  const { trip, setTrip, loading, error } = useTrip();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [choosing, setChoosing] = useState(false);
  const [selectionError, setSelectionError] = useState("");

  async function choose(variant) {
    if (choosing) return;
    setChoosing(true);
    setSelectionError("");
    try {
      const body = await apiRequest(`/trips/${trip.id}/select-variant`, {
        method: "POST",
        body: JSON.stringify({
          variantId: variant.id,
          expectedRevision: trip.revision
        })
      });
      const next = {
        ...trip,
        ...body.trip,
        variants: body.trip.variants ?? trip.variants,
        revision: body.revision
      };
      setTrip(next);
      navigate(`/trip/${trip.id}`);
    } catch (requestError) {
      setSelectionError(requestError.message);
      if (requestError.code === "NOT_FOUND") {
        sessionStorage.removeItem(`nuogo-trip-${trip.id}`);
      }
    } finally {
      setChoosing(false);
    }
  }

  if (loading) return <div className="grid min-h-[60vh] place-items-center">Loading plans...</div>;
  if (error || !trip) return <div className="grid min-h-[60vh] place-items-center text-vermilion">{error || "Trip unavailable"}</div>;

  return (
    <>
      <section className="relative overflow-hidden bg-paper px-5 pb-14 pt-12 text-ink sm:px-8 sm:pb-18 sm:pt-16">
        <div className="absolute right-0 top-0 hidden h-full w-[33.333%] border-l border-ink/10 bg-gold/8 lg:block" />
        <div className="relative mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-[1fr_410px] lg:items-end">
          <div>
            <span className="flex items-center gap-2 text-xs font-extrabold uppercase text-lake"><ArrowLeftRight className="h-4 w-4" /> Nuogo compare · step 02</span>
            <h1 className="mt-4 max-w-4xl font-display text-4xl font-extrabold leading-tight sm:text-6xl">
              {language === "zh" ? "三种旅行风格，一眼做出选择。" : "Three travel styles. One clear choice."}
            </h1>
          </div>
          <div className="rounded-lg border border-ink/10 bg-white/72 p-5 shadow-panel backdrop-blur-2xl">
            <p className="text-xs font-bold uppercase text-ink/38">{language === "zh" ? "比较标准" : "Compared on equal terms"}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {["Budget", "Pace", "Route", "Highlights"].map((item) => (
                <span key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-lake" /> {item}</span>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="px-5 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase text-vermilion">{language === "zh" ? "选择路线模板" : "Choose a route template"}</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/55">
                {language === "zh" ? "每套方案使用不同的景点组合、预算重点与每日路线。" : "Each option uses a different attraction mix, budget emphasis, and day-by-day route."}
              </p>
            </div>
            <span className="hidden text-xs font-bold text-ink/35 sm:block">03 OPTIONS · 01 SELECTION</span>
          </div>
          {selectionError && (
            <div role="alert" className="mb-6 flex flex-col justify-between gap-4 border-l-4 border-vermilion bg-red-50 p-4 text-sm text-red-900 sm:flex-row sm:items-center">
              <div>
                <strong>{language === "zh" ? "无法打开所选行程" : "The selected itinerary could not be opened"}</strong>
                <p className="mt-1">{selectionError}</p>
              </div>
              <Link to="/planner" className="shrink-0 rounded-lg bg-lake px-4 py-3 font-bold text-white">
                {language === "zh" ? "重新生成方案" : "Create new plans"}
              </Link>
            </div>
          )}
          <PlanComparison variants={trip.variants} onChoose={choose} choosing={choosing} />
        </div>
      </section>
    </>
  );
}

export default function ComparePage() {
  const { tripId } = useParams();
  return (
    <AppShell>
      <TripProvider tripId={tripId}><CompareContent /></TripProvider>
    </AppShell>
  );
}
