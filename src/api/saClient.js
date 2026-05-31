/**
 * saClient.js
 * Isolated Axios instance for Super Admin API calls.
 *
 * - Completely separate from the society client (different tokens, different keys)
 * - Access token in memory; refresh token in localStorage under SA-specific keys
 * - Auto-refresh on 401 with request queue (same pattern as client.js)
 * - Fires "sa:logout" event on forced logout so SAAuthContext can clear state
 */
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

// ─── SA Token Storage ─────────────────────────────────────────────────────────
// Separate namespace from society tokens — they can coexist in localStorage.
const SA_REFRESH_KEY = "sa_refresh_token";
const SA_USER_KEY    = "sa_user";

let _saAccessToken = null;

export const saTokenStorage = {
  getAccess:  ()      => _saAccessToken,
  setAccess:  (t)     => { _saAccessToken = t; },
  clearAccess:()      => { _saAccessToken = null; },

  getRefresh:  ()     => localStorage.getItem(SA_REFRESH_KEY),
  setRefresh:  (t)    => localStorage.setItem(SA_REFRESH_KEY, t),
  clearRefresh:()     => localStorage.removeItem(SA_REFRESH_KEY),

  getUser:  ()        => {
    try { return JSON.parse(localStorage.getItem(SA_USER_KEY)); } catch { return null; }
  },
  setUser:  (u)       => localStorage.setItem(SA_USER_KEY, JSON.stringify(u)),
  clearUser:()        => localStorage.removeItem(SA_USER_KEY),

  clearAll: ()        => {
    _saAccessToken = null;
    localStorage.removeItem(SA_REFRESH_KEY);
    localStorage.removeItem(SA_USER_KEY);
  },
};

// ─── Axios Instance ───────────────────────────────────────────────────────────
const saClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

// Attach SA access token to every request
saClient.interceptors.request.use(
  (config) => {
    const token = saTokenStorage.getAccess();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── 401 Auto-refresh ─────────────────────────────────────────────────────────
let _saRefreshing = false;
let _saQueue      = [];

const processQueue = (err, token = null) => {
  _saQueue.forEach(({ resolve, reject }) =>
    err ? reject(err) : resolve(token)
  );
  _saQueue = [];
};

saClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    const is401       = error.response?.status === 401;
    const isRetried   = original._saRetry;
    const isAuthRoute = original.url?.includes("/superadmin/auth/login") ||
                        original.url?.includes("/superadmin/auth/refresh");

    if (is401 && !isRetried && !isAuthRoute) {
      if (_saRefreshing) {
        return new Promise((resolve, reject) => {
          _saQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return saClient(original);
        });
      }

      original._saRetry = true;
      _saRefreshing     = true;

      const refresh = saTokenStorage.getRefresh();
      if (!refresh) {
        _saRefreshing = false;
        saTokenStorage.clearAll();
        window.dispatchEvent(new Event("sa:logout"));
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/superadmin/auth/refresh`, {
          refreshToken: refresh,
        });

        const newAccess  = data.data?.accessToken  ?? data.accessToken;
        const newRefresh = data.data?.refreshToken ?? data.refreshToken;

        saTokenStorage.setAccess(newAccess);
        saTokenStorage.setRefresh(newRefresh);

        processQueue(null, newAccess);
        original.headers.Authorization = `Bearer ${newAccess}`;
        return saClient(original);
      } catch (err) {
        processQueue(err, null);
        saTokenStorage.clearAll();
        window.dispatchEvent(new Event("sa:logout"));
        return Promise.reject(err);
      } finally {
        _saRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Unwrap standard API shape: { success, data, meta, message }
 */
export const unwrapSA = (response) => ({
  data:    response.data?.data    ?? response.data,
  meta:    response.data?.meta,
  message: response.data?.message,
});

export default saClient;