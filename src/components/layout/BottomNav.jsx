import { C, NAV_ITEMS, NAV_ITEMS_ADMIN } from "../../constants/theme";

export const BottomNav = ({ activeTab, onTabChange, isAdmin }) => {
  const items = isAdmin ? NAV_ITEMS_ADMIN : NAV_ITEMS;

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480,
      background: "rgba(255,255,255,0.97)",
      backdropFilter: "blur(12px)",
      borderTop: `1px solid ${C.gray100}`,
      display: "flex", zIndex: 40,
      paddingBottom: "env(safe-area-inset-bottom, 0)",
    }}>
      {items.map((n) => {
        const active = activeTab === n.id;
        return (
          <button
            key={n.id}
            onClick={() => onTabChange(n.id)}
            style={{
              flex: 1, background: "none", border: "none",
              padding: "8px 4px 10px", cursor: "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 2,
              transition: "all 0.15s", position: "relative",
            }}
          >
            <span style={{
              fontSize: active ? 22 : 20,
              filter: active ? "none" : "grayscale(0.6) opacity(0.5)",
              transform: active ? "scale(1.1)" : "scale(1)",
              transition: "all 0.15s",
            }}>
              {n.icon}
            </span>
            <span style={{
              fontSize: 10, fontWeight: active ? 700 : 500,
              color: active ? C.teal : C.gray500,
              fontFamily: "Plus Jakarta Sans",
              transition: "color 0.15s",
            }}>
              {n.label}
            </span>
            {active && (
              <span style={{
                width: 4, height: 4, borderRadius: "50%",
                background: C.teal,
                position: "absolute", bottom: 6,
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
};
