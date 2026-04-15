/**
 * AudioButton — botão 🔊 reutilizável para pronúncia de palavras bíblicas.
 *
 * Usa useWordAudio (Camada 1: Web Speech API).
 * Mostra tooltip indicando se está usando voz nativa ou transliteração.
 */

import { useWordAudio, type BiblicalLanguage } from "../../hooks/useWordAudio";

interface Props {
  language: BiblicalLanguage;
  /** Texto original com diacríticos (hebraico com niqqud, grego com acentos). */
  text: string;
  /** Transliteração lida em inglês quando não há voz nativa disponível. */
  transliteration?: string;
  /** Tamanho visual do botão. */
  size?: "xs" | "sm" | "md";
  className?: string;
}

const SIZE_CLASSES = {
  xs: "text-[11px] px-1.5 py-0.5 gap-1",
  sm: "text-xs px-2 py-1 gap-1",
  md: "text-sm px-3 py-1.5 gap-1.5",
};

export default function AudioButton({
  language,
  text,
  transliteration,
  size = "sm",
  className = "",
}: Props) {
  const { play, isPlaying, isSupported, hasNativeVoice } = useWordAudio(
    language,
    text,
    transliteration
  );

  if (!isSupported) return null;

  const tooltip = hasNativeVoice
    ? `Pronúncia ${language === "hebrew" ? "hebraica" : "grega"} (moderna)`
    : `Lendo transliteração (voz ${language === "hebrew" ? "he-IL" : "el-GR"} não instalada)`;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); play(); }}
      title={tooltip}
      aria-label={isPlaying ? "Tocando..." : "Ouvir pronúncia"}
      className={[
        "inline-flex items-center rounded transition-all outline-none",
        "bg-[var(--color-gold)]/10 hover:bg-[var(--color-gold)]/25",
        "text-[var(--color-gold-dark)] focus:ring-1 focus:ring-[var(--color-gold)]/60",
        "disabled:opacity-40 select-none",
        SIZE_CLASSES[size],
        isPlaying ? "opacity-70" : "",
        className,
      ].join(" ")}
    >
      <span className={isPlaying ? "animate-pulse" : ""}>
        {isPlaying ? "⏸" : "🔊"}
      </span>
      {size === "md" && (
        <span className="font-medium">
          {isPlaying ? "Tocando..." : "Ouvir"}
        </span>
      )}
    </button>
  );
}
