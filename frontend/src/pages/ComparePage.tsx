import { useEffect, useState } from "react";
import {
  fetchComparePresets,
  fetchComparePreset,
  type ComparePreset,
  type CompareResult,
} from "../services/api";
import { useTranslationIds } from "../hooks/useTranslations";

export default function ComparePage() {
  const [presets, setPresets] = useState<ComparePreset[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [translation, setTranslation] = useState("kjv");
  const translationIds = useTranslationIds();

  useEffect(() => {
    fetchComparePresets().then(setPresets).catch(() => {});
  }, []);

  const handleSelect = (presetId: string) => {
    setSelected(presetId);
    setLoading(true);
    fetchComparePreset(presetId, translation)
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  };

  // Re-fetch when translation changes
  useEffect(() => {
    if (selected) {
      setLoading(true);
      fetchComparePreset(selected, translation)
        .then(setResult)
        .catch(() => setResult(null))
        .finally(() => setLoading(false));
    }
  }, [translation, selected]);

  // Color palette for columns
  const colColors = [
    "border-blue-400",
    "border-purple-400",
    "border-emerald-400",
    "border-amber-400",
    "border-rose-400",
    "border-cyan-400",
  ];
  const colBgs = [
    "bg-blue-50",
    "bg-purple-50",
    "bg-emerald-50",
    "bg-amber-50",
    "bg-rose-50",
    "bg-cyan-50",
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title text-3xl">Passage Comparator</h1>
        <p className="text-sm opacity-60 mt-1">
          Compare parallel passages side by side — synoptic Gospels, duplicate
          narratives in Kings/Chronicles, and more.
        </p>
      </div>

      {/* Translation selector */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs opacity-50">Translation:</span>
        {translationIds.map((t) => (
          <button
            key={t}
            onClick={() => setTranslation(t)}
            className={`text-xs px-3 py-1 rounded-full border transition uppercase ${
              translation === t
                ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
                : "border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Preset cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-6">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleSelect(preset.id)}
            className={`text-left p-3 rounded-lg border transition ${
              selected === preset.id
                ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10"
                : "border-[var(--color-gold-dark)]/15 hover:bg-[var(--color-gold)]/5"
            }`}
          >
            <div className="font-medium text-sm text-[var(--color-ink)]">
              {preset.title}
            </div>
            <div className="text-[10px] opacity-50 mt-1">
              {preset.passage_count} passages · {preset.labels.join(", ")}
            </div>
          </button>
        ))}
      </div>

      {!selected && (
        <div className="rounded-lg border border-dashed border-[var(--color-gold-dark)]/30 p-8 text-center">
          <p className="opacity-60">
            Select a parallel passage above to compare side by side.
          </p>
        </div>
      )}

      {loading && <p className="text-sm opacity-50">Loading passages...</p>}

      {/* Parallel columns */}
      {!loading && result && (
        <div>
          {result.title && (
            <h2 className="text-lg font-display font-bold text-[var(--color-ink)] mb-4">
              {result.title}
            </h2>
          )}

          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${result.columns.length}, minmax(0, 1fr))`,
            }}
          >
            {result.columns.map((col, i) => (
              <div
                key={col.range}
                className={`rounded-lg border-t-4 ${colColors[i % colColors.length]} bg-white overflow-hidden`}
              >
                {/* Column header */}
                <div className={`px-3 py-2 ${colBgs[i % colBgs.length]}`}>
                  <div className="font-bold text-sm">{col.label}</div>
                  <div className="text-[10px] opacity-50">
                    {col.verse_count} verses · {col.range}
                  </div>
                </div>

                {/* Verses */}
                <div className="p-3 space-y-2">
                  {col.verses.map((v) => (
                    <div key={v.verse_id} className="text-sm leading-relaxed">
                      <span className="text-[10px] font-bold opacity-40 mr-1">
                        {v.chapter}:{v.verse}
                      </span>
                      <span className="font-body">{v.text}</span>
                    </div>
                  ))}
                  {col.verses.length === 0 && (
                    <p className="text-xs opacity-40 italic">
                      No verses found for this translation.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
