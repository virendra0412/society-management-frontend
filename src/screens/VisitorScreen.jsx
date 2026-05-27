import { useState, useEffect, useCallback } from "react";
import { visitorApi } from "../api/resources.api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Card, Badge, Modal, Input, Select, Btn,
  EmptyState, ErrorState, PageHeader, Spinner, Avatar,
} from "../components/ui";
import {
  C, VISITOR_STATUS_COLOR, VISITOR_PURPOSE_ICON, VISIT_PURPOSES,
} from "../constants/theme";
import { timeAgo } from "../utils/timeago";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS = {
  invited:  "Invited",
  pending:  "Pending",
  approved: "Inside",
  rejected: "Rejected",
  exited:   "Exited",
  expired:  "Expired",
};

const VisitorBadge = ({ status }) => {
  const s = VISITOR_STATUS_COLOR[status] || VISITOR_STATUS_COLOR.exited;
  return (
    <Badge
      label={STATUS_LABELS[status] || status}
      bg={s.bg} text={s.text} dot={s.dot}
    />
  );
};

// Status filter pill
const FilterPill = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      flexShrink: 0,
      padding: "5px 14px", borderRadius: 20,
      border: `1.5px solid ${active ? C.teal : C.gray100}`,
      background: active ? C.teal : "transparent",
      color: active ? "#fff" : C.gray600,
      fontSize: 12, fontWeight: 600,
      cursor: "pointer", fontFamily: "Plus Jakarta Sans",
      transition: "all 0.15s",
    }}
  >
    {label}
  </button>
);

// ─── OTP Display Modal (shown once after invite creation) ─────────────────────
const OTPModal = ({ otp, visitor, onClose }) => (
  <Modal open={!!otp} onClose={onClose} title="Share this OTP with your visitor">
    <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
      <div style={{ fontSize: 13, color: C.gray500, marginBottom: 16, lineHeight: 1.6 }}>
        Your visitor <strong>{visitor?.name}</strong> will need this OTP at the gate.<br />
        It will <strong>not</strong> be shown again.
      </div>
      {/* OTP display */}
      <div style={{
        background: C.navy, borderRadius: 16, padding: "20px 24px",
        display: "inline-block", marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          Entry OTP
        </div>
        <div style={{
          fontFamily: "Syne", fontSize: 40, fontWeight: 800,
          color: C.amber, letterSpacing: 10,
        }}>
          {otp}
        </div>
      </div>
      {/* Copy button */}
      <CopyOTPButton otp={otp} />
      {visitor?.expectedAt && (
        <div style={{ fontSize: 12, color: C.gray500, marginTop: 12 }}>
          Expected: {new Date(visitor.expectedAt).toLocaleString()}
        </div>
      )}
    </div>
  </Modal>
);

const CopyOTPButton = ({ otp }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(otp).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        margin: "0 auto",
        background: copied ? C.green + "20" : C.gray100,
        border: `1px solid ${copied ? C.green + "40" : C.gray100}`,
        borderRadius: 10, padding: "8px 20px",
        fontSize: 13, fontWeight: 700,
        color: copied ? C.green : C.gray700,
        cursor: "pointer", transition: "all 0.2s",
      }}
    >
      {copied ? "✓ Copied!" : "📋 Copy OTP"}
    </button>
  );
};

