/**
 * SASocieties.jsx
 * Society management — subscription control, suspend/reactivate, admin transfer.
 *
 * Calls:
 *   GET /superadmin/societies?plan=&status=&search=
 *   PATCH /superadmin/societies/:id/subscription
 *   PATCH /superadmin/societies/:id/suspend
 *   PATCH /superadmin/societies/:id/reactivate
 *   PATCH /superadmin/societies/:id/transfer-admin
 *   POST /superadmin/societies/:id/reset-admin-password
 */
import { useState, useEffect, useCallback } from "react";
import { saSocietiesApi } from "../../api/sa.api";
import {
  SA, SABadge, SACard, SABtn, SASpinner, SAError,
  SAModal, SAInput, SectionHeader, SAEmpty, FilterPills,
  PLAN_COLOR, SUB_STATUS_COLOR,
} from "../../components/SAComponents";
import { timeAgo } from "../../utils/timeago";

// ─── Society Action Modal ─────────────────────────────────────────────────────
const SocietyActionModal = ({ society, open, onClose, onSuccess }) => {
  const [action, setAction] = useState(null); // "plan" | "suspend" | "transfer" | "resetpass"
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ plan: society?.subscriptionPlan, newAdminEmail: "", reason: "" });
  const [error, setError] = useState("");

  const handleUpdatePlan = async () => {
    if (!form.plan?.trim()) return setError("Plan is required");
    setBusy(true); setError("");
    try {
      const res = await saSocietiesApi.updateSub(society._id, { plan: form.plan });
      onSuccess(society._id, res.data ?? res);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleSuspend = async () => {
    if (!form.reason?.trim()) return setError("Reason is required");
    setBusy(true); setError("");
    try {
      const res = await saSocietiesApi.suspend(society._id, form.reason.trim());
      onSuccess(society._id, res.data ?? res);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Suspend failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleReactivate = async () => {
    setBusy(true); setError("");
    try {
      const res = await saSocietiesApi.reactivate(society._id);
      onSuccess(society._id, res.data ?? res);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Reactivate failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleTransferAdmin = async () => {
    if (!form.newAdminEmail?.trim()) return setError("Email is required");
    setBusy(true); setError("");
    try {
      const res = await saSocietiesApi.transferAdmin(society._id, { newAdminEmail: form.newAdminEmail.trim() });
      onSuccess(society._id, res.data ?? res);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Transfer failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async () => {
    setBusy(true); setError("");
    try {
      const res = await saSocietiesApi.resetAdminPass(society._id);
      onSuccess(society._id, res.data ?? res);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!society) return null;

  return (
    <SAModal open={open} onClose={onClose} title="Society Actions" width={480}>
      {!action ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SABtn
            variant="primary"
            onClick={() => { setAction("plan"); setForm({ ...form, plan: society?.subscriptionPlan }); }}
            style={{ justifyContent: "flex-start", padding: "12px 16px", background: SA.surface }}
          >
            📋 Update Subscription Plan
          </SABtn>
          <SABtn
            variant="primary"
            onClick={() => { setAction("transfer"); setForm({ ...form, newAdminEmail: "" }); }}
            style={{ justifyContent: "flex-start", padding: "12px 16px", background: SA.surface }}
          >
            👤 Transfer Admin
          </SABtn>
          <SABtn
            variant="primary"
            onClick={() => { setAction("resetpass"); }}
            style={{ justifyContent: "flex-start", padding: "12px 16px", background: SA.surface }}
          >
            🔑 Reset Admin Password
          </SABtn>
          {society.subscriptionStatus === "active" && (
            <SABtn
              variant="danger"
              onClick={() => { setAction("suspend"); setForm({ ...form, reason: "" }); }}
              style={{ justifyContent: "flex-start", padding: "12px 16px" }}
            >
              ⏸️ Suspend Society
            </SABtn>
          )}
          {society.subscriptionStatus === "suspended" && (
            <SABtn
              variant="primary"
              onClick={() => { setAction("reactivate"); }}
              style={{ justifyContent: "flex-start", padding: "12px 16px", background: SA.green + "20", color: SA.green }}
            >
              ▶️ Reactivate Society
            </SABtn>
          )}
        </div>
      ) : action === "plan" ? (
        <div>
          <SectionHeader title="Update Subscription Plan" />
          <select
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value })}
            style={{
              width: "100%", background: SA.bg, border: `1.5px solid ${error ? SA.red : SA.border}`,
              borderRadius: 10, padding: "10px 12px", fontSize: 13,
              color: SA.text, outline: "none", fontFamily: "Plus Jakarta Sans",
              boxSizing: "border-box", marginBottom: 14,
            }}
          >
            <option value="trial">Trial</option>
            <option value="starter">Starter</option>
            <option value="premium">Premium</option>
            <option value="enterprise">Enterprise</option>
          </select>
          {error && <div style={{ fontSize: 11, color: SA.red, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <SABtn
              variant="ghost"
              onClick={() => setAction(null)}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Back
            </SABtn>
            <SABtn
              variant="primary"
              loading={busy}
              onClick={handleUpdatePlan}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Update
            </SABtn>
          </div>
        </div>
      ) : action === "suspend" ? (
        <div>
          <SectionHeader title="Suspend Society" />
          <SAInput
            label="Suspension Reason *"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="e.g. Non-payment, policy violation"
            multiline
          />
          {error && <div style={{ fontSize: 11, color: SA.red, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <SABtn
              variant="ghost"
              onClick={() => setAction(null)}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Back
            </SABtn>
            <SABtn
              variant="danger"
              loading={busy}
              onClick={handleSuspend}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Suspend
            </SABtn>
          </div>
        </div>
      ) : action === "reactivate" ? (
        <div>
          <SectionHeader title="Reactivate Society" />
          <div style={{ fontSize: 13, color: SA.textDim, marginBottom: 16 }}>
            Are you sure you want to reactivate this society? It will be accessible again.
          </div>
          {error && <div style={{ fontSize: 11, color: SA.red, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <SABtn
              variant="ghost"
              onClick={() => setAction(null)}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Cancel
            </SABtn>
            <SABtn
              variant="primary"
              loading={busy}
              onClick={handleReactivate}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Reactivate
            </SABtn>
          </div>
        </div>
      ) : action === "transfer" ? (
        <div>
          <SectionHeader title="Transfer Admin" />
          <SAInput
            label="New Admin Email *"
            value={form.newAdminEmail}
            onChange={(e) => setForm({ ...form, newAdminEmail: e.target.value })}
            placeholder="admin@example.com"
            type="email"
          />
          {error && <div style={{ fontSize: 11, color: SA.red, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <SABtn
              variant="ghost"
              onClick={() => setAction(null)}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Back
            </SABtn>
            <SABtn
              variant="primary"
              loading={busy}
              onClick={handleTransferAdmin}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Transfer
            </SABtn>
          </div>
        </div>
      ) : action === "resetpass" ? (
        <div>
          <SectionHeader title="Reset Admin Password" />
          <div style={{ fontSize: 13, color: SA.textDim, marginBottom: 16 }}>
            A password reset link will be sent to the admin's email.
          </div>
          {error && <div style={{ fontSize: 11, color: SA.red, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <SABtn
              variant="ghost"
              onClick={() => setAction(null)}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Cancel
            </SABtn>
            <SABtn
              variant="primary"
              loading={busy}
              onClick={handleResetPassword}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Send Reset Link
            </SABtn>
          </div>
        </div>
      ) : null}
    </SAModal>
  );
};

// ─── Society Card ─────────────────────────────────────────────────────────────
const SocietyCard = ({ society, onActions }) => {
  const planColor = PLAN_COLOR[society.subscriptionPlan] || PLAN_COLOR.trial;
  const statusColor = SUB_STATUS_COLOR[society.subscriptionStatus] || SUB_STATUS_COLOR.active;

  return (
    <SACard style={{ marginBottom: 10, cursor: "pointer" }}>
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
            fontSize: 14, fontWeight: 700, color: SA.white, marginBottom: 4,
          }}>
            {society.societyName}
          </div>
          <div style={{ fontSize: 12, color: SA.textDim, marginBottom: 6 }}>
            {society.city}{society.state ? `, ${society.state}` : ""} · {society.totalUnits} units
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <SABadge label={planColor.label} bg={planColor.bg} text={planColor.text} />
            <SABadge label={society.subscriptionStatus} bg={statusColor.bg} text={statusColor.text} dot={statusColor.dot} />
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          <button
            onClick={() => onActions(society)}
            style={{
              background: SA.accent + "20", border: "none", color: SA.accent,
              borderRadius: 8, padding: "8px 12px", cursor: "pointer",
              fontSize: 12, fontWeight: 700, fontFamily: "Plus Jakarta Sans",
            }}
          >
            Actions →
          </button>
        </div>
      </div>
    </SACard>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const FILTER_OPTIONS = [
  { value: "all",      label: "All"      },
  { value: "active",   label: "Active"   },
  { value: "trial",    label: "Trial"    },
  { value: "expired",  label: "Expired"  },
  { value: "suspended",label: "Suspended"},
];

export const SASocieties = () => {
  const [societies,  setSocieties]  = useState([]);
  const [filter,     setFilter]     = useState("all");
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [selected,   setSelected]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = {};
      if (filter !== "all") params.status = filter;
      if (search.trim()) params.search = search.trim();
      const res = await saSocietiesApi.getAll(params);
      const list = res.data?.societies ?? res.data ?? [];
      setSocieties(list);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load societies.");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const handleSuccess = (id, updated) => {
    setSocieties((prev) => prev.map((s) => s._id === id ? (updated || s) : s));
    setSelected(null);
  };

  return (
    <div>
      <SectionHeader title="Societies Management" />

      {/* Search & Filter */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by society name..."
            style={{
              width: "100%", background: SA.bg, border: `1.5px solid ${SA.border}`,
              borderRadius: 10, padding: "10px 12px", fontSize: 13,
              color: SA.text, outline: "none", fontFamily: "Plus Jakarta Sans",
              boxSizing: "border-box",
            }}
          />
        </div>
        <FilterPills
          options={FILTER_OPTIONS}
          active={filter}
          onChange={setFilter}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <SASpinner size={28} />
        </div>
      ) : error ? (
        <SAError message={error} onRetry={load} />
      ) : societies.length === 0 ? (
        <SAEmpty icon="🏘️" message="No societies found." />
      ) : (
        societies.map((society) => (
          <SocietyCard
            key={society._id}
            society={society}
            onActions={setSelected}
          />
        ))
      )}

      {/* Action Modal */}
      <SocietyActionModal
        society={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onSuccess={handleSuccess}
      />
    </div>
  );
};
