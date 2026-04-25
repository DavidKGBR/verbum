import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  fetchPeople,
  fetchPerson,
  fetchPersonFamily,
  fetchPersonEvents,
  type BiblicalPerson,
  type FamilyMember,
  type PersonEvent,
} from "../services/api";
import { useI18n } from "../i18n/i18nContext";
import { personName, personOccupationKey } from "../i18n/personNames";
import { placeName } from "../i18n/placeNames";
import { eventTitle, eraName } from "../i18n/timelineEvents";
import { tribeName } from "../i18n/tribeNames";
import { useScrollToExpanded } from "../hooks/useScrollIntoViewOnChange";

const RELATION_ORDER = ["father", "mother", "spouse", "sibling", "half_sibling", "child"];

// Relation slug → i18n key
const RELATION_KEYS: Record<string, string> = {
  father: "people.relations.father",
  mother: "people.relations.mother",
  spouse: "people.relations.spouse",
  child: "people.relations.child",
  sibling: "people.relations.sibling",
  half_sibling: "people.relations.halfSibling",
};

// ── Featured figures for empty state ─────────────────────────────────────────
// `name` stays in English because the DB is searched by the English name.
// `occupationKey` is resolved via i18n at render time.

const FEATURED_PEOPLE = [
  { slug: "jesus_905", name: "Jesus Christ", occupationKey: "people.occupation.messiah", verses: 1831 },
  { slug: "david_994", name: "David", occupationKey: "people.occupation.kingOfIsrael", verses: 896 },
  { slug: "moses_2108", name: "Moses", occupationKey: "people.occupation.prophetLawgiver", verses: 774 },
  { slug: "abraham_58", name: "Abraham", occupationKey: "people.occupation.patriarch", verses: 277 },
  { slug: "paul_2479", name: "Paul", occupationKey: "people.occupation.apostle", verses: 179 },
  { slug: "daniel_975", name: "Daniel", occupationKey: "people.occupation.prophet", verses: 72 },
  { slug: "esther_1343", name: "Esther", occupationKey: "people.occupation.queenOfPersia", verses: 46 },
  { slug: "mary_1938", name: "Mary", occupationKey: "people.occupation.motherOfJesus", verses: 21 },
];

// ── Year formatting helper ───────────────────────────────────────────────────

function yearLabel(y: number | null, t: (k: string) => string): string {
  if (y == null) return "?";
  return `${Math.abs(y)} ${y < 0 ? t("common.bc") : t("common.ad")}`;
}

// ── Description cleanup ──────────────────────────────────────────────────────
// Theographic text has:
//   - U+FFFD replacement chars (mangled NBSP between ref numbers)
//   - Runs of 2+ spaces around parenthetical verse refs
//   - Leading whitespace and lowercase initial letter
//   - Stray spaces before punctuation

