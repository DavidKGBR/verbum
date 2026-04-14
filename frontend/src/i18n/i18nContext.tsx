import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import en from "./en.json";
import pt from "./pt.json";
import es from "./es.json";

export type Locale = "en" | "pt" | "es";

const TRANSLATIONS: Record<Locale, Record<string, string>> = { en, pt, es };

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

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
    // Auto-detect from browser
    const lang = navigator.language.slice(0, 2).toLowerCase();
    if (lang === "pt") return "pt";
    if (lang === "es") return "es";
    return "en";
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
