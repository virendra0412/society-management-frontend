/**
 * SAAuthContext.jsx
 * Super Admin session — fully isolated from society AuthContext.
 *
 * Provides: saUser, loading, isLogged, login, logout
 * Listens for "sa:logout" event dispatched by saClient on forced logout.
 */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { saAuthApi }      from "../api/sa.api";
import { saTokenStorage } from "../api/saClient";

const SAAuthContext = createContext(null);

export const SAAuthProvider = ({ children }) => {
  const [saUser,  setSaUser]  = useState(() => saTokenStorage.getUser());
  const [loading, setLoading] = useState(true);

  // ── Restore session on mount ───────────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      const refresh = saTokenStorage.getRefresh();
      if (!refresh) { setLoading(false); return; }
      try {
        const refreshRes = await saAuthApi.refresh(refresh);
        saTokenStorage.setAccess(refreshRes.data?.accessToken ?? refreshRes.accessToken);
        saTokenStorage.setRefresh(refreshRes.data?.refreshToken ?? refreshRes.refreshToken);
        const meRes  = await saAuthApi.me();
        const fresh  = meRes.data?.superAdmin ?? meRes.data?.user ?? meRes.data;
        setSaUser(fresh);
        saTokenStorage.setUser(fresh);
      } catch {
        saTokenStorage.clearAll();
        setSaUser(null);
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  // ── Listen for interceptor-triggered logout ────────────────────────────────
  useEffect(() => {
    const handle = () => { setSaUser(null); saTokenStorage.clearAll(); };
    window.addEventListener("sa:logout", handle);
    return () => window.removeEventListener("sa:logout", handle);
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const login = useCallback(async ({ email, password }) => {
    const res = await saAuthApi.login({ email, password });
    const d   = res.data ?? res;
    saTokenStorage.setAccess(d.accessToken);
    saTokenStorage.setRefresh(d.refreshToken);
    const sa = d.superAdmin ?? d.user ?? d;
    saTokenStorage.setUser(sa);
    setSaUser(sa);
    return sa;
  }, []);

  const logout = useCallback(async () => {
    try { await saAuthApi.logout(); } catch { /* ignore — always clear locally */ }
    saTokenStorage.clearAll();
    setSaUser(null);
  }, []);

  return (
    <SAAuthContext.Provider value={{ saUser, loading, isLogged: !!saUser, login, logout }}>
      {children}
    </SAAuthContext.Provider>
  );
};

export const useSAAuth = () => {
  const ctx = useContext(SAAuthContext);
  if (!ctx) throw new Error("useSAAuth must be inside <SAAuthProvider>");
  return ctx;
};