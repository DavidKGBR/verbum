/**
 * Per-route SEO metadata.
 *
 * Centralized so prerender + crawl signals stay consistent. Pages that need
 * custom titles (BlogPostPage at /blog/:slug, Reader with deep-link state)
 * compose <SEO /> directly with their own props instead of using this dict.
 */
export interface RouteMeta {
  title: string;
  description: string;
}

export const ROUTE_META: Record<string, RouteMeta> = {
  "/": {
    // Empty title triggers the default ("Verbum — Free Open-Source Bible Study App")
    // in the SEO component, which is exactly what we want for Home.
    title: "",
    description:
      "Free open-source Bible study app — 12 translations, 344K cross-references, interlinear Greek/Hebrew, AI-assisted analysis. No paywall, no ads.",
  },
  "/about": {
    title: "About",
    description:
      "Why Verbum exists: a free Bible study app, built without a paywall, on top of public-domain data — and the AI that helped build it.",
  },
  "/privacy": {
    title: "Privacy & Cookies",
    description:
      "How Verbum handles data. LGPD/GDPR-compliant: no ads, no profiling, anonymous analytics gated by your consent.",
  },
  "/blog": {
    title: "Blog",
    description:
      "Articles on Bible study, the methodology behind Verbum's data, and what it means to build a free open-source scripture app with an AI as pair programmer.",
  },
  "/reader": {
    title: "Read the Bible — 12 Translations",
    description:
      "Read the Bible in 12 translations across 5 languages, with single, parallel, immersive 3D, interlinear Greek/Hebrew, and structural literary modes.",
  },
  "/search": {
    title: "Search Scripture",
    description:
      "Full-text Bible search across 12 translations. Find any verse by keyword, reference, or topic in English, Portuguese, or Spanish.",
  },
  "/dictionary": {
    title: "Hebrew & Greek Dictionary",
    description:
      "14,800 dictionary entries from Easton's and Smith's. Look up any Hebrew or Greek term with Strong's number, definitions, and biblical references.",
  },
  "/word-study/:strongsId": {
    title: "Word Study",
    description:
      "Strong's-keyed deep dive into a Hebrew or Greek term: morphology, every occurrence, semantic neighbours, and how the word is rendered across translations.",
  },
  "/map": {
    title: "Biblical Atlas",
    description:
      "Interactive map of 1,600+ biblical places with coordinates, verse counts, and direct links to passages mentioning each location.",
  },
  "/timeline": {
    title: "Biblical Timeline",
    description:
      "4,000 events across the Old and New Testaments, plotted on a navigable timeline with people, places, and scriptural cross-links.",
  },
  "/emotional": {
    title: "Emotional Landscape",
    description:
      "How Scripture feels: 62,000 manually-labelled verses across Portuguese and Spanish reveal sentiment arcs across every book of the Bible.",
  },
  "/topics": {
    title: "Topical Index",
    description:
      "20,000 topical tags from Nave's Topical Bible — explore Scripture by theme, virtue, person, or doctrine.",
  },
  "/people": {
    title: "Biblical People",
    description:
      "3,000 named individuals from Genesis to Revelation, with verse references, family relationships, and historical context.",
  },
  "/places": {
    title: "Biblical Places",
    description:
      "1,600 cities, regions, mountains, and bodies of water named in Scripture, with coordinates where known.",
  },
  "/authors": {
    title: "Biblical Authors",
    description:
      "Who wrote what, when, and to whom — biographies and writing context for the human authors of Scripture.",
  },
  "/compare": {
    title: "Translation Comparison",
    description:
      "Compare any verse across up to 12 translations side-by-side. Spot interpretive differences in real time.",
  },
  "/connections": {
    title: "Cross-References",
    description:
      "344,000 cross-references rendered three ways: arc diagram, semantic graph, and intertextual citations between the Old and New Testaments.",
  },
  "/concepts": {
    title: "Concepts: Threads & Genealogy",
    description:
      "Trace recurring concepts across Scripture (semantic threads) and follow the Hebrew→Greek lineage of theological vocabulary.",
  },
  "/structure": {
    title: "Literary Structure",
    description:
      "Chiasms, parallelism, and the architectural patterns hiding inside the biblical text.",
  },
  "/devotional": {
    title: "Devotional Plans",
    description:
      "Themed multi-day devotionals with reflection prompts and curated verse selections.",
  },
  "/community": {
    title: "Community Notes",
    description:
      "Curated scholarly notes on key passages, sourced from public-domain commentaries and patristic writings.",
  },
  "/open-questions": {
    title: "Open Questions",
    description:
      "Unresolved interpretive debates from biblical scholarship — multiple positions presented side by side.",
  },
  "/deep-analytics": {
    title: "Deep Analytics",
    description:
      "Hapax legomena, vocabulary richness, and statistical lenses on the original-language texts of Scripture.",
  },
  "/special-passages": {
    title: "Special Passages",
    description:
      "Multilingual layered views of pivotal texts — Aramaic, Hebrew, Greek, and three modern translations stacked on a single page.",
  },
  "/translation-divergence": {
    title: "Translation Divergence",
    description:
      "Where translations disagree the most, ranked. A heatmap of interpretive uncertainty across 31,000 verses.",
  },
  "/plans": {
    title: "Reading Plans",
    description:
      "Sequential reading plans (chronological, canonical, themed) with progress tracking that lives in your browser.",
  },
  "/bookmarks": {
    title: "Bookmarks",
    description: "Verses you've saved for later reading.",
  },
  "/notes": {
    title: "Personal Notes",
    description: "Private notes on individual verses, stored in your browser.",
  },
};

export function getRouteMeta(path: string): RouteMeta | undefined {
  return ROUTE_META[path];
}
