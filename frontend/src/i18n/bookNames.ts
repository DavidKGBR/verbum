import { useEffect, useState } from "react";
import { fetchBooks, type Book } from "../services/api";
import { useI18n } from "./i18nContext";

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
