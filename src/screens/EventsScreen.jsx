import { useState, useEffect, useCallback } from "react";
import { eventsApi } from "../api/resources.api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Card, Badge, Modal, Input, Select, Btn,
  EmptyState, ErrorState, Spinner,
} from "../components/ui";
import {
  C,
  EVENT_CATEGORIES, EVENT_CATEGORY_ICON, EVENT_CATEGORY_COLOR,
  RSVP_STATUS_COLOR, RSVP_LABEL,
} from "../constants/theme";
import { timeAgo } from "../utils/timeago";
import { AttendeeList } from "./events/AttendeeList";

// ─── Date helpers ─────────────────────────────────────────────────────────────
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

const fmtDateShort = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const isUpcoming = (event) => new Date(event.eventDate) >= new Date();

const localDateStr = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const localTimeStr = (iso) => {
  if (!iso) return "10:00";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// ─── Category chip strip ──────────────────────────────────────────────────────
const CategoryStrip = ({ selected, onChange }) => (
  <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 16px 12px", scrollbarWidth: "none" }}>
    {["All", ...EVENT_CATEGORIES].map((cat) => {
      const active = selected === cat;
      const color  = cat === "All" ? C.teal : EVENT_CATEGORY_COLOR[cat] || C.teal;
      return (
        <button key={cat} onClick={() => onChange(cat)} style={{
          flexShrink: 0, padding: "5px 13px", borderRadius: 20, border: "none",
          background: active ? color : color + "15",
          color:      active ? "#fff" : color,
          fontSize: 12, fontWeight: 700, cursor: "pointer",
          fontFamily: "Plus Jakarta Sans", transition: "all 0.15s",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          {cat !== "All" && EVENT_CATEGORY_ICON[cat]}{cat}
        </button>
      );
    })}
  </div>
);

// ─── RSVP counts display ──────────────────────────────────────────────────────
const RsvpCounts = ({ summary = {}, maxAttendees, compact = false }) => {
  const going   = summary.going    || 0;
  const maybe   = summary.maybe    || 0;
  const total   = going + maybe;
  const pct     = maxAttendees > 0 ? Math.min(100, Math.round((going / maxAttendees) * 100)) : null;

  if (compact) {
    return (
      <div style={{ display: "flex", gap: 10, fontSize: 11, color: C.gray500 }}>
        {going > 0 && <span>🎉 {going} going</span>}
        {maybe > 0 && <span>🤔 {maybe} maybe</span>}
        {maxAttendees > 0 && (
          <span style={{ color: going >= maxAttendees ? C.red : C.gray500 }}>
            👥 {going}/{maxAttendees}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: C.gray50, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700, marginBottom: 10 }}>RSVPs</div>
      <div style={{ display: "flex", gap: 10 }}>
        {[
          { icon: "🎉", label: "Going",    count: going,             color: C.green },
          { icon: "🤔", label: "Maybe",    count: maybe,             color: C.amber },
          { icon: "😕", label: "Not Going",count: summary.not_going || 0, color: C.gray500 },
        ].map(({ icon, label, count, color }) => (
          <div key={label} style={{
            flex: 1, textAlign: "center", background: "#fff",
            borderRadius: 10, padding: "10px 6px",
            border: `1px solid ${C.gray100}`,
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: "Syne" }}>{count}</div>
            <div style={{ fontSize: 10, color: C.gray500, fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Capacity bar */}
      {maxAttendees > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11, color: C.gray500 }}>
            <span>Capacity</span>
            <span style={{ fontWeight: 600, color: going >= maxAttendees ? C.red : C.gray700 }}>
              {going} / {maxAttendees} confirmed
            </span>
          </div>
          <div style={{ height: 5, background: C.gray100, borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 3, transition: "width 0.5s ease",
              width: `${pct}%`,
              background: pct >= 100 ? C.red : pct > 80 ? C.amber : C.green,
            }} />
          </div>
          {going >= maxAttendees && (
            <div style={{ fontSize: 11, color: C.red, fontWeight: 600, marginTop: 4 }}>
              Event is at full capacity
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── RSVP action buttons ──────────────────────────────────────────────────────
const RsvpButtons = ({ event, onRsvp, onRemove, loading }) => {
  const [guestCount, setGuestCount] = useState(event.myRsvp?.guestCount || 1);
  const current = event.myRsvp?.status || null;
  const isFull  = event.maxAttendees > 0 &&
    (event.rsvpSummary?.going || 0) >= event.maxAttendees &&
    current !== "going";

  const options = [
    { status: "going",     icon: "🎉", label: "Going"     },
    { status: "maybe",     icon: "🤔", label: "Maybe"     },
    { status: "not_going", icon: "😕", label: "Not Going" },
  ];

  return (
    <div style={{
      background: C.card, borderRadius: 14,
      border: `1.5px solid ${C.gray100}`,
      padding: "14px 16px", marginBottom: 14,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.gray700, marginBottom: 10 }}>
        {current ? "Your RSVP" : "Will you attend?"}
      </div>

      {/* Current RSVP banner */}
      {current && (() => {
        const sc = RSVP_STATUS_COLOR[current] || {};
        return (
          <div style={{
            background: sc.bg, borderRadius: 10,
            padding: "8px 12px", marginBottom: 10,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: sc.text }}>
              {RSVP_LABEL[current]}
              {current === "going" && event.myRsvp?.guestCount > 1
                ? ` · ${event.myRsvp.guestCount} guests`
                : ""}
            </span>
            <button onClick={() => !loading && onRemove()} style={{
              background: "rgba(0,0,0,0.08)", border: "none", borderRadius: 6,
              padding: "3px 8px", fontSize: 11, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              color: sc.text, fontFamily: "Plus Jakarta Sans",
            }}>
              {loading ? <Spinner size={10} color={sc.text} /> : "Remove"}
            </button>
          </div>
        );
      })()}

      {/* Status picker */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {options.map(({ status, icon, label }) => {
          const isActive = current === status;
          const disabled = isFull && status === "going";
          const color    = EVENT_CATEGORY_COLOR.Festival; // purple for RSVP active
          return (
            <button
              key={status}
              onClick={() => !loading && !disabled && onRsvp({ status, guestCount })}
              disabled={loading || disabled}
              style={{
                flex: 1, padding: "9px 4px", borderRadius: 10,
                cursor: loading || disabled ? "not-allowed" : "pointer",
                fontFamily: "Plus Jakarta Sans", transition: "all 0.15s",
                opacity: disabled ? 0.45 : 1,
                background: isActive ? C.teal : C.gray50,
                border: `1.5px solid ${isActive ? C.teal : C.gray100}`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              }}
            >
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? C.teal : C.gray500 }}>
                {label}
              </span>
              {isActive && <Spinner size={10} color={C.teal} style={{ display: loading ? "block" : "none" }} />}
            </button>
          );
        })}
      </div>

      {/* Guest count stepper — only shown when Going is selected */}
      {(current === "going" || !current) && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.gray500, marginBottom: 6 }}>
            Number of guests (incl. you)
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setGuestCount((n) => Math.max(1, n - 1))} style={{
              width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${C.gray100}`,
              background: C.gray50, cursor: "pointer", fontSize: 18, fontWeight: 700, color: C.gray700,
            }}>−</button>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.navy, fontFamily: "Syne", minWidth: 24, textAlign: "center" }}>
              {guestCount}
            </span>
            <button onClick={() => setGuestCount((n) => Math.min(20, n + 1))} style={{
              width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${C.gray100}`,
              background: C.gray50, cursor: "pointer", fontSize: 18, fontWeight: 700, color: C.gray700,
            }}>+</button>
            {!current && (
              <Btn
                small
                onClick={() => onRsvp({ status: "going", guestCount })}
                loading={loading}
                style={{ marginLeft: "auto" }}
              >
                🎉 RSVP Going
              </Btn>
            )}
          </div>
        </div>
      )}

      {isFull && current !== "going" && (
        <div style={{ fontSize: 11, color: C.red, fontWeight: 600, marginTop: 8 }}>
          ⚠️ Event is full — only "Maybe" or "Not Going" is available
        </div>
      )}
    </div>
  );
};

// ─── Event list card ──────────────────────────────────────────────────────────
const EventCard = ({ event, onClick }) => {
  const upcoming  = isUpcoming(event);
  const catColor  = EVENT_CATEGORY_COLOR[event.category] || C.teal;
  const catIcon   = EVENT_CATEGORY_ICON[event.category]  || "📅";
  const sc        = event.myRsvp ? RSVP_STATUS_COLOR[event.myRsvp.status] : null;

  return (
    <Card onClick={onClick} style={{ opacity: event.isCancelled ? 0.6 : 1 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Date box */}
        <div style={{
          width: 48, flexShrink: 0, textAlign: "center",
          background: event.isCancelled ? C.gray100 : catColor + "15",
          borderRadius: 12, padding: "8px 4px",
        }}>
          <div style={{ fontSize: 18, lineHeight: 1 }}>{catIcon}</div>
          <div style={{
            fontSize: 15, fontWeight: 800, color: event.isCancelled ? C.gray500 : catColor,
            fontFamily: "Syne", lineHeight: 1.1, marginTop: 4,
          }}>
            {new Date(event.eventDate).getDate()}
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.gray500, textTransform: "uppercase" }}>
            {new Date(event.eventDate).toLocaleDateString("en-IN", { month: "short" })}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: event.isCancelled ? C.gray500 : C.navy, lineHeight: 1.3 }}>
              {event.title}
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              {event.isCancelled && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: C.red + "15", color: C.red }}>
                  Cancelled
                </span>
              )}
              {!event.isPublished && !event.isCancelled && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: C.amber + "20", color: C.amber }}>
                  Draft
                </span>
              )}
              {sc && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: sc.bg, color: sc.text }}>
                  {RSVP_LABEL[event.myRsvp.status]}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: "4px 12px", flexWrap: "wrap", fontSize: 11, color: C.gray500, marginBottom: 6 }}>
            <span>🕐 {event.isAllDay ? "All day" : fmtTime(event.eventDate)}</span>
            {event.venue && <span>📍 {event.venue.slice(0, 30)}{event.venue.length > 30 ? "…" : ""}</span>}
          </div>

          <RsvpCounts summary={event.rsvpSummary} maxAttendees={event.maxAttendees} compact />
        </div>
      </div>
    </Card>
  );
};

