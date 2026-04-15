import type { Book } from "../../services/api";

export type PlanId =
  | "bible-1-year"
  | "nt-90-days"
  | "psalms-30-days"
  | "proverbs-31-days"
  | "gospels-40-days";

export interface ChapterRef {
  book_id: string;
  book_name: string;
  chapter: number;
  chapter_id: string; // "GEN.1"
}

export interface DayReading {
  day: number; // 1-based
  chapters: ChapterRef[];
}

export interface PlanDefinition {
  id: PlanId;
  titleKey: string;
  subtitleKey: string;
  descriptionKey: string;
  icon: string; // Heroicon SVG path data
  total_days: number;
  /** Pure function: expands a book catalog into the per-day reading schedule. */
  buildSchedule(books: Book[]): DayReading[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function chapterRefs(books: Book[]): ChapterRef[] {
  const refs: ChapterRef[] = [];
  for (const b of books) {
    for (let c = 1; c <= b.total_chapters; c++) {
      refs.push({
        book_id: b.book_id,
        book_name: b.book_name,
        chapter: c,
        chapter_id: `${b.book_id}.${c}`,
      });
    }
  }
  return refs;
}

/**
 * Distribute `chapters` across `totalDays`. The first `remainder` days get
 * `base + 1` chapters and the rest get `base`, so heavier days come first
 * (avoids a trailing day with only 1 chapter when totals are tight).
 */
function chunkChapters(
  chapters: ChapterRef[],
  totalDays: number
): DayReading[] {
  if (totalDays <= 0) return [];
  const base = Math.floor(chapters.length / totalDays);
  const remainder = chapters.length % totalDays;

  const schedule: DayReading[] = [];
  let cursor = 0;
  for (let day = 1; day <= totalDays; day++) {
    const size = base + (day <= remainder ? 1 : 0);
    const slice = chapters.slice(cursor, cursor + size);
    cursor += size;
    schedule.push({ day, chapters: slice });
  }
  return schedule;
}

function sortByPosition(books: Book[]): Book[] {
  return [...books].sort((a, b) => a.book_position - b.book_position);
}

// ─── SVG icon paths (Heroicons Outline 24×24) ──────────────────────────────

const ICON_BOOK_OPEN =
  "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253";

const ICON_HEART =
  "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z";

const ICON_MUSICAL_NOTE =
  "M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z";

const ICON_LIGHT_BULB =
  "M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18";

const ICON_SPARKLES =
  "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z";

// ─── Plan definitions ────────────────────────────────────────────────────────

export const PLANS: PlanDefinition[] = [
  {
    id: "bible-1-year",
    titleKey: "plans.bible1year.title",
    subtitleKey: "plans.bible1year.subtitle",
    descriptionKey: "plans.bible1year.description",
    icon: ICON_BOOK_OPEN,
    total_days: 365,
    buildSchedule(books) {
      return chunkChapters(chapterRefs(sortByPosition(books)), 365);
    },
  },
  {
    id: "nt-90-days",
    titleKey: "plans.nt90days.title",
    subtitleKey: "plans.nt90days.subtitle",
    descriptionKey: "plans.nt90days.description",
    icon: ICON_HEART,
    total_days: 90,
    buildSchedule(books) {
      const nt = sortByPosition(
        books.filter((b) => b.testament === "New Testament")
      );
      return chunkChapters(chapterRefs(nt), 90);
    },
  },
  {
    id: "psalms-30-days",
    titleKey: "plans.psalms30days.title",
    subtitleKey: "plans.psalms30days.subtitle",
    descriptionKey: "plans.psalms30days.description",
    icon: ICON_MUSICAL_NOTE,
    total_days: 30,
    buildSchedule(books) {
      const psa = books.filter((b) => b.book_id === "PSA");
      return chunkChapters(chapterRefs(psa), 30);
    },
  },
  {
    id: "proverbs-31-days",
    titleKey: "plans.proverbs31days.title",
    subtitleKey: "plans.proverbs31days.subtitle",
    descriptionKey: "plans.proverbs31days.description",
    icon: ICON_LIGHT_BULB,
    total_days: 31,
    buildSchedule(books) {
      const pro = books.filter((b) => b.book_id === "PRO");
      return chunkChapters(chapterRefs(pro), 31);
    },
  },
  {
    id: "gospels-40-days",
    titleKey: "plans.gospels40days.title",
    subtitleKey: "plans.gospels40days.subtitle",
    descriptionKey: "plans.gospels40days.description",
    icon: ICON_SPARKLES,
    total_days: 40,
    buildSchedule(books) {
      const gospelIds = new Set(["MAT", "MRK", "LUK", "JHN"]);
      const gospels = sortByPosition(books.filter((b) => gospelIds.has(b.book_id)));
      return chunkChapters(chapterRefs(gospels), 40);
    },
  },
];

export function getPlanById(id: PlanId): PlanDefinition | undefined {
  return PLANS.find((p) => p.id === id);
}
