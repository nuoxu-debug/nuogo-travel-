import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { apiRequest } from "../api/client.js";
import {
  AUTH_TOKEN_CHANGE_EVENT,
  clearAuthToken,
  getAuthToken,
  setAuthToken
} from "../api/authToken.js";
import { clearAttractionDraft } from "../planning/attractionDraft.js";

const AuthContext = createContext(null);

function clearSavedTripCache() {
  for (const key of Object.keys(sessionStorage)) {
    if (!key.startsWith("nuogo-trip-")) continue;
    try {
      if (JSON.parse(sessionStorage.getItem(key))?.persistenceScope === "PREVIEW") continue;
    } catch {
      // Invalid cached trips are discarded with private saved trips.
    }
    sessionStorage.removeItem(key);
  }
}

export function safeReturnTo(value) {
  if (typeof value !== "string") return "/planner";

  const candidate = value.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return "/planner";

  try {
    let decoded = candidate;
    for (let pass = 0; pass < 2; pass += 1) {
      decoded = decodeURIComponent(decoded);
      if (
        decoded.startsWith("//")
        || decoded.includes("\\")
        // eslint-disable-next-line no-control-regex -- reject decoded control characters in return URLs
        || /[\u0000-\u001f\u007f]/.test(decoded)
      ) {
        return "/planner";
      }
    }
  } catch {
    return "/planner";
  }

  return candidate;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(() => !getAuthToken());
  const [sessionReason, setSessionReason] = useState(null);
  const sessionRevision = useRef(0);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      clearSavedTripCache();
      return undefined;
    }

    let active = true;
    const revision = sessionRevision.current;
    apiRequest("/auth/me")
      .then((body) => {
        if (active && revision === sessionRevision.current) setUser(body.user);
      })
      .catch(() => {
        if (!active || revision !== sessionRevision.current) return;
        setUser(null);
      })
      .finally(() => {
        if (active && revision === sessionRevision.current) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleStorageChange(event) {
      if (event.storageArea !== localStorage || (event.key !== "nuogo-token" && event.key !== null)) return;
      const revision = ++sessionRevision.current;
      clearSavedTripCache();
      setUser(null);
      setSessionReason(null);
      const token = getAuthToken();
      setReady(!token);
      if (!token) return;
      apiRequest("/auth/me")
        .then((body) => { if (revision === sessionRevision.current) setUser(body.user); })
        .catch(() => {})
        .finally(() => { if (revision === sessionRevision.current) setReady(true); });
    }

    function handleTokenChange(event) {
      if (getAuthToken()) return;
      sessionRevision.current += 1;
      setSessionReason(event.detail?.reason === "expired" ? "expired" : null);
      setUser(null);
      setReady(true);
    }

    window.addEventListener(AUTH_TOKEN_CHANGE_EVENT, handleTokenChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener(AUTH_TOKEN_CHANGE_EVENT, handleTokenChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const establishSession = useCallback(async (request) => {
    const revision = sessionRevision.current + 1;
    sessionRevision.current = revision;
    setReady(false);
    try {
      const body = await request();
      if (revision === sessionRevision.current) {
        clearSavedTripCache();
        setSessionReason(null);
        setAuthToken(body.token, { guest: body.user.accountType === "GUEST" });
        setUser(body.user);
      }
      return body.user;
    } finally {
      if (revision === sessionRevision.current) setReady(true);
    }
  }, []);

  const logout = useCallback(() => {
    sessionRevision.current += 1;
    clearAuthToken();
    clearAttractionDraft();
    setSessionReason(null);
    setUser(null);
    setReady(true);
  }, []);

  const value = useMemo(() => ({
    user,
    ready,
    sessionReason,
    logout,
    login(email, password) {
      return establishSession(() => apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      }));
    },
    register(name, email, password) {
      return establishSession(() => apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
      }));
    }
  }), [establishSession, logout, ready, sessionReason, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
