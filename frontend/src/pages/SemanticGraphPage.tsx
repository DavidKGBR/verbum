import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as d3 from "d3";
import {
  fetchSemanticGraph,
  type GraphNode,
  type SemanticGraph,
} from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useI18n } from "../i18n/i18nContext";

// Force layout node extends GraphNode with simulation positions
interface SimNode extends GraphNode, d3.SimulationNodeDatum {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimEdge extends d3.SimulationLinkDatum<SimNode> {
  weight: number;
}

export default function SemanticGraphPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);
  const [query, setQuery] = useState("G25");
  const [graph, setGraph] = useState<SemanticGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minShared, setMinShared] = useState(10);
  const [excludeCommon, setExcludeCommon] = useState(true);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    node: GraphNode;
  } | null>(null);

  const loadGraph = useCallback(
    (center: string) => {
      setLoading(true);
      setError(null);
      fetchSemanticGraph(center, minShared, 30, excludeCommon)
        .then(setGraph)
        .catch(() => setError(t("graph.loadError")))
        .finally(() => setLoading(false));
    },
    [minShared, excludeCommon, t]
  );

  useEffect(() => {
    loadGraph(query);
  }, [loadGraph, query]);

  // D3 force simulation
  useEffect(() => {
    if (!graph || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    svg.selectAll("*").remove();

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on("zoom", (e) => g.attr("transform", e.transform));
    svg.call(zoom);

    // Nodes: center + neighbors
    const centerNode: SimNode = { ...graph.center, shared: 0 };
    const neighborNodes: SimNode[] = graph.nodes.map((n) => ({ ...n }));
    const allNodes: SimNode[] = [centerNode, ...neighborNodes];

    const maxShared = Math.max(1, ...neighborNodes.map((n) => n.shared || 1));

    // Edges
    const links: SimEdge[] = graph.edges.map((e) => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
    }));

    // Force simulation
    const sim = d3
      .forceSimulation<SimNode>(allNodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimEdge>(links)
          .id((d) => d.id)
          .distance(120)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d) => nodeRadius(d as SimNode, maxShared) + 8));

    // Edges
    const linkSel = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#2c1810")
      .attr("stroke-opacity", 0.12)
      .attr("stroke-width", (d) => Math.max(1, d.weight / 8));

    // Nodes
    const nodeSel = g
      .append("g")
      .selectAll("g")
      .data(allNodes)
      .join("g")
      .attr("cursor", "pointer")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .call(
        (d3
          .drag<SVGGElement, SimNode>()
          .on("start", (e: any, d: any) => {
            if (!e.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (e: any, d: any) => {
            d.fx = e.x;
            d.fy = e.y;
          })
          .on("end", (e: any, d: any) => {
            if (!e.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })) as any
      );

    nodeSel
      .append("circle")
      .attr("r", (d) => nodeRadius(d, maxShared))
      .attr("fill", (d) => nodeColor(d, graph.center.id))
      .attr("stroke", (d) =>
        d.id === graph.center.id ? "#c4a265" : "rgba(0,0,0,0.15)"
      )
      .attr("stroke-width", (d) => (d.id === graph.center.id ? 3 : 1));

    // Labels
    nodeSel
      .append("text")
      .text((d) => d.label || d.id)
      .attr("dy", (d) => nodeRadius(d, maxShared) + 14)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", "#2c1810")
      .attr("opacity", 0.7)
      .attr("pointer-events", "none");

    // Interactions
    nodeSel
      .on("click", (_e, d) => {
        if (d.id === graph.center.id) return;
        navigate(`/word-study/${d.id}`);
      })
      .on("mouseenter", (e, d) => {
        setTooltip({ x: e.pageX, y: e.pageY, node: d });
      })
      .on("mouseleave", () => setTooltip(null));

    sim.on("tick", () => {
      linkSel
        .attr("x1", (d) => ((d.source as SimNode).x ?? 0))
        .attr("y1", (d) => ((d.source as SimNode).y ?? 0))
        .attr("x2", (d) => ((d.target as SimNode).x ?? 0))
        .attr("y2", (d) => ((d.target as SimNode).y ?? 0));

      nodeSel.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { sim.stop(); };
  }, [graph, navigate]);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 80px)" }}>
      <div className="shrink-0 mb-4">
        <h1 className="page-title text-2xl">{t("graph.title")}</h1>
        <p className="text-sm opacity-60 mt-1">
          {t("graph.subtitle")}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-4 items-center shrink-0">
        <label className="flex items-center gap-2 text-sm">
          {t("graph.centerLabel")}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && loadGraph(query)}
            placeholder={t("graph.centerPlaceholder")}
            className="border border-[var(--color-gold-dark)]/20 rounded-lg px-3 py-1.5 w-32 text-sm
                       bg-white text-[var(--color-ink)] focus:outline-none focus:ring-2
                       focus:ring-[var(--color-gold)]/50 focus:border-[var(--color-gold)]/50"
          />
        </label>
        <button
          onClick={() => loadGraph(query)}
          className="text-sm px-3 py-1 rounded bg-[var(--color-gold)] text-white
                     hover:opacity-90 transition"
        >
          {t("graph.loadBtn")}
        </button>
        <label className="flex items-center gap-2 text-sm">
          {t("graph.minShared").replace("{n}", String(minShared))}
          <input
            type="range"
            min={2}
            max={50}
            value={minShared}
            onChange={(e) => setMinShared(Number(e.target.value))}
            className="w-28"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={excludeCommon}
            onChange={(e) => setExcludeCommon(e.target.checked)}
          />
          {t("graph.hideCommon")}
        </label>
      </div>

      {loading && <LoadingSpinner text={t("graph.building")} />}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* Graph */}
      <div className="flex-1 min-h-0 rounded border bg-white overflow-hidden relative">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ minHeight: 400 }}
        />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed bg-[var(--color-ink)] text-[var(--color-parchment)]
                       text-xs px-3 py-1.5 rounded shadow-lg z-50 pointer-events-none max-w-xs"
            style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
          >
            <div className="font-bold">{tooltip.node.label} ({tooltip.node.id})</div>
            <div className="opacity-70">{tooltip.node.gloss}</div>
            {tooltip.node.shared ? (
              <div className="opacity-50 mt-0.5">
                {t("graph.tooltip").replace("{n}", String(tooltip.node.shared))}
              </div>
            ) : null}
          </div>
        )}

        {/* Legend */}
        {graph && !loading && (
          <div className="absolute bottom-3 left-3 text-[10px] opacity-50 flex gap-4">
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: "#c4a265" }}
              />
              {t("graph.legendCenter")}
            </span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: "#4a7c59" }}
              />
              {t("graph.legendHebrew")}
            </span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: "#6b4c9a" }}
              />
              {t("graph.legendGreek")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nodeRadius(d: SimNode, maxShared: number): number {
  if (!d.shared && d.shared !== 0) return 20; // center node
  return Math.max(6, Math.sqrt((d.shared || 1) / maxShared) * 25);
}

function nodeColor(d: SimNode, centerId: string): string {
  if (d.id === centerId) return "#c4a265"; // gold center
  if (d.language === "hebrew") return "#4a7c59"; // OT green
  return "#6b4c9a"; // NT purple
}
