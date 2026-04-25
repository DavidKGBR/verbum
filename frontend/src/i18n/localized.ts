/**
 * localized() — reads a localized field from a JSON object with EN fallback.
 *
 * Convention: domain-data JSONs (synoptic_parallels.json, devotional_plans.json,
 * explorer_presets.json, etc.) carry parallel fields per locale:
 *
 *   {
 *     "id": "baptism",
 *     "title": "Baptism of Jesus",       // EN, source of truth
 *     "title_pt": "Batismo de Jesus",    // PT
 *     "title_es": "Bautismo de Jesús",   // ES
 *     "description": "...",
 *     "description_pt": "...",
 *     "description_es": "..."
 *   }
 *
 * Calling `localized(obj, "pt", "title")` returns "Batismo de Jesus".
 * Calling `localized(obj, "fr", "title")` (or any locale without _fr suffix)
 * falls back to the base field ("Baptism of Jesus") so missing translations
 * never break the UI — they just degrade gracefully to English.
 *
 * For the `en` locale, the base field is returned directly (no `_en` suffix
 * convention; EN is the canonical source).
 *
 * For longer content (e.g. multi-paragraph narratives), prefer parallel files
 * (`semantic_genealogy_pt.json`) over inline `_pt` fields — see STYLE_GUIDE.
 */

import type { Locale } from "./i18nContext";

/** Accepts any object — interfaces and Record<string, unknown> alike. */
type AnyObject = object & { [key: string]: unknown };

function asRecord(obj: unknown): Record<string, unknown> | null {
  if (obj == null || typeof obj !== "object") return null;
  return obj as Record<string, unknown>;
}

export function localized(
  obj: AnyObject | object | null | undefined,
  locale: Locale,
  field: string,
): string {
  const rec = asRecord(obj);
  if (!rec) return "";
  if (locale === "en") {
    return (rec[field] as string | undefined) ?? "";
  }
  const localizedKey = `${field}_${locale}`;
  const value = rec[localizedKey] as string | undefined;
  if (value && value.trim() !== "") return value;
  // Fallback to base (EN) field
  return (rec[field] as string | undefined) ?? "";
}

/**
 * Localized array variant — useful when a field holds a list (e.g. tags, daily_themes).
 * Same fallback semantics: tries `${field}_${locale}` first, then `${field}`.
 */
export function localizedArray(
  obj: AnyObject | object | null | undefined,
  locale: Locale,
  field: string,
): string[] {
  const rec = asRecord(obj);
  if (!rec) return [];
  if (locale === "en") {
    const v = rec[field];
    return Array.isArray(v) ? (v as string[]) : [];
  }
  const localizedKey = `${field}_${locale}`;
  const value = rec[localizedKey];
  if (Array.isArray(value) && value.length > 0) return value as string[];
  const fallback = rec[field];
  return Array.isArray(fallback) ? (fallback as string[]) : [];
}
