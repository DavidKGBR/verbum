import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchExplorerEdgeEvidence,
  type ExplorerEdgeEvidence,
} from "../../services/api";
import type { ExplorerNode, ExplorerState } from "./explorerReducer";
import { useI18n } from "../../i18n/i18nContext";

interface Props {
  state: ExplorerState;
  onClose: () => void;
  translation?: string;
}

export default function DetailPanel({ state, onClose, translation = "kjv" }: Props) {
  const { selectedNode, selectedEdge, nodes } = state;

  if (selectedEdge) {
    return (
      <EdgeDetail
        sourceKey={selectedEdge.source}
        targetKey={selectedEdge.target}
        nodes={nodes}
        translation={translation}
        onClose={onClose}
      />
    );
  }

  if (selectedNode) {
    const node = nodes.get(selectedNode);
    if (!node) return null;
    return <NodeDetail node={node} onClose={onClose} />;
  }

  return null;
}

// ── Node Detail ──────────────────────────────────────────────────────────────

function NodeDetail({
  node,
  onClose,
}: {
  node: ExplorerNode;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const typeLabel = t(`explorer.types.${node.type}`);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between p-4 border-b">
        <div>
          <div className="text-[10px] uppercase tracking-wider opacity-50 font-bold">
            {typeLabel}
          </div>
          <h3 className="font-display font-bold text-lg text-[var(--color-ink)]">
            {node.label}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-xs opacity-40 hover:opacity-100 transition p-1"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
        {node.gloss && (
          <div>
            <div className="text-[10px] opacity-50 font-bold uppercase mb-1">
              {t("explorer.definition")}
            </div>
            <p className="text-sm">{node.gloss}</p>
          </div>
        )}

        {node.language && (
          <div className="text-xs">
            <span className="opacity-50">{t("explorer.language")}</span>{" "}
            <span className="font-medium">
              {t(`explorer.lang.${node.language}`) || node.language}
            </span>
          </div>
        )}

        {node.type === "strongs" && node.gloss && (
          <div className="text-[10px] opacity-40 italic mt-1">
            {t("explorer.strongsDef.original")}
          </div>
        )}

        {node.shared && (
          <div className="text-xs">
            <span className="opacity-50">{t("explorer.sharedVerses")}</span>{" "}
            <span className="font-medium">{node.shared}</span>
          </div>
        )}

        {/* Links to other pages */}
        <div className="pt-3 border-t space-y-2">
          <div className="text-[10px] opacity-50 font-bold uppercase mb-1">
            {t("explorer.goTo")}
          </div>
          {node.type === "strongs" && (
            <Link
              to={`/word-study/${node.id}`}
              className="block text-xs text-[var(--color-gold)] hover:underline"
            >
              {t("explorer.link.wordStudy").replace("{id}", node.id)}
            </Link>
          )}
          {node.type === "topic" && node.secondary && (
            <Link
              to={`/topics?q=${encodeURIComponent(node.label)}`}
              className="block text-xs text-[var(--color-gold)] hover:underline"
            >
              {t("explorer.link.topic").replace("{label}", node.label)}
            </Link>
          )}
          {node.type === "person" && (
            <Link
              to={`/people?q=${encodeURIComponent(node.label)}`}
              className="block text-xs text-[var(--color-gold)] hover:underline"
            >
              {t("explorer.link.person").replace("{label}", node.label)}
            </Link>
          )}
          {node.type === "place" && (
            <Link
              to={`/places?q=${encodeURIComponent(node.label)}`}
              className="block text-xs text-[var(--color-gold)] hover:underline"
            >
              {t("explorer.link.place").replace("{label}", node.label)}
            </Link>
          )}
        </div>
      </div>

      <div className="p-3 border-t text-[10px] opacity-40 text-center">
        {t("explorer.doubleClickHint")}
      </div>
    </div>
  );
}

// ── Edge Detail ──────────────────────────────────────────────────────────────

function EdgeDetail({
  sourceKey,
  targetKey,
  nodes,
  translation,
  onClose,
}: {
  sourceKey: string;
  targetKey: string;
  nodes: Map<string, ExplorerNode>;
  translation: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [evidence, setEvidence] = useState<ExplorerEdgeEvidence | null>(null);
  const [loading, setLoading] = useState(true);

  const sourceNode = nodes.get(sourceKey);
  const targetNode = nodes.get(targetKey);

  useEffect(() => {
    if (!sourceNode || !targetNode) return;
    setLoading(true);
    fetchExplorerEdgeEvidence(
      sourceNode.type,
      sourceNode.id,
      targetNode.type,
      targetNode.id,
      "co-occurrence",
      8,
      translation
    )
      .then(setEvidence)
      .catch(() => setEvidence(null))
      .finally(() => setLoading(false));
  }, [sourceNode, targetNode]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between p-4 border-b">
        <div>
          <div className="text-[10px] uppercase tracking-wider opacity-50 font-bold">
            {t("explorer.connectionEvidence")}
          </div>
          <h3 className="font-display font-bold text-sm text-[var(--color-ink)]">
            {sourceNode?.label || sourceKey}
            <span className="opacity-30 mx-2">↔</span>
            {targetNode?.label || targetKey}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-xs opacity-40 hover:opacity-100 transition p-1"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <p className="text-sm opacity-50 animate-pulse">{t("explorer.loadingVerses")}</p>
        ) : !evidence || evidence.verses.length === 0 ? (
          <p className="text-sm opacity-50">{t("explorer.noShared")}</p>
        ) : (
          <div className="space-y-3">
            <div className="text-xs opacity-50">
              {t("explorer.sharedTotal")
                .replace("{total}", String(evidence.total_shared))
                .replace("{shown}", String(evidence.verses.length))}
            </div>
            {evidence.verses.map((v) => (
              <div key={v.verse_id} className="border-b pb-3 last:border-0">
                <Link
                  to={`/reader?book=${v.verse_id.split(".")[0]}&chapter=${v.verse_id.split(".")[1]}&verse=${v.verse_id.split(".")[2]}`}
                  className="text-xs font-bold text-[var(--color-gold)] hover:underline"
                >
                  {v.reference || v.verse_id}
                </Link>
                <p className="text-xs mt-1 leading-relaxed opacity-80">
                  {v.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
