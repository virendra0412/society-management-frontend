import { useState, useEffect, useCallback } from "react";
import { maintenanceApi } from "../api/resources.api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Card, Badge, Modal, Input, Select, Btn,
  Spinner, EmptyState, ErrorState, PageHeader, Tag,
} from "../components/ui";
import {
  C, PAYMENT_STATUS_COLOR, BILL_STATUS, PAYMENT_METHODS,
} from "../constants/theme";
import { timeAgo } from "../utils/timeago";
import { ResidentPaymentCard } from "./maintenance/ResidentPaymentCard";
import { EditBillButton }      from "./maintenance/EditBillButton";
import { DefaulterList }       from "./maintenance/DefaulterList";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  n !== undefined && n !== null
    ? `₹${Number(n).toLocaleString("en-IN")}`
    : "—";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const billStatusInfo = (bill) => {
  if (bill.isClosed)    return BILL_STATUS.closed;
  if (bill.isPublished) return BILL_STATUS.published;
  return BILL_STATUS.draft;
};

const isOverdue = (bill) =>
  bill.isPublished && !bill.isClosed && new Date(bill.dueDate) < new Date();

// ─── Progress Ring ────────────────────────────────────────────────────────────
const ProgressRing = ({ pct, size = 72, stroke = 6, color = C.teal }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.gray100} strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color = C.teal, onClick }) => (
  <div
    onClick={onClick}
    style={{
      flex: 1, background: color + "10", borderRadius: 12,
      padding: "12px 14px", border: `1px solid ${color}20`,
      cursor: onClick ? "pointer" : "default",
    }}
  >
    <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
    <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: "Syne" }}>{value}</div>
    <div style={{ fontSize: 11, color: C.gray700, fontWeight: 600 }}>{label}</div>
    {sub && <div style={{ fontSize: 10, color: C.gray500, marginTop: 1 }}>{sub}</div>}
  </div>
);

// ─── Toggle Switch ────────────────────────────────────────────────────────────
const Toggle = ({ label, hint, value, onChange }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: C.gray50, borderRadius: 10, padding: "10px 14px", marginBottom: 14,
    border: `1px solid ${C.gray100}`,
  }}>
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: C.gray500, marginTop: 2 }}>{hint}</div>}
    </div>
    <div onClick={() => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12, cursor: "pointer",
      background: value ? C.teal : C.gray300, position: "relative", transition: "background 0.2s",
    }}>
      <div style={{
        position: "absolute", top: 3, left: value ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s",
      }} />
    </div>
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, count, right }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: C.gray700, display: "flex", alignItems: "center", gap: 8 }}>
      {title}
      {count !== undefined && (
        <span style={{ background: C.gray100, color: C.gray500, borderRadius: 20, padding: "1px 8px", fontSize: 11 }}>
          {count}
        </span>
      )}
    </div>
    {right}
  </div>
);

