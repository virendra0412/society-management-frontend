/**
 * SADashboard.jsx
 * Global platform analytics overview.
 *
 * Calls: GET /superadmin/analytics/overview?period=7d|30d|90d
 * Shows: society counts, MRR, resident counts, pending applications,
 *        subscription distribution mini-chart, recent applications list.
 */
import { useState, useEffect, useCallback } from "react";
import { saAnalyticsApi, saApplicationsApi } from "../../api/sa.api";
import {
  SA, StatCard, SACard, SABadge, SASpinner, SAError,
  SectionHeader, PLAN_COLOR, SUB_STATUS_COLOR, APP_STATUS_COLOR,
} from "../../components/SAComponents";

const PERIODS = [
  { value: "7d",  label: "7 days"  },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

// ─── Mini donut chart (pure SVG) ──────────────────────────────────────────────
const DonutChart = ({ data, size = 80 }) => {
  const total  = data.reduce((s, d) => s + (d.value || 0), 0);
  if (!total) return null;
  const R = size / 2 - 8, cx = size / 2, cy = size / 2;
  const circ  = 2 * Math.PI * R;
  let offset  = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={SA.border} strokeWidth={8} />
      {data.map((d, i) => {
        if (!d.value) return null;
        const pct   = d.value / total;
        const dash  = pct * circ;
        const seg   = (
          <circle
            key={i}
            cx={cx} cy={cy} r={R}
            fill="none"
            stroke={d.color}
            strokeWidth={8}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
            opacity={0.85}
          />
        );
        offset += dash;
        return seg;
      })}
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={13} fontWeight={800}
        fill={SA.white} fontFamily="Syne">
        {total}
      </text>
    </svg>
  );
};

// ─── Recent application row ───────────────────────────────────────────────────
const AppRow = ({ app }) => {
  const sc = APP_STATUS_COLOR[app.status] || APP_STATUS_COLOR.pending;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 0", borderBottom: `1px solid ${SA.border}`,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: SA.accent + "18",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, flexShrink: 0,
      }}>
        🏘️
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: SA.white, marginBottom: 2 }}>
          {app.societyName}
        </div>
        <div style={{ fontSize: 11, color: SA.textDim }}>
          {app.city}{app.state ? `, ${app.state}` : ""} · {app.totalUnits} units
        </div>
      </div>
      <SABadge label={app.status} bg={sc.bg} text={sc.text} dot={sc.dot} />
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export const SADashboard = () => {
  const [period,  setPeriod]  = useState("30d");
  const [stats,   setStats]   = useState(null);
  const [apps,    setApps]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [overviewRes, appRes] = await Promise.all([
        saAnalyticsApi.overview({ period }),
        saApplicationsApi.getAll({ limit: 6, sort: "-createdAt" }),
      ]);
      setStats(overviewRes.data  ?? overviewRes);
      setApps((appRes.data?.applications ?? appRes.data ?? []).slice(0, 6));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  if (loading && !stats) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
        <SASpinner size={32} />
      </div>
    );
  }
  if (error) return <SAError message={error} onRetry={load} />;

  // Destructure overview shape (adapt as backend evolves)
  const s = stats ?? {};
  const societies    = s.societies    ?? {};
  const users        = s.users        ?? {};
  const activity     = s.activity     ?? {};
  const financials   = s.financials   ?? {};
  const pendingApps  = s.pendingApplications ?? 0;
  const totalSoc     = societies.total    ?? 0;
  const activeSoc    = societies.active   ?? 0;
  const trialSoc     = societies.trial    ?? 0;
  const expiredSoc   = societies.expired  ?? 0;
  const suspendedSoc = societies.suspended?? 0;
  const totalRes     = users.total        ?? 0;
  const activeRes    = users.active       ?? 0;
  const mrr          = financials.mrr     ?? financials.MRR ?? 0;

  const donutData = [
    { label: "Active",    value: activeSoc,    color: SA.green  },
    { label: "Trial",     value: trialSoc,     color: SA.amber  },
    { label: "Expired",   value: expiredSoc,   color: SA.red    },
    { label: "Suspended", value: suspendedSoc, color: SA.gray600},
  ];

  return (
    <div style={{ padding: "0 0 40px" }}>

      {/* Period selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            style={{
              padding: "5px 14px", borderRadius: 20,
              border: `1.5px solid ${period === p.value ? SA.accent : SA.border}`,
              background: period === p.value ? SA.accent + "20" : "transparent",
              color: period === p.value ? SA.accent : SA.textDim,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "Plus Jakarta Sans", transition: "all 0.15s",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Primary stats row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <StatCard icon="🏘️" label="Total Societies"  value={totalSoc}  color={SA.accent} />
        <StatCard icon="👥" label="Total Residents"  value={totalRes}  color={SA.blue}   />
        <StatCard icon="⏳" label="Pending Applications" value={pendingApps} color={SA.amber} />
        <StatCard
          icon="💰" label="Monthly Revenue (MRR)"
          value={mrr ? `₹${(mrr/1000).toFixed(1)}k` : "—"}
          color={SA.green}
        />
      </div>

      {/* Secondary row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard icon="✅" label="Active Societies"   value={activeSoc}   color={SA.green}  />
        <StatCard icon="🔬" label="Trial Societies"    value={trialSoc}    color={SA.amber}  />
        <StatCard icon="🚫" label="Expired"            value={expiredSoc}  color={SA.red}    />
        <StatCard icon="👤" label="Active Residents"   value={activeRes}   color={SA.purple} />
      </div>

      {/* Middle section: donut + recent apps */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>

        {/* Subscription distribution */}
        <SACard style={{ flex: "1 1 240px" }}>
          <SectionHeader title="Subscription Distribution" />
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <DonutChart data={donutData} size={100} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {donutData.map((d) => (
                <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: SA.textDim }}>{d.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: SA.white, marginLeft: "auto" }}>
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SACard>

        {/* Platform activity */}
        <SACard style={{ flex: "1 1 240px" }}>
          <SectionHeader title="Platform Activity" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "New Societies",   value: activity.newSocieties    ?? "—", icon: "🏘️" },
              { label: "New Residents",   value: activity.newResidents    ?? "—", icon: "👤" },
              { label: "Issues Filed",    value: activity.issues          ?? "—", icon: "🔧" },
              { label: "Maintenance Collected", value: activity.maintenance ?? "—", icon: "💰" },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 0", borderBottom: `1px solid ${SA.border}`,
              }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ fontSize: 12, color: SA.textDim, flex: 1 }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: SA.white }}>{value}</span>
              </div>
            ))}
          </div>
        </SACard>
      </div>

      {/* Recent applications */}
      <div style={{ marginTop: 20 }}>
        <SACard>
          <SectionHeader
            title="Recent Applications"
            action={
              <span style={{ fontSize: 11, color: SA.accent, cursor: "pointer" }}>
                View all →
              </span>
            }
          />
          {apps.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: SA.textDim, fontSize: 13 }}>
              No applications yet.
            </div>
          ) : (
            apps.map((app) => <AppRow key={app._id} app={app} />)
          )}
        </SACard>
      </div>
    </div>
  );
};