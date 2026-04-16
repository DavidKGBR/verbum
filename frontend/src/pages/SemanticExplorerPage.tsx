import { useCallback, useReducer, useState } from "react";
import {
  fetchExplorerExpand,
  type ExplorerSearchResult,
  type ExplorerPreset,
} from "../services/api";
import {
  explorerReducer,
  initialState,
  nodeKey,
  type ExplorerNode,
  type ExplorerEdge,
  type NodeType,
  type EdgeType,
} from "../components/explorer/explorerReducer";
import ExplorerSearchBar from "../components/explorer/ExplorerSearchBar";
import PresetExplorations from "../components/explorer/PresetExplorations";
import LayerControls from "../components/explorer/LayerControls";
import ExplorerGraph from "../components/explorer/ExplorerGraph";
import DetailPanel from "../components/explorer/DetailPanel";
import { useI18n, type Locale } from "../i18n/i18nContext";
import { personName } from "../i18n/personNames";
import { topicName } from "../i18n/topicNames";
import { placeName } from "../i18n/placeNames";

// ── Locale → Bible translation mapping (same as VerseOfTheDay) ──────────────
const LOCALE_TRANSLATION: Record<string, string> = { en: "kjv", pt: "nvi", es: "rvr" };

// ── G3.d: Raw label formatter ────────────────────────────────────────────────
/**
 * Converts API raw labels (UPPER_CASE, snake_case) to readable Title Case.
 * Preserves all-caps acronyms (≤4 chars: NT, OT, YHWH).
 */
