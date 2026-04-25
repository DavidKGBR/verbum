/**
 * LGPD/GDPR-style consent state.
 *
 * Verbum collects nothing about the user beyond what the user actively
 * does (bookmarks/notes/history live in localStorage and never leave
 * the device). The only surface that warrants consent is GA4 — Sentry
 * is configured with send_default_pii=false and operates under
 * legitimate interest for service operability.
 *
 * Three states:
 *   "granted"  — analytics may run
 *   "denied"   — analytics MUST NOT run
 *   null       — user hasn't decided yet (show the banner)
 */
export type ConsentStatus = "granted" | "denied";

const KEY = "verbum-consent";

export function getConsent(): ConsentStatus | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === "granted" || raw === "denied") return raw;
  } catch {
    /* localStorage blocked → default to undecided so the banner asks */
  }
  return null;
}

export function setConsent(value: ConsentStatus): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* Storage blocked — best effort. */
  }
  // Notify other tabs / listeners so the banner can hide and analytics
  // can boot without a page reload.
  window.dispatchEvent(new CustomEvent("verbum:consent", { detail: value }));
}

/** Subscribe to consent changes (for components that need to react). */
export function onConsentChange(cb: (s: ConsentStatus) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<ConsentStatus>).detail;
    if (detail === "granted" || detail === "denied") cb(detail);
  };
  window.addEventListener("verbum:consent", handler);
  return () => window.removeEventListener("verbum:consent", handler);
}
