import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";
import { RootErrorBoundary } from "./components/RootErrorBoundary.jsx";
import ArchivePage from "./pages/ArchivePage.jsx";
import ComparePage from "./pages/ComparePage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import InvitationPage from "./pages/InvitationPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import PlannerPage from "./pages/PlannerPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import SharedTripPage from "./pages/SharedTripPage.jsx";
import TripWorkspacePage from "./pages/TripWorkspacePage.jsx";

function Placeholder({ title }) {
  return <div className="grid min-h-screen place-items-center bg-mist"><h1 className="font-display text-4xl font-bold">{title}</h1></div>;
}

function ApplicationRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/invite/:token" element={<InvitationPage />} />
      <Route path="/planner" element={<PlannerPage />} />
      <Route path="/compare/:tripId" element={<ComparePage />} />
      <Route path="/trip/:tripId" element={<TripWorkspacePage />} />
      <Route path="/shared/:token" element={<SharedTripPage />} />
      <Route path="/archive" element={<ArchivePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App({ initialPath }) {
  const Router = initialPath ? MemoryRouter : BrowserRouter;
  const routerProps = {
    future: { v7_startTransition: true, v7_relativeSplatPath: true },
    ...(initialPath ? { initialEntries: [initialPath] } : {})
  };
  return (
    <RootErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <Router {...routerProps}>
            <ApplicationRoutes />
          </Router>
        </AuthProvider>
      </LanguageProvider>
    </RootErrorBoundary>
  );
}
