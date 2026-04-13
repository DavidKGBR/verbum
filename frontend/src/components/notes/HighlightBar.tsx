import {
  HIGHLIGHT_CATEGORIES,
  CATEGORY_LABELS,
  type HighlightCategory,
} from "../../hooks/useVerseNotes";

interface Props {
  value?: HighlightCategory;
  onChange: (category: HighlightCategory | undefined) => void;
  size?: "sm" | "md";
}

const SIZE_CLASSES: Record<NonNullable<Props["size"]>, string> = {
  sm: "w-5 h-5",
  md: "w-7 h-7",
};

export default function HighlightBar({ value, onChange, size = "md" }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {HIGHLIGHT_CATEGORIES.map((cat) => {
        const active = value === cat;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(active ? undefined : cat)}
            title={CATEGORY_LABELS[cat]}
            aria-label={`${CATEGORY_LABELS[cat]} highlight${active ? " (active)" : ""}`}
            aria-pressed={active}
            className={`${SIZE_CLASSES[size]} rounded-full border-2 transition
                       focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/60
                       ${active ? "ring-2 ring-offset-1 ring-[var(--color-gold-dark)] scale-110" : "hover:scale-105"}`}
            style={{
              backgroundColor: `var(--hl-${cat})`,
              borderColor: active ? "var(--color-gold-dark)" : "rgba(0,0,0,0.12)",
            }}
          >
            {active && (
              <svg
                className="w-3 h-3 mx-auto text-white drop-shadow"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={4}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        );
      })}
      {value && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          title="Clear highlight"
          className={`${SIZE_CLASSES[size]} rounded-full border-2 border-dashed border-[var(--color-gold-dark)]/40
                      text-[var(--color-gold-dark)]/50 text-xs hover:border-[var(--color-gold-dark)]/80
                      hover:text-[var(--color-gold-dark)] transition
                      focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/60`}
          aria-label="Clear highlight"
        >
          ✕
        </button>
      )}
    </div>
  );
}
