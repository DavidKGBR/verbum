/**
 * ChiasmDiagram — Visualização em cascata de estruturas literárias.
 *
 * Para quiasmos (A-B-C-B'-A'): layout em escada descendente até o centro,
 * depois ascendente — o centro é o ponto mais recuado e realçado em dourado.
 *
 * Para paralelismos e inclusio: lista plana com cores por posição.
 */

import type { LiteraryStructure, StructureElement } from "../../services/api";

interface Props {
  structure: LiteraryStructure;
  /** Mostra text_preview se disponível (retorno do endpoint /structure/{book}/{chapter}) */
  showTextPreview?: boolean;
}

// ── Palette por profundidade de quiasmo ────────────────────────────────────
// Índice 0 = centro (mais recuado), 1 = próximo nível, etc.
const DEPTH_COLORS: { badge: string; bar: string; dot: string }[] = [
  {
    badge: "bg-[var(--color-gold)]/20 text-[var(--color-gold-dark)] border-[var(--color-gold)]/40",
    bar:   "border-l-[var(--color-gold)] bg-[var(--color-gold)]/5",
    dot:   "bg-[var(--color-gold)]",
  },
  {
    badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    bar:   "border-l-sky-400 bg-sky-500/5",
    dot:   "bg-sky-500",
  },
  {
    badge: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    bar:   "border-l-purple-400 bg-purple-500/5",
    dot:   "bg-purple-500",
  },
  {
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    bar:   "border-l-emerald-400 bg-emerald-500/5",
    dot:   "bg-emerald-500",
  },
  {
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    bar:   "border-l-rose-400 bg-rose-500/5",
    dot:   "bg-rose-500",
  },
];

function getDepthColors(depthIdx: number) {
  return DEPTH_COLORS[Math.min(depthIdx, DEPTH_COLORS.length - 1)];
}

// ── Type label helpers ─────────────────────────────────────────────────────
const TYPE_LABEL: Record<LiteraryStructure["type"], string> = {
  chiasm:      "Quiasmo",
  parallelism: "Paralelismo",
  inclusio:    "Inclusão",
};

const TYPE_COLORS: Record<LiteraryStructure["type"], string> = {
  chiasm:      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  parallelism: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  inclusio:    "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
};

// ── Element row for chiasm (staircase) ────────────────────────────────────

function ChiasmRow({
  elem,
  depth,
  indent,
  isCenter,
  showTextPreview,
}: {
  elem: StructureElement;
  depth: number;
  indent: number;
  isCenter: boolean;
  showTextPreview: boolean;
}) {
  const colors = getDepthColors(depth);

  return (
    <div
      className="flex items-start gap-0 transition-all"
      style={{ paddingLeft: `${indent}px` }}
    >
      {/* Connector dot */}
      <div className="flex flex-col items-center shrink-0 mr-2 pt-1.5">
        <div className={["w-2 h-2 rounded-full shrink-0", colors.dot].join(" ")} />
      </div>

      {/* Content bar */}
      <div
        className={[
          "flex-1 flex flex-col gap-0.5 border-l-2 pl-3 py-1.5 mb-1.5 rounded-r-lg",
          colors.bar,
          isCenter ? "ring-1 ring-[var(--color-gold)]/30" : "",
        ].join(" ")}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* Label badge */}
          <span
            className={[
              "text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border",
              colors.badge,
              isCenter ? "ring-1 ring-[var(--color-gold)]/40" : "",
            ].join(" ")}
          >
            {isCenter && "★ "}{elem.label}
          </span>

          {/* Verse ref */}
          <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
            v.{elem.verse_start}
            {elem.verse_end !== elem.verse_start && `–${elem.verse_end}`}
          </span>
        </div>

        {/* Summary */}
        <p className="text-xs text-[var(--color-text-secondary)] leading-snug">
          {elem.summary}
        </p>

        {/* Text preview */}
        {showTextPreview && elem.text_preview && (
          <p className="text-[11px] text-[var(--color-text-muted)] italic leading-snug mt-0.5 line-clamp-2">
            "{elem.text_preview}"
          </p>
        )}
      </div>
    </div>
  );
}

