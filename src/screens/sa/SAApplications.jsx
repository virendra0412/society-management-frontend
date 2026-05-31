/**
 * SAApplications.jsx
 * Society onboarding application management.
 *
 * Calls:
 *   GET  /superadmin/applications?status=
 *   GET  /superadmin/applications/:id
 *   PATCH /superadmin/applications/:id/approve  → creates Society + admin User + trial subscription
 *   PATCH /superadmin/applications/:id/reject   { note }
 */
import { useState, useEffect, useCallback } from "react";
import { saApplicationsApi } from "../../api/sa.api";
import {
  SA, SABadge, SACard, SABtn, SASpinner, SAError, SAModal,
  SAInput, SectionHeader, SAEmpty, FilterPills, APP_STATUS_COLOR,
} from "../../components/SAComponents";
import { timeAgo } from "../../utils/timeago";

// ─── Application Detail ───────────────────────────────────────────────────────
const AppDetail = ({ app, onApproved, onRejected, onClose }) => {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [busy,       setBusy]       = useState(false);

  const sc = APP_STATUS_COLOR[app.status] ?? APP_STATUS_COLOR.pending;

  const handleApprove = async () => {
    setBusy(true);
    try {
      const res = await saApplicationsApi.approve(app._id);
      onApproved(app._id, res.data?.application ?? res.data);
    } catch (err) {
      alert(err.response?.data?.message || "Approve failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) return;
    setBusy(true);
    try {
      const res = await saApplicationsApi.reject(app._id, rejectNote.trim());
      onRejected(app._id, res.data?.application ?? res.data);
      setRejectOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || "Reject failed.");
    } finally {
      setBusy(false);
    }
  };

  const Field = ({ label, value }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: SA.textDim, marginBottom: 3, fontWeight: 600, letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: SA.white }}>{value || "—"}</div>
    </div>
  );

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 24 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: SA.accent + "18",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24,
        }}>
          🏘️
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: SA.white, fontFamily: "Syne", marginBottom: 4 }}>
            {app.societyName}
          </div>
          <div style={{ fontSize: 12, color: SA.textDim, marginBottom: 8 }}>
            {app.city}{app.state ? `, ${app.state}` : ""} · Applied {timeAgo(app.createdAt)}
          </div>
          <SABadge label={app.status} bg={sc.bg} text={sc.text} dot={sc.dot} />
        </div>
      </div>

      {/* Society details */}
      <div style={{
        background: SA.bg, borderRadius: 12, padding: "16px",
        border: `1px solid ${SA.border}`, marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, color: SA.textDim, fontWeight: 700, marginBottom: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Society Info
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Field label="Society Name"  value={app.societyName} />
          <Field label="Total Units"   value={app.totalUnits} />
          <Field label="Address"       value={app.address} />
          <Field label="City / State"  value={`${app.city ?? ""}${app.state ? `, ${app.state}` : ""}`} />
        </div>
      </div>

      {/* Admin contact */}
      <div style={{
        background: SA.bg, borderRadius: 12, padding: "16px",
        border: `1px solid ${SA.border}`, marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, color: SA.textDim, fontWeight: 700, marginBottom: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Admin Contact
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Field label="Name"   value={app.adminName  ?? app.admin?.name} />
          <Field label="Email"  value={app.adminEmail ?? app.admin?.email} />
          <Field label="Phone"  value={app.adminPhone ?? app.admin?.phone} />
        </div>
      </div>

      {/* Rejection note if already rejected */}
      {app.status === "rejected" && app.rejectionNote && (
        <div style={{
          background: SA.red + "10", border: `1px solid ${SA.red}30`,
          borderRadius: 10, padding: "12px 14px", marginBottom: 20,
          fontSize: 12, color: SA.red,
        }}>
          <strong>Rejection reason:</strong> {app.rejectionNote}
        </div>
      )}

      {/* Approval info if approved */}
      {app.status === "approved" && (
        <div style={{
          background: SA.green + "10", border: `1px solid ${SA.green}30`,
          borderRadius: 10, padding: "12px 14px", marginBottom: 20,
          fontSize: 12, color: SA.green,
        }}>
          ✅ Society created with trial subscription. Admin credentials sent to {app.adminEmail ?? app.admin?.email}.
        </div>
      )}

      {/* Actions — only for pending */}
      {app.status === "pending" && (
        <div style={{ display: "flex", gap: 10 }}>
          <SABtn
            variant="primary"
            loading={busy}
            onClick={handleApprove}
            style={{ flex: 1, justifyContent: "center" }}
          >
            ✓ Approve &amp; Create Society
          </SABtn>
          <SABtn
            variant="danger"
            disabled={busy}
            onClick={() => setRejectOpen(true)}
            style={{ flex: 1, justifyContent: "center" }}
          >
            ✕ Reject
          </SABtn>
        </div>
      )}

      {/* Reject modal */}
      <SAModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject Application"
        width={420}
      >
        <div style={{ fontSize: 13, color: SA.textDim, marginBottom: 16 }}>
          Provide a reason so the applicant knows why their application was rejected.
        </div>
        <SAInput
          label="Rejection Note *"
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
          placeholder="e.g. Incomplete information provided. Please re-apply with full address and admin details."
          multiline
        />
        <div style={{ display: "flex", gap: 8 }}>
          <SABtn
            variant="ghost"
            onClick={() => setRejectOpen(false)}
            style={{ flex: 1, justifyContent: "center" }}
          >
            Cancel
          </SABtn>
          <SABtn
            variant="danger"
            loading={busy}
            disabled={!rejectNote.trim()}
            onClick={handleReject}
            style={{ flex: 1, justifyContent: "center" }}
          >
            Confirm Reject
          </SABtn>
        </div>
      </SAModal>
    </>
  );
};

// ─── Application Card (list item) ─────────────────────────────────────────────
const AppCard = ({ app, onSelect }) => {
  const sc = APP_STATUS_COLOR[app.status] ?? APP_STATUS_COLOR.pending;
  return (
    <SACard onClick={() => onSelect(app)} style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: SA.accent + "15",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
        }}>
          🏘️
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: SA.white, marginBottom: 3,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            {app.societyName}
            <SABadge label={app.status} bg={sc.bg} text={sc.text} dot={sc.dot} />
          </div>
          <div style={{ fontSize: 12, color: SA.textDim, marginBottom: 4 }}>
            {app.city}{app.state ? `, ${app.state}` : ""} · {app.totalUnits} units
          </div>
          <div style={{ fontSize: 11, color: SA.gray400 }}>
            {app.adminName ?? app.admin?.name ?? "—"} · {app.adminEmail ?? app.admin?.email ?? "—"}
          </div>
        </div>
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          <div style={{ fontSize: 11, color: SA.textDim }}>{timeAgo(app.createdAt)}</div>
          <div style={{ fontSize: 10, color: SA.accent, marginTop: 4 }}>View →</div>
        </div>
      </div>
    </SACard>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const STATUS_FILTERS = [
  { value: "all",      label: "All"      },
  { value: "pending",  label: "Pending"  },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export const SAApplications = () => {
  const [apps,     setApps]     = useState([]);
  const [counts,   setCounts]   = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [filter,   setFilter]   = useState("all");
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [selected, setSelected] = useState(null); // open in modal

  const load = useCallback(async (f = filter) => {
    setLoading(true); setError(null);
    try {
      const params = f !== "all" ? { status: f } : {};
      const res    = await saApplicationsApi.getAll(params);
      const list   = res.data?.applications ?? res.data ?? [];
      setApps(list);
      // Build counts from the "all" fetch
      if (f === "all") {
        const c = { all: list.length, pending: 0, approved: 0, rejected: 0 };
        list.forEach((a) => { if (c[a.status] != null) c[a.status]++; });
        setCounts(c);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(filter); }, [filter]);

  const handleApproved = (id, updated) => {
    setApps((prev) => prev.map((a) => a._id === id ? (updated || { ...a, status: "approved" }) : a));
    setSelected(null);
    setCounts((c) => ({ ...c, pending: Math.max(0, c.pending - 1), approved: c.approved + 1 }));
  };

  const handleRejected = (id, updated) => {
    setApps((prev) => prev.map((a) => a._id === id ? (updated || { ...a, status: "rejected" }) : a));
    setSelected(null);
    setCounts((c) => ({ ...c, pending: Math.max(0, c.pending - 1), rejected: c.rejected + 1 }));
  };

  const filterOptions = STATUS_FILTERS.map((f) => ({
    ...f, count: counts[f.value],
  }));

  return (
    <div>
      <SectionHeader title="Society Applications" />

      {/* Pending alert */}
      {counts.pending > 0 && (
        <div style={{
          background: SA.amber + "12", border: `1px solid ${SA.amber}30`,
          borderRadius: 10, padding: "12px 16px", marginBottom: 18,
          display: "flex", alignItems: "center", gap: 10, fontSize: 13,
        }}>
          <span style={{ fontSize: 18 }}>⏳</span>
          <span style={{ color: SA.amber, fontWeight: 700 }}>
            {counts.pending} pending application{counts.pending > 1 ? "s" : ""} awaiting review
          </span>
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: 18 }}>
        <FilterPills options={filterOptions} active={filter} onChange={setFilter} />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <SASpinner size={28} />
        </div>
      ) : error ? (
        <SAError message={error} onRetry={() => load(filter)} />
      ) : apps.length === 0 ? (
        <SAEmpty icon="📋" message={`No ${filter !== "all" ? filter : ""} applications found.`} />
      ) : (
        apps.map((app) => (
          <AppCard key={app._id} app={app} onSelect={setSelected} />
        ))
      )}

      {/* Detail modal */}
      <SAModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Application Detail"
        width={560}
      >
        {selected && (
          <AppDetail
            app={selected}
            onApproved={handleApproved}
            onRejected={handleRejected}
            onClose={() => setSelected(null)}
          />
        )}
      </SAModal>
    </div>
  );
};