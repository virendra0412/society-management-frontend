/**
 * LanguageContext.jsx
 * Provides:
 *   - locale       — current locale code ("en" | "hi" | "gu")
 *   - setLocale    — switch language (persists to localStorage)
 *   - t(key)       — translate a string key
 *
 * Wrap once at the top of main.jsx — both the society app and the SA portal
 * can consume it independently since SA strings are in English only.
 */
import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { LOCALE_STORAGE_KEY, DEFAULT_LOCALE, LOCALES, getTranslator } from "../i18n";

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [locale, setLocaleState] = useState(() => {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    return saved && LOCALES[saved] ? saved : DEFAULT_LOCALE;
  });

  const setLocale = useCallback((newLocale) => {
    if (!LOCALES[newLocale]) return;
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    setLocaleState(newLocale);
  }, []);

  // Memoize t() so components don't re-render unless locale actually changes
  const t = useMemo(() => getTranslator(locale), [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * useLanguage() — access full context (locale, setLocale, t)
 * useT()        — shorthand when you only need t()
 */
export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be inside <LanguageProvider>");
  return ctx;
};

export const useT = () => useLanguage().t;