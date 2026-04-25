import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchOpenQuestions,
  fetchOpenQuestion,
  type OpenQuestion,
  type OpenQuestionDetail,
} from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useI18n, defaultTranslationFor } from "../i18n/i18nContext";
import { useScrollToExpanded } from "../hooks/useScrollIntoViewOnChange";
import { localized } from "../i18n/localized";
import { localizeBookName } from "../i18n/bookNames";

/** Turn "Textual Criticism" into "textual_criticism" for i18n key lookup. */
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "_");

export default function OpenQuestionsPage() {
  const { t, locale } = useI18n();
  const [questions, setQuestions] = useState<OpenQuestion[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [catFilter, setCatFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const registerCardRef = useScrollToExpanded(expanded);
  const [detail, setDetail] = useState<OpenQuestionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchOpenQuestions(catFilter || undefined)
      .then((d) => {
        setQuestions(d.results);
        setCategories(d.categories);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [catFilter]);

  const handleExpand = (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(id);
    setDetailLoading(true);
    fetchOpenQuestion(id)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-display font-bold mb-1">{t("questions.title")}</h1>
      <p className="text-sm opacity-60 mb-6">
        {t("questions.subtitle")}
      </p>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setCatFilter("")}
          className={`px-3 py-1.5 rounded-full text-xs transition ${
            !catFilter
              ? "bg-[var(--color-gold)] text-white"
              : "bg-black/5 hover:bg-black/10"
          }`}
        >
          {t("questions.filterAll")}
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCatFilter(c)}
            className={`px-3 py-1.5 rounded-full text-xs transition ${
              catFilter === c
                ? "bg-[var(--color-gold)] text-white"
                : "bg-black/5 hover:bg-black/10"
            }`}
          >
            {t(`openQuestions.category.${slug(c)}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner text={t("questions.loadingList")} />
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div
              key={q.id}
              ref={registerCardRef(q.id)}
              className="rounded-lg border border-[var(--color-gold)]/15 bg-white overflow-hidden"
            >
              <button
                onClick={() => handleExpand(q.id)}
                className="w-full text-left p-4 flex items-start gap-3 hover:bg-[var(--color-gold)]/5 transition"
              >
                <span className="text-lg mt-0.5">
                  {expanded === q.id ? "▾" : "▸"}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-sm">{localized(q, locale, "title")}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)]">
                      {t(`openQuestions.category.${slug(q.category)}`)}
                    </span>
                    <span className="text-[10px] opacity-40">
                      {t(`openQuestions.difficulty.${q.difficulty}`)}
                    </span>
                    <span className="text-[10px] opacity-30">
                      {(q.verse_refs.length === 1 ? t("questions.verse") : t("questions.verses"))
                        .replace("{n}", String(q.verse_refs.length))}
                    </span>
                  </div>
                </div>
              </button>

              {expanded === q.id && (
                <div className="px-4 pb-4 border-t border-[var(--color-gold)]/10">
                  {detailLoading ? (
                    <p className="text-sm opacity-50 py-3 animate-pulse">{t("questions.loadingDetail")}</p>
                  ) : detail ? (
                    <div className="pt-3 space-y-4">
                      <p className="text-sm leading-relaxed opacity-80">
                        {localized(detail, locale, "description")}
                      </p>

                      {/* Perspectives */}
                      {detail.perspectives && detail.perspectives.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] uppercase tracking-wider font-bold opacity-40">
                            {t("questions.perspectives")}
                          </h4>
                          {detail.perspectives.map((p, i) => (
                            <div
                              key={i}
                              className="p-3 rounded bg-black/[0.02] border border-black/5"
                            >
                              <div className="font-bold text-sm mb-1">{localized(p, locale, "view")}</div>
                              <div className="text-xs opacity-70">{localized(p, locale, "support")}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Verse refs */}
                      {detail.verse_refs.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {detail.verse_refs.map((v) => {
                            const parts = v.split(".");
                            const label =
                              parts.length === 3
                                ? `${localizeBookName(parts[0], locale, parts[0])} ${parts[1]}:${parts[2]}`
                                : v;
                            return (
                              <Link
                                key={v}
                                to={`/reader?book=${parts[0]}&chapter=${parts[1]}&verse=${parts[2]}&translation=${defaultTranslationFor(locale)}`}
                                className="text-[10px] px-2 py-1 rounded bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)] hover:bg-[var(--color-gold)]/20 transition"
                              >
                                {label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
