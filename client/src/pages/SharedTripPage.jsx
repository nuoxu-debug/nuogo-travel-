import { useParams } from "react-router-dom";
import { TripProvider } from "../context/TripContext.jsx";
import AppShell from "../layout/AppShell.jsx";
import { WorkspaceContent } from "./TripWorkspacePage.jsx";

export default function SharedTripPage() {
  const { token } = useParams();
  return (
    <AppShell hideFooter>
      <TripProvider sharedToken={token}><WorkspaceContent sharedToken={token} /></TripProvider>
    </AppShell>
  );
}
