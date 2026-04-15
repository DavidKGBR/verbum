/**
 * useWordAudio — Camada 1 de pronúncia (Web Speech API)
 *
 * Toca a palavra original (hebraico ou grego) usando a voz nativa do browser.
 * Se a voz he-IL / el-GR não estiver disponível no sistema, faz fallback para
 * a transliteração lida em inglês — sempre funcional, nunca quebra.
 *
 * Camada 2 (Foreman Tibéria / Kantor Koiné) virá como MP3 sobrepostos a esta
 * camada assim que as licenças forem confirmadas.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type BiblicalLanguage = "hebrew" | "greek";

/** BCP-47 language tags tentados em ordem de preferência. */
const VOICE_LANGS: Record<BiblicalLanguage, string[]> = {
  hebrew: ["he-IL", "he"],
  greek:  ["el-GR", "el"],
};

function findVoice(language: BiblicalLanguage): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  for (const lang of VOICE_LANGS[language]) {
    const match = voices.find(
      (v) => v.lang === lang || v.lang.startsWith(lang + "-")
    );
    if (match) return match;
  }
  return null;
}

export interface WordAudioResult {
  play: () => void;
  isPlaying: boolean;
  isSupported: boolean;
  /** true se uma voz nativa (he-IL / el-GR) estiver disponível */
  hasNativeVoice: boolean;
}

/**
 * @param language  "hebrew" | "greek"
 * @param text       Texto original (com niqqud / acentos gregos)
 * @param transliteration  Fallback se não houver voz nativa
 */
export function useWordAudio(
  language: BiblicalLanguage,
  text: string,
  transliteration?: string
): WordAudioResult {
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasNativeVoice, setHasNativeVoice] = useState(false);
  const cancelRef = useRef(false);

  /* Detecta vozes disponíveis (carregam de forma assíncrona no Chrome). */
  useEffect(() => {
    if (!isSupported) return;

    function checkVoices() {
      setHasNativeVoice(findVoice(language) !== null);
    }

    checkVoices();
    window.speechSynthesis.addEventListener("voiceschanged", checkVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", checkVoices);
    };
  }, [isSupported, language]);

  const play = useCallback(() => {
    if (!isSupported) return;

    /* Cancela qualquer fala em curso. */
    cancelRef.current = true;
    window.speechSynthesis.cancel();
    cancelRef.current = false;

    const voice = findVoice(language);
    /* Se não há voz nativa, lê a transliteração com o engine padrão. */
    const spokenText = voice ? text : (transliteration ?? text);
    if (!spokenText) return;

    const utter = new SpeechSynthesisUtterance(spokenText);
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    }
    /* Velocidade um pouco abaixo do normal — melhor para aprendizado. */
    utter.rate  = 0.75;
    utter.pitch = 1.0;

    utter.onstart = () => { if (!cancelRef.current) setIsPlaying(true); };
    utter.onend   = () => setIsPlaying(false);
    utter.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utter);
  }, [isSupported, language, text, transliteration]);

  return { play, isPlaying, isSupported, hasNativeVoice };
}
