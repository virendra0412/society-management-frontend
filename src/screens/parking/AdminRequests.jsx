/**
 * AdminRequests
 * Admin view of ALL parking requests — with approve (+ optional slot picker)
 * and reject-with-note actions.
 *
 * Calls:
 *   GET   /parking/requests          — fetch all requests
 *   GET   /parking/slots             — available slots (for approve picker)
 *   PATCH /parking/requests/:id/approve
 *   PATCH /parking/requests/:id/reject
 */
import { useState, useEffect, useCallback } from "react";
import { parkingApi }  from "../../api/resources.api";
import { useToast }    from "../../context/ToastContext";
import {
  C, SLOT_TYPE_ICON, SLOT_TYPE_COLOR, REQUEST_STATUS_COLOR,
} from "../../constants/theme";
import {
  Badge, Spinner, EmptyState, ErrorState, Modal, Input, Btn,
} from "../../components/ui";
import { timeAgo } from "../../utils/timeago";

// ─── Filter pill bar ──────────────────────────────────────────────────────────
const FILTERS = ["all", "pending", "approved", "rejected", "cancelled"];

const FilterBar = ({ active, onChange }) => (
  <div style={{
    display: "flex", gap: 6, overflowX: "auto",
    paddingBottom: 4, marginBottom: 14,
    scrollbarWidth: "none",
  }}>
    {FILTERS.map((f) => {
      const on = active === f;
      return (
        <button key={f} onClick={() => onChange(f)} style={{
          flexShrink: 0,
          padding: "5px 12px", borderRadius: 20, border: "none",
          cursor: "pointer", fontFamily: "Plus Jakarta Sans",
          fontSize: 11, fontWeight: 700,
          background: on ? C.navy : C.gray100,
          color: on ? "#fff" : C.gray700,
          transition: "all 0.15s",
          textTransform: "capitalize",
        }}>
          {f}
        </button>
      );
    })}
  </div>
);

// ─── Reject-with-note modal ───────────────────────────────────────────────────
const RejectModal = ({ open, onClose, onConfirm, busy }) => {
  const [note, setNote] = useState("");
  const handleClose = () => { setNote(""); onClose(); };
  return (
    <Modal open={open} onClose={handleClose} title="Reject Request">
      <div style={{ fontSize: 13, color: C.gray600, marginBottom: 14 }}>
        Optionally add a note to help the resident understand the reason.
      </div>
      <Input
        label="Admin Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. No 4W slots available in your zone."
        multiline
      />
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <Btn
          variant="ghost"
          onClick={handleClose}
          style={{ flex: 1 }}
        >
          Cancel
        </Btn>
        <Btn
          variant="danger"
          loading={busy}
          onClick={() => onConfirm(note.trim() || undefined)}
          style={{ flex: 1 }}
        >
          Reject
        </Btn>
      </div>
    </Modal>
  );
};

// ─── Approve modal — pick available slot ────────────────────────────────────
const ApproveModal = ({ open, onClose, onConfirm, busy, slots }) => {
  const [slotId, setSlotId] = useState("");

  // filter available slots matching any type
  const available = slots.filter((s) => s.status === "available");

  const handleClose = () => { setSlotId(""); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="Approve Request">
      <div style={{ fontSize: 13, color: C.gray600, marginBottom: 14 }}>
        Optionally assign an available slot now, or approve without assigning.
      </div>

      {available.length > 0 ? (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700, marginBottom: 6 }}>
            Assign Slot (optional)
          </div>
          <div style={{
            maxHeight: 200, overflowY: "auto",
            border: `1.5px solid ${C.gray100}`, borderRadius: 10,
          }}>
            {/* "no slot" option */}
            <div
              onClick={() => setSlotId("")}
              style={{
                padding: "10px 12px", cursor: "pointer",
                background: !slotId ? C.teal + "12" : "transparent",
                borderBottom: `1px solid ${C.gray100}`,
                fontSize: 13, color: C.gray600,
              }}
            >
              — Approve without assigning a slot
            </div>

            {available.map((s) => {
              const clr = SLOT_TYPE_COLOR[s.type] || C.teal;
              const ico = SLOT_TYPE_ICON[s.type]  || "🅿️";
              const sel = slotId === s._id;
              return (
                <div
                  key={s._id}
                  onClick={() => setSlotId(s._id)}
                  style={{
                    padding: "10px 12px", cursor: "pointer",
                    background: sel ? clr + "12" : "transparent",
                    borderBottom: `1px solid ${C.gray100}`,
                    display: "flex", alignItems: "center", gap: 10,
                    transition: "background 0.1s",
                  }}
                >
                  <span style={{ fontSize: 18 }}>{ico}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                      {s.slotNumber}
                    </span>
                    {s.zone && (
                      <span style={{ fontSize: 11, color: C.gray500, marginLeft: 6 }}>
                        Zone {s.zone}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: clr, background: clr + "15",
                    padding: "2px 7px", borderRadius: 4,
                  }}>
                    {s.type}
                  </span>
                  {sel && (
                    <span style={{ fontSize: 16, color: clr }}>✓</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{
          background: C.gray50, borderRadius: 10, padding: "10px 12px",
          fontSize: 12, color: C.gray500, marginBottom: 14, textAlign: "center",
        }}>
          No available slots right now. You can still approve — assign later.
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <Btn variant="ghost" onClick={handleClose} style={{ flex: 1 }}>
          Cancel
        </Btn>
        <Btn loading={busy} onClick={() => onConfirm(slotId || undefined)} style={{ flex: 1 }}>
          ✓ Approve
        </Btn>
      </div>
    </Modal>
  );
};

// ─── Single request card ──────────────────────────────────────────────────────
const RequestCard = ({ req, slots, onApproved, onRejected }) => {
  const toast = useToast();
  const slotClr = SLOT_TYPE_COLOR[req.slotType]    || C.teal;
  const slotIco = SLOT_TYPE_ICON[req.slotType]     || "🅿️";
  const sc      = REQUEST_STATUS_COLOR[req.status] || {};

  const [showApprove, setShowApprove] = useState(false);
  const [showReject,  setShowReject]  = useState(false);
  const [busy,        setBusy]        = useState(false);

  const handleApprove = async (slotId) => {
    setBusy(true);
    try {
      const res = await parkingApi.approveRequest(req._id, slotId);
      toast.success("Request approved.");
      setShowApprove(false);
      onApproved(req._id, res.data?.request);
    } catch (err) {
      toast.error(err.response?.data?.message || "Approve failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (note) => {
    setBusy(true);
    try {
      const res = await parkingApi.rejectRequest(req._id, note);
      toast.success("Request rejected.");
      setShowReject(false);
      onRejected(req._id, res.data?.request);
    } catch (err) {
      toast.error(err.response?.data?.message || "Reject failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div style={{
        background: "#fff", borderRadius: 14, padding: 14,
        border: `1px solid ${C.gray100}`,
      }}>
        {/* Header */}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: slotClr + "12",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, flexShrink: 0,
          }}>
            {slotIco}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: C.text,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {req.slotType} Slot
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: slotClr, background: slotClr + "15",
                padding: "1px 6px", borderRadius: 4,
              }}>
                {req.slotType}
              </span>
            </div>
            <div style={{ fontSize: 11, color: C.gray500, marginTop: 2 }}>
              {req.vehicleNumber}
              {req.vehicleDescription ? ` · ${req.vehicleDescription}` : ""}
            </div>
          </div>
          <Badge
            label={req.status.charAt(0).toUpperCase() + req.status.slice(1)}
            bg={sc.bg} text={sc.text} dot={sc.dot}
          />
        </div>

        {/* Resident info */}
        {req.resident && (
          <div style={{
            background: C.gray50, borderRadius: 8,
            padding: "7px 10px", marginBottom: 10,
            display: "flex", gap: 8, alignItems: "center",
          }}>
            <span style={{ fontSize: 14 }}>👤</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                {req.resident.name || "—"}
              </div>
              <div style={{ fontSize: 11, color: C.gray500 }}>
                {req.resident.flatNumber ? `Flat ${req.resident.flatNumber}` : ""}
                {req.resident.phone ? ` · ${req.resident.phone}` : ""}
              </div>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 11, color: C.gray400 }}>
              {timeAgo(req.createdAt)}
            </span>
          </div>
        )}

        {/* Resident note */}
        {req.note && (
          <div style={{
            background: C.gray50, borderRadius: 8, padding: "7px 10px",
            fontSize: 12, color: C.gray700, marginBottom: 10,
            fontStyle: "italic",
          }}>
            💬 {req.note}
          </div>
        )}

        {/* Assigned slot (after approval) */}
        {req.status === "approved" && req.assignedSlot && (
          <div style={{
            background: C.green + "10", border: `1px solid ${C.green}25`,
            borderRadius: 10, padding: "7px 10px",
            fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 10,
          }}>
            ✅ Assigned: Slot {req.assignedSlot.slotNumber}
            {req.assignedSlot.zone ? ` · Zone ${req.assignedSlot.zone}` : ""}
          </div>
        )}

        {/* Admin note on rejection */}
        {req.status === "rejected" && req.adminNote && (
          <div style={{
            background: C.red + "08", border: `1px solid ${C.red}15`,
            borderRadius: 10, padding: "7px 10px",
            fontSize: 12, color: C.gray700, marginBottom: 10,
          }}>
            📋 <em>{req.adminNote}</em>
          </div>
        )}

        {/* Action buttons — only for pending */}
        {req.status === "pending" && (
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              onClick={() => setShowApprove(true)}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 8,
                border: `1px solid ${C.green}30`,
                background: C.green + "08", color: C.green,
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: "Plus Jakarta Sans",
              }}
            >
              ✓ Approve
            </button>
            <button
              onClick={() => setShowReject(true)}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 8,
                border: `1px solid ${C.red}30`,
                background: C.red + "08", color: C.red,
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: "Plus Jakarta Sans",
              }}
            >
              ✕ Reject
            </button>
          </div>
        )}
      </div>

      <ApproveModal
        open={showApprove}
        onClose={() => setShowApprove(false)}
        onConfirm={handleApprove}
        busy={busy}
        slots={slots}
      />
      <RejectModal
        open={showReject}
        onClose={() => setShowReject(false)}
        onConfirm={handleReject}
        busy={busy}
      />
    </>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export const AdminRequests = ({ refreshKey = 0 }) => {
  const [requests, setRequests] = useState([]);
  const [slots,    setSlots]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [filter,   setFilter]   = useState("all");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [reqRes, slotRes] = await Promise.all([
        parkingApi.getAllRequests(),
        parkingApi.getSlots(),
      ]);
      setRequests(reqRes.data?.requests || []);
      setSlots(slotRes.data?.slots       || []);
    } catch {
      setError("Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleApproved = (id, updated) => {
    setRequests((prev) =>
      prev.map((r) => r._id === id ? (updated || { ...r, status: "approved" }) : r)
    );
    // refresh slots so the newly assigned slot is no longer "available"
    parkingApi.getSlots().then((r) => setSlots(r.data?.slots || [])).catch(() => {});
  };

  const handleRejected = (id, updated) => {
    setRequests((prev) =>
      prev.map((r) => r._id === id ? (updated || { ...r, status: "rejected" }) : r)
    );
  };

  const visible = filter === "all"
    ? requests
    : requests.filter((r) => r.status === filter);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
        <Spinner size={28} />
      </div>
    );
  }
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      {/* Pending badge summary */}
      {pendingCount > 0 && (
        <div style={{
          background: "#FEF3C7", border: "1px solid #F59E0B30",
          borderRadius: 10, padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 10,
          marginBottom: 14,
        }}>
          <span style={{ fontSize: 18 }}>⏳</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>
            {pendingCount} pending request{pendingCount > 1 ? "s" : ""} awaiting review
          </span>
        </div>
      )}

      <FilterBar active={filter} onChange={setFilter} />

      {visible.length === 0 ? (
        <EmptyState
          icon="📋"
          message={filter === "all" ? "No parking requests yet." : `No ${filter} requests.`}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visible.map((req) => (
            <RequestCard
              key={req._id}
              req={req}
              slots={slots}
              onApproved={handleApproved}
              onRejected={handleRejected}
            />
          ))}
        </div>
      )}
    </div>
  );
};
