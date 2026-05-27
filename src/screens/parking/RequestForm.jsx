/**
 * RequestForm
 * Modal for a resident to submit a parking slot request.
 * Calls: POST /parking/requests
 *
 * Props:
 *   open    — bool
 *   onClose — () => void
 *   onSaved — (request) => void   called after successful submission
 */
import { useState } from "react";
import { parkingApi }   from "../../api/resources.api";
import { useToast }     from "../../context/ToastContext";
import { C, SLOT_TYPES, SLOT_TYPE_ICON, SLOT_TYPE_COLOR } from "../../constants/theme";
import { Modal, Input, Btn } from "../../components/ui";

const BLANK = { slotType: "4W", vehicleNumber: "", vehicleDescription: "", note: "" };

// Slot types residents can request (exclude internal ones)
const REQUESTABLE = ["2W", "4W", "EV"];

export const RequestForm = ({ open, onClose, onSaved }) => {
  const toast = useToast();
  const [form,       setForm]       = useState(BLANK);
  const [submitting, setSubmitting] = useState(false);
  const [errors,     setErrors]     = useState({});

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

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);

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

      {/* Slot type picker */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700, marginBottom: 8 }}>
          Slot Type *
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {REQUESTABLE.map((t) => {
            const clr    = SLOT_TYPE_COLOR[t] || C.teal;
            const active = form.slotType === t;
            return (
              <button key={t}
                onClick={() => setForm((p) => ({ ...p, slotType: t }))}
                style={{
                  flex: 1, padding: "10px 6px", borderRadius: 10, border: "none",
                  cursor: "pointer", fontFamily: "Plus Jakarta Sans",
                  background: active ? clr : clr + "12",
                  color:      active ? "#fff" : clr,
                  transition: "all 0.15s",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 4,
                }}
              >
                <span style={{ fontSize: 20 }}>{SLOT_TYPE_ICON[t]}</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{t}</span>
              </button>
            );
          })}
        </div>
      </div>

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
