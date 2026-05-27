import { C } from "../../constants/theme";

/**
 * EditBillButton
 *
 * A small pencil icon button rendered on draft bill cards.
 * Stops card-level click propagation so tapping Edit doesn't
 * also open the bill detail.
 *
 * Props:
 *   onClick  — called with the bill object when tapped
 *   bill     — the bill object (passed back to onClick)
 */
export const EditBillButton = ({ onClick, bill }) => (
  <button
    onClick={(e) => {
      e.stopPropagation(); // prevent card's onOpenBill from firing
      onClick(bill);
    }}
    title="Edit draft bill"
    aria-label="Edit draft bill"
    style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: C.amber + "18",
      border: `1.5px solid ${C.amber}35`,
      borderRadius: 8,
      padding: "4px 10px",
      fontSize: 11, fontWeight: 700,
      color: C.amber,
      cursor: "pointer",
      fontFamily: "Plus Jakarta Sans",
      transition: "background 0.15s",
      marginTop: 4,
      flexShrink: 0,
    }}
  >
    ✏️ Edit
  </button>
);
