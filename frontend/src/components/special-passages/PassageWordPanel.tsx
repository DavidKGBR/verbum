/**
 * PassageWordPanel — Painel lateral para palavras sem Strong's ID.
 *
 * Exibido quando o usuário clica em uma palavra aramaica (Peshitta) ou
 * qualquer outra palavra que não tenha entrada no léxico Strong's.
 *
 * Mostra: script original, transliteração, gloss, fonte e áudio.
 */

import AudioButton from "../common/AudioButton";
import type { PassageLayerKey, PassageWord } from "../../services/api";
import type { BiblicalLanguage } from "../../hooks/useWordAudio";
import { useI18n } from "../../i18n/i18nContext";
import { localized } from "../../i18n/localized";

interface Props {
  word: PassageWord;
  layerKey: PassageLayerKey;
  layerLabel: string;
  onClose: () => void;
}

const PANEL_ACCENT: Record<PassageLayerKey, string> = {
  aramaic: "border-amber-500/40  bg-amber-500/5",
  hebrew: "border-sky-500/40    bg-sky-500/5",
  greek: "border-purple-500/40 bg-purple-500/5",
  portuguese: "border-emerald-500/40 bg-emerald-500/5",
  english: "border-blue-400/40   bg-blue-400/5",
};

const SCRIPT_FONT: Partial<Record<PassageLayerKey, string>> = {
  aramaic: "font-aramaic",
  hebrew: "font-hebrew",
  greek: "font-greek",
};

const WORD_LANGUAGE: Partial<Record<PassageLayerKey, BiblicalLanguage>> = {
  aramaic: "aramaic",
  hebrew: "hebrew",
  greek: "greek",
};

const SOURCE_LABEL_KEY: Partial<Record<PassageLayerKey, string>> = {
  aramaic: "passageWord.source.aramaic",
  hebrew: "passageWord.source.hebrew",
  greek: "passageWord.source.greek",
};

export default function PassageWordPanel({ word, layerKey, layerLabel, onClose }: Props) {
  const { t, locale } = useI18n();
  const isRtl = layerKey === "aramaic" || layerKey === "hebrew";
  const localizedGloss = localized(word, locale, "gloss");
  const scriptFont = SCRIPT_FONT[layerKey] ?? "";
  const lang = WORD_LANGUAGE[layerKey];
  const sourceLabelKey = SOURCE_LABEL_KEY[layerKey];
  const sourceLabel = sourceLabelKey ? t(sourceLabelKey) : layerLabel;

  return (
    <div
      className={[
        "fixed inset-y-0 right-0 w-full md:w-[380px] z-50",
        "bg-[var(--color-parchment)] shadow-[0_0_40px_rgba(0,0,0,0.15)]",
        "border-l border-[var(--color-gold)]/30",
        "flex flex-col fade-in",
      ].join(" ")}
    >
      {/* Header */}
      <div
        className={[
          "flex items-center justify-between px-6 py-4",
          "border-b border-[var(--color-border)]",
          PANEL_ACCENT[layerKey],
        ].join(" ")}
      >
        <span className="text-xs font-semibold text-[var(--color-text-muted)] tracking-wide uppercase">
          {layerLabel}
        </span>
        <button
          onClick={onClose}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]
                     transition-colors rounded-lg p-1 hover:bg-[var(--color-surface-hover)]"
          aria-label={t("passageWord.closeAria")}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">

        {/* Script principal */}
        <div
          className="flex flex-col items-center gap-3 py-4"
          dir={isRtl ? "rtl" : "ltr"}
        >
          <span
            className={[
              "text-5xl leading-none select-text",
              scriptFont,
              isRtl ? "tracking-widest" : "",
            ].join(" ")}
          >
            {word.script}
          </span>

          {word.transliteration && (
            <span className="text-base text-[var(--color-text-secondary)] italic tracking-wide">
              {word.transliteration}
            </span>
          )}

          {/* Áudio */}
          {lang && (
            <AudioButton
              language={lang}
              text={word.script}
              transliteration={word.transliteration ?? undefined}
              audioUrl={word.audio_url}
              size="md"
            />
          )}
        </div>

        {/* Significado */}
        {localizedGloss && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
              {t("passageWord.meaning")}
            </span>
            <p className="text-lg font-medium text-[var(--color-text-primary)]">
              {localizedGloss}
            </p>
          </div>
        )}

        {/* Fonte */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            {t("passageWord.source")}
          </span>
          <p className="text-sm text-[var(--color-text-secondary)]">{sourceLabel}</p>
        </div>

        {/* Nota sobre áudio proxy (aramaico) */}
        {layerKey === "aramaic" && word.audio_url && (
          <p className="text-[11px] text-[var(--color-text-muted)] italic border-t border-[var(--color-border)] pt-3">
            {t("passageWord.aramaicAudioNote")}
          </p>
        )}
      </div>
    </div>
  );
}
