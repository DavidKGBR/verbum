import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import en from "./en.json";
import pt from "./pt.json";
import es from "./es.json";

export type Locale = "en" | "pt" | "es";

const TRANSLATIONS: Record<Locale, Record<string, string>> = { en, pt, es };

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
  { code: "es", label: "Español" },
];

/**
 * Preferred Bible translation per UI locale. Used as the default on mount
 * and whenever the user switches languages — so reading in PT starts on
 * NVI, in ES on RVR, in EN on KJV. Users can always override via the
 * per-reader translation dropdown; the change is session-local.
 */
export const LOCALE_DEFAULT_TRANSLATION: Record<Locale, string> = {
  en: "kjv",
  pt: "nvi",
  es: "rvr",
};

export function defaultTranslationFor(locale: Locale): string {
  return LOCALE_DEFAULT_TRANSLATION[locale];
}

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

const STORAGE_KEY = "verbum-locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (saved === "en" || saved === "pt" || saved === "es")) {
      return saved as Locale;
    }
    // Auto-detect from browser. Verbum is a Brazilian-first product, so
    // any language we can't confidently map to EN or ES falls back to PT.
    const lang = navigator.language.slice(0, 2).toLowerCase();
    if (lang === "pt") return "pt";
    if (lang === "es") return "es";
    if (lang === "en") return "en";
    return "pt";
  });

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (key: string): string => {
    return TRANSLATIONS[locale]?.[key] ?? TRANSLATIONS.en[key] ?? key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
