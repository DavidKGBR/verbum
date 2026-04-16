const BASE = "/api/v1";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

// ── Emotional Landscape ────────────────────────────────────────────────────

export interface EmotionalPoint {
  verse_id: string;
  chapter: number;
  verse: number;
  polarity: number;
  label: string;
}

export interface EmotionalPeak {
  verse_id: string;
  reference: string;
  chapter: number;
  verse: number;
  text: string;
  polarity: number;
  label: string;
}

export interface BookProfile {
  book_id: string;
  book_name: string;
  testament: string;
  category: string;
  verse_count: number;
  avg_polarity: number;
  min_polarity: number;
  max_polarity: number;
  positive: number;
  negative: number;
  neutral: number;
}

export async function fetchEmotionalLandscape(
  book: string,
  translation = "kjv"
): Promise<{ book_id: string; translation: string; total_verses: number; series: EmotionalPoint[] }> {
  return fetchJson(`${BASE}/emotional/landscape?book=${book}&translation=${translation}`);
}

export async function fetchEmotionalPeaks(
  book: string,
  emotion = "positive",
  limit = 20,
  translation = "kjv"
): Promise<{ book_id: string; emotion: string; results: EmotionalPeak[] }> {
  return fetchJson(
    `${BASE}/emotional/peaks?book=${book}&emotion=${emotion}&limit=${limit}&translation=${translation}`
  );
}

export async function fetchBookProfiles(
  translation = "kjv"
): Promise<{ profiles: BookProfile[] }> {
  return fetchJson(`${BASE}/emotional/book-profiles?translation=${translation}`);
}

// ── Community Notes ────────────────────────────────────────────────────────

export interface CommunityNote {
  id: string;
  verse_id: string;
  title: string;
  title_pt?: string;
  title_es?: string;
  content: string;
  content_pt?: string;
  content_es?: string;
  /** Category ID in EN (theology/language/culture/interpretation/prophecy). Translated via i18n key `community.category.{id}`. */
  category: string;
  author: string;
  date: string;
}

export interface CommunityStats {
  total_notes: number;
  unique_verses: number;
  categories: Record<string, number>;
}

export async function fetchCommunityNotes(
  verseId: string
): Promise<{ verse_id: string; count: number; notes: CommunityNote[] }> {
  return fetchJson(`${BASE}/community/notes?verse_id=${encodeURIComponent(verseId)}`);
}

export async function fetchRecentNotes(
  limit = 20
): Promise<{ count: number; notes: CommunityNote[] }> {
  return fetchJson(`${BASE}/community/recent?limit=${limit}`);
}

export async function fetchCommunityStats(): Promise<CommunityStats> {
  return fetchJson(`${BASE}/community/stats`);
}

// ── Deep Analytics ──────────────────────────────────────────────────────────

export interface HapaxResult {
  strongs_id: string;
  original_word: string;
  transliteration: string;
  gloss: string;
  lemma: string;
  language: string;
  verse_id: string;
  reference: string;
  verse_text: string;
  book_id: string;
}

export interface VocabRichnessBook {
  book_id: string;
  book_name: string;
  testament: string;
  unique_words: number;
  total_words: number;
  verse_count: number;
  richness: number;
}

export async function fetchHapax(
  params?: { book?: string; language?: string; limit?: number }
): Promise<HapaxResult[]> {
  const sp = new URLSearchParams();
  if (params?.book) sp.set("book", params.book);
  if (params?.language) sp.set("language", params.language);
  if (params?.limit) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  const data = await fetchJson<{ results: HapaxResult[] }>(
    `${BASE}/analytics/hapax${qs ? `?${qs}` : ""}`
  );
  return data.results;
}

export async function fetchVocabularyRichness(): Promise<VocabRichnessBook[]> {
  const data = await fetchJson<{ books: VocabRichnessBook[] }>(
    `${BASE}/analytics/vocabulary-richness`
  );
  return data.books;
}

// ── Intertextuality ────────────────────────────────────────────────────────

export interface QuotationEdge {
  source: string;
  target: string;
  source_verse: string;
  target_verse: string;
  votes: number;
}

export interface HeatmapCell {
  source: string;
  target: string;
  count: number;
}

