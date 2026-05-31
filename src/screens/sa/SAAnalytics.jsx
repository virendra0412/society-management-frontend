/**
 * SAAnalytics.jsx
 * Per-society analytics — residents, issues, maintenance, activity.
 *
 * Calls:
 *   GET /superadmin/societies  — to get society list
 *   GET /superadmin/analytics/societies/:id  — per-society analytics
 */
import { useState, useEffect, useCallback } from "react";
import { saAnalyticsApi, saSocietiesApi } from "../../api/sa.api";
import {
  SA, StatCard, SACard, SASpinner, SAError,
  SectionHeader, SAEmpty,
} from "../../components/SAComponents";

// ─── Activity Timeline Item ───────────────────────────────────────────────────
const ActivityItem = ({ label, value, icon, color = SA.textDim }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 0", borderBottom: `1px solid ${SA.border}`,
  }}>
    <span style={{ fontSize: 20 }}>{icon}</span>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, color: SA.textDim }}>{label}</div>
    </div>
    <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "Syne" }}>
      {value ?? "—"}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const SAAnalytics = () => {
  const [societies,       setSocieties]       = useState([]);
  const [selectedSociety, setSelectedSociety] = useState(null);
  const [analytics,       setAnalytics]       = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [loadingAnalytics,setLoadingAnalytics]= useState(false);
  const [error,           setError]           = useState(null);

  // Load societies list
  useEffect(() => {
    const loadSocieties = async () => {
      setLoading(true); setError(null);
      try {
        const res = await saSocietiesApi.getAll({ limit: 100 });
        const list = res.data?.societies ?? res.data ?? [];
        setSocieties(list);
        if (list.length > 0) {
          setSelectedSociety(list[0]._id);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load societies.");
      } finally {
        setLoading(false);
      }
    };
    loadSocieties();
  }, []);

  // Load analytics for selected society
  const loadAnalytics = useCallback(async (societyId) => {
    if (!societyId) return;
    setLoadingAnalytics(true);
    try {
      const res = await saAnalyticsApi.societyDetail(societyId);
      setAnalytics(res.data ?? res);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load analytics.");
      setAnalytics(null);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSociety) loadAnalytics(selectedSociety);
  }, [selectedSociety, loadAnalytics]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
        <SASpinner size={32} />
      </div>
    );
  }

  if (error && societies.length === 0) {
    return <SAError message={error} onRetry={() => window.location.reload()} />;
  }

  if (societies.length === 0) {
    return <SAEmpty icon="🏘️" message="No societies available." />;
  }

  const current = societies.find((s) => s._id === selectedSociety);
  const stats = analytics ?? {};

  // Destructure analytics
  const residents    = stats.residents    ?? {};
  const issues       = stats.issues       ?? {};
  const maintenance  = stats.maintenance  ?? {};
  const activity     = stats.activity     ?? {};

  const totalRes     = residents.total    ?? 0;
  const activeRes    = residents.active   ?? 0;
  const openIssues   = issues.open        ?? 0;
  const maintenancePct= maintenance.collectionPercentage ?? 0;

  return (
    <div style={{ paddingBottom: 40 }}>
      <SectionHeader title="Per-Society Analytics" />

      {/* Society Selector */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: SA.textDim, display: "block", marginBottom: 6 }}>
          Select Society
        </label>
        <select
          value={selectedSociety}
          onChange={(e) => setSelectedSociety(e.target.value)}
          style={{
            width: "100%", background: SA.bg, border: `1.5px solid ${SA.border}`,
            borderRadius: 10, padding: "10px 12px", fontSize: 13,
            color: SA.text, outline: "none", fontFamily: "Plus Jakarta Sans",
            boxSizing: "border-box",
          }}
        >
          {societies.map((s) => (
            <option key={s._id} value={s._id}>
              {s.societyName} · {s.city}{s.state ? `, ${s.state}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Header with society info */}
      {current && (
        <div style={{
          background: SA.surface, borderRadius: 14, padding: "16px",
          border: `1px solid ${SA.border}`, marginBottom: 20,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: SA.accent + "18",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20,
          }}>
            🏘️
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: SA.white }}>
              {current.societyName}
            </div>
            <div style={{ fontSize: 11, color: SA.textDim }}>
              {current.address ? `${current.address} · ` : ""}{current.city}{current.state ? `, ${current.state}` : ""} · {current.totalUnits} units
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {loadingAnalytics ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <SASpinner size={28} />
        </div>
      ) : (
        <>
          {/* Primary stats */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <StatCard icon="👥" label="Total Residents"      value={totalRes}     color={SA.blue}   />
            <StatCard icon="✅" label="Active Residents"     value={activeRes}    color={SA.green}  />
            <StatCard icon="🔧" label="Open Issues"         value={openIssues}   color={SA.amber}  />
            <StatCard
              icon="💰" label="Maintenance Collection %"
              value={maintenancePct ? `${maintenancePct}%` : "—"}
              color={maintenancePct >= 80 ? SA.green : maintenancePct >= 50 ? SA.amber : SA.red}
            />
          </div>

          {/* Activity details */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
            {/* Recent Activity */}
            <SACard style={{ flex: "1 1 240px" }}>
              <SectionHeader title="Monthly Activity" />
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <ActivityItem icon="🏘️" label="New Residents This Month" value={activity.newResidents ?? "—"} />
                <ActivityItem icon="🔧" label="Issues Filed" value={activity.issuesFiled ?? "—"} />
                <ActivityItem icon="💰" label="Maintenance Collected" value={activity.maintenanceCollected ? `₹${(activity.maintenanceCollected / 1000).toFixed(1)}k` : "—"} />
                <ActivityItem icon="📅" label="Events Held" value={activity.events ?? "—"} />
              </div>
            </SACard>

            {/* Breakdown */}
            <SACard style={{ flex: "1 1 240px" }}>
              <SectionHeader title="Resident Breakdown" />
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <ActivityItem
                  icon="👤"
                  label="Approved Residents"
                  value={residents.approved ?? 0}
                  color={SA.green}
                />
                <ActivityItem
                  icon="⏳"
                  label="Pending Approval"
                  value={residents.pending ?? 0}
                  color={SA.amber}
                />
                <ActivityItem
                  icon="👥"
                  label="Visitors Registered"
                  value={residents.visitors ?? 0}
                  color={SA.blue}
                />
                <ActivityItem
                  icon="🚙"
                  label="Vehicles Registered"
                  value={residents.vehicles ?? 0}
                  color={SA.purple}
                />
              </div>
            </SACard>
          </div>

          {/* Issues Summary */}
          <div style={{ marginBottom: 20 }}>
            <SACard>
              <SectionHeader title="Issues Status" />
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <ActivityItem
                  icon="🆕"
                  label="New/Unassigned"
                  value={issues.new ?? 0}
                  color={SA.amber}
                />
                <ActivityItem
                  icon="⚙️"
                  label="In Progress"
                  value={issues.inProgress ?? 0}
                  color={SA.blue}
                />
                <ActivityItem
                  icon="✅"
                  label="Resolved"
                  value={issues.resolved ?? 0}
                  color={SA.green}
                />
                <ActivityItem
                  icon="❌"
                  label="Closed"
                  value={issues.closed ?? 0}
                  color={SA.gray400}
                />
              </div>
            </SACard>
          </div>

          {/* Maintenance Details */}
          <div>
            <SACard>
              <SectionHeader title="Maintenance Info" />
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <ActivityItem
                  icon="💰"
                  label="Total Maintenance Collected"
                  value={maintenance.totalCollected ? `₹${(maintenance.totalCollected / 1000).toFixed(1)}k` : "—"}
                  color={SA.green}
                />
                <ActivityItem
                  icon="📊"
                  label="Collection Rate"
                  value={maintenance.collectionPercentage ? `${maintenance.collectionPercentage}%` : "—"}
                  color={maintenancePct >= 80 ? SA.green : maintenancePct >= 50 ? SA.amber : SA.red}
                />
                <ActivityItem
                  icon="💳"
                  label="Outstanding Amount"
                  value={maintenance.outstanding ? `₹${(maintenance.outstanding / 1000).toFixed(1)}k` : "—"}
                  color={SA.red}
                />
              </div>
            </SACard>
          </div>
        </>
      )}
    </div>
  );
};
