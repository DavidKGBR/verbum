import { useEffect, useState } from "react";
import { fetchBooks, type Book } from "../services/api";
import { useI18n, type Locale } from "./i18nContext";

// ─── Abbreviated book names per locale ──────────────────────────────────────
// Used in tight visuals (ArcDiagram canvas labels, arc legends, etc.) where
// the full "Gênesis"/"Apocalipsis" wouldn't fit. Each language follows its
// consagrated scholarly convention (SBB for PT-BR, RV for ES-LATAM).

const BOOK_ABBREV_PT: Record<string, string> = {
  GEN: "Gn",  EXO: "Êx",  LEV: "Lv",  NUM: "Nm",  DEU: "Dt",
  JOS: "Js",  JDG: "Jz",  RUT: "Rt",  "1SA": "1Sm", "2SA": "2Sm",
  "1KI": "1Rs", "2KI": "2Rs", "1CH": "1Cr", "2CH": "2Cr",
  EZR: "Ed",  NEH: "Ne",  EST: "Et",  JOB: "Jó",  PSA: "Sl",
  PRO: "Pv",  ECC: "Ec",  SNG: "Ct",  ISA: "Is",  JER: "Jr",
  LAM: "Lm",  EZK: "Ez",  DAN: "Dn",  HOS: "Os",  JOL: "Jl",
  AMO: "Am",  OBA: "Ob",  JNA: "Jn",  MIC: "Mq",  NAM: "Na",
  HAB: "Hc",  ZEP: "Sf",  HAG: "Ag",  ZEC: "Zc",  MAL: "Ml",
  MAT: "Mt",  MRK: "Mc",  LUK: "Lc",  JHN: "Jo",  ACT: "At",
  ROM: "Rm",  "1CO": "1Co", "2CO": "2Co", GAL: "Gl",  EPH: "Ef",
  PHP: "Fp",  COL: "Cl",  "1TH": "1Ts", "2TH": "2Ts",
  "1TI": "1Tm", "2TI": "2Tm", TIT: "Tt",  PHM: "Fm",
  HEB: "Hb",  JAS: "Tg",  "1PE": "1Pe", "2PE": "2Pe",
  "1JN": "1Jo", "2JN": "2Jo", "3JN": "3Jo", JUD: "Jd",  REV: "Ap",
};

const BOOK_ABBREV_ES: Record<string, string> = {
  GEN: "Gn",  EXO: "Éx",  LEV: "Lv",  NUM: "Nm",  DEU: "Dt",
  JOS: "Jos", JDG: "Jue", RUT: "Rt",  "1SA": "1Sm", "2SA": "2Sm",
  "1KI": "1Re", "2KI": "2Re", "1CH": "1Cr", "2CH": "2Cr",
  EZR: "Esd", NEH: "Neh", EST: "Est", JOB: "Job", PSA: "Sal",
  PRO: "Pr",  ECC: "Ecl", SNG: "Cnt", ISA: "Is",  JER: "Jer",
  LAM: "Lm",  EZK: "Ez",  DAN: "Dn",  HOS: "Os",  JOL: "Jl",
  AMO: "Am",  OBA: "Abd", JNA: "Jon", MIC: "Miq", NAM: "Nah",
  HAB: "Hab", ZEP: "Sof", HAG: "Hag", ZEC: "Zac", MAL: "Mal",
  MAT: "Mt",  MRK: "Mc",  LUK: "Lc",  JHN: "Jn",  ACT: "Hch",
  ROM: "Rom", "1CO": "1Co", "2CO": "2Co", GAL: "Gl",  EPH: "Ef",
  PHP: "Flp", COL: "Col", "1TH": "1Ts", "2TH": "2Ts",
  "1TI": "1Tm", "2TI": "2Tm", TIT: "Tit", PHM: "Flm",
  HEB: "Heb", JAS: "Stg", "1PE": "1Pe", "2PE": "2Pe",
  "1JN": "1Jn", "2JN": "2Jn", "3JN": "3Jn", JUD: "Jud", REV: "Ap",
};

/** Short book abbreviation per locale. Falls back to the canonical
 *  3-letter id (PSA, GEN, MAT) when no mapping exists (EN locale, or
 *  a new book not yet mapped). */
export function localizeBookAbbrev(bookId: string, locale: Locale): string {
  if (locale === "pt") return BOOK_ABBREV_PT[bookId] ?? bookId;
  if (locale === "es") return BOOK_ABBREV_ES[bookId] ?? bookId;
  return bookId; // EN — keep canonical 3-letter id (Gen, Psa, Mat…)
}

// ─── Portuguese (pt-br) ─────────────────────────────────────────────────────

