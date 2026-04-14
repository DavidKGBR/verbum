import { useState, useEffect } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { useReadingHistory } from "../hooks/useReadingHistory";
import VerbumLogo from "./common/VerbumLogo";
import StreakBadge from "./streak/StreakBadge";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { to: "/reader", label: "Reader", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { to: "/arc-diagram", label: "Arc Diagram", icon: "M4 19a8 8 0 0116 0M12 3v8m-4 4h8" },
  { to: "/search", label: "Search", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
  { to: "/bookmarks", label: "Bookmarks", icon: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" },
  { to: "/notes", label: "Notes", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" },
  { to: "/plans", label: "Plans", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { to: "/dictionary", label: "Dictionary", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { to: "/semantic-graph", label: "Graph", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
];

export default function Layout() {
  const { getLastRead } = useReadingHistory();
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
          {item.label}
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
            📖 Continue
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
