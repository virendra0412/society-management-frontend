/**
 * DefaulterList
 *
 * Admin-only panel that shows residents with unpaid / overdue
 * payment records across all published bills.
 *
 * API: GET /maintenance/defaulters
 *   → { data: { defaulters: [{ flat, wing, resident, records: [...] }] } }
 *
 * If the backend doesn't have this endpoint yet, falls back to
 * aggregating from the existing bills list (client-side triage).
 */

import { useState, useEffect, useCallback } from "react";
import { maintenanceApi } from "../../api/resources.api";
import { useToast } from "../../context/ToastContext";
import { Card, Badge, Spinner, EmptyState, ErrorState } from "../../components/ui";
import { C, PAYMENT_STATUS_COLOR } from "../../constants/theme";

const fmt = (n) =>
  n !== undefined && n !== null
    ? `₹${Number(n).toLocaleString("en-IN")}`
    : "—";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ─── Single Defaulter Card ────────────────────────────────────────────────────
const DefaulterCard = ({ defaulter }) => {
  const [expanded, setExpanded] = useState(false);

  const totalDue = defaulter.records.reduce((s, r) => s + (r.totalDue || 0), 0);
  const overdueCount = defaulter.records.filter((r) => r.status === "overdue").length;

  return (
    <Card style={{ marginBottom: 10 }}>
      {/* Header row — always visible */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Flat badge */}
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: overdueCount > 0 ? C.red + "18" : C.amber + "18",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 800,
          color: overdueCount > 0 ? C.red : C.amber,
        }}>
          {defaulter.flat}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>
            Flat {defaulter.flat}{defaulter.wing ? ` · ${defaulter.wing}` : ""}
          </div>
          {defaulter.resident?.name && (
            <div style={{ fontSize: 12, color: C.gray500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {defaulter.resident.name}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
              background: C.red + "15", color: C.red,
            }}>
              {defaulter.records.length} bill{defaulter.records.length !== 1 ? "s" : ""} unpaid
            </span>
            {overdueCount > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                background: C.red + "25", color: C.red,
              }}>
                ⚠️ {overdueCount} overdue
              </span>
            )}
          </div>
        </div>

        {/* Total due + expand chevron */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.red, fontFamily: "Syne" }}>
            {fmt(totalDue)}
          </div>
          <div style={{ fontSize: 18, color: C.gray300, marginTop: 2, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>
            ›
          </div>
        </div>
      </div>

      {/* Expanded: per-bill breakdown */}
      {expanded && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${C.gray100}`, paddingTop: 12 }}>
          {defaulter.records.map((r) => {
            const sc = PAYMENT_STATUS_COLOR[r.status] || {};
            return (
              <div key={r._id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 0",
                borderBottom: `1px solid ${C.gray100}`,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                    {r.bill?.title || "Bill"}
                  </div>
                  <div style={{ fontSize: 11, color: C.gray500, marginTop: 1 }}>
                    Due {fmtDate(r.bill?.dueDate || r.dueDate)}
                    {r.bill?.billMonth ? ` · ${r.bill.billMonth}` : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Badge
                    label={r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    bg={sc.bg} text={sc.text} dot={sc.dot}
                  />
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginTop: 4 }}>
                    {fmt(r.totalDue)}
                    {r.penalty > 0 && (
                      <span style={{ fontSize: 10, color: C.red, marginLeft: 4 }}>+{fmt(r.penalty)} penalty</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Total row */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            paddingTop: 10, marginTop: 2,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.gray700 }}>Total Outstanding</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.red, fontFamily: "Syne" }}>
              {fmt(totalDue)}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};

// ─── Summary Strip ────────────────────────────────────────────────────────────
const SummaryStrip = ({ defaulters }) => {
  const totalFlats    = defaulters.length;
  const totalOverdue  = defaulters.filter((d) => d.records.some((r) => r.status === "overdue")).length;
  const totalOutstanding = defaulters.reduce((s, d) =>
    s + d.records.reduce((rs, r) => rs + (r.totalDue || 0), 0), 0);

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      {[
        { icon: "🏠", label: "Defaulting Flats", value: totalFlats,      color: C.amber },
        { icon: "⚠️", label: "Overdue",          value: totalOverdue,    color: C.red   },
        { icon: "💰", label: "Outstanding",       value: fmt(totalOutstanding), color: C.red },
      ].map(({ icon, label, value, color }) => (
        <div key={label} style={{
          flex: 1, background: color + "10", borderRadius: 12,
          padding: "10px 10px", border: `1px solid ${color}20`,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 16, marginBottom: 2 }}>{icon}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color, fontFamily: "Syne" }}>{value}</div>
          <div style={{ fontSize: 10, color: C.gray500, fontWeight: 600, marginTop: 1 }}>{label}</div>
        </div>
      ))}
    </div>
  );
};

// ─── DefaulterList (exported) ─────────────────────────────────────────────────
export const DefaulterList = () => {
  const toast = useToast();
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [sortBy, setSortBy]         = useState("amount"); // "amount" | "count" | "flat"

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await maintenanceApi.getDefaulters();
      setDefaulters(res.data?.defaulters || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load defaulter list.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sorted = [...defaulters].sort((a, b) => {
    if (sortBy === "amount") {
      const aTotal = a.records.reduce((s, r) => s + (r.totalDue || 0), 0);
      const bTotal = b.records.reduce((s, r) => s + (r.totalDue || 0), 0);
      return bTotal - aTotal;
    }
    if (sortBy === "count") return b.records.length - a.records.length;
    return a.flat.localeCompare(b.flat);
  });

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
        <Spinner size={32} />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={load} />;
  }

  return (
    <div>
      {defaulters.length === 0 ? (
        <EmptyState icon="🎉" message="No defaulters! All flats are up to date." />
      ) : (
        <>
          <SummaryStrip defaulters={defaulters} />

          {/* Sort controls */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 11, color: C.gray500, fontWeight: 600, alignSelf: "center" }}>Sort by:</span>
            {[
              { key: "amount", label: "Amount" },
              { key: "count",  label: "Bills"  },
              { key: "flat",   label: "Flat"   },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setSortBy(key)} style={{
                padding: "4px 12px", borderRadius: 20, border: "none",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                fontFamily: "Plus Jakarta Sans",
                background: sortBy === key ? C.navy : C.gray100,
                color:      sortBy === key ? "#fff" : C.gray700,
                transition: "all 0.15s",
              }}>
                {label}
              </button>
            ))}
          </div>

          {sorted.map((d, i) => (
            <DefaulterCard key={d.flat + i} defaulter={d} />
          ))}
        </>
      )}
    </div>
  );
};
