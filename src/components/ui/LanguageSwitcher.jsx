/**
 * LanguageSwitcher.jsx
 * Compact three-locale pill shown in the app header.
 * Taps cycle through EN → HI → GU → EN, or each button selects directly.
 *
 * Usage:
 *   import { LanguageSwitcher } from "../components/ui/LanguageSwitcher";
 *   <LanguageSwitcher />
 */
import { useLanguage } from "../../context/LanguageContext";
import { C } from "../../constants/theme";

const LOCALE_ORDER = ["en", "hi", "gu"];

// Short display labels for the pill buttons
const SHORT = { en: "EN", hi: "हि", gu: "ગુ" };

export const LanguageSwitcher = ({ compact = true }) => {
  const { locale, setLocale } = useLanguage();

  if (compact) {
    // Minimal pill — cycles on tap, shows current locale
    const next = () => {
      const idx = LOCALE_ORDER.indexOf(locale);
      setLocale(LOCALE_ORDER[(idx + 1) % LOCALE_ORDER.length]);
    };

    return (
      <button
        onClick={next}
        title="Switch language"
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: C.teal + "15",
          border: `1.5px solid ${C.teal}40`,
          borderRadius: 20, padding: "4px 10px",
          fontSize: 11, fontWeight: 700,
          color: C.teal, cursor: "pointer",
          fontFamily: "Plus Jakarta Sans",
          transition: "all 0.15s",
          letterSpacing: "0.03em",
        }}
      >
        🌐 {SHORT[locale]}
      </button>
    );
  }

  // Full pill — 3 individual buttons
  return (
    <div style={{
      display: "inline-flex",
      background: C.gray100,
      borderRadius: 20, padding: 2, gap: 2,
    }}>
      {LOCALE_ORDER.map((loc) => {
        const active = locale === loc;
        return (
          <button
            key={loc}
            onClick={() => setLocale(loc)}
            style={{
              padding: "4px 11px", borderRadius: 18,
              border: "none",
              background: active ? C.teal : "transparent",
              color: active ? "#fff" : C.gray500,
              fontSize: 11, fontWeight: 700,
              cursor: "pointer", transition: "all 0.15s",
              fontFamily: "Plus Jakarta Sans",
            }}
          >
            {SHORT[loc]}
          </button>
        );
      })}
    </div>
  );
};