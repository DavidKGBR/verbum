import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchCitationHeatmap,
  fetchCrossrefsBetween,
  fetchOtNtQuotations,
  type DetailedCrossRef,
  type HeatmapCell,
  type QuotationEdge,
} from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useI18n } from "../i18n/i18nContext";

type Tab = "heatmap" | "graph";

export default function IntertextualityPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("heatmap");

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-display font-bold mb-1">{t("intertextuality.title")}</h1>
      <p className="text-sm opacity-60 mb-6">
        {t("intertextuality.subtitle")}
      </p>

      <div className="flex gap-2 mb-6">
        {(["heatmap", "graph"] as Tab[]).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === tabKey
                ? "bg-[var(--color-gold)] text-white"
                : "bg-black/5 hover:bg-black/10"
            }`}
          >
            {tabKey === "heatmap" ? t("intertextuality.tab.heatmap") : t("intertextuality.tab.graph")}
          </button>
        ))}
      </div>

      {tab === "heatmap" && <HeatmapTab />}
      {tab === "graph" && <GraphTab />}
    </div>
  );
}

function HeatmapTab() {
  const { t } = useI18n();
  const [cells, setCells] = useState<HeatmapCell[]>([]);
  const [otBooks, setOtBooks] = useState<string[]>([]);
  const [ntBooks, setNtBooks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [minRefs, setMinRefs] = useState(1);
  const [selectedPair, setSelectedPair] = useState<{ ot: string; nt: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchCitationHeatmap()
      .then((d) => {
        setCells(d.cells);
        setOtBooks(d.ot_books);
        setNtBooks(d.nt_books);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text={t("intertextuality.heatmap.loading")} />;

  const maxCount = Math.max(...cells.map((c) => c.count), 1);

  // Build lookup
  const lookup: Record<string, number> = {};
  cells.forEach((c) => {
    lookup[`${c.source}-${c.target}`] = c.count;
  });

  return (
    <div>
      {/* Filter + hint row */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
        <label className="flex items-center gap-2">
          <span className="opacity-60">{t("intertextuality.heatmap.minRefs")}:</span>
          <input
            type="range"
            min={1}
            max={Math.min(50, maxCount)}
            value={minRefs}
            onChange={(e) => setMinRefs(Number(e.target.value))}
            className="accent-[var(--color-gold)]"
          />
          <span className="tabular-nums font-bold w-7 text-right">{minRefs}</span>
        </label>
        <span className="opacity-40 italic">{t("intertextuality.heatmap.clickHint")}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="text-[10px] border-collapse">
          <thead>
            <tr>
              {/* Corner cell — same height as rotated headers, diagonal divider for clarity */}
              <th
                className="sticky left-0 top-0 bg-white z-20 h-16 align-bottom p-1 whitespace-nowrap
                           border-b border-[var(--color-gold-dark)]/10"
              >
                <div className="flex justify-between items-end h-full">
                  <span className="text-[9px] opacity-60">
                    {t("intertextuality.heatmap.otAxis")}
                  </span>
                  <span className="text-[9px] opacity-60 self-start">
                    {t("intertextuality.heatmap.ntAxis")}
                  </span>
                </div>
              </th>
              {ntBooks.map((nt) => (
                <th
                  key={nt}
                  className="p-1 font-normal -rotate-45 origin-bottom-left h-16 whitespace-nowrap"
                >
                  {nt}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {otBooks.map((ot) => (
              <tr key={ot}>
                <td className="p-1 font-medium sticky left-0 bg-white z-10 whitespace-nowrap">
                  {ot}
                </td>
                {ntBooks.map((nt) => {
                  const count = lookup[`${ot}-${nt}`] || 0;
                  const intensity = count > 0 ? Math.max(0.1, count / maxCount) : 0;
                  const passesFilter = count >= minRefs;
                  const visible = count > 0 && passesFilter;
                  return (
                    <td
                      key={nt}
                      className={`p-0 w-5 h-5 ${
                        visible ? "cursor-pointer hover:outline hover:outline-2 hover:outline-[var(--color-gold)]" : ""
                      }`}
                      title={
                        count > 0
                          ? t("intertextuality.heatmap.tooltip")
                              .replace("{ot}", ot)
                              .replace("{nt}", nt)
                              .replace("{count}", String(count))
                          : ""
                      }
                      onClick={visible ? () => setSelectedPair({ ot, nt }) : undefined}
                    >
                      {visible && (
                        <div
                          className="w-full h-full"
                          style={{
                            backgroundColor: `rgba(196, 162, 101, ${intensity})`,
                          }}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedPair && (
        <CrossRefPanel
          sourceBook={selectedPair.ot}
          targetBook={selectedPair.nt}
          totalCount={lookup[`${selectedPair.ot}-${selectedPair.nt}`] || 0}
          onClose={() => setSelectedPair(null)}
        />
      )}
    </div>
  );
}

// ─── Cross-reference panel ───────────────────────────────────────────────────

interface CrossRefPanelProps {
  sourceBook: string;
  targetBook: string;
  totalCount: number;
  onClose: () => void;
}

function CrossRefPanel({ sourceBook, targetBook, totalCount, onClose }: CrossRefPanelProps) {
  const { t } = useI18n();
  const [refs, setRefs] = useState<DetailedCrossRef[]>([]);
  const [loading, setLoading] = useState(true);
  const LIMIT = 50;

  useEffect(() => {
    setLoading(true);
    setRefs([]);
    fetchCrossrefsBetween(sourceBook, targetBook, LIMIT)
      .then((d) => setRefs(d.crossrefs))
      .catch(() => setRefs([]))
      .finally(() => setLoading(false));
  }, [sourceBook, targetBook]);

  return (
    <div
      className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-[var(--color-parchment)]
                 shadow-[0_0_40px_rgba(0,0,0,0.15)] border-l border-[var(--color-gold)]/30
                 p-6 overflow-y-auto z-50 flex flex-col fade-in"
    >
      <div className="flex justify-between items-start mb-4 pt-2">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[var(--color-gold-dark)] uppercase">
            {t("intertextuality.panel.title")}
          </span>
          <h2 className="text-2xl font-display mt-1">
            <span className="text-amber-800">{sourceBook}</span>
            <span className="opacity-30 mx-2">→</span>
            <span className="text-blue-800">{targetBook}</span>
          </h2>
          <p className="text-[11px] opacity-50 mt-1">
            {t("intertextuality.panel.showing")
              .replace("{shown}", String(Math.min(refs.length, LIMIT)))
              .replace("{total}", String(totalCount))}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-3xl leading-none font-display font-light text-[var(--color-gold-dark)]
                     opacity-50 hover:opacity-100 transition"
          aria-label={t("intertextuality.panel.close")}
        >
          ×
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner text={t("intertextuality.panel.loading")} />
        </div>
      ) : refs.length === 0 ? (
        <p className="text-sm italic opacity-50">{t("intertextuality.panel.empty")}</p>
      ) : (
        <ul className="space-y-4">
          {refs.map((r) => (
            <li
              key={`${r.source_verse_id}-${r.target_verse_id}`}
              className="text-[13px] font-body leading-relaxed border-l-2 border-[var(--color-gold)]/30 pl-3"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <Link
                  to={`/reader?book=${r.source_verse_id.split(".")[0]}&chapter=${r.source_verse_id.split(".")[1]}&verse=${r.source_verse_id.split(".")[2]}`}
                  className="text-xs font-sans font-bold text-amber-800 hover:underline"
                >
                  {r.source_ref ?? r.source_verse_id}
                </Link>
                <span className="opacity-30 text-xs">→</span>
                <Link
                  to={`/reader?book=${r.target_verse_id.split(".")[0]}&chapter=${r.target_verse_id.split(".")[1]}&verse=${r.target_verse_id.split(".")[2]}`}
                  className="text-xs font-sans font-bold text-blue-800 hover:underline"
                >
                  {r.target_ref ?? r.target_verse_id}
                </Link>
              </div>
              {r.source_text && (
                <p className="italic opacity-80 mb-1">"{r.source_text}"</p>
              )}
              {r.target_text && (
                <p className="text-[var(--color-ink)]/90">"{r.target_text}"</p>
              )}
              {r.votes > 1 && (
                <span className="text-[10px] opacity-40 mt-1 block">
                  {r.votes} votes · {r.reference_type}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GraphTab() {
  const { t } = useI18n();
  const [edges, setEdges] = useState<QuotationEdge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchOtNtQuotations()
      .then((d) => setEdges(d.edges))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text={t("intertextuality.graph.loading")} />;

  // Aggregate edges by book pair
  const pairs: Record<string, { source: string; target: string; count: number; topVotes: number }> =
    {};
  edges.forEach((e) => {
    const key = `${e.source}-${e.target}`;
    if (!pairs[key]) {
      pairs[key] = { source: e.source, target: e.target, count: 0, topVotes: 0 };
    }
    pairs[key].count++;
    pairs[key].topVotes = Math.max(pairs[key].topVotes, e.votes);
  });

  const sorted = Object.values(pairs).sort((a, b) => b.count - a.count);
  const maxCount = sorted[0]?.count || 1;

  return (
    <div>
      <p className="text-xs opacity-50 mb-4">
        {t("intertextuality.graph.summary").replace("{total}", String(edges.length))}
      </p>
      <div className="space-y-1.5">
        {sorted.slice(0, 50).map((p) => (
          <div
            key={`${p.source}-${p.target}`}
            className="flex items-center gap-3 text-sm"
          >
            <span className="w-12 text-right text-xs font-mono opacity-70 text-amber-800">
              {p.source}
            </span>
            <span className="text-xs opacity-30">→</span>
            <span className="w-12 text-xs font-mono opacity-70 text-blue-800">
              {p.target}
            </span>
            <div className="flex-1 h-4 bg-black/5 rounded overflow-hidden">
              <div
                className="h-full rounded bg-[var(--color-gold)]"
                style={{
                  width: `${(p.count / maxCount) * 100}%`,
                  opacity: 0.7,
                }}
              />
            </div>
            <span className="text-xs tabular-nums opacity-50 w-10 text-right">
              {p.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
