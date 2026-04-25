import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n/i18nContext";
import { getConsent, setConsent } from "../lib/consent";

/**
 * One-time consent ask (LGPD/GDPR).
 *
 * Verbum's data philosophy: nothing about the user is collected unless
 * the user actively grants analytics. localStorage features (bookmarks,
 * notes, history) never leave the device and are not tracked. This
 * banner only asks about anonymous usage analytics (GA4) — the rest
 * is either local or operates under legitimate interest with PII off.
 */
export default function CookieBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getConsent() === null);
  }, []);

  if (!visible) return null;

  function decide(value: "granted" | "denied") {
    setConsent(value);
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label={t("consent.title")}
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 pointer-events-none"
    >
      <div
        className="mx-auto max-w-3xl pointer-events-auto rounded-lg border border-[var(--color-gold)]/40
                   bg-[var(--color-paper,#fafaf7)]/95 backdrop-blur-md shadow-2xl
                   p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3"
      >
        <div className="flex-1 text-sm leading-relaxed">
          <p className="text-[var(--color-ink)]">
            <strong className="text-[var(--color-gold)]">{t("consent.title")}</strong>{" "}
            {t("consent.body")}{" "}
            <Link
              to="/privacy"
              className="underline decoration-dotted hover:text-[var(--color-gold)]"
            >
              {t("consent.learnMore")}
            </Link>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => decide("denied")}
            className="text-xs px-3 py-2 rounded border border-[var(--color-ink)]/20
                       hover:bg-[var(--color-ink)]/5 transition"
          >
            {t("consent.deny")}
          </button>
          <button
            type="button"
            onClick={() => decide("granted")}
            className="text-xs px-3 py-2 rounded bg-[var(--color-gold)] text-white
                       hover:opacity-90 transition focus:outline-none
                       focus:ring-2 focus:ring-[var(--color-gold)]/50"
          >
            {t("consent.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
