import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useT } from "../context/LanguageContext";
import { issuesApi, helpApi, noticesApi } from "../api/resources.api";
import { Card, Badge, Avatar, Spinner } from "../components/ui";
import { C, STATUS_COLOR, CATEGORY_ICON, NOTICE_TAG_COLOR } from "../constants/theme";
import { timeAgo } from "../utils/timeago";

const StatBox = ({ icon, count, label, loading, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: "rgba(255,255,255,0.08)", borderRadius: 10,
      padding: "8px 14px", flex: 1, textAlign: "center",
      cursor: onClick ? "pointer" : "default",
      transition: "background 0.15s",
    }}
    onMouseEnter={(e) => onClick && (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
    onMouseLeave={(e) => onClick && (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
  >
    <div style={{ fontSize: 20, marginBottom: 2 }}>{icon}</div>
    {loading
      ? <div style={{ height: 28, display: "flex", justifyContent: "center", alignItems: "center" }}><Spinner size={16} color="#fff" /></div>
      : <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "Syne", lineHeight: 1 }}>{count ?? 0}</div>
    }
    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{label}</div>
  </div>
);

// Quick action button
const QuickAction = ({ icon, label, color, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      flex: 1, cursor: "pointer",
    }}
  >
    <div style={{
      width: 52, height: 52, borderRadius: 16, fontSize: 24,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: color + "18", border: `1.5px solid ${color}30`,
      transition: "transform 0.12s",
    }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.07)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {icon}
    </div>
    <span style={{ fontSize: 11, fontWeight: 600, color: C.gray600, textAlign: "center", lineHeight: 1.2 }}>{label}</span>
  </div>
);

export const HomeScreen = ({ onNavigate }) => {
  const { user, isAdmin } = useAuth();
  const t = useT();

  const [issues,  setIssues]  = useState([]);
  const [help,    setHelp]    = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [iRes, hRes, nRes] = await Promise.allSettled([
          issuesApi.getAll({ limit: 3, sort: "-createdAt" }),
          helpApi.getAll({ limit: 2 }),
          noticesApi.getAll({ limit: 5 }),
        ]);
        if (iRes.status === "fulfilled") setIssues(iRes.value.data?.issues || []);
        if (hRes.status === "fulfilled") setHelp(hRes.value.data?.posts   || []);
        if (nRes.status === "fulfilled") setNotices(nRes.value.data?.notices || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openCount    = issues.filter((i) => i.status !== "Resolved").length;
  const urgentNotice = notices[0];

  // Quick actions — resident set; admin gets an extra "Approvals" shortcut
  const quickActions = [
    { icon: "🚨", label: t("home_report_issue"), color: C.red,    tab: "issues"   },
    { icon: "🤝", label: t("home_ask_help"),     color: C.amber,  tab: "help"     },
    { icon: "📢", label: t("nav_notices"),        color: C.teal,   tab: "notices"  },
    { icon: "🗳️", label: t("nav_polls"),          color: C.purple, tab: "polls"    },
    ...(isAdmin ? [{ icon: "👑", label: t("nav_admin"), color: C.navy, tab: "admin" }] : []),
  ];

  return (
    <div className="screen-enter" style={{ paddingBottom: 24 }}>
      {/* Header Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, #1a3a6e 100%)`,
        padding: "24px 20px 28px", marginBottom: 20, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "absolute", bottom: -30, right: 40, width: 80, height: 80, borderRadius: "50%", background: "rgba(244,162,40,0.12)" }} />
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
          Welcome back
        </div>
        <div style={{ fontSize: 24, fontFamily: "Syne", fontWeight: 800, color: "#fff", marginBottom: 2 }}>
          {user?.name || "—"}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
          {user?.society?.name || "No society yet"}{user?.flat ? ` · Flat ${user.flat}` : ""}
        </div>
        {/* Clickable stat boxes */}
        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          <StatBox icon="🔴" count={openCount}      label={t("home_open_issues")} loading={loading} onClick={() => onNavigate("issues")} />
          <StatBox icon="📢" count={notices.length}  label={t("home_notices")}    loading={loading} onClick={() => onNavigate("notices")} />
          <StatBox icon="🤝" count={help.length}     label={t("home_help_posts")} loading={loading} onClick={() => onNavigate("help")} />
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.gray700, marginBottom: 12 }}>
            {t("home_quick_actions")}
          </div>
          <div style={{ display: "flex", gap: 4, justifyContent: "space-between" }}>
            {quickActions.map((a) => (
              <QuickAction
                key={a.tab}
                icon={a.icon}
                label={a.label}
                color={a.color}
                onClick={() => onNavigate(a.tab)}
              />
            ))}
          </div>
        </div>

        {/* Urgent Notice Banner */}
        {urgentNotice && (
          <div
            onClick={() => onNavigate("notices")}
            style={{
              background: `linear-gradient(135deg, ${C.red}10, ${C.amber}18)`,
              border: `1.5px solid ${C.red}25`, borderRadius: 14,
              padding: "12px 14px", marginBottom: 20,
              display: "flex", gap: 12, alignItems: "flex-start",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 24 }}>📢</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.red, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
                {t("home_latest_notice")}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{urgentNotice.title}</div>
              <div style={{ fontSize: 12, color: C.gray500, marginTop: 2 }}>
                {urgentNotice.body?.slice(0, 65)}…
              </div>
            </div>
            <span style={{ fontSize: 12, color: C.teal, fontWeight: 700, alignSelf: "center", flexShrink: 0 }}>→</span>
          </div>
        )}

        {/* Recent Issues */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.gray700, marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
            <span>{t("home_recent_issues")}</span>
            <span style={{ color: C.teal, cursor: "pointer" }} onClick={() => onNavigate("issues")}>{t("home_see_all")}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {loading
              ? [1, 2, 3].map((k) => <div key={k} className="skeleton" style={{ height: 70, borderRadius: 14 }} />)
              : issues.length === 0
                ? <div style={{ color: C.gray500, fontSize: 13, textAlign: "center", padding: "16px 0" }}>{t("home_no_issues")}</div>
                : issues.map((issue) => (
                  <Card key={issue._id} onClick={() => onNavigate("issues")}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, marginRight: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 16 }}>{CATEGORY_ICON[issue.category] || "📋"}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{issue.title}</span>
                        </div>
                        <div style={{ fontSize: 11, color: C.gray500 }}>
                          {issue.flat || issue.reporter?.flat} · {timeAgo(issue.createdAt)}
                        </div>
                      </div>
                      <Badge label={issue.status} {...(STATUS_COLOR[issue.status] || {})} />
                    </div>
                  </Card>
                ))
            }
          </div>
        </div>

        {/* Community Help */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.gray700, marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
            <span>{t("home_community")}</span>
            <span style={{ color: C.teal, cursor: "pointer" }} onClick={() => onNavigate("help")}>{t("home_see_all")}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {loading
              ? [1, 2].map((k) => <div key={k} className="skeleton" style={{ height: 64, borderRadius: 14 }} />)
              : help.length === 0
                ? <div style={{ color: C.gray500, fontSize: 13, textAlign: "center", padding: "16px 0" }}>{t("home_no_help")}</div>
                : help.map((h) => (
                  <Card key={h._id} onClick={() => onNavigate("help")}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <Avatar name={h.author?.name || "U"} color={C.purple} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{h.title}</div>
                        <div style={{ fontSize: 11, color: C.gray500 }}>
                          {h.flat || h.author?.flat} · {h.replyCount ?? 0} replies
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  );
};