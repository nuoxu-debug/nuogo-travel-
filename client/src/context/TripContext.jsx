import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAuthToken } from "../api/authToken.js";
import { apiRequest } from "../api/client.js";
import { useAuth } from "./AuthContext.jsx";

const TripContext = createContext(null);
const ownerAccess = { role: "owner", canEdit: true, isOwner: true };

function cachedTrip(tripId) {
  if (!tripId) return null;
  const saved = sessionStorage.getItem(`nuogo-trip-${tripId}`);
  return saved ? JSON.parse(saved) : null;
}

export function TripProvider({ tripId, children }) {
  const { ready, user } = useAuth();
  const authenticated = Boolean(ready && user && getAuthToken());
  const [trip, setTripState] = useState(() => cachedTrip(tripId));
  const [access, setAccess] = useState(() => trip ? ownerAccess : null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const setTrip = useCallback((next) => {
    setTripState((current) => {
      const value = typeof next === "function" ? next(current) : next;
      if (value?.id && authenticated) {
        sessionStorage.setItem(`nuogo-trip-${value.id}`, JSON.stringify(value));
      }
      return value;
    });
  }, [authenticated]);

  const refreshTrip = useCallback(async ({ silent = false } = {}) => {
    if (!tripId || !authenticated) return null;
    try {
      const body = await apiRequest(`/trips/${tripId}`);
      setTrip(body.trip);
      setAccess(body.access ?? ownerAccess);
      if (!silent) setError("");
      return body.trip;
    } catch (requestError) {
      if (!silent) setError(requestError.message);
      throw requestError;
    }
  }, [authenticated, setTrip, tripId]);

  useEffect(() => {
    let active = true;
    if (!ready) return () => { active = false; };
    if (!authenticated) {
      sessionStorage.removeItem(`nuogo-trip-${tripId}`);
      setTripState(null);
      setAccess(null);
      setLoading(false);
      return () => { active = false; };
    }

    const saved = cachedTrip(tripId);
    if (saved?.objectiveAligned) {
      setTripState(saved);
      setAccess(ownerAccess);
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    refreshTrip().catch(() => {}).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [authenticated, ready, refreshTrip, tripId]);

  useEffect(() => {
    if (!authenticated || !tripId) return undefined;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshTrip({ silent: true }).catch(() => {});
    }, 20_000);
    return () => window.clearInterval(interval);
  }, [authenticated, refreshTrip, tripId]);

  const value = useMemo(() => ({ trip, setTrip, access, loading, error, refreshTrip }), [access, error, loading, refreshTrip, setTrip, trip]);
  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const value = useContext(TripContext);
  if (!value) throw new Error("useTrip must be used inside TripProvider.");
  return value;
}
