import { useState, useEffect, useCallback } from "react";
import { eventsApi } from "../../api/resources.api";
import { useToast }  from "../../context/ToastContext";
import { C, RSVP_STATUS_COLOR, RSVP_LABEL } from "../../constants/theme";
import { Avatar, Badge, Spinner, EmptyState, ErrorState } from "../../components/ui";

/**
 * AttendeeList
 *
 * Admin-only panel shown inside EventDetailView beneath the RSVP counts.
 * Fetches the full event (admin endpoint returns rsvps[] with resident details)
 * and renders a filterable list of every RSVP.
 *
 * Props:
 *   eventId — string
 */
export const AttendeeList = ({ eventId }) => {
  const toast  = useToast();
  const [rsvps,    setRsvps]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [filter,   setFilter]   = useState("all"); // "all" | "going" | "maybe" | "not_going"

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await eventsApi.getOne(eventId);
      // Admin endpoint returns full rsvps[] with populated resident field
      setRsvps(res.data?.event?.rsvps || []);
    } catch {
      setError("Failed to load attendees.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const counts = rsvps.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const shown = filter === "all" ? rsvps : rsvps.filter((r) => r.status === filter);

  return (
    <div style={{ marginTop: 4 }}>
      {/* Summary chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, overflowX: "auto" }}>
        {[
          { key: "all",       label: `All (${rsvps.length})`,         color: C.navy  },
          { key: "going",     label: `🎉 Going (${counts.going || 0})`,     color: "#065F46" },
          { key: "maybe",     label: `🤔 Maybe (${counts.maybe || 0})`,     color: "#92400E" },
          { key: "not_going", label: `😕 Not Going (${counts.not_going || 0})`, color: C.gray500 },
        ].map(({ key, label, color }) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: "5px 12px", borderRadius: 20, border: "none",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            fontFamily: "Plus Jakarta Sans", whiteSpace: "nowrap", flexShrink: 0,
            background: filter === key ? color : C.gray100,
            color:      filter === key ? "#fff" : C.gray500,
            transition: "all 0.15s",
          }}>
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
          <Spinner />
        </div>
      )}
      {error   && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && shown.length === 0 && (
        <EmptyState icon="🙈" message={filter === "all" ? "No RSVPs yet." : `No "${filter}" responses yet.`} />
      )}

      {!loading && !error && shown.map((r) => {
        const sc = RSVP_STATUS_COLOR[r.status] || {};
        const resident = r.resident || {};
        return (
          <div key={r._id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 0",
            borderBottom: `1px solid ${C.gray100}`,
          }}>
            <Avatar name={resident.name || "?"} size={36} color={C.teal} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                {resident.name || "Resident"}
              </div>
              <div style={{ fontSize: 11, color: C.gray500, marginTop: 1 }}>
                {[resident.flat, resident.wing].filter(Boolean).join(" · ")}
                {r.guestCount > 0 && ` · +${r.guestCount} guest${r.guestCount > 1 ? "s" : ""}`}
                {r.note && ` · "${r.note}"`}
              </div>
            </div>
            <Badge
              label={RSVP_LABEL[r.status] || r.status}
              bg={sc.bg} text={sc.text} dot={sc.dot}
            />
          </div>
        );
      })}
    </div>
  );
};
