import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  fetchPlaces,
  fetchPlace,
  fetchPlaceTypes,
  type BiblicalPlace,
  type PlaceImage,
  type PlaceTypeCount,
} from "../services/api";
import { useI18n } from "../i18n/i18nContext";
import { placeName } from "../i18n/placeNames";
import { useScrollToExpanded } from "../hooks/useScrollIntoViewOnChange";
import { eventTitle, eraName } from "../i18n/timelineEvents";

/* ── Lightbox overlay for full-res image ─────────────────────────────────── */

function Lightbox({
  image,
  placeName,
  onClose,
}: {
  image: PlaceImage;
  placeName: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={image.file_url}
          alt={image.description || placeName}
          className="w-full max-h-[80vh] object-contain rounded-lg"
          onError={(e) => {
            const img = e.currentTarget;
            // Try hero_url fallback, then hide
            if (image.hero_url && img.src !== image.hero_url) {
              img.src = image.hero_url;
            } else {
              img.style.display = "none";
            }
          }}
        />
        <div className="mt-2 flex items-center justify-between text-white/70 text-xs px-1">
          <span>
            {image.description && (
              <span className="text-white/90">{image.description} · </span>
            )}
            {t("places.lightboxCredit")
              .replace("{credit}", image.credit)
              .replace("{license}", image.license)}
          </span>
          <a
            href={image.credit_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/50 hover:text-white underline ml-3"
          >
            {t("places.lightboxSource")}
          </a>
        </div>
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-black/60
                     text-white flex items-center justify-center hover:bg-black/80 transition"
          aria-label={t("places.lightboxClose")}
        >
          ×
        </button>
      </div>
    </div>
  );
}

/* ── Expanded place detail card ──────────────────────────────────────────── */

function PlaceDetail({ detail }: { detail: BiblicalPlace }) {
  const { t, locale } = useI18n();
  const displayName = placeName(detail.slug, locale, detail.name);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<PlaceImage | null>(null);

  const hero = detail.images?.[0] || null;
  const gallery = detail.images?.slice(1) || [];
  const events = detail.events || [];

  // Group events by era
  const eventsByEra: Record<string, typeof events> = {};
  for (const evt of events) {
    const era = evt.era || t("places.eraOther");
    (eventsByEra[era] ??= []).push(evt);
  }
  const eraOrder = Object.keys(eventsByEra);
  const MAX_EVENTS_COLLAPSED = 8;
  const totalEvents = events.length;
  const shouldCollapse = totalEvents > MAX_EVENTS_COLLAPSED;

  // Flatten for collapsed view (first N events across eras)
  const visibleEvents = showAllEvents
    ? events
    : events.slice(0, MAX_EVENTS_COLLAPSED);

  return (
    <>
      {lightboxImage && (
        <Lightbox
          image={lightboxImage}
          placeName={detail.name}
          onClose={() => setLightboxImage(null)}
        />
      )}

      {/* Hero image */}
      {hero && (
        <div className="relative -mx-4 -mt-0 mb-3">
          <img
            src={hero.hero_url || hero.thumbnail_url || hero.file_url}
            alt={hero.description || detail.name}
            className="w-full h-48 md:h-56 object-cover cursor-pointer"
            onClick={() => setLightboxImage(hero)}
            onError={(e) => {
              const img = e.currentTarget;
              // Try fallback chain: hero → thumbnail → file_url → hide
              if (hero.hero_url && img.src === hero.hero_url && hero.thumbnail_url) {
                img.src = hero.thumbnail_url;
              } else if (img.src !== hero.file_url) {
                img.src = hero.file_url;
              } else {
                img.parentElement!.style.display = "none";
              }
            }}
          />
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent h-20 pointer-events-none" />
          <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
            <div>
              <h2 className="text-white font-display text-xl font-bold drop-shadow-lg">
                {displayName}
              </h2>
              {detail.place_type && (
                <span className="text-white/70 text-xs">{detail.place_type}</span>
              )}
            </div>
            <span className="text-white/40 text-[8px]">
              {hero.credit} · {hero.license}
            </span>
          </div>
        </div>
      )}

      {/* Description */}
      {detail.description && (
        <p className="text-sm leading-relaxed font-body mt-2 mb-3">
          {detail.description}
        </p>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-[10px] px-2 py-1 rounded-full bg-[var(--color-gold)]/8 text-[var(--color-gold-dark)] font-medium">
          {(detail.verse_count === 1 ? t("places.verseCountSingular") : t("places.verseCount"))
            .replace("{n}", String(detail.verse_count))}
        </span>
        {detail.also_called && Array.isArray(detail.also_called) && detail.also_called.length > 0 && (
          <span className="text-[10px] px-2 py-1 rounded-full bg-[var(--color-gold)]/8 text-[var(--color-gold-dark)]">
            {t("places.alsoCalled").replace(
              "{names}",
              detail.also_called.slice(0, 3).join(", ") +
                (detail.also_called.length > 3 ? ` +${detail.also_called.length - 3}` : "")
            )}
          </span>
        )}
        {detail.latitude && detail.longitude && (
          <Link
            to={`/map?place=${detail.slug}`}
            className="text-[10px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
          >
            {t("places.coordsOpenMap")
              .replace("{lat}", detail.latitude.toFixed(2))
              .replace("{lon}", detail.longitude.toFixed(2))}
          </Link>
        )}
      </div>

      {/* Photo gallery (remaining images) */}
      {gallery.length > 0 && (
        <div className="mb-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 -mx-1 px-1 snap-x">
            {gallery.map((img) => (
              <button
                key={img.image_id}
                onClick={() => setLightboxImage(img)}
                className="group shrink-0 snap-start"
              >
                <img
                  src={img.thumbnail_url || img.file_url}
                  alt={img.description || detail.name}
                  className="w-24 h-16 object-cover rounded border
                             border-[var(--color-gold-dark)]/10
                             group-hover:border-[var(--color-gold)]
                             group-hover:brightness-110 transition"
                  loading="lazy"
                  onError={(e) => {
                    // Hide broken gallery thumbnails
                    e.currentTarget.parentElement!.style.display = "none";
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Events — grouped by era */}
      {totalEvents > 0 && (
        <div>
          <h4 className="text-[10px] uppercase tracking-wider font-bold opacity-50 mb-2">
            {(totalEvents === 1 ? t("places.eventsHeaderSingular") : t("places.eventsHeader"))
              .replace("{n}", String(totalEvents))}
          </h4>

          {!showAllEvents ? (
            <div className="space-y-1">
              {visibleEvents.map((evt) => (
                <div key={evt.event_id} className="text-sm flex items-center gap-2">
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 shrink-0 min-w-[4rem] text-center">
                    {evt.era ? eraName(evt.era, locale, evt.era) : t("places.eraOther")}
                  </span>
                  <span className="truncate">{eventTitle(evt.event_id, evt.title, locale)}</span>
                  {evt.start_year != null && (
                    <span className="text-[10px] opacity-30 shrink-0">
                      {Math.abs(evt.start_year)} {evt.start_year < 0 ? t("common.bc") : t("common.ad")}
                    </span>
                  )}
                </div>
              ))}
              {shouldCollapse && (
                <button
                  onClick={() => setShowAllEvents(true)}
                  className="text-xs text-[var(--color-gold-dark)] hover:underline mt-1"
                >
                  {t("places.showAllEvents").replace("{n}", String(totalEvents))}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {eraOrder.map((era) => (
                <div key={era}>
                  <h5 className="text-[9px] uppercase tracking-wider text-blue-600 font-bold mb-1">
                    {eraName(era, locale, era)} ({eventsByEra[era].length})
                  </h5>
                  <div className="space-y-0.5 ml-2 border-l-2 border-blue-100 pl-3">
                    {eventsByEra[era].map((evt) => (
                      <div key={evt.event_id} className="text-sm flex items-center gap-2">
                        <span className="truncate">{eventTitle(evt.event_id, evt.title, locale)}</span>
                        {evt.start_year != null && (
                          <span className="text-[10px] opacity-30 shrink-0">
                            {Math.abs(evt.start_year)} {evt.start_year < 0 ? t("common.bc") : t("common.ad")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={() => setShowAllEvents(false)}
                className="text-xs text-[var(--color-gold-dark)] hover:underline"
              >
                {t("places.collapse")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-3 text-xs pt-2 border-t border-[var(--color-gold-dark)]/8 mt-3">
        <Link
          to={`/search?q=${encodeURIComponent(detail.name)}`}
          className="text-[var(--color-gold-dark)] hover:underline"
        >
          {t("places.actionSearch")}
        </Link>
        <Link
          to={`/dictionary?q=${encodeURIComponent(detail.name)}`}
          className="text-[var(--color-gold-dark)] hover:underline"
        >
          {t("places.actionDictionary")}
        </Link>
        {detail.latitude && (
          <Link
            to={`/map?place=${detail.slug}`}
            className="text-[var(--color-gold-dark)] hover:underline"
          >
            {t("places.actionMap")}
          </Link>
        )}
      </div>
    </>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */

export default function PlacesPage() {
  const { t, locale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [places, setPlaces] = useState<BiblicalPlace[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const registerCardRef = useScrollToExpanded(expanded);
  const [detail, setDetail] = useState<BiblicalPlace | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [placeTypes, setPlaceTypes] = useState<PlaceTypeCount[]>([]);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchPlaceTypes().then(setPlaceTypes).catch(() => {});
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && q !== query) setQuery(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      fetchPlaces({
        q: query || undefined,
        place_type: typeFilter || undefined,
        limit: 50,
      })
        .then((data) => {
          setPlaces(data.results);
          setTotal(data.total);
        })
        .catch(() => {
          setPlaces([]);
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
  }, [query, typeFilter, setSearchParams]);

  const handleExpand = (slug: string) => {
    if (expanded === slug) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(slug);
    setDetailLoading(true);
    fetchPlace(slug)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  };

  const topTypes = placeTypes.slice(0, 6);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title text-3xl">{t("nav.places")}</h1>
        <p className="text-sm opacity-60 mt-1">
          {t("places.subtitle")}
        </p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("places.searchPlaceholder")}
          className="w-full rounded-lg border border-[var(--color-gold-dark)]/20 px-4 py-3
                     text-sm bg-white focus:outline-none focus:ring-2
                     focus:ring-[var(--color-gold)]/50 focus:border-[var(--color-gold)]/50"
          autoFocus
        />
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setTypeFilter(null)}
          className={`text-xs px-3 py-1.5 rounded-full border transition ${
            !typeFilter
              ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
              : "border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)]"
          }`}
        >
          {t("common.all")}
        </button>
        {topTypes.map((tp) => (
          <button
            key={tp.place_type}
            onClick={() => setTypeFilter(typeFilter === tp.place_type ? null : tp.place_type)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              typeFilter === tp.place_type
                ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
                : "border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)]"
            }`}
          >
            {tp.place_type} ({tp.count})
          </button>
        ))}
        <span className="text-xs opacity-40 self-center ml-2">
          {t("places.results").replace("{n}", total.toLocaleString())}
        </span>
      </div>

      {loading && <p className="text-sm opacity-50">{t("common.loading")}</p>}

      {!loading && places.length === 0 && query.length >= 2 && (
        <p className="text-sm opacity-50 italic">
          {t("places.noResults").replace("{query}", query)}
        </p>
      )}

      {!loading && places.length === 0 && !query && !typeFilter && (
        <div className="rounded-lg border border-dashed border-[var(--color-gold-dark)]/30 p-8 text-center">
          <p className="opacity-60 mb-3">{t("places.browsePrompt")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { slug: "jerusalem_636", en: "Jerusalem" },
              { slug: "bethlehem_218", en: "Bethlehem" },
              { slug: "egypt_362", en: "Egypt" },
              { slug: "babylon_151", en: "Babylon" },
              { slug: "sinai_1098", en: "Sinai" },
              { slug: "galilee_433", en: "Galilee" },
              { slug: "nazareth_878", en: "Nazareth" },
              { slug: "rome_1009", en: "Rome" },
            ].map((w) => (
              <button
                key={w.slug}
                onClick={() => setQuery(w.en)}
                className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-gold)]/30
                           hover:bg-[var(--color-gold)]/10 transition text-[var(--color-gold-dark)]"
              >
                {placeName(w.slug, locale, w.en)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        {places.map((place) => {
          const isOpen = expanded === place.slug;
          return (
            <div
              key={place.slug}
              ref={registerCardRef(place.slug)}
              className={`rounded-lg border bg-white overflow-hidden transition-shadow ${
                isOpen
                  ? "border-[var(--color-gold)]/40 shadow-lg shadow-[var(--color-gold)]/5"
                  : "border-[var(--color-gold-dark)]/15"
              }`}
            >
              <button
                onClick={() => handleExpand(place.slug)}
                className="w-full text-left px-4 py-3 flex items-center justify-between gap-3
                           hover:bg-[var(--color-gold)]/5 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 shrink-0 relative">
                    {place.thumbnail_url ? (
                      <img
                        src={place.thumbnail_url}
                        alt={place.name}
                        className="w-14 h-14 rounded-lg object-cover border border-[var(--color-gold-dark)]/10"
                        loading="lazy"
                        onError={(e) => {
                          // On error, hide img and show fallback sibling
                          e.currentTarget.style.display = "none";
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="w-14 h-14 rounded-lg bg-gradient-to-br from-[var(--color-gold)]/8 to-[var(--color-gold)]/3 items-center justify-center border border-[var(--color-gold-dark)]/5"
                      style={{ display: place.thumbnail_url ? "none" : "flex" }}
                    >
                      <svg className="w-6 h-6 text-[var(--color-gold-dark)] opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-[var(--color-ink)]">
                        {placeName(place.slug, locale, place.name)}
                      </h3>
                      {place.place_type && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                          {place.place_type}
                        </span>
                      )}
                    </div>
                    <p className="text-xs opacity-50 mt-0.5">
                      {(place.verse_count === 1 ? t("places.verseCountSingular") : t("places.verseCount"))
                        .replace("{n}", String(place.verse_count))}
                      {place.latitude && place.longitude && (
                        <> · {place.latitude.toFixed(2)}°, {place.longitude.toFixed(2)}°</>
                      )}
                    </p>
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 opacity-40 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-[var(--color-gold-dark)]/10">
                  {detailLoading && (
                    <p className="text-xs opacity-50 mt-3">{t("common.loading")}</p>
                  )}
                  {!detailLoading && detail && <PlaceDetail detail={detail} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
