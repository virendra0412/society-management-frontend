/**
 * SAComponents.jsx
 * Shared building blocks for the Super Admin portal.
 * Dark navy + teal-mint palette — visually distinct from society UI.
 */

// ─── SA Colour palette ────────────────────────────────────────────────────────
export const SA = {
  bg:      "#0B1929",
  surface: "#122236",
  card:    "#152840",
  border:  "#1E3A52",
  accent:  "#00C9A7",
  amber:   "#F4A228",
  red:     "#EF4444",
  green:   "#22C55E",
  blue:    "#3B82F6",
  purple:  "#8B5CF6",
  gray400: "#94A3B8",
  gray600: "#475569",
  white:   "#F1F5F9",
  text:    "#E2E8F0",
  textDim: "#94A3B8",
};

// ─── Status / plan colour maps ────────────────────────────────────────────────
export const PLAN_COLOR = {
  trial:      { bg: SA.amber  + "20", text: SA.amber,  label: "Trial"      },
  starter:    { bg: SA.blue   + "20", text: SA.blue,   label: "Starter"    },
  premium:    { bg: SA.purple + "20", text: SA.purple, label: "Premium"    },
  enterprise: { bg: SA.accent + "20", text: SA.accent, label: "Enterprise" },
};

export const SUB_STATUS_COLOR = {
  active:    { bg: SA.green + "20", text: SA.green,   dot: SA.green   },
  trial:     { bg: SA.amber + "20", text: SA.amber,   dot: SA.amber   },
  expired:   { bg: SA.red   + "20", text: SA.red,     dot: SA.red     },
  suspended: { bg: SA.gray600+"20", text: SA.gray400, dot: SA.gray400 },
};

export const APP_STATUS_COLOR = {
  pending:  { bg: SA.amber + "20", text: SA.amber, dot: SA.amber },
  approved: { bg: SA.green + "20", text: SA.green, dot: SA.green },
  rejected: { bg: SA.red   + "20", text: SA.red,   dot: SA.red   },
};

// ─── SABadge ──────────────────────────────────────────────────────────────────
export const SABadge = ({ label, bg, text, dot }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    background: bg, color: text, fontSize: 11, fontWeight: 700,
    padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap",
    fontFamily: "Plus Jakarta Sans",
  }}>
    {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0 }} />}
    {label}
  </span>
);

// ─── StatCard ─────────────────────────────────────────────────────────────────
export const StatCard = ({ icon, label, value, sub, color = SA.accent, loading }) => (
  <div style={{
    background: SA.surface, borderRadius: 14,
    padding: "18px 20px", border: `1px solid ${SA.border}`,
    flex: "1 1 140px", minWidth: 130,
  }}>
    <div style={{ fontSize: 26, marginBottom: 10 }}>{icon}</div>
    {loading
      ? <div style={{ height: 30, borderRadius: 6, background: SA.border, marginBottom: 6 }} />
      : <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "Syne", lineHeight: 1 }}>{value ?? "—"}</div>
    }
    <div style={{ fontSize: 12, color: SA.textDim, marginTop: 5 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: SA.gray400, marginTop: 2 }}>{sub}</div>}
  </div>
);

// ─── SACard ───────────────────────────────────────────────────────────────────
export const SACard = ({ children, style = {}, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: SA.surface, borderRadius: 14,
      padding: "14px 16px", border: `1px solid ${SA.border}`,
      cursor: onClick ? "pointer" : "default",
      transition: "border-color 0.15s",
      ...style,
    }}
    onMouseEnter={(e) => { if (onClick) e.currentTarget.style.borderColor = SA.accent + "60"; }}
    onMouseLeave={(e) => { if (onClick) e.currentTarget.style.borderColor = SA.border; }}
  >
    {children}
  </div>
);

// ─── SAInput ──────────────────────────────────────────────────────────────────
export const SAInput = ({
  label, value, onChange, placeholder,
  type = "text", error, disabled, multiline,
}) => (
  <div style={{ marginBottom: 14 }}>
    {label && <div style={{ fontSize: 12, fontWeight: 600, color: SA.textDim, marginBottom: 5 }}>{label}</div>}
    {multiline
      ? (
        <textarea
          value={value} onChange={onChange}
          placeholder={placeholder} disabled={disabled} rows={3}
          style={{
            width: "100%", background: SA.bg, border: `1.5px solid ${error ? SA.red : SA.border}`,
            borderRadius: 10, padding: "10px 12px", fontSize: 13,
            color: SA.text, outline: "none", fontFamily: "Plus Jakarta Sans",
            boxSizing: "border-box", resize: "vertical",
            opacity: disabled ? 0.5 : 1,
          }}
        />
      ) : (
        <input
          type={type} value={value} onChange={onChange}
          placeholder={placeholder} disabled={disabled}
          style={{
            width: "100%", background: SA.bg, border: `1.5px solid ${error ? SA.red : SA.border}`,
            borderRadius: 10, padding: "10px 12px", fontSize: 13,
            color: SA.text, outline: "none", fontFamily: "Plus Jakarta Sans",
            boxSizing: "border-box", opacity: disabled ? 0.5 : 1,
          }}
        />
      )
    }
    {error && <div style={{ fontSize: 11, color: SA.red, marginTop: 4 }}>{error}</div>}
  </div>
);

