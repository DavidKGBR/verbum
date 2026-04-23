/**
 * MultiLayerView — Orquestrador do Special Passages Engine.
 *
 * Exibe até 4 colunas de idioma em paralelo com toggles individuais.
 * Mobile: empilha verticalmente. Desktop: grid proporcional.
 */

import { useState } from "react";
import LayerColumn from "./LayerColumn";
import type {
  PassageLayerKey,
  PassageWord,
  SpecialPassageResult,
} from "../../services/api";
import { useI18n } from "../../i18n/i18nContext";

interface Props {
  passage: SpecialPassageResult;
  onWordClick?: (word: PassageWord, layerKey: PassageLayerKey) => void;
}

const LAYER_ORDER: PassageLayerKey[] = ["aramaic", "hebrew", "greek", "portuguese", "english"];

const LAYER_PILL: Record<
  PassageLayerKey,
  { dot: string; active: string; inactive: string }
> = {
  aramaic: {
    dot:      "bg-amber-500",
    active:   "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/50",
    inactive: "bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)]",
  },
  hebrew: {
    dot:      "bg-sky-500",
    active:   "bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-500/50",
    inactive: "bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)]",
  },
  greek: {
    dot:      "bg-purple-500",
    active:   "bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-500/50",
    inactive: "bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)]",
  },
  portuguese: {
    dot:      "bg-emerald-500",
    active:   "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/50",
    inactive: "bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)]",
  },
  english: {
    dot:      "bg-blue-400",
    active:   "bg-blue-400/20 text-blue-800 dark:text-blue-300 border-blue-400/50",
    inactive: "bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)]",
  },
};

/** i18n key for short pill labels — translated via useI18n(). */
const PILL_LABEL_KEYS: Record<PassageLayerKey, string> = {
  aramaic:    "specialPassage.layer.aramaic",
  hebrew:     "specialPassage.layer.hebrew",
  greek:      "specialPassage.layer.greek",
  portuguese: "specialPassage.layer.portuguese",
  english:    "specialPassage.layer.english",
};

export default function MultiLayerView({ passage, onWordClick }: Props) {
  const { t } = useI18n();
  const availableLayers = LAYER_ORDER.filter(
    (k) => (passage.layers[k]?.verse_count ?? 0) > 0
  );

  const [visibleLayers, setVisibleLayers] = useState<Set<PassageLayerKey>>(
    new Set(availableLayers)
  );

  function toggleLayer(key: PassageLayerKey) {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Don't allow hiding the last visible layer
        if (next.size === 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const visibleKeys = LAYER_ORDER.filter((k) => visibleLayers.has(k));
  const colCount = visibleKeys.length;

  return (
    <div className="flex flex-col gap-5">
      {/* Toggle bar */}
      <div className="flex flex-wrap gap-2">
        {availableLayers.map((key) => {
          const isActive = visibleLayers.has(key);
          const styles = LAYER_PILL[key];
          // For the vernacular slot, prefer the backend-provided label so Spanish
          // (RVR) vs Portuguese (NVI/RA/ACF) is reflected correctly in the pill.
          const layer = passage.layers[key];
          const pillLabel =
            key === "portuguese" && layer?.language_code === "es"
              ? t("specialPassage.layer.spanish")
              : t(PILL_LABEL_KEYS[key]);
          return (
            <button
              key={key}
              onClick={() => toggleLayer(key)}
              className={[
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium",
                "transition-all select-none",
                isActive ? styles.active : styles.inactive,
              ].join(" ")}
            >
              <span className={["w-2 h-2 rounded-full", styles.dot].join(" ")} />
              {pillLabel}
            </button>
          );
        })}
      </div>

      {/* Grid — responsive */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
        }}
      >
        {visibleKeys.map((key) => {
          const layer = passage.layers[key];
          if (!layer) return null;
          return (
            <div key={key} className="min-w-0">
              <LayerColumn
                layerKey={key}
                layer={layer}
                onWordClick={onWordClick}
              />
            </div>
          );
        })}
      </div>

      {/* Mobile override: force single-column stack */}
      <style>{`
        @media (max-width: 768px) {
          .multilayer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