export async function fetchOtNtQuotations(): Promise<{
  total_edges: number;
  edges: QuotationEdge[];
}> {
  return fetchJson(`${BASE}/intertextuality/quotations`);
}

export async function fetchCitationHeatmap(): Promise<{
  ot_books: string[];
  nt_books: string[];
  cells: HeatmapCell[];
}> {
  return fetchJson(`${BASE}/intertextuality/heatmap`);
}

// ── Open Questions ─────────────────────────────────────────────────────────

export interface OpenQuestion {
  id: string;
  title: string;
  title_pt?: string;
  title_es?: string;
  /** Category in EN ("Identity", "Authorship", "Textual Criticism", ...). Translated via i18n key `openQuestions.category.{slug}`. */
  category: string;
  /** Difficulty in EN ("beginner" | "intermediate" | "advanced"). Translated via `openQuestions.difficulty.{level}`. */
  difficulty: string;
  verse_refs: string[];
}

export interface OpenQuestionDetail extends OpenQuestion {
  description: string;
  description_pt?: string;
  description_es?: string;
  perspectives: {
    view: string;
    view_pt?: string;
    view_es?: string;
    support: string;
    support_pt?: string;
    support_es?: string;
  }[];
  related_strongs: string[];
}

export async function fetchOpenQuestions(
  category?: string
): Promise<{ total: number; categories: string[]; results: OpenQuestion[] }> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  return fetchJson(`${BASE}/open-questions${qs}`);
}

export async function fetchOpenQuestion(id: string): Promise<OpenQuestionDetail> {
  return fetchJson(`${BASE}/open-questions/${id}`);
}

// ── Semantic Threads ───────────────────────────────────────────────────────

export interface SemanticThread {
  id: string;
  semantic_tag: string;
  verse_count: number;
  book_count: number;
  word_count: number;
  strength_score: number;
}

export interface ThreadVerse {
  verse_id: string;
  book_id: string;
  reference: string;
  verse_text: string;
  transliteration: string;
  gloss: string;
  chapter: number;
  verse: number;
}

export interface ThreadDetail {
  id: string;
  semantic_tag: string;
  total_verses: number;
  book_count: number;
  books: { book_id: string; count: number }[];
  verses: ThreadVerse[];
}

export async function fetchThreads(
  minBooks = 3,
  limit = 50
): Promise<SemanticThread[]> {
  const data = await fetchJson<{ threads: SemanticThread[] }>(
    `${BASE}/threads?min_books=${minBooks}&limit=${limit}`
  );
  return data.threads;
}

export async function fetchThread(id: string): Promise<ThreadDetail> {
  return fetchJson(`${BASE}/threads/${id}`);
}

// ── Literary Structure ─────────────────────────────────────────────────────

export interface StructureElement {
  label: string;
  label_pt?: string;
  label_es?: string;
  verse_start: number;
  verse_end: number;
  summary: string;
  summary_pt?: string;
  summary_es?: string;
  text_preview?: string;
}

export interface LiteraryStructure {
  structure_id: string;
  book_id: string;
  chapter_start: number;
  chapter_end: number;
  /** Structure type ID (chiasm/parallelism/inclusio). Translated via i18n `structure.type.{id}`. */
  type: "chiasm" | "parallelism" | "inclusio";
  title: string;
  title_pt?: string;
  title_es?: string;
  confidence?: number;
  description?: string;
  description_pt?: string;
  description_es?: string;
  elements?: StructureElement[];
}

export async function fetchAllStructures(
  type?: string
): Promise<LiteraryStructure[]> {
  const qs = type ? `?structure_type=${type}` : "";
  const data = await fetchJson<{ structures: LiteraryStructure[] }>(
    `${BASE}/structure/all${qs}`
  );
  return data.structures;
}

export async function fetchChiasms(
  book?: string
): Promise<LiteraryStructure[]> {
  const qs = book ? `?book=${book}` : "";
  const data = await fetchJson<{ chiasms: LiteraryStructure[] }>(
    `${BASE}/structure/chiasms${qs}`
  );
  return data.chiasms;
}

