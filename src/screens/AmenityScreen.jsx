import { useState, useEffect, useCallback } from "react";
import { amenityApi } from "../api/resources.api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Card, Badge, Modal, Input, Select, Btn,
  EmptyState, ErrorState, PageHeader, Spinner,
} from "../components/ui";
import {
  C,
  AMENITY_CATEGORIES, AMENITY_CATEGORY_ICON,
  BOOKING_STATUS_COLOR,
} from "../constants/theme";
import { timeAgo } from "../utils/timeago";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

const fmtDateTime = (iso) => `${fmtDate(iso)}, ${fmtTime(iso)}`;

// Today as YYYY-MM-DD in local time
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ─── Shared badge ─────────────────────────────────────────────────────────────
const BookingBadge = ({ status }) => {
  const s = BOOKING_STATUS_COLOR[status] || BOOKING_STATUS_COLOR.cancelled;
  const label = { pending: "Pending", confirmed: "Confirmed", cancelled: "Cancelled", completed: "Completed", rejected: "Rejected" }[status] || status;
  return <Badge label={label} bg={s.bg} text={s.text} dot={s.dot} />;
};

// ─── Filter pill ──────────────────────────────────────────────────────────────
const Pill = ({ label, active, onClick, count }) => (
  <button onClick={onClick} style={{
    flexShrink: 0, padding: "5px 14px", borderRadius: 20,
    border: `1.5px solid ${active ? C.teal : C.gray100}`,
    background: active ? C.teal : "transparent",
    color: active ? "#fff" : C.gray600,
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "Plus Jakarta Sans", transition: "all 0.15s",
    display: "flex", alignItems: "center", gap: 5,
  }}>
    {label}
    {count > 0 && (
      <span style={{
        background: active ? "rgba(255,255,255,0.3)" : C.teal + "20",
        color: active ? "#fff" : C.teal,
        borderRadius: 10, padding: "0px 6px", fontSize: 10, fontWeight: 700,
      }}>{count}</span>
    )}
  </button>
);

