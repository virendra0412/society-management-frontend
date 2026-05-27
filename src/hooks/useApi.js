import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Generic hook for async API calls.
 *
 * Usage:
 *   const { data, loading, error, execute } = useApi(issuesApi.getAll);
 *   useEffect(() => { execute({ status: "Open" }); }, []);
 *
 * @param {Function} apiFn  - Async function that calls the API
 * @param {Object}   opts
 * @param {boolean}  opts.immediate - Call immediately with initialArgs on mount
 * @param {any[]}    opts.initialArgs - Args to pass on immediate call
 */
export const useApi = (apiFn, { immediate = false, initialArgs = [] } = {}) => {
  const [data,    setData]    = useState(null);
  const [meta,    setMeta]    = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error,   setError]   = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(async (...args) => {
    if (!mountedRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiFn(...args);
      if (!mountedRef.current) return;
      setData(result.data);
      setMeta(result.meta ?? null);
      return result;
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err.response?.data?.message || err.message || "Something went wrong";
      setError(message);
      throw err;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [apiFn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (immediate) execute(...initialArgs);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, meta, loading, error, execute, setData };
};

/**
 * Convenience hook: runs immediately on mount and returns refetch.
 */
export const useFetch = (apiFn, args = [], deps = []) => {
  const { data, meta, loading, error, execute, setData } = useApi(apiFn);

  useEffect(() => {
    execute(...args);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, meta, loading, error, refetch: () => execute(...args), setData };
};
