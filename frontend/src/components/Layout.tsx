import { useState, useEffect } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { useReadingHistory } from "../hooks/useReadingHistory";
import { useI18n, LOCALES } from "../i18n/i18nContext";
import VerbumLogo from "./common/VerbumLogo";
import StreakBadge from "./streak/StreakBadge";

const NAV_ITEMS = [
  { to: "/", i18nKey: "nav.home", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { to: "/reader", i18nKey: "nav.reader", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { to: "/arc-diagram", i18nKey: "nav.arcDiagram", icon: "M4 19a8 8 0 0116 0M12 3v8m-4 4h8" },
  { to: "/search", i18nKey: "nav.search", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
  { to: "/bookmarks", i18nKey: "nav.bookmarks", icon: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" },
  { to: "/notes", i18nKey: "nav.notes", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" },
  { to: "/plans", i18nKey: "nav.plans", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { to: "/dictionary", i18nKey: "nav.dictionary", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { to: "/semantic-graph", i18nKey: "nav.graph", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
  { to: "/authors", i18nKey: "nav.authors", icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" },
  { to: "/people", i18nKey: "nav.people", icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" },
  { to: "/places", i18nKey: "nav.places", icon: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" },
  { to: "/map", i18nKey: "nav.map", icon: "M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" },
  { to: "/timeline", i18nKey: "nav.timeline", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
  { to: "/compare", i18nKey: "nav.compare", icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" },
  { to: "/topics", i18nKey: "nav.topics", icon: "M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z M6 6h.008v.008H6V6z" },
  { to: "/devotional", i18nKey: "nav.devotional", icon: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" },
  { to: "/deep-analytics", i18nKey: "nav.analytics", icon: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" },
  { to: "/intertextuality", i18nKey: "nav.citations", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
  { to: "/open-questions", i18nKey: "nav.questions", icon: "M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" },
  { to: "/threads", i18nKey: "nav.threads", icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" },
  { to: "/structure", i18nKey: "nav.structure", icon: "M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" },
  { to: "/emotional", i18nKey: "nav.emotional", icon: "M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" },
  { to: "/community", i18nKey: "nav.community", icon: "M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" },
];

export default function Layout() {
  const { getLastRead } = useReadingHistory();
  const { t, locale, setLocale } = useI18n();
  const last = getLastRead();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Auto-close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mobileOpen]);

  const sidebarContent = (
    <>
      <Link
        to="/"
        className="block mb-6 px-1 text-[var(--color-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50 rounded"
        aria-label="Verbum — home"
      >
        <VerbumLogo variant="wordmark" className="h-7 w-auto" />
        <p className="text-[9px] uppercase tracking-[0.3em] opacity-40 mt-1.5 font-display">
          Bible Data Pipeline
        </p>
      </Link>
      {/* Language selector */}
      <div className="flex items-center gap-1 mb-4 px-1">
        {LOCALES.map((loc) => (
          <button
            key={loc.code}
            onClick={() => setLocale(loc.code)}
            className={`text-lg px-1.5 py-0.5 rounded transition ${
              locale === loc.code
                ? "bg-[var(--color-gold)]/20 ring-1 ring-[var(--color-gold)]/40"
                : "opacity-50 hover:opacity-100"
            }`}
            title={loc.label}
            aria-label={`Switch to ${loc.label}`}
          >
            {loc.flag}
          </button>
        ))}
      </div>

      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
              isActive
                ? "bg-[var(--color-gold)]/20 text-[var(--color-gold)]"
                : "hover:bg-white/10"
            }`
          }
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
          </svg>
          {t(item.i18nKey)}
        </NavLink>
      ))}

      {last && (
        <Link
          to={`/reader?book=${last.book_id}&chapter=${last.chapter}&translation=${last.translation}`}
          className="mt-4 mx-1 p-3 rounded border border-[var(--color-gold)]/20
                     bg-[var(--color-gold)]/5 hover:bg-[var(--color-gold)]/15 transition group"
          title="Continue where you left off"
        >
          <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">
            {t("nav.continue")}
          </div>
          <div className="text-sm font-bold text-[var(--color-gold)] truncate">
            {last.book_name || last.book_id} {last.chapter}
          </div>
          <div className="text-[10px] opacity-50 mt-0.5">
            {last.translation.toUpperCase()}
          </div>
        </Link>
      )}

      <StreakBadge />
    </>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full">
      {/* Mobile top bar (visible < md) */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[var(--color-ink)] text-[var(--color-parchment)] sticky top-0 z-30">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          className="p-1 -ml-1 rounded hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link to="/" aria-label="Verbum — home" className="text-[var(--color-gold)] flex items-center">
          <VerbumLogo variant="wordmark" className="h-5 w-auto" />
        </Link>
        <span className="w-8" aria-hidden /> {/* spacer for centering */}
      </header>

      {/* Desktop sidebar (md+) */}
      <nav className="hidden md:flex w-56 shrink-0 bg-[var(--color-ink)] text-[var(--color-parchment)] flex-col p-4 gap-1">
        {sidebarContent}
      </nav>

      {/* Mobile drawer (< md) */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 z-40 fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <nav
            className="md:hidden fixed top-0 left-0 bottom-0 w-64 bg-[var(--color-ink)]
                       text-[var(--color-parchment)] flex flex-col p-4 gap-1 z-50 shadow-2xl"
            aria-label="Main navigation"
          >
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="absolute top-3 right-3 p-1 rounded hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {sidebarContent}
          </nav>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
