/**
 * ConceptFlow — Visualização da jornada semântica de um conceito.
 *
 * Exibe o fluxo Hebrew → Greek com:
 * - Cartões de palavra (WordNode) para cada termo
 * - Conectores com tipo de ponte (LXX / teológico / equivalente)
 * - Narrativa explicativa
 * - Versículos-chave
 */

import { Link } from "react-router-dom";
import type { GenealogyConcept, GenealogyNode, GenealogyBridge } from "../../services/api";
import { useI18n, defaultTranslationFor } from "../../i18n/i18nContext";
import { localizeBookAbbrev, localizeBookName } from "../../i18n/bookNames";
import ConceptIcon from "./ConceptIcon";

// ── Color themes ──────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { border: string; bg: string; badge: string; dot: string; text: string }> = {
  rose:    { border: "border-rose-500/40",    bg: "bg-rose-500/5",    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300",    dot: "bg-rose-500",    text: "text-rose-700 dark:text-rose-300" },
  sky:     { border: "border-sky-500/40",     bg: "bg-sky-500/5",     badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300",       dot: "bg-sky-500",     text: "text-sky-700 dark:text-sky-300" },
  amber:   { border: "border-amber-500/40",   bg: "bg-amber-500/5",   badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300", dot: "bg-amber-500",   text: "text-amber-700 dark:text-amber-300" },
  violet:  { border: "border-violet-500/40",  bg: "bg-violet-500/5",  badge: "bg-violet-500/15 text-violet-700 dark:text-violet-300", dot: "bg-violet-500", text: "text-violet-700 dark:text-violet-300" },
  yellow:  { border: "border-yellow-500/40",  bg: "bg-yellow-500/5",  badge: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300", dot: "bg-yellow-500", text: "text-yellow-700 dark:text-yellow-300" },
  emerald: { border: "border-emerald-500/40", bg: "bg-emerald-500/5", badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300" },
  indigo:  { border: "border-indigo-500/40",  bg: "bg-indigo-500/5",  badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500",  text: "text-indigo-700 dark:text-indigo-300" },
  purple:  { border: "border-purple-500/40",  bg: "bg-purple-500/5",  badge: "bg-purple-500/15 text-purple-700 dark:text-purple-300", dot: "bg-purple-500",  text: "text-purple-700 dark:text-purple-300" },
  cyan:    { border: "border-cyan-500/40",    bg: "bg-cyan-500/5",    badge: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",     dot: "bg-cyan-500",    text: "text-cyan-700 dark:text-cyan-300" },
  orange:  { border: "border-orange-500/40",  bg: "bg-orange-500/5",  badge: "bg-orange-500/15 text-orange-700 dark:text-orange-300", dot: "bg-orange-500",  text: "text-orange-700 dark:text-orange-300" },
};

function getColors(color: string) {
  return COLOR_MAP[color] ?? COLOR_MAP["amber"];
}

// ── Bridge type style (label is i18n-driven inside the component) ────────

const BRIDGE_LABEL_KEYS: Record<GenealogyBridge["type"], string> = {
  lxx_translation:         "genealogy.bridge.lxx",
  theological_development: "genealogy.bridge.theological",
  semantic_equivalence:    "genealogy.bridge.equivalent",
  root_cognate:            "genealogy.bridge.cognate",
};

const BRIDGE_STYLE: Record<GenealogyBridge["type"], string> = {
  lxx_translation:        "border-dashed border-[var(--color-gold)]/60",
  theological_development: "border-solid border-purple-400/60",
  semantic_equivalence:   "border-dotted border-sky-400/60",
  root_cognate:           "border-solid border-emerald-400/60",
};

// ── Language metadata (font + direction only; labels via i18n) ───────────

const LANG_META: Record<"hebrew" | "greek", { font: string; dir: "rtl" | "ltr" }> = {
  hebrew: { font: "font-hebrew", dir: "rtl" },
  greek:  { font: "font-greek",  dir: "ltr" },
};

// ── WordNode card ─────────────────────────────────────────────────────────

function WordNode({ node, color }: { node: GenealogyNode; color: string }) {
  const { t, locale } = useI18n();
  const colors = getColors(color);
  const langMeta = LANG_META[node.language];
  const isHebrew = node.language === "hebrew";
  const langLabel = t(`genealogy.lang.${node.language}`);
  const testamentLabel = t(`genealogy.testament.${node.testament.toLowerCase()}`);

  return (
    <div
      className={[
        "flex flex-col gap-3 rounded-xl border p-4",
        "bg-[var(--color-surface)]",
        colors.border,
        colors.bg,
        "min-w-[200px] max-w-[240px]",
      ].join(" ")}
    >
      {/* Language badge */}
      <div className="flex items-center gap-1.5">
        <div className={["w-2 h-2 rounded-full shrink-0", colors.dot].join(" ")} />
        <span className={["text-[10px] font-semibold tracking-wide", colors.text].join(" ")}>
          {langLabel}
        </span>
        <span className="text-[9px] text-[var(--color-text-muted)]">
          ({testamentLabel})
        </span>
      </div>

      {/* Original script — large */}
      <div dir={langMeta.dir} className="flex flex-col items-center gap-1 py-2">
        <span
          className={[
            "text-4xl leading-none select-text",
            langMeta.font,
            isHebrew ? "tracking-widest" : "",
          ].join(" ")}
        >
          {node.word}
        </span>
        <span className="text-sm italic text-[var(--color-text-secondary)] tracking-wide">
          {node.transliteration}
        </span>
      </div>

      {/* Strong's ID + gloss */}
      <div className="flex flex-col gap-1">
        <Link
          to={`/word-study/${node.strongs_id}`}
          className={[
            "text-[10px] font-mono font-bold self-start px-1.5 py-0.5 rounded border",
            colors.badge,
            "hover:opacity-80 transition-opacity",
          ].join(" ")}
          title={t("genealogy.openStudy").replace("{strong}", node.strongs_id)}
        >
          {node.strongs_id}
        </Link>
        <p className="text-xs text-[var(--color-text-primary)] font-medium leading-snug">
          {node.gloss}
        </p>
      </div>

      {/* Occurrence stats */}
      {node.occurrence_count !== undefined && node.occurrence_count > 0 && (
        <div className="flex flex-col gap-1 border-t border-[var(--color-border)] pt-2">
          <span className="text-[10px] text-[var(--color-text-muted)]">
            {t("genealogy.occurrences").replace("{n}", node.occurrence_count.toLocaleString())}
          </span>
          {node.top_books && node.top_books.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {node.top_books.slice(0, 3).map((b) => (
                <span
                  key={b.book_id}
                  title={localizeBookName(b.book_id, locale, b.book_id)}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-surface-hover)]
                             text-[var(--color-text-muted)] cursor-help"
                >
                  {localizeBookAbbrev(b.book_id, locale).toUpperCase()} ({b.count})
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contextual note */}
      {node.note && (
        <p className="text-[10px] text-[var(--color-text-muted)] leading-snug border-t border-[var(--color-border)] pt-2 italic">
          {node.note}
        </p>
      )}
    </div>
  );
}

// ── Bridge connector ──────────────────────────────────────────────────────

function BridgeConnector({ bridge, color }: { bridge: GenealogyBridge; color: string }) {
  const { t } = useI18n();
  const colors = getColors(color);

  return (
    <div className="flex flex-col items-center gap-1 px-2 py-4 shrink-0 min-w-[100px] max-w-[120px]">
      {/* Type label */}
      <span className={["text-[10px] font-semibold", colors.text].join(" ")}>
        {t(BRIDGE_LABEL_KEYS[bridge.type])}
      </span>

      {/* Arrow line */}
      <div className="w-full flex items-center">
        <div className={["flex-1 border-t-2", BRIDGE_STYLE[bridge.type]].join(" ")} />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={colors.text}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </div>

      {/* Bridge note */}
      {bridge.note && (
        <p className="text-[9px] text-[var(--color-text-muted)] text-center leading-snug">
          {bridge.note}
        </p>
      )}
    </div>
  );
}

// ── Key verse chip ────────────────────────────────────────────────────────

function VerseChip({ verseRef, color }: { verseRef: string; color: string }) {
  const { t, locale } = useI18n();
  const colors = getColors(color);
  const parts = verseRef.split(".");
  const display =
    parts.length === 3
      ? `${localizeBookAbbrev(parts[0], locale).toUpperCase()} ${parts[1]}:${parts[2]}`
      : verseRef;
  const fullName = parts.length === 3 ? localizeBookName(parts[0], locale, parts[0]) : verseRef;
  const readerTo =
    parts.length === 3
      ? `/reader?book=${parts[0]}&chapter=${parts[1]}&verse=${parts[2]}&translation=${defaultTranslationFor(locale)}`
      : `/reader?book=${parts[0]}`;

  return (
    <Link
      to={readerTo}
      className={[
        "text-[10px] px-2 py-0.5 rounded-full border transition-opacity hover:opacity-70",
        colors.badge,
        colors.border,
      ].join(" ")}
      title={t("genealogy.openReader").replace("{ref}", `${fullName} ${parts[1]}:${parts[2]}`)}
    >
      {display}
    </Link>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  concept: GenealogyConcept;
}

export default function ConceptFlow({ concept }: Props) {
  const { t } = useI18n();
  const colors = getColors(concept.color);

  const hebrewNodes = concept.nodes.filter((n) => n.language === "hebrew");
  const greekNodes  = concept.nodes.filter((n) => n.language === "greek");

  // All key verses from all nodes, de-duplicated
  const allKeyVerses = [...new Set(concept.nodes.flatMap((n) => n.key_verses))];

  return (
    <div className="flex flex-col gap-8">

      {/* Flow diagram */}
      <div className="overflow-x-auto pb-2">
        <div className="flex flex-col gap-4 w-fit">
          {/* Column headers — same width constraints as content columns */}
          <div className="flex items-center gap-0">
            <div className="flex items-center gap-2 shrink-0 min-w-[200px] max-w-[240px]">
              <div className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
              <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                {t("genealogy.columnOt")}
              </span>
            </div>
            <div className="shrink-0 w-[140px]" />
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
              <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                {t("genealogy.columnNt")}
              </span>
            </div>
          </div>

          {/* Nodes + connectors — horizontal flow */}
          <div className="flex items-start gap-0">
            {/* Hebrew column */}
            <div className="flex flex-col gap-3 shrink-0">
              {hebrewNodes.map((node) => (
                <WordNode key={node.strongs_id} node={node} color={concept.color} />
              ))}
            </div>

            {/* Bridge area */}
            <div className="flex flex-col gap-3 shrink-0">
              {concept.bridges.map((bridge, i) => (
                <BridgeConnector key={i} bridge={bridge} color={concept.color} />
              ))}
            </div>

            {/* Greek column */}
            <div className="flex flex-col gap-3 shrink-0">
              {greekNodes.map((node) => (
                <WordNode key={node.strongs_id} node={node} color={concept.color} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Narrative */}
      <div
        className={[
          "rounded-xl border p-5 flex flex-col gap-2",
          colors.border,
          colors.bg,
        ].join(" ")}
      >
        <div className="flex items-center gap-2">
          <span className={colors.text}>
            <ConceptIcon id={concept.id} size={18} />
          </span>
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            {t("genealogy.narrativeTitle")}
          </span>
        </div>
        <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
          {concept.narrative}
        </p>
      </div>

      {/* Key verses */}
      {allKeyVerses.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            {t("genealogy.keyVerses")}
          </span>
          <div className="flex gap-2 flex-wrap">
            {allKeyVerses.map((vref) => (
              <VerseChip key={vref} verseRef={vref} color={concept.color} />
            ))}
          </div>
        </div>
      )}

      {/* Word study links */}
      <div className="flex gap-2 flex-wrap pt-1 border-t border-[var(--color-border)]">
        {concept.nodes.map((node) => (
          <Link
            key={node.strongs_id}
            to={`/word-study/${node.strongs_id}`}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                       border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]
                       transition-colors text-[var(--color-text-secondary)]"
          >
            <span className={["text-xs", LANG_META[node.language].font].join(" ")}>
              {node.word}
            </span>
            <span>({node.strongs_id})</span>
            <span>→ {t("genealogy.studyLink")}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
