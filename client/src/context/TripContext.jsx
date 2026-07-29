import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { getAuthToken } from "../api/authToken.js";
import { apiRequest } from "../api/client.js";

const TripContext = createContext(null);
const ownerFixtureAccess = { role: "owner", canEdit: true, isOwner: true };

function newerRevision(nextTrip, currentTrip) {
  if (!currentTrip) return true;
  return Number(nextTrip?.revision ?? -1) > Number(currentTrip?.revision ?? -1);
}

export function TripProvider({ tripId, sharedToken, children }) {
  const storageKey = tripId ? `nuogo-trip-${tripId}` : null;
  const [trip, setTripState] = useState(() => {
    if (!storageKey) return null;
    const saved = sessionStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : null;
  });
  const [access, setAccess] = useState(() => (
    import.meta.env.MODE === "test" && tripId && trip ? ownerFixtureAccess : null
  ));
  const [members, setMembers] = useState([]);
  const [permission, setPermission] = useState("view");
  const [loading, setLoading] = useState(
    !trip || Boolean(tripId && getAuthToken())
  );
  const [error, setError] = useState("");
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");

  const setTrip = useCallback((next) => {
    setTripState((current) => {
      const value = typeof next === "function" ? next(current) : next;
      if (value?.id) {
        sessionStorage.setItem(`nuogo-trip-${value.id}`, JSON.stringify(value));
      }
      return value;
    });
  }, []);

  const refreshTrip = useCallback(async ({ force = false, silent = false } = {}) => {
    if (!tripId && !sharedToken) return null;
    const path = sharedToken ? `/shared/${sharedToken}` : `/trips/${tripId}`;
    try {
      const body = await apiRequest(path);
      setTrip((current) => (
        force || newerRevision(body.trip, current) ? body.trip : current
      ));
      if (body.permission) setPermission(body.permission);
      if (body.access) setAccess(body.access);
      if (!silent) setError("");
      return body.trip;
    } catch (requestError) {
      if (!silent) setError(requestError.message);
      throw requestError;
    }
  }, [sharedToken, setTrip, tripId]);

  const refreshMembers = useCallback(async () => {
    if (!tripId || !getAuthToken()) {
      setMembers([]);
      return [];
    }
    setMembersLoading(true);
    setMembersError("");
    try {
      const body = await apiRequest(`/trips/${tripId}/members`);
      const nextMembers = body.members ?? [];
      setMembers(nextMembers);
      return nextMembers;
    } catch (requestError) {
      setMembersError(requestError.message);
      throw requestError;
    } finally {
      setMembersLoading(false);
    }
  }, [tripId]);

  const applyRevision = useCallback((revision) => {
    if (!Number.isInteger(revision)) return;
    setTrip((current) => (
      current && revision > Number(current.revision ?? -1)
        ? { ...current, revision }
        : current
    ));
  }, [setTrip]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!tripId && !sharedToken) {
        if (active) setLoading(false);
        return;
      }

      try {
        const authenticatedTrip = Boolean(tripId && getAuthToken());
        if (!trip || sharedToken || authenticatedTrip) {
          await refreshTrip({ force: !trip });
        }
        if (authenticatedTrip) await refreshMembers();
      } catch {
        // Individual refresh functions expose their own recoverable errors.
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [refreshMembers, refreshTrip, sharedToken, tripId]);

  useEffect(() => {
    if (!tripId || !getAuthToken()) return undefined;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refreshTrip({ silent: true }).catch(() => {});
    }, 20_000);
    return () => window.clearInterval(interval);
  }, [refreshTrip, tripId]);

  const value = useMemo(() => ({
    trip,
    setTrip,
    access,
    members,
    permission,
    loading,
    error,
    membersLoading,
    membersError,
    refreshTrip,
    refreshMembers,
    applyRevision
  }), [
    access,
    applyRevision,
    error,
    loading,
    members,
    membersError,
    membersLoading,
    permission,
    refreshMembers,
    refreshTrip,
    setTrip,
    trip
  ]);

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const value = useContext(TripContext);
  if (!value) throw new Error("useTrip must be used inside TripProvider.");
  return value;
}