export async function fetchBookStructures(
  book: string
): Promise<LiteraryStructure[]> {
  const data = await fetchJson<{ structures: LiteraryStructure[] }>(
    `${BASE}/structure/${book}`
  );
  return data.structures;
}

export async function fetchChapterStructures(
  book: string,
  chapter: number,
  translation = "kjv"
): Promise<LiteraryStructure[]> {
  const data = await fetchJson<{ structures: LiteraryStructure[] }>(
    `${BASE}/structure/${book}/${chapter}?translation=${translation}`
  );
  return data.structures;
}

// ── Devotional ──────────────────────────────────────────────────────────────

export interface DevotionalPlan {
  id: string;
  title: string;
  description: string;
  days: number;
}

export interface OriginalTerm {
  text: string;
  transliteration: string;
  language: "hebrew" | "greek";
  strong: string;
  meaning: string;
}

export interface DevotionalReading {
  day: number;
  title: string;
  passage: string;
  reflection: string;
  original_term?: OriginalTerm;
}

export interface DevotionalPlanFull extends DevotionalPlan {
  readings: DevotionalReading[];
}

export interface DevotionalDayReading extends DevotionalReading {
  plan_id: string;
  plan_title: string;
  translation: string;
  verses: { verse_id: string; book_name: string; chapter: number; verse: number; text: string; reference: string }[];
}

export async function fetchDevotionalPlans(lang: string = "en"): Promise<DevotionalPlan[]> {
  const data = await fetchJson<{ plans: DevotionalPlan[] }>(
    `${BASE}/devotional/plans?lang=${encodeURIComponent(lang)}`,
  );
  return data.plans;
}

export async function fetchDevotionalPlan(
  planId: string,
  lang: string = "en",
): Promise<DevotionalPlanFull> {
  return fetchJson<DevotionalPlanFull>(
    `${BASE}/devotional/plans/${planId}?lang=${encodeURIComponent(lang)}`,
  );
}

export async function fetchDevotionalDay(
  planId: string,
  day: number,
  translation: string = "kjv",
  lang: string = "en",
): Promise<DevotionalDayReading> {
  return fetchJson<DevotionalDayReading>(
    `${BASE}/devotional/plans/${planId}/day/${day}?translation=${translation}&lang=${encodeURIComponent(lang)}`,
  );
}

// ── Topics ──────────────────────────────────────────────────────────────────

export interface Topic {
  topic_id: string;
  name: string;
  slug: string;
  verse_count: number;
}

export interface TopicVerse {
  verse_id: string;
  book_name: string | null;
  book_id: string | null;
  chapter: number | null;
  verse: number | null;
  text: string | null;
  reference: string | null;
}

export interface TopicDetail extends Topic {
  translation: string;
  verses: TopicVerse[];
}

export async function fetchTopics(
  params?: { q?: string; limit?: number; offset?: number }
): Promise<{ total: number; results: Topic[] }> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.offset) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  return fetchJson(`${BASE}/topics${qs ? `?${qs}` : ""}`);
}

export async function fetchPopularTopics(limit = 20): Promise<{ results: Topic[] }> {
  return fetchJson(`${BASE}/topics/popular?limit=${limit}`);
}

export async function fetchTopic(slug: string, translation = "kjv"): Promise<TopicDetail> {
  return fetchJson(`${BASE}/topics/${slug}?translation=${translation}`);
}

// ── Compare ─────────────────────────────────────────────────────────────────

export interface ComparePreset {
  id: string;
  title: string;
  title_pt?: string;
  title_es?: string;
  passage_count: number;
  labels: string[];
}

