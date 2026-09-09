import { useParams } from "react-router-dom";
import ObjectiveTripWorkspace from "../components/ObjectiveTripWorkspace.jsx";
import { TripProvider, useTrip } from "../context/TripContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import AppShell from "../layout/AppShell.jsx";

function WorkspaceContent() {
  const { trip, setTrip, access, loading, error } = useTrip();
  const { language } = useLanguage();

  if (loading) {
    return (
      <div role="status" aria-label={language === "zh" ? "正在加载行程" : "Loading itinerary"} className="mx-auto grid min-h-[60vh] max-w-[1440px] gap-4 px-5 py-10 md:grid-cols-2">
        <div className="h-72 animate-pulse rounded-lg bg-ink/8" />
        <div className="h-72 animate-pulse rounded-lg bg-ink/8" />
      </div>
    );
  }

  if (error || !trip?.objectiveAligned) {
    return (
      <div role="alert" className="grid min-h-[60vh] place-items-center px-5 text-center text-red-700">
        {language === "zh" ? "暂时无法打开此行程。" : "This itinerary is unavailable."}
      </div>
    );
  }

  return <ObjectiveTripWorkspace trip={trip} setTrip={setTrip} access={access} />;
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