function cleanDescription(raw: string): string {
  let s = raw
    .replace(/\uFFFD/g, " ") // replacement char → space
    .replace(/\s+/g, " ")    // collapse all whitespace runs
    .replace(/\s+([.,;:!?])/g, "$1") // no space before punctuation
    .replace(/\(\s+/g, "(")  // no space after (
    .replace(/\s+\)/g, ")")  // no space before )
    .trim();
  // Capitalize first letter
  if (s.length > 0) s = s[0].toUpperCase() + s.slice(1);
  return s;
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function PeoplePage() {
  const { t, locale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [people, setPeople] = useState<BiblicalPerson[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [family, setFamily] = useState<Record<string, FamilyMember[]> | null>(null);
  const [events, setEvents] = useState<PersonEvent[]>([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [genderFilter, setGenderFilter] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track slug to auto-expand after search results load
  const pendingExpandRef = useRef<string | null>(null);
  const registerCardRef = useScrollToExpanded(expanded);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && q !== query) setQuery(q);

    const highlightSlug = searchParams.get("highlight");
    if (highlightSlug && highlightSlug !== pendingExpandRef.current) {
      pendingExpandRef.current = highlightSlug;
      setLoading(true);
      fetchPerson(highlightSlug)
        .then((person) => {
          setPeople([person]);
          setTotal(1);
          setTimeout(() => handleExpand(highlightSlug), 50);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("highlight")) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      fetchPeople({
        q: query || undefined,
        gender: genderFilter || undefined,
        limit: 50,
      })
        .then((data) => {
          setPeople(data.results);
          setTotal(data.total);
          if (pendingExpandRef.current) {
            const slug = pendingExpandRef.current;
            pendingExpandRef.current = null;
            const found = data.results.find((p) => p.slug === slug);
            if (found) {
              setTimeout(() => handleExpand(slug), 50);
            }
          }
        })
        .catch(() => {
          setPeople([]);
          setTotal(0);
        })
        .finally(() => setLoading(false));
      if (query) {
        setSearchParams({ q: query }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, genderFilter, setSearchParams]);

  const handleExpand = (slug: string) => {
    if (expanded === slug) {
      setExpanded(null);
      setFamily(null);
      setEvents([]);
      return;
    }
    setExpanded(slug);
    setFamilyLoading(true);
    Promise.all([fetchPersonFamily(slug), fetchPersonEvents(slug)])
      .then(([fam, evt]) => {
        setFamily(fam.relations);
        setEvents(evt.events);
      })
      .catch(() => {
        setFamily(null);
        setEvents([]);
      })
      .finally(() => setFamilyLoading(false));
  };

  const handleFeaturedClick = (slug: string, name: string) => {
    pendingExpandRef.current = slug;
    setQuery(name);
  };

  const handleFamilyClick = (member: FamilyMember) => {
    setExpanded(null);
    setFamily(null);
    setEvents([]);
    pendingExpandRef.current = member.slug;
    setQuery(member.name || member.slug);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title text-3xl">{t("people.title")}</h1>
        <p className="text-sm opacity-60 mt-1">
          {t("people.subtitle")}
        </p>
      </div>

      {/* Highlight mode banner */}
      {searchParams.get("highlight") && (
        <div className="mb-4 flex items-center gap-2 text-xs p-2 rounded-lg bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20">
          <span className="opacity-60">{t("people.highlightFrom")}</span>
          <button
            onClick={() => {
              setSearchParams({}, { replace: true });
              setExpanded(null);
              setFamily(null);
              setEvents([]);
              setQuery("");
              pendingExpandRef.current = null;
            }}
            className="text-[var(--color-gold-dark)] hover:underline font-medium"
          >
            {t("people.showAll")}
          </button>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("people.searchPlaceholder")}
          className="w-full rounded-lg border border-[var(--color-gold-dark)]/20 px-4 py-3
                     text-sm bg-white focus:outline-none focus:ring-2
                     focus:ring-[var(--color-gold)]/50 focus:border-[var(--color-gold)]/50"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-6">
        {[null, "Male", "Female"].map((g) => (
          <button
            key={g || "all"}
            onClick={() => setGenderFilter(g)}
            className={`text-xs px-4 py-1.5 rounded-full border transition ${
              genderFilter === g
                ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
                : "border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)]"
            }`}
          >
            {g === null
              ? t("people.filter.all")
              : g === "Male"
                ? t("people.filter.male")
                : t("people.filter.female")}
          </button>
        ))}
        <span className="text-xs opacity-40 self-center ml-2">
          {t("people.results").replace("{n}", total.toLocaleString())}
        </span>
      </div>

      {loading && <p className="text-sm opacity-50">{t("people.searching")}</p>}

      {!loading && people.length === 0 && query.length >= 2 && (
        <p className="text-sm opacity-50 italic">
          {t("people.noResults").replace("{query}", query)}
        </p>
      )}

      {/* Featured figures (empty state) */}
      {!loading && people.length === 0 && !query && (
        <div className="mb-8">
          <h3 className="text-[10px] uppercase tracking-wider font-bold opacity-50 mb-3">
            {t("people.keyFigures")}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FEATURED_PEOPLE.map((fp) => (
              <button
                key={fp.slug}
                onClick={() => handleFeaturedClick(fp.slug, fp.name)}
                className="text-left p-3 rounded-lg border border-[var(--color-gold-dark)]/15
                           hover:border-[var(--color-gold)] hover:bg-[var(--color-gold)]/5
                           transition group bg-white"
              >
                <div className="font-display font-bold text-sm text-[var(--color-ink)]
                               group-hover:text-[var(--color-gold-dark)] transition">
                  {personName(fp.slug, locale, fp.name)}
                </div>
                <div className="text-[10px] opacity-50 mt-0.5">{t(fp.occupationKey)}</div>
                <div className="text-[10px] mt-1">
                  <span className="text-[var(--color-gold-dark)] font-bold">{fp.verses}</span>
                  <span className="opacity-40"> {t("people.verses")}</span>
                </div>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {[
              { slug: "ruth_2450", en: "Ruth" },
              { slug: "solomon_2762", en: "Solomon" },
              { slug: "peter_2745", en: "Peter" },
              { slug: "elijah_1131", en: "Elijah" },
              { slug: "sarah_2473", en: "Sarah" },
              { slug: "samson_2468", en: "Samson" },
            ].map((w) => (
              <button
                key={w.slug}
                onClick={() => setQuery(w.en)}
                className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-gold)]/30
                           hover:bg-[var(--color-gold)]/10 transition text-[var(--color-gold-dark)]"
              >
                {personName(w.slug, locale, w.en)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        {people.map((person) => {
          const isOpen = expanded === person.slug;
          const aliases = Array.isArray(person.also_called) && person.also_called.length > 0
            ? person.also_called
            : null;

          return (
            <div
              key={person.slug}
              ref={registerCardRef(person.slug)}
              className="rounded-lg border border-[var(--color-gold-dark)]/15 bg-white overflow-hidden"
            >
              <button
                onClick={() => handleExpand(person.slug)}
                className="w-full text-left px-4 py-3 flex items-start justify-between gap-3
                           hover:bg-[var(--color-gold)]/5 transition"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-[var(--color-ink)]">
                      {personName(person.slug, locale, person.name)}
                    </h3>
                    {person.gender && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        person.gender === "Male"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-pink-100 text-pink-700"
                      }`}>
                        {person.gender === "Male"
                          ? t("people.filter.male")
                          : person.gender === "Female"
                            ? t("people.filter.female")
                            : person.gender}
                      </span>
                    )}
                    {person.tribe && tribeName(person.tribe, locale) && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                        {tribeName(person.tribe, locale)}
                      </span>
                    )}
                  </div>
                  {aliases && (
                    <p className="text-[11px] opacity-40 italic mt-0.5">
                      {t("people.alsoKnownAs")} {aliases.join(", ")}
                    </p>
                  )}
                  <p className="text-xs opacity-50 mt-0.5">
                    {person.verse_count} {person.verse_count !== 1 ? t("people.verses") : t("people.verse")}
                    {(() => {
                      const occKey = personOccupationKey(person.slug);
                      if (occKey) return ` · ${t(occKey)}`;
                      if (person.occupation) return ` · ${person.occupation}`;
                      return "";
                    })()}
                    {person.birth_year && ` · ${yearLabel(person.birth_year, t)}`}
                  </p>
                </div>
                <svg
                  className={`w-4 h-4 opacity-40 transition-transform shrink-0 mt-1 ${isOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-[var(--color-gold-dark)]/10">
                  {/* Lifespan bar */}
                  <LifespanBar person={person} />

                  {/* Description */}
                  {person.description && (
                    <p className="text-sm leading-relaxed font-body">
                      {cleanDescription(person.description)}
                    </p>
                  )}

                  {/* Books mentioned */}
                  {person.books_mentioned && Array.isArray(person.books_mentioned) && person.books_mentioned.length > 0 && (
                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider font-bold opacity-50 mb-2">
                        {t("people.appearsIn")}
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {person.books_mentioned.map((bookId) => (
                          <Link
                            key={bookId}
                            to={`/reader?book=${bookId}&chapter=1`}
                            className="text-[11px] px-2 py-0.5 rounded border border-[var(--color-gold)]/30
                                       hover:bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)] transition"
                          >
                            {bookId}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Family tree */}
                  {familyLoading && (
                    <p className="text-xs opacity-50">{t("people.loadingFamily")}</p>
                  )}
                  {!familyLoading && family && Object.keys(family).length > 0 && (
                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider font-bold opacity-50 mb-2">
                        {t("people.family")}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {RELATION_ORDER.filter((rel) => family[rel]?.length).map((rel) => (
                          <div key={rel} className="rounded p-2 bg-[var(--color-gold)]/5">
                            <div className="text-[9px] uppercase tracking-wider opacity-50 mb-1">
                              {RELATION_KEYS[rel] ? t(RELATION_KEYS[rel]) : rel}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {family[rel].map((member) => (
                                <button
                                  key={member.slug}
                                  onClick={() => handleFamilyClick(member)}
                                  className="text-[11px] px-2 py-0.5 rounded bg-white
                                             border border-[var(--color-gold)]/20
                                             hover:bg-[var(--color-gold)]/10 transition
                                             text-[var(--color-gold-dark)]"
                                >
                                  {personName(member.slug, locale, member.name || member.slug)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!familyLoading && family && Object.keys(family).length === 0 && (
                    <p className="text-xs opacity-40 italic">{t("people.noFamily")}</p>
                  )}

                  {/* Events timeline */}
                  {!familyLoading && events.length > 0 && (
                    <EventsTimeline events={events} />
                  )}

                  {/* Quick actions */}
                  <div className="flex gap-3 text-xs pt-1">
                    <Link
                      to={`/search?q=${encodeURIComponent(person.name)}`}
                      className="text-[var(--color-gold-dark)] hover:underline"
                    >
                      {t("people.actions.search")}
                    </Link>
                    <Link
                      to={`/dictionary?q=${encodeURIComponent(person.name)}`}
                      className="text-[var(--color-gold-dark)] hover:underline"
                    >
                      {t("people.actions.dictionary")}
                    </Link>
                    <Link
                      to={`/timeline`}
                      className="text-[var(--color-gold-dark)] hover:underline"
                    >
                      {t("people.actions.timeline")}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Lifespan Bar ─────────────────────────────────────────────────────────────

function LifespanBar({ person }: { person: BiblicalPerson }) {
  const { t } = useI18n();
  const start = person.birth_year ?? person.min_year;
  const end = person.death_year ?? person.max_year;

  if (start == null && end == null) return null;

  const isBirthDeath = person.birth_year != null && person.death_year != null;
  const label = isBirthDeath ? t("people.lifespan") : t("people.activePeriod");
  const span = start != null && end != null ? Math.abs(end - start) : null;

  return (
    <div className="mt-3">
      <div className="text-[10px] uppercase tracking-wider font-bold opacity-50 mb-1">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[var(--color-gold-dark)]">
          {start != null ? yearLabel(start, t) : "?"}
        </span>
        <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-[var(--color-gold)]/40 to-[var(--color-gold)]/20 relative">
          {span != null && (
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-[var(--color-gold-dark)]">
              {span > 0 ? `${span} ${t("people.years")}` : ""}
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-[var(--color-gold-dark)]">
          {end != null ? yearLabel(end, t) : "?"}
        </span>
      </div>
    </div>
  );
}

// ── Events Timeline ──────────────────────────────────────────────────────────

function EventsTimeline({ events }: { events: PersonEvent[] }) {
  const { t, locale } = useI18n();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? events : events.slice(0, 6);

  return (
    <div>
      <h4 className="text-[10px] uppercase tracking-wider font-bold opacity-50 mb-2">
        {t("people.events.title").replace("{n}", String(events.length))}
      </h4>
      <div className="relative ml-3">
        {/* Vertical line */}
        <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-[var(--color-gold)]/30" />

        <div className="space-y-3">
          {visible.map((evt, i) => (
            <div key={evt.event_id || i} className="relative pl-5">
              {/* Dot */}
              <div className="absolute left-[-3px] top-1.5 w-2 h-2 rounded-full bg-[var(--color-gold)] border-2 border-white" />

              <div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-medium text-[var(--color-ink)]">
                    {eventTitle(evt.event_id, evt.title, locale)}
                  </span>
                  {evt.start_year != null && (
                    <span className="text-[10px] font-bold text-[var(--color-gold-dark)]">
                      {yearLabel(evt.start_year, t)}
                    </span>
                  )}
                  {evt.era && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 opacity-60">
                      {eraName(evt.era, locale, evt.era)}
                    </span>
                  )}
                </div>

                {/* Locations */}
                {evt.locations && evt.locations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {evt.locations.map((loc) => (
                      <span
                        key={loc}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-700"
                      >
                        {placeName(loc, locale, loc.replace(/_/g, " "))}
                      </span>
                    ))}
                  </div>
                )}

                {/* Verse refs */}
                {evt.verse_refs && evt.verse_refs.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {evt.verse_refs.slice(0, 3).map((ref) => {
                      const parts = ref.split(".");
                      if (parts.length >= 2) {
                        return (
                          <Link
                            key={ref}
                            to={`/reader?book=${parts[0]}&chapter=${parts[1]}${parts[2] ? `&verse=${parts[2]}` : ""}`}
                            className="text-[10px] text-[var(--color-gold)] hover:underline"
                          >
                            {ref}
                          </Link>
                        );
                      }
                      return (
                        <span key={ref} className="text-[10px] opacity-40">
                          {ref}
                        </span>
                      );
                    })}
                    {evt.verse_refs.length > 3 && (
                      <span className="text-[10px] opacity-40">
                        {t("people.eventsMore").replace("{n}", String(evt.verse_refs.length - 3))}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {events.length > 6 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="text-[11px] text-[var(--color-gold)] hover:underline mt-2 ml-5"
          >
            {t("people.events.showAll").replace("{n}", String(events.length))}
          </button>
        )}
      </div>
    </div>
  );
}
