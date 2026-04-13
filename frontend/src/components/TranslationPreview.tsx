import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchVerseTranslations } from "../services/api";

// Famous verse — John 3:16
const VERSE_ID = "JHN.3.16";
const TRANSLATIONS = "kjv,nvi,rvr,bbe,ra,acf";

const LABELS: Record<string, { lang: string; short: string }> = {
  kjv: { lang: "English", short: "KJV" },
  asv: { lang: "English", short: "ASV" },
  bbe: { lang: "English", short: "BBE" },
  web: { lang: "English", short: "WEB" },
  nvi: { lang: "Português", short: "NVI" },
  ra: { lang: "Português", short: "RA" },
  acf: { lang: "Português", short: "ACF" },
  rvr: { lang: "Español", short: "RVR" },
  apee: { lang: "Français", short: "APEE" },
  darby: { lang: "English", short: "DARBY" },
};

export default function TranslationPreview() {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVerseTranslations(VERSE_ID, TRANSLATIONS)
      .then((d) => setTranslations(d.translations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-lg border shadow-sm p-5 mb-8">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display font-bold text-lg">
          One Verse · Many Voices
        </h3>
        <span className="text-xs opacity-50 font-mono">John 3:16</span>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-gray-100 rounded w-full"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(translations).map(([tid, text]) => {
            const meta = LABELS[tid] || { lang: "?", short: tid.toUpperCase() };
            return (
              <div
                key={tid}
                className="flex gap-3 pb-3 border-b last:border-0 last:pb-0"
              >
                <div className="shrink-0 w-16 pt-0.5">
                  <div className="text-xs font-bold text-[var(--color-gold)]">
                    {meta.short}
                  </div>
                  <div className="text-[10px] opacity-40">{meta.lang}</div>
                </div>
                <p className="verse-text text-sm flex-1">{text}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-3 border-t">
        <Link
          to={`/reader?book=JHN&chapter=3&verse=16`}
          className="text-xs text-[var(--color-gold)] font-bold hover:underline"
        >
          Open in Reader &rarr;
        </Link>
      </div>
    </div>
  );
}
