import { BrowserRouter, MemoryRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";
import { RootErrorBoundary } from "./components/RootErrorBoundary.jsx";
import ArchivePage from "./pages/ArchivePage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import DestinationDiscoveryPage from "./pages/DestinationDiscoveryPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import PlannerPage from "./pages/PlannerPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import TripWorkspacePage from "./pages/TripWorkspacePage.jsx";

function ApplicationRoutes() {
  return (
    <>
      <SessionExpiryRedirect />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/discover/:destination" element={<DestinationDiscoveryPage />} />
        <Route path="/trip/:tripId" element={<ProtectedRoute><TripWorkspacePage /></ProtectedRoute>} />
        <Route path="/archive" element={<RegisteredRoute><ArchivePage /></RegisteredRoute>} />
        <Route path="/profile" element={<RegisteredRoute><ProfilePage /></RegisteredRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function SessionExpiryRedirect() {
  const { sessionReason } = useAuth();
  const location = useLocation();
  const alreadyAtExpiredLogin = location.pathname === "/login"
    && new URLSearchParams(location.search).get("reason") === "session-expired";
  if (sessionReason !== "expired" || alreadyAtExpiredLogin) return null;
  return <Navigate to="/login?reason=session-expired" replace state={{ reason: "session-expired" }} />;
}

function ProtectedRoute({ children }) {
  const { ready, sessionReason, user } = useAuth();
  const location = useLocation();
  if (!ready) return null;
  if (user) return children;
  if (sessionReason === "expired") {
    return <Navigate to="/login?reason=session-expired" replace state={{ reason: "session-expired" }} />;
  }
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
}

function AdminRoute({ children }) {
  const { ready, user } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/planner" replace />;
  return children;
}

function RegisteredRoute({ children }) {
  const { ready, user } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.accountType === "GUEST") return <Navigate to="/planner" replace />;
  return children;
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
