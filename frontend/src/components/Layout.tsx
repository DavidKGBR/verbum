import { NavLink, Outlet, Link } from "react-router-dom";
import { useReadingHistory } from "../hooks/useReadingHistory";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { to: "/reader", label: "Reader", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { to: "/arc-diagram", label: "Arc Diagram", icon: "M4 19a8 8 0 0116 0M12 3v8m-4 4h8" },
  { to: "/search", label: "Search", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
  { to: "/bookmarks", label: "Bookmarks", icon: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" },
];

export default function Layout() {
  const { getLastRead } = useReadingHistory();
  const last = getLastRead();

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <nav className="w-56 shrink-0 bg-[var(--color-ink)] text-[var(--color-parchment)] flex flex-col p-4 gap-1">
        <h1 className="font-display text-xl font-bold mb-6 tracking-wide text-[var(--color-gold)]">
          Bible Data Pipeline
        </h1>
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

        {/* Continue Reading */}
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
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