// ─── Month Picker ─────────────────────────────────────────────────────────────
// Small chip-style month filter. Renders current + past 12 months.
const MonthPicker = ({ value, onChange }) => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    months.push({ key, label });
  }

  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
      {/* "All months" chip */}
      <button
        onClick={() => onChange("")}
        style={{
          padding: "4px 12px", borderRadius: 20, border: "none",
          fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
          fontFamily: "Plus Jakarta Sans", flexShrink: 0,
          background: !value ? C.teal : C.gray100,
          color:      !value ? "#fff"  : C.gray700,
          transition: "all 0.15s",
        }}
      >
        All months
      </button>
      {months.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(value === key ? "" : key)}
          style={{
            padding: "4px 12px", borderRadius: 20, border: "none",
            fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            fontFamily: "Plus Jakarta Sans", flexShrink: 0,
            background: value === key ? C.teal : C.gray100,
            color:      value === key ? "#fff"  : C.gray700,
            transition: "all 0.15s",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CREATE / EDIT BILL MODAL (Admin) ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const EMPTY_BILL_FORM = {
  title: "", description: "", billMonth: "", baseAmount: "",
  dueDate: "", penaltyEnabled: false, penaltyAmount: "",
  targetMode: "all", targetFlats: "",
};

const CreateBillModal = ({ open, onClose, bill, onSaved }) => {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_BILL_FORM);
  const [saving, setSaving] = useState(false);
  const isEdit = !!bill;

  useEffect(() => {
    if (open) {
      if (bill) {
        setForm({
          title: bill.title || "",
          description: bill.description || "",
          billMonth: bill.billMonth || "",
          baseAmount: bill.baseAmount ?? "",
          dueDate: bill.dueDate ? bill.dueDate.slice(0, 10) : "",
          penaltyEnabled: bill.penaltyEnabled || false,
          penaltyAmount: bill.penaltyAmount ?? "",
          targetMode: bill.targetMode || "all",
          targetFlats: (bill.targetFlats || []).join(", "),
        });
      } else {
        setForm(EMPTY_BILL_FORM);
      }
    }
  }, [open, bill]);

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error("Title is required.");
    if (!form.baseAmount || Number(form.baseAmount) < 1) return toast.error("Amount must be ≥ ₹1.");
    if (!form.dueDate) return toast.error("Due date is required.");
    if (form.penaltyEnabled && (!form.penaltyAmount || Number(form.penaltyAmount) < 1))
      return toast.error("Penalty amount must be ≥ ₹1 when enabled.");

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      billMonth: form.billMonth || undefined,
      baseAmount: Number(form.baseAmount),
      dueDate: form.dueDate,
      penaltyEnabled: form.penaltyEnabled,
      penaltyAmount: form.penaltyEnabled ? Number(form.penaltyAmount) : 0,
      targetMode: form.targetMode,
      targetFlats: form.targetMode === "specific"
        ? form.targetFlats.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    };

    setSaving(true);
    try {
      let res;
      if (isEdit) {
        res = await maintenanceApi.updateBill(bill._id, payload);
      } else {
        res = await maintenanceApi.createBill(payload);
      }
      onSaved(res.data.bill, isEdit ? "update" : "create");
      toast.success(isEdit ? "Bill updated." : "Draft bill created.");
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Bill" : "Create Maintenance Bill"}>
      <Input label="Bill Title *" value={form.title} onChange={f("title")} placeholder="e.g. January 2025 Maintenance" />
      <Input label="Description" value={form.description} onChange={f("description")} placeholder="Any notes for residents…" multiline />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Input label="Bill Month (YYYY-MM)" value={form.billMonth} onChange={f("billMonth")} placeholder="2025-01" />
        <Input label="Base Amount (₹) *" value={form.baseAmount} onChange={f("baseAmount")} type="number" placeholder="2500" />
      </div>
      <Input label="Due Date *" value={form.dueDate} onChange={f("dueDate")} type="date" />

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700, marginBottom: 5 }}>Target</div>
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "specific"].map((m) => (
            <button key={m} onClick={() => setForm((p) => ({ ...p, targetMode: m }))} style={{
              flex: 1, padding: "8px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, fontFamily: "Plus Jakarta Sans",
              background: form.targetMode === m ? C.navy : C.gray100,
              color: form.targetMode === m ? "#fff" : C.gray700,
            }}>
              {m === "all" ? "All Flats" : "Specific Flats"}
            </button>
          ))}
        </div>
      </div>

      {form.targetMode === "specific" && (
        <Input
          label="Flat Numbers (comma separated)"
          value={form.targetFlats}
          onChange={f("targetFlats")}
          placeholder="101, 102, 203A"
        />
      )}

      <Toggle
        label="Late Penalty"
        hint="Auto-charge overdue flats when penalty is applied"
        value={form.penaltyEnabled}
        onChange={(v) => setForm((p) => ({ ...p, penaltyEnabled: v }))}
      />
      {form.penaltyEnabled && (
        <Input label="Penalty Amount (₹) *" value={form.penaltyAmount} onChange={f("penaltyAmount")} type="number" placeholder="200" />
      )}

      <Btn onClick={handleSave} loading={saving} style={{ width: "100%", marginTop: 4 }}>
        {isEdit ? "Save Changes" : "Create Draft Bill"}
      </Btn>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── RECORD PAYMENT MODAL (Admin) ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const RecordPaymentModal = ({ open, onClose, paymentRecord, billId, onSaved }) => {
  const toast = useToast();
  const [form, setForm] = useState({ paidAmount: "", paymentMethod: "upi", transactionId: "", receiptNote: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && paymentRecord) {
      setForm({
        paidAmount: paymentRecord.totalDue ?? paymentRecord.amount ?? "",
        paymentMethod: paymentRecord.paymentMethod || "upi",
        transactionId: "", receiptNote: "",
      });
    }
  }, [open, paymentRecord]);

  const handleSave = async () => {
    if (!form.paymentMethod) return toast.error("Payment method is required.");
    setSaving(true);
    try {
      const payload = {
        paymentMethod: form.paymentMethod,
        paidAmount: form.paidAmount ? Number(form.paidAmount) : undefined,
        transactionId: form.transactionId.trim() || undefined,
        receiptNote: form.receiptNote.trim() || undefined,
      };
      const res = await maintenanceApi.recordPayment(billId, paymentRecord._id, payload);
      onSaved(res.data.bill);
      toast.success("Payment recorded.");
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  };

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Modal open={open} onClose={onClose} title="Record Payment">
      {paymentRecord && (
        <div style={{ background: C.gray50, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>
            Flat {paymentRecord.flat}{paymentRecord.wing ? ` · ${paymentRecord.wing}` : ""}
          </div>
          <div style={{ fontSize: 12, color: C.gray500, marginTop: 2 }}>
            Amount Due: <strong style={{ color: C.text }}>{fmt(paymentRecord.totalDue)}</strong>
            {paymentRecord.penalty > 0 && (
              <span style={{ color: C.red, marginLeft: 8 }}>+{fmt(paymentRecord.penalty)} penalty</span>
            )}
          </div>
        </div>
      )}
      <Input label="Amount Paid (₹)" value={form.paidAmount} onChange={f("paidAmount")} type="number" placeholder="Leave blank for full amount" />
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700, marginBottom: 5 }}>Payment Method *</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {PAYMENT_METHODS.map((m) => (
            <button key={m} onClick={() => setForm((p) => ({ ...p, paymentMethod: m }))} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: `1.5px solid ${form.paymentMethod === m ? C.teal : C.gray100}`,
              background: form.paymentMethod === m ? C.teal + "15" : "transparent",
              color: form.paymentMethod === m ? C.teal : C.gray700, cursor: "pointer",
              textTransform: "uppercase",
            }}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <Input label="Transaction ID / Ref (optional)" value={form.transactionId} onChange={f("transactionId")} placeholder="UPI ref, cheque no., etc." />
      <Input label="Receipt Note (optional)" value={form.receiptNote} onChange={f("receiptNote")} placeholder="Any note…" multiline />
      <Btn onClick={handleSave} loading={saving} style={{ width: "100%" }}>Mark as Paid</Btn>
    </Modal>
  );
};

