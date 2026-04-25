"""
🔍 Search Router
Full-text verse search with filters + relevance ranking.
"""

from __future__ import annotations

import re

from fastapi import APIRouter, Query

from src.api.dependencies import get_db
from src.transform.kjv_annotations import strip_kjv_annotations

router = APIRouter()


def _clean_text(raw: str, translation: str) -> str:
    """For KJV, return text without translator annotations ("{Heb. ...}").
    Every other translation stores clean prose already."""
    return strip_kjv_annotations(raw) if translation == "kjv" else raw


# Translation → sentiment-lang mapping. Translations not listed here fall back
# to the base `verses.sentiment_polarity` column (computed once with TextBlob
# on the English KJV text — only meaningful for en-family translations).
_TRANSLATION_SENTIMENT_LANG = {
    "nvi": "pt",
    "ra": "pt",
    "acf": "pt",
    "apee": "pt",
    "rvr": "es",
}


@router.get("/verses/search")
def search_verses(
    q: str = Query(..., min_length=2, description="Search text"),
    translation: str = Query("kjv", description="Translation ID"),
    book: str | None = Query(None, description="Filter by book ID (e.g., GEN, PSA)"),
    limit: int = Query(50, ge=1, le=200, description="Max results"),
) -> dict:
    """Search verses by text content.

    Relevance ranking (ORDER BY match_rank):
      0 = whole-word match       ("Ester" in "Ester era rainha")
      1 = word-start match       ("Ester" in "Estera", "Esterno")
      2 = plain substring match  ("Ester" in "Beesterá", "esterco")

    Within each rank, results stay in canonical reading order
    (book_position, chapter, verse) — so the user sees the most
    relevant hit first without losing narrative flow inside each tier.
    """
    conn = get_db()
    try:
        # Escape any regex metachars the user might have typed ("." is common
        # in biblical references like "1.1"). This turns the raw query into a
        # safe literal pattern.
        safe_q = re.escape(q).lower()
        pattern_whole = rf"\b{safe_q}\b"
        pattern_start = rf"\b{safe_q}"

        params: list = [
            f"%{q}%",           # ILIKE filter
            translation.lower(),
            pattern_whole,      # match_rank = 0 branch
            pattern_start,      # match_rank = 1 branch
        ]
        book_filter = ""
        if book:
            book_filter = "AND book_id = ?"
            params.append(book.upper())

        params.append(limit)

        # If the translation has labeled multilang sentiment, LEFT JOIN it and
        # COALESCE so rows carry the manually-labeled polarity/label whenever
        # available (falling back to KJV TextBlob otherwise).
        sentiment_lang = _TRANSLATION_SENTIMENT_LANG.get(translation.lower())
        if sentiment_lang:
            pol_expr = "COALESCE(m.polarity, v.sentiment_polarity)"
            lbl_expr = "COALESCE(m.label, v.sentiment_label)"
            join_clause = (
                "LEFT JOIN verses_sentiment_multilang m "
                "ON m.verse_id = v.verse_id AND m.lang = ?"
            )
            join_params = [sentiment_lang]
        else:
            pol_expr = "v.sentiment_polarity"
            lbl_expr = "v.sentiment_label"
            join_clause = ""
            join_params = []

        # DuckDB binds `?` in source-code order. The query uses them in this
        # sequence: [join-lang], whole-regex, start-regex, ILIKE, translation,
        # [book], limit.
        query_params = [
            *join_params,
            params[2],           # whole-word regex  (SELECT CASE ?)
            params[3],           # word-start regex  (SELECT CASE ?)
            params[0],           # ILIKE pattern     (WHERE text ILIKE ?)
            params[1],           # translation       (WHERE translation_id = ?)
            *(params[4:]),       # book (if filter enabled), then limit
        ]

        df = conn.execute(
            f"""
            SELECT v.verse_id, v.reference, v.text, v.book_id, v.chapter, v.verse,
                   v.word_count,
                   {pol_expr} AS sentiment_polarity,
                   {lbl_expr} AS sentiment_label,
                   CASE
                     WHEN regexp_matches(LOWER(v.text), ?) THEN 0
                     WHEN regexp_matches(LOWER(v.text), ?) THEN 1
                     ELSE 2
                   END AS match_rank
            FROM verses v
            {join_clause}
            WHERE v.text ILIKE ? AND v.translation_id = ?
              {book_filter.replace("book_id", "v.book_id")}
            ORDER BY match_rank ASC, v.book_position, v.chapter, v.verse
            LIMIT ?
            """,
            query_params,
        ).fetchdf()

        # match_rank is an implementation detail — don't leak it in the JSON.
        df = df.drop(columns=["match_rank"])

        # For KJV, strip the translator-annotation blocks ("{Heb. ...}",
        # "{eloquent: a man of words}") before returning. If the query only
        # matched inside those blocks — e.g. searching "Ester" and hitting
        # "Heb. since yesterday" — the row no longer contains the substring
        # in its clean form, so we drop it. This hides both false positives
        # AND the raw curly-brace noise from the returned text field.
        records: list[dict] = []
        needle = q.lower()
        tl = translation.lower()
        for row in df.to_dict(orient="records"):
            cleaned = _clean_text(row["text"], tl)
            if tl == "kjv" and needle not in cleaned.lower():
                continue  # match was inside annotations only — false positive
            row["text"] = cleaned
            records.append(row)

        return {
            "query": q,
            "translation": tl,
            "total_results": len(records),
            "results": records,
        }
    finally:
        conn.close()
