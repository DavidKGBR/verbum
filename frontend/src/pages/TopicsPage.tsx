import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  fetchTopics,
  fetchPopularTopics,
  fetchTopic,
  fetchTopicRelated,
  type Topic,
  type TopicDetail,
  type TopicRelated,
  type TopicVerse,
} from "../services/api";
import { useI18n, defaultTranslationFor } from "../i18n/i18nContext";
import { topicName } from "../i18n/topicNames";
import { localizeBookName } from "../i18n/bookNames";
import { personName } from "../i18n/personNames";
import { placeName } from "../i18n/placeNames";
import { useScrollToExpanded } from "../hooks/useScrollIntoViewOnChange";
import SEO from "../components/SEO";
import { ROUTE_META } from "../seoMeta";

export default function TopicsPage() {
  const { t, locale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [popular, setPopular] = useState<Topic[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const registerCardRef = useScrollToExpanded(expanded);
  const [detail, setDetail] = useState<TopicDetail | null>(null);
  const [related, setRelated] = useState<TopicRelated | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [verseLimit, setVerseLimit] = useState(50);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load popular topics on mount
  useEffect(() => {
    fetchPopularTopics(15).then((d) => setPopular(d.results)).catch(() => {});
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && q !== query) setQuery(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (query.length < 2) {
      setTopics([]);
      setTotal(0);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      fetchTopics({ q: query, limit: 50, lang: locale })
        .then((data) => {
          setTopics(data.results);
          setTotal(data.total);
        })
        .catch(() => {
          setTopics([]);
          setTotal(0);
        })
        .finally(() => setLoading(false));
      setSearchParams(query ? { q: query } : {}, { replace: true });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, setSearchParams]);

  const handleExpand = (slug: string) => {
    if (expanded === slug) {
      setExpanded(null);
      setDetail(null);
      setRelated(null);
      return;
    }
    setExpanded(slug);
    setVerseLimit(50);
    setRelated(null);
    setDetailLoading(true);
    Promise.all([
      fetchTopic(slug, defaultTranslationFor(locale), 50),
      fetchTopicRelated(slug, locale).catch(() => null),
    ])
      .then(([d, r]) => {
        setDetail(d);
        setRelated(r);
      })
      .catch(() => {
        setDetail(null);
        setRelated(null);
      })
      .finally(() => setDetailLoading(false));
  };

  // Re-fetch detail when locale or limit changes (while expanded)
  useEffect(() => {
    if (!expanded) return;
    setDetailLoading(true);
    Promise.all([
      fetchTopic(expanded, defaultTranslationFor(locale), verseLimit),
      fetchTopicRelated(expanded, locale).catch(() => null),
    ])
      .then(([d, r]) => {
        setDetail(d);
        setRelated(r);
      })
      .catch(() => {
        setDetail(null);
        setRelated(null);
      })
      .finally(() => setDetailLoading(false));
  }, [locale, expanded, verseLimit]);

  const displayTopics = query.length >= 2 ? topics : [];

  return (
    <div className="max-w-4xl mx-auto">
      <SEO {...ROUTE_META["/topics"]} canonical="/topics" />
      <div className="mb-6">
        <h1 className="page-title text-3xl">{t("topics.title")}</h1>
        <p className="text-sm opacity-60 mt-1">{t("topics.subtitle")}</p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("topics.searchPlaceholder")}
          className="w-full rounded-lg border border-[var(--color-gold-dark)]/20 px-4 py-3
                     text-sm bg-white focus:outline-none focus:ring-2
                     focus:ring-[var(--color-gold)]/50 focus:border-[var(--color-gold)]/50"
          autoFocus
        />
      </div>

      {loading && <p className="text-sm opacity-50">{t("topics.searching")}</p>}

      {!loading && query.length >= 2 && topics.length === 0 && (
        <p className="text-sm opacity-50 italic">
          {t("topics.noResults").replace("{query}", query)}
        </p>
      )}

      {/* Popular topics when no search */}
      {query.length < 2 && popular.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold opacity-50 mb-3">{t("topics.popular")}</h2>
          <div className="flex flex-wrap gap-2">
            {popular.map((topic) => (
              <button
                key={topic.slug}
                onClick={() => setQuery(topicName(topic.slug, locale, topic.name))}
                className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-gold)]/30
                           hover:bg-[var(--color-gold)]/10 transition text-[var(--color-gold-dark)]"
              >
                {topicName(topic.slug, locale, topic.name)}{" "}
                <span className="opacity-40">({topic.verse_count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {query.length < 2 && (
        <div className="rounded-lg border border-dashed border-[var(--color-gold-dark)]/30 p-8 text-center">
          <p className="opacity-60 mb-3">{t("topics.typeHint")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { slug: "faith", en: "FAITH" },
              { slug: "love", en: "LOVE" },
              { slug: "prayer", en: "PRAYER" },
              { slug: "forgiveness", en: "FORGIVENESS" },
              { slug: "salvation", en: "SALVATION" },
              { slug: "grace", en: "GRACE" },
              { slug: "hope", en: "HOPE" },
              { slug: "sin-1", en: "SIN" },
            ].map((w) => (
              <button
                key={w.slug}
                onClick={() => setQuery(topicName(w.slug, locale, w.en))}
                className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-gold)]/30
                           hover:bg-[var(--color-gold)]/10 transition text-[var(--color-gold-dark)]"
              >
                {topicName(w.slug, locale, w.en)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {query.length >= 2 && total > 0 && (
        <p className="text-xs opacity-40 mb-2">
          {(total === 1 ? t("topics.foundSingular") : t("topics.found")).replace("{n}", String(total))}
        </p>
      )}

      <div className="space-y-3">
        {displayTopics.map((topic) => {
          const isOpen = expanded === topic.slug;
          return (
            <div
              key={topic.slug}
              ref={registerCardRef(topic.slug)}
              className="rounded-lg border border-[var(--color-gold-dark)]/15 bg-white overflow-hidden"
            >
              <button
                onClick={() => handleExpand(topic.slug)}
                className="w-full text-left px-4 py-3 flex items-start justify-between gap-3
                           hover:bg-[var(--color-gold)]/5 transition"
              >
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-[var(--color-ink)]">
                    {topicName(topic.slug, locale, topic.name)}
                  </h3>
                  <p className="text-xs opacity-50 mt-0.5">
                    {(topic.verse_count === 1 ? t("topics.verseRef") : t("topics.verseRefs")).replace("{n}", String(topic.verse_count))}
                  </p>
                </div>
                <svg
                  className={`w-4 h-4 opacity-40 transition-transform shrink-0 mt-1 ${isOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-[var(--color-gold-dark)]/10">
                  {detailLoading && !detail && (
                    <p className="text-xs opacity-50 mt-3">{t("topics.loadingVerses")}</p>
                  )}

                  {/* Cross-link chips (entities + related topics) */}
                  {related &&
                    (related.person || related.place || related.related_topics.length > 0) && (
                    <div className="mt-3 space-y-2">
                      {(related.person || related.place) && (
                        <div className="flex flex-wrap gap-2">
                          {related.person && (
                            <Link
                              to={`/people?highlight=${encodeURIComponent(related.person.slug)}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)] hover:bg-[var(--color-gold)]/20 text-xs transition"
                            >
                              <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {personName(related.person.slug, locale, related.person.name)}
                            </Link>
                          )}
                          {related.place && (
                            <Link
                              to={`/map?place=${encodeURIComponent(related.place.slug)}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs transition"
                            >
                              <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {placeName(related.place.slug, locale, related.place.name)}
                            </Link>
                          )}
                        </div>
                      )}
                      {related.related_topics.length > 0 && (
                        <div>
                          <span className="text-[10px] uppercase tracking-wider opacity-50">
                            {t("topics.relatedTopics")}
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {related.related_topics.map((rt) => (
                              <button
                                key={rt.slug}
                                onClick={() => {
                                  setQuery(topicName(rt.slug, locale, rt.name));
                                  setExpanded(null);
                                  setDetail(null);
                                  setRelated(null);
                                }}
                                className="text-xs px-2 py-0.5 rounded-full border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)] transition"
                                title={`${rt.shared_verses} ${t("topics.sharedVerses")}`}
                              >
                                {topicName(rt.slug, locale, rt.name)}
                                <span className="opacity-40 ml-1">({rt.shared_verses})</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Verses grouped by book */}
                  {detail && (() => {
                    const versesByBook = detail.verses.reduce<Record<string, TopicVerse[]>>((acc, v) => {
                      const key = v.book_id ?? "_unknown";
                      (acc[key] ||= []).push(v);
                      return acc;
                    }, {});
                    const bookOrder = Array.from(
                      new Set(detail.verses.map((v) => v.book_id ?? "_unknown"))
                    );
                    return (
                      <div className="mt-3">
                        {bookOrder.map((bookId) => {
                          const group = versesByBook[bookId];
                          const bookLabel = localizeBookName(
                            bookId === "_unknown" ? "" : bookId,
                            locale,
                            group[0].book_name ?? bookId,
                          );
                          return (
                            <section key={bookId} className="mt-3 first:mt-0">
                              <h5 className="text-[10px] uppercase tracking-wider font-bold opacity-60 mb-1.5 sticky top-0 bg-white py-1">
                                {bookLabel}
                                <span className="opacity-40 font-normal ml-1.5">
                                  ({group.length}{" "}
                                  {group.length === 1 ? t("topics.verseRef") : t("topics.verseRefs")})
                                </span>
                              </h5>
                              <div className="space-y-2">
                                {group.map((v) =>
                                  v.text ? (
                                    <div key={v.verse_id} className="text-sm leading-relaxed">
                                      <Link
                                        to={`/reader?book=${v.book_id}&chapter=${v.chapter}&verse=${v.verse}&translation=${detail.translation}`}
                                        className="text-[10px] font-bold text-[var(--color-gold-dark)] hover:underline mr-1"
                                      >
                                        {v.chapter}:{v.verse}
                                      </Link>
                                      <span className="font-body">{v.text}</span>
                                    </div>
                                  ) : (
                                    <div key={v.verse_id} className="text-xs opacity-40">
                                      {t("topics.notInTranslation")
                                        .replace("{id}", v.verse_id)
                                        .replace("{translation}", detail.translation)}
                                    </div>
                                  ),
                                )}
                              </div>
                            </section>
                          );
                        })}

                        {detail.verse_count > detail.verses.length && (
                          <div className="pt-3 flex items-center gap-3">
                            <p className="text-xs opacity-40">
                              {t("topics.showing")
                                .replace("{shown}", String(detail.verses.length))
                                .replace("{total}", String(detail.verse_count))}
                            </p>
                            <button
                              onClick={() => setVerseLimit((n) => Math.min(n + 100, detail.verse_count))}
                              disabled={detailLoading}
                              className="text-xs px-3 py-1 rounded-full border border-[var(--color-gold)]/30
                                         hover:bg-[var(--color-gold)]/10 transition
                                         text-[var(--color-gold-dark)] disabled:opacity-40"
                            >
                              {detailLoading ? t("topics.loadingVerses") : t("topics.showMore")}
                            </button>
                            {detail.verse_count > verseLimit + 100 && (
                              <button
                                onClick={() => setVerseLimit(detail.verse_count)}
                                disabled={detailLoading}
                                className="text-xs text-[var(--color-gold-dark)] hover:underline disabled:opacity-40"
                              >
                                {t("topics.showAll").replace("{n}", String(detail.verse_count))}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
