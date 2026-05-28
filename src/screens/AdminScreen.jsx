import { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext";
import { userApi } from "../api/resources.api";
import { Card, Btn, Avatar, Badge, Spinner, EmptyState, PageHeader } from "../components/ui";
import { C } from "../constants/theme";
import { timeAgo } from "../utils/timeago";

// ─── Pending Member Card ───────────────────────────────────────────────────────
const PendingCard = ({ member, onApprove, onReject, busy }) => (
  <Card style={{ marginBottom: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <Avatar name={member.name} size={44} color={C.purple} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{member.name}</div>
        <div style={{ fontSize: 12, color: C.gray500 }}>{member.email}</div>
        <div style={{ fontSize: 11, color: C.gray500, marginTop: 2 }}>
          {[member.flat && `Flat ${member.flat}`, member.wing && member.wing]
            .filter(Boolean).join(" · ") || "No flat info"}{" "}
          · {timeAgo(member.createdAt)}
        </div>
      </div>
      <Badge
        label="Pending"
        bg="#FEF3C7"
        text="#92400E"
        dot="#F59E0B"
      />
    </div>
    {member.phone && (
      <div style={{
        fontSize: 12, color: C.gray700, background: C.gray50,
        borderRadius: 8, padding: "6px 10px", marginBottom: 10,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        📞 {member.phone}
      </div>
    )}
    <div style={{ display: "flex", gap: 8 }}>
      <Btn
        variant="primary"
        small
        onClick={() => onApprove(member._id)}
        loading={busy === member._id + "_approve"}
        style={{ flex: 1 }}
      >
        ✓ Approve
      </Btn>
      <Btn
        variant="red"
        small
        onClick={() => onReject(member._id)}
        loading={busy === member._id + "_reject"}
        style={{ flex: 1 }}
      >
        ✕ Reject
      </Btn>
    </div>
  </Card>
);

// ─── Summary Stat ──────────────────────────────────────────────────────────────
const StatPill = ({ label, count, color }) => (
  <div style={{
    flex: 1, background: color + "12", borderRadius: 10,
    padding: "10px 14px", textAlign: "center",
    border: `1px solid ${color}25`,
  }}>
    <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: "Syne" }}>{count}</div>
    <div style={{ fontSize: 11, color: C.gray500, marginTop: 2 }}>{label}</div>
  </div>
);

// ─── Admin Screen ──────────────────────────────────────────────────────────────
export const AdminScreen = () => {
  const toast = useToast();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // "<userId>_approve" | "<userId>_reject"
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await userApi.getPendingMembers();
      setPending(res.data.members || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load pending members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPending(); }, []);

  const handleApprove = async (userId) => {
    setBusy(userId + "_approve");
    try {
      await userApi.approveMember(userId);
      setPending((p) => p.filter((m) => m._id !== userId));
      setApprovedCount((c) => c + 1);
      toast.success("Member approved successfully!");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Approval failed");
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (userId) => {
    setBusy(userId + "_reject");
    try {
      await userApi.rejectMember(userId);
      setPending((p) => p.filter((m) => m._id !== userId));
      setRejectedCount((c) => c + 1);
      toast.success("Member rejected.");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Rejection failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="screen-enter" style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, #1a3a6e 100%)`,
        padding: "20px 20px 32px",
        marginBottom: -16,
      }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Admin Panel
        </div>
        <div style={{ fontSize: 22, fontFamily: "Syne", fontWeight: 800, color: "#fff", marginTop: 4 }}>
          👑 Member Approvals
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
          Review and approve new residents joining your society
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* Session Stats */}
        {(approvedCount > 0 || rejectedCount > 0) && (
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.gray500, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              This Session
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <StatPill label="Approved" count={approvedCount} color={C.green} />
              <StatPill label="Rejected" count={rejectedCount} color={C.red} />
            </div>
          </Card>
        )}

        {/* Pending count header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 12,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.gray700 }}>
            Pending Requests
            {pending.length > 0 && (
              <span style={{
                marginLeft: 8, background: C.amber + "25", color: C.amber,
                borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700,
              }}>{pending.length}</span>
            )}
          </span>
          <button
            onClick={loadPending}
            disabled={loading}
            style={{
              background: "none", border: `1px solid ${C.gray100}`, borderRadius: 8,
              padding: "5px 10px", fontSize: 11, color: C.gray700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            {loading ? <Spinner size={12} /> : "↻"} Refresh
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map((k) => (
              <div key={k} className="skeleton" style={{ height: 130, borderRadius: 14 }} />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <Card>
            <EmptyState
              icon="✅"
              message="No pending approvals. All caught up!"
            />
          </Card>
        ) : (
          pending.map((member) => (
            <PendingCard
              key={member._id}
              member={member}
              onApprove={handleApprove}
              onReject={handleReject}
              busy={busy}
            />
          ))
        )}

        {/* Info note */}
        <div style={{
          marginTop: 16, padding: "12px 14px",
          background: C.blue + "10", borderRadius: 12,
          border: `1px solid ${C.blue}25`,
          fontSize: 12, color: C.blue,
          lineHeight: 1.5,
        }}>
          ℹ️ Rejected members will have their accounts deactivated. They will need to re-register with a new account to join.
        </div>
      </div>
    </div>
  );
};
