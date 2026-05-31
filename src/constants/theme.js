/**
 * constants/theme.js
 *
 * ── i18n Integration Notes ────────────────────────────────────────────────────
 * NAV_ITEMS.label  →  English fallback string ONLY.
 *   BottomNav reads it as: t(`nav_${item.id}`, item.label)
 *   Translation keys are defined in src/i18n/{en,hi,gu}.js as nav_<id>.
 *   To add a new locale (Tamil, Telugu, Marathi…) just add the nav_<id> key
 *   to the new locale file — no change to theme.js needed.
 *
 * Sprint 3 (React Native prep):
 *   Each NAV_ITEM carries an `icon` that works on both web (emoji) and RN
 *   (react-native-vector-icons name stored in `rnIcon`). Add rnIcon when
 *   migrating; the web app ignores unknown props.
 *
 * Sprint 4 (Voice-to-text):
 *   Add a `voiceHint` key to CATEGORY labels so the speech recogniser knows
 *   which intent maps to which category (e.g. "water leak" → "Water").
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const C = {
  bg:      "#F5F3EE",
  card:    "#FFFFFF",
  navy:    "#0F2040",
  teal:    "#0D7377",
  amber:   "#F4A228",
  red:     "#E53E3E",
  green:   "#22835C",
  blue:    "#2563EB",
  purple:  "#7C3AED",
  gray50:  "#F9F8F6",
  gray100: "#EEECE8",
  gray300: "#C4BFB5",
  gray500: "#8C8680",
  gray700: "#4A4540",
  text:    "#1A1714",
};

// ─── Issue / Help ─────────────────────────────────────────────────────────────

export const STATUS_COLOR = {
  "Open":        { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  "In Progress": { bg: "#DBEAFE", text: "#1E40AF", dot: "#3B82F6" },
  "Resolved":    { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
};

export const PRIORITY_COLOR = {
  High:   { bg: "#FEE2E2", text: "#991B1B" },
  Medium: { bg: "#FEF9C3", text: "#854D0E" },
  Low:    { bg: "#F0FDF4", text: "#166534" },
};

export const CATEGORY_ICON = {
  Water:       "💧",
  Lift:        "🛗",
  Security:    "🔒",
  Garbage:     "🗑️",
  Electricity: "⚡",
  Noise:       "🔊",
  Parking:     "🅿️",
  Other:       "📋",
};

export const HELP_CAT_ICON = {
  Plumber:     "🔧",
  Electrician: "⚡",
  Maid:        "🧹",
  Carpenter:   "🪚",
  Food:        "🍱",
  Transport:   "🚗",
  Tutor:       "📚",
  Other:       "🤝",
};

export const NOTICE_TAG_COLOR = {
  Urgent:   C.red,
  Finance:  C.amber,
  Event:    C.teal,
  Notice:   C.purple,
  Reminder: C.blue,
};

export const NOTICE_TAG_ICON = {
  Urgent:   "🚨",
  Finance:  "💰",
  Event:    "🎉",
  Notice:   "📋",
  Reminder: "🔔",
};

export const ISSUE_CATEGORIES = Object.keys(CATEGORY_ICON);
export const HELP_CATEGORIES  = Object.keys(HELP_CAT_ICON);
export const NOTICE_TAGS      = Object.keys(NOTICE_TAG_COLOR);
export const PRIORITIES       = ["Low", "Medium", "High"];
export const CONTACT_GROUPS   = ["Emergency", "Committee", "Vendor", "Other"];
export const VISIT_PURPOSES   = ["Guest", "Delivery", "Cab", "Service", "Other"];

// ─── Navigation ───────────────────────────────────────────────────────────────
//
// label  →  English fallback; BottomNav resolves the final text via
//           t(`nav_${id}`, label) — the real translation lives in i18n/*.js.
//
// To add a new nav tab:
//   1. Add the item below with a unique id.
//   2. Add `nav_<id>` to all locale files (en/hi/gu/… .js).
//   3. Handle the tab in App.jsx render block.
//
// Sprint 3 note: add `rnIcon: "home-outline"` when migrating to React Native.

export const NAV_ITEMS = [
  { id: "home",        label: "Home",        icon: "🏠" },
  { id: "issues",      label: "Issues",      icon: "🔴" },
  { id: "visitors",    label: "Visitors",    icon: "🚶" },
  { id: "amenities",   label: "Amenities",   icon: "🏊" },
  { id: "maintenance", label: "Payments",    icon: "💰" },
  { id: "parking",     label: "Parking",     icon: "🚗" },
  { id: "events",      label: "Events",      icon: "🎉" },
];

export const NAV_ITEMS_ADMIN = [
  { id: "home",        label: "Home",        icon: "🏠" },
  { id: "issues",      label: "Issues",      icon: "🔴" },
  { id: "visitors",    label: "Visitors",    icon: "🚶" },
  { id: "amenities",   label: "Amenities",   icon: "🏊" },
  { id: "maintenance", label: "Payments",    icon: "💰" },
  { id: "parking",     label: "Parking",     icon: "🚗" },
  { id: "events",      label: "Events",      icon: "🎉" },
  { id: "admin",       label: "Approvals",   icon: "👑" },
];

// ─── Maintenance / Payments ───────────────────────────────────────────────────

export const PAYMENT_STATUS_COLOR = {
  unpaid:  { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  paid:    { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
  overdue: { bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" },
  waived:  { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" },
  partial: { bg: "#DBEAFE", text: "#1E40AF", dot: "#3B82F6" },
};

export const BILL_STATUS = {
  draft:     { label: "Draft",     bg: "#F3F4F6", text: "#6B7280" },
  published: { label: "Published", bg: "#DBEAFE", text: "#1E40AF" },
  closed:    { label: "Closed",    bg: "#D1FAE5", text: "#065F46" },
};

export const PAYMENT_METHODS = ["cash", "upi", "neft", "cheque", "other"];

// ─── Amenity Booking ──────────────────────────────────────────────────────────

export const AMENITY_CATEGORIES = [
  "Clubhouse", "Swimming Pool", "Gym", "Tennis Court",
  "Badminton Court", "Party Hall", "Terrace", "Kids Play Area", "Other",
];

export const AMENITY_CATEGORY_ICON = {
  "Clubhouse":       "🏛️",
  "Swimming Pool":   "🏊",
  "Gym":             "🏋️",
  "Tennis Court":    "🎾",
  "Badminton Court": "🏸",
  "Party Hall":      "🎉",
  "Terrace":         "🌇",
  "Kids Play Area":  "🛝",
  "Other":           "🏢",
};

export const BOOKING_STATUS_COLOR = {
  pending:   { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  confirmed: { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
  cancelled: { bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" },
  completed: { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" },
  rejected:  { bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" },
};

// ─── Events ───────────────────────────────────────────────────────────────────

export const EVENT_CATEGORIES = [
  "Festival", "Meeting", "Sports", "Cultural",
  "Maintenance", "Emergency", "Other",
];

export const EVENT_CATEGORY_ICON = {
  Festival:    "🎉",
  Meeting:     "📋",
  Sports:      "⚽",
  Cultural:    "🎭",
  Maintenance: "🔧",
  Emergency:   "🚨",
  Other:       "📅",
};

export const EVENT_CATEGORY_COLOR = {
  Festival:    "#7C3AED",
  Meeting:     "#2563EB",
  Sports:      "#22835C",
  Cultural:    "#F4A228",
  Maintenance: "#8C8680",
  Emergency:   "#E53E3E",
  Other:       "#0D7377",
};

export const RSVP_STATUS_COLOR = {
  going:     { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
  maybe:     { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  not_going: { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" },
};

export const RSVP_LABEL = {
  going:     "🎉 Going",
  maybe:     "🤔 Maybe",
  not_going: "😕 Not Going",
};

// ─── Parking ──────────────────────────────────────────────────────────────────

export const SLOT_TYPES = ["2W", "4W", "EV", "Visitor", "Reserved"];

export const SLOT_TYPE_ICON = {
  "2W":       "🛵",
  "4W":       "🚗",
  "EV":       "⚡",
  "Visitor":  "🪪",
  "Reserved": "🔒",
};

export const SLOT_TYPE_COLOR = {
  "2W":       "#0D7377",
  "4W":       "#2563EB",
  "EV":       "#16A34A",
  "Visitor":  "#7C3AED",
  "Reserved": "#9CA3AF",
};

export const SLOT_STATUS_COLOR = {
  available: { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
  assigned:  { bg: "#DBEAFE", text: "#1E40AF", dot: "#3B82F6" },
  blocked:   { bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" },
};

export const REQUEST_STATUS_COLOR = {
  pending:   { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  approved:  { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
  rejected:  { bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" },
  cancelled: { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" },
};

// ─── Visitor ──────────────────────────────────────────────────────────────────

export const VISITOR_STATUS_COLOR = {
  invited:  { bg: "#DBEAFE", text: "#1E40AF", dot: "#3B82F6" },
  pending:  { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  approved: { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
  rejected: { bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" },
  exited:   { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" },
  expired:  { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" },
};

export const VISITOR_PURPOSE_ICON = {
  Guest:    "👤",
  Delivery: "📦",
  Cab:      "🚕",
  Service:  "🔧",
  Other:    "🚶",
};