// ─── Amenity Card (browse list) ───────────────────────────────────────────────
const AmenityCard = ({ amenity, onBook, onDeactivate, isAdmin }) => {
  const icon = AMENITY_CATEGORY_ICON[amenity.category] || "🏢";
  return (
    <Card>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Icon */}
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: C.teal + "15",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{amenity.name}</div>
            <span style={{
              fontSize: 10, fontWeight: 700, color: C.teal,
              background: C.teal + "15", borderRadius: 5, padding: "2px 7px",
            }}>
              {amenity.category}
            </span>
          </div>

          {amenity.description && (
            <p style={{ margin: "0 0 8px", fontSize: 12, color: C.gray500, lineHeight: 1.5 }}>
              {amenity.description.slice(0, 80)}{amenity.description.length > 80 ? "…" : ""}
            </p>
          )}

          {/* Meta chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", fontSize: 11, color: C.gray500, marginBottom: 10 }}>
            <span>🕐 {amenity.openTime} – {amenity.closeTime}</span>
            {amenity.depositAmount > 0 && <span>💰 ₹{amenity.depositAmount} deposit</span>}
            {amenity.requiresApproval && <span style={{ color: C.amber, fontWeight: 600 }}>⏳ Needs approval</span>}
            {amenity.maxConcurrentBookings > 1 && <span>👥 Up to {amenity.maxConcurrentBookings} simultaneous</span>}
          </div>

          {/* Slot duration options */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {(amenity.slotDurationOptions || []).map((d) => (
              <span key={d} style={{
                fontSize: 11, fontWeight: 600,
                background: C.navy + "10", color: C.navy,
                borderRadius: 6, padding: "2px 8px",
              }}>
                {d >= 60 ? `${d / 60}h` : `${d}m`}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn small onClick={() => onBook(amenity)} style={{ flex: 1 }}>
              📅 Book Slot
            </Btn>
            {isAdmin && (
              <button
                onClick={() => onDeactivate(amenity._id)}
                style={{
                  background: C.red + "10", border: `1px solid ${C.red}25`,
                  borderRadius: 8, padding: "6px 12px",
                  fontSize: 11, fontWeight: 700, color: C.red, cursor: "pointer",
                }}
              >
                Deactivate
              </button>
            )}
          </div>
        </div>
      </div>

      {amenity.rules && (
        <div style={{
          marginTop: 10, background: C.amber + "10",
          border: `1px solid ${C.amber}25`, borderRadius: 8,
          padding: "8px 12px", fontSize: 11, color: C.gray700, lineHeight: 1.5,
        }}>
          📋 <strong>Rules:</strong> {amenity.rules.slice(0, 120)}{amenity.rules.length > 120 ? "…" : ""}
        </div>
      )}
    </Card>
  );
};

// ─── Booking Card (my bookings / all bookings) ────────────────────────────────
const BookingCard = ({ booking, isAdmin, onCancel, onConfirm, onReject, busy }) => {
  const isBusy = busy === booking._id;
  const canCancel = ["pending", "confirmed"].includes(booking.status);

  return (
    <Card>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: C.teal + "15",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
        }}>
          {AMENITY_CATEGORY_ICON[booking.amenity?.category] || "🏢"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 3 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
              {booking.amenity?.name || "Amenity"}
            </div>
            <BookingBadge status={booking.status} />
          </div>
          <div style={{ fontSize: 12, color: C.gray500 }}>
            {fmtDate(booking.startTime)} · {fmtTime(booking.startTime)} – {fmtTime(booking.endTime)}
          </div>
          {isAdmin && (
            <div style={{ fontSize: 12, color: C.gray500, marginTop: 2 }}>
              👤 {booking.bookedBy?.name} · Flat {booking.bookedBy?.flat}
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div style={{
        background: C.gray50, borderRadius: 8, padding: "8px 10px",
        fontSize: 11, color: C.gray500,
        display: "flex", flexWrap: "wrap", gap: "3px 14px", marginBottom: 10,
      }}>
        <span>⏱ {booking.durationMinutes} min</span>
        {booking.guestCount > 1 && <span>👥 {booking.guestCount} guests</span>}
        {booking.purpose && <span>📌 {booking.purpose}</span>}
        <span>🕐 Booked {timeAgo(booking.createdAt)}</span>
      </div>

      {booking.adminNote && (
        <div style={{
          fontSize: 12, color: C.gray700, fontStyle: "italic",
          background: C.amber + "10", borderRadius: 8, padding: "6px 10px", marginBottom: 10,
        }}>
          Admin: "{booking.adminNote}"
        </div>
      )}

      {booking.cancelReason && (
        <div style={{
          fontSize: 12, color: C.red, fontStyle: "italic",
          background: C.red + "08", borderRadius: 8, padding: "6px 10px", marginBottom: 10,
        }}>
          Cancelled: "{booking.cancelReason}"
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        {isAdmin && booking.status === "pending" && (
          <>
            <Btn small variant="primary" onClick={() => onConfirm(booking)} loading={isBusy} style={{ flex: 1 }}>
              ✓ Confirm
            </Btn>
            <Btn small variant="red" onClick={() => onReject(booking)} loading={isBusy} style={{ flex: 1 }}>
              ✕ Reject
            </Btn>
          </>
        )}
        {canCancel && !isAdmin && (
          <button
            onClick={() => onCancel(booking)}
            disabled={isBusy}
            style={{
              flex: 1, background: C.red + "10", border: `1px solid ${C.red}25`,
              borderRadius: 8, padding: "7px 12px",
              fontSize: 12, fontWeight: 700, color: C.red,
              cursor: isBusy ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            }}
          >
            {isBusy ? <Spinner size={12} /> : "Cancel Booking"}
          </button>
        )}
      </div>
    </Card>
  );
};

// ─── Book Slot Modal ──────────────────────────────────────────────────────────
const BookSlotModal = ({ open, amenity, onClose, onBooked }) => {
  const toast = useToast();
  const [date,         setDate]         = useState(todayStr());
  const [slots,        setSlots]        = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError,   setSlotsError]   = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [duration,     setDuration]     = useState("");
  const [purpose,      setPurpose]      = useState("");
  const [guestCount,   setGuestCount]   = useState(1);
  const [submitting,   setSubmitting]   = useState(false);

  // Load availability whenever date changes
  useEffect(() => {
    if (!amenity || !date) return;
    setSlotsLoading(true);
    setSlotsError(null);
    setSelectedSlot(null);
    amenityApi.getAvailability(amenity._id, date)
      .then((res) => setSlots(res.data?.slots || []))
      .catch((e) => setSlotsError(e.response?.data?.message || "Failed to load slots."))
      .finally(() => setSlotsLoading(false));
  }, [amenity, date]);

  // Set default duration to first option
  useEffect(() => {
    if (amenity?.slotDurationOptions?.length) {
      setDuration(String(amenity.slotDurationOptions[0]));
    }
  }, [amenity]);

  const handleBook = async () => {
    if (!selectedSlot) return toast.error("Select a time slot.");
    setSubmitting(true);
    try {
      const payload = {
        amenityId: amenity._id,
        startTime: selectedSlot.startTime,
        endTime:   selectedSlot.endTime,
        guestCount: Number(guestCount),
        purpose:   purpose.trim() || undefined,
      };
      const res = await amenityApi.createBooking(payload);
      toast.success(
        amenity.requiresApproval
          ? "Booking requested! Awaiting admin confirmation."
          : "Slot booked successfully!"
      );
      onBooked(res.data.booking);
      onClose();
      setSelectedSlot(null);
    } catch (e) {
      toast.error(e.response?.data?.message || "Booking failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => { setDate(todayStr()); setSlots([]); setSelectedSlot(null); setPurpose(""); setGuestCount(1); };

  if (!amenity) return null;

  // Filter slots by chosen duration
  const filteredSlots = duration
    ? slots.filter((s) => s.durationMinutes === Number(duration))
    : slots;

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title={`Book · ${amenity.name}`}>
      {/* Amenity info */}
      <div style={{
        background: C.teal + "10", border: `1px solid ${C.teal}20`,
        borderRadius: 10, padding: "10px 14px", marginBottom: 16,
        display: "flex", gap: 10, alignItems: "center",
      }}>
        <span style={{ fontSize: 24 }}>{AMENITY_CATEGORY_ICON[amenity.category] || "🏢"}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{amenity.name}</div>
          <div style={{ fontSize: 11, color: C.gray500 }}>
            {amenity.openTime} – {amenity.closeTime}
            {amenity.depositAmount > 0 ? ` · ₹${amenity.depositAmount} deposit` : ""}
          </div>
        </div>
      </div>

      {/* Rules */}
      {amenity.rules && (
        <div style={{
          background: C.amber + "10", borderRadius: 8,
          padding: "8px 12px", marginBottom: 14,
          fontSize: 11, color: C.gray700, lineHeight: 1.5,
        }}>
          📋 {amenity.rules}
        </div>
      )}

      {/* Date picker */}
      <Input
        label="Select Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        min={todayStr()}
      />

      {/* Duration filter */}
      {amenity.slotDurationOptions?.length > 1 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700, marginBottom: 8 }}>Duration</div>
          <div style={{ display: "flex", gap: 8 }}>
            {amenity.slotDurationOptions.map((d) => (
              <button key={d} onClick={() => { setDuration(String(d)); setSelectedSlot(null); }} style={{
                padding: "5px 14px", borderRadius: 20,
                border: `1.5px solid ${duration === String(d) ? C.teal : C.gray100}`,
                background: duration === String(d) ? C.teal : "transparent",
                color: duration === String(d) ? "#fff" : C.gray600,
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "Plus Jakarta Sans",
              }}>
                {d >= 60 ? `${d / 60}h` : `${d}m`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Slot grid */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700, marginBottom: 8 }}>
          Available Slots
          {slotsLoading && <Spinner size={12} style={{ marginLeft: 8 }} />}
        </div>

        {slotsError && (
          <div style={{ fontSize: 12, color: C.red }}>{slotsError}</div>
        )}

        {!slotsLoading && !slotsError && filteredSlots.length === 0 && (
          <div style={{ fontSize: 12, color: C.gray500, padding: "8px 0" }}>
            No available slots for this date{duration ? "/duration" : ""}. Try another day.
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {filteredSlots.map((slot, i) => {
            const isSelected = selectedSlot?.startTime === slot.startTime;
            const isAvail    = slot.available;
            return (
              <button key={i}
                onClick={() => isAvail && setSelectedSlot(slot)}
                disabled={!isAvail}
                style={{
                  padding: "7px 13px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                  cursor: isAvail ? "pointer" : "not-allowed",
                  border: `1.5px solid ${isSelected ? C.teal : isAvail ? C.gray100 : C.gray100}`,
                  background: isSelected ? C.teal : isAvail ? "#fff" : C.gray50,
                  color: isSelected ? "#fff" : isAvail ? C.text : C.gray300,
                  transition: "all 0.12s",
                }}
              >
                {fmtTime(slot.startTime)}
                {!isAvail && <span style={{ fontSize: 9, marginLeft: 4 }}>full</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Purpose + guest count */}
      <Input
        label="Purpose (optional)"
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        placeholder="e.g. Birthday party, yoga class"
      />
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700, marginBottom: 6 }}>Number of Guests</div>
        <input
          type="number" min={1} max={50}
          value={guestCount}
          onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value)))}
          style={{
            width: 80, border: `1.5px solid ${C.gray100}`, borderRadius: 10,
            padding: "8px 12px", fontSize: 14, fontFamily: "Plus Jakarta Sans",
            color: C.text, outline: "none",
          }}
        />
      </div>

      {selectedSlot && (
        <div style={{
          background: C.teal + "10", border: `1px solid ${C.teal}30`,
          borderRadius: 10, padding: "10px 14px", marginBottom: 14,
          fontSize: 13, fontWeight: 600, color: C.teal,
        }}>
          ✓ {fmtDate(selectedSlot.startTime)}, {fmtTime(selectedSlot.startTime)} – {fmtTime(selectedSlot.endTime)}
          {amenity.depositAmount > 0 && (
            <div style={{ fontSize: 11, color: C.gray600, fontWeight: 500, marginTop: 3 }}>
              Deposit: ₹{amenity.depositAmount} (refundable)
            </div>
          )}
        </div>
      )}

      <Btn
        onClick={handleBook}
        loading={submitting}
        style={{ width: "100%" }}
        disabled={!selectedSlot}
      >
        {amenity.requiresApproval ? "Request Booking" : "Confirm Booking"}
      </Btn>
    </Modal>
  );
};

// ─── Create/Edit Amenity Modal (admin) ────────────────────────────────────────
const AmenityFormModal = ({ open, editing, onClose, onSaved }) => {
  const toast = useToast();
  const blank = {
    name: "", category: "Clubhouse", description: "",
    openTime: "06:00", closeTime: "22:00",
    maxConcurrentBookings: 1,
    slotDurationOptions: [60],
    maxSlotDuration: 120, advanceBookingDays: 7,
    requiresApproval: false, depositAmount: 0,
    rules: "",
  };
  const [form,       setForm]       = useState(blank);
  const [submitting, setSubmitting] = useState(false);
  const [durationInput, setDurationInput] = useState("60");

  useEffect(() => {
    if (editing) {
      setForm({ ...blank, ...editing });
      setDurationInput((editing.slotDurationOptions || [60]).join(", "));
    } else {
      setForm(blank);
      setDurationInput("60");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, open]);

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const fBool = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value === "true" }));
  const fNum  = (k) => (e) => setForm((p) => ({ ...p, [k]: Number(e.target.value) }));

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required.");
    // Parse duration options
    const opts = durationInput.split(",").map((s) => parseInt(s.trim())).filter((n) => n > 0);
    if (opts.length === 0) return toast.error("Enter at least one slot duration.");
    const payload = { ...form, slotDurationOptions: opts };

    setSubmitting(true);
    try {
      const res = editing
        ? await amenityApi.update(editing._id, payload)
        : await amenityApi.create(payload);
      toast.success(editing ? "Amenity updated." : "Amenity created.");
      onSaved(res.data.amenity);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || "Save failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Amenity" : "Add Amenity"}>
      <Input label="Name *"       value={form.name}        onChange={f("name")}        placeholder="Rooftop Swimming Pool" />
      <Select label="Category"    value={form.category}    onChange={f("category")}    options={AMENITY_CATEGORIES} />
      <Input label="Description"  value={form.description} onChange={f("description")} placeholder="Olympic-size pool on Level 5" multiline />
      <div style={{ display: "flex", gap: 10 }}>
        <Input label="Opens at" value={form.openTime}  onChange={f("openTime")}  type="time" />
        <Input label="Closes at" value={form.closeTime} onChange={f("closeTime")} type="time" />
      </div>
      <Input
        label="Slot durations (min, comma-separated)"
        value={durationInput}
        onChange={(e) => setDurationInput(e.target.value)}
        placeholder="60, 120"
      />
      <div style={{ display: "flex", gap: 10 }}>
        <Input label="Max concurrent" value={form.maxConcurrentBookings} onChange={fNum("maxConcurrentBookings")} type="number" />
        <Input label="Advance days"   value={form.advanceBookingDays}     onChange={fNum("advanceBookingDays")}     type="number" />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Input label="Deposit (₹)"    value={form.depositAmount}          onChange={fNum("depositAmount")}          type="number" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700, marginBottom: 6 }}>Requires Approval</div>
          <select
            value={String(form.requiresApproval)}
            onChange={fBool("requiresApproval")}
            style={{ width: "100%", border: `1.5px solid ${C.gray100}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: "Plus Jakarta Sans", color: C.text, outline: "none" }}
          >
            <option value="false">Auto-confirm</option>
            <option value="true">Needs approval</option>
          </select>
        </div>
      </div>
      <Input label="House Rules"  value={form.rules}  onChange={f("rules")}  placeholder="No loud music after 9pm…" multiline />
      <Btn onClick={handleSave} loading={submitting} style={{ width: "100%" }}>
        {editing ? "Save Changes" : "Create Amenity"}
      </Btn>
    </Modal>
  );
};

// ─── Admin Review Modal (confirm/reject) ─────────────────────────────────────
const ReviewModal = ({ open, booking, action, onClose, onDone }) => {
  const toast = useToast();
  const [note,       setNote]       = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (open) setNote(""); }, [open]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = action === "confirm"
        ? await amenityApi.confirmBooking(booking._id, note.trim())
        : await amenityApi.rejectBooking(booking._id, note.trim());
      toast.success(action === "confirm" ? "Booking confirmed." : "Booking rejected.");
      onDone(res.data.booking);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || "Action failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={action === "confirm" ? "Confirm Booking" : "Reject Booking"}>
      {booking && (
        <div>
          <div style={{
            background: C.gray50, borderRadius: 10, padding: "10px 14px", marginBottom: 14,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{booking.amenity?.name}</div>
            <div style={{ fontSize: 12, color: C.gray500, marginTop: 3 }}>
              {fmtDateTime(booking.startTime)} – {fmtTime(booking.endTime)}
            </div>
            <div style={{ fontSize: 12, color: C.gray500 }}>
              {booking.bookedBy?.name} · Flat {booking.bookedBy?.flat}
            </div>
          </div>
          <Input
            label={action === "confirm" ? "Note to resident (optional)" : "Reason for rejection *"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={action === "confirm" ? "Deposit to be paid at office." : "Slot already reserved for society event."}
            multiline
          />
          <Btn
            onClick={handleSubmit}
            loading={submitting}
            style={{
              width: "100%",
              background: action === "confirm" ? C.teal : C.red,
              color: "#fff",
            }}
          >
            {action === "confirm" ? "✓ Confirm Booking" : "✕ Reject Booking"}
          </Btn>
        </div>
      )}
    </Modal>
  );
};

// ─── Cancel Booking Modal ─────────────────────────────────────────────────────
const CancelModal = ({ open, booking, onClose, onCancelled }) => {
  const toast = useToast();
  const [reason,     setReason]     = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (open) setReason(""); }, [open]);

  const handleCancel = async () => {
    setSubmitting(true);
    try {
      const res = await amenityApi.cancelBooking(booking._id, reason.trim());
      toast.success("Booking cancelled.");
      onCancelled(res.data.booking);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || "Cancellation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Cancel Booking">
      {booking && (
        <div>
          <div style={{ background: C.gray50, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{booking.amenity?.name}</div>
            <div style={{ fontSize: 12, color: C.gray500, marginTop: 2 }}>
              {fmtDateTime(booking.startTime)} – {fmtTime(booking.endTime)}
            </div>
          </div>
          <Input
            label="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Change of plans…"
            multiline
          />
          <Btn onClick={handleCancel} loading={submitting} style={{ width: "100%", background: C.red, color: "#fff" }}>
            Cancel This Booking
          </Btn>
        </div>
      )}
    </Modal>
  );
};

// ─── Main AmenityScreen ───────────────────────────────────────────────────────
export const AmenityScreen = () => {
  const { isAdmin } = useAuth();
  const toast = useToast();

  // Views: "browse" | "mybookings" | "allbookings"
  const [view, setView] = useState("browse");

  // Amenity list
  const [amenities,    setAmenities]    = useState([]);
  const [amenityLoad,  setAmenityLoad]  = useState(true);
  const [amenityError, setAmenityError] = useState(null);

  // Booking list
  const [bookings,     setBookings]     = useState([]);
  const [bookingLoad,  setBookingLoad]  = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  // Busy state for per-booking actions
  const [busy, setBusy] = useState(null);

  // Modals
  const [bookTarget,    setBookTarget]    = useState(null);  // amenity → open BookSlotModal
  const [formTarget,    setFormTarget]    = useState(null);  // null=add, amenity=edit
  const [showForm,      setShowForm]      = useState(false);
  const [reviewTarget,  setReviewTarget]  = useState(null);  // { booking, action }
  const [cancelTarget,  setCancelTarget]  = useState(null);  // booking

  // ── Fetch amenities ──────────────────────────────────────────────────────────
  const fetchAmenities = useCallback(async () => {
    setAmenityLoad(true); setAmenityError(null);
    try {
      const res = await amenityApi.getAll();
      setAmenities(res.data?.amenities || []);
    } catch (e) {
      setAmenityError(e.response?.data?.message || "Failed to load amenities.");
    } finally {
      setAmenityLoad(false);
    }
  }, []);

  useEffect(() => { fetchAmenities(); }, [fetchAmenities]);

  // ── Fetch bookings ───────────────────────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    if (view === "browse") return;
    setBookingLoad(true); setBookingError(null);
    try {
      const params = { sort: "-createdAt", limit: 50 };
      if (statusFilter !== "all") params.status = statusFilter;
      const res = view === "allbookings"
        ? await amenityApi.getAllBookings(params)
        : await amenityApi.getMyBookings(params);
      setBookings(res.data?.bookings || []);
    } catch (e) {
      setBookingError(e.response?.data?.message || "Failed to load bookings.");
    } finally {
      setBookingLoad(false);
    }
  }, [view, statusFilter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleBooked = (booking) => {
    setBookings((p) => [booking, ...p]);
    // Switch to my bookings to show it
    setView("mybookings");
    setStatusFilter("all");
  };

  const handleAmenitySaved = (amenity) => {
    setAmenities((p) => {
      const idx = p.findIndex((a) => a._id === amenity._id);
      if (idx >= 0) { const n = [...p]; n[idx] = amenity; return n; }
      return [amenity, ...p];
    });
  };

  const handleDeactivate = async (amenityId) => {
    setBusy(amenityId);
    try {
      await amenityApi.deactivate(amenityId);
      setAmenities((p) => p.filter((a) => a._id !== amenityId));
      toast.success("Amenity deactivated.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to deactivate.");
    } finally {
      setBusy(null);
    }
  };

  const patchBooking = (updated) =>
    setBookings((p) => p.map((b) => b._id === updated._id ? updated : b));

  const handleConfirm = (booking) => setReviewTarget({ booking, action: "confirm" });
  const handleReject  = (booking) => setReviewTarget({ booking, action: "reject" });
  const handleCancel  = (booking) => setCancelTarget(booking);

  // ── Pending count for badge ───────────────────────────────────────────────────
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  // ── View tabs ─────────────────────────────────────────────────────────────────
  const BOOKING_FILTERS = ["all", "pending", "confirmed", "completed", "cancelled"];

  return (
    <div className="screen-enter" style={{ paddingBottom: 24 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, #0f3460 100%)`,
        padding: "20px 20px 24px",
      }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Society
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, marginBottom: 16 }}>
          <div style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 800, color: "#fff" }}>
            🏊 Amenities
          </div>
          {isAdmin && (
            <button onClick={() => { setFormTarget(null); setShowForm(true); }} style={{
              background: C.amber, color: "#fff", border: "none",
              borderRadius: 10, padding: "7px 14px",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "Plus Jakarta Sans",
            }}>
              + Add Amenity
            </button>
          )}
        </div>

        {/* View selector */}
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "browse",      label: "Browse" },
            { id: "mybookings",  label: "My Bookings" },
            ...(isAdmin ? [{ id: "allbookings", label: `All Bookings${pendingCount > 0 ? ` (${pendingCount})` : ""}` }] : []),
          ].map((v) => (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              padding: "6px 14px", borderRadius: 20, border: "none",
              background: view === v.id ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)",
              color: view === v.id ? "#fff" : "rgba(255,255,255,0.55)",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "Plus Jakarta Sans", transition: "all 0.15s",
            }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Browse amenities ─────────────────────────────────────────────────── */}
      {view === "browse" && (
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {amenityLoad && [1, 2, 3].map((k) => (
            <div key={k} className="skeleton" style={{ height: 160, borderRadius: 14 }} />
          ))}
          {amenityError && <ErrorState message={amenityError} onRetry={fetchAmenities} />}
          {!amenityLoad && !amenityError && amenities.length === 0 && (
            <EmptyState icon="🏢" message={isAdmin ? "No amenities yet. Add one!" : "No amenities available."} />
          )}
          {!amenityLoad && !amenityError && amenities.map((amenity) => (
            <AmenityCard
              key={amenity._id}
              amenity={amenity}
              isAdmin={isAdmin}
              onBook={(a) => setBookTarget(a)}
              onDeactivate={handleDeactivate}
            />
          ))}
        </div>
      )}

      {/* ── Booking list (my / all) ──────────────────────────────────────────── */}
      {(view === "mybookings" || view === "allbookings") && (
        <div>
          {/* Status filter pills */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "12px 16px", scrollbarWidth: "none" }}>
            {BOOKING_FILTERS.map((f) => (
              <Pill
                key={f}
                label={f.charAt(0).toUpperCase() + f.slice(1)}
                active={statusFilter === f}
                onClick={() => setStatusFilter(f)}
                count={f === "pending" ? pendingCount : 0}
              />
            ))}
          </div>

          <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {bookingLoad && [1, 2, 3].map((k) => (
              <div key={k} className="skeleton" style={{ height: 130, borderRadius: 14 }} />
            ))}
            {bookingError && <ErrorState message={bookingError} onRetry={fetchBookings} />}
            {!bookingLoad && !bookingError && bookings.length === 0 && (
              <EmptyState
                icon="📅"
                message={statusFilter === "all" ? "No bookings yet." : `No ${statusFilter} bookings.`}
              />
            )}
            {!bookingLoad && !bookingError && bookings.map((booking) => (
              <BookingCard
                key={booking._id}
                booking={booking}
                isAdmin={view === "allbookings"}
                busy={busy}
                onCancel={handleCancel}
                onConfirm={handleConfirm}
                onReject={handleReject}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      <BookSlotModal
        open={!!bookTarget}
        amenity={bookTarget}
        onClose={() => setBookTarget(null)}
        onBooked={handleBooked}
      />

      <AmenityFormModal
        open={showForm}
        editing={formTarget}
        onClose={() => { setShowForm(false); setFormTarget(null); }}
        onSaved={handleAmenitySaved}
      />

      <ReviewModal
        open={!!reviewTarget}
        booking={reviewTarget?.booking}
        action={reviewTarget?.action}
        onClose={() => setReviewTarget(null)}
        onDone={patchBooking}
      />

      <CancelModal
        open={!!cancelTarget}
        booking={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onCancelled={patchBooking}
      />
    </div>
  );
};
