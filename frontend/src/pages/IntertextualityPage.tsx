import { useEffect, useState } from "react";
import {
  fetchCitationHeatmap,
  fetchOtNtQuotations,
  type HeatmapCell,
  type QuotationEdge,
} from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";

type Tab = "heatmap" | "graph";

export default function IntertextualityPage() {
  const [tab, setTab] = useState<Tab>("heatmap");

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-display font-bold mb-1">Intertextuality</h1>
      <p className="text-sm opacity-60 mb-6">
        How the Old Testament and New Testament reference each other.
      </p>

      <div className="flex gap-2 mb-6">
        {(["heatmap", "graph"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t
                ? "bg-[var(--color-gold)] text-white"
                : "bg-black/5 hover:bg-black/10"
            }`}
          >
            {t === "heatmap" ? "Citation Heatmap" : "Citation Graph"}
          </button>
        ))}
      </div>

      {tab === "heatmap" && <HeatmapTab />}
      {tab === "graph" && <GraphTab />}
    </div>
  );
}

function HeatmapTab() {
  const [cells, setCells] = useState<HeatmapCell[]>([]);
  const [otBooks, setOtBooks] = useState<string[]>([]);
  const [ntBooks, setNtBooks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <LoadingSpinner text="Building heatmap..." />;

  const maxCount = Math.max(...cells.map((c) => c.count), 1);

  // Build lookup
  const lookup: Record<string, number> = {};
  cells.forEach((c) => {
    lookup[`${c.source}-${c.target}`] = c.count;
  });

  return (
    <div className="overflow-x-auto">
      <table className="text-[10px] border-collapse">
        <thead>
          <tr>
            <th className="p-1 sticky left-0 bg-white z-10">OT \ NT</th>
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
                return (
                  <td
                    key={nt}
                    className="p-0 w-5 h-5"
                    title={count > 0 ? `${ot} → ${nt}: ${count} refs` : ""}
                  >
                    {count > 0 && (
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
  );
}

function GraphTab() {
  const [edges, setEdges] = useState<QuotationEdge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchOtNtQuotations()
      .then((d) => setEdges(d.edges))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading citation graph..." />;

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
        Top OT→NT cross-reference pairs by number of connections ({edges.length} total
        citations)
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
