/**
 * CreateSlotForm
 * Admin modal — two modes:
 *   Single  → POST /parking/slots   { slotNumber, zone, type }
 *   Bulk    → POST /parking/slots/bulk  { slots: [{ slotNumber, zone, type }] }
 *
 * Bulk mode: admin sets a prefix + numeric range → live preview grid.
 *
 * Props:
 *   open    — bool
 *   onClose — () => void
 *   onSaved — (slots[]) => void   array of created slots
 */
import { useState, useMemo } from "react";
import { parkingApi }  from "../../api/resources.api";
import { useToast }    from "../../context/ToastContext";
import {
  C, SLOT_TYPES, SLOT_TYPE_ICON, SLOT_TYPE_COLOR,
} from "../../constants/theme";
import { Modal, Input, Btn } from "../../components/ui";

// ─── helpers ──────────────────────────────────────────────────────────────────
const pad = (n, digits) => String(n).padStart(digits, "0");

const buildBulkSlots = ({ prefix, from, to, padDigits, zone, type }) => {
  const f = parseInt(from, 10);
  const t = parseInt(to,   10);
  if (isNaN(f) || isNaN(t) || f > t) return [];
  const out = [];
  for (let i = f; i <= t; i++) {
    out.push({
      slotNumber: `${prefix}${pad(i, padDigits)}`,
      zone:       zone.trim() || undefined,
      type,
    });
  }
  return out;
};

// ─── Mode toggle ──────────────────────────────────────────────────────────────
const ModeToggle = ({ mode, onChange }) => (
  <div style={{
    display: "flex", background: C.gray50, borderRadius: 10,
    padding: 3, marginBottom: 18,
  }}>
    {["single", "bulk"].map((m) => (
      <button key={m} onClick={() => onChange(m)} style={{
        flex: 1, padding: "7px 0", borderRadius: 8, border: "none",
        fontFamily: "Plus Jakarta Sans", fontSize: 12, fontWeight: 700,
        cursor: "pointer", transition: "all 0.15s",
        background: mode === m ? "#fff" : "transparent",
        color:      mode === m ? C.navy : C.gray500,
        boxShadow:  mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
      }}>
        {m === "single" ? "Single Slot" : "Bulk Create"}
      </button>
    ))}
  </div>
);

// ─── Type picker ─────────────────────────────────────────────────────────────
const TypePicker = ({ value, onChange }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700, marginBottom: 8 }}>
      Slot Type *
    </div>
    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
      {SLOT_TYPES.map((t) => {
        const clr    = SLOT_TYPE_COLOR[t] || C.teal;
        const active = value === t;
        return (
          <button key={t} onClick={() => onChange(t)} style={{
            flex: "1 0 56px",
            padding: "9px 4px", borderRadius: 10, border: "none",
            cursor: "pointer", fontFamily: "Plus Jakarta Sans",
            background: active ? clr : clr + "12",
            color:      active ? "#fff" : clr,
            transition: "all 0.15s",
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 3,
          }}>
            <span style={{ fontSize: 17 }}>{SLOT_TYPE_ICON[t]}</span>
            <span style={{ fontSize: 10, fontWeight: 700 }}>{t}</span>
          </button>
        );
      })}
    </div>
  </div>
);

// ─── Single mode ──────────────────────────────────────────────────────────────
const SingleForm = ({ onSaved, onClose }) => {
  const toast = useToast();
  const [form,   setForm]   = useState({ slotNumber: "", zone: "", type: "4W" });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const f = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const handleSave = async () => {
    if (!form.slotNumber.trim()) return setErrors({ slotNumber: "Slot number is required" });
    setSaving(true);
    try {
      const res = await parkingApi.createSlot({
        slotNumber: form.slotNumber.trim().toUpperCase(),
        zone:       form.zone.trim() || undefined,
        type:       form.type,
      });
      toast.success(`Slot ${form.slotNumber.toUpperCase()} created.`);
      onSaved([res.data?.slot]);
      onClose();
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === "DUPLICATE_SLOT")
        toast.error(`Slot ${form.slotNumber.toUpperCase()} already exists.`);
      else
        toast.error(err.response?.data?.message || "Failed to create slot.");
    } finally {
      setSaving(false);
    }
  };

  const clr = SLOT_TYPE_COLOR[form.type] || C.teal;

  return (
    <>
      <TypePicker value={form.type} onChange={(t) => setForm((p) => ({ ...p, type: t }))} />

      <Input
        label="Slot Number *"
        value={form.slotNumber}
        onChange={f("slotNumber")}
        placeholder="e.g. A-01, B-12, EV-03"
        error={errors.slotNumber}
      />
      <Input
        label="Zone (optional)"
        value={form.zone}
        onChange={f("zone")}
        placeholder="e.g. A, B, Basement-1"
      />

      {/* Live preview chip */}
      {form.slotNumber.trim() && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: clr + "10", border: `1.5px solid ${clr}25`,
          borderRadius: 10, padding: "10px 14px", marginBottom: 14,
        }}>
          <span style={{ fontSize: 22 }}>{SLOT_TYPE_ICON[form.type] || "🅿️"}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
              {form.slotNumber.trim().toUpperCase()}
            </div>
            <div style={{ fontSize: 11, color: C.gray500 }}>
              {form.type}{form.zone.trim() ? ` · Zone ${form.zone.trim()}` : ""}
            </div>
          </div>
          <span style={{
            marginLeft: "auto", fontSize: 10, fontWeight: 700,
            background: "#D1FAE5", color: "#065F46",
            padding: "2px 8px", borderRadius: 10,
          }}>
            Available
          </span>
        </div>
      )}

      <Btn onClick={handleSave} loading={saving} style={{ width: "100%" }}>
        Create Slot
      </Btn>
    </>
  );
};

// ─── Bulk mode ────────────────────────────────────────────────────────────────
const BulkForm = ({ onSaved, onClose }) => {
  const toast = useToast();
  const [form, setForm] = useState({
    type: "4W", prefix: "", from: "1", to: "10",
    padDigits: "2", zone: "",
  });
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState({});

  const f = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  // Build preview list — capped at 50 for display
  const preview = useMemo(
    () => buildBulkSlots({ ...form, padDigits: parseInt(form.padDigits, 10) || 2 }),
    [form]
  );

  const validate = () => {
    const e = {};
    const f_ = parseInt(form.from, 10);
    const t_ = parseInt(form.to,   10);
    if (isNaN(f_) || f_ < 1)       e.from = "Enter a valid start number";
    if (isNaN(t_) || t_ < f_)      e.to   = "Must be ≥ start number";
    if (t_ - f_ + 1 > 200)         e.to   = "Max 200 slots per bulk operation";
    return e;
  };

  const handleCreate = async () => {
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);

    setSaving(true);
    try {
      const res = await parkingApi.bulkCreateSlots({ slots: preview });
      const created = res.data?.slots || [];
      const skipped = res.data?.skipped || 0;
      if (skipped > 0)
        toast.success(`${created.length} slot(s) created, ${skipped} skipped (already exist).`);
      else
        toast.success(`${created.length} slot(s) created successfully.`);
      onSaved(created);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Bulk create failed.");
    } finally {
      setSaving(false);
    }
  };

  const clr      = SLOT_TYPE_COLOR[form.type] || C.teal;
  const count    = preview.length;
  const SHOW_MAX = 40;

  return (
    <>
      <TypePicker value={form.type} onChange={(t) => setForm((p) => ({ ...p, type: t }))} />

      {/* Prefix + range row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 0 }}>
        <div style={{ flex: "0 0 90px" }}>
          <Input
            label="Prefix"
            value={form.prefix}
            onChange={f("prefix")}
            placeholder="A-, EV-"
          />
        </div>
        <div style={{ flex: 1 }}>
          <Input
            label="From *"
            value={form.from}
            onChange={f("from")}
            placeholder="1"
            type="number"
            error={errors.from}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Input
            label="To *"
            value={form.to}
            onChange={f("to")}
            placeholder="10"
            type="number"
            error={errors.to}
          />
        </div>
        <div style={{ flex: "0 0 60px" }}>
          <Input
            label="Pad"
            value={form.padDigits}
            onChange={f("padDigits")}
            placeholder="2"
            type="number"
          />
        </div>
      </div>

      <Input
        label="Zone (optional)"
        value={form.zone}
        onChange={f("zone")}
        placeholder="e.g. A, Basement-1"
      />

      {/* Live preview grid */}
      {count > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 8,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700 }}>
              Preview — {count} slot{count !== 1 ? "s" : ""}
            </div>
            {count > SHOW_MAX && (
              <div style={{ fontSize: 11, color: C.gray400 }}>
                showing first {SHOW_MAX}…
              </div>
            )}
          </div>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 6,
            background: C.gray50, borderRadius: 10, padding: 10,
            maxHeight: 160, overflowY: "auto",
          }}>
            {preview.slice(0, SHOW_MAX).map((s) => (
              <div key={s.slotNumber} style={{
                display: "flex", alignItems: "center", gap: 4,
                background: clr + "12", border: `1px solid ${clr}25`,
                borderRadius: 6, padding: "3px 8px",
              }}>
                <span style={{ fontSize: 12 }}>{SLOT_TYPE_ICON[s.type] || "🅿️"}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: clr }}>
                  {s.slotNumber}
                </span>
              </div>
            ))}
            {count > SHOW_MAX && (
              <div style={{
                display: "flex", alignItems: "center",
                padding: "3px 8px", fontSize: 11, color: C.gray400, fontStyle: "italic",
              }}>
                +{count - SHOW_MAX} more
              </div>
            )}
          </div>
          {form.zone.trim() && (
            <div style={{ fontSize: 11, color: C.gray500, marginTop: 6 }}>
              All in Zone {form.zone.trim()} · Status: Available
            </div>
          )}
        </div>
      )}

      {count === 0 && (
        <div style={{
          background: C.gray50, borderRadius: 10, padding: "12px",
          fontSize: 12, color: C.gray400, textAlign: "center", marginBottom: 14,
        }}>
          Set a valid range to preview slots
        </div>
      )}

      <Btn
        onClick={handleCreate}
        loading={saving}
        disabled={count === 0}
        style={{ width: "100%" }}
      >
        Create {count > 0 ? `${count} Slot${count !== 1 ? "s" : ""}` : "Slots"}
      </Btn>
    </>
  );
};

// ─── Root modal ───────────────────────────────────────────────────────────────
export const CreateSlotForm = ({ open, onClose, onSaved }) => {
  const [mode, setMode] = useState("single");

  const handleClose = () => {
    setMode("single");
    onClose();
  };

  const handleSaved = (slots) => {
    onSaved(slots);
    handleClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create Parking Slot">
      <ModeToggle mode={mode} onChange={setMode} />
      {mode === "single"
        ? <SingleForm onSaved={handleSaved} onClose={handleClose} />
        : <BulkForm   onSaved={handleSaved} onClose={handleClose} />
      }
    </Modal>
  );
};
