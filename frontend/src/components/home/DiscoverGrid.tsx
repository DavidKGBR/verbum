import { Link } from "react-router-dom";
import { useI18n } from "../../i18n/i18nContext";
import type { HomeStats } from "../../services/api";

interface FeatureCard {
  category: string;
  categoryKey: string;
  titleKey: string;
  descKey: string;
  route: string;
  statFn?: (stats: HomeStats) => string | null;
}

const FEATURES: FeatureCard[] = [
  // Study
  {
    category: "study",
    categoryKey: "home.cat.study",
    titleKey: "home.feat.people",
    descKey: "home.feat.peopleDesc",
    route: "/people",
    statFn: (s) => (s.people_count > 0 ? `${s.people_count.toLocaleString()}+` : null),
  },
  {
    category: "study",
    categoryKey: "home.cat.study",
    titleKey: "home.feat.map",
    descKey: "home.feat.mapDesc",
    route: "/map",
    statFn: (s) => (s.places_count > 0 ? `${s.places_count.toLocaleString()}+` : null),
  },
  {
    category: "study",
    categoryKey: "home.cat.study",
    titleKey: "home.feat.topics",
    descKey: "home.feat.topicsDesc",
    route: "/topics",
    statFn: (s) => (s.topics_count > 0 ? `${s.topics_count.toLocaleString()}+` : null),
  },
  {
    category: "study",
    categoryKey: "home.cat.study",
    titleKey: "home.feat.dictionary",
    descKey: "home.feat.dictionaryDesc",
    route: "/dictionary",
  },
  // Explore
  {
    category: "explore",
    categoryKey: "home.cat.explore",
    titleKey: "home.feat.timeline",
    descKey: "home.feat.timelineDesc",
    route: "/timeline",
  },
  {
    category: "explore",
    categoryKey: "home.cat.explore",
    titleKey: "home.feat.threads",
    descKey: "home.feat.threadsDesc",
    route: "/threads",
  },
  {
    category: "explore",
    categoryKey: "home.cat.explore",
    titleKey: "home.feat.arcs",
    descKey: "home.feat.arcsDesc",
    route: "/arc-diagram",
  },
  {
    category: "explore",
    categoryKey: "home.cat.explore",
    titleKey: "home.feat.intertextuality",
    descKey: "home.feat.intertextualityDesc",
    route: "/intertextuality",
  },
  // Analyze
  {
    category: "analyze",
    categoryKey: "home.cat.analyze",
    titleKey: "home.feat.emotions",
    descKey: "home.feat.emotionsDesc",
    route: "/emotional",
  },
  {
    category: "analyze",
    categoryKey: "home.cat.analyze",
    titleKey: "home.feat.structure",
    descKey: "home.feat.structureDesc",
    route: "/structure",
  },
  {
    category: "analyze",
    categoryKey: "home.cat.analyze",
    titleKey: "home.feat.questions",
    descKey: "home.feat.questionsDesc",
    route: "/open-questions",
    statFn: (s) => (s.questions_count > 0 ? String(s.questions_count) : null),
  },
  {
    category: "analyze",
    categoryKey: "home.cat.analyze",
    titleKey: "home.feat.analytics",
    descKey: "home.feat.analyticsDesc",
    route: "/deep-analytics",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  study: "var(--color-old-testament, #4a7c59)",
  explore: "var(--color-gold)",
  analyze: "var(--color-new-testament, #6b4c9a)",
};

export default function DiscoverGrid({ stats }: { stats: HomeStats | null }) {
  const { t } = useI18n();

  return (
    <section className="mb-8">
      <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-40 mb-1">
        {t("home.discover")}
      </h2>
      <p className="text-sm opacity-50 mb-4">{t("home.discoverSub")}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f) => {
          const stat = stats && f.statFn ? f.statFn(stats) : null;
          return (
            <Link
              key={f.route}
              to={f.route}
              className="rounded-lg border border-[var(--color-gold)]/15 bg-white p-5
                         hover:border-[var(--color-gold)]/40 hover:shadow-sm
                         transition group"
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-[10px] uppercase tracking-wider font-bold"
                  style={{ color: CATEGORY_COLORS[f.category] || "var(--color-gold)", opacity: 0.7 }}
                >
                  {t(f.categoryKey)}
                </span>
                {stat && (
                  <span className="text-[10px] font-mono font-bold text-[var(--color-gold)] opacity-60">
                    {stat}
                  </span>
                )}
              </div>
              <h3 className="font-display font-bold text-base group-hover:text-[var(--color-gold)] transition">
                {t(f.titleKey)}
              </h3>
              <p className="text-sm opacity-60 mt-1">{t(f.descKey)}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
