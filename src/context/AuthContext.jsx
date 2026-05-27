import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi } from "../api/auth.api";
import { tokenStorage } from "../utils/storage";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Seed from localStorage for instant render while we re-validate with server
  const [user,    setUser]    = useState(() => tokenStorage.getUser());
  const [loading, setLoading] = useState(true); // true until initial auth check done

  // ─── Silent auth restore on page load ──────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      const refreshToken = tokenStorage.getRefresh();
      if (!refreshToken) {
        setLoading(false);
        return;
      }
      try {
        // Attempt to get fresh access token using stored refresh token
        const { data } = await authApi.refreshToken(refreshToken);
        tokenStorage.setAccess(data.accessToken);
        tokenStorage.setRefresh(data.refreshToken);

        // Fetch up-to-date user profile
        const meRes = await authApi.getMe();
        const freshUser = meRes.data.user;
        setUser(freshUser);
        tokenStorage.setUser(freshUser);
      } catch {
        // Refresh token expired or invalid — clear everything
        tokenStorage.clearAll();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  // ─── Listen for forced logout from axios interceptor ───────────────────────
  useEffect(() => {
    const handleForceLogout = () => {
      setUser(null);
      tokenStorage.clearAll();
    };
    window.addEventListener("auth:logout", handleForceLogout);
    return () => window.removeEventListener("auth:logout", handleForceLogout);
  }, []);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const login = useCallback(async ({ email, password }) => {
    const { data } = await authApi.login({ email, password });
    tokenStorage.setAccess(data.accessToken);
    tokenStorage.setRefresh(data.refreshToken);
    tokenStorage.setUser(data.user);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await authApi.register(payload);
    tokenStorage.setAccess(data.accessToken);
    tokenStorage.setRefresh(data.refreshToken);
    tokenStorage.setUser(data.user);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    tokenStorage.clearAll();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await authApi.getMe();
    const fresh = data.user;
    setUser(fresh);
    tokenStorage.setUser(fresh);
    return fresh;
  }, []);

  const isAdmin  = user?.role === "admin";
  const isLogged = !!user;

  return (
    <AuthContext.Provider value={{ user, loading, isLogged, isAdmin, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
