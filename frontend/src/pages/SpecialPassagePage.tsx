/**
 * SpecialPassagePage — Catálogo + visualização de Passagens Especiais.
 *
 * /special-passages          → grid de cards do catálogo
 * /special-passages/:id      → MultiLayerView da passagem selecionada
 */

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MultiLayerView from "../components/special-passages/MultiLayerView";
import WordDetailPanel from "../components/lexicon/WordDetailPanel";
import LoadingSpinner from "../components/common/LoadingSpinner";
import {
  fetchSpecialPassageCatalog,
  fetchSpecialPassage,
  type SpecialPassageMeta,
  type SpecialPassageResult,
  type PassageLayerKey,
  type PassageWord,
} from "../services/api";

/* ── Catalog page ─────────────────────────────────────────────────────────── */

const LAYER_DOT: Record<PassageLayerKey, string> = {
  aramaic:    "bg-amber-500",
  greek:      "bg-purple-500",
  portuguese: "bg-emerald-500",
  english:    "bg-blue-400",
};

const LAYER_LABEL: Record<PassageLayerKey, string> = {
  aramaic:    "Aramaico",
  greek:      "Grego",
  portuguese: "Português",
  english:    "English",
};

function CatalogPage() {
  const [catalog, setCatalog] = useState<SpecialPassageMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpecialPassageCatalog()
      .then((d) => setCatalog(d.passages))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Passagens Especiais
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Textos curados com múltiplas camadas de língua simultâneas — Aramaico,
          Grego, Português e Inglês.
        </p>
      </div>

      {catalog.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">Nenhuma passagem disponível.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {catalog.map((p) => (
            <Link
              key={p.id}
              to={`/special-passages/${p.id}`}
              className="group flex flex-col gap-3 rounded-xl border border-[var(--color-border)]
                         bg-[var(--color-surface)] hover:border-[var(--color-gold)]/60
                         hover:shadow-md transition-all p-5"
            >
              {/* Badge */}
              {p.badge && (
                <span className="self-start text-[11px] px-2 py-0.5 rounded-full font-medium
                                 bg-[var(--color-gold)]/15 text-[var(--color-gold-dark)]">
                  {p.badge}
                </span>
              )}

              {/* Title */}
              <div>
                <h2 className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-gold-dark)] transition-colors">
                  {p.title}
                </h2>
                {p.title_en && (
                  <p className="text-xs text-[var(--color-text-muted)] italic">{p.title_en}</p>
                )}
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{p.reference}</p>
              </div>

              {/* Description */}
              {p.description && (
                <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">
                  {p.description}
                </p>
              )}

              {/* Layer dots */}
              <div className="flex gap-2 flex-wrap">
                {p.layers.map((lk) => (
                  <span key={lk} className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
                    <span className={["w-2 h-2 rounded-full", LAYER_DOT[lk]].join(" ")} />
                    {LAYER_LABEL[lk]}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Passage detail page ──────────────────────────────────────────────────── */

const PT_TRANSLATIONS = ["nvi", "ra", "acf"] as const;
const EN_TRANSLATIONS = ["kjv", "bbe", "asv", "web", "darby"] as const;

function PassageDetailPage({ passageId }: { passageId: string }) {
  const [passage, setPassage] = useState<SpecialPassageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [translation, setTranslation] = useState("nvi");
  const [translationEn, setTranslationEn] = useState("kjv");
  const [selectedStrongs, setSelectedStrongs] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchSpecialPassage(passageId, translation, translationEn)
      .then(setPassage)
      .catch((e) => setError(e.message ?? "Erro ao carregar passagem."))
      .finally(() => setLoading(false));
  }, [passageId, translation, translationEn]);

  function handleWordClick(word: PassageWord, _layerKey: PassageLayerKey) {
    if (word.strongs_id) setSelectedStrongs(word.strongs_id);
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="text-xs text-[var(--color-text-muted)] flex gap-1 items-center">
        <Link to="/special-passages" className="hover:text-[var(--color-gold-dark)] transition-colors">
          Passagens Especiais
        </Link>
        <span>›</span>
        <span>{passage?.title ?? passageId}</span>
      </nav>

      {/* Header */}
      {passage && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              {passage.title}
            </h1>
            {passage.title_en && (
              <span className="text-sm text-[var(--color-text-muted)] italic">
                — {passage.title_en}
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">{passage.reference}</p>
        </div>
      )}

      {/* Translation selectors */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--color-text-muted)] font-medium">
            Português:
          </label>
          <select
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            className="text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]
                       text-[var(--color-text-primary)] px-2 py-1 focus:outline-none
                       focus:ring-1 focus:ring-[var(--color-gold)]/60"
          >
            {PT_TRANSLATIONS.map((t) => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--color-text-muted)] font-medium">
            English:
          </label>
          <select
            value={translationEn}
            onChange={(e) => setTranslationEn(e.target.value)}
            className="text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]
                       text-[var(--color-text-primary)] px-2 py-1 focus:outline-none
                       focus:ring-1 focus:ring-[var(--color-gold)]/60"
          >
            {EN_TRANSLATIONS.map((t) => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading && <LoadingSpinner />}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {!loading && !error && passage && (
        <MultiLayerView passage={passage} onWordClick={handleWordClick} />
      )}

      {/* Word detail panel (Strong's) */}
      {selectedStrongs && (
        <WordDetailPanel
          strongsId={selectedStrongs}
          onClose={() => setSelectedStrongs(null)}
        />
      )}
    </div>
  );
}

/* ── Router entry point ───────────────────────────────────────────────────── */

export default function SpecialPassagePage() {
  const { passageId } = useParams<{ passageId?: string }>();
  return passageId ? (
    <PassageDetailPage passageId={passageId} />
  ) : (
    <CatalogPage />
  );
}
