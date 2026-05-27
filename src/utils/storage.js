// Access token lives only in memory for XSS protection.
// Refresh token lives in localStorage (acceptable for SPAs without httpOnly cookie support).

const REFRESH_KEY = "society_refresh_token";
const USER_KEY    = "society_user";

// ─── In-memory store (reset on page reload → forces silent refresh via stored refresh token) ──
let _accessToken = null;

export const tokenStorage = {
  getAccess:  ()      => _accessToken,
  setAccess:  (token) => { _accessToken = token; },
  clearAccess:()      => { _accessToken = null; },

  getRefresh:  ()      => localStorage.getItem(REFRESH_KEY),
  setRefresh:  (token) => localStorage.setItem(REFRESH_KEY, token),
  clearRefresh:()      => localStorage.removeItem(REFRESH_KEY),

  // Persist minimal user info for instant UI render before re-auth
  getUser:  ()     => { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } },
  setUser:  (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  clearUser:()     => localStorage.removeItem(USER_KEY),

  clearAll: () => {
    _accessToken = null;
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