// ─── Visitor Card ─────────────────────────────────────────────────────────────
const VisitorCard = ({ v, isAdmin, onApprove, onReject, onVerifyOTP, onMarkExit, busy }) => {
  const purposeIcon = VISITOR_PURPOSE_ICON[v.purpose] || "🚶";
  const isBusy = busy === v._id;

  return (
    <Card>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: C.teal + "15",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
        }}>
          {purposeIcon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{v.name}</div>
            <VisitorBadge status={v.status} />
          </div>
          <div style={{ fontSize: 12, color: C.gray500, marginTop: 2 }}>
            {v.purpose}{v.phone ? ` · 📞 ${v.phone}` : ""}
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "4px 16px",
        fontSize: 11, color: C.gray500, marginBottom: 10,
        padding: "8px 10px", background: C.gray50, borderRadius: 8,
      }}>
        <span>🏠 Flat {v.hostFlat || "—"}</span>
        {v.vehicleNumber && <span>🚗 {v.vehicleNumber}</span>}
        {v.isWalkIn
          ? <span style={{ color: C.amber, fontWeight: 600 }}>Walk-in</span>
          : <span style={{ color: C.blue, fontWeight: 600 }}>Pre-invited</span>}
        {v.expectedAt && <span>📅 Expected {timeAgo(v.expectedAt)}</span>}
        {v.entryTime  && <span>🟢 Entered {timeAgo(v.entryTime)}</span>}
        {v.exitTime   && <span>🔴 Exited {timeAgo(v.exitTime)}</span>}
        <span>🕐 {timeAgo(v.createdAt)}</span>
      </div>

      {v.note && (
        <div style={{ fontSize: 12, color: C.gray700, fontStyle: "italic", marginBottom: 10 }}>
          "{v.note}"
        </div>
      )}

      {/* Action buttons */}
      {/* Resident: approve/reject pending walk-ins */}
      {!isAdmin && v.status === "pending" && (
        <div style={{ display: "flex", gap: 8 }}>
          <Btn small variant="primary" onClick={() => onApprove(v._id)} loading={isBusy === v._id + "_approve"} style={{ flex: 1 }}>
            ✓ Approve
          </Btn>
          <Btn small variant="red" onClick={() => onReject(v._id)} loading={isBusy === v._id + "_reject"} style={{ flex: 1 }}>
            ✕ Reject
          </Btn>
        </div>
      )}

      {/* Admin: verify OTP for invited visitors */}
      {isAdmin && v.status === "invited" && (
        <Btn small onClick={() => onVerifyOTP(v)} loading={isBusy} style={{ width: "100%", background: C.blue, color: "#fff" }}>
          🔑 Verify OTP & Grant Entry
        </Btn>
      )}

      {/* Admin: approve/reject pending walk-ins */}
      {isAdmin && v.status === "pending" && (
        <div style={{ display: "flex", gap: 8 }}>
          <Btn small variant="primary" onClick={() => onApprove(v._id)} loading={isBusy} style={{ flex: 1 }}>
            ✓ Approve Entry
          </Btn>
          <Btn small variant="red" onClick={() => onReject(v._id)} loading={isBusy} style={{ flex: 1 }}>
            ✕ Reject
          </Btn>
        </div>
      )}

      {/* Admin: mark exit for visitors currently inside */}
      {isAdmin && v.status === "approved" && (
        <Btn small variant="ghost" onClick={() => onMarkExit(v._id)} loading={isBusy} style={{ width: "100%" }}>
          🚪 Mark Exit
        </Btn>
      )}
    </Card>
  );
};

// ─── Create Invite Modal (resident) ──────────────────────────────────────────
const CreateInviteModal = ({ open, onClose, onCreated }) => {
  const toast = useToast();
  const [form, setForm] = useState({
    name: "", phone: "", purpose: "Guest",
    vehicleNumber: "", note: "", expectedAt: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const reset = () => setForm({ name: "", phone: "", purpose: "Guest", vehicleNumber: "", note: "", expectedAt: "" });

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error("Visitor name is required.");
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.phone) delete payload.phone;
      if (!payload.vehicleNumber) delete payload.vehicleNumber;
      if (!payload.note) delete payload.note;
      if (!payload.expectedAt) delete payload.expectedAt;

      const res = await visitorApi.createInvite(payload);
      onCreated(res.data.visitor, res.data.otp);
      reset();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to create invite.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title="Invite a Visitor">
      <Input label="Visitor Name *"  value={form.name}          onChange={f("name")}          placeholder="e.g. Amit Shah" />
      <Input label="Phone (optional)" value={form.phone}         onChange={f("phone")}         placeholder="9876543210" type="tel" />
      <Select label="Purpose"        value={form.purpose}       onChange={f("purpose")}       options={VISIT_PURPOSES} />
      <Input label="Vehicle No. (optional)" value={form.vehicleNumber} onChange={f("vehicleNumber")} placeholder="GJ01AB1234" />
      <Input label="Note (optional)" value={form.note}          onChange={f("note")}          placeholder="Coming to help with shift" multiline />
      <Input label="Expected arrival (optional)" value={form.expectedAt} onChange={f("expectedAt")} type="datetime-local" />
      <Btn onClick={handleSubmit} loading={submitting} style={{ width: "100%" }}>
        Generate OTP & Invite
      </Btn>
    </Modal>
  );
};

