/**
 * LayerColumn — Uma coluna de idioma no Multi-Layer View.
 *
 * Aramaico / Grego: exibe palavras individuais com transliteração e gloss.
 * Português / Inglês: exibe texto completo por verso.
 */

import AudioButton from "../common/AudioButton";
import type { PassageLayer, PassageLayerKey, PassageWord } from "../../services/api";
import type { BiblicalLanguage } from "../../hooks/useWordAudio";

interface Props {
  layerKey: PassageLayerKey;
  layer: PassageLayer;
  onWordClick?: (word: PassageWord, layerKey: PassageLayerKey) => void;
}

/** Border + accent color por camada. */
const LAYER_COLORS: Record<PassageLayerKey, string> = {
  aramaic:    "border-amber-500  bg-amber-500/5",
  greek:      "border-purple-500 bg-purple-500/5",
  portuguese: "border-emerald-500 bg-emerald-500/5",
  english:    "border-blue-400   bg-blue-400/5",
};

const LAYER_BADGE: Record<PassageLayerKey, string> = {
  aramaic:    "bg-amber-500/15  text-amber-700  dark:text-amber-300",
  greek:      "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  portuguese: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  english:    "bg-blue-400/15   text-blue-700   dark:text-blue-300",
};

const WORD_LANGUAGE: Partial<Record<PassageLayerKey, BiblicalLanguage>> = {
  aramaic: "aramaic",
  greek:   "greek",
};

/** Font classes for script rendering */
const SCRIPT_FONT: Partial<Record<PassageLayerKey, string>> = {
  aramaic: "font-aramaic",
  greek:   "font-greek",
};

export default function LayerColumn({ layerKey, layer, onWordClick }: Props) {
  const isWordLevel = layerKey === "aramaic" || layerKey === "greek";
  const isRtl = layer.direction === "rtl";
  const scriptFont = SCRIPT_FONT[layerKey] ?? "";
  const lang = WORD_LANGUAGE[layerKey];

  return (
    <div
      className={[
        "flex flex-col rounded-xl border-t-4 p-4 gap-4 h-full",
        LAYER_COLORS[layerKey],
        "border border-t-4 border-[var(--color-border)]",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <span
          className={[
            "self-start text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded-full",
            LAYER_BADGE[layerKey],
          ].join(" ")}
        >
          {layer.label}
        </span>
        {layer.audio_note && (
          <p className="text-[11px] text-[var(--color-text-muted)] italic">
            {layer.audio_note}
          </p>
        )}
      </div>

      {/* Verses */}
      <div className="flex flex-col gap-5">
        {layer.verses.map((verse) => (
          <div key={verse.verse_ref} className="flex flex-col gap-1.5">
            {/* Verse number label */}
            <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
              v.{verse.verse_number}
            </span>

            {isWordLevel && verse.words ? (
              /* Word-by-word grid */
              <div
                className={[
                  "flex flex-wrap gap-1.5",
                  isRtl ? "flex-row-reverse justify-end" : "flex-row",
                ].join(" ")}
                dir={isRtl ? "rtl" : "ltr"}
              >
                {verse.words.map((word) => (
                  <button
                    key={word.word_position}
                    onClick={() => onWordClick?.(word, layerKey)}
                    className={[
                      "group flex flex-col items-center rounded-lg px-2 py-1.5 gap-0.5",
                      "border border-transparent hover:border-[var(--color-border)]",
                      "hover:bg-[var(--color-surface-hover)] transition-colors",
                      word.strongs_id ? "cursor-pointer" : "cursor-default",
                    ].join(" ")}
                    title={word.strongs_id ? `Strong's ${word.strongs_id}` : undefined}
                  >
                    {/* Script */}
                    <span
                      className={[
                        "text-xl leading-tight",
                        scriptFont,
                        isRtl ? "tracking-wide" : "",
                      ].join(" ")}
                    >
                      {word.script}
                    </span>

                    {/* Transliteration */}
                    {word.transliteration && (
                      <span className="text-[10px] text-[var(--color-text-muted)] italic">
                        {word.transliteration}
                      </span>
                    )}

                    {/* Gloss */}
                    {word.gloss && (
                      <span className="text-[10px] text-[var(--color-text-secondary)] leading-tight text-center max-w-[80px] truncate">
                        {word.gloss}
                      </span>
                    )}

                    {/* Audio button — Aramaic hides itself when no audio_url */}
                    {lang && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <AudioButton
                          language={lang}
                          text={word.script}
                          transliteration={word.transliteration ?? undefined}
                          audioUrl={word.audio_url}
                          size="xs"
                        />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              /* Full-text verse */
              <p className="text-sm leading-relaxed text-[var(--color-text-primary)]">
                {verse.full_text}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
