import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client.js";

const TripContext = createContext(null);

export function TripProvider({ tripId, sharedToken, children }) {
  const storageKey = tripId ? `nuogo-trip-${tripId}` : null;
  const [trip, setTripState] = useState(() => {
    if (!storageKey) return null;
    const saved = sessionStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : null;
  });
  const [permission, setPermission] = useState("edit");
  const [loading, setLoading] = useState(!trip);
  const [error, setError] = useState("");

  const setTrip = useCallback((next) => {
    setTripState((current) => {
      const value = typeof next === "function" ? next(current) : next;
      if (value?.id) sessionStorage.setItem(`nuogo-trip-${value.id}`, JSON.stringify(value));
      return value;
    });
  }, []);

  useEffect(() => {
    if (trip || (!tripId && !sharedToken)) return;
    const path = sharedToken ? `/shared/${sharedToken}` : `/trips/${tripId}`;
    apiRequest(path)
      .then((body) => {
        setTrip(body.trip);
        if (body.permission) setPermission(body.permission);
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [sharedToken, setTrip, trip, tripId]);

  const value = useMemo(() => ({
    trip,
    setTrip,
    permission,
    loading,
    error
  }), [error, loading, permission, setTrip, trip]);

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const value = useContext(TripContext);
  if (!value) throw new Error("useTrip must be used inside TripProvider.");
  return value;
}
