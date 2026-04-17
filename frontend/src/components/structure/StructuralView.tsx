/**
 * StructuralView — Modo de leitura estrutural.
 *
 * Exibido quando o usuário seleciona o modo "Estrutural" no Reader.
 * Busca as estruturas literárias do capítulo atual e as exibe com
 * textos dos versículos anotados com seus elementos estruturais.
 *
 * Se o capítulo não tem estruturas conhecidas: mensagem amigável.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchChapterStructures,
  type LiteraryStructure,
  type StructureElement,
} from "../../services/api";
import ChiasmDiagram from "./ChiasmDiagram";
import LoadingSpinner from "../common/LoadingSpinner";
import { useI18n } from "../../i18n/i18nContext";
import { useBooks } from "../../i18n/bookNames";
import { recordPlanAutoMark } from "../../hooks/useReadingPlans";

interface Props {
  book: string;
  chapter: number;
  translation?: string;
}

// ── Verse-to-element mapping ───────────────────────────────────────────────

interface VerseAnnotation {
  verseNum: number;
  elements: { structure: LiteraryStructure; element: StructureElement; depth: number }[];
}

function buildVerseAnnotations(
  structures: LiteraryStructure[]
): Map<number, VerseAnnotation["elements"]> {
  const map = new Map<number, VerseAnnotation["elements"]>();

  for (const structure of structures) {
    const elements = structure.elements ?? [];
    const centerIdx = Math.floor(elements.length / 2);

    elements.forEach((elem, i) => {
      const depth =
        structure.type === "chiasm"
          ? Math.abs(i - centerIdx)
          : i % 5; // for parallelism just cycle colors

      for (let v = elem.verse_start; v <= elem.verse_end; v++) {
        if (!map.has(v)) map.set(v, []);
        map.get(v)!.push({ structure, element: elem, depth });
      }
    });
  }

  return map;
}

// ── Depth color palette ────────────────────────────────────────────────────
const BADGE_COLORS = [
  "bg-[var(--color-gold)]/20 text-[var(--color-gold-dark)] border-[var(--color-gold)]/40",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
];

const LEFT_BORDER_COLORS = [
  "border-l-[var(--color-gold)]",
  "border-l-sky-400",
  "border-l-purple-400",
  "border-l-emerald-400",
  "border-l-rose-400",
];

// ── AnnotatedVerse ─────────────────────────────────────────────────────────

function AnnotatedVerse({
  verseNum,
  annotations,
}: {
  verseNum: number;
  annotations: VerseAnnotation["elements"];
}) {
  const primary = annotations[0];
  const isCenter =
    primary.structure.type === "chiasm" &&
    primary.element.label === "CENTER";
  const depth = primary.depth;
  const borderColor =
    LEFT_BORDER_COLORS[Math.min(depth, LEFT_BORDER_COLORS.length - 1)];

  // Indent is inverted for chiasm (center is deepest)
  const chiasmsCount = annotations.filter(
    (a) => a.structure.type === "chiasm"
  ).length;
  const maxDepth =
    Math.floor((primary.structure.elements?.length ?? 1) / 2);
  const indentPx =
    primary.structure.type === "chiasm"
      ? (maxDepth - depth) * 20
      : 0;

  return (
    <div
      className="flex items-start gap-3 py-1"
      style={{ paddingLeft: `${indentPx}px` }}
    >
      {/* Verse number */}
      <span className="text-xs font-mono text-[var(--color-text-muted)] shrink-0 w-8 pt-1.5 text-right">
        {verseNum}
      </span>

      {/* Verse content */}
      <div
        className={[
          "flex-1 border-l-2 pl-3 py-1.5 rounded-r-lg",
          borderColor,
          isCenter ? "ring-1 ring-[var(--color-gold)]/30 bg-[var(--color-gold)]/5" : "",
        ].join(" ")}
      >
        {/* Element badges */}
        <div className="flex gap-1 flex-wrap mb-1.5">
          {annotations.map(({ element, depth: d }, ai) => {
            const bc = BADGE_COLORS[Math.min(d, BADGE_COLORS.length - 1)];
            const isC =
              element.label === "CENTER" ||
              (primary.structure.type === "chiasm" && element === primary.element && isCenter);
            return (
              <span
                key={ai}
                className={[
                  "text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border",
                  bc,
                ].join(" ")}
                title={element.summary}
              >
                {isC && "★ "}{element.label}
              </span>
            );
          })}
        </div>

        {/* Summary from element */}
        <p className="text-[11px] text-[var(--color-text-muted)] italic leading-snug">
          {primary.element.summary}
        </p>

        {/* Text preview if available */}
        {primary.element.text_preview && (
          <p className="text-sm text-[var(--color-text-primary)] leading-relaxed mt-1">
            {primary.element.text_preview}
          </p>
        )}

        {chiasmsCount > 1 && (
          <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">
            +{chiasmsCount - 1} estrutura(s) adicional(is)
          </p>
        )}
      </div>
    </div>
  );
}

// ── NoStructure placeholder ────────────────────────────────────────────────
// Curated examples that ALWAYS have a mapped structure — mirror the entries
// in data/static/literary_structures.json. Used in the empty-state quicklinks.
const EMPTY_STATE_EXAMPLES = [
  { book: "GEN", chapter: 1,  titleKey: "reader.structural.example.gen1.title",  kindKey: "reader.structural.example.gen1.kind"  },
  { book: "PSA", chapter: 23, titleKey: "reader.structural.example.psa23.title", kindKey: "reader.structural.example.psa23.kind" },
  { book: "PHP", chapter: 2,  titleKey: "reader.structural.example.php2.title",  kindKey: "reader.structural.example.php2.kind"  },
  { book: "MAT", chapter: 6,  titleKey: "reader.structural.example.mat6.title",  kindKey: "reader.structural.example.mat6.kind"  },
] as const;

