import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchTranslationStats,
  fetchArcs,
  fetchHomeStats,
  type TranslationStat,
  type HomeStats,
} from "../services/api";
import { useBooks, localizeBookName } from "../i18n/bookNames";
import { useI18n } from "../i18n/i18nContext";
import VerseOfTheDay from "../components/VerseOfTheDay";
import TranslationPreview from "../components/TranslationPreview";
import DiscoverGrid from "../components/home/DiscoverGrid";
import CommunityPreview from "../components/home/CommunityPreview";
import HomeOnboarding from "../components/home/HomeOnboarding";
import VerbumLogo from "../components/common/VerbumLogo";
import { useReadingHistory } from "../hooks/useReadingHistory";
import { useReadingPlans } from "../hooks/useReadingPlans";
import { getPlanById } from "../components/plans/plansData";

interface QuickAction {
  to: string;
  icon: string; // Heroicon SVG path (24x24 outline)
  titleKey: string;
  subtitle: string;
  accent?: boolean;
}

// Heroicon outline paths (24x24 viewBox)
const ICONS = {
  book: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  link: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  bookmark: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z",
  people: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
  tag: "M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z M6 6h.008v.008H6V6z",
  heart: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z",
  chat: "M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155",
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  trophy: "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228",
};

export default function HomePage() {
  const { t, locale } = useI18n();
  const [translations, setTranslations] = useState<TranslationStat[]>([]);
  const [totalCrossrefs, setTotalCrossrefs] = useState<number | null>(null);
  const books = useBooks("kjv");
  const [homeStats, setHomeStats] = useState<HomeStats | null>(null);
  const [translationsOpen, setTranslationsOpen] = useState(false);
  const { getLastRead } = useReadingHistory();
  const { active: activePlan, todayReading, isCompleted } = useReadingPlans();
  const last = getLastRead();

  useEffect(() => {
    fetchTranslationStats()
      .then((d) => setTranslations(d.translations))
      .catch(() => {});
    fetchArcs(undefined, 1, "distance")
      .then((d) => setTotalCrossrefs(d.metadata.total_crossrefs))
      .catch(() => {});
    fetchHomeStats().then(setHomeStats).catch(() => {});
  }, []);

  // Build a "Today's Reading" quick action if there's an active plan
  const planAction: QuickAction | null = (() => {
    if (!activePlan) return null;
    const planDef = getPlanById(activePlan.plan_id);
    if (!planDef || books.length === 0) return null;
    const today = todayReading(planDef, books);
    if (!today || today.chapters.length === 0) return null;
    const remaining = today.chapters.filter(
      (c) => !isCompleted(activePlan.plan_id, c.chapter_id)
    );
    if (remaining.length === 0) {
      return {
        to: "/plans",
        icon: ICONS.trophy,
        titleKey: "",
        subtitle: `${t(planDef.titleKey)} · ${t("plans.dayOf").replace("{day}", String(today.day)).replace("{total}", String(planDef.total_days))}`,
        accent: true,
      };
    }
    const nextCh = remaining[0];
    return {
      to: `/reader?book=${nextCh.book_id}&chapter=${nextCh.chapter}&translation=kjv`,
      icon: ICONS.book,
      titleKey: "",
      subtitle: remaining.length === 1
        ? t("plans.chapterToRead").replace("{n}", "1")
        : t("plans.chaptersToRead").replace("{n}", String(remaining.length)),
      accent: true,
    };
  })();

  const totalVerses = translations.reduce((s, t) => s + t.verses, 0);
  const totalTranslations = translations.length;
  const languages = new Set(translations.map((t) => t.language)).size;

  // Row 1: reading + search + cross-refs + bookmarks
  const quickActionsRow1: QuickAction[] = [
    planAction
      ? planAction
      : last
      ? {
          to: `/reader?book=${last.book_id}&chapter=${last.chapter}&translation=${last.translation}`,
          icon: ICONS.book,
          titleKey: "home.continueReading",
          subtitle: `${localizeBookName(last.book_id, locale, last.book_name || last.book_id)} ${last.chapter} · ${last.translation.toUpperCase()}`,
          accent: true,
        }
      : {
          to: "/reader",
          icon: ICONS.book,
          titleKey: "home.startReading",
          subtitle: t("home.openReader"),
          accent: true,
        },
    {
      to: "/search",
      icon: ICONS.search,
      titleKey: "home.search",
      subtitle: t("home.searchSub"),
    },
    {
      to: "/arc-diagram",
      icon: ICONS.link,
      titleKey: "home.crossrefs",
      subtitle: totalCrossrefs
        ? t("home.connections").replace("{n}", totalCrossrefs.toLocaleString())
        : t("home.crossrefs"),
    },
    {
      to: "/bookmarks",
      icon: ICONS.bookmark,
      titleKey: "home.bookmarks",
      subtitle: t("home.bookmarksSub"),
    },
  ];

  // Row 2: people, topics, emotions, community
  const quickActionsRow2: QuickAction[] = [
    {
      to: "/people",
      icon: ICONS.people,
      titleKey: "home.people",
      subtitle: t("home.peopleSub"),
    },
    {
      to: "/topics",
      icon: ICONS.tag,
      titleKey: "home.topics",
      subtitle: t("home.topicsSub"),
    },
    {
      to: "/emotional",
      icon: ICONS.heart,
      titleKey: "home.emotions",
      subtitle: t("home.emotionsSub"),
    },
    {
      to: "/community",
      icon: ICONS.chat,
      titleKey: "home.community",
      subtitle: t("home.communitySub"),
    },
  ];

  const allQuickActions = [...quickActionsRow1, ...quickActionsRow2];

  return (
    <div className="max-w-5xl mx-auto">
      {/* ─── HERO ─── */}
      <section
        className="relative rounded-xl p-8 md:p-12 mb-8 overflow-hidden border"
        style={{
          backgroundColor: "var(--bg-void)",
          borderColor: "rgba(196, 162, 101, 0.2)",
          backgroundImage:
            "radial-gradient(ellipse at top left, rgba(196,162,101,0.18), transparent 60%), radial-gradient(ellipse at bottom right, rgba(196,162,101,0.08), transparent 50%)",
        }}
      >
        <div className="relative">
          <VerbumLogo
            variant="wordmark"
            className="h-12 md:h-16 w-auto mb-4 text-[var(--color-gold)]"
          />
          <p className="font-display text-[var(--color-gold)] text-xs uppercase tracking-[0.3em] mb-6 opacity-70">
            {t("app.subtitle")}
          </p>
          <h1
            className="font-display font-bold text-4xl md:text-6xl leading-tight mb-4"
            style={{ color: "var(--color-parchment)" }}
          >
            {t("home.heroTitle1")}
            <br />
            <span className="text-[var(--color-gold)] italic">
              {t("home.heroTitle2")}
            </span>
          </h1>
          <p
            className="font-body text-lg md:text-xl max-w-2xl opacity-70 mb-8"
            style={{ color: "var(--color-parchment)" }}
          >
            {t("home.heroQuote")}
            <span className="opacity-50 text-sm ml-2">— {t("home.heroQuoteRef")}</span>
          </p>

          {/* Hero stats */}
          <div className="flex flex-wrap gap-6 md:gap-10 mb-8 font-display">
            <HeroStat value={totalVerses.toLocaleString()} label={t("home.statVerses")} />
            <HeroStat value={totalTranslations.toString()} label={t("home.statTranslations")} />
            <HeroStat value={languages.toString()} label={t("home.statLanguages")} />
            <HeroStat
              value={totalCrossrefs !== null ? totalCrossrefs.toLocaleString() : "—"}
              label={t("home.statCrossrefs")}
            />
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-3">
            <Link
              to="/reader"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold
                         bg-[var(--color-gold)] text-[var(--bg-void)]
                         hover:opacity-90 transition shadow-lg shadow-amber-900/30"
            >
              {t("home.ctaRead")} &rarr;
            </Link>
            <Link
              to="/arc-diagram"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold
                         border border-[var(--color-gold)]/40 text-[var(--color-gold)]
                         hover:bg-[var(--color-gold)]/10 transition"
            >
              {t("home.ctaExplore")}
            </Link>
          </div>
        </div>
      </section>

      {/* ─── QUICK ACTIONS (2 rows of 4) ─── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {allQuickActions.map((a) => (
          <Link
            key={a.to + a.titleKey}
            to={a.to}
            className={`rounded-lg border p-4 card-hover transition group ${
              a.accent
                ? "bg-gradient-to-br from-[var(--color-gold)]/10 to-transparent border-[var(--color-gold)]/40"
                : "bg-white"
            }`}
          >
            <svg
              className="w-6 h-6 mb-2 text-[var(--color-gold)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={a.icon} />
            </svg>
            <div className="font-display font-bold text-sm group-hover:text-[var(--color-gold)] transition">
              {a.titleKey ? t(a.titleKey) : a.subtitle}
            </div>
            <div className="text-xs opacity-60 mt-0.5 truncate">
              {a.subtitle}
            </div>
          </Link>
        ))}
      </section>

      {/* ─── ONBOARDING TOUR (first-time visitors only) ─── */}
      {!last && <HomeOnboarding />}

      {/* ─── VERSE OF THE DAY ─── */}
      <VerseOfTheDay />

      {/* ─── DISCOVER VERBUM ─── */}
      <DiscoverGrid stats={homeStats} />

      {/* ─── ONE VERSE, MANY VOICES ─── */}
      <TranslationPreview />

      {/* ─── COMMUNITY PREVIEW ─── */}
      <CommunityPreview stats={homeStats} />

      {/* ─── TRANSLATIONS (collapsible) ─── */}
      <div className="bg-white rounded-lg shadow-sm border mb-8 overflow-hidden">
        <button
          onClick={() => setTranslationsOpen(!translationsOpen)}
          className="w-full flex items-center justify-between p-5 hover:bg-[var(--color-gold)]/5 transition"
        >
          <h3 className="font-display font-bold text-lg">
            {t("home.translations")}
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs opacity-50">
              {totalTranslations} {t("home.translationsCount")} · {languages} {t("home.translationsLanguages")}
            </span>
            <span className="text-sm opacity-40">
              {translationsOpen ? "▾" : "▸"}
            </span>
          </div>
        </button>

        {translationsOpen && (
          <div className="px-5 pb-5 overflow-x-auto">
            <table className="w-full text-sm min-w-[380px]">
              <thead>
                <tr className="border-b text-left opacity-60">
                  <th className="pb-2 font-normal text-xs uppercase tracking-wider">ID</th>
                  <th className="pb-2 font-normal text-xs uppercase tracking-wider">
                    {t("home.translationsLanguages")}
                  </th>
                  <th className="pb-2 font-normal text-xs uppercase tracking-wider">
                    {t("common.verses")}
                  </th>
                  <th className="pb-2 font-normal text-xs uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {translations.map((tr) => (
                  <tr key={tr.translation_id} className="border-b last:border-0 hover:bg-gray-50 transition">
                    <td className="py-2 font-mono font-bold text-[var(--color-gold)]">
                      {tr.translation_id.toUpperCase()}
                    </td>
                    <td className="py-2">{tr.language}</td>
                    <td className="py-2">{tr.verses.toLocaleString()}</td>
                    <td className="py-2 text-right">
                      <Link
                        to={`/reader?translation=${tr.translation_id}`}
                        className="text-xs text-[var(--color-gold)] hover:underline"
                      >
                        {t("home.translationsOpen")} &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl md:text-3xl font-bold text-[var(--color-gold)]">
        {value}
      </div>
      <div
        className="text-[10px] uppercase tracking-wider opacity-50"
        style={{ color: "var(--color-parchment)" }}
      >
        {label}
      </div>
    </div>
  );
}
