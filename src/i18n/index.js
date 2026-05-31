/**
 * i18n/index.js
 * Locale registry + fallback-safe translator factory.
 *
 * Usage:
 *   import { LOCALES, getTranslator } from "../i18n";
 *   const t = getTranslator("hi");
 *   t("login_title")  // → "वापस स्वागत है"
 */
import en from "./en";
import hi from "./hi";
import gu from "./gu";

export const LOCALES = {
  en: { label: "English",    nativeLabel: "English",     strings: en },
  hi: { label: "Hindi",      nativeLabel: "हिंदी",        strings: hi },
  gu: { label: "Gujarati",   nativeLabel: "ગુજરાતી",      strings: gu },
};

export const DEFAULT_LOCALE = "en";
export const LOCALE_STORAGE_KEY = "society_locale";

/**
 * Returns a t(key) function for the given locale.
 * Falls back to English if the key is missing in the chosen locale.
 */
export const getTranslator = (locale = DEFAULT_LOCALE) => {
  const strings = LOCALES[locale]?.strings ?? en;
  return (key, fallback) => strings[key] ?? en[key] ?? fallback ?? key;
};