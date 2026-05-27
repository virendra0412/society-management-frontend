import axios from "axios";
import { tokenStorage } from "../utils/storage";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
// Attach access token to every outgoing request
client.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccess();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────────────────────
// On 401 → attempt silent refresh → retry original request once
let _isRefreshing   = false;
let _refreshQueue   = []; // Pending requests waiting for refresh

const processQueue = (error, token = null) => {
  _refreshQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  _refreshQueue = [];
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only attempt refresh on 401 and only once per request (_retry flag)
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes("/auth/refresh-token") &&
      !original.url?.includes("/auth/login")
    ) {
      // If a refresh is already in-flight, queue this request
      if (_isRefreshing) {
        return new Promise((resolve, reject) => {
          _refreshQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return client(original);
        });
      }

      original._retry  = true;
      _isRefreshing    = true;

      const refreshToken = tokenStorage.getRefresh();
      if (!refreshToken) {
        _isRefreshing = false;
        tokenStorage.clearAll();
        window.dispatchEvent(new Event("auth:logout"));
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefresh } = data.data;
        tokenStorage.setAccess(accessToken);
        tokenStorage.setRefresh(newRefresh);

        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return client(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStorage.clearAll();
        window.dispatchEvent(new Event("auth:logout"));
        return Promise.reject(refreshError);
      } finally {
        _isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Unwrap the standard API response shape { success, data, meta, message }.
 * Returns { data, meta } on success; throws on failure.
 */
export const unwrap = (response) => ({
  data: response.data.data,
  meta: response.data.meta,
  message: response.data.message,
});

export default client;
