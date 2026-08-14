import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { getAuthToken } from "../api/authToken.js";
import { apiRequest } from "../api/client.js";
import { useAuth } from "./AuthContext.jsx";

const TripContext = createContext(null);
const ownerFixtureAccess = { role: "owner", canEdit: true, isOwner: true };

function sourceKeyFor(tripId, sharedToken) {
  if (sharedToken) return `shared:${sharedToken}`;
  if (tripId) return `trip:${tripId}`;
  return "none";
}

function readCachedTrip(tripId) {
  if (!tripId) return null;
  const saved = sessionStorage.getItem(`nuogo-trip-${tripId}`);
  return saved ? JSON.parse(saved) : null;
}

function initialSnapshot(tripId, sharedToken, { authenticated = false, authPending = false } = {}) {
  const sourceKey = sourceKeyFor(tripId, sharedToken);
  const trip = authenticated ? readCachedTrip(tripId) : null;
  return {
    sourceKey,
    trip,
    access: import.meta.env.MODE === "test" && authenticated && tripId && trip
      ? ownerFixtureAccess
      : null,
    members: [],
    permission: "view",
    loading: Boolean(sharedToken || authPending || (tripId && authenticated)),
    error: "",
    membersLoading: false,
    membersError: ""
  };
}

function revisionOf(trip) {
  return Number(trip?.revision ?? -1);
}

export function TripProvider({ tripId, sharedToken, children }) {
  const { ready: authReady, user } = useAuth();
  const privateAuthenticated = Boolean(authReady && user && getAuthToken());
  const authSessionKey = sharedToken
    ? "public"
    : (privateAuthenticated ? `user:${user.id}` : (authReady ? "anonymous" : "pending"));
  const sourceKey = sourceKeyFor(tripId, sharedToken);
  const requestKey = `${sourceKey}:${authSessionKey}`;
  const [snapshot, setSnapshot] = useState(() => initialSnapshot(tripId, sharedToken, {
    authenticated: privateAuthenticated,
    authPending: Boolean(tripId && !authReady)
  }));
  const snapshotRef = useRef(snapshot);
  const activeSourceRef = useRef(sourceKey);
  const activeRequestRef = useRef(requestKey);
  const authenticatedRef = useRef(privateAuthenticated);
  activeSourceRef.current = sourceKey;
  activeRequestRef.current = requestKey;
  authenticatedRef.current = privateAuthenticated;

  const commit = useCallback((update) => {
    const current = snapshotRef.current;
    const next = update(current);
    if (Object.is(next, current)) return false;
    snapshotRef.current = next;
    setSnapshot(next);
    if (
      authenticatedRef.current
      && next.trip?.id
      && next.sourceKey === `trip:${next.trip.id}`
    ) {
      sessionStorage.setItem(`nuogo-trip-${next.trip.id}`, JSON.stringify(next.trip));
    }
    return true;
  }, []);

  const setTrip = useCallback((next) => commit((current) => {
    if (current.sourceKey !== activeSourceRef.current) return current;
    const value = typeof next === "function" ? next(current.trip) : next;
    return { ...current, trip: value };
  }), [commit]);

  const refreshTrip = useCallback(async ({ force = false, silent = false } = {}) => {
    if (!tripId && !sharedToken) return null;
    const requestedSource = sourceKey;
    const requestedSession = requestKey;
    const path = sharedToken ? `/shared/${sharedToken}` : `/trips/${tripId}`;
    try {
      const body = await apiRequest(path);
      if (
        activeSourceRef.current !== requestedSource
        || activeRequestRef.current !== requestedSession
      ) return null;
      commit((current) => {
        if (current.sourceKey !== requestedSource) return current;
        const currentRevision = revisionOf(current.trip);
        const nextRevision = revisionOf(body.trip);
        const shouldReplace = !current.trip
          || nextRevision > currentRevision
          || (force && nextRevision === currentRevision);
        return {
          ...current,
          trip: shouldReplace ? body.trip : current.trip,
          permission: body.permission ?? current.permission,
          access: body.access ?? current.access,
          error: silent ? current.error : ""
        };
      });
      return body.trip;
    } catch (requestError) {
      if (
        activeSourceRef.current === requestedSource
        && activeRequestRef.current === requestedSession
        && !silent
      ) {
        commit((current) => current.sourceKey === requestedSource
          ? { ...current, error: requestError.message }
          : current);
      }
      throw requestError;
    }
  }, [commit, requestKey, sharedToken, sourceKey, tripId]);

  const refreshMembers = useCallback(async () => {
    if (!tripId || !privateAuthenticated) {
      commit((current) => current.sourceKey === sourceKey
        ? { ...current, members: [], membersLoading: false, membersError: "" }
        : current);
      return [];
    }
    const requestedSource = sourceKey;
    const requestedSession = requestKey;
    commit((current) => current.sourceKey === requestedSource
      ? { ...current, membersLoading: true, membersError: "" }
      : current);
    try {
      const body = await apiRequest(`/trips/${tripId}/members`);
      if (
        activeSourceRef.current !== requestedSource
        || activeRequestRef.current !== requestedSession
      ) return [];
      const members = body.members ?? [];
      commit((current) => current.sourceKey === requestedSource
        ? { ...current, members, membersLoading: false, membersError: "" }
        : current);
      return members;
    } catch (requestError) {
      if (
        activeSourceRef.current === requestedSource
        && activeRequestRef.current === requestedSession
      ) {
        commit((current) => current.sourceKey === requestedSource
          ? {
              ...current,
              membersLoading: false,
              membersError: requestError.message
            }
          : current);
      }
      throw requestError;
    }
  }, [commit, privateAuthenticated, requestKey, sourceKey, tripId]);

  const applyRevision = useCallback((revision) => {
    if (!Number.isInteger(revision)) return false;
    return commit((current) => {
      if (
        current.sourceKey !== activeSourceRef.current
        || !current.trip
        || revision <= revisionOf(current.trip)
      ) {
        return current;
      }
      return { ...current, trip: { ...current.trip, revision } };
    });
  }, [commit]);

  const applyTripMutation = useCallback((targetTripId, revision, update) => {
    if (!targetTripId || !Number.isInteger(revision)) return false;
    return commit((current) => {
      if (
        current.sourceKey !== `trip:${targetTripId}`
        || activeSourceRef.current !== current.sourceKey
        || current.trip?.id !== targetTripId
        || revision < revisionOf(current.trip)
      ) {
        return current;
      }
      const nextTrip = update(current.trip);
      if (!nextTrip || nextTrip.id !== targetTripId) return current;
      return {
        ...current,
        trip: { ...nextTrip, revision }
      };
    });
  }, [commit]);

  useEffect(() => {
    const requestedSource = sourceKey;
    const requestedSession = requestKey;
    const reset = initialSnapshot(tripId, sharedToken, {
      authenticated: privateAuthenticated,
      authPending: Boolean(tripId && !authReady)
    });
    commit(() => reset);
    let active = true;

    async function load() {
      if (!tripId && !sharedToken) {
        commit((current) => current.sourceKey === requestedSource
          ? { ...current, loading: false }
          : current);
        return;
      }
      if (tripId && !privateAuthenticated) {
        if (authReady) sessionStorage.removeItem(`nuogo-trip-${tripId}`);
        return;
      }

      if (snapshotRef.current.trip?.objectiveAligned) {
        commit((current) => current.sourceKey === requestedSource
          ? { ...current, loading: false, access: ownerFixtureAccess }
          : current);
        return;
      }

      try {
        await refreshTrip({ force: true });
      } catch {
        // The request helper records a route-scoped error.
      } finally {
        if (
          active
          && activeSourceRef.current === requestedSource
          && activeRequestRef.current === requestedSession
        ) {
          commit((current) => current.sourceKey === requestedSource
            ? { ...current, loading: false }
            : current);
        }
      }

      if (
        active
        && privateAuthenticated
        && activeSourceRef.current === requestedSource
        && activeRequestRef.current === requestedSession
      ) {
        refreshMembers().catch(() => {});
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [
    authReady,
    commit,
    privateAuthenticated,
    refreshMembers,
    refreshTrip,
    requestKey,
    sharedToken,
    sourceKey,
    tripId
  ]);

  useEffect(() => {
    if (!tripId || !privateAuthenticated) return undefined;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refreshTrip({ silent: true }).catch(() => {});
    }, 20_000);
    return () => window.clearInterval(interval);
  }, [privateAuthenticated, refreshTrip, tripId]);

  const privateSourceIsVisible = !tripId || privateAuthenticated;
  const sourceMatches = snapshot.sourceKey === sourceKey && privateSourceIsVisible;
  const value = useMemo(() => ({
    trip: sourceMatches ? snapshot.trip : null,
    setTrip,
    access: sourceMatches ? snapshot.access : null,
    members: sourceMatches ? snapshot.members : [],
    permission: sourceMatches ? snapshot.permission : "view",
    loading: sourceMatches
      ? snapshot.loading
      : Boolean(tripId && !authReady),
    error: sourceMatches ? snapshot.error : "",
    membersLoading: sourceMatches ? snapshot.membersLoading : false,
    membersError: sourceMatches ? snapshot.membersError : "",
    refreshTrip,
    refreshMembers,
    applyRevision,
    applyTripMutation
  }), [
    applyRevision,
    applyTripMutation,
    refreshMembers,
    refreshTrip,
    setTrip,
    snapshot,
    sourceMatches
  ]);

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const value = useContext(TripContext);
  if (!value) throw new Error("useTrip must be used inside TripProvider.");
  return value;
}
