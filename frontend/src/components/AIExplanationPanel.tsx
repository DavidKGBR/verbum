import { useState } from "react";
import { explainVerse, type AIExplanation } from "../services/api";
import { useI18n } from "../i18n/i18nContext";
import ActionIcon from "./icons/ActionIcon";

interface Props {
  verseId: string;
  translation: string;
}

type Lang = "en" | "pt-br";

// Module-level cache: survives component remount during a session
const cache = new Map<string, AIExplanation>();

function cacheKey(verseId: string, translation: string, language: Lang): string {
  return `${verseId}|${translation}|${language}`;
}

export default function AIExplanationPanel({ verseId, translation }: Props) {
  const { t } = useI18n();
  const [language, setLanguage] = useState<Lang>("en");
  const [data, setData] = useState<AIExplanation | null>(
    () => cache.get(cacheKey(verseId, translation, "en")) || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(lang: Lang) {
    setLanguage(lang);
    const key = cacheKey(verseId, translation, lang);
    const cached = cache.get(key);
    if (cached) {
      setData(cached);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await explainVerse(verseId, lang, translation);
      cache.set(key, result);
      setData(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (msg.includes("Gemini API key")) {
        setError(t("ai.errorApiKey"));
      } else {
        setError(msg);
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  // Render key_words flexibly (could be array of strings or array of objects)
  function renderKeyWords(kw: AIExplanation["key_words"]) {
    if (!kw || kw.length === 0) return null;
    return (
      <ul className="space-y-1.5">
        {kw.map((item, i) => {
          if (typeof item === "string") {
            return (
              <li key={i} className="text-xs">
                <span className="font-bold text-[var(--color-gold)]">•</span>{" "}
                {item}
              </li>
            );
          }
          return (
            <li key={i} className="text-xs">
              <span className="font-bold text-[var(--color-gold)]">
                {item.word}
              </span>
              {item.original && (
                <span className="opacity-50 italic ml-1">({item.original})</span>
              )}
              {item.meaning && <span> — {item.meaning}</span>}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white to-amber-50/30 border border-[var(--color-gold)]/30 rounded p-3 text-sm">
      {/* Language toggle */}
      <div className="flex gap-2 mb-3 items-center">
        <span className="inline-flex items-center gap-1.5 text-xs opacity-50">
          <ActionIcon name="sparkles" className="w-3.5 h-3.5" /> {t("ai.header")}
        </span>
        <div className="ml-auto flex gap-1">
          {(["en", "pt-br"] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => load(l)}
              className={`text-xs px-2 py-0.5 rounded transition ${
                language === l && data
                  ? "bg-[var(--color-gold)] text-white"
                  : "border hover:bg-gray-50"
              }`}
            >
              {l === "en" ? "EN" : "PT"}
            </button>
          ))}
        </div>
      </div>

      {!data && !loading && !error && (
        <div className="text-center py-3">
          <button
            onClick={() => load(language)}
            className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded
                       bg-[var(--color-gold)] text-white hover:opacity-90 transition"
          >
            <ActionIcon name="sparkles" /> {t("ai.generateBtn")}
          </button>
          <p className="text-xs opacity-50 mt-2">
            {t("ai.poweredBy")}
          </p>
        </div>
      )}

      {loading && (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          <div className="h-2 bg-gray-100 rounded w-1/3 mt-3"></div>
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-4/5"></div>
          <p className="text-xs opacity-40 italic pt-2">
            {t("ai.asking")}
          </p>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-3 fade-in">
          <section>
            <h4 className="font-bold text-xs text-[var(--color-gold)] uppercase tracking-wider mb-1">
              {t("ai.section.explanation")}
            </h4>
            <p className="text-xs leading-relaxed">{data.explanation}</p>
          </section>

          {data.context && (
            <section>
              <h4 className="font-bold text-xs text-[var(--color-gold)] uppercase tracking-wider mb-1">
                {t("ai.section.context")}
              </h4>
              <p className="text-xs leading-relaxed opacity-80">{data.context}</p>
            </section>
          )}

          {data.key_words && data.key_words.length > 0 && (
            <section>
              <h4 className="font-bold text-xs text-[var(--color-gold)] uppercase tracking-wider mb-1">
                {t("ai.section.keyWords")}
              </h4>
              {renderKeyWords(data.key_words)}
            </section>
          )}

          {data.application && (
            <section>
              <h4 className="font-bold text-xs text-[var(--color-gold)] uppercase tracking-wider mb-1">
                {t("ai.section.application")}
              </h4>
              <p className="text-xs leading-relaxed italic opacity-80">
                {data.application}
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
