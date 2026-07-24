import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client.js";
import { clearAuthToken, getAuthToken, setAuthToken } from "../api/authToken.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setReady(true);
      return;
    }
    apiRequest("/auth/me")
      .then((body) => setUser(body.user))
      .catch(() => clearAuthToken())
      .finally(() => setReady(true));
  }, []);

  const value = useMemo(() => ({
    user,
    ready,
    async login(email, password) {
      const body = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setAuthToken(body.token);
      setUser(body.user);
      return body.user;
    },
    async loginAsGuest() {
      const body = await apiRequest("/auth/guest", {
        method: "POST"
      });
      setAuthToken(body.token);
      setUser(body.user);
      return body.user;
    },
    async register(name, email, password) {
      const body = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
      });
      setAuthToken(body.token);
      setUser(body.user);
      return body.user;
    },
    logout() {
      clearAuthToken();
      setUser(null);
    }
  }), [ready, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
