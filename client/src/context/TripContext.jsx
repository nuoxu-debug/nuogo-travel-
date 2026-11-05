import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAuthToken } from "../api/authToken.js";
import { apiRequest } from "../api/client.js";
import { useAuth } from "./AuthContext.jsx";

const TripContext = createContext(null);
const ownerAccess = { role: "owner", canEdit: true, isOwner: true };
const previewAccess = { role: "previewer", canEdit: false, isOwner: false, canSavePreview: true };

function cachedTrip(tripId) {
  if (!tripId) return null;
  const saved = sessionStorage.getItem(`nuogo-trip-${tripId}`);
  try {
    const trip = saved ? JSON.parse(saved) : null;
    return trip?.id === tripId ? trip : null;
  } catch {
    return null;
  }
}

export function TripProvider({ tripId, children }) {
  const { ready, user } = useAuth();
  const authenticated = Boolean(ready && user && getAuthToken());
  const token = authenticated ? getAuthToken() : null;
  const [trip, setTripState] = useState(() => {
    const saved = cachedTrip(tripId);
    return saved?.persistenceScope === "PREVIEW" ? saved : null;
  });
  const [access, setAccess] = useState(() => trip ? (trip.persistenceScope === "PREVIEW" ? previewAccess : ownerAccess) : null);
  const [verifiedToken, setVerifiedToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const setTrip = useCallback((next) => {
    if (token && token !== getAuthToken()) return;
    setVerifiedToken(token);
    setTripState((current) => {
      const value = typeof next === "function" ? next(current) : next;
      if (value?.id && (authenticated || value.persistenceScope === "PREVIEW")) {
        sessionStorage.setItem(`nuogo-trip-${value.id}`, JSON.stringify(value));
      }
      return value;
    });
  }, [authenticated, token]);

  const refreshTrip = useCallback(async ({ silent = false } = {}) => {
    if (!tripId || !authenticated) return null;
    try {
      const body = await apiRequest(`/trips/${tripId}`);
      if (token !== getAuthToken()) return null;
      setTrip(body.trip);
      setAccess(body.access ?? ownerAccess);
      if (!silent) setError("");
      return body.trip;
    } catch (requestError) {
      if (token !== getAuthToken()) return null;
      if ([401, 403, 404].includes(requestError.status)) {
        sessionStorage.removeItem(`nuogo-trip-${tripId}`);
        setTripState(null);
        setAccess(null);
        setVerifiedToken(null);
        setError(requestError.message);
      } else if (!silent) setError(requestError.message);
      throw requestError;
    }
  }, [authenticated, setTrip, token, tripId]);

  useEffect(() => {
    let active = true;
    if (!ready) return () => { active = false; };
    const saved = cachedTrip(tripId);
    if (saved?.objectiveAligned && saved.persistenceScope === "PREVIEW") {
      setTripState(saved);
      setAccess(previewAccess);
      setLoading(false);
      return () => { active = false; };
    }
    if (!authenticated) {
      sessionStorage.removeItem(`nuogo-trip-${tripId}`);
      setTripState(null);
      setAccess(null);
      setLoading(false);
      return () => { active = false; };
    }

    setTripState(null);
    setAccess(null);
    setVerifiedToken(null);
    setError("");
    setLoading(true);
    refreshTrip().catch(() => {}).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [authenticated, ready, refreshTrip, tripId]);

  useEffect(() => {
    if (!authenticated || !tripId || trip?.persistenceScope === "PREVIEW") return undefined;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshTrip({ silent: true }).catch(() => {});
    }, 20_000);
    return () => window.clearInterval(interval);
  }, [authenticated, refreshTrip, tripId, trip?.persistenceScope]);

  const canDisplay = trip?.id === tripId && (trip.persistenceScope === "PREVIEW" || (authenticated && verifiedToken === token));
  const value = useMemo(() => ({ trip: canDisplay ? trip : null, setTrip, access: canDisplay ? access : null, loading, error, refreshTrip }), [access, canDisplay, error, loading, refreshTrip, setTrip, trip]);
  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const value = useContext(TripContext);
  if (!value) throw new Error("useTrip must be used inside TripProvider.");
  return value;
}
