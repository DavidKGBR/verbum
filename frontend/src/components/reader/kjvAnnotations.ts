// Parse KJV translator annotations in braces into inline segments + footnotes.
// Short braces (≤3 words, no colon) → inline "added" words rendered italic.
// Long braces (>3 words or contain ':') → marginal notes referenced by sup
// number; the full text is returned in `notes` for a footnote block.

export type KjvSegment =
  | { kind: "text"; content: string }
  | { kind: "added"; content: string }
  | { kind: "note-ref"; index: number };

export interface KjvParse {
  segments: KjvSegment[];
  notes: string[];
}

const BRACE_RE = /\{([^}]+)\}/g;

function isMarginalNote(inner: string): boolean {
  const words = inner.trim().split(/\s+/);
  return inner.includes(":") || words.length > 3;
}

export function parseKjvAnnotations(raw: string): KjvParse {
  const segments: KjvSegment[] = [];
  const notes: string[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = BRACE_RE.exec(raw)) !== null) {
    if (match.index > last) {
      segments.push({ kind: "text", content: raw.slice(last, match.index) });
    }
    const inner = match[1];
    if (isMarginalNote(inner)) {
      notes.push(inner.trim());
      segments.push({ kind: "note-ref", index: notes.length });
    } else {
      segments.push({ kind: "added", content: inner.trim() });
    }
    last = BRACE_RE.lastIndex;
  }
  if (last < raw.length) {
    segments.push({ kind: "text", content: raw.slice(last) });
  }
  return { segments, notes };
}

// Reset regex state is automatic with .exec() — the outer function is safe
// for concurrent use across components since `BRACE_RE` is module-local
// but .exec() only mutates lastIndex within this function's scope.
