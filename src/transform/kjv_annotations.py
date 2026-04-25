"""
🧹 KJV translator-annotation stripper.

KJV verse text contains inline annotations in curly braces:
  - Added words (italicised in print): e.g. ``{it was}`` — 1-3 words, no colon.
  - Marginal notes: e.g. ``{the light from...: Heb. between the light...}`` —
    contain a colon or exceed 3 words.

This module produces a "clean" version suitable for casual reading:
added-word braces keep their content (dropping just the braces), while
marginal notes drop entirely.

The stored DuckDB `text` column is never modified; this runs at API
response time.
"""

from __future__ import annotations

import re

_BRACE_RE = re.compile(r"\{([^}]+)\}")
_WS_RE = re.compile(r"\s{2,}")


def strip_kjv_annotations(text: str) -> str:
    """Return `text` with KJV translator annotations removed.

    Short braces (no colon, <= 3 words) keep their inner content verbatim
    (so the sentence stays grammatical). Long braces drop entirely.
    Any double spaces left behind are collapsed.
    """

    def _sub(m: re.Match[str]) -> str:
        inner = m.group(1).strip()
        if ":" in inner or len(inner.split()) > 3:
            return ""
        return inner

    cleaned = _BRACE_RE.sub(_sub, text)
    return _WS_RE.sub(" ", cleaned).strip()