// ─── Discount Modal ───────────────────────────────────────────────────────────
const DiscountModal = ({ open, onClose, paymentRecord, billId, onSaved }) => {
  const toast = useToast();
  const [discount, setDiscount] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDiscount(paymentRecord?.discount ?? "");
  }, [open, paymentRecord]);

  const handleSave = async () => {
    if (discount === "" || Number(discount) < 0) return toast.error("Discount must be ≥ 0.");
    setSaving(true);
    try {
      const res = await maintenanceApi.applyDiscount(billId, paymentRecord._id, Number(discount));
      onSaved(res.data.bill);
      toast.success("Discount applied.");
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Apply Discount">
      {paymentRecord && (
        <div style={{ background: C.gray50, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>Flat {paymentRecord.flat}</div>
          <div style={{ fontSize: 12, color: C.gray500 }}>Base: {fmt(paymentRecord.amount)}</div>
        </div>
      )}
      <Input
        label="Discount Amount (₹) *"
        value={discount}
        onChange={(e) => setDiscount(e.target.value)}
        type="number"
        placeholder="e.g. 200"
      />
      <Btn onClick={handleSave} loading={saving} style={{ width: "100%" }} variant="amber">
        Apply Discount
      </Btn>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── BILL DETAIL VIEW ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const BillDetailView = ({ billId, onBack, isAdmin }) => {
  const toast = useToast();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(null);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [recordModal, setRecordModal]   = useState(null);
  const [discountModal, setDiscountModal] = useState(null);
  const [search, setSearch] = useState("");

  const loadBill = useCallback(async () => {
    setLoading(true);
    try {
      const res = await maintenanceApi.getBillById(billId);
      setBill(res.data.bill);
    } catch (e) {
      toast.error("Failed to load bill.");
    } finally {
      setLoading(false);
    }
  }, [billId]);

  useEffect(() => { loadBill(); }, [loadBill]);

  const doAction = async (action, label) => {
    if (!window.confirm(`${label}? This cannot be undone.`)) return;
    setActionBusy(action);
    try {
      let res;
      if (action === "publish")      res = await maintenanceApi.publishBill(billId);
      else if (action === "close")   res = await maintenanceApi.closeBill(billId);
      else if (action === "penalty") res = await maintenanceApi.applyPenalty(billId);
      setBill(res.data.bill);
      toast.success(`${label} successful.`);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Action failed.");
    } finally {
      setActionBusy(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
        <Spinner size={32} />
      </div>
    );
  }

  if (!bill) return <ErrorState message="Bill not found." onRetry={loadBill} />;

  const status     = billStatusInfo(bill);
  const summary    = bill.collectionSummary || {};
  const paidPct    = summary.total > 0 ? Math.round((summary.collected / summary.total) * 100) : 0;
  const overdueBool = isOverdue(bill);

  const filteredPayments = (bill.payments || []).filter((p) => {
    const matchStatus = paymentFilter === "all" || p.status === paymentFilter;
    const matchSearch = !search.trim() ||
      p.flat?.toLowerCase().includes(search.toLowerCase()) ||
      p.resident?.name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const paymentStatusCounts = (bill.payments || []).reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="screen-enter" style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, #1a3a6e 100%)`,
        padding: "16px 20px 28px", marginBottom: -16,
      }}>
        <button onClick={onBack} style={{
          background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8,
          padding: "5px 12px", fontSize: 12, color: "#fff", cursor: "pointer",
          fontFamily: "Plus Jakarta Sans", fontWeight: 600, marginBottom: 12,
        }}>
          ← Back
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {bill.billMonth || "Maintenance Bill"}
            </div>
            <div style={{ fontSize: 18, fontFamily: "Syne", fontWeight: 800, color: "#fff", marginTop: 4, lineHeight: 1.3 }}>
              {bill.title}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
              Due {fmtDate(bill.dueDate)}{overdueBool ? " · ⚠️ Overdue" : ""}
            </div>
          </div>
          <div style={{
            background: status.bg + "33", color: status.text,
            padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            border: `1px solid ${status.text}40`, whiteSpace: "nowrap", marginLeft: 12,
          }}>
            {status.label}
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* Collection Progress Card (admin / published) */}
        {bill.isPublished && isAdmin && (
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <ProgressRing pct={paidPct} color={paidPct === 100 ? C.green : C.teal} />
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.navy, fontFamily: "Syne" }}>{paidPct}%</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.gray700, marginBottom: 8 }}>Collection Summary</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, textAlign: "center", background: C.green + "10", borderRadius: 8, padding: "6px 8px" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.green }}>{fmt(summary.collected)}</div>
                    <div style={{ fontSize: 10, color: C.gray500 }}>Collected</div>
                  </div>
                  <div style={{ flex: 1, textAlign: "center", background: C.amber + "10", borderRadius: 8, padding: "6px 8px" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.amber }}>{fmt(summary.pending)}</div>
                    <div style={{ fontSize: 10, color: C.gray500 }}>Pending</div>
                  </div>
                  <div style={{ flex: 1, textAlign: "center", background: C.gray50, borderRadius: 8, padding: "6px 8px" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>{fmt(summary.total)}</div>
                    <div style={{ fontSize: 10, color: C.gray500 }}>Total</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Bill Info */}
        <Card style={{ marginBottom: 14 }}>
          <SectionHeader title="Bill Details" />
          {[
            ["Base Amount", fmt(bill.baseAmount)],
            ["Due Date",    fmtDate(bill.dueDate)],
            ["Target",      bill.targetMode === "all" ? "All Flats" : `${bill.targetFlats?.length || 0} specific flats`],
            bill.penaltyEnabled && ["Late Penalty", fmt(bill.penaltyAmount)],
            bill.description && ["Description", bill.description],
          ].filter(Boolean).map(([label, value]) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between",
              padding: "8px 0", borderBottom: `1px solid ${C.gray100}`,
            }}>
              <span style={{ fontSize: 12, color: C.gray500, fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: 13, color: C.text, fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{value}</span>
            </div>
          ))}
        </Card>

        {/* Admin Actions */}
        {isAdmin && (
          <Card style={{ marginBottom: 14 }}>
            <SectionHeader title="Admin Actions" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {!bill.isPublished && !bill.isClosed && (
                <Btn small variant="primary" loading={actionBusy === "publish"}
                  onClick={() => doAction("publish", "Publish bill and notify residents")}>
                  📢 Publish Bill
                </Btn>
              )}
              {bill.isPublished && !bill.isClosed && bill.penaltyEnabled && overdueBool && (
                <Btn small variant="amber" loading={actionBusy === "penalty"}
                  onClick={() => doAction("penalty", "Apply late penalty to all overdue flats")}>
                  ⚠️ Apply Penalty
                </Btn>
              )}
              {bill.isPublished && !bill.isClosed && (
                <Btn small variant="ghost" loading={actionBusy === "close"}
                  onClick={() => doAction("close", "Close this bill permanently")}>
                  🔒 Close Bill
                </Btn>
              )}
            </div>
          </Card>
        )}

        {/* Payment Records */}
        {bill.isPublished && (
          isAdmin
            ? /* ── Admin: full filterable list ──────────────────────────────── */
              <>
                {/* Status filter chips */}
                <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" }}>
                  {[
                    { key: "all",     label: `All (${bill.payments?.length || 0})` },
                    { key: "unpaid",  label: `Unpaid (${paymentStatusCounts.unpaid  || 0})` },
                    { key: "overdue", label: `Overdue (${paymentStatusCounts.overdue || 0})` },
                    { key: "paid",    label: `Paid (${paymentStatusCounts.paid      || 0})` },
                    { key: "partial", label: `Partial (${paymentStatusCounts.partial || 0})` },
                    { key: "waived",  label: `Waived (${paymentStatusCounts.waived  || 0})` },
                  ].map(({ key, label }) => (
                    <button key={key} onClick={() => setPaymentFilter(key)} style={{
                      padding: "5px 12px", borderRadius: 20, border: "none", whiteSpace: "nowrap",
                      fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Plus Jakarta Sans",
                      background: paymentFilter === key ? C.navy : C.gray100,
                      color: paymentFilter === key ? "#fff" : C.gray700,
                      transition: "all 0.15s",
                    }}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div style={{ position: "relative", marginBottom: 12 }}>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by flat or resident name…"
                    style={{
                      width: "100%", border: `1.5px solid ${C.gray100}`, borderRadius: 10,
                      padding: "9px 12px 9px 32px", fontSize: 13, fontFamily: "Plus Jakarta Sans",
                      color: C.text, outline: "none", background: C.gray50, boxSizing: "border-box",
                    }}
                  />
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.gray300 }}>
                    🔍
                  </span>
                </div>

                <SectionHeader title="Payment Records" count={filteredPayments.length} />

                {filteredPayments.length === 0
                  ? <EmptyState icon="📋" message="No records match your filter." />
                  : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {filteredPayments.map((p) => {
                        const sc = PAYMENT_STATUS_COLOR[p.status] || {};
                        const isPaid = p.status === "paid" || p.status === "waived";
                        return (
                          <Card key={p._id} style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                  <div style={{
                                    width: 32, height: 32, borderRadius: 8,
                                    background: C.navy + "12",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 12, fontWeight: 800, color: C.navy,
                                  }}>
                                    {p.flat}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                                      Flat {p.flat}{p.wing ? ` · ${p.wing}` : ""}
                                    </div>
                                    {p.resident?.name && (
                                      <div style={{ fontSize: 11, color: C.gray500 }}>{p.resident.name}</div>
                                    )}
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                                  <Badge label={p.status.charAt(0).toUpperCase() + p.status.slice(1)} bg={sc.bg} text={sc.text} dot={sc.dot} />
                                  <span style={{ fontSize: 12, fontWeight: 700, color: isPaid ? C.green : C.red }}>
                                    {isPaid ? fmt(p.paidAmount || p.totalDue) : fmt(p.totalDue)}
                                  </span>
                                  {p.penalty > 0 && <span style={{ fontSize: 11, color: C.red }}>+{fmt(p.penalty)} penalty</span>}
                                  {p.discount > 0 && <span style={{ fontSize: 11, color: C.green }}>-{fmt(p.discount)} discount</span>}
                                </div>
                                {isPaid && p.paidAt && (
                                  <div style={{ fontSize: 11, color: C.gray500, marginTop: 4 }}>
                                    Paid {fmtDate(p.paidAt)} via {p.paymentMethod}
                                    {p.transactionId && ` · Ref: ${p.transactionId}`}
                                  </div>
                                )}
                              </div>

                              {!isPaid && !bill.isClosed && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 8 }}>
                                  <button onClick={() => setRecordModal(p)} style={{
                                    background: C.teal, color: "#fff", border: "none",
                                    borderRadius: 7, padding: "5px 10px", fontSize: 11,
                                    fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                                  }}>
                                    ✓ Record
                                  </button>
                                  <button onClick={() => setDiscountModal(p)} style={{
                                    background: C.amber + "20", color: C.amber, border: "none",
                                    borderRadius: 7, padding: "5px 10px", fontSize: 11,
                                    fontWeight: 700, cursor: "pointer",
                                  }}>
                                    % Discount
                                  </button>
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )
                }
              </>

            : /* ── Resident: single scoped record ─────────────────────────── */
              <>
                <SectionHeader title="Your Payment" />
                {/*
                  Backend scopes bill.payments to only the calling resident's
                  own record. ResidentPaymentCard handles the null/empty case
                  with resident-specific messaging.
                */}
                <ResidentPaymentCard
                  payment={bill.payments?.[0] ?? null}
                  bill={bill}
                />
              </>
        )}

        {/* Draft info pill */}
        {!bill.isPublished && !bill.isClosed && (
          <div style={{
            background: C.amber + "12", border: `1px solid ${C.amber}25`,
            borderRadius: 12, padding: "12px 14px", marginTop: 12,
            fontSize: 13, color: C.gray700, lineHeight: 1.5,
          }}>
            ℹ️ This bill is a <strong>draft</strong>. Publish it to generate payment records and notify all targeted residents.
          </div>
        )}
      </div>

      <RecordPaymentModal
        open={!!recordModal}
        onClose={() => setRecordModal(null)}
        paymentRecord={recordModal}
        billId={bill._id}
        onSaved={(updatedBill) => { setBill(updatedBill); setRecordModal(null); }}
      />
      <DiscountModal
        open={!!discountModal}
        onClose={() => setDiscountModal(null)}
        paymentRecord={discountModal}
        billId={bill._id}
        onSaved={(updatedBill) => { setBill(updatedBill); setDiscountModal(null); }}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MY PAYMENTS VIEW (Resident) ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const MyPaymentsView = () => {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await maintenanceApi.getMyPayments();
      const payments = res.data?.payments || [];
      setPayments(
        payments.map((item) => ({
          ...item,
          ...(item.payment || {}),
        }))
      );
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load your payment history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalPaid    = payments.filter((p) => p.status === "paid").reduce((s, p) => s + (p.paidAmount || 0), 0);
  const totalPending = payments.filter((p) => p.status === "unpaid" || p.status === "overdue").reduce((s, p) => s + (p.totalDue || 0), 0);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}><Spinner /></div>;
  if (error)   return <ErrorState message={error} onRetry={load} />;

  return (
    <div style={{ padding: "0 16px" }}>
      {payments.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <StatCard icon="✅" label="Total Paid"  value={fmt(totalPaid)}    color={C.green} />
          <StatCard icon="⏳" label="Pending"     value={fmt(totalPending)} color={totalPending > 0 ? C.red : C.gray500} />
          <StatCard icon="📋" label="Total Bills" value={payments.length}  color={C.navy} />
        </div>
      )}

      {payments.length === 0 ? (
        <div style={{
          background: C.gray50, borderRadius: 14, padding: "32px 20px",
          textAlign: "center", border: `1.5px dashed ${C.gray100}`, marginTop: 8,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💰</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.gray700, marginBottom: 6 }}>
            No bills yet
          </div>
          <div style={{ fontSize: 13, color: C.gray500, lineHeight: 1.6 }}>
            Your maintenance bills will appear here once the admin publishes them for your flat.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {payments.map((p) => {
            const sc = PAYMENT_STATUS_COLOR[p.status] || {};
            const isPaid = p.status === "paid" || p.status === "waived";
            return (
              <Card key={p._id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 2 }}>
                      {p.bill?.title || "Maintenance Bill"}
                    </div>
                    <div style={{ fontSize: 11, color: C.gray500, marginBottom: 6 }}>
                      Due {fmtDate(p.bill?.dueDate || p.dueDate)}
                      {p.bill?.billMonth && ` · ${p.bill.billMonth}`}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <Badge label={p.status.charAt(0).toUpperCase() + p.status.slice(1)} bg={sc.bg} text={sc.text} dot={sc.dot} />
                      <span style={{ fontSize: 13, fontWeight: 800, color: isPaid ? C.green : C.text }}>
                        {fmt(isPaid ? (p.paidAmount || p.totalDue) : p.totalDue)}
                      </span>
                      {p.penalty > 0 && <span style={{ fontSize: 11, color: C.red }}>+{fmt(p.penalty)} penalty</span>}
                      {p.discount > 0 && <span style={{ fontSize: 11, color: C.green }}>-{fmt(p.discount)} off</span>}
                    </div>
                    {isPaid && p.paidAt && (
                      <div style={{ fontSize: 11, color: C.gray500, marginTop: 4 }}>
                        Paid {fmtDate(p.paidAt)} via {p.paymentMethod}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 28, filter: isPaid ? "none" : "grayscale(1) opacity(0.4)" }}>
                    {isPaid ? "✅" : "⏳"}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── GAP-5 FIX: Collection Analytics Chart ────────────────────────────────────
// Pure-SVG bar chart — no external charting library needed.
// Shows collected (green) vs pending (amber) ₹ per bill, ordered by billMonth.
// Rendered inside MaintenanceDashboard (admin only, published bills only).
// ═══════════════════════════════════════════════════════════════════════════════

const CollectionChart = ({ bills }) => {
  // Only include published bills that have payment records
  const data = bills
    .filter((b) => b.isPublished && b.collectionSummary?.total > 0)
    .map((b) => ({
      label:     b.billMonth || b.title.slice(0, 8),
      collected: b.collectionSummary?.collected || 0,
      pending:   b.collectionSummary?.pending   || 0,
      total:     b.collectionSummary?.total      || 0,
    }))
    .sort((a, b) => (a.label > b.label ? 1 : -1))
    .slice(-6); // show last 6 bills max

  if (data.length === 0) return null;

  const W = 340, H = 160, PAD_L = 52, PAD_B = 28, PAD_T = 16, PAD_R = 12;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_B - PAD_T;

  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const barGroupW = chartW / data.length;
  const barW = Math.min(barGroupW * 0.38, 18);
  const gap  = barW * 0.35;

  const toY = (v) => PAD_T + chartH - (v / maxVal) * chartH;

  // Y-axis labels — 4 ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxVal * f));

  const fmtK = (n) => (n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n));

  return (
    <div style={{
      background: "#fff", borderRadius: 14,
      border: `1px solid ${C.gray100}`,
      padding: "14px 14px 10px", marginBottom: 14,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 10,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>
          📊 Collection Analytics
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 10, color: C.gray500 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: C.green, display: "inline-block" }} />
            Collected
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: C.amber, display: "inline-block" }} />
            Pending
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Y-axis grid lines + labels */}
        {ticks.map((v) => {
          const y = toY(v);
          return (
            <g key={v}>
              <line
                x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke={C.gray100} strokeWidth={1}
                strokeDasharray={v === 0 ? "none" : "3 3"}
              />
              <text
                x={PAD_L - 5} y={y + 4}
                textAnchor="end" fontSize={8}
                fill={C.gray400} fontFamily="Plus Jakarta Sans"
              >
                {fmtK(v)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const cx       = PAD_L + barGroupW * i + barGroupW / 2;
          const xColl    = cx - barW - gap / 2;
          const xPend    = cx + gap / 2;
          const hColl    = (d.collected / maxVal) * chartH || 0;
          const hPend    = (d.pending   / maxVal) * chartH || 0;
          const yColl    = PAD_T + chartH - hColl;
          const yPend    = PAD_T + chartH - hPend;
          const labelY   = H - PAD_B + 14;

          return (
            <g key={d.label}>
              {/* Collected bar */}
              {hColl > 0 && (
                <rect
                  x={xColl} y={yColl}
                  width={barW} height={hColl}
                  rx={3} fill={C.green} opacity={0.85}
                />
              )}
              {/* Pending bar */}
              {hPend > 0 && (
                <rect
                  x={xPend} y={yPend}
                  width={barW} height={hPend}
                  rx={3} fill={C.amber} opacity={0.75}
                />
              )}
              {/* X-axis label */}
              <text
                x={cx} y={labelY}
                textAnchor="middle" fontSize={8}
                fill={C.gray500} fontFamily="Plus Jakarta Sans"
              >
                {d.label.length > 7 ? d.label.slice(2) : d.label}
              </text>
            </g>
          );
        })}

        {/* X-axis baseline */}
        <line
          x1={PAD_L} y1={PAD_T + chartH}
          x2={W - PAD_R} y2={PAD_T + chartH}
          stroke={C.gray200} strokeWidth={1}
        />
      </svg>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAINTENANCE DASHBOARD (Admin list view) ──────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const BILL_STATUS_FILTERS = ["All", "Draft", "Published", "Closed"];

const MaintenanceDashboard = ({ isAdmin, onOpenBill, onOpenMyPayments, onOpenDefaulters }) => {
  const toast = useToast();
  const [bills, setBills]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  // ── NEW: month filter ──────────────────────────────────────────────────────
  const [monthFilter, setMonthFilter]   = useState(""); // "YYYY-MM" or ""
  const [showCreate, setShowCreate]     = useState(false);
  const [editBill, setEditBill]         = useState(null);

  const loadBills = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = {};
      if (statusFilter === "Draft")     params.isPublished = false;
      if (statusFilter === "Published") { params.isPublished = true; params.isClosed = false; }
      if (statusFilter === "Closed")    params.isClosed = true;
      // Pass billMonth filter — backend supports ?billMonth=YYYY-MM
      if (monthFilter) params.billMonth = monthFilter;
      const res = await maintenanceApi.getAllBills(params);
      setBills(res.data?.bills || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load bills.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, monthFilter]);

  useEffect(() => { loadBills(); }, [loadBills]);

  const handleBillSaved = (bill, mode) => {
    if (mode === "create") setBills((p) => [bill, ...p]);
    else setBills((p) => p.map((b) => b._id === bill._id ? bill : b));
  };

  const publishedBills = bills.filter((b) => b.isPublished && !b.isClosed);
  const totalPending   = publishedBills.reduce((s, b) => s + (b.collectionSummary?.pending    || 0), 0);
  const totalCollected = publishedBills.reduce((s, b) => s + (b.collectionSummary?.collected  || 0), 0);
  const overdueCount   = publishedBills.filter((b) => isOverdue(b)).length;

  return (
    <div className="screen-enter" style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, #1a3a6e 100%)`,
        padding: "24px 20px 32px", marginBottom: -16,
      }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Maintenance
        </div>
        <div style={{ fontSize: 22, fontFamily: "Syne", fontWeight: 800, color: "#fff", marginTop: 4 }}>
          💰 Payments
        </div>
        {isAdmin && bills.length > 0 && (
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: "Syne" }}>{fmt(totalCollected)}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>Collected</div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: totalPending > 0 ? "#FBBF24" : "#fff", fontFamily: "Syne" }}>{fmt(totalPending)}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>Pending</div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: overdueCount > 0 ? "#FC8181" : "#fff", fontFamily: "Syne" }}>{overdueCount}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>Overdue Bills</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* My Payments shortcut */}
        <Card
          style={{ marginBottom: 10, background: C.teal + "0D", border: `1.5px solid ${C.teal}25` }}
          onClick={onOpenMyPayments}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.teal }}>💳 My Payment History</div>
              <div style={{ fontSize: 12, color: C.gray500, marginTop: 2 }}>View your maintenance bills and payment status</div>
            </div>
            <span style={{ fontSize: 20, color: C.teal }}>›</span>
          </div>
        </Card>

        {/* Defaulter list shortcut (admin only) */}
        {isAdmin && (
          <Card
            style={{ marginBottom: 14, background: C.red + "08", border: `1.5px solid ${C.red}20` }}
            onClick={onOpenDefaulters}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.red }}>⚠️ Defaulter Triage</div>
                <div style={{ fontSize: 12, color: C.gray500, marginTop: 2 }}>Residents with unpaid or overdue records</div>
              </div>
              <span style={{ fontSize: 20, color: C.red }}>›</span>
            </div>
          </Card>
        )}

        {/* GAP-5 FIX: Collection analytics chart (admin, published bills only) */}
        {isAdmin && <CollectionChart bills={bills} />}

        {/* Admin controls: status filter + month filter + new bill */}
        {isAdmin && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
                {BILL_STATUS_FILTERS.map((f) => (
                  <button key={f} onClick={() => setStatusFilter(f)} style={{
                    padding: "5px 12px", borderRadius: 20, border: "none",
                    fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                    fontFamily: "Plus Jakarta Sans",
                    background: statusFilter === f ? C.navy : C.gray100,
                    color: statusFilter === f ? "#fff" : C.gray700,
                    transition: "all 0.15s",
                  }}>
                    {f}
                  </button>
                ))}
              </div>
              <Btn small onClick={() => setShowCreate(true)} style={{ marginLeft: 8, flexShrink: 0 }}>
                + New
              </Btn>
            </div>

            {/* Month filter row */}
            <div style={{ marginBottom: 14 }}>
              <MonthPicker value={monthFilter} onChange={setMonthFilter} />
            </div>
          </>
        )}

        {/* Bills list */}
        {loading && [1, 2, 3].map((k) => (
          <div key={k} className="skeleton" style={{ height: 100, borderRadius: 14, marginBottom: 10 }} />
        ))}
        {error && <ErrorState message={error} onRetry={loadBills} />}
        {!loading && !error && bills.length === 0 && (
          <EmptyState
            icon="💰"
            message={
              monthFilter
                ? `No bills for ${monthFilter}.`
                : isAdmin
                  ? "No bills yet. Create your first maintenance bill."
                  : "No maintenance bills have been published yet."
            }
          />
        )}

        {!loading && !error && bills.map((bill) => {
          const status      = billStatusInfo(bill);
          const summary     = bill.collectionSummary || {};
          const overdueBool = isOverdue(bill);
          const paidPct     = summary.total > 0 ? Math.round((summary.collected / summary.total) * 100) : 0;

          return (
            <Card key={bill._id} onClick={() => onOpenBill(bill._id)} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 2 }}>{bill.title}</div>
                  <div style={{ fontSize: 11, color: C.gray500 }}>
                    Due {fmtDate(bill.dueDate)}
                    {bill.billMonth && ` · ${bill.billMonth}`}
                    {overdueBool && <span style={{ color: C.red, marginLeft: 6 }}>⚠️ Overdue</span>}
                  </div>
                  {isAdmin && !bill.isPublished && !bill.isClosed && (
                    <EditBillButton bill={bill} onClick={setEditBill} />
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <span style={{
                    background: status.bg, color: status.text,
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                  }}>
                    {status.label}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: C.navy, fontFamily: "Syne" }}>
                    {fmt(bill.baseAmount)}
                  </span>
                </div>
              </div>

              {bill.isPublished && (
                <>
                  <div style={{ height: 5, background: C.gray100, borderRadius: 3, marginBottom: 8, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${paidPct}%`,
                      background: paidPct === 100 ? C.green : C.teal,
                      borderRadius: 3, transition: "width 0.5s ease",
                    }} />
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.gray500 }}>
                    <span>✅ {bill.paidCount ?? 0} paid</span>
                    <span>⏳ {bill.unpaidCount ?? 0} pending</span>
                    <span style={{ marginLeft: "auto", fontWeight: 700, color: C.teal }}>{paidPct}% collected</span>
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </div>

      <CreateBillModal open={showCreate} onClose={() => setShowCreate(false)} bill={null} onSaved={handleBillSaved} />
      <CreateBillModal
        open={!!editBill}
        onClose={() => setEditBill(null)}
        bill={editBill}
        onSaved={(updatedBill, mode) => { handleBillSaved(updatedBill, mode); setEditBill(null); }}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── DEFAULTER VIEW (Admin sub-screen) ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const DefaulterView = ({ onBack }) => (
  <div className="screen-enter" style={{ paddingBottom: 24 }}>
    <div style={{
      background: `linear-gradient(135deg, ${C.navy} 0%, #1a3a6e 100%)`,
      padding: "16px 20px 28px", marginBottom: -16,
    }}>
      <button onClick={onBack} style={{
        background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8,
        padding: "5px 12px", fontSize: 12, color: "#fff", cursor: "pointer",
        fontFamily: "Plus Jakarta Sans", fontWeight: 600, marginBottom: 12,
      }}>
        ← Back
      </button>
      <div style={{ fontSize: 22, fontFamily: "Syne", fontWeight: 800, color: "#fff" }}>
        ⚠️ Defaulter Triage
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
        Residents with unpaid or overdue bills
      </div>
    </div>
    <div style={{ padding: "24px 16px 0" }}>
      <DefaulterList />
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ROOT: MaintenanceScreen ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export const MaintenanceScreen = () => {
  const { isAdmin } = useAuth();
  // "dashboard" | "detail:<billId>" | "my-payments" | "defaulters"
  const [view, setView] = useState("dashboard");

  if (view === "my-payments") {
    return (
      <div className="screen-enter" style={{ paddingBottom: 24 }}>
        <div style={{
          background: `linear-gradient(135deg, ${C.navy} 0%, #1a3a6e 100%)`,
          padding: "16px 20px 28px", marginBottom: -16,
        }}>
          <button onClick={() => setView("dashboard")} style={{
            background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8,
            padding: "5px 12px", fontSize: 12, color: "#fff", cursor: "pointer",
            fontFamily: "Plus Jakarta Sans", fontWeight: 600, marginBottom: 12,
          }}>
            ← Back
          </button>
          <div style={{ fontSize: 22, fontFamily: "Syne", fontWeight: 800, color: "#fff" }}>
            💳 My Payments
          </div>
        </div>
        <div style={{ paddingTop: 24 }}>
          <MyPaymentsView />
        </div>
      </div>
    );
  }

  if (view === "defaulters") {
    return <DefaulterView onBack={() => setView("dashboard")} />;
  }

  if (view.startsWith("detail:")) {
    const billId = view.replace("detail:", "");
    return (
      <BillDetailView
        billId={billId}
        onBack={() => setView("dashboard")}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <MaintenanceDashboard
      isAdmin={isAdmin}
      onOpenBill={(id)        => setView(`detail:${id}`)}
      onOpenMyPayments={()    => setView("my-payments")}
      onOpenDefaulters={()    => setView("defaulters")}
    />
  );
};
