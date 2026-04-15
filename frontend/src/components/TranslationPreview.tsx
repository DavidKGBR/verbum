import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchVerseTranslations } from "../services/api";
import { useI18n } from "../i18n/i18nContext";
import {
  useTranslationIdsCsv,
  useTranslationLanguages,
  getLanguageName,
} from "../hooks/useTranslations";

const FAMOUS_VERSES = [
  { id: "JHN.3.16", ref: "John 3:16", book: "JHN", ch: 3, v: 16 },
  { id: "PSA.23.1", ref: "Psalm 23:1", book: "PSA", ch: 23, v: 1 },
  { id: "ROM.8.28", ref: "Romans 8:28", book: "ROM", ch: 8, v: 28 },
  { id: "JER.29.11", ref: "Jeremiah 29:11", book: "JER", ch: 29, v: 11 },
  { id: "PRO.3.5", ref: "Proverbs 3:5", book: "PRO", ch: 3, v: 5 },
  { id: "ISA.40.31", ref: "Isaiah 40:31", book: "ISA", ch: 40, v: 31 },
  { id: "PHP.4.13", ref: "Philippians 4:13", book: "PHP", ch: 4, v: 13 },
  { id: "MAT.28.19", ref: "Matthew 28:19", book: "MAT", ch: 28, v: 19 },
  { id: "GEN.1.1", ref: "Genesis 1:1", book: "GEN", ch: 1, v: 1 },
  { id: "PSA.119.105", ref: "Psalm 119:105", book: "PSA", ch: 119, v: 105 },
];

export default function TranslationPreview() {
  const { t } = useI18n();
  const translationsCsv = useTranslationIdsCsv();
  const langMap = useTranslationLanguages();
  const [verseIdx, setVerseIdx] = useState(0);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const current = FAMOUS_VERSES[verseIdx];

  useEffect(() => {
    if (!translationsCsv) return;
    setLoading(true);
    fetchVerseTranslations(current.id, translationsCsv)
      .then((d) => setTranslations(d.translations))
      .catch(() => setTranslations({}))
      .finally(() => setLoading(false));
  }, [current.id, translationsCsv]);

  const shuffle = () => {
    setVerseIdx((prev) => (prev + 1) % FAMOUS_VERSES.length);
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-5 mb-8">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display font-bold text-lg">
          {t("home.oneVerse")}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs opacity-50 font-mono">{current.ref}</span>
          <button
            onClick={shuffle}
            disabled={loading}
            className="text-xs text-[var(--color-gold)] opacity-60 hover:opacity-100
                       disabled:opacity-30 transition"
          >
            ↻ {t("home.shuffleVerse")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-gray-100 rounded w-full"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(translations).map(([tid, text]) => {
            const lang = langMap[tid] ? getLanguageName(langMap[tid]) : "?";
            const meta = { lang, short: tid.toUpperCase() };
            return (
              <div
                key={tid}
                className="flex gap-3 pb-3 border-b last:border-0 last:pb-0"
              >
                <div className="shrink-0 w-16 pt-0.5">
                  <div className="text-xs font-bold text-[var(--color-gold)]">
                    {meta.short}
                  </div>
                  <div className="text-[10px] opacity-40">{meta.lang}</div>
                </div>
                <p className="verse-text text-sm flex-1">{text}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-3 border-t">
        <Link
          to={`/reader?book=${current.book}&chapter=${current.ch}&verse=${current.v}`}
          className="text-xs text-[var(--color-gold)] font-bold hover:underline"
        >
          {t("home.openInReader")} &rarr;
        </Link>
      </div>
    </div>
  );
}
