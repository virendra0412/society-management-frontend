/**
 * MyRequests
 * Resident's own parking request history with a status timeline.
 * Calls: GET /parking/requests/mine
 *        PATCH /parking/requests/:id/cancel
 *
 * Props:
 *   refreshKey — increment to trigger a re-fetch (e.g. after new request)
 */
import { useState, useEffect, useCallback } from "react";
import { parkingApi }  from "../../api/resources.api";
import { useToast }    from "../../context/ToastContext";
import {
  C, SLOT_TYPE_ICON, SLOT_TYPE_COLOR, REQUEST_STATUS_COLOR,
} from "../../constants/theme";
import { Badge, Spinner, EmptyState, ErrorState } from "../../components/ui";
import { timeAgo } from "../../utils/timeago";

// ─── Small timeline dot row ────────────────────────────────────────────────────
const TimelineDot = ({ label, date, done, color = C.teal }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{
      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
      background: done ? color : C.gray200,
    }} />
    <span style={{
      fontSize: 11, fontWeight: done ? 600 : 400,
      color: done ? color : C.gray400,
    }}>
      {label}{date ? ` · ${timeAgo(date)}` : ""}
    </span>
  </div>
);

export const MyRequests = ({ refreshKey = 0 }) => {
  const toast = useToast();
  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [cancelling, setCancelling] = useState(null); // reqId being cancelled

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await parkingApi.getMyRequests();
      setRequests(res.data?.requests || []);
    } catch {
      setError("Failed to load your requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch whenever refreshKey changes
  useEffect(() => { load(); }, [load, refreshKey]);

  const handleCancel = async (reqId) => {
    setCancelling(reqId);
    try {
      const res = await parkingApi.cancelRequest(reqId);
      // Update in-place so the list refreshes without a full reload
      setRequests((prev) =>
        prev.map((r) => r._id === reqId ? (res.data?.request || { ...r, status: "cancelled" }) : r)
      );
      toast.success("Request cancelled.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Cancel failed.");
    } finally {
      setCancelling(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
        <Spinner size={28} />
      </div>
    );
  }
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!requests.length) {
    return (
      <EmptyState
        icon="🅿️"
        message="No parking requests yet."
        sub="Tap '+ Request Slot' above to apply for a slot."
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {requests.map((req) => {
        const slotClr = SLOT_TYPE_COLOR[req.slotType]    || C.teal;
        const slotIco = SLOT_TYPE_ICON[req.slotType]     || "🅿️";
        const sc      = REQUEST_STATUS_COLOR[req.status] || {};
        const isBusy  = cancelling === req._id;

        return (
          <div key={req._id} style={{
            background: "#fff", borderRadius: 14, padding: 14,
            border: `1px solid ${C.gray100}`,
          }}>
            {/* Header row */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: slotClr + "12",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, flexShrink: 0,
              }}>
                {slotIco}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                  {req.slotType} Slot
                </div>
                <div style={{ fontSize: 11, color: C.gray500, marginTop: 1 }}>
                  {req.vehicleNumber}
                  {req.vehicleDescription ? ` · ${req.vehicleDescription}` : ""}
                </div>
              </div>
              <Badge
                label={req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                bg={sc.bg} text={sc.text} dot={sc.dot}
              />
            </div>

            {/* Status timeline */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              <TimelineDot label="Submitted"    date={req.createdAt}   done />
              {req.status === "pending" && (
                <TimelineDot label="Awaiting admin review…" done={false} />
              )}
              {req.status === "approved" && (
                <TimelineDot label="Approved"   date={req.resolvedAt}  done color={C.green} />
              )}
              {req.status === "rejected" && (
                <TimelineDot label="Rejected"   date={req.resolvedAt}  done color={C.red} />
              )}
              {req.status === "cancelled" && (
                <TimelineDot label="Cancelled"  date={req.updatedAt}   done color={C.gray500} />
              )}
            </div>

            {/* Assigned slot (approved) */}
            {req.status === "approved" && req.assignedSlot && (
              <div style={{
                background: C.green + "10", border: `1px solid ${C.green}25`,
                borderRadius: 10, padding: "8px 12px",
                fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 8,
              }}>
                ✅ Assigned: Slot {req.assignedSlot.slotNumber}
                {req.assignedSlot.zone ? ` · ${req.assignedSlot.zone}` : ""}
                {req.assignedSlot.type ? ` (${req.assignedSlot.type})` : ""}
              </div>
            )}

            {/* Admin note on rejection */}
            {req.status === "rejected" && req.adminNote && (
              <div style={{
                background: C.red + "08", border: `1px solid ${C.red}15`,
                borderRadius: 10, padding: "8px 12px",
                fontSize: 12, color: C.gray700, marginBottom: 8,
              }}>
                💬 <em>{req.adminNote}</em>
              </div>
            )}

            {/* Cancel button — only for pending requests */}
            {req.status === "pending" && (
              <button
                onClick={() => handleCancel(req._id)}
                disabled={isBusy}
                style={{
                  width: "100%", padding: "8px", borderRadius: 8, border: `1px solid ${C.red}30`,
                  background: "transparent", color: C.red,
                  fontSize: 12, fontWeight: 600, cursor: isBusy ? "not-allowed" : "pointer",
                  fontFamily: "Plus Jakarta Sans",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {isBusy ? <Spinner size={12} color={C.red} /> : "✕ Cancel Request"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
