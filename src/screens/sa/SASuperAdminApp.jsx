/**
 * SASuperAdminApp.jsx
 * Super Admin portal shell — sidebar + screen switching.
 * Completely separate from the society app.
 *
 * Navigation:
 *   dashboard      → SADashboard
 *   applications   → SAApplications
 *   societies      → SASocieties     (Sub-task 2)
 *   analytics      → SAAnalytics     (Sub-task 2)
 *
 * Mobile: sidebar collapses to a top bar with hamburger.
 */
import { useState } from "react";
import { useSAAuth }         from "../../context/SAAuthContext";
import {
  SA, SABtn, SASpinner,
} from "../../components/SAComponents";
import { SALoginScreen }     from "./SALoginScreen";
import { SADashboard }       from "./SADashboard";
import { SAApplications }    from "./SAApplications";
import { SASocieties }       from "./SASocieties";
import { SAAnalytics }       from "./SAAnalytics";

// ─── NAV CONFIG ───────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard",    label: "Dashboard",     icon: "📊" },
  { id: "applications", label: "Applications",  icon: "📋" },
  { id: "societies",    label: "Societies",      icon: "🏘️" },
  { id: "analytics",   label: "Analytics",      icon: "📈" },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const Sidebar = ({ active, onChange, saUser, onLogout, collapsed, onToggle }) => (
  <div style={{
    width: collapsed ? 0 : 240,
    minWidth: collapsed ? 0 : 240,
    background: SA.surface,
    borderRight: `1px solid ${SA.border}`,
    display: "flex", flexDirection: "column",
    transition: "width 0.2s, min-width 0.2s",
    overflow: "hidden",
    position: "fixed", left: 0, top: 0, bottom: 0,
    zIndex: 200,
  }}>
    {/* Logo */}
    <div style={{
      padding: "22px 20px 16px",
      borderBottom: `1px solid ${SA.border}`,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `linear-gradient(135deg, ${SA.accent}, #0099A0)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, flexShrink: 0,
      }}>
        🏢
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: SA.white, fontFamily: "Syne" }}>
          Super Admin
        </div>
        <div style={{ fontSize: 10, color: SA.textDim, marginTop: 1 }}>
          Platform Control
        </div>
      </div>
    </div>

    {/* Nav links */}
    <div style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
      {NAV.map(({ id, label, icon }) => {
        const on = active === id;
        return (
          <div
            key={id}
            onClick={() => onChange(id)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 20px", cursor: "pointer",
              background: on ? SA.accent + "12" : "transparent",
              borderLeft: `3px solid ${on ? SA.accent : "transparent"}`,
              color: on ? SA.accent : SA.textDim,
              fontSize: 13, fontWeight: on ? 700 : 500,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = SA.border + "40"; }}
            onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{icon}</span>
            {label}
          </div>
        );
      })}
    </div>

    {/* User footer */}
    <div style={{
      padding: "16px 20px",
      borderTop: `1px solid ${SA.border}`,
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: SA.white, marginBottom: 2 }}>
        {saUser?.name ?? saUser?.email ?? "Super Admin"}
      </div>
      <div style={{ fontSize: 10, color: SA.textDim, marginBottom: 10 }}>
        {saUser?.email ?? ""}
      </div>
      <SABtn variant="ghost" onClick={onLogout} style={{ width: "100%", justifyContent: "center", fontSize: 11 }}>
        Sign Out
      </SABtn>
    </div>
  </div>
);

// ─── Top bar (mobile) ─────────────────────────────────────────────────────────
const TopBar = ({ active, onToggle, sidebarOpen }) => {
  const current = NAV.find((n) => n.id === active);
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, height: 52,
      background: SA.surface, borderBottom: `1px solid ${SA.border}`,
      display: "flex", alignItems: "center", gap: 12,
      padding: "0 16px", zIndex: 150,
    }}>
      <button
        onClick={onToggle}
        style={{
          background: SA.border, border: "none", color: SA.text,
          width: 32, height: 32, borderRadius: 8,
          cursor: "pointer", fontSize: 16,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {sidebarOpen ? "✕" : "☰"}
      </button>
      <span style={{ fontSize: 16, marginRight: 2 }}>{current?.icon}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: SA.white, fontFamily: "Syne" }}>
        {current?.label}
      </span>
      <div style={{ marginLeft: "auto" }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: SA.accent + "20",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, color: SA.accent,
        }}>
          👤
        </div>
      </div>
    </div>
  );
};

// ─── Shell ────────────────────────────────────────────────────────────────────
export const SASuperAdminApp = () => {
  const { saUser, loading, isLogged, logout } = useSAAuth();
  const [screen,  setScreen]  = useState("dashboard");
  const [sidebar, setSidebar] = useState(true); // desktop default open

  // Detect mobile (rough breakpoint)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: SA.bg,
        display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: `linear-gradient(135deg, ${SA.accent}, #0099A0)`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
        }}>🏢</div>
        <SASpinner size={24} />
      </div>
    );
  }

  if (!isLogged) {
    return <SALoginScreen />;
  }

  const screenMap = {
    dashboard:    <SADashboard />,
    applications: <SAApplications />,
    societies:    <SASocieties />,
    analytics:    <SAAnalytics />,
  };

  const SIDEBAR_W = sidebar && !isMobile ? 240 : 0;

  return (
    <div style={{ minHeight: "100vh", background: SA.bg, fontFamily: "Plus Jakarta Sans" }}>

      {/* Sidebar */}
      <Sidebar
        active={screen}
        onChange={(s) => { setScreen(s); if (isMobile) setSidebar(false); }}
        saUser={saUser}
        onLogout={logout}
        collapsed={isMobile ? !sidebar : false}
        onToggle={() => setSidebar((v) => !v)}
      />

      {/* Mobile overlay when sidebar open */}
      {isMobile && sidebar && (
        <div
          onClick={() => setSidebar(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            zIndex: 190,
          }}
        />
      )}

      {/* Mobile top bar */}
      {isMobile && (
        <TopBar
          active={screen}
          onToggle={() => setSidebar((v) => !v)}
          sidebarOpen={sidebar}
        />
      )}

      {/* Main content */}
      <div style={{
        marginLeft: SIDEBAR_W,
        paddingTop: isMobile ? 52 : 0,
        minHeight: "100vh",
        transition: "margin-left 0.2s",
      }}>
        {/* Desktop header bar */}
        {!isMobile && (
          <div style={{
            padding: "20px 32px 0",
            display: "flex", alignItems: "center", gap: 12,
            marginBottom: 4,
          }}>
            <button
              onClick={() => setSidebar((v) => !v)}
              style={{
                background: SA.border, border: "none", color: SA.text,
                width: 30, height: 30, borderRadius: 8, cursor: "pointer",
                fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {sidebar ? "◀" : "▶"}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 22, fontWeight: 800, color: SA.white, fontFamily: "Syne",
              }}>
                {NAV.find((n) => n.id === screen)?.icon}{" "}
                {NAV.find((n) => n.id === screen)?.label}
              </div>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: SA.surface, borderRadius: 10, padding: "8px 14px",
              border: `1px solid ${SA.border}`,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: SA.accent + "20",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14,
              }}>
                👤
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: SA.white }}>
                  {saUser?.name ?? "Super Admin"}
                </div>
                <div style={{ fontSize: 10, color: SA.textDim }}>
                  {saUser?.email ?? ""}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Screen content */}
        <div style={{ padding: isMobile ? "16px 16px" : "24px 32px" }}>
          {screenMap[screen] ?? <SADashboard />}
        </div>
      </div>
    </div>
  );
};