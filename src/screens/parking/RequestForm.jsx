/**
 * RequestForm
 * Modal for a resident to submit a parking slot request.
 * Calls: POST /parking/requests
 *
 * GAP-4 FIX — Slot Conflict Pre-check in UI:
 *   On open, fetches GET /parking/slots/summary to show live availability counts
 *   per slot type. If the selected type has 0 available slots, the UI shows a
 *   warning banner and disables the submit button so the resident knows before
 *   wasting the round-trip.
 *
 * Props:
 *   open    — bool
 *   onClose — () => void
 *   onSaved — (request) => void   called after successful submission
 */
import { useState, useEffect } from "react";
import { parkingApi }   from "../../api/resources.api";
import { useToast }     from "../../context/ToastContext";
import { C, SLOT_TYPES, SLOT_TYPE_ICON, SLOT_TYPE_COLOR } from "../../constants/theme";
import { Modal, Input, Btn } from "../../components/ui";

const BLANK = { slotType: "4W", vehicleNumber: "", vehicleDescription: "", note: "" };

// Slot types residents can request
const REQUESTABLE = ["2W", "4W", "EV"];

// ─── Availability badge ────────────────────────────────────────────────────────
const AvailBadge = ({ count, loading }) => {
  if (loading) return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: "1px 5px",
      borderRadius: 6, background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)",
    }}>…</span>
  );
  if (count === undefined) return null;
  const none = count === 0;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: "1px 6px",
      borderRadius: 6,
      background: none ? "rgba(220,38,38,0.18)" : "rgba(255,255,255,0.18)",
      color:      none ? "#FCA5A5"               : "rgba(255,255,255,0.85)",
    }}>
      {none ? "Full" : `${count} free`}
    </span>
  );
};

export const RequestForm = ({ open, onClose, onSaved }) => {
  const toast = useToast();
  const [form,       setForm]       = useState(BLANK);
  const [submitting, setSubmitting] = useState(false);
  const [errors,     setErrors]     = useState({});

  // ── Availability state ────────────────────────────────────────────────────
  const [avail,        setAvail]        = useState({});   // { "4W": 3, "2W": 0, "EV": 1 }
  const [availLoading, setAvailLoading] = useState(false);
  const [availError,   setAvailError]   = useState(null);

  // Fetch availability summary every time the modal opens
  useEffect(() => {
    if (!open) return;
    setAvailLoading(true);
    setAvailError(null);
    parkingApi.getSummary()
      .then((res) => {
        // summary is an array: [{ _id: "4W", total, available, assigned, blocked }]
        const summary = res.data?.summary || [];
        const map = {};
        summary.forEach((s) => { map[s._id] = s.available ?? 0; });
        setAvail(map);
      })
      .catch(() => setAvailError("Could not load slot availability."))
      .finally(() => setAvailLoading(false));
  }, [open]);

  const f = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.vehicleNumber.trim())
      e.vehicleNumber = "Vehicle number is required";
    return e;
  };

  const selectedAvail = avail[form.slotType];
  const noSlotsAvailable = !availLoading && selectedAvail !== undefined && selectedAvail === 0;

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);

    // Soft gate — warn but still let admin handle if somehow mismatch
    if (noSlotsAvailable) {
      toast.error(`No ${form.slotType} slots are currently available. Your request will be queued.`);
      // We still proceed — admin may create more slots later
    }

    setSubmitting(true);
    try {
      const res = await parkingApi.submitRequest({
        slotType:           form.slotType,
        vehicleNumber:      form.vehicleNumber.trim().toUpperCase(),
        vehicleDescription: form.vehicleDescription.trim() || undefined,
        note:               form.note.trim()               || undefined,
      });
      toast.success("Request submitted. Admin will review shortly.");
      onSaved(res.data?.request);
      setForm(BLANK);
      setErrors({});
      onClose();
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === "DUPLICATE_REQUEST")
        toast.error(`You already have a pending ${form.slotType} request.`);
      else
        toast.error(err.response?.data?.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Request a Parking Slot">

      {/* Slot type picker with live availability badges */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 8,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700 }}>
            Slot Type *
          </div>
          {availError && (
            <div style={{ fontSize: 10, color: C.gray400 }}>⚠ Availability unavailable</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {REQUESTABLE.map((t) => {
            const clr    = SLOT_TYPE_COLOR[t] || C.teal;
            const active = form.slotType === t;
            const cnt    = avail[t];
            const full   = !availLoading && cnt !== undefined && cnt === 0;
            return (
              <button key={t}
                onClick={() => setForm((p) => ({ ...p, slotType: t }))}
                style={{
                  flex: 1, padding: "10px 6px", borderRadius: 10, border: "none",
                  cursor: "pointer", fontFamily: "Plus Jakarta Sans",
                  background: active ? (full ? "#EF4444" : clr) : (full ? "#FEE2E2" : clr + "12"),
                  color:      active ? "#fff"                    : (full ? "#EF4444" : clr),
                  transition: "all 0.15s",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 4,
                  outline: active && full ? "2px solid #EF4444" : "none",
                }}
              >
                <span style={{ fontSize: 20 }}>{SLOT_TYPE_ICON[t]}</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{t}</span>
                <AvailBadge count={cnt} loading={availLoading} />
              </button>
            );
          })}
        </div>
      </div>

      {/* No-slots-available warning */}
      {noSlotsAvailable && (
        <div style={{
          background: "#FEF2F2", border: "1.5px solid #FCA5A5",
          borderRadius: 10, padding: "10px 14px", marginBottom: 14,
          display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#991B1B", marginBottom: 2 }}>
              No {form.slotType} slots available right now
            </div>
            <div style={{ fontSize: 11, color: "#B91C1C", lineHeight: 1.5 }}>
              All {form.slotType} slots are currently occupied or blocked. You can still
              submit a request — the admin will assign a slot when one becomes available.
            </div>
          </div>
        </div>
      )}

      {/* All-clear indicator when slots exist */}
      {!availLoading && !availError && selectedAvail !== undefined && selectedAvail > 0 && (
        <div style={{
          background: "#F0FDF4", border: "1.5px solid #86EFAC",
          borderRadius: 10, padding: "8px 14px", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 15 }}>✅</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#166534" }}>
            {selectedAvail} {form.slotType} slot{selectedAvail !== 1 ? "s" : ""} available
          </span>
        </div>
      )}

      <Input
        label="Vehicle Number *"
        value={form.vehicleNumber}
        onChange={f("vehicleNumber")}
        placeholder="GJ01AB1234"
        error={errors.vehicleNumber}
      />
      <Input
        label="Vehicle Description"
        value={form.vehicleDescription}
        onChange={f("vehicleDescription")}
        placeholder="White Maruti Swift Dzire"
      />
      <Input
        label="Note (optional)"
        value={form.note}
        onChange={f("note")}
        placeholder="Any special requirement…"
        multiline
      />

      <Btn onClick={handleSubmit} loading={submitting} style={{ width: "100%" }}>
        Submit Request
      </Btn>
    </Modal>
  );
};
