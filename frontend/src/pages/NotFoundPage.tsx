import { Link } from "react-router-dom";
import { useI18n } from "../i18n/i18nContext";

export default function NotFoundPage() {
  const { t, locale } = useI18n();

  // A short verse-as-easter-egg fits the project's tone: 404 = lost,
  // and the prodigal-son context is gently fitting without being preachy.
  const verseRef =
    locale === "pt" ? "Lucas 15:32"
    : locale === "es" ? "Lucas 15:32"
    : "Luke 15:32";
  const verseText =
    locale === "pt"
      ? "\"Este teu irmão estava perdido e foi achado.\""
      : locale === "es"
      ? "\"Tu hermano estaba perdido y ha sido hallado.\""
      : "\"This thy brother was lost, and is found.\"";

  return (
    <article className="max-w-2xl mx-auto px-4 py-16 text-center text-[var(--color-ink)]">
      <p className="text-7xl font-bold text-[var(--color-gold)] mb-2">404</p>
      <h1 className="text-2xl font-bold mb-4">{t("notFound.title")}</h1>
      <p className="opacity-70 mb-8 leading-relaxed">{t("notFound.body")}</p>

      <blockquote className="italic opacity-60 mb-10">
        {verseText}
        <br />
        <span className="text-xs not-italic">— {verseRef}</span>
      </blockquote>

      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          to="/"
          className="px-4 py-2 rounded bg-[var(--color-gold)] text-white hover:opacity-90 transition"
        >
          {t("notFound.home")}
        </Link>
        <Link
          to="/reader?book=JHN&chapter=1"
          className="px-4 py-2 rounded border border-[var(--color-gold)]/50 hover:bg-[var(--color-gold)]/10 transition"
        >
          {t("notFound.reader")}
        </Link>
      </div>
    </article>
  );
}
