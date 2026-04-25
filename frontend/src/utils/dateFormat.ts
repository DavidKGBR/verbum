/**
 * Date formatting helpers shared across the app.
 *
 * Centralises the patterns that were duplicated in NotesPage, BookmarksPage,
 * NoteEditor, and notesExport. Uses the browser locale by default so PT-BR
 * users see "13 de abr. de 2026" naturally.
 */

export function formatDate(ts: number, locale?: string): string {
  try {
    return new Date(ts).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 0) return "in the future";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(ts);
}

/**
 * Return a YYYY-MM-DD string anchored to the **local** timezone. Used for
 * comparing calendar days (streak math) without tripping over UTC drift.
 */
export function localDateKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Difference in calendar days (local TZ) between two YYYY-MM-DD keys.
 * Returns a positive integer when `later` is strictly after `earlier`,
 * 0 when they are the same day, negative otherwise.
 */
export function daysBetween(earlier: string, later: string): number {
  const [y1, m1, d1] = earlier.split("-").map(Number);
  const [y2, m2, d2] = later.split("-").map(Number);
  const MS_PER_DAY = 86_400_000;
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / MS_PER_DAY);
}