export interface CompareVerse {
  verse_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface CompareColumn {
  label: string;
  range: string;
  verses: CompareVerse[];
  verse_count: number;
}

export interface CompareResult {
  id?: string;
  title?: string;
  title_pt?: string;
  title_es?: string;
  translation: string;
  columns: CompareColumn[];
}

export async function fetchComparePresets(): Promise<ComparePreset[]> {
  const data = await fetchJson<{ presets: ComparePreset[] }>(`${BASE}/compare/presets`);
  return data.presets;
}

export async function fetchComparePreset(
  presetId: string,
  translation = "kjv"
): Promise<CompareResult> {
  return fetchJson<CompareResult>(
    `${BASE}/compare/presets/${presetId}?translation=${translation}`
  );
}

export async function fetchCompareCustom(
  passages: string[],
  translation = "kjv"
): Promise<CompareResult> {
  return fetchJson<CompareResult>(
    `${BASE}/compare/custom?passages=${passages.join(",")}&translation=${translation}`
  );
}

// ── Timeline ────────────────────────────────────────────────────────────────

export interface TimelineEra {
  id: string;
  name: string;
  start: number;
  end: number;
  color: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  year: number;
  era?: string | null;
  category?: string | null;
  description?: string | null;
  type: "biblical" | "secular";
  participants?: string[];
  locations?: string[];
}

export interface CombinedTimeline {
  year_min: number;
  year_max: number;
  biblical: TimelineEvent[];
  secular: TimelineEvent[];
  eras: TimelineEra[];
}

export async function fetchCombinedTimeline(
  yearMin = -2200,
  yearMax = 100
): Promise<CombinedTimeline> {
  return fetchJson<CombinedTimeline>(
    `${BASE}/timeline/combined?year_min=${yearMin}&year_max=${yearMax}`
  );
}

// ── Places ──────────────────────────────────────────────────────────────────

export interface PlaceImage {
  image_id: string;
  file_url: string;
  thumbnail_url: string | null;
  hero_url?: string | null;
  description: string | null;
  license: string;
  credit: string;
  credit_url: string;
  width: number | null;
  height: number | null;
}

export interface BiblicalPlace {
  place_id: string;
  slug: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  geo_confidence: number | null;
  place_type: string | null;
  description: string | null;
  also_called: string[] | null;
  verse_count: number;
  thumbnail_url?: string | null;
  images?: PlaceImage[];
  events?: { event_id: string; title: string; start_year: number | null; era: string | null }[];
}

export interface PlacesListResponse {
  total: number;
  limit: number;
  offset: number;
  results: BiblicalPlace[];
}

export interface PlaceTypeCount {
  place_type: string;
  count: number;
}

export async function fetchPlaces(
  params?: { q?: string; place_type?: string; has_coords?: boolean; limit?: number; offset?: number }
): Promise<PlacesListResponse> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.place_type) sp.set("place_type", params.place_type);
  if (params?.has_coords !== undefined) sp.set("has_coords", String(params.has_coords));
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.offset) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  return fetchJson<PlacesListResponse>(`${BASE}/places${qs ? `?${qs}` : ""}`);
}

export async function fetchPlace(slug: string): Promise<BiblicalPlace> {
  return fetchJson<BiblicalPlace>(`${BASE}/places/${slug}`);
}

export async function fetchPlaceTypes(): Promise<PlaceTypeCount[]> {
  const data = await fetchJson<{ types: PlaceTypeCount[] }>(`${BASE}/places/types`);
  return data.types;
}

// ── People ──────────────────────────────────────────────────────────────────

export interface BiblicalPerson {
  person_id: string;
  slug: string;
  name: string;
  gender: string | null;
  birth_year: number | null;
  death_year: number | null;
  description: string | null;
  also_called: string[] | null;
  tribe: string | null;
  occupation: string | null;
  books_mentioned: string[] | null;
  verse_count: number;
  min_year: number | null;
  max_year: number | null;
}

export interface PeopleListResponse {
  total: number;
  limit: number;
  offset: number;
  results: BiblicalPerson[];
}

export interface FamilyMember {
  slug: string;
  name: string;
  gender: string | null;
}

export interface FamilyResponse {
  person: string;
  relations: Record<string, FamilyMember[]>;
}

export async function fetchPeople(
  params?: { q?: string; gender?: string; book?: string; limit?: number; offset?: number }
): Promise<PeopleListResponse> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.gender) sp.set("gender", params.gender);
  if (params?.book) sp.set("book", params.book);
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.offset) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  return fetchJson<PeopleListResponse>(`${BASE}/people${qs ? `?${qs}` : ""}`);
}

export async function fetchPerson(slug: string): Promise<BiblicalPerson> {
  return fetchJson<BiblicalPerson>(`${BASE}/people/${slug}`);
}

