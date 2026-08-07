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

const AuthContext = createContext(null);

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
  const sessionRevision = useRef(0);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return undefined;

    let active = true;
    const revision = sessionRevision.current;
    apiRequest("/auth/me")
      .then((body) => {
        if (active && revision === sessionRevision.current) setUser(body.user);
      })
      .catch(() => {
        if (!active || revision !== sessionRevision.current) return;
        clearAuthToken();
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
    function handleTokenChange() {
      if (getAuthToken()) return;
      sessionRevision.current += 1;
      setUser(null);
      setReady(true);
    }

    window.addEventListener(AUTH_TOKEN_CHANGE_EVENT, handleTokenChange);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGE_EVENT, handleTokenChange);
  }, []);

  const establishSession = useCallback(async (request) => {
    const revision = sessionRevision.current + 1;
    sessionRevision.current = revision;
    setReady(false);
    try {
      const body = await request();
      if (revision === sessionRevision.current) {
        setAuthToken(body.token);
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
    setUser(null);
    setReady(true);
  }, []);

  const value = useMemo(() => ({
    user,
    ready,
    logout,
    login(email, password) {
      return establishSession(() => apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      }));
    },
    loginAsGuest() {
      return establishSession(() => apiRequest("/auth/guest", {
        method: "POST"
      }));
    },
    register(name, email, password) {
      return establishSession(() => apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
      }));
    }
  }), [establishSession, logout, ready, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
