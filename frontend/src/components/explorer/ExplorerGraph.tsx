import { useCallback, useEffect, useRef, useState, useReducer } from "react";
import * as d3 from "d3";
import type { ExplorerNode, NodeType, ExplorerState } from "./explorerReducer";
import { useI18n } from "../../i18n/i18nContext";

interface Props {
  state: ExplorerState;
  onNodeClick: (key: string) => void;
  onNodeDoubleClick: (key: string) => void;
  onEdgeClick: (source: string, target: string) => void;
}

// ── Visual config ────────────────────────────────────────────────────────────

const NODE_COLORS: Record<NodeType, string> = {
  strongs: "#22c55e",
  topic: "#d97706",
  thread: "#14b8a6",
  person: "#3b82f6",
  place: "#f97316",
};

const NODE_RADIUS: Record<NodeType, number> = {
  strongs: 8,
  topic: 10,
  thread: 7,
  person: 9,
  place: 9,
};

const EDGE_COLORS: Record<string, string> = {
  "co-occurrence": "#94a3b8",
  topic_link: "#d97706",
  cross_ref: "#3b82f6",
  thread: "#14b8a6",
  mention: "#8b5cf6",
};

interface SimNode extends d3.SimulationNodeDatum {
  key: string;
  data: ExplorerNode;
}

interface SimEdge extends d3.SimulationLinkDatum<SimNode> {
  edge_type: string;
  weight: number;
  sourceKey: string;
  targetKey: string;
}

