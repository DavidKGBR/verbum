import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/i18nContext";

interface EraData {
  era: string;
  total_occurrences: number;
  book_count: number;
  top_books: { book_id: string; count: number }[];
  top_glosses: { gloss: string; count: number }[];
  top_semantic_tags: { tag: string; count: number }[];
}

interface JourneyData {
  strongs_id: string;
  total_eras: number;
  total_occurrences: number;
  journey: EraData[];
}

const ERA_COLORS: Record<string, string> = {
  Pentateuch: "#8B4513",
  History: "#CD853F",
  Poetry: "#DAA520",
  Prophets: "#B22222",
  Gospels: "#2E8B57",
  Epistles: "#4169E1",
  Apocalyptic: "#8B008B",
};

export default function WordJourney({ strongsId }: { strongsId: string }) {
  const { t } = useI18n();
  const [data, setData] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!strongsId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/v1/words/${strongsId}/journey`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setData)
      .catch(() => setError(t("lexicon.journey.loadError")))
      .finally(() => setLoading(false));
  }, [strongsId, t]);

  if (loading)
    return <p className="text-sm opacity-50 animate-pulse">{t("lexicon.journey.loading")}</p>;
  if (error || !data || data.journey.length === 0)
    return <p className="text-sm opacity-50">{t("lexicon.journey.noData")}</p>;

  const maxOcc = Math.max(...data.journey.map((e) => e.total_occurrences));

  return (
    <div className="space-y-4">
      {/* Era timeline bar */}
      <div className="flex rounded-lg overflow-hidden h-8 bg-black/5">
        {data.journey.map((era) => (
          <div
            key={era.era}
            className="flex items-center justify-center text-white text-[10px] font-bold tracking-wide transition-all"
            style={{
              width: `${(era.total_occurrences / data.total_occurrences) * 100}%`,
              backgroundColor: ERA_COLORS[era.era] || "#666",
              minWidth: "2rem",
            }}
            title={t("lexicon.journey.eraTooltip")
              .replace("{era}", era.era)
              .replace("{n}", String(era.total_occurrences))}
          >
            {era.total_occurrences > 0 && era.era.slice(0, 4)}
          </div>
        ))}
      </div>

      {/* Era cards */}
      {data.journey.map((era) => (
        <div
          key={era.era}
          className="rounded-lg border bg-white p-4"
          style={{ borderLeftWidth: 4, borderLeftColor: ERA_COLORS[era.era] || "#666" }}
        >
          <div className="flex items-baseline justify-between mb-2">
            <h4 className="font-display font-bold text-sm">{era.era}</h4>
            <span className="text-xs opacity-50 tabular-nums">
              {(era.book_count === 1
                ? t("lexicon.journey.occurrencesOne")
                : t("lexicon.journey.occurrences")
              )
                .replace("{n}", String(era.total_occurrences))
                .replace("{books}", String(era.book_count))}
            </span>
          </div>

          {/* Frequency bar */}
          <div className="h-2 bg-black/5 rounded-full mb-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(era.total_occurrences / maxOcc) * 100}%`,
                backgroundColor: ERA_COLORS[era.era] || "#666",
              }}
            />
          </div>

          {/* Glosses — how the word is used */}
          {era.top_glosses.length > 0 && (
            <div className="mb-2">
              <span className="text-[10px] uppercase tracking-wider opacity-40 mr-2">
                {t("lexicon.journey.meanings")}
              </span>
              {era.top_glosses.map((g, i) => (
                <span key={g.gloss} className="text-xs">
                  {i > 0 && " · "}
                  <span className="font-medium">{g.gloss}</span>
                  <span className="opacity-40"> ({g.count})</span>
                </span>
              ))}
            </div>
          )}

          {/* Top books */}
          {era.top_books.length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-wider opacity-40 mr-2">
                {t("lexicon.journey.books")}
              </span>
              {era.top_books.map((b, i) => (
                <span key={b.book_id} className="text-xs opacity-70">
                  {i > 0 && ", "}
                  {b.book_id}
                  <span className="opacity-40"> ({b.count})</span>
                </span>
              ))}
            </div>
          )}

          {/* Semantic tags */}
          {era.top_semantic_tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {era.top_semantic_tags.map((tag) => (
                <span
                  key={tag.tag}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 opacity-60"
                >
                  {tag.tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
