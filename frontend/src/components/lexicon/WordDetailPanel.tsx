import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  fetchStrongs,
  fetchVersesByStrongs,
  type StrongsEntry,
} from "../../services/api";
import LoadingSpinner from "../common/LoadingSpinner";
import AudioButton from "../common/AudioButton";

interface Props {
  strongsId: string | null;
  onClose: () => void;
}

export default function WordDetailPanel({ strongsId, onClose }: Props) {
  const [entry, setEntry] = useState<StrongsEntry | null>(null);
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!strongsId) return;
    setLoading(true);
    Promise.all([
      fetchStrongs(strongsId),
      fetchVersesByStrongs(strongsId, 5),
    ])
      .then(([e, v]) => {
        setEntry(e);
        setVerses(v.verses);
      })
      .catch((err) => console.error("Error fetching word details", err))
      .finally(() => setLoading(false));
  }, [strongsId]);

  if (!strongsId) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[420px] bg-[var(--color-parchment)] shadow-[0_0_40px_rgba(0,0,0,0.15)] 
                    border-l border-[var(--color-gold)]/30 p-6 overflow-y-auto z-50 flex flex-col fade-in">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 pt-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[var(--color-gold-dark)] uppercase">
            Lexicon &bull; {entry?.language || "..."}
          </span>
          <h2 className="text-3xl font-display mt-1">
            {strongsId}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-4xl leading-none font-display font-light text-[var(--color-gold-dark)] opacity-50 hover:opacity-100 transition"
        >
           &times;
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner text="Searching lexicon..." />
        </div>
      ) : entry ? (
        <div className="space-y-6">
          {/* Main Word */}
          <div className="text-center py-8 bg-white/40 rounded border border-[var(--color-gold)]/20 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 text-[120px] leading-none opacity-5 pointer-events-none select-none" style={{ fontFamily: "serif" }}>
                 {entry.original}
             </div>
             <div className={`text-6xl mb-4 ${entry.language === 'hebrew' ? 'font-hebrew' : 'font-greek'}`}>
                {entry.original}
             </div>
             <div className="text-sm italic opacity-70 mb-1">{entry.transliteration}</div>
             <div className="text-xs font-mono text-[var(--color-ink)]/50 mb-3">[{entry.pronunciation}]</div>
             <AudioButton
               language={entry.language as "hebrew" | "greek"}
               text={entry.original}
               transliteration={entry.transliteration}
               size="md"
             />
          </div>

          <div className="space-y-5 px-1">
             <div>
               <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-gold-dark)] opacity-80 mb-1">Definition</h3>
               <p className="text-[17px] font-body font-bold leading-tight">{entry.short_definition}</p>
             </div>
             
             <div>
               <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-gold-dark)] opacity-80 mb-1">Part of Speech</h3>
               <p className="text-sm capitalize italic">{entry.part_of_speech}</p>
             </div>

             <div>
               <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-gold-dark)] opacity-80 mb-1">Expanded Detail</h3>
               <p className="text-sm leading-relaxed opacity-80">{entry.long_definition}</p>
             </div>
          </div>

          {/* Full study link */}
          <div className="mt-8 pt-6 border-t border-dashed border-[var(--color-gold)]/30">
             <Link
               to={`/word-study/${strongsId}`}
               className="block w-full text-center py-2.5 rounded bg-[var(--color-gold)] text-white
                          text-sm font-bold hover:opacity-90 transition focus:outline-none
                          focus:ring-2 focus:ring-[var(--color-gold)]/60"
             >
               Full Study →
             </Link>
          </div>

          {/* Verses Preview */}
          <div className="mt-8 pt-6 border-t border-[var(--color-gold)]/20">
             <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-gold-dark)] opacity-80 mb-3">Top Occurrences</h3>
             <ul className="space-y-4">
               {verses.map(v => (
                 <li key={v.verse_id} className="text-sm leading-relaxed font-body">
                   <strong className="text-[var(--color-gold-dark)] font-sans text-xs tracking-wide">{v.reference}</strong><br/>
                   <span className="opacity-90">{v.verse_text}</span>
                 </li>
               ))}
             </ul>
          </div>
        </div>
      ) : (
        <p className="text-red-500 text-sm">Failed to load Strong's entry.</p>
      )}
    </div>
  );
}
