/**
 * StructurePage — Catálogo de estruturas literárias da Bíblia.
 *
 * Exibe quiasmos, paralelismos e inclusões com visualização
 * em cascata via ChiasmDiagram.
 */

import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  fetchAllStructures,
  type LiteraryStructure,
} from "../services/api";
import ChiasmDiagram from "../components/structure/ChiasmDiagram";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useI18n } from "../i18n/i18nContext";
import { localizeBookName } from "../i18n/bookNames";
import { localized } from "../i18n/localized";

// ── Constants ─────────────────────────────────────────────────────────────

function typeLabel(type: LiteraryStructure["type"], t: (k: string) => string, plural = false): string {
  const key =
    type === "chiasm"
      ? plural ? "structure.typeChiasmPlural" : "structure.typeChiasm"
      : type === "parallelism"
        ? plural ? "structure.typeParallelismPlural" : "structure.typeParallelism"
        : plural ? "structure.typeInclusioPlural" : "structure.typeInclusio";
  return t(key);
}

const TYPE_COLORS: Record<LiteraryStructure["type"], string> = {
  chiasm:      "border-l-amber-500",
  parallelism: "border-l-emerald-500",
  inclusio:    "border-l-sky-500",
};

const TYPE_BADGE: Record<LiteraryStructure["type"], string> = {
  chiasm:      "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  parallelism: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  inclusio:    "bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

// ── Page ──────────────────────────────────────────────────────────────────

export default function StructurePage() {
  const { t, locale } = useI18n();
  const [structures, setStructures] = useState<LiteraryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [bookFilter, setBookFilter] = useState<string>("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchAllStructures()
      .then(setStructures)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Derive available books from loaded data
  const availableBooks = useMemo(
    () => [...new Set(structures.map((s) => s.book_id))].sort(),
    [structures]
  );

  const filtered = useMemo(() => {
    let list = structures;
    if (typeFilter) list = list.filter((s) => s.type === typeFilter);
    if (bookFilter) list = list.filter((s) => s.book_id === bookFilter);
    return list;
  }, [structures, typeFilter, bookFilter]);

  const typeCounts = useMemo(
    () =>
      Object.fromEntries(
        (["chiasm", "parallelism", "inclusio"] as const).map((tt) => [
          tt,
          structures.filter((s) => s.type === tt).length,
        ])
      ),
    [structures]
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {t("structure.title")}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] max-w-xl leading-relaxed">
          {t("structure.subtitle")}
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 flex-wrap">
        {(["chiasm", "parallelism", "inclusio"] as const).map((tt) => (
          <div key={tt} className="flex items-center gap-1.5">
            <div
              className={[
                "w-2.5 h-2.5 rounded-full",
                tt === "chiasm" ? "bg-amber-500" : tt === "parallelism" ? "bg-emerald-500" : "bg-sky-500",
              ].join(" ")}
            />
            <span className="text-xs text-[var(--color-text-muted)]">
              {typeCounts[tt]} {typeLabel(tt, t, typeCounts[tt] !== 1)}
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Type filter pills */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter("")}
            className={[
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              !typeFilter
                ? "bg-[var(--color-gold)] text-white"
                : "bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]",
            ].join(" ")}
          >
            {t("structure.filterAll").replace("{n}", String(structures.length))}
          </button>
          {(["chiasm", "parallelism", "inclusio"] as const).map((tt) => (
            <button
              key={tt}
              onClick={() => setTypeFilter(typeFilter === tt ? "" : tt)}
              className={[
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                typeFilter === tt
                  ? "bg-[var(--color-gold)] text-white"
                  : "bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]",
              ].join(" ")}
            >
              {typeLabel(tt, t)} ({typeCounts[tt]})
            </button>
          ))}
        </div>

        {/* Book filter */}
        <select
          value={bookFilter}
          onChange={(e) => setBookFilter(e.target.value)}
          className="text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]
                     text-[var(--color-text-primary)] px-3 py-1.5 focus:outline-none
                     focus:ring-1 focus:ring-[var(--color-gold)]/60 sm:ml-auto"
        >
          <option value="">{t("structure.allBooks")}</option>
          {availableBooks.map((b) => (
            <option key={b} value={b}>
              {localizeBookName(b, locale, b)}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner text={t("structure.loading")} />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">
          {t("structure.noResults")}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((s) => {
            const isOpen = expanded === s.structure_id;
            return (
              <div
                key={s.structure_id}
                className={[
                  "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]",
                  "overflow-hidden border-l-4 transition-shadow",
                  TYPE_COLORS[s.type],
                  isOpen ? "shadow-md" : "hover:shadow-sm",
                ].join(" ")}
              >
                {/* Card header */}
                <button
                  onClick={() =>
                    setExpanded(isOpen ? null : s.structure_id)
                  }
                  className="w-full text-left px-5 py-4 hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <h3 className="font-semibold text-[var(--color-text-primary)] text-sm leading-snug">
                        {localized(s, locale, "title")}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={[
                            "text-[10px] font-medium px-2 py-0.5 rounded-full",
                            TYPE_BADGE[s.type],
                          ].join(" ")}
                        >
                          {typeLabel(s.type, t)}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          {localizeBookName(s.book_id, locale, s.book_id)}
                          {" "}
                          {s.chapter_start === s.chapter_end
                            ? s.chapter_start
                            : `${s.chapter_start}–${s.chapter_end}`}
                        </span>
                        {s.confidence !== undefined && (
                          <span className="text-[10px] text-[var(--color-text-muted)]">
                            {t("structure.confidence").replace("{n}", (s.confidence * 100).toFixed(0))}
                          </span>
                        )}
                        {s.elements && (
                          <span className="text-[10px] text-[var(--color-text-muted)]">
                            {t("structure.elements").replace("{n}", String(s.elements.length))}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[var(--color-text-muted)] shrink-0 mt-0.5">
                      {isOpen ? "▾" : "▸"}
                    </span>
                  </div>
                </button>

                {/* Expanded: ChiasmDiagram */}
                {isOpen && (
                  <div className="border-t border-[var(--color-border)] px-5 py-5">
                    <ChiasmDiagram structure={s} showTextPreview={false} />

                    {/* Reader link */}
                    {s.chapter_start === s.chapter_end && (
                      <div className="mt-5 pt-4 border-t border-[var(--color-border)]">
                        <Link
                          to={`/reader?book=${s.book_id}&chapter=${s.chapter_start}&mode=structural`}
                          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                                     border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]
                                     transition-colors text-[var(--color-text-secondary)]"
                        >
                          <span>{t("structure.openStructural")}</span>
                          <span>→</span>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <p className="text-[11px] text-[var(--color-text-muted)] italic text-center pt-2">
        {t("structure.footerNote")}
      </p>
    </div>
  );
}