// ─── Event detail view ────────────────────────────────────────────────────────
const EventDetailView = ({ eventId, onBack, isAdmin }) => {
  const toast = useToast();
  const [event,        setEvent]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [rsvpLoading,  setRsvpLoading]  = useState(false);
  const [actionBusy,   setActionBusy]   = useState(null);
  const [showCancel,   setShowCancel]   = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await eventsApi.getOne(eventId);
      setEvent(res.data?.event);
    } catch (e) {
      toast.error("Failed to load event.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  // ── RSVP ────────────────────────────────────────────────────────────────────
  const handleRsvp = async ({ status, guestCount }) => {
    setRsvpLoading(true);
    try {
      const res = await eventsApi.rsvp(event._id, {
        status,
        guestCount: status === "going" ? guestCount : undefined,
      });
      setEvent(res.data?.event);
      toast.success(
        status === "going"    ? "You're going! 🎉"  :
        status === "maybe"    ? "Marked as maybe 🤔" :
                                "RSVP updated."
      );
    } catch (e) {
      toast.error(e?.response?.data?.message || "RSVP failed.");
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleRemoveRsvp = async () => {
    setRsvpLoading(true);
    try {
      const res = await eventsApi.removeRsvp(event._id);
      setEvent(res.data?.event);
      toast.success("RSVP removed.");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to remove RSVP.");
    } finally {
      setRsvpLoading(false);
    }
  };

  // ── Admin: publish / cancel ──────────────────────────────────────────────────
  const handlePublish = async () => {
    setActionBusy("publish");
    try {
      const res = await eventsApi.publish(event._id);
      setEvent(res.data?.event);
      toast.success("Event published and residents notified.");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to publish.");
    } finally {
      setActionBusy(null);
    }
  };

  const handleCancel = async () => {
    setActionBusy("cancel");
    try {
      const res = await eventsApi.cancel(event._id, cancelReason.trim());
      setEvent(res.data?.event);
      setShowCancel(false);
      setCancelReason("");
      toast.success("Event cancelled.");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to cancel event.");
    } finally {
      setActionBusy(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
        <Spinner size={32} />
      </div>
    );
  }
  if (!event) return <ErrorState message="Event not found." onRetry={load} />;

  const catColor = EVENT_CATEGORY_COLOR[event.category] || C.teal;
  const catIcon  = EVENT_CATEGORY_ICON[event.category]  || "📅";
  const upcoming = isUpcoming(event);
  const canRsvp  = event.isPublished && !event.isCancelled && upcoming;

  return (
    <div className="screen-enter" style={{ paddingBottom: 32 }}>
      {/* ── Banner header ────────────────────────────────────────────────────── */}
      <div style={{
        background: event.isCancelled
          ? `linear-gradient(135deg, ${C.gray500} 0%, ${C.gray700} 100%)`
          : `linear-gradient(135deg, ${catColor} 0%, ${catColor}cc 100%)`,
        padding: "16px 20px 32px", position: "relative", overflow: "hidden",
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
        <div style={{ position: "absolute", bottom: -30, right: 50, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

        <button onClick={onBack} style={{
          background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8,
          padding: "5px 12px", fontSize: 12, color: "#fff", cursor: "pointer",
          fontFamily: "Plus Jakarta Sans", fontWeight: 600, marginBottom: 16,
        }}>
          ← Back
        </button>

        <div style={{ fontSize: 44, marginBottom: 12 }}>{catIcon}</div>

        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <span style={{
            background: "rgba(255,255,255,0.2)", fontSize: 11, fontWeight: 700,
            padding: "3px 10px", borderRadius: 20, color: "#fff",
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            {event.category}
          </span>
          {event.isCancelled && (
            <span style={{ background: C.red + "80", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, color: "#fff" }}>
              Cancelled
            </span>
          )}
          {!event.isPublished && (
            <span style={{ background: C.amber + "80", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, color: "#fff" }}>
              Draft
            </span>
          )}
        </div>

        <div style={{ fontSize: 20, fontFamily: "Syne", fontWeight: 800, color: "#fff", lineHeight: 1.3, marginBottom: 6 }}>
          {event.title}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
          Organised by {event.createdBy?.name || "Admin"}
        </div>
      </div>

      <div style={{ padding: "0 16px", marginTop: 16 }}>

        {/* ── Event info card ─────────────────────────────────────────────────── */}
        <Card style={{ marginBottom: 14 }}>
          {[
            ["📅", "Date",   event.isAllDay
              ? fmtDate(event.eventDate)
              : `${fmtDate(event.eventDate)}, ${fmtTime(event.eventDate)}`
            ],
            event.endDate && ["⏰", "Ends",  event.isAllDay ? fmtDate(event.endDate) : `${fmtDateShort(event.endDate)}, ${fmtTime(event.endDate)}`],
            event.venue   && ["📍", "Venue", event.venue],
            event.maxAttendees && ["👥", "Capacity", `${event.maxAttendees} people max`],
          ].filter(Boolean).map(([icon, label, value]) => (
            <div key={label} style={{
              display: "flex", gap: 10, paddingBottom: 10, marginBottom: 10,
              borderBottom: `1px solid ${C.gray100}`,
            }}>
              <span style={{ fontSize: 16, width: 20, textAlign: "center", flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.gray500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 1 }}>{value}</div>
              </div>
            </div>
          ))}

          {/* Cancellation note */}
          {event.isCancelled && event.cancelReason && (
            <div style={{
              background: C.red + "10", border: `1px solid ${C.red}20`,
              borderRadius: 8, padding: "8px 12px",
              fontSize: 12, color: C.gray700,
            }}>
              🚫 <strong>Reason:</strong> {event.cancelReason}
            </div>
          )}
        </Card>

        {/* ── RSVP counts ──────────────────────────────────────────────────────── */}
        {event.isPublished && (
          <RsvpCounts summary={event.rsvpSummary} maxAttendees={event.maxAttendees} />
        )}

        {/* ── Admin: full attendee list ────────────────────────────────────────── */}
        {isAdmin && event.isPublished && (
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.gray700, marginBottom: 4 }}>
              👥 Attendee List
            </div>
            <AttendeeList eventId={event._id} />
          </Card>
        )}

        {/* ── RSVP action ──────────────────────────────────────────────────────── */}
        {canRsvp && (
          <RsvpButtons
            event={event}
            onRsvp={handleRsvp}
            onRemove={handleRemoveRsvp}
            loading={rsvpLoading}
          />
        )}

        {/* Past event notice */}
        {event.isPublished && !event.isCancelled && !upcoming && (
          <div style={{
            background: C.gray50, borderRadius: 12, padding: "12px 14px", marginBottom: 14,
            fontSize: 13, color: C.gray500, textAlign: "center",
          }}>
            This event has already taken place.
          </div>
        )}

        {/* ── Description ──────────────────────────────────────────────────────── */}
        {event.description && (
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.gray700, marginBottom: 8 }}>About this event</div>
            <p style={{ margin: 0, fontSize: 13, color: C.gray700, lineHeight: 1.7 }}>
              {event.description}
            </p>
          </Card>
        )}

        {/* ── Rules ────────────────────────────────────────────────────────────── */}
        {event.rules && (
          <div style={{
            background: C.amber + "10", border: `1px solid ${C.amber}25`,
            borderRadius: 12, padding: "12px 14px", marginBottom: 14,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.amber, marginBottom: 6 }}>
              📋 Rules & Guidelines
            </div>
            <p style={{ margin: 0, fontSize: 12, color: C.gray700, lineHeight: 1.6 }}>
              {event.rules}
            </p>
          </div>
        )}

        {/* ── Admin actions ─────────────────────────────────────────────────────── */}
        {isAdmin && !event.isCancelled && (
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.gray700, marginBottom: 10 }}>Admin Actions</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {!event.isPublished && (
                <Btn
                  small variant="primary"
                  loading={actionBusy === "publish"}
                  onClick={handlePublish}
                >
                  📢 Publish Event
                </Btn>
              )}
              <Btn
                small variant="ghost"
                style={{ color: C.red }}
                loading={actionBusy === "cancel"}
                onClick={() => setShowCancel(true)}
              >
                🚫 Cancel Event
              </Btn>
            </div>
          </Card>
        )}

        <div style={{ fontSize: 11, color: C.gray300, textAlign: "center" }}>
          Posted {timeAgo(event.createdAt)}
        </div>
      </div>

      {/* Cancel event modal */}
      <Modal open={showCancel} onClose={() => setShowCancel(false)} title="Cancel Event">
        <div style={{
          background: C.red + "10", border: `1px solid ${C.red}20`,
          borderRadius: 10, padding: "10px 14px", marginBottom: 14,
          fontSize: 13, color: C.gray700,
        }}>
          ⚠️ All RSVPs will be notified that this event is cancelled. This cannot be undone.
        </div>
        <Input
          label="Reason (optional)"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Venue not available, rescheduled…"
          multiline
        />
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="ghost" onClick={() => setShowCancel(false)} style={{ flex: 1 }}>
            Keep Event
          </Btn>
          <Btn
            variant="red"
            onClick={handleCancel}
            loading={actionBusy === "cancel"}
            style={{ flex: 2 }}
          >
            Cancel This Event
          </Btn>
        </div>
      </Modal>
    </div>
  );
};

// ─── Create / Edit event modal (admin) ────────────────────────────────────────
const EventFormModal = ({ open, editing, onClose, onSaved }) => {
  const toast = useToast();
  const blank = {
    title: "", category: "Festival", description: "",
    eventDate: "", eventTime: "10:00",
    endDate: "", endTime: "",
    venue: "", maxAttendees: "", rules: "", isAllDay: false,
  };
  const [form,       setForm]       = useState(blank);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          title:        editing.title        || "",
          category:     editing.category     || "Festival",
          description:  editing.description  || "",
          eventDate:    localDateStr(editing.eventDate),
          eventTime:    editing.isAllDay ? "10:00" : localTimeStr(editing.eventDate),
          endDate:      editing.endDate ? localDateStr(editing.endDate) : "",
          endTime:      editing.endDate ? localTimeStr(editing.endDate) : "",
          venue:        editing.venue        || "",
          maxAttendees: editing.maxAttendees || "",
          rules:        editing.rules        || "",
          isAllDay:     editing.isAllDay     || false,
        });
      } else {
        setForm(blank);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const f    = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const fB   = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim())  return toast.error("Title is required.");
    if (!form.eventDate)     return toast.error("Date is required.");

    const dateStr = form.isAllDay
      ? form.eventDate
      : `${form.eventDate}T${form.eventTime}:00`;
    const endDateStr = form.endDate
      ? (form.isAllDay ? form.endDate : `${form.endDate}T${(form.endTime || "23:59")}:00`)
      : undefined;

    const payload = {
      title:        form.title.trim(),
      category:     form.category,
      description:  form.description.trim() || undefined,
      eventDate:    dateStr,
      endDate:      endDateStr,
      venue:        form.venue.trim()        || undefined,
      maxAttendees: form.maxAttendees ? Number(form.maxAttendees) : undefined,
      rules:        form.rules.trim()        || undefined,
      isAllDay:     form.isAllDay,
    };

    setSubmitting(true);
    try {
      const res = editing
        ? await eventsApi.update(editing._id, payload)
        : await eventsApi.create(payload);
      toast.success(editing ? "Event updated." : "Event created as draft.");
      onSaved(res.data?.event);
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Save failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Event" : "Create Event"}>
      <Input label="Title *"       value={form.title}       onChange={f("title")}       placeholder="Annual Diwali Celebration" />
      <Select label="Category"     value={form.category}    onChange={f("category")}    options={EVENT_CATEGORIES} />
      <Input label="Description"   value={form.description} onChange={f("description")} placeholder="Tell residents what to expect…" multiline />

      {/* All-day toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700 }}>All Day Event</div>
        <div onClick={() => fB("isAllDay")(!form.isAllDay)} style={{
          width: 40, height: 22, borderRadius: 11, cursor: "pointer",
          background: form.isAllDay ? C.teal : C.gray300, position: "relative", transition: "background 0.2s",
        }}>
          <div style={{
            position: "absolute", top: 2, left: form.isAllDay ? 20 : 2,
            width: 18, height: 18, borderRadius: "50%", background: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.2)", transition: "left 0.2s",
          }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: form.isAllDay ? "1fr" : "1fr 1fr", gap: 10 }}>
        <Input label="Start Date *" value={form.eventDate} onChange={f("eventDate")} type="date" />
        {!form.isAllDay && <Input label="Start Time" value={form.eventTime} onChange={f("eventTime")} type="time" />}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: form.isAllDay ? "1fr" : "1fr 1fr", gap: 10 }}>
        <Input label="End Date (optional)" value={form.endDate} onChange={f("endDate")} type="date" />
        {!form.isAllDay && <Input label="End Time"   value={form.endTime}  onChange={f("endTime")}  type="time" />}
      </div>

      <Input label="Venue"         value={form.venue}        onChange={f("venue")}        placeholder="Clubhouse, Rooftop…" />
      <Input label="Max Attendees" value={form.maxAttendees} onChange={f("maxAttendees")} type="number" placeholder="Leave blank for unlimited" />
      <Input label="Rules / Notes" value={form.rules}        onChange={f("rules")}        placeholder="Dress code, entry time…" multiline />

      <Btn onClick={handleSave} loading={submitting} style={{ width: "100%" }}>
        {editing ? "Save Changes" : "Create Draft"}
      </Btn>
    </Modal>
  );
};

// ─── EventsScreen (root) ──────────────────────────────────────────────────────
export const EventsScreen = () => {
  const { isAdmin } = useAuth();
  const toast = useToast();

  // "list" | "detail:${id}"
  const [view,         setView]         = useState("list");
  const [tab,          setTab]          = useState("upcoming"); // "upcoming" | "past"
  const [catFilter,    setCatFilter]    = useState("All");
  const [events,       setEvents]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [showForm,     setShowForm]     = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);

  const loadEvents = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { sort: tab === "upcoming" ? "eventDate" : "-eventDate", limit: 50 };
      if (catFilter !== "All") params.category = catFilter;
      const res = await eventsApi.getAll(params);
      const all = res.data?.events || [];
      // Client-side upcoming/past split (backend may not filter by date)
      const now = new Date();
      const filtered = all.filter((e) =>
        tab === "upcoming"
          ? new Date(e.eventDate) >= now
          : new Date(e.eventDate) < now
      );
      setEvents(filtered);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load events.");
    } finally {
      setLoading(false);
    }
  }, [tab, catFilter]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const handleSaved = (event) => {
    setEvents((p) => {
      const idx = p.findIndex((e) => e._id === event._id);
      if (idx >= 0) { const n = [...p]; n[idx] = event; return n; }
      return [event, ...p];
    });
  };

  // Detail sub-view
  if (view.startsWith("detail:")) {
    return (
      <EventDetailView
        eventId={view.replace("detail:", "")}
        onBack={() => setView("list")}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <div className="screen-enter" style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, #1a3a6e 100%)`,
        padding: "20px 20px 0",
      }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Society
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, marginBottom: 16 }}>
          <div style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 800, color: "#fff" }}>
            🎉 Events
          </div>
          {isAdmin && (
            <button onClick={() => { setEditTarget(null); setShowForm(true); }} style={{
              background: C.amber, color: "#fff", border: "none",
              borderRadius: 10, padding: "7px 14px",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "Plus Jakarta Sans",
            }}>
              + Create
            </button>
          )}
        </div>

        {/* Upcoming / Past tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          {[
            { id: "upcoming", label: "Upcoming" },
            { id: "past",     label: "Past"     },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, background: "none", border: "none",
              padding: "10px 0", cursor: "pointer",
              fontSize: 13, fontWeight: 700,
              color: tab === id ? "#fff" : "rgba(255,255,255,0.45)",
              borderBottom: `2.5px solid ${tab === id ? C.amber : "transparent"}`,
              fontFamily: "Plus Jakarta Sans", transition: "all 0.15s",
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter chips */}
      <div style={{ padding: "12px 0 0", background: C.gray50, borderBottom: `1px solid ${C.gray100}` }}>
        <CategoryStrip selected={catFilter} onChange={setCatFilter} />
      </div>

      {/* Event list */}
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading && [1, 2, 3, 4].map((k) => (
          <div key={k} className="skeleton" style={{ height: 100, borderRadius: 14 }} />
        ))}
        {error && <ErrorState message={error} onRetry={loadEvents} />}
        {!loading && !error && events.length === 0 && (
          <EmptyState
            icon={tab === "upcoming" ? "🗓️" : "📂"}
            message={
              tab === "upcoming"
                ? catFilter === "All"
                  ? isAdmin ? "No upcoming events. Create one!" : "No upcoming events scheduled."
                  : `No upcoming ${catFilter} events.`
                : "No past events to show."
            }
          />
        )}
        {!loading && !error && events.map((event) => (
          <EventCard
            key={event._id}
            event={event}
            onClick={() => setView(`detail:${event._id}`)}
          />
        ))}
      </div>

      <EventFormModal
        open={showForm}
        editing={editTarget}
        onClose={() => { setShowForm(false); setEditTarget(null); }}
        onSaved={handleSaved}
      />
    </div>
  );
};
