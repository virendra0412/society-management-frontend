import { createContext, useContext, useState, useCallback } from "react";
import { C } from "../constants/theme";

const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: { bg: C.green,  icon: "✓" },
  error:   { bg: C.red,    icon: "✕" },
  info:    { bg: C.teal,   icon: "ℹ" },
  warning: { bg: C.amber,  icon: "⚠" },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const toast = {
    success: (msg)  => addToast(msg, "success"),
    error:   (msg)  => addToast(msg, "error", 5000),
    info:    (msg)  => addToast(msg, "info"),
    warning: (msg)  => addToast(msg, "warning"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div style={{
        position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
        width: "calc(100% - 32px)", maxWidth: 448, zIndex: 999,
        display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none",
      }}>
        {toasts.map((t) => {
          const s = TOAST_STYLES[t.type] || TOAST_STYLES.info;
          return (
            <div key={t.id} style={{
              background: s.bg, color: "#fff", borderRadius: 12,
              padding: "12px 16px", fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 10,
              boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
              animation: "toastIn 0.25s ease forwards",
              fontFamily: "Plus Jakarta Sans",
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
};
