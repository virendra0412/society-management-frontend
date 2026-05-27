/**
 * SlotList
 * Filterable list of all parking slots.
 * Data from: GET /parking/slots
 *
 * Props:
 *   slots   — array of slot objects
 *   loading — bool
 */
import { useState } from "react";
import { C, SLOT_TYPES, SLOT_TYPE_COLOR, SLOT_STATUS_COLOR } from "../../constants/theme";
import { EmptyState } from "../../components/ui";
import { SlotCard } from "./SlotCard";

export const SlotList = ({ slots = [], loading, isAdmin = false, onReleased }) => {
  const [typeFilter,   setTypeFilter]   = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const shown = slots.filter((s) => {
    const okType   = typeFilter   === "All" || s.type   === typeFilter;
    const okStatus = statusFilter === "All" || s.status === statusFilter;
    return okType && okStatus;
  });

  return (
    <div>
      {/* Type filter */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 8, paddingBottom: 2 }}>
        {["All", ...SLOT_TYPES].map((t) => {
          const active = typeFilter === t;
          const clr    = t === "All" ? C.navy : SLOT_TYPE_COLOR[t] || C.teal;
          return (
            <button key={t} onClick={() => setTypeFilter(t)} style={{
              padding: "5px 12px", borderRadius: 20, border: "none", flexShrink: 0,
              fontSize: 11, fontWeight: 700, cursor: "pointer",
              fontFamily: "Plus Jakarta Sans",
              background: active ? clr : clr + "15",
              color:      active ? "#fff" : clr,
              transition: "all 0.15s",
            }}>
              {t}
            </button>
          );
        })}
      </div>

      {/* Status filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {["All", "available", "assigned", "blocked"].map((s) => {
          const active = statusFilter === s;
          const sc     = SLOT_STATUS_COLOR[s] || {};
          return (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: "4px 10px", borderRadius: 20, border: "none", flexShrink: 0,
              fontSize: 11, fontWeight: 600, cursor: "pointer",
              fontFamily: "Plus Jakarta Sans",
              background: active ? (sc.dot || C.navy) : C.gray100,
              color:      active ? "#fff" : C.gray500,
              transition: "all 0.15s",
            }}>
              {s === "All" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          );
        })}
      </div>

      {/* Skeleton */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3, 4, 5].map((k) => (
            <div key={k} className="skeleton" style={{ height: 56, borderRadius: 12 }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && shown.length === 0 && (
        <EmptyState icon="🅿️" message="No slots match your filter." />
      )}

      {/* List */}
      {!loading && shown.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {shown.map((slot) => (
            <SlotCard
              key={slot._id}
              slot={slot}
              isAdmin={isAdmin}
              onReleased={onReleased}
            />
          ))}
        </div>
      )}
    </div>
  );
};
