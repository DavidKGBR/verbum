import {
  HIGHLIGHT_CATEGORIES,
  type HighlightCategory,
} from "../../hooks/useVerseNotes";
import { useI18n } from "../../i18n/i18nContext";

interface Props {
  value?: HighlightCategory;
  onChange: (category: HighlightCategory | undefined) => void;
  size?: "sm" | "md";
  /** When true, renders the localized label under each swatch so the
   *  user immediately sees what each color means. Defaults to true. */
  showLabels?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<Props["size"]>, string> = {
  sm: "w-5 h-5",
  md: "w-7 h-7",
};

export default function HighlightBar({
  value,
  onChange,
  size = "md",
  showLabels = true,
}: Props) {
  const { t } = useI18n();
  return (
    <div className="flex items-start gap-3 flex-wrap">
      {HIGHLIGHT_CATEGORIES.map((cat) => {
        const active = value === cat;
        const label = t(`notes.category.${cat}`);
        const ariaKey = active ? "notes.highlight.activeAria" : "notes.highlight.aria";
        return (
          <div key={cat} className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => onChange(active ? undefined : cat)}
              title={label}
              aria-label={t(ariaKey).replace("{category}", label)}
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
            {showLabels && (
              <span
                className={`text-[9px] leading-tight font-body tracking-wide transition
                           ${active ? "text-[var(--color-gold-dark)] font-bold" : "opacity-50"}`}
              >
                {label}
              </span>
            )}
          </div>
        );
      })}
      {value && (
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => onChange(undefined)}
            title={t("notes.highlight.clear")}
            className={`${SIZE_CLASSES[size]} rounded-full border-2 border-dashed border-[var(--color-gold-dark)]/40
                        text-[var(--color-gold-dark)]/50 text-xs hover:border-[var(--color-gold-dark)]/80
                        hover:text-[var(--color-gold-dark)] transition
                        focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/60`}
            aria-label={t("notes.highlight.clear")}
          >
            ✕
          </button>
          {showLabels && (
            <span className="text-[9px] leading-tight opacity-0">{t("notes.highlight.clear")}</span>
          )}
        </div>
      )}
    </div>
  );
}
