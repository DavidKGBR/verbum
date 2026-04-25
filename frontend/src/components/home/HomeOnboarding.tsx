import { Link } from "react-router-dom";
import { useI18n } from "../../i18n/i18nContext";

const ANCHOR = { book: "JHN", chapter: 1, verse: 1 };

export default function HomeOnboarding() {
  const { t } = useI18n();
  const base = `/reader?book=${ANCHOR.book}&chapter=${ANCHOR.chapter}&verse=${ANCHOR.verse}`;

  const cards = [
    {
      key: "verseOfDay",
      titleKey: "home.tour.card1.title",
      bodyKey: "home.tour.card1.body",
      illustration: (
        <div className="text-xs italic leading-relaxed opacity-80">
          “In the beginning was the Word, and the Word was with God, and the Word was God.”
          <span className="block opacity-60 mt-1 not-italic">— John 1:1 (KJV)</span>
        </div>
      ),
      to: `${base}&translation=kjv`,
    },
    {
      key: "interlinear",
      titleKey: "home.tour.card2.title",
      bodyKey: "home.tour.card2.body",
      illustration: (
        <div className="flex items-baseline gap-3 leading-tight">
          <span className="text-xl font-bold text-[var(--color-gold)]" lang="el">
            λόγος
          </span>
          <span className="text-[11px] italic opacity-70">logos</span>
          <span className="text-[11px] opacity-60">— Word, message</span>
        </div>
      ),
      to: `${base}&mode=interlinear&translation=kjv`,
    },
    {
      key: "crossrefs",
      titleKey: "home.tour.card3.title",
      bodyKey: "home.tour.card3.body",
      illustration: (
        <ul className="text-[11px] space-y-0.5 opacity-80">
          <li>→ Genesis 1:1</li>
          <li>→ Hebrews 1:2</li>
          <li>→ 1 John 1:1</li>
        </ul>
      ),
      to: `/arc-diagram?source=JHN`,
    },
    {
      key: "emotional",
      titleKey: "home.tour.card4.title",
      bodyKey: "home.tour.card4.body",
      illustration: (
        <svg viewBox="0 0 100 30" className="w-full h-8" preserveAspectRatio="none">
          <line
            x1="0"
            y1="15"
            x2="100"
            y2="15"
            stroke="currentColor"
            strokeWidth="0.3"
            opacity="0.2"
          />
          <path
            d="M0 12 C 10 8, 20 22, 30 14 S 50 6, 60 16 S 80 24, 100 10"
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth="1.2"
          />
        </svg>
      ),
      to: `/emotional?book=JHN&translation=kjv`,
    },
    {
      key: "compare",
      titleKey: "home.tour.card5.title",
      bodyKey: "home.tour.card5.body",
      illustration: (
        <ul className="text-[10px] leading-relaxed opacity-80 space-y-0.5">
          <li>
            <span className="font-mono text-[var(--color-gold)]">KJV</span> In the beginning was the Word…
          </li>
          <li>
            <span className="font-mono text-[var(--color-gold)]">NVI</span> No princípio era a Palavra…
          </li>
          <li>
            <span className="font-mono text-[var(--color-gold)]">RVR</span> En el principio era el Verbo…
          </li>
        </ul>
      ),
      to: `${base}&mode=parallel&translation=kjv`,
    },
  ] as const;

  return (
    <section className="mb-8 rounded-lg border border-[var(--color-gold)]/20 bg-gradient-to-br from-[var(--color-gold)]/5 to-transparent p-5">
      <h2 className="font-display font-bold text-xl mb-1">{t("home.tour.title")}</h2>
      <p className="text-sm opacity-60 mb-5">{t("home.tour.subtitle")}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c, i) => (
          <div
            key={c.key}
            className="rounded-lg border bg-white p-3 flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono opacity-40">{i + 1}</span>
              <h3 className="font-display font-bold text-sm">{t(c.titleKey)}</h3>
            </div>
            <p className="text-[11px] opacity-60 leading-snug">{t(c.bodyKey)}</p>
            <div className="flex-1 min-h-12 py-1 border-y border-dashed border-black/5 flex items-center">
              {c.illustration}
            </div>
            <Link
              to={c.to}
              className="text-xs text-[var(--color-gold)] hover:underline mt-1"
            >
              {t("home.tour.cta")} →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