function formatNodeLabel(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => {
      if (word.length <= 4 && word === word.toUpperCase()) return word; // NT, OT, YHWH
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

// ── G3.c: Localize a node label based on type + id + locale ─────────────────
function localizeNodeLabel(
  type: NodeType,
  id: string,
  rawLabel: string,
  locale: Locale
): string {
  if (locale === "en") return rawLabel;
  if (type === "person") return personName(id, locale, rawLabel);
  if (type === "topic") return topicName(id, locale, formatNodeLabel(rawLabel));
  if (type === "place") return placeName(id, locale, rawLabel);
  // strongs + thread: keep raw (Hebrew/Greek word or EN thread name)
  return rawLabel;
}

export default function SemanticExplorerPage() {
  const { t, locale } = useI18n();
  const translation = LOCALE_TRANSLATION[locale] ?? "kjv";
  const [state, dispatch] = useReducer(explorerReducer, initialState);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const hasGraph = state.nodes.size > 0;
  const layersCsv = Array.from(state.activeLayers).join(",");

  // ── Expand a node ────────────────────────────────────────────────────────

  const expandNode = useCallback(
    async (type: string, id: string, isCenter: boolean) => {
      setLoading(true);
      try {
        const data = await fetchExplorerExpand(type, id, layersCsv, 25);

        const center: ExplorerNode = {
          type: data.center.type as NodeType,
          id: data.center.id,
          label: localizeNodeLabel(data.center.type as NodeType, data.center.id, data.center.label, locale),
          gloss: data.center.gloss,
          language: data.center.language,
        };

        const nodes: ExplorerNode[] = data.nodes.map((n) => ({
          type: n.type as NodeType,
          id: n.id,
          label: localizeNodeLabel(n.type as NodeType, n.id, n.label, locale),
          gloss: n.gloss,
          language: n.language,
          shared: n.shared,
        }));

        const edges: ExplorerEdge[] = data.edges.map((e) => ({
          source: e.source,
          target: e.target,
          edge_type: e.edge_type as EdgeType,
          weight: e.weight,
        }));

        if (isCenter) {
          dispatch({ type: "SET_CENTER", node: center, nodes, edges });
        } else {
          dispatch({
            type: "EXPAND_NODE",
            nodeKey: nodeKey(type, id),
            nodes,
            edges,
          });
        }
      } catch (err) {
        console.error("Expand failed:", err);
      } finally {
        setLoading(false);
      }
    },
    [layersCsv]
  );

  // ── Search result selection ──────────────────────────────────────────────

  const handleSearchSelect = useCallback(
    (result: ExplorerSearchResult) => {
      const type = result.type;
      const id = result.id;
      // For topics, use slug from meta if available
      const nodeId =
        type === "topic" && result.meta?.slug
          ? String(result.meta.slug)
          : id;
      expandNode(type, nodeId, true);
    },
    [expandNode]
  );

  // ── Preset selection ───────────────────────────────────────────────────

  const handlePresetSelect = useCallback(
    (preset: ExplorerPreset) => {
      if (preset.entry_nodes.length > 0) {
        const first = preset.entry_nodes[0];
        expandNode(first.type, first.id, true);
      }
    },
    [expandNode]
  );

  // ── Graph interactions ─────────────────────────────────────────────────

  const handleNodeClick = useCallback(
    (key: string) => {
      dispatch({ type: "SELECT_NODE", nodeKey: key });
      setPanelOpen(true);
    },
    []
  );

  const handleNodeDoubleClick = useCallback(
    (key: string) => {
      if (state.expandedNodes.has(key)) return; // already expanded
      const [type, ...idParts] = key.split(":");
      const id = idParts.join(":");
      expandNode(type, id, false);
    },
    [expandNode, state.expandedNodes]
  );

  const handleEdgeClick = useCallback(
    (source: string, target: string) => {
      dispatch({ type: "SELECT_EDGE", source, target });
      setPanelOpen(true);
    },
    []
  );

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Top bar */}
      <div className="px-4 py-3 border-b bg-white flex items-center gap-4 flex-wrap">
        <ExplorerSearchBar onSelect={handleSearchSelect} />
        {hasGraph && (
          <>
            <LayerControls
              activeLayers={state.activeLayers}
              onToggle={(layer) => dispatch({ type: "TOGGLE_LAYER", layer })}
            />
            <button
              onClick={() => dispatch({ type: "CLEAR_GRAPH" })}
              className="text-[10px] px-2 py-1 rounded border border-red-200
                         text-red-400 hover:bg-red-50 transition ml-auto"
            >
              {t("explorer.clear")}
            </button>
          </>
        )}
        {loading && (
          <span className="text-xs opacity-50 animate-pulse ml-2">
            {t("explorer.loading")}
          </span>
        )}
      </div>

      {/* Main area */}
      {!hasGraph ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <PresetExplorations onSelect={handlePresetSelect} />
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* Graph */}
          <div className="flex-1 min-w-0">
            <ExplorerGraph
              state={state}
              onNodeClick={handleNodeClick}
              onNodeDoubleClick={handleNodeDoubleClick}
              onEdgeClick={handleEdgeClick}
            />
          </div>

          {/* Detail panel (collapsible) */}
          {panelOpen && (state.selectedNode || state.selectedEdge) && (
            <div className="w-80 border-l bg-white overflow-hidden flex flex-col shrink-0">
              <DetailPanel
                state={state}
                translation={translation}
                onClose={() => {
                  setPanelOpen(false);
                  dispatch({ type: "SELECT_NODE", nodeKey: null });
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Breadcrumb (G3.f — clickable trail) */}
      {hasGraph && state.breadcrumb.length > 0 && (
        <div className="px-4 py-1.5 border-t bg-white text-[10px] flex items-center gap-1 overflow-x-auto">
          <span className="opacity-40">{t("explorer.trail")}</span>
          {state.breadcrumb.map((key, i) => {
            const node = state.nodes.get(key);
            return (
              <span key={`${key}-${i}`} className="flex items-center gap-1">
                {i > 0 && <span className="opacity-20">→</span>}
                <button
                  onClick={() => {
                    dispatch({ type: "SELECT_NODE", nodeKey: key });
                    setPanelOpen(true);
                  }}
                  className="font-medium text-[var(--color-gold-dark)] hover:underline cursor-pointer"
                >
                  {node?.label || key}
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