function NoStructurePlaceholder({ book, chapter }: { book: string; chapter: number }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-5 py-12 text-center max-w-xl mx-auto">
      <div className="text-4xl opacity-30">𓂀</div>
      <div className="flex flex-col gap-2">
        <h3 className="font-display font-semibold text-lg text-[var(--color-ink)]">
          {t("reader.structural.empty.title")}
        </h3>
        <p className="text-sm leading-relaxed opacity-70 max-w-md mx-auto">
          {t("reader.structural.empty.whatIsIt")}
        </p>
        <p className="text-[13px] leading-relaxed opacity-60 mt-3 max-w-md mx-auto">
          {t("reader.structural.empty.context")
            .replace("{book}", book)
            .replace("{chapter}", String(chapter))}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-md">
        {EMPTY_STATE_EXAMPLES.map((ex) => (
          <Link
            key={`${ex.book}-${ex.chapter}`}
            to={`/reader?mode=structural&book=${ex.book}&chapter=${ex.chapter}`}
            className="flex flex-col gap-0.5 text-left px-4 py-3 rounded-lg border
                       border-[var(--color-gold)]/20 bg-white
                       hover:border-[var(--color-gold)] hover:bg-[var(--color-gold)]/5
                       transition group"
          >
            <span className="font-display font-bold text-sm text-[var(--color-ink)]
                             group-hover:text-[var(--color-gold-dark)] transition">
              {t(ex.titleKey)}
            </span>
            <span className="text-[11px] opacity-50">
              {ex.book} {ex.chapter} · {t(ex.kindKey)}
            </span>
          </Link>
        ))}
      </div>

      <Link
        to="/structure"
        className="text-xs mt-2 text-[var(--color-gold-dark)] hover:text-[var(--color-gold)]
                   font-bold hover:underline transition"
      >
        {t("reader.structural.empty.viewAll")} →
      </Link>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function StructuralView({ book, chapter, translation = "kjv" }: Props) {
  const [structures, setStructures] = useState<LiteraryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const books = useBooks(translation);

  useEffect(() => {
    setLoading(true);
    fetchChapterStructures(book, chapter, translation)
      .then((s) => {
        setStructures(s);
        // Auto-expand if only one structure
        if (s.length === 1) setExpanded(s[0].structure_id);
        // Structural study of a chapter is still reading the chapter —
        // count it toward the active plan even when the page shows no
        // mapped structure (empty state is an educational detour that
        // still implies the user considered this chapter).
        recordPlanAutoMark(`${book}.${chapter}`, books);
      })
      .catch(() => setStructures([]))
      .finally(() => setLoading(false));
  }, [book, chapter, translation, books]);

  if (loading) return <LoadingSpinner />;
  if (structures.length === 0) return <NoStructurePlaceholder book={book} chapter={chapter} />;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Estrutura Literária
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-gold)]/15
                           text-[var(--color-gold-dark)] font-medium">
            {structures.length} padrão{structures.length > 1 ? "s" : ""}
          </span>
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          {book} {chapter} — geometria literária oculta revelada
        </p>
      </div>

      {/* Structure cards */}
      {structures.map((s) => {
        const isOpen = expanded === s.structure_id;
        const verseMap = isOpen ? buildVerseAnnotations([s]) : new Map();
        const verseNums = isOpen
          ? [...verseMap.keys()].sort((a, b) => a - b)
          : [];

        return (
          <div
            key={s.structure_id}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden"
          >
            {/* Card header */}
            <button
              onClick={() => setExpanded(isOpen ? null : s.structure_id)}
              className="w-full text-left px-5 py-4 hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-sm text-[var(--color-text-primary)]">
                    {s.title}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {s.chapter_start === s.chapter_end
                      ? `Cap. ${s.chapter_start}`
                      : `Cap. ${s.chapter_start}–${s.chapter_end}`}
                    {" · "}{s.elements?.length ?? 0} elementos
                  </span>
                </div>
                <span className="text-[var(--color-text-muted)] text-sm shrink-0 mt-0.5">
                  {isOpen ? "▾" : "▸"}
                </span>
              </div>
            </button>

            {/* Expanded: diagram + verse annotations */}
            {isOpen && (
              <div className="border-t border-[var(--color-border)] px-5 py-5 flex flex-col gap-6">
                {/* Chiasm diagram */}
                <ChiasmDiagram structure={s} showTextPreview={false} />

                {/* Verse-by-verse cascade */}
                {verseNums.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wide
                                   text-[var(--color-text-muted)] mb-2">
                      Versículos anotados
                    </h4>
                    {verseNums.map((vnum) => (
                      <AnnotatedVerse
                        key={vnum}
                        verseNum={vnum}
                        annotations={verseMap.get(vnum)!}
                      />
                    ))}
                  </div>
                )}

                {/* Link to full reader */}
                <div className="flex gap-2 pt-2 border-t border-[var(--color-border)]">
                  <Link
                    to={`/reader?book=${book}&chapter=${chapter}`}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)]
                               hover:bg-[var(--color-surface-hover)] transition-colors
                               text-[var(--color-text-secondary)]"
                  >
                    Ler texto completo →
                  </Link>
                  <Link
                    to="/structure"
                    className="text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)]
                               hover:bg-[var(--color-surface-hover)] transition-colors
                               text-[var(--color-text-secondary)]"
                  >
                    Catálogo de estruturas →
                  </Link>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