const BOOK_NAMES_PT: Record<string, string> = {
  GEN: "Gênesis",
  EXO: "Êxodo",
  LEV: "Levítico",
  NUM: "Números",
  DEU: "Deuteronômio",
  JOS: "Josué",
  JDG: "Juízes",
  RUT: "Rute",
  "1SA": "1 Samuel",
  "2SA": "2 Samuel",
  "1KI": "1 Reis",
  "2KI": "2 Reis",
  "1CH": "1 Crônicas",
  "2CH": "2 Crônicas",
  EZR: "Esdras",
  NEH: "Neemias",
  EST: "Ester",
  JOB: "Jó",
  PSA: "Salmos",
  PRO: "Provérbios",
  ECC: "Eclesiastes",
  SNG: "Cantares",
  ISA: "Isaías",
  JER: "Jeremias",
  LAM: "Lamentações",
  EZK: "Ezequiel",
  DAN: "Daniel",
  HOS: "Oséias",
  JOL: "Joel",
  AMO: "Amós",
  OBA: "Obadias",
  JNA: "Jonas",
  MIC: "Miquéias",
  NAM: "Naum",
  HAB: "Habacuque",
  ZEP: "Sofonias",
  HAG: "Ageu",
  ZEC: "Zacarias",
  MAL: "Malaquias",
  MAT: "Mateus",
  MRK: "Marcos",
  LUK: "Lucas",
  JHN: "João",
  ACT: "Atos",
  ROM: "Romanos",
  "1CO": "1 Coríntios",
  "2CO": "2 Coríntios",
  GAL: "Gálatas",
  EPH: "Efésios",
  PHP: "Filipenses",
  COL: "Colossenses",
  "1TH": "1 Tessalonicenses",
  "2TH": "2 Tessalonicenses",
  "1TI": "1 Timóteo",
  "2TI": "2 Timóteo",
  TIT: "Tito",
  PHM: "Filemom",
  HEB: "Hebreus",
  JAS: "Tiago",
  "1PE": "1 Pedro",
  "2PE": "2 Pedro",
  "1JN": "1 João",
  "2JN": "2 João",
  "3JN": "3 João",
  JUD: "Judas",
  REV: "Apocalipse",
};

// ─── Spanish (es) ───────────────────────────────────────────────────────────

const BOOK_NAMES_ES: Record<string, string> = {
  GEN: "Génesis",
  EXO: "Éxodo",
  LEV: "Levítico",
  NUM: "Números",
  DEU: "Deuteronomio",
  JOS: "Josué",
  JDG: "Jueces",
  RUT: "Rut",
  "1SA": "1 Samuel",
  "2SA": "2 Samuel",
  "1KI": "1 Reyes",
  "2KI": "2 Reyes",
  "1CH": "1 Crónicas",
  "2CH": "2 Crónicas",
  EZR: "Esdras",
  NEH: "Nehemías",
  EST: "Ester",
  JOB: "Job",
  PSA: "Salmos",
  PRO: "Proverbios",
  ECC: "Eclesiastés",
  SNG: "Cantares",
  ISA: "Isaías",
  JER: "Jeremías",
  LAM: "Lamentaciones",
  EZK: "Ezequiel",
  DAN: "Daniel",
  HOS: "Oseas",
  JOL: "Joel",
  AMO: "Amós",
  OBA: "Abdías",
  JNA: "Jonás",
  MIC: "Miqueas",
  NAM: "Nahúm",
  HAB: "Habacuc",
  ZEP: "Sofonías",
  HAG: "Hageo",
  ZEC: "Zacarías",
  MAL: "Malaquías",
  MAT: "Mateo",
  MRK: "Marcos",
  LUK: "Lucas",
  JHN: "Juan",
  ACT: "Hechos",
  ROM: "Romanos",
  "1CO": "1 Corintios",
  "2CO": "2 Corintios",
  GAL: "Gálatas",
  EPH: "Efesios",
  PHP: "Filipenses",
  COL: "Colosenses",
  "1TH": "1 Tesalonicenses",
  "2TH": "2 Tesalonicenses",
  "1TI": "1 Timoteo",
  "2TI": "2 Timoteo",
  TIT: "Tito",
  PHM: "Filemón",
  HEB: "Hebreos",
  JAS: "Santiago",
  "1PE": "1 Pedro",
  "2PE": "2 Pedro",
  "1JN": "1 Juan",
  "2JN": "2 Juan",
  "3JN": "3 Juan",
  JUD: "Judas",
  REV: "Apocalipsis",
};

// ─── Locale → map lookup ────────────────────────────────────────────────────

const LOCALE_MAPS: Record<string, Record<string, string>> = {
  pt: BOOK_NAMES_PT,
  es: BOOK_NAMES_ES,
};

/**
 * Return the localized book name for a given book_id and locale.
 * Falls back to `fallback` (typically the English book_name from the API).
 */
export function localizeBookName(
  bookId: string,
  locale: string,
  fallback?: string,
): string {
  const map = LOCALE_MAPS[locale];
  return map?.[bookId] ?? fallback ?? bookId;
}

/**
 * Return a new Book[] with `book_name` replaced by the localized version.
 */
export function localizeBooks(books: Book[], locale: string): Book[] {
  if (locale === "en") return books;
  const map = LOCALE_MAPS[locale];
  if (!map) return books;
  return books.map((b) => ({
    ...b,
    book_name: map[b.book_id] ?? b.book_name,
  }));
}

/**
 * Hook that fetches books for a translation and localizes names to the
 * current UI locale. Re-fetches when translation changes; re-maps when
 * locale changes (no extra network call).
 */
export function useBooks(translation: string): Book[] {
  const { locale } = useI18n();
  const [raw, setRaw] = useState<Book[]>([]);
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    fetchBooks(translation).then(setRaw).catch(() => {});
  }, [translation]);

  useEffect(() => {
    setBooks(localizeBooks(raw, locale));
  }, [raw, locale]);

  return books;
}