export default function ExplorerGraph({
  state,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
}: Props) {
  const { t } = useI18n();
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimEdge>>(undefined);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [legendOpen, toggleLegend] = useReducer((s: boolean) => !s, true);

  // ResizeObserver
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDimensions({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Stable callbacks
  const nodeClickRef = useRef(onNodeClick);
  const nodeDblClickRef = useRef(onNodeDoubleClick);
  const edgeClickRef = useRef(onEdgeClick);
  nodeClickRef.current = onNodeClick;
  nodeDblClickRef.current = onNodeDoubleClick;
  edgeClickRef.current = onEdgeClick;

  const render = useCallback(() => {
    const svg = d3.select(svgRef.current);
    if (!svgRef.current) return;

    const { width, height } = dimensions;
    const { nodes: nodeMap, edges, selectedNode, centerNode, activeLayers } = state;

    // Filter nodes by active layers
    const layerTypeMap: Record<string, string> = {
      strongs: "lexical",
      topic: "topics",
      thread: "threads",
      person: "people",
      place: "people",
    };

    const visibleNodes: SimNode[] = [];
    nodeMap.forEach((n, key) => {
      const layer = layerTypeMap[n.type] || "lexical";
      if (activeLayers.has(layer as any) || key === centerNode) {
        visibleNodes.push({ key, data: n, x: n.x, y: n.y });
      }
    });

    const visibleKeys = new Set(visibleNodes.map((n) => n.key));
    const visibleEdges: SimEdge[] = edges
      .filter((e) => visibleKeys.has(e.source) && visibleKeys.has(e.target))
      .map((e) => ({
        source: e.source,
        target: e.target,
        sourceKey: e.source,
        targetKey: e.target,
        edge_type: e.edge_type,
        weight: e.weight,
      }));

    // D3 force simulation
    if (simRef.current) simRef.current.stop();

    const simulation = d3
      .forceSimulation<SimNode>(visibleNodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimEdge>(visibleEdges)
          .id((d) => d.key)
          .distance(80)
          .strength(0.4)
      )
      .force("charge", d3.forceManyBody().strength(-200).distanceMax(300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<SimNode>().radius(20))
      .alphaDecay(0.02);

    simRef.current = simulation;

    // Clear and render
    svg.selectAll("*").remove();

    // Zoom group
    const g = svg.append("g");
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    svg.call(zoom as any);

    // Edges
    const edgeGroup = g
      .append("g")
      .attr("class", "edges")
      .selectAll("line")
      .data(visibleEdges)
      .join("line")
      .attr("stroke", (d) => EDGE_COLORS[d.edge_type] || "#cbd5e1")
      .attr("stroke-width", (d) => Math.max(1, Math.min(d.weight / 5, 4)))
      .attr("stroke-opacity", 0.5)
      .attr("stroke-dasharray", (d) =>
        d.edge_type === "topic_link" ? "5,3" : d.edge_type === "cross_ref" ? "2,2" : "none"
      )
      .style("cursor", "pointer")
      .on("click", (_event, d) => {
        edgeClickRef.current(d.sourceKey, d.targetKey);
      });

    // Nodes
    const nodeGroup = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(visibleNodes)
      .join("g")
      .style("cursor", "pointer");

    // Apply drag behavior
    const dragBehavior = d3
      .drag<SVGGElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nodeGroup.call(dragBehavior as any);

    // Node shapes
    nodeGroup.each(function (d) {
      const el = d3.select(this);
      const r = NODE_RADIUS[d.data.type] || 8;
      const color = NODE_COLORS[d.data.type] || "#64748b";
      const isCenter = d.key === centerNode;
      const isSelected = d.key === selectedNode;

      if (d.data.type === "topic") {
        // Rounded rect for topics
        el.append("rect")
          .attr("x", -r * 1.3)
          .attr("y", -r)
          .attr("width", r * 2.6)
          .attr("height", r * 2)
          .attr("rx", 4)
          .attr("fill", color)
          .attr("fill-opacity", 0.15)
          .attr("stroke", color)
          .attr("stroke-width", isCenter ? 3 : isSelected ? 2.5 : 1.5);
      } else if (d.data.type === "thread") {
        // Diamond for threads
        el.append("path")
          .attr("d", `M0,${-r} L${r},0 L0,${r} L${-r},0 Z`)
          .attr("fill", color)
          .attr("fill-opacity", 0.15)
          .attr("stroke", color)
          .attr("stroke-width", isCenter ? 3 : isSelected ? 2.5 : 1.5);
      } else {
        // Circle for strongs, person, place
        el.append("circle")
          .attr("r", isCenter ? r * 1.5 : r)
          .attr("fill", color)
          .attr("fill-opacity", isCenter ? 0.3 : 0.15)
          .attr("stroke", color)
          .attr("stroke-width", isCenter ? 3 : isSelected ? 2.5 : 1.5);
      }

      // Label
      el.append("text")
        .attr("dy", r + 14)
        .attr("text-anchor", "middle")
        .attr("font-size", isCenter ? 12 : 10)
        .attr("font-weight", isCenter ? "bold" : "normal")
        .attr("fill", "#1e293b")
        .attr("pointer-events", "none")
        .text(
          d.data.label.length > 16
            ? d.data.label.slice(0, 14) + "…"
            : d.data.label
        );
    });

    // Click events (single vs double)
    let clickTimer: ReturnType<typeof setTimeout> | null = null;
    nodeGroup.on("click", (_event, d) => {
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
        nodeDblClickRef.current(d.key);
      } else {
        clickTimer = setTimeout(() => {
          clickTimer = null;
          nodeClickRef.current(d.key);
        }, 250);
      }
    });

    // Simulation tick
    simulation.on("tick", () => {
      edgeGroup
        .attr("x1", (d) => (d.source as SimNode).x || 0)
        .attr("y1", (d) => (d.source as SimNode).y || 0)
        .attr("x2", (d) => (d.target as SimNode).x || 0)
        .attr("y2", (d) => (d.target as SimNode).y || 0);

      nodeGroup.attr("transform", (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

  }, [state, dimensions]);

  useEffect(() => {
    render();
    return () => { simRef.current?.stop(); };
  }, [render]);

  return (
    <div className="w-full h-full min-h-[400px] bg-[var(--color-parchment)]/30 rounded-lg border relative">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />

      {/* Legend (G3.g — collapsible) */}
      <div className="absolute bottom-3 left-3">
        <button
          onClick={toggleLegend}
          className="text-[9px] px-2 py-1 bg-white/90 rounded border opacity-60 hover:opacity-100 transition mb-1 block"
        >
          {t("explorer.legendToggle")} {legendOpen ? "▲" : "▼"}
        </button>
        {legendOpen && (
          <div className="bg-white/90 rounded border px-3 py-2 text-[10px] space-y-1">
            {Object.entries(NODE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full border"
                  style={{ backgroundColor: color + "30", borderColor: color }}
                />
                <span className="opacity-70">
                  {type === "strongs"
                    ? t("explorer.types.strongsShort")
                    : t(`explorer.types.${type}Short`)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="absolute bottom-3 right-3 text-[10px] opacity-40">
        {t("explorer.nodesEdges")
          .replace("{nodes}", String(state.nodes.size))
          .replace("{edges}", String(state.edges.length))}
      </div>
    </div>
  );
}
