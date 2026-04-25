/**
 * State management for the Semantic Explorer graph.
 * Uses useReducer for predictable, additive graph updates.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type NodeType = "strongs" | "topic" | "thread" | "person" | "place";
export type EdgeType = "co-occurrence" | "topic_link" | "cross_ref" | "thread" | "mention";
export type LayerType = "lexical" | "topics" | "crossrefs" | "threads" | "people";

export interface ExplorerNode {
  type: NodeType;
  id: string;
  label: string;
  gloss?: string;
  language?: string;
  shared?: number;
  verse_count?: number;
  /** secondary label from search (e.g., definition) */
  secondary?: string;
  /** x/y positions set by D3 simulation */
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface ExplorerEdge {
  source: string; // "type:id"
  target: string;
  edge_type: EdgeType;
  weight: number;
}

export interface ExplorerState {
  nodes: Map<string, ExplorerNode>;
  edges: ExplorerEdge[];
  selectedNode: string | null;
  selectedEdge: { source: string; target: string } | null;
  expandedNodes: Set<string>;
  activeLayers: Set<LayerType>;
  breadcrumb: string[];
  centerNode: string | null;
}

// ── Key helper ───────────────────────────────────────────────────────────────

export function nodeKey(type: string, id: string): string {
  return `${type}:${id}`;
}

// ── Actions ──────────────────────────────────────────────────────────────────

export type ExplorerAction =
  | { type: "SET_CENTER"; node: ExplorerNode; nodes: ExplorerNode[]; edges: ExplorerEdge[] }
  | { type: "EXPAND_NODE"; nodeKey: string; nodes: ExplorerNode[]; edges: ExplorerEdge[] }
  | { type: "SELECT_NODE"; nodeKey: string | null }
  | { type: "SELECT_EDGE"; source: string; target: string }
  | { type: "DESELECT_EDGE" }
  | { type: "TOGGLE_LAYER"; layer: LayerType }
  | { type: "CLEAR_GRAPH" };

// ── Initial state ────────────────────────────────────────────────────────────

export const initialState: ExplorerState = {
  nodes: new Map(),
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  expandedNodes: new Set(),
  activeLayers: new Set(["lexical", "topics"]),
  breadcrumb: [],
  centerNode: null,
};

// ── Reducer ──────────────────────────────────────────────────────────────────

export function explorerReducer(
  state: ExplorerState,
  action: ExplorerAction
): ExplorerState {
  switch (action.type) {
    case "SET_CENTER": {
      const nodes = new Map<string, ExplorerNode>();
      const key = nodeKey(action.node.type, action.node.id);
      nodes.set(key, action.node);
      for (const n of action.nodes) {
        nodes.set(nodeKey(n.type, n.id), n);
      }
      return {
        ...initialState,
        nodes,
        edges: action.edges,
        activeLayers: new Set(state.activeLayers),
        expandedNodes: new Set([key]),
        breadcrumb: [key],
        centerNode: key,
      };
    }

    case "EXPAND_NODE": {
      const nodes = new Map(state.nodes);
      for (const n of action.nodes) {
        const k = nodeKey(n.type, n.id);
        if (!nodes.has(k)) nodes.set(k, n);
      }
      // Add only new edges (avoid duplicates)
      const edgeSet = new Set(
        state.edges.map((e) => `${e.source}-${e.target}-${e.edge_type}`)
      );
      const newEdges = action.edges.filter(
        (e) => !edgeSet.has(`${e.source}-${e.target}-${e.edge_type}`)
      );
      const expanded = new Set(state.expandedNodes);
      expanded.add(action.nodeKey);
      return {
        ...state,
        nodes,
        edges: [...state.edges, ...newEdges],
        expandedNodes: expanded,
        breadcrumb: [...state.breadcrumb, action.nodeKey],
      };
    }

    case "SELECT_NODE":
      return { ...state, selectedNode: action.nodeKey, selectedEdge: null };

    case "SELECT_EDGE":
      return {
        ...state,
        selectedEdge: { source: action.source, target: action.target },
        selectedNode: null,
      };

    case "DESELECT_EDGE":
      return { ...state, selectedEdge: null };

    case "TOGGLE_LAYER": {
      const layers = new Set(state.activeLayers);
      if (layers.has(action.layer)) layers.delete(action.layer);
      else layers.add(action.layer);
      return { ...state, activeLayers: layers };
    }

    case "CLEAR_GRAPH":
      return { ...initialState, activeLayers: new Set(state.activeLayers) };

    default:
      return state;
  }
}