export async function fetchPersonFamily(slug: string): Promise<FamilyResponse> {
  return fetchJson<FamilyResponse>(`${BASE}/people/${slug}/family`);
}

export interface PersonEvent {
  event_id: string;
  title: string;
  start_year: number | null;
  era: string | null;
  duration: number | null;
  participants: string[];
  locations: string[];
  verse_refs: string[];
}

export async function fetchPersonEvents(
  slug: string
): Promise<{ person: string; events: PersonEvent[] }> {
  return fetchJson(`${BASE}/people/${slug}/events`);
}

// ── Authors ─────────────────────────────────────────────────────────────────

export interface Author {
  author_id: string;
  name: string;
  name_pt?: string;
  name_es?: string;
  period: string;
  period_pt?: string;
  period_es?: string;
  testament: string;
  books: string[];
  literary_style: string;
  literary_style_pt?: string;
  literary_style_es?: string;
  description: string;
  description_pt?: string;
  description_es?: string;
}

export interface AuthorTopWord {
  strongs_id: string;
  transliteration: string;
  gloss: string;
  occurrences: number;
}

export interface AuthorStats {
  unique_strongs: number;
  total_words: number;
  total_verses: number;
  top_words: AuthorTopWord[];
}

export interface AuthorDetail extends Author {
  stats: AuthorStats;
}

export async function fetchAuthors(testament?: string): Promise<Author[]> {
  const params = testament ? `?testament=${testament}` : "";
  const data = await fetchJson<{ authors: Author[] }>(`${BASE}/authors${params}`);
  return data.authors;
}

export async function fetchAuthorDetail(authorId: string): Promise<AuthorDetail> {
  return fetchJson<AuthorDetail>(`${BASE}/authors/${authorId}`);
}

export interface AuthorBookStats {
  book_id: string;
  book_name: string;
  testament: string;
  category: string;
  total_chapters: number;
  total_verses: number;
  total_words: number;
  avg_words_per_verse: number;
  avg_sentiment: number;
}

export async function fetchAuthorBooks(
  authorId: string
): Promise<AuthorBookStats[]> {
  const data = await fetchJson<{ author_id: string; books: AuthorBookStats[] }>(
    `${BASE}/authors/${authorId}/books`
  );
  return data.books;
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
  colorBy = "distance",
  targetBook?: string
) {
  const params = new URLSearchParams({ min_connections: String(minConnections), color_by: colorBy });
  if (sourceBook) params.set("source_book", sourceBook);
  if (targetBook) params.set("target_book", targetBook);
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
  text_clean?: string;
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
  left_text_clean?: string | null;
  right_text_clean?: string | null;
  left_sentiment: string | null;
  right_sentiment: string | null;
}

