import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useScrollIntoViewOnChange } from "../hooks/useScrollIntoViewOnChange";
import {
  fetchCombinedTimeline,
  type CombinedTimeline,
  type TimelineEvent,
  type TimelineEra,
} from "../services/api";
import { useI18n, type Locale } from "../i18n/i18nContext";
import { personName } from "../i18n/personNames";
import { placeName } from "../i18n/placeNames";
import { eventTitle, eraName } from "../i18n/timelineEvents";

function yearLabel(year: number, t: (k: string) => string): string {
  const bc = t("common.bc");
  const ad = t("common.ad");
  if (year < 0) return `${Math.abs(year)} ${bc}`;
  if (year === 0) return `1 ${bc}`;
  return `${year} ${ad}`;
}

function EraBar({
  eras,
  yearMin,
  yearMax,
}: {
  eras: TimelineEra[];
  yearMin: number;
  yearMax: number;
}) {
  const { t, locale } = useI18n();
  const span = yearMax - yearMin;
  return (
    <div className="relative h-6 rounded-full overflow-hidden bg-gray-100 mb-6">
      {eras.map((era) => {
        const visibleStart = Math.max(era.start, yearMin);
        const visibleEnd = Math.min(era.end, yearMax);
        if (visibleEnd <= visibleStart) return null;
        const left = ((visibleStart - yearMin) / span) * 100;
        const width = ((visibleEnd - visibleStart) / span) * 100;
        const label = eraName(era.id, locale, era.name);
        return (
          <div
            key={era.id}
            className="absolute top-0 h-full flex items-center justify-center text-[8px] text-white font-bold tracking-wider uppercase overflow-hidden"
            style={{
              left: `${left}%`,
              width: `${width}%`,
              backgroundColor: era.color,
              opacity: 0.8,
            }}
            title={`${label} (${yearLabel(era.start, t)} – ${yearLabel(era.end, t)})`}
          >
            {width > 8 && label}
          </div>
        );
      })}
    </div>
  );
}

function EventDot({
  event,
  yearMin,
  yearMax,
  onClick,
  isSelected,
}: {
  event: TimelineEvent;
  yearMin: number;
  yearMax: number;
  onClick: () => void;
  isSelected: boolean;
}) {
  const { t, locale } = useI18n();
  const span = yearMax - yearMin;
  const left = ((event.year - yearMin) / span) * 100;
  const isBiblical = event.type === "biblical";
  const displayTitle = isBiblical ? eventTitle(event.id, event.title, locale) : event.title;

  return (
    <button
      onClick={onClick}
      className={`absolute transition-transform hover:scale-150 ${
        isSelected ? "scale-150 z-20" : "z-10"
      }`}
      style={{ left: `${left}%`, top: isBiblical ? "20%" : "60%" }}
      title={`${displayTitle} (${yearLabel(event.year, t)})`}
    >
      <div
        className={`w-2.5 h-2.5 rounded-full border-2 ${
          isBiblical
            ? "bg-[var(--color-gold)] border-[var(--color-gold-dark)]"
            : "bg-gray-400 border-gray-500"
        } ${isSelected ? "ring-2 ring-[var(--color-gold)]/50" : ""}`}
      />
    </button>
  );
}

function resolveParticipant(p: string | { slug: string; name: string }, locale: Locale) {
  if (typeof p === "string") {
    return { slug: p, display: personName(p, locale) };
  }
  return { slug: p.slug, display: personName(p.slug, locale, p.name) };
}

function localizeCategory(category: string | null | undefined, t: (k: string) => string): string {
  if (!category) return "";
  const key = `timeline.category.${category}`;
  const val = t(key);
  return val !== key ? val : category;
}

// Map secular event categories to place slugs that exist in biblical_places
const CATEGORY_TO_PLACE: Record<string, string> = {
  Rome: "rome_1013",
  Egypt: "egypt_362",
  Babylon: "babylon_151",
  Persia: "persia_938",
  Greece: "greece_495",
  Assyria: "assyria_111",
  Judea: "judea_657",
};