// ─── SABtn ────────────────────────────────────────────────────────────────────
export const SABtn = ({
  children, onClick, loading, disabled,
  variant = "primary", style = {},
}) => {
  const styles = {
    primary: { background: SA.accent,  color: SA.bg  },
    danger:  { background: SA.red,     color: "#fff" },
    ghost:   { background: SA.border,  color: SA.text },
    amber:   { background: SA.amber,   color: SA.bg  },
    blue:    { background: SA.blue,    color: "#fff" },
  };
  const s = styles[variant] ?? styles.primary;
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...s, border: "none", borderRadius: 10,
        padding: "9px 16px", fontSize: 12, fontWeight: 700,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        fontFamily: "Plus Jakarta Sans",
        opacity: (disabled && !loading) ? 0.6 : 1,
        display: "inline-flex", alignItems: "center", gap: 6,
        transition: "opacity 0.15s, transform 0.1s",
        ...style,
      }}
      onMouseDown={(e) => { if (!disabled && !loading) e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={(e)   => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {loading ? "…" : children}
    </button>
  );
};

// ─── SAModal ──────────────────────────────────────────────────────────────────
export const SAModal = ({ open, onClose, title, children, width = 480 }) => {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: SA.surface, borderRadius: 18,
          border: `1px solid ${SA.border}`,
          width: "100%", maxWidth: width,
          maxHeight: "90vh", overflowY: "auto",
          padding: "24px 24px",
        }}
      >
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 20,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: SA.white, fontFamily: "Syne" }}>
            {title}
          </div>
          <button
            onClick={onClose}
            style={{
              background: SA.border, border: "none", color: SA.text,
              width: 28, height: 28, borderRadius: "50%",
              cursor: "pointer", fontSize: 14, fontFamily: "Plus Jakarta Sans",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ─── SASpinner ────────────────────────────────────────────────────────────────
export const SASpinner = ({ size = 20 }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%",
    border: `2.5px solid ${SA.border}`,
    borderTopColor: SA.accent,
    animation: "sa-spin 0.7s linear infinite",
    display: "inline-block",
  }} />
);

// ─── SectionHeader ────────────────────────────────────────────────────────────
export const SectionHeader = ({ title, action }) => (
  <div style={{
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
  }}>
    <div style={{
      fontSize: 11, fontWeight: 700, color: SA.textDim,
      textTransform: "uppercase", letterSpacing: "0.09em",
    }}>
      {title}
    </div>
    {action}
  </div>
);

// ─── SAEmpty ─────────────────────────────────────────────────────────────────
export const SAEmpty = ({ icon = "📭", message }) => (
  <div style={{ textAlign: "center", padding: "40px 20px", color: SA.textDim }}>
    <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
    <div style={{ fontSize: 13 }}>{message}</div>
  </div>
);

// ─── SAError ──────────────────────────────────────────────────────────────────
export const SAError = ({ message, onRetry }) => (
  <div style={{ textAlign: "center", padding: "32px 20px" }}>
    <div style={{ fontSize: 30, marginBottom: 8 }}>⚠️</div>
    <div style={{ fontSize: 13, color: SA.red, marginBottom: 12 }}>{message}</div>
    {onRetry && (
      <button
        onClick={onRetry}
        style={{
          background: SA.border, color: SA.text, border: "none",
          borderRadius: 8, padding: "7px 14px",
          cursor: "pointer", fontSize: 12, fontFamily: "Plus Jakarta Sans",
        }}
      >
        Retry
      </button>
    )}
  </div>
);

// ─── SATable ──────────────────────────────────────────────────────────────────
// Lightweight table for SA data grids
export const SATable = ({ columns, rows, onRowClick }) => (
  <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} style={{
              padding: "10px 14px", textAlign: "left",
              fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
              textTransform: "uppercase", color: SA.textDim,
              borderBottom: `1px solid ${SA.border}`,
              whiteSpace: "nowrap",
            }}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr
            key={row._id ?? ri}
            onClick={() => onRowClick?.(row)}
            style={{
              cursor: onRowClick ? "pointer" : "default",
              borderBottom: `1px solid ${SA.border}`,
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => { if (onRowClick) e.currentTarget.style.background = SA.card; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {columns.map((col) => (
              <td key={col.key} style={{
                padding: "11px 14px", color: SA.text,
                verticalAlign: "middle", whiteSpace: "nowrap",
              }}>
                {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "—")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── FilterPills ──────────────────────────────────────────────────────────────
export const FilterPills = ({ options, active, onChange }) => (
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    {options.map((opt) => {
      const on = active === opt.value;
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: "5px 14px", borderRadius: 20,
            border: `1.5px solid ${on ? SA.accent : SA.border}`,
            background: on ? SA.accent + "20" : "transparent",
            color: on ? SA.accent : SA.textDim,
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            fontFamily: "Plus Jakarta Sans", transition: "all 0.15s",
          }}
        >
          {opt.label}
          {opt.count != null && (
            <span style={{
              marginLeft: 6, fontSize: 10, fontWeight: 700,
              background: on ? SA.accent + "30" : SA.border,
              padding: "1px 6px", borderRadius: 10,
            }}>
              {opt.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

// ─── Inject keyframe once ─────────────────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("sa-kf")) {
  const s = document.createElement("style");
  s.id = "sa-kf";
  s.textContent = "@keyframes sa-spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(s);
}