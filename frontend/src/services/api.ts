const BASE = "/api/v1";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface Book {
  book_id: string;
  book_name: string;
  testament: string;
  category: string;
  book_position: number;
  total_chapters: number;
  total_verses: number;
  total_words: number;
  avg_sentiment: number;
}

export interface Arc {
  source_book_id: string;
  target_book_id: string;
  source_book_position: number;
  target_book_position: number;
  connection_count: number;
  avg_distance: number;
  total_votes: number;
}

export interface ArcsResponse {
  arcs: Arc[];
  metadata: {
    total_crossrefs: number;
    filtered_arcs: number;
    color_scheme: string;
  };
}

export interface SearchResult {
  verse_id: string;
  reference: string;
  text: string;
  book_id: string;
  chapter: number;
  verse: number;
  word_count: number;
  sentiment_polarity: number;
  sentiment_label: string;
}

export interface SearchResponse {
  query: string;
  translation: string;
  total_results: number;
  results: SearchResult[];
}

export interface SentimentGroup {
  testament?: string;
  book_id?: string;
  book_name?: string;
  category?: string;
  book_position?: number;
  verses: number;
  avg_sentiment: number;
  positive: number;
  negative: number;
  neutral: number;
}

export interface SentimentResponse {
  group_by: string;
  translation: string;
  total_groups: number;
  data: SentimentGroup[];
}

export interface TranslationStat {
  translation_id: string;
  language: string;
  books: number;
  verses: number;
  total_words: number;
  avg_sentiment: number;
}

// ── API calls ────────────────────────────────────────────────────────────────

export function fetchBooks(translation = "kjv") {
  return fetchJson<Book[]>(`${BASE}/books?translation=${translation}`);
}

export function fetchArcs(
  sourceBook?: string,
  minConnections = 1,
  colorBy = "distance"
) {
  const params = new URLSearchParams({ min_connections: String(minConnections), color_by: colorBy });
  if (sourceBook) params.set("source_book", sourceBook);
  return fetchJson<ArcsResponse>(`${BASE}/crossrefs/arcs?${params}`);
}

export function fetchSentiment(groupBy = "testament", translation = "kjv") {
  return fetchJson<SentimentResponse>(
    `${BASE}/analytics/sentiment?group_by=${groupBy}&translation=${translation}`
  );
}

export function fetchTranslationStats() {
  return fetchJson<{ translations: TranslationStat[] }>(
    `${BASE}/analytics/translations`
  );
}

export function searchVerses(
  q: string,
  translation = "kjv",
  book?: string,
  limit = 50
) {
  const params = new URLSearchParams({ q, translation, limit: String(limit) });
  if (book) params.set("book", book);
  return fetchJson<SearchResponse>(`${BASE}/verses/search?${params}`);
}

// ── Reader ───────────────────────────────────────────────────────────────────

export interface ReaderVerse {
  verse: number;
  text: string;
  reference: string;
  verse_id: string;
  word_count: number;
  sentiment_polarity: number;
  sentiment_label: string;
}

export interface ReaderPage {
  book_id: string;
  book_name: string;
  chapter: number;
  translation: string;
  testament: string;
  category: string;
  total_chapters: number;
  verse_count: number;
  has_previous: boolean;
  has_next: boolean;
  verses: ReaderVerse[];
}

export interface ParallelVerse {
  verse: number;
  left_text: string | null;
  right_text: string | null;
  left_sentiment: string | null;
  right_sentiment: string | null;
}

export interface ParallelPage {
  book_id: string;
  book_name: string;
  chapter: number;
  left_translation: string;
  right_translation: string;
  verse_count: number;
  verses: ParallelVerse[];
}

export function fetchReaderPage(book: string, chapter: number, translation = "kjv") {
  return fetchJson<ReaderPage>(
    `${BASE}/reader/page?book=${book}&chapter=${chapter}&translation=${translation}`
  );
}

export function fetchParallelPage(
  book: string,
  chapter: number,
  left = "kjv",
  right = "nvi"
) {
  return fetchJson<ParallelPage>(
    `${BASE}/reader/parallel?book=${book}&chapter=${chapter}&left=${left}&right=${right}`
  );
}

// ── Cross-refs (detailed) ────────────────────────────────────────────────────

export interface DetailedCrossRef {
  source_verse_id: string;
  target_verse_id: string;
  votes: number;
  reference_type: string;
  source_text: string | null;
  target_text: string | null;
  source_ref: string | null;
  target_ref: string | null;
}

export interface VerseCrossRef {
  target_verse_id: string;
  target_book_id: string;
  target_book_name: string | null;
  target_text: string | null;
  votes: number;
  reference_type: string;
}

export function fetchCrossrefsBetween(sourceBook: string, targetBook: string, limit = 50) {
  return fetchJson<{ source_book: string; target_book: string; total: number; crossrefs: DetailedCrossRef[] }>(
    `${BASE}/crossrefs/between?source_book=${sourceBook}&target_book=${targetBook}&limit=${limit}`
  );
}

export function fetchVerseCrossrefs(verseId: string) {
  return fetchJson<{ verse_id: string; outgoing: VerseCrossRef[]; incoming: VerseCrossRef[]; total: number }>(
    `${BASE}/crossrefs/${verseId}`
  );
}

export function fetchVerseTranslations(verseId: string, translations = "kjv,nvi,rvr") {
  return fetchJson<{ verse_id: string; translations: Record<string, string> }>(
    `${BASE}/verses/${verseId}/translations?translations=${translations}`
  );
}

export function fetchRandomVerse(translation = "kjv") {
  return fetchJson<{ verse_id: string; reference: string; text: string; book_id: string; book_name: string; chapter: number; verse: number }>(
    `${BASE}/verses/random?translation=${translation}`
  );
}