export default function TimelinePage() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<CombinedTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [showBiblical, setShowBiblical] = useState(true);
  const [showSecular, setShowSecular] = useState(true);
  const [yearRange, setYearRange] = useState<[number, number]>([-2200, 100]);
  const detailRef = useRef<HTMLDivElement>(null);
  useScrollIntoViewOnChange(detailRef, selectedEvent?.id);

  useEffect(() => {
    setLoading(true);
    fetchCombinedTimeline(yearRange[0], yearRange[1], locale)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [yearRange, locale]);

  const allEvents: TimelineEvent[] = [];
  if (data) {
    if (showBiblical) allEvents.push(...data.biblical);
    if (showSecular) allEvents.push(...data.secular);
  }

  const presets: { labelKey: string; range: [number, number] }[] = [
    { labelKey: "timeline.preset.full", range: [-2200, 100] },
    { labelKey: "timeline.preset.patriarchs", range: [-2200, -1400] },
    { labelKey: "timeline.preset.exodusMonarchy", range: [-1400, -586] },
    { labelKey: "timeline.preset.exileReturn", range: [-586, -400] },
    { labelKey: "timeline.preset.ntEra", range: [-100, 100] },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title text-3xl">{t("timeline.title")}</h1>
        <p className="text-sm opacity-60 mt-1">{t("timeline.subtitle")}</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Era presets */}
        {presets.map((p) => (
          <button
            key={p.labelKey}
            onClick={() => {
              setYearRange(p.range);
              setSelectedEvent(null);
            }}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              yearRange[0] === p.range[0] && yearRange[1] === p.range[1]
                ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
                : "border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)]"
            }`}
          >
            {t(p.labelKey)}
          </button>
        ))}

        <span className="text-xs opacity-30">|</span>

        {/* Toggles */}
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={showBiblical}
            onChange={(e) => setShowBiblical(e.target.checked)}
            className="rounded"
          />
          {t("timeline.toggle.biblical")} ({data?.biblical.length ?? 0})
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={showSecular}
            onChange={(e) => setShowSecular(e.target.checked)}
            className="rounded"
          />
          {t("timeline.toggle.secular")} ({data?.secular.length ?? 0})
        </label>
      </div>

      {loading && <p className="text-sm opacity-50">{t("timeline.loading")}</p>}

      {!loading && data && (
        <>
          {/* Era color bar */}
          <EraBar eras={data.eras} yearMin={yearRange[0]} yearMax={yearRange[1]} />

          {/* Timeline track */}
          <div className="relative h-32 mb-4 rounded-lg bg-[var(--color-gold)]/5 border border-[var(--color-gold-dark)]/10 overflow-hidden">
            {/* Track labels */}
            <div className="absolute left-2 top-1 text-[8px] uppercase tracking-wider opacity-30">
              {t("timeline.track.biblical")}
            </div>
            <div className="absolute left-2 bottom-1 text-[8px] uppercase tracking-wider opacity-30">
              {t("timeline.track.secular")}
            </div>

            {/* Center line */}
            <div className="absolute left-0 right-0 top-1/2 h-px bg-[var(--color-gold-dark)]/15" />

            {/* Event dots */}
            {allEvents.map((evt) => (
              <EventDot
                key={evt.id}
                event={evt}
                yearMin={yearRange[0]}
                yearMax={yearRange[1]}
                onClick={() => setSelectedEvent(
                  selectedEvent?.id === evt.id ? null : evt
                )}
                isSelected={selectedEvent?.id === evt.id}
              />
            ))}

            {/* Year markers */}
            {(() => {
              const span = yearRange[1] - yearRange[0];
              const step = span > 1500 ? 500 : span > 500 ? 200 : span > 200 ? 100 : 50;
              const markers = [];
              for (let y = Math.ceil(yearRange[0] / step) * step; y <= yearRange[1]; y += step) {
                const left = ((y - yearRange[0]) / span) * 100;
                markers.push(
                  <div
                    key={y}
                    className="absolute bottom-0 text-[8px] opacity-30 -translate-x-1/2"
                    style={{ left: `${left}%` }}
                  >
                    {yearLabel(y, t)}
                  </div>
                );
              }
              return markers;
            })()}
          </div>

          {/* Selected event detail */}
          {selectedEvent && (
            <div ref={detailRef} className="rounded-lg border border-[var(--color-gold-dark)]/15 bg-white p-4 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display font-bold text-[var(--color-ink)]">
                      {selectedEvent.type === "biblical"
                        ? eventTitle(selectedEvent.id, selectedEvent.title, locale)
                        : selectedEvent.title}
                    </h3>
                    {(() => {
                      const catSlug = selectedEvent.type === "secular" && selectedEvent.category
                        ? CATEGORY_TO_PLACE[selectedEvent.category]
                        : null;
                      const badgeClass = `text-[9px] px-1.5 py-0.5 rounded ${
                        selectedEvent.type === "biblical"
                          ? "bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)]"
                          : "bg-gray-100 text-gray-600"
                      }`;
                      const content = selectedEvent.type === "biblical"
                        ? eraName(selectedEvent.era, locale, selectedEvent.era ?? "")
                        : localizeCategory(selectedEvent.category, t);
                      if (catSlug) {
                        return (
                          <Link
                            to={`/map?place=${encodeURIComponent(catSlug)}`}
                            className={`${badgeClass} hover:bg-blue-100 hover:text-blue-700 transition inline-flex items-center gap-1`}
                            title={t("timeline.viewOnMap")}
                          >
                            {content}
                            <svg className="w-2.5 h-2.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </Link>
                        );
                      }
                      return <span className={badgeClass}>{content}</span>;
                    })()}
                  </div>
                  <p className="text-sm opacity-60">{yearLabel(selectedEvent.year, t)}</p>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-xs opacity-40 hover:opacity-100 p-1"
                >
                  ✕
                </button>
              </div>

              {selectedEvent.description && (
                <p className="text-sm mt-2 leading-relaxed font-body">
                  {selectedEvent.description}
                </p>
              )}

              {/* Participants — clickable links to /people */}
              {selectedEvent.participants && selectedEvent.participants.length > 0 && (
                <div className="mt-3">
                  <span className="text-[9px] uppercase tracking-wider opacity-50">
                    {t("timeline.participants")}{" "}
                  </span>
                  <span className="text-xs flex flex-wrap gap-1.5 mt-1">
                    {selectedEvent.participants.map((p) => {
                      const { slug, display } = resolveParticipant(p, locale);
                      return (
                        <Link
                          key={slug}
                          to={`/people?highlight=${encodeURIComponent(slug)}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)] hover:bg-[var(--color-gold)]/20 transition"
                          title={t("timeline.viewPerson")}
                        >
                          <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {display}
                        </Link>
                      );
                    })}
                  </span>
                </div>
              )}

              {/* Locations — clickable links to /map */}
              {selectedEvent.locations && selectedEvent.locations.length > 0 && (
                <div className="mt-2">
                  <span className="text-[9px] uppercase tracking-wider opacity-50">
                    {t("timeline.locations")}{" "}
                  </span>
                  <span className="text-xs flex flex-wrap gap-1.5 mt-1">
                    {selectedEvent.locations.map((slug) => {
                      const display = placeName(slug, locale);
                      return (
                        <Link
                          key={slug}
                          to={`/map?place=${encodeURIComponent(slug)}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                          title={t("timeline.viewOnMap")}
                        >
                          <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {display}
                        </Link>
                      );
                    })}
                  </span>
                </div>
              )}

              {/* Verse references — clickable links to /reader */}
              {selectedEvent.verse_refs && selectedEvent.verse_refs.length > 0 && (
                <div className="mt-2">
                  <span className="text-[9px] uppercase tracking-wider opacity-50">
                    {t("timeline.verseRefs")}{" "}
                  </span>
                  <span className="text-xs flex flex-wrap gap-1.5 mt-1">
                    {selectedEvent.verse_refs.map((ref) => (
                      <Link
                        key={ref}
                        to={`/reader?ref=${encodeURIComponent(ref)}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 hover:bg-green-100 transition"
                      >
                        <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        {ref}
                      </Link>
                    ))}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Events list below */}
          <div>
            <h2 className="text-sm font-bold mb-2 opacity-60">
              {t("timeline.eventsInRange")
                .replace("{n}", String(allEvents.length))
                .replace("{from}", yearLabel(yearRange[0], t))
                .replace("{to}", yearLabel(yearRange[1], t))}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {allEvents
                .sort((a, b) => a.year - b.year)
                .slice(0, 60)
                .map((evt) => {
                  const partCount = evt.participants?.length ?? 0;
                  const locCount = evt.locations?.length ?? 0;
                  return (
                    <button
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      className={`text-left p-2 rounded border transition text-xs ${
                        selectedEvent?.id === evt.id
                          ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10"
                          : "border-[var(--color-gold-dark)]/10 hover:bg-[var(--color-gold)]/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <span className="font-medium">
                            {evt.type === "biblical" ? eventTitle(evt.id, evt.title, locale) : evt.title}
                          </span>
                          <span className="opacity-40 ml-1">{yearLabel(evt.year, t)}</span>
                        </div>
                        <span className={`shrink-0 text-[8px] px-1 rounded ${
                          evt.type === "biblical"
                            ? "bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)]"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {evt.type === "biblical" ? t("timeline.typeBiblicalShort") : t("timeline.typeSecularShort")}
                        </span>
                      </div>
                      {(partCount > 0 || locCount > 0) && (
                        <div className="flex items-center gap-2 mt-1 opacity-40">
                          {partCount > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px]">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {partCount}
                            </span>
                          )}
                          {locCount > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px]">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {locCount}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