// ─── Log Walk-in Modal (admin) ────────────────────────────────────────────────
const LogWalkInModal = ({ open, onClose, onLogged }) => {
  const toast = useToast();
  const [form, setForm] = useState({
    name: "", phone: "", purpose: "Guest",
    vehicleNumber: "", note: "", hostId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const reset = () => setForm({ name: "", phone: "", purpose: "Guest", vehicleNumber: "", note: "", hostId: "" });

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error("Visitor name is required.");
    if (!form.hostId.trim()) return toast.error("Resident ID is required.");
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.phone) delete payload.phone;
      if (!payload.vehicleNumber) delete payload.vehicleNumber;
      if (!payload.note) delete payload.note;

      const res = await visitorApi.logWalkIn(payload);
      toast.success("Walk-in logged. Resident notified.");
      onLogged(res.data.visitor);
      reset();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to log walk-in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title="Log Walk-in Visitor">
      <Input label="Visitor Name *" value={form.name}    onChange={f("name")}    placeholder="e.g. Delivery Person" />
      <Input label="Phone (optional)" value={form.phone} onChange={f("phone")}   placeholder="9876543210" type="tel" />
      <Select label="Purpose"       value={form.purpose} onChange={f("purpose")} options={VISIT_PURPOSES} />
      <Input label="Vehicle No. (optional)" value={form.vehicleNumber} onChange={f("vehicleNumber")} placeholder="GJ01AB1234" />
      <Input label="Note (optional)" value={form.note}   onChange={f("note")}    placeholder="Any note for resident" multiline />
      <Input
        label="Resident ID *"
        value={form.hostId}
        onChange={f("hostId")}
        placeholder="Paste resident's user ID"
      />
      <div style={{ fontSize: 11, color: C.gray500, marginTop: -10, marginBottom: 14, lineHeight: 1.5 }}>
        ℹ️ Find the resident's ID from the admin panel or ask them to share it.
      </div>
      <Btn onClick={handleSubmit} loading={submitting} style={{ width: "100%" }}>
        Log Walk-in
      </Btn>
    </Modal>
  );
};

// ─── Verify OTP Modal (admin) ─────────────────────────────────────────────────
const VerifyOTPModal = ({ open, visitor, onClose, onVerified }) => {
  const toast = useToast();
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => { if (open) setOtp(""); }, [open]);

  const handleVerify = async () => {
    if (otp.length !== 6) return toast.error("Enter the 6-digit OTP.");
    setVerifying(true);
    try {
      const res = await visitorApi.verifyOTP(visitor._id, otp);
      toast.success("OTP verified. Entry granted!");
      onVerified(res.data.visitor);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || "Invalid or expired OTP.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Verify Entry OTP">
      {visitor && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.gray50, borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: 28 }}>{VISITOR_PURPOSE_ICON[visitor.purpose] || "🚶"}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{visitor.name}</div>
              <div style={{ fontSize: 12, color: C.gray500 }}>{visitor.purpose} · Flat {visitor.hostFlat}</div>
            </div>
          </div>
          <Input
            label="6-digit OTP *"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Enter OTP from visitor"
            type="number"
          />
          <Btn onClick={handleVerify} loading={verifying} style={{ width: "100%", background: C.blue, color: "#fff" }}>
            ✓ Verify & Grant Entry
          </Btn>
        </div>
      )}
    </Modal>
  );
};