export interface ParallelPage {
  book_id: string;
  book_name: string;
  chapter: number;
  total_chapters: number;
  left_translation: string;
  right_translation: string;
  verse_count: number;
  has_previous: boolean;
  has_next: boolean;
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

export interface RandomVerse {
  verse_id: string;
  reference: string;
  text: string;
  text_clean?: string;
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  sentiment_label?: string;
}

// ── Home Stats ─────────────────────────────────────────────────────────────

export interface HomeStatsNote {
  id: string;
  verse_id: string;
  title: string;
  category: string;
  date: string;
}

export interface HomeStatsQuestion {
  id: string;
  title: string;
  category: string;
}

export interface HomeStats {
  people_count: number;
  places_count: number;
  topics_count: number;
  structures_count: number;
  questions_count: number;
  community_notes_count: number;
  recent_notes: HomeStatsNote[];
  recent_questions: HomeStatsQuestion[];
}

export async function fetchHomeStats(): Promise<HomeStats> {
  return fetchJson<HomeStats>(`${BASE}/home/stats`);
}

export function fetchRandomVerse(translation = "kjv") {
  return fetchJson<RandomVerse>(
    `${BASE}/verses/random?translation=${translation}`
  );
}

// ── Cross-ref counts (per chapter) ──────────────────────────────────────────

export function fetchCrossrefCounts(book: string, chapter: number) {
  return fetchJson<{ book: string; chapter: number; counts: Record<string, number> }>(
    `${BASE}/crossrefs/counts?book=${book}&chapter=${chapter}`
  );
}

// ── Lexicon & Interlinear ───────────────────────────────────────────────────

export interface StrongsEntry {
  strongs_id: string;
  language: string;
  original: string;
  transliteration: string;
  pronunciation: string;
  short_definition: string;
  long_definition: string;
  part_of_speech: string;
  /** URL do MP3 Neural2 (Fase 5A). Null se ainda não gerado. */
  audio_url?: string | null;
  /** True when short_definition / long_definition are in the requested locale (R3.6). */
  is_translated?: boolean;
}

export interface InterlinearWord {
  verse_id: string;
  word_position: number;
  language: 'hebrew' | 'greek';
  source: string;
  original_word: string;
  transliteration: string;
  english: string;
  strongs_id: string;
  strongs_raw: string;
  grammar: string;
  lemma: string;
  gloss: string;
  semantic_tag: string;
}

export interface InterlinearChapterResponse {
  book_id: string;
  chapter: number;
  total_words: number;
  words: InterlinearWord[];
}

export function fetchInterlinearChapter(book: string, chapter: number) {
  return fetchJson<InterlinearChapterResponse>(
    `${BASE}/interlinear/chapter/${book}/${chapter}`
  );
}

export function fetchStrongs(strongsId: string, lang?: string) {
  const langParam = lang && lang !== "en" ? `?lang=${lang}` : "";
  return fetchJson<StrongsEntry>(`${BASE}/strongs/${strongsId}${langParam}`);
}

export function fetchVersesByStrongs(strongsId: string, limit = 5) {
  return fetchJson<{ strongs_id: string; total_results: number; verses: any[] }>(
    `${BASE}/words/${strongsId}/verses?limit=${limit}`
  );
}

export interface BookFrequency {
  book_id: string;
  book_name: string;
  testament: string;
  frequency: number;
}

export interface WordDistribution {
  strongs_id: string;
  total_occurrences: number;
  distribution: BookFrequency[];
}

export function fetchWordDistribution(strongsId: string) {
  return fetchJson<WordDistribution>(
    `${BASE}/words/${strongsId}/distribution`
  );
}

// ── Bible Dictionary ────────────────────────────────────────────────────────

export interface DictEntry {
  slug: string;
  name: string;
  source: string;
  text_easton: string | null;
  text_smith: string | null;
  preview?: string;
}

export function fetchDictionaryEntry(slug: string) {
  return fetchJson<DictEntry>(`${BASE}/dictionary/${slug}`);
}

export function searchDictionary(q: string, limit = 50) {
  return fetchJson<{ query: string; total_results: number; results: DictEntry[] }>(
    `${BASE}/dictionary/search?q=${encodeURIComponent(q)}&limit=${limit}`
  );
}

// ── Semantic Graph (legacy) ─────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  gloss: string;
  language: string;
  shared?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface SemanticGraph {
  center: GraphNode;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function fetchSemanticGraph(
  center: string,
  minShared = 5,
  limit = 30,
  excludeCommon = true
) {
  return fetchJson<SemanticGraph>(
    `${BASE}/semantic/graph?center=${center}&min_shared=${minShared}&limit=${limit}&exclude_common=${excludeCommon}`
  );
}

// ── Semantic Explorer ──────────────────────────────────────────────────────

export interface ExplorerSearchResult {
  type: string;
  id: string;
  label: string;
  secondary_label: string | null;
  meta: Record<string, unknown>;
}

export interface ExplorerNodeData {
  type: string;
  id: string;
  label: string;
  gloss?: string;
  language?: string;
  shared?: number;
}

export interface ExplorerEdgeData {
  source: string;
  target: string;
  edge_type: string;
  weight: number;
}

export interface ExplorerExpandResponse {
  center: ExplorerNodeData;
  nodes: ExplorerNodeData[];
  edges: ExplorerEdgeData[];
}

export interface ExplorerEvidenceVerse {
  verse_id: string;
  reference: string;
  text: string;
  highlights: string[];
}

export interface ExplorerEdgeEvidence {
  source: string;
  target: string;
  edge_type: string;
  total_shared: number;
  verses: ExplorerEvidenceVerse[];
}

export interface ExplorerPresetEntry {
  type: string;
  id: string;
}

export interface ExplorerPreset {
  id: string;
  label: string;
  label_pt?: string;
  label_es?: string;
  description: string;
  description_pt?: string;
  description_es?: string;
  /** Semantic icon name (e.g. "heart", "scroll") — rendered by PresetIcon. */
  icon: string;
  entry_nodes: ExplorerPresetEntry[];
}

export function fetchExplorerSearch(q: string, limit = 20) {
  return fetchJson<{ results: ExplorerSearchResult[] }>(
    `${BASE}/explorer/search?q=${encodeURIComponent(q)}&limit=${limit}`
  );
}

export function fetchExplorerExpand(
  nodeType: string,
  nodeId: string,
  layers = "lexical,topics",
  limit = 30
) {
  return fetchJson<ExplorerExpandResponse>(
    `${BASE}/explorer/expand?node_type=${nodeType}&node_id=${encodeURIComponent(nodeId)}&layers=${layers}&limit=${limit}`
  );
}

export function fetchExplorerEdgeEvidence(
  sourceType: string,
  sourceId: string,
  targetType: string,
  targetId: string,
  edgeType: string,
  limit = 10,
  translation = "kjv"
) {
  return fetchJson<ExplorerEdgeEvidence>(
    `${BASE}/explorer/edge-evidence?source_type=${sourceType}&source_id=${encodeURIComponent(sourceId)}&target_type=${targetType}&target_id=${encodeURIComponent(targetId)}&edge_type=${edgeType}&limit=${limit}&translation=${translation}`
  );
}

export function fetchExplorerPresets() {
  return fetchJson<{ presets: ExplorerPreset[] }>(`${BASE}/explorer/presets`);
}

// ── Translation Divergence ───────────────────────────────────────────────────

export interface DivergenceVerse {
  verse_id: string;
  reference: string;
  texts: Record<string, string>;
}

export interface DivergenceResult {
  strongs_id: string;
  gloss: string;
  translations_shown: string[];
  total_verses: number;
  verses: DivergenceVerse[];
}

export function fetchDivergence(
  strongsId: string,
  translations = "kjv,nvi,rvr",
  limit = 20
) {
  return fetchJson<DivergenceResult>(
    `${BASE}/semantic/divergence?strongs_id=${strongsId}&translations=${encodeURIComponent(translations)}&limit=${limit}`
  );
}

// ── Commentary (HelloAO — external, fetched client-side) ────────────────────

const HELLOAO_BASE = "https://bible.helloao.org/api/c";

export interface CommentaryVerse {
  type: string;
  number: number;
  content: string[];
}

export interface CommentaryChapter {
  commentary: { id: string; name: string };
  book: { id: string; name: string; introduction?: string };
  chapter: { number: number; content: CommentaryVerse[]; introduction?: string };
}

export const COMMENTARIES = [
  { id: "matthew-henry", name: "Matthew Henry" },
  { id: "john-gill", name: "John Gill" },
  { id: "adam-clarke", name: "Adam Clarke" },
  { id: "jamieson-fausset-brown", name: "Jamieson-Fausset-Brown" },
  { id: "keil-delitzsch", name: "Keil & Delitzsch (OT)" },
  { id: "tyndale", name: "Tyndale Study Notes" },
] as const;

export async function fetchCommentary(
  commentaryId: string,
  book: string,
  chapter: number
): Promise<CommentaryChapter> {
  const resp = await fetch(
    `${HELLOAO_BASE}/${commentaryId}/${book}/${chapter}.json`
  );
  if (!resp.ok) throw new Error("Commentary not available");
  return resp.json();
}

// ── AI Insights ─────────────────────────────────────────────────────────────

export interface AIExplanation {
  verse_id: string;
  translation: string;
  language: string;
  style: string;
  explanation: string;
  context: string;
  key_words: Array<{ word: string; meaning: string; original?: string }> | string[];
  application: string;
}

export async function explainVerse(
  verseId: string,
  language: "en" | "pt-br" = "en",
  translation = "kjv",
  style: "simple" | "academic" | "devotional" = "simple"
): Promise<AIExplanation> {
  const res = await fetch(`${BASE}/ai/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ verse_id: verseId, language, translation, style }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Special Passages ──────────────────────────────────────────────────────────
export type PassageLayerKey = "aramaic" | "hebrew" | "greek" | "portuguese" | "english";

export interface PassageWord {
  word_position: number;
  script: string;
  transliteration: string | null;
  /** EN gloss (source of truth for aramaic layer). */
  gloss: string | null;
  gloss_pt?: string | null;
  gloss_es?: string | null;
  audio_url: string | null;
  strongs_id: string | null;
}

export interface PassageVerse {
  verse_ref: string;
  verse_number: number;
  words?: PassageWord[];
  full_text?: string;
}

export interface PassageLayer {
  label: string;
  language_code: string;
  direction: "rtl" | "ltr";
  source: string;
  audio_note: string | null;
  verse_count: number;
  verses: PassageVerse[];
}

export interface SpecialPassageResult {
  id: string;
  /** Canonical EN title (source of truth). */
  title: string;
  title_pt?: string;
  title_es?: string;
  reference: string;
  reference_pt?: string;
  reference_es?: string;
  description?: string;
  description_pt?: string;
  description_es?: string;
  /** Badge ID in EN (feature/foundation/origin/classic/prophecy/...). Translated via i18n key `specialPassage.badge.{id}`. */
  badge?: string;
  translation: string;
  translation_en: string;
  layers: Partial<Record<PassageLayerKey, PassageLayer>>;
  layer_notes?: Record<string, string>;
  layer_notes_pt?: Record<string, string>;
  layer_notes_es?: Record<string, string>;
}

export interface SpecialPassageMeta {
  id: string;
  /** Canonical EN title (source of truth). */
  title: string;
  title_pt?: string;
  title_es?: string;
  reference: string;
  reference_pt?: string;
  reference_es?: string;
  /** Badge ID in EN (feature/foundation/origin/classic/prophecy/...). */
  badge?: string;
  description?: string;
  description_pt?: string;
  description_es?: string;
  layers: PassageLayerKey[];
}

export function fetchSpecialPassageCatalog(): Promise<{ passages: SpecialPassageMeta[] }> {
  return fetchJson(`${BASE}/special-passages/catalog`);
}

export function fetchSpecialPassage(
  passageId: string,
  translation = "nvi",
  translationEn = "kjv",
): Promise<SpecialPassageResult> {
  return fetchJson(
    `${BASE}/special-passages/${passageId}?translation=${translation}&translation_en=${translationEn}`,
  );
}

// ── Semantic Genealogy ────────────────────────────────────────────────────────

export interface GenealogyNode {
  strongs_id: string;
  language: "hebrew" | "greek";
  word: string;
  transliteration: string;
  gloss: string;
  testament: "OT" | "NT";
  key_verses: string[];
  note: string;
  // enriched by backend
  occurrence_count?: number;
  top_books?: { book_id: string; count: number }[];
  short_definition?: string;
  lexicon_transliteration?: string;
  original_script?: string;
}

export interface GenealogyBridge {
  from: string;
  to: string;
  type: "lxx_translation" | "theological_development" | "semantic_equivalence" | "root_cognate";
  note: string;
}

export interface GenealogyConcept {
  id: string;
  concept: string;
  concept_en: string;
  tagline: string;
  color: string;
  icon: string;
  nodes: GenealogyNode[];
  bridges: GenealogyBridge[];
  narrative: string;
}

export interface GenealogyConceptSummary {
  id: string;
  concept: string;
  concept_en: string;
  tagline: string;
  color: string;
  icon: string;
  node_count: number;
  strongs_ids: string[];
}

export async function fetchGenealogyConcepts(
  lang: string = "en",
): Promise<GenealogyConceptSummary[]> {
  const data = await fetchJson<{ concepts: GenealogyConceptSummary[] }>(
    `${BASE}/genealogy/concepts?lang=${encodeURIComponent(lang)}`,
  );
  return data.concepts;
}

export function fetchGenealogyConcept(
  id: string,
  lang: string = "en",
): Promise<GenealogyConcept> {
  return fetchJson(`${BASE}/genealogy/concepts/${id}?lang=${encodeURIComponent(lang)}`);
}

