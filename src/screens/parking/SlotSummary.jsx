/**
 * SlotSummary
 * Horizontal scrollable cards showing available / total count per slot type.
 * Data from: GET /parking/slots/summary
 *
 * Props:
 *   items   — array of { _id, total, available, assigned, blocked }
 *   loading — bool
 */
import { C, SLOT_TYPE_ICON, SLOT_TYPE_COLOR } from "../../constants/theme";

export const SlotSummary = ({ items = [], loading }) => {
  if (loading) {
    return (
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
        {[1, 2, 3].map((k) => (
          <div key={k} className="skeleton"
            style={{ minWidth: 90, height: 86, borderRadius: 14, flexShrink: 0 }} />
        ))}
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
      {items.map((s) => {
        const color   = SLOT_TYPE_COLOR[s._id] || C.teal;
        const icon    = SLOT_TYPE_ICON[s._id]  || "🅿️";
        const pct     = s.total > 0 ? s.assigned / s.total : 0;
        const barClr  = pct >= 1 ? C.red : pct > 0.7 ? C.amber : C.green;

        return (
          <div key={s._id} style={{
            minWidth: 94, flexShrink: 0, borderRadius: 14,
            background: color + "12",
            border: `1.5px solid ${color}25`,
            padding: "12px 10px", textAlign: "center",
          }}>
            <div style={{ fontSize: 22, marginBottom: 3 }}>{icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 6 }}>{s._id}</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "Syne", color, lineHeight: 1 }}>
              {s.available}
            </div>
            <div style={{ fontSize: 10, color: C.gray500, marginTop: 1 }}>
              of {s.total} free
            </div>
            {/* Fill bar */}
            <div style={{
              height: 4, borderRadius: 2, marginTop: 8,
              background: color + "25", overflow: "hidden",
            }}>
              <div style={{
                height: "100%", borderRadius: 2, background: barClr,
                width: `${Math.round(pct * 100)}%`,
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
