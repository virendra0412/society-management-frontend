import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider }         from "./context/ToastContext";

import { LoginScreen }    from "./screens/auth/LoginScreen";
import { RegisterScreen } from "./screens/auth/RegisterScreen";
import { HomeScreen }     from "./screens/HomeScreen";
import { IssuesScreen }   from "./screens/IssuesScreen";
import { ProfileScreen }  from "./screens/ProfileScreen";
import { AdminScreen }    from "./screens/AdminScreen";
import { HelpScreen, NoticesScreen, ContactsScreen, PollsScreen } from "./screens/ResourceScreens";
import { VisitorScreen }     from "./screens/VisitorScreen";
import { MaintenanceScreen } from "./screens/MaintenanceScreen";
import { AmenityScreen }     from "./screens/AmenityScreen";
import { EventsScreen }      from "./screens/EventsScreen";
import { ParkingScreen }     from "./screens/ParkingScreen";
import { BottomNav }         from "./components/layout/BottomNav";
import { LanguageSwitcher } from "./components/ui/LanguageSwitcher";
import { useT } from "./context/LanguageContext";
import { Spinner }            from "./components/ui";
import { C }                  from "./constants/theme";

import { SAAuthProvider }    from "./context/SAAuthContext";
import { SASuperAdminApp }   from "./screens/sa/SASuperAdminApp";
const PendingApprovalScreen = ({ onLogout }) => {
  const t = useT();
  return (
  <div style={{
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: C.bg, padding: "0 24px", textAlign: "center",
  }}>
    <div style={{ fontSize: 56, marginBottom: 20 }}>⏳</div>
    <div style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 800, color: C.navy, marginBottom: 10 }}>
      {t("pending_title")}
    </div>
    <div style={{ fontSize: 14, color: C.gray500, lineHeight: 1.6, marginBottom: 32, maxWidth: 280 }}>
      {t("pending_body")}
    </div>
    <div style={{
      background: C.amber + "15", border: `1px solid ${C.amber}30`,
      borderRadius: 12, padding: "12px 16px", marginBottom: 28,
      fontSize: 13, color: C.gray700, maxWidth: 300,
    }}>
      {t("pending_tip")}
    </div>
    <button
      onClick={onLogout}
      style={{
        background: C.gray100, color: C.gray700, border: "none",
        borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700,
        cursor: "pointer", fontFamily: "Plus Jakarta Sans",
      }}
    >
      {t("pending_sign_out")}
    </button>
  </div>
);};

// ─── Society Auth Gate (unchanged) ───────────────────────────────────────────
const AuthGate = () => {
  const { isLogged, loading, isAdmin, user, logout } = useAuth();
  const t = useT();
  const [authView, setAuthView] = useState("login");
  const [tab,      setTab]      = useState("home");

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", background: C.navy, gap: 16,
      }}>
        <div style={{ fontSize: 56 }}>🏘️</div>
        <div style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 800, color: "#fff" }}>SocietyApp</div>
        <Spinner size={24} color="#fff" />
      </div>
    );
  }

  if (!isLogged) {
    return authView === "login"
      ? <LoginScreen    onSwitch={() => setAuthView("register")} />
      : <RegisterScreen onSwitch={() => setAuthView("login")} />;
  }

  if (!user?.isApproved && !isAdmin) {
    return <PendingApprovalScreen onLogout={logout} />;
  }

  const navigateTo = (newTab) => setTab(newTab);

  return (
    <div style={{
      fontFamily: "Plus Jakarta Sans", background: C.bg,
      minHeight: "100vh", maxWidth: 480, margin: "0 auto",
      position: "relative", paddingBottom: 72,
    }}>
      <div style={{ position: "fixed", top: 10, right: 10, zIndex: 50, display: "flex", gap: 6 }}>
        <LanguageSwitcher />
        {isAdmin && (
          <button
            onClick={() => setTab("admin")}
            style={{
              background: tab === "admin" ? C.amber : C.amber + "22",
              color: tab === "admin" ? "#fff" : C.amber,
              border: "none", borderRadius: 20, padding: "5px 10px",
              fontSize: 11, fontWeight: 700, fontFamily: "Plus Jakarta Sans", cursor: "pointer",
            }}
          >
            👑 {t("btn_admin")}
          </button>
        )}
        <button
          onClick={() => setTab("profile")}
          style={{
            background: tab === "profile" ? C.teal : C.teal + "15",
            color: tab === "profile" ? "#fff" : C.teal,
            border: "none", borderRadius: 20, padding: "5px 10px",
            fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Plus Jakarta Sans",
          }}
        >
          👤 {t("btn_profile")}
        </button>
        <button
          onClick={logout}
          style={{
            background: C.gray100, color: C.gray700, border: "none",
            borderRadius: 20, padding: "5px 10px", fontSize: 11, fontWeight: 700,
            cursor: "pointer", fontFamily: "Plus Jakarta Sans",
          }}
        >
          {t("btn_sign_out")}
        </button>
      </div>

      <div style={{ paddingTop: 8 }}>
        {tab === "home"        && <HomeScreen onNavigate={navigateTo} />}
        {tab === "issues"      && <IssuesScreen />}
        {tab === "visitors"    && <VisitorScreen />}
        {tab === "amenities"   && <AmenityScreen />}
        {tab === "events"      && <EventsScreen />}
        {tab === "parking"     && <ParkingScreen />}
        {tab === "maintenance" && <MaintenanceScreen />}
        {tab === "help"        && <HelpScreen />}
        {tab === "notices"     && <NoticesScreen />}
        {tab === "contacts"    && <ContactsScreen />}
        {tab === "polls"       && <PollsScreen />}
        {tab === "profile"     && <ProfileScreen />}
        {tab === "admin"       && isAdmin && <AdminScreen />}
      </div>

      <BottomNav activeTab={tab} onTabChange={setTab} isAdmin={isAdmin} />
    </div>
  );
};

// ─── Root — path-based portal fork ───────────────────────────────────────────
const isSAPath = () =>
  typeof window !== "undefined" &&
  window.location.pathname.startsWith("/superadmin");

export default function App() {
  // Super Admin portal — completely isolated context tree
  if (isSAPath()) {
    return (
      <SAAuthProvider>
        <SASuperAdminApp />
      </SAAuthProvider>
    );
  }

  // Society App — unchanged
  return (
    <AuthProvider>
      <ToastProvider>
        <AuthGate />
      </ToastProvider>
    </AuthProvider>
  );
}