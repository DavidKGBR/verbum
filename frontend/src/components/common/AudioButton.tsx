/**
 * AudioButton — botão 🔊 de pronúncia de palavras bíblicas.
 *
 * Camada 1 (ativa): Se `audioUrl` fornecida, toca MP3 Neural2 diretamente
 *   via <audio> HTML — alta qualidade, zero latência após cache do browser.
 *
 * Fallback: Web Speech API (he-IL / el-GR) quando MP3 ainda não gerado.
 *   Ativado automaticamente — nunca quebra.
 */

import { useCallback, useRef, useState } from "react";
import { useWordAudio, type BiblicalLanguage } from "../../hooks/useWordAudio";
import { useI18n } from "../../i18n/i18nContext";

interface Props {
  language: BiblicalLanguage;
  /** Texto original com diacríticos (hebraico com niqqud, grego com acentos). */
  text: string;
  /** Transliteração usada como fallback no Web Speech API. */
  transliteration?: string;
  /** URL do MP3 Neural2 (Fase 5A). Quando presente, tem prioridade total. */
  audioUrl?: string | null;
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
  audioUrl,
  size = "sm",
  className = "",
}: Props) {
  const { t } = useI18n();
  // ── Camada 1: MP3 Neural2 via <audio> ──────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [mp3Playing, setMp3Playing] = useState(false);

  const playMp3 = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!audioUrl) return;

      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended  = () => setMp3Playing(false);
        audioRef.current.onerror  = () => setMp3Playing(false);
        audioRef.current.onpause  = () => setMp3Playing(false);
      }

      const audio = audioRef.current;

      if (mp3Playing) {
        audio.pause();
        audio.currentTime = 0;
        setMp3Playing(false);
        return;
      }

      // Garante que esteja usando a URL correta (pode ter mudado via props)
      if (audio.src !== audioUrl) {
        audio.src = audioUrl;
      }

      audio.play()
        .then(() => setMp3Playing(true))
        .catch(() => setMp3Playing(false));
    },
    [audioUrl, mp3Playing]
  );

  // ── Fallback: Web Speech API ────────────────────────────────────────────────
  const { play: playSpeech, isPlaying: speechPlaying, isSupported } =
    useWordAudio(language, text, transliteration);

  const hasMp3 = Boolean(audioUrl);
  const isPlaying = hasMp3 ? mp3Playing : speechPlaying;

  // Aramaic: no TTS available + no MP3 yet → hide button entirely
  if (language === "aramaic" && !hasMp3) return null;
  if (!hasMp3 && !isSupported) return null;

  const handleClick = hasMp3
    ? playMp3
    : (e: React.MouseEvent) => { e.stopPropagation(); playSpeech(); };

  const tooltip = hasMp3
    ? t("audio.tooltipMp3")
    : t("audio.tooltipSpeech").replace("{locale}", language === "hebrew" ? "he-IL" : "el-GR");

  return (
    <button
      onClick={handleClick}
      title={tooltip}
      aria-label={isPlaying ? t("audio.ariaPlaying") : t("audio.ariaListen")}
      className={[
        "inline-flex items-center rounded transition-all outline-none select-none",
        "bg-[var(--color-gold)]/10 hover:bg-[var(--color-gold)]/25",
        "text-[var(--color-gold-dark)] focus:ring-1 focus:ring-[var(--color-gold)]/60",
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
          {isPlaying ? t("audio.labelPlaying") : t("audio.labelListen")}
        </span>
      )}
    </button>
  );
}