// ── Element row for parallelism / inclusio (flat) ─────────────────────────

function ParallelRow({
  elem,
  index,
  showTextPreview,
}: {
  elem: StructureElement;
  index: number;
  showTextPreview: boolean;
}) {
  const colors = getDepthColors(index % DEPTH_COLORS.length);

  return (
    <div className="flex items-start gap-2 mb-1.5">
      <div className="flex flex-col items-center shrink-0 mt-1.5">
        <div className={["w-2 h-2 rounded-full", colors.dot].join(" ")} />
      </div>
      <div
        className={[
          "flex-1 flex flex-col gap-0.5 border-l-2 pl-3 py-1.5 rounded-r-lg",
          colors.bar,
        ].join(" ")}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={[
              "text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border",
              colors.badge,
            ].join(" ")}
          >
            {elem.label}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
            v.{elem.verse_start}
            {elem.verse_end !== elem.verse_start && `–${elem.verse_end}`}
          </span>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] leading-snug">
          {elem.summary}
        </p>
        {showTextPreview && elem.text_preview && (
          <p className="text-[11px] text-[var(--color-text-muted)] italic leading-snug mt-0.5 line-clamp-2">
            "{elem.text_preview}"
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ChiasmDiagram({ structure, showTextPreview = false }: Props) {
  const elements = structure.elements ?? [];
  const isChiasm = structure.type === "chiasm";

  // For chiasm: compute depth of each element (distance from center)
  const centerIdx = Math.floor(elements.length / 2);
  const maxDepth = centerIdx;

  return (
    <div className="flex flex-col gap-3">
      {/* Type badge + confidence */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={[
            "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
            TYPE_COLORS[structure.type],
          ].join(" ")}
        >
          {TYPE_LABEL[structure.type]}
        </span>
        {structure.confidence !== undefined && (
          <span className="text-[10px] text-[var(--color-text-muted)]">
            {(structure.confidence * 100).toFixed(0)}% confiança
          </span>
        )}
        {isChiasm && (
          <span className="text-[10px] text-[var(--color-text-muted)] italic">
            — centro destacado em ★
          </span>
        )}
      </div>

      {/* Description */}
      {structure.description && (
        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
          {structure.description}
        </p>
      )}

      {/* Diagram */}
      {elements.length > 0 && (
        <div className="mt-1">
          {isChiasm ? (
            /* Staircase layout */
            elements.map((elem, i) => {
              const depth = Math.abs(i - centerIdx);
              const isCenter = i === centerIdx;
              // Outer elements: no indent. Center: max indent.
              const indent = (maxDepth - depth) * 20;
              return (
                <ChiasmRow
                  key={i}
                  elem={elem}
                  depth={depth}
                  indent={indent}
                  isCenter={isCenter}
                  showTextPreview={showTextPreview}
                />
              );
            })
          ) : (
            /* Flat layout for parallelism / inclusio */
            elements.map((elem, i) => (
              <ParallelRow
                key={i}
                elem={elem}
                index={i}
                showTextPreview={showTextPreview}
              />
            ))
          )}
        </div>
      )}

      {/* Symmetry indicator for chiasm */}
      {isChiasm && elements.length >= 3 && (
        <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-border)]">
          <div className="flex gap-1 items-center">
            {elements.map((elem, i) => {
              const depth = Math.abs(i - centerIdx);
              const colors = getDepthColors(depth);
              const isCenter = i === centerIdx;
              return (
                <span
                  key={i}
                  className={[
                    "text-[9px] font-mono font-bold px-1 py-0.5 rounded",
                    isCenter
                      ? "bg-[var(--color-gold)]/20 text-[var(--color-gold-dark)]"
                      : colors.badge,
                  ].join(" ")}
                >
                  {elem.label}
                </span>
              );
            })}
          </div>
          <span className="text-[9px] text-[var(--color-text-muted)]">
            estrutura simétrica
          </span>
        </div>
      )}
    </div>
  );
}
