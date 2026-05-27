/**
 * SlotCard
 * Single row for one parking slot.
 *
 * Props:
 *   slot        — slot object from GET /parking/slots
 *   isAdmin     — bool  — shows the Release button on assigned slots
 *   onReleased  — (slotId) => void   called after a successful release
 */
import { useState } from "react";
import { parkingApi }  from "../../api/resources.api";
import { useToast }    from "../../context/ToastContext";
import { C, SLOT_TYPE_ICON, SLOT_TYPE_COLOR, SLOT_STATUS_COLOR } from "../../constants/theme";
import { Badge, Spinner } from "../../components/ui";

export const SlotCard = ({ slot, isAdmin = false, onReleased }) => {
  const toast = useToast();
  const color = SLOT_TYPE_COLOR[slot.type]     || C.teal;
  const icon  = SLOT_TYPE_ICON[slot.type]      || "🅿️";
  const sc    = SLOT_STATUS_COLOR[slot.status] || {};

  // Two-step release confirm: idle → confirm → releasing
  const [releaseState, setReleaseState] = useState("idle"); // "idle"|"confirm"|"releasing"

  const handleReleaseClick = () => {
    if (releaseState === "idle")    return setReleaseState("confirm");
    if (releaseState === "confirm") return doRelease();
  };

  const doRelease = async () => {
    setReleaseState("releasing");
    try {
      await parkingApi.releaseSlot(slot._id);
      toast.success(`Slot ${slot.slotNumber} released.`);
      onReleased?.(slot._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Release failed.");
      setReleaseState("idle");
    }
  };

  const releaseLabel = {
    idle:      "↩ Release",
    confirm:   "Confirm?",
    releasing: null,
  }[releaseState];

  const releaseColor = releaseState === "confirm" ? C.red : C.gray500;

  return (
    <div style={{
      background: "#fff", borderRadius: 12,
      border: `1px solid ${C.gray100}`,
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 14px",
      }}>
        {/* Type icon + slot number */}
        <div style={{
          width: 46, height: 46, borderRadius: 10, flexShrink: 0,
          background: color + "12",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 1,
        }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ fontSize: 8, fontWeight: 800, color, letterSpacing: "0.03em" }}>
            {slot.slotNumber}
          </span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
              Slot {slot.slotNumber}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, color,
              background: color + "15", padding: "1px 6px", borderRadius: 4,
            }}>
              {slot.type}
            </span>
            {slot.zone && (
              <span style={{ fontSize: 10, color: C.gray400 }}>Zone {slot.zone}</span>
            )}
          </div>

          {slot.status === "assigned" && (
            <div style={{ fontSize: 11, color: C.gray500 }}>
              {slot.assignedFlat   ? `Flat ${slot.assignedFlat}`    : ""}
              {slot.vehicleNumber  ? ` · ${slot.vehicleNumber}`     : ""}
            </div>
          )}
          {slot.status === "blocked" && slot.note && (
            <div style={{ fontSize: 11, color: C.gray500, fontStyle: "italic" }}>
              {slot.note}
            </div>
          )}
        </div>

        {/* Status badge */}
        <Badge
          label={slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
          bg={sc.bg} text={sc.text} dot={sc.dot}
        />
      </div>

      {/* Admin Release strip — only for assigned slots */}
      {isAdmin && slot.status === "assigned" && (
        <div style={{
          borderTop: `1px solid ${C.gray100}`,
          padding: "6px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: releaseState === "confirm" ? C.red + "06" : "transparent",
          transition: "background 0.2s",
        }}>
          {releaseState === "confirm" && (
            <span style={{ fontSize: 11, color: C.red, fontWeight: 600 }}>
              Release slot and unassign resident?
            </span>
          )}
          {releaseState === "idle" && (
            <span style={{ fontSize: 11, color: C.gray400 }}>
              {slot.assignedFlat ? `Assigned to Flat ${slot.assignedFlat}` : "Assigned"}
            </span>
          )}

          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            {releaseState === "confirm" && (
              <button
                onClick={() => setReleaseState("idle")}
                style={{
                  padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.gray200}`,
                  background: "transparent", fontSize: 11, fontWeight: 600,
                  color: C.gray500, cursor: "pointer", fontFamily: "Plus Jakarta Sans",
                }}
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleReleaseClick}
              disabled={releaseState === "releasing"}
              style={{
                padding: "4px 10px", borderRadius: 6,
                border: `1px solid ${releaseColor}30`,
                background: releaseColor + "10",
                fontSize: 11, fontWeight: 700,
                color: releaseColor,
                cursor: releaseState === "releasing" ? "not-allowed" : "pointer",
                fontFamily: "Plus Jakarta Sans",
                display: "flex", alignItems: "center", gap: 4,
                transition: "all 0.15s",
              }}
            >
              {releaseState === "releasing"
                ? <Spinner size={11} color={C.gray500} />
                : releaseLabel
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