// ─── Main VisitorScreen ───────────────────────────────────────────────────────
export const VisitorScreen = () => {
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [visitors,    setVisitors]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [showInvite,  setShowInvite]  = useState(false);
  const [showWalkIn,  setShowWalkIn]  = useState(false);
  const [otpData,     setOtpData]     = useState(null);  // { otp, visitor }
  const [otpTarget,   setOtpTarget]   = useState(null);  // visitor to verify

  const [busy, setBusy] = useState(null); // visitorId being actioned

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchVisitors = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { limit: 50, sort: "-createdAt" };
      if (statusFilter !== "all") params.status = statusFilter;

      const res = isAdmin
        ? await visitorApi.getAll(params)
        : await visitorApi.getMyVisitors(params);

      setVisitors(res.data?.visitors || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load visitors.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, statusFilter]);

  useEffect(() => { fetchVisitors(); }, [fetchVisitors]);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleInviteCreated = (visitor, otp) => {
    setVisitors((p) => [visitor, ...p]);
    setOtpData({ otp, visitor });
  };

  const handleWalkInLogged = (visitor) => {
    setVisitors((p) => [visitor, ...p]);
  };

  const patchVisitor = (updated) =>
    setVisitors((p) => p.map((v) => v._id === updated._id ? updated : v));

  const handleApprove = async (id) => {
    setBusy(id);
    try {
      const res = await visitorApi.approveWalkIn(id);
      patchVisitor(res.data.visitor);
      toast.success("Visitor entry approved.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Approval failed.");
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (id) => {
    setBusy(id);
    try {
      const res = await visitorApi.rejectWalkIn(id);
      patchVisitor(res.data.visitor);
      toast.success("Visitor rejected.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Rejection failed.");
    } finally {
      setBusy(null);
    }
  };

  const handleVerified = (updated) => {
    patchVisitor(updated);
  };

  const handleMarkExit = async (id) => {
    setBusy(id);
    try {
      const res = await visitorApi.markExit(id);
      patchVisitor(res.data.visitor);
      toast.success("Visitor exit recorded.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to mark exit.");
    } finally {
      setBusy(null);
    }
  };

  // ── Filter tabs ───────────────────────────────────────────────────────────────
  const FILTERS = isAdmin
    ? ["all", "invited", "pending", "approved", "rejected", "exited"]
    : ["all", "invited", "pending", "approved", "exited"];

  const FILTER_LABELS = {
    all: "All", invited: "Invited", pending: "Pending",
    approved: "Inside", rejected: "Rejected", exited: "Exited",
  };

  // Count pending for badge
  const pendingCount = visitors.filter((v) => v.status === "pending").length;

  return (
    <div className="screen-enter" style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, #1a3a6e 100%)`,
        padding: "20px 20px 28px", marginBottom: -4,
      }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {isAdmin ? "Security Desk" : "My Visitors"}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <div style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 800, color: "#fff" }}>
            🚶 Visitor Management
          </div>
          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            {isAdmin && (
              <button
                onClick={() => setShowWalkIn(true)}
                style={{
                  background: C.amber, color: "#fff", border: "none",
                  borderRadius: 10, padding: "7px 12px",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  fontFamily: "Plus Jakarta Sans",
                }}
              >
                + Walk-in
              </button>
            )}
            {!isAdmin && (
              <button
                onClick={() => setShowInvite(true)}
                style={{
                  background: C.teal, color: "#fff", border: "none",
                  borderRadius: 10, padding: "7px 12px",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  fontFamily: "Plus Jakarta Sans",
                }}
              >
                + Invite
              </button>
            )}
          </div>
        </div>
        {/* Pending alert for residents */}
        {!isAdmin && pendingCount > 0 && (
          <div style={{
            marginTop: 12, background: C.amber + "25",
            border: `1px solid ${C.amber}50`, borderRadius: 10,
            padding: "8px 12px", display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>🔔</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.amber }}>
              {pendingCount} walk-in{pendingCount > 1 ? "s" : ""} awaiting your approval
            </span>
          </div>
        )}
      </div>

      {/* Status filter pills */}
      <div style={{
        display: "flex", gap: 8, overflowX: "auto",
        padding: "14px 16px", scrollbarWidth: "none",
      }}>
        {FILTERS.map((f) => (
          <FilterPill
            key={f}
            label={FILTER_LABELS[f]}
            active={statusFilter === f}
            onClick={() => setStatusFilter(f)}
          />
        ))}
      </div>

      {/* List */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading && [1,2,3].map((k) => (
          <div key={k} className="skeleton" style={{ height: 130, borderRadius: 14 }} />
        ))}
        {error && <ErrorState message={error} onRetry={fetchVisitors} />}
        {!loading && !error && visitors.length === 0 && (
          <EmptyState
            icon="🚶"
            message={
              statusFilter === "all"
                ? isAdmin ? "No visitor records yet." : "No visitors yet. Invite someone!"
                : `No ${FILTER_LABELS[statusFilter].toLowerCase()} visitors.`
            }
          />
        )}
        {!loading && !error && visitors.map((v) => (
          <VisitorCard
            key={v._id}
            v={v}
            isAdmin={isAdmin}
            busy={busy}
            onApprove={handleApprove}
            onReject={handleReject}
            onVerifyOTP={(visitor) => setOtpTarget(visitor)}
            onMarkExit={handleMarkExit}
          />
        ))}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <CreateInviteModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        onCreated={handleInviteCreated}
      />

      <LogWalkInModal
        open={showWalkIn}
        onClose={() => setShowWalkIn(false)}
        onLogged={handleWalkInLogged}
      />

      <OTPModal
        otp={otpData?.otp}
        visitor={otpData?.visitor}
        onClose={() => setOtpData(null)}
      />

      <VerifyOTPModal
        open={!!otpTarget}
        visitor={otpTarget}
        onClose={() => setOtpTarget(null)}
        onVerified={handleVerified}
      />
    </div>
  );
};
