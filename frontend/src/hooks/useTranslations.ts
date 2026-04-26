import { useEffect, useState } from "react";
import { fetchTranslationStats, type TranslationStat } from "../services/api";

/**
 * Dynamic translation discovery — fetches available translations from the API
 * once, caches in memory + localStorage so every component shares one source
 * of truth. No more hardcoded TRANSLATIONS arrays.
 */

const CACHE_KEY = "verbum-translations";
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

interface CachedData {
  translations: TranslationStat[];
  ts: number;
}

// Module-level singleton so multiple hook consumers don't re-fetch
let _promise: Promise<TranslationStat[]> | null = null;

function loadFromCache(): TranslationStat[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedData = JSON.parse(raw);
    if (Date.now() - cached.ts > CACHE_TTL) return null;
    return cached.translations;
  } catch {
    return null;
  }
}

function saveToCache(translations: TranslationStat[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ translations, ts: Date.now() }));
  } catch {
    // localStorage full — ignore
  }
}

function doFetch(): Promise<TranslationStat[]> {
  if (!_promise) {
    const cached = loadFromCache();
    if (cached) {
      _promise = Promise.resolve(cached);
    } else {
      _promise = fetchTranslationStats()
        .then((d) => {
          saveToCache(d.translations);
          return d.translations;
        })
        .catch(() => {
          _promise = null; // allow retry on next call
          return [];
        });
    }
  }
  return _promise;
}

/** All translation metadata from the API. */
export function useTranslations() {
  const [translations, setTranslations] = useState<TranslationStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    doFetch()
      .then(setTranslations)
      .finally(() => setLoading(false));
  }, []);

  return { translations, loading };
}

/** Just the translation IDs, sorted. Good for dropdown selectors. */
export function useTranslationIds(): string[] {
  const { translations } = useTranslations();
  return translations.map((t) => t.translation_id).sort();
}

/** Map of translation_id → language code (e.g., "kjv" → "en"). */
export function useTranslationLanguages(): Record<string, string> {
  const { translations } = useTranslations();
  const map: Record<string, string> = {};
  for (const t of translations) {
    map[t.translation_id] = t.language;
  }
  return map;
}

/** Comma-separated list of all translation IDs — for API calls. */
export function useTranslationIdsCsv(): string {
  const ids = useTranslationIds();
  return ids.join(",");
}

/**
 * Language labels for display. Derived from API data, no hardcoding.
 */
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  "pt-br": "Português (Brasil)",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  ar: "العربية",
  zh: "中文",
};

export function getLanguageName(langCode: string): string {
  return LANGUAGE_NAMES[langCode] ?? langCode;
}
