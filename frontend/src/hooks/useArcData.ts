import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchBooks, fetchArcs, type Book, type Arc } from "../services/api";
import { localizeBooks } from "../i18n/bookNames";
import { useI18n } from "../i18n/i18nContext";

export interface ArcFilters {
  sourceBook: string;
  targetBook: string;
  minConnections: number;
  colorBy: "distance" | "testament" | "category";
}

export interface ArcData {
  books: Book[];
  arcs: Arc[];
  totalCrossrefs: number;
  loading: boolean;
  error: string | null;
  filters: ArcFilters;
  setFilters: (f: Partial<ArcFilters>) => void;
}

const DEFAULT_FILTERS: ArcFilters = {
  sourceBook: "",
  targetBook: "",
  minConnections: 3,
  colorBy: "distance",
};

const VALID_COLOR_BY = ["distance", "testament", "category"] as const;
type ColorBy = (typeof VALID_COLOR_BY)[number];

export function useArcData(): ArcData {
  const { locale } = useI18n();
  const [params] = useSearchParams();
  const [raw, setRaw] = useState<Book[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [totalCrossrefs, setTotalCrossrefs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Seed filters from the URL on first mount so deep-links like
  // /connections?tab=arc&sourceBook=JHN land on the right pre-selection.
  const [filters, setFiltersState] = useState<ArcFilters>(() => {
    const colorBy = params.get("colorBy");
    return {
      sourceBook: (params.get("sourceBook") ?? "").toUpperCase(),
      targetBook: (params.get("targetBook") ?? "").toUpperCase(),
      minConnections: Number(params.get("minConnections")) || DEFAULT_FILTERS.minConnections,
      colorBy: (VALID_COLOR_BY as readonly string[]).includes(colorBy ?? "")
        ? (colorBy as ColorBy)
        : DEFAULT_FILTERS.colorBy,
    };
  });

  const setFilters = (partial: Partial<ArcFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  };

  // Fetch books once
  useEffect(() => {
    fetchBooks("kjv")
      .then(setRaw)
      .catch((e) => setError(e.message));
  }, []);

  // Re-localize when raw data or locale changes
  useEffect(() => {
    setBooks(localizeBooks(raw, locale));
  }, [raw, locale]);

  // Fetch arcs when filters change
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchArcs(
      filters.sourceBook || undefined,
      filters.minConnections,
      filters.colorBy,
      filters.targetBook || undefined
    )
      .then((data) => {
        setArcs(data.arcs);
        setTotalCrossrefs(data.metadata.total_crossrefs);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters.sourceBook, filters.targetBook, filters.minConnections, filters.colorBy]);

  return { books, arcs, totalCrossrefs, loading, error, filters, setFilters };
}
