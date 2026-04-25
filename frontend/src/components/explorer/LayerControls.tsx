import type { LayerType } from "./explorerReducer";
import { useI18n } from "../../i18n/i18nContext";

interface Props {
  activeLayers: Set<LayerType>;
  onToggle: (layer: LayerType) => void;
}

const LAYERS: { key: LayerType; labelKey: string; color: string }[] = [
  { key: "lexical", labelKey: "explorer.layers.lexical", color: "bg-green-500" },
  { key: "topics", labelKey: "explorer.layers.topics", color: "bg-amber-500" },
  { key: "crossrefs", labelKey: "explorer.layers.crossrefs", color: "bg-blue-500" },
  { key: "threads", labelKey: "explorer.layers.threads", color: "bg-teal-500" },
  { key: "people", labelKey: "explorer.layers.people", color: "bg-purple-500" },
];

export default function LayerControls({ activeLayers, onToggle }: Props) {
  const { t } = useI18n();
  return (
    <div className="flex gap-1.5 flex-wrap">
      {LAYERS.map(({ key, labelKey, color }) => {
        const active = activeLayers.has(key);
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition flex items-center gap-1.5 ${
              active
                ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-ink)]"
                : "border-gray-200 bg-white text-gray-400 hover:bg-gray-50"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${active ? color : "bg-gray-300"}`} />
            {t(labelKey)}
          </button>
        );
      })}
    </div>
  );
}
