/**
 * GenealogyPage — Genealogia Semântica do Verbum.
 *
 * /genealogy           → catálogo de conceitos (grid de cards)
 * /genealogy/:id       → jornada completa de um conceito
 *
 * Rastreia a viagem de conceitos-chave do hebraico ao grego —
 * chesed → eleos/agapē, ruach → pneuma, mashiach → Christos, etc.
 */

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchGenealogyConcepts,
  fetchGenealogyConcept,
  type GenealogyConceptSummary,
  type GenealogyConcept,
} from "../services/api";
import ConceptFlow from "../components/genealogy/ConceptFlow";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useI18n } from "../i18n/i18nContext";

// ── Color dot map ─────────────────────────────────────────────────────────

const COLOR_DOT: Record<string, string> = {
  rose:    "bg-rose-500",
  sky:     "bg-sky-500",
  amber:   "bg-amber-500",
  violet:  "bg-violet-500",
  yellow:  "bg-yellow-500",
  emerald: "bg-emerald-500",
  indigo:  "bg-indigo-500",
  purple:  "bg-purple-500",
  cyan:    "bg-cyan-500",
  orange:  "bg-orange-500",
};

const COLOR_BORDER: Record<string, string> = {
  rose:    "border-rose-500/30 hover:border-rose-500/60",
  sky:     "border-sky-500/30 hover:border-sky-500/60",
  amber:   "border-amber-500/30 hover:border-amber-500/60",
  violet:  "border-violet-500/30 hover:border-violet-500/60",
  yellow:  "border-yellow-500/30 hover:border-yellow-500/60",
  emerald: "border-emerald-500/30 hover:border-emerald-500/60",
  indigo:  "border-indigo-500/30 hover:border-indigo-500/60",
  purple:  "border-purple-500/30 hover:border-purple-500/60",
  cyan:    "border-cyan-500/30 hover:border-cyan-500/60",
  orange:  "border-orange-500/30 hover:border-orange-500/60",
};

const COLOR_BG: Record<string, string> = {
  rose:    "hover:bg-rose-500/5",
  sky:     "hover:bg-sky-500/5",
  amber:   "hover:bg-amber-500/5",
  violet:  "hover:bg-violet-500/5",
  yellow:  "hover:bg-yellow-500/5",
  emerald: "hover:bg-emerald-500/5",
  indigo:  "hover:bg-indigo-500/5",
  purple:  "hover:bg-purple-500/5",
  cyan:    "hover:bg-cyan-500/5",
  orange:  "hover:bg-orange-500/5",
};

// ── Catalog Page ──────────────────────────────────────────────────────────

function CatalogPage() {
  const { t, locale } = useI18n();
  const [concepts, setConcepts] = useState<GenealogyConceptSummary[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetchGenealogyConcepts(locale)
      .then(setConcepts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [locale]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {t("genealogy.title")}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] max-w-2xl leading-relaxed">
          {t("genealogy.subtitle")}
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        <span className="text-xs px-3 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
          {t("genealogy.stats.concepts").replace("{n}", String(concepts.length))}
        </span>
        <span className="text-xs px-3 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
          {t("genealogy.stats.route")}
        </span>
        <span className="text-xs px-3 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
          {t("genealogy.stats.testaments")}
        </span>
      </div>

      {/* Concept grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {concepts.map((c) => (
          <Link
            key={c.id}
            to={`/genealogy/${c.id}`}
            className={[
              "group flex flex-col gap-3 rounded-xl border p-5 transition-all",
              "bg-[var(--color-surface)]",
              COLOR_BORDER[c.color] ?? "border-[var(--color-border)] hover:border-[var(--color-gold)]/40",
              COLOR_BG[c.color] ?? "",
              "hover:shadow-md",
            ].join(" ")}
          >
            {/* Icon + concept name */}
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none shrink-0 mt-0.5">{c.icon}</span>
              <div className="flex flex-col gap-0.5">
                <h2 className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-gold-dark)] transition-colors">
                  {c.concept}
                </h2>
                <span className="text-xs text-[var(--color-text-muted)] italic">
                  {c.concept_en}
                </span>
              </div>
            </div>

            {/* Tagline */}
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
              {c.tagline}
            </p>

            {/* Strongs IDs */}
            <div className="flex gap-1.5 flex-wrap items-center">
              <div className={["w-2 h-2 rounded-full shrink-0", COLOR_DOT[c.color] ?? "bg-[var(--color-gold)]"].join(" ")} />
              {c.strongs_ids.map((sid) => (
                <span
                  key={sid}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-hover)]
                             text-[var(--color-text-muted)] border border-[var(--color-border)]"
                >
                  {sid}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-[11px] text-[var(--color-text-muted)] italic text-center pt-2">
        {t("genealogy.footerNote")}
      </p>
    </div>
  );
}

// ── Detail Page ───────────────────────────────────────────────────────────

function DetailPage({ conceptId }: { conceptId: string }) {
  const { t, locale } = useI18n();
  const [concept, setConcept] = useState<GenealogyConcept | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchGenealogyConcept(conceptId, locale)
      .then(setConcept)
      .catch((e) => setError(e.message ?? t("genealogy.loadError")))
      .finally(() => setLoading(false));
  }, [conceptId, locale, t]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="text-xs text-[var(--color-text-muted)] flex gap-1 items-center">
        <Link
          to="/genealogy"
          className="hover:text-[var(--color-gold-dark)] transition-colors"
        >
          {t("genealogy.breadcrumb")}
        </Link>
        <span>›</span>
        <span>{concept?.concept ?? conceptId}</span>
      </nav>

      {/* Header */}
      {concept && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">{concept.icon}</span>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                {concept.concept}
              </h1>
              <p className="text-sm text-[var(--color-text-muted)] italic">
                {concept.concept_en}
              </p>
            </div>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-xl mt-1">
            {concept.tagline}
          </p>
        </div>
      )}

      {/* Content */}
      {loading && <LoadingSpinner />}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && concept && (
        <ConceptFlow concept={concept} />
      )}
    </div>
  );
}

// ── Router entry point ────────────────────────────────────────────────────

export default function GenealogyPage() {
  const { conceptId } = useParams<{ conceptId?: string }>();
  return conceptId ? (
    <DetailPage conceptId={conceptId} />
  ) : (
    <CatalogPage />
  );
}
