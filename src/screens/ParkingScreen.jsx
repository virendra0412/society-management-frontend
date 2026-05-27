/**
 * ParkingScreen
 * Root screen for the parking module — composes all parking sub-components.
 *
 * Resident tabs:   Overview · All Slots · My Requests
 * Admin tabs:      Overview · All Slots · All Requests · + Create Slot
 */
import { useState, useEffect, useCallback } from "react";
import { parkingApi } from "../api/resources.api";
import { useAuth }    from "../context/AuthContext";
import { C }          from "../constants/theme";
import { Btn, ErrorState } from "../components/ui";
import { SlotSummary }    from "./parking/SlotSummary";
import { SlotList }       from "./parking/SlotList";
import { RequestForm }    from "./parking/RequestForm";
import { MyRequests }     from "./parking/MyRequests";
import { AdminRequests }  from "./parking/AdminRequests";
import { CreateSlotForm } from "./parking/CreateSlotForm";

const RESIDENT_TABS = [
  { id: "overview",  label: "Overview"     },
  { id: "slots",     label: "All Slots"    },
  { id: "requests",  label: "My Requests"  },
];

const ADMIN_TABS = [
  { id: "overview",       label: "Overview"      },
  { id: "slots",          label: "All Slots"     },
  { id: "admin-requests", label: "All Requests"  },
];

export const ParkingScreen = () => {
  const { isAdmin } = useAuth();

  const TABS = isAdmin ? ADMIN_TABS : RESIDENT_TABS;

  const [tab,           setTab]           = useState("overview");
  const [summary,       setSummary]       = useState([]);
  const [slots,         setSlots]         = useState([]);
  const [summaryLoad,   setSummaryLoad]   = useState(true);
  const [slotsLoad,     setSlotsLoad]     = useState(false);
  const [summaryErr,    setSummaryErr]    = useState(null);
  const [slotsErr,      setSlotsErr]      = useState(null);
  const [showForm,      setShowForm]      = useState(false); // resident request form
  const [showCreateSlot,setShowCreateSlot]= useState(false); // admin create-slot form
  const [refreshKey,    setRefreshKey]    = useState(0);

  // ── Fetch summary on mount ─────────────────────────────────────────────────
  const loadSummary = useCallback(async () => {
    setSummaryLoad(true); setSummaryErr(null);
    try {
      const res = await parkingApi.getSummary();
      setSummary(res.data?.summary || []);
    } catch {
      setSummaryErr("Failed to load availability data.");
    } finally {
      setSummaryLoad(false);
    }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  // ── Fetch slot list only when "All Slots" tab is opened ───────────────────
  const loadSlots = useCallback(async () => {
    if (slots.length) return;
    setSlotsLoad(true); setSlotsErr(null);
    try {
      const res = await parkingApi.getSlots();
      setSlots(res.data?.slots || []);
    } catch {
      setSlotsErr("Failed to load slots.");
    } finally {
      setSlotsLoad(false);
    }
  }, [slots.length]);

  useEffect(() => {
    if (tab === "slots") loadSlots();
  }, [tab, loadSlots]);

  const handleRequestSaved = () => {
    setRefreshKey((k) => k + 1);
    setTab("requests");
  };

  // After admin creates slot(s), prepend to list + refresh summary
  const handleSlotCreated = (newSlots = []) => {
    const arr = Array.isArray(newSlots) ? newSlots.filter(Boolean) : [newSlots].filter(Boolean);
    if (arr.length) setSlots((prev) => [...arr, ...prev]);
    loadSummary();
  };

  return (
    <div className="screen-enter" style={{ paddingBottom: 24 }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, #1a3a6e 100%)`,
        padding: "20px 20px 0",
      }}>
        <div style={{
          fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600,
          letterSpacing: "0.1em", textTransform: "uppercase",
        }}>
          Society
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginTop: 4, marginBottom: 16,
        }}>
          <div style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 800, color: "#fff" }}>
            🚗 Parking
          </div>

          {/* Resident: quick request button */}
          {!isAdmin && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                background: C.teal, color: "#fff", border: "none",
                borderRadius: 10, padding: "7px 14px",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: "Plus Jakarta Sans",
              }}
            >
              + Request Slot
            </button>
          )}

          {/* Admin: create slot button */}
          {isAdmin && (
            <button
              onClick={() => setShowCreateSlot(true)}
              style={{
                background: C.teal, color: "#fff", border: "none",
                borderRadius: 10, padding: "7px 14px",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: "Plus Jakarta Sans",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <span>＋</span> Create Slot
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1, background: "none", border: "none",
                padding: "10px 0", cursor: "pointer",
                fontSize: 12, fontWeight: 700,
                fontFamily: "Plus Jakarta Sans",
                color: tab === id ? "#fff" : "rgba(255,255,255,0.4)",
                borderBottom: `2.5px solid ${tab === id ? C.teal : "transparent"}`,
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab body ────────────────────────────────────────────────────────── */}
      <div style={{ padding: "16px 16px 0" }}>

        {/* Overview */}
        {tab === "overview" && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.gray700, marginBottom: 10 }}>
              Availability by Type
            </div>

            {summaryErr
              ? <ErrorState message={summaryErr} onRetry={loadSummary} />
              : <SlotSummary items={summary} loading={summaryLoad} />
            }

            {/* Resident CTA */}
            {!isAdmin && !summaryLoad && (
              <div style={{
                marginTop: 20,
                background: C.teal + "10",
                border: `1.5px solid ${C.teal}25`,
                borderRadius: 14, padding: "16px",
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <span style={{ fontSize: 34 }}>🅿️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 3 }}>
                    Need a parking slot?
                  </div>
                  <div style={{ fontSize: 12, color: C.gray600, lineHeight: 1.55 }}>
                    Submit a request and the admin will assign you a slot.
                  </div>
                </div>
                <Btn small onClick={() => setShowForm(true)}>Request</Btn>
              </div>
            )}

            {/* Admin quick-create CTA */}
            {isAdmin && !summaryLoad && (
              <div style={{
                marginTop: 20,
                background: C.navy + "08",
                border: `1.5px solid ${C.navy}15`,
                borderRadius: 14, padding: "16px",
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <span style={{ fontSize: 34 }}>🏗️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 3 }}>
                    Manage Parking Slots
                  </div>
                  <div style={{ fontSize: 12, color: C.gray600, lineHeight: 1.55 }}>
                    Add new slots or review pending resident requests.
                  </div>
                </div>
                <Btn small onClick={() => setTab("admin-requests")}>Requests</Btn>
              </div>
            )}
          </>
        )}

        {/* All Slots */}
        {tab === "slots" && (
          slotsErr
            ? <ErrorState message={slotsErr} onRetry={() => { setSlots([]); loadSlots(); }} />
            : <SlotList
                slots={slots}
                loading={slotsLoad}
                isAdmin={isAdmin}
                onReleased={(id) =>
                  setSlots((prev) =>
                    prev.map((s) =>
                      s._id === id ? { ...s, status: "available", assignedFlat: null, vehicleNumber: null } : s
                    )
                  )
                }
              />
        )}

        {/* Resident: My Requests */}
        {tab === "requests" && (
          <MyRequests refreshKey={refreshKey} />
        )}

        {/* Admin: All Requests */}
        {tab === "admin-requests" && (
          <AdminRequests refreshKey={refreshKey} />
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <RequestForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={handleRequestSaved}
      />

      <CreateSlotForm
        open={showCreateSlot}
        onClose={() => setShowCreateSlot(false)}
        onSaved={handleSlotCreated}
      />
    </div>
  );
};
