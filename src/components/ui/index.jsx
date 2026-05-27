import { C } from "../../constants/theme";

// ─── Badge ────────────────────────────────────────────────────────────────────
export const Badge = ({ label, bg, text, dot }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    background: bg, color: text, fontSize: 11, fontWeight: 600,
    padding: "3px 8px", borderRadius: 20, fontFamily: "Plus Jakarta Sans",
    whiteSpace: "nowrap",
  }}>
    {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, display: "inline-block", flexShrink: 0 }} />}
    {label}
  </span>
);

// ─── Tag ──────────────────────────────────────────────────────────────────────
export const Tag = ({ label, color }) => (
  <span style={{
    background: color + "20", color, fontSize: 10, fontWeight: 700,
    padding: "2px 7px", borderRadius: 4, letterSpacing: "0.05em",
    textTransform: "uppercase", whiteSpace: "nowrap",
  }}>
    {label}
  </span>
);

// ─── Avatar ───────────────────────────────────────────────────────────────────
export const Avatar = ({ name = "?", size = 32, color = C.teal }) => {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color + "22", color, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700,
    }}>
      {initials}
    </div>
  );
};

// ─── Card ─────────────────────────────────────────────────────────────────────
export const Card = ({ children, style = {}, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: C.card, borderRadius: 14,
      padding: "14px 16px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
      cursor: onClick ? "pointer" : "default",
      transition: "transform 0.12s, box-shadow 0.12s",
      ...style,
    }}
    onMouseEnter={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
      }
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)";
    }}
  >
    {children}
  </div>
);

// ─── Input ────────────────────────────────────────────────────────────────────
export const Input = ({
  label, value, onChange, placeholder,
  type = "text", multiline = false, error, disabled = false,
}) => (
  <div style={{ marginBottom: 14 }}>
    {label && (
      <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700, marginBottom: 5 }}>
        {label}
      </div>
    )}
    {multiline ? (
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
        style={{
          width: "100%", border: `1.5px solid ${error ? C.red : C.gray100}`,
          borderRadius: 10, padding: "10px 12px", fontSize: 14,
          fontFamily: "Plus Jakarta Sans", color: C.text, outline: "none",
          resize: "none", background: disabled ? C.gray50 : C.gray50,
          boxSizing: "border-box", opacity: disabled ? 0.6 : 1,
        }}
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: "100%", border: `1.5px solid ${error ? C.red : C.gray100}`,
          borderRadius: 10, padding: "10px 12px", fontSize: 14,
          fontFamily: "Plus Jakarta Sans", color: C.text, outline: "none",
          background: C.gray50, boxSizing: "border-box",
          opacity: disabled ? 0.6 : 1,
        }}
      />
    )}
    {error && (
      <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>{error}</div>
    )}
  </div>
);

// ─── Select ───────────────────────────────────────────────────────────────────
export const Select = ({ label, value, onChange, options, disabled = false }) => (
  <div style={{ marginBottom: 14 }}>
    {label && (
      <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700, marginBottom: 5 }}>
        {label}
      </div>
    )}
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      style={{
        width: "100%", border: `1.5px solid ${C.gray100}`,
        borderRadius: 10, padding: "10px 12px", fontSize: 14,
        fontFamily: "Plus Jakarta Sans", color: C.text,
        outline: "none", background: C.gray50,
        boxSizing: "border-box", appearance: "none",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {options.map((o) =>
        typeof o === "string"
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
  </div>
);

// ─── Btn ──────────────────────────────────────────────────────────────────────
const BTN_VARIANTS = {
  primary: { background: C.teal,  color: "#fff" },
  amber:   { background: C.amber, color: "#fff" },
  red:     { background: C.red,   color: "#fff" },
  outline: { background: "transparent", color: C.teal, border: `1.5px solid ${C.teal}` },
  ghost:   { background: C.gray100, color: C.gray700 },
};

export const Btn = ({
  children, onClick, variant = "primary",
  small = false, loading = false, disabled = false, style = {},
}) => {
  const sizes = small
    ? { padding: "7px 14px", fontSize: 13 }
    : { padding: "12px 20px", fontSize: 15 };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        gap: 6, fontFamily: "Plus Jakarta Sans", fontWeight: 700,
        borderRadius: 10, border: "none", cursor: disabled || loading ? "not-allowed" : "pointer",
        transition: "all 0.15s", opacity: disabled || loading ? 0.65 : 1,
        ...sizes, ...BTN_VARIANTS[variant], ...style,
      }}
    >
      {loading ? <Spinner size={14} color="currentColor" /> : children}
    </button>
  );
};

// ─── Spinner ──────────────────────────────────────────────────────────────────
export const Spinner = ({ size = 20, color = C.teal }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%", flexShrink: 0,
    border: `2px solid ${color}30`,
    borderTopColor: color,
    animation: "spin 0.7s linear infinite",
  }} />
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export const Skeleton = ({ height = 60, borderRadius = 14, style = {} }) => (
  <div className="skeleton" style={{ height, borderRadius, ...style }} />
);

// ─── Modal ────────────────────────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(15,32,64,0.5)",
        zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.card, borderRadius: "20px 20px 0 0",
          width: "100%", maxWidth: 480, maxHeight: "92vh",
          overflow: "auto", padding: "20px 20px 36px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "Syne", color: C.navy }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: C.gray500, lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────
export const EmptyState = ({ icon = "📭", message = "Nothing here yet." }) => (
  <div style={{ textAlign: "center", padding: "48px 0", color: C.gray500 }}>
    <div style={{ fontSize: 40, marginBottom: 10 }}>{icon}</div>
    <div style={{ fontSize: 14, fontWeight: 500 }}>{message}</div>
  </div>
);

// ─── Error State ──────────────────────────────────────────────────────────────
export const ErrorState = ({ message, onRetry }) => (
  <div style={{ textAlign: "center", padding: "40px 16px", color: C.gray500 }}>
    <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
    <div style={{ fontSize: 14, color: C.red, marginBottom: 16 }}>{message}</div>
    {onRetry && (
      <Btn small variant="outline" onClick={onRetry}>Try again</Btn>
    )}
  </div>
);

// ─── Page Header ──────────────────────────────────────────────────────────────
export const PageHeader = ({ title, action }) => (
  <div style={{
    padding: "16px 16px 0",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14,
  }}>
    <h2 style={{ margin: 0, fontFamily: "Syne", fontSize: 22, color: C.navy }}>{title}</h2>
    {action}
  </div>
);
