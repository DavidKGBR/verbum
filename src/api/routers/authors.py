"""
✍️ Authors Router
Serves biblical author metadata with computed vocabulary stats.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from src.api.dependencies import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

# Load static author data once at import time
_AUTHORS_PATH = Path(__file__).resolve().parents[3] / "data" / "static" / "authors.json"
_AUTHORS: list[dict] = []
if _AUTHORS_PATH.exists():
    _AUTHORS = json.loads(_AUTHORS_PATH.read_text(encoding="utf-8"))

# Overrides para verbetes onde o `short_definition` do Strong's começa com termo
# etimológico ("properly", "primary root") em vez do uso comum, ou onde a palavra
# é uma partícula gramatical sem gloss limpa (object marker, conjunctions, etc.).
# Mantenha curto (1-3 palavras) — vai aparecer em chips de UI.
TOP_WORD_GLOSS_OVERRIDES: dict[str, str] = {
    "H853": "[obj. marker]",  # ʼêth — marcador de objeto direto, sem tradução
    "H3605": "all",  # kôl — Strong's diz "properly, the whole; hence, all..."
    "H413": "to/towards",  # ʼêl — Strong's começa com "near"
    "H5921": "upon/on",  # ʻal — Strong's começa com "above"
    "H3588": "for/that",  # kîy — conjunção polissêmica, Strong's verboso
    "G846": "self/he/she",  # autós — Strong's diz "the reflexive pronoun self, used..."
    "G3004": "to say",  # légō — Strong's diz "properly, to 'lay' forth..."
    "G2316": "God/deity",  # theós — short_definition no DB está truncada (só cauda)
    "G3756": "no/not",  # ou — negativa absoluta, def. com parêntese aninhado
}

_PAREN_RE = re.compile(r"\s*\([^)]*\)")


def _clean_gloss(strongs_id: str, short_def: str | None) -> str:
    """Extrai gloss curta e legível a partir de short_definition do Strong's."""
    if strongs_id in TOP_WORD_GLOSS_OVERRIDES:
        return TOP_WORD_GLOSS_OVERRIDES[strongs_id]
    if not short_def:
        return "?"
    text = short_def.strip()
    # Remove parênteses iterativamente (lida com aninhados)
    for _ in range(5):
        new = _PAREN_RE.sub("", text)
        if new == text:
            break
        text = new
    # Limpa ')' residuais de parênteses aninhados (ex: G3361 (μή)) → sobra ')')
    text = text.replace(")", "")
    # Remove aspas
    text = text.replace('"', "").replace("'", "")
    # Divide em , ou ; e filtra tokens inúteis
    parts = re.split(r"[,;]", text)
    parts = [
        p.strip().rstrip(".")
        for p in parts
        if p.strip() and p.strip().lower() not in ("properly", "etc", "etc.")
    ]
    return parts[0] if parts else "?"


@router.get("/authors")
def list_authors(
    testament: str | None = Query(None, description="Filter by testament: OT or NT"),
) -> dict:
    """List all biblical authors with their books and metadata."""
    results = _AUTHORS
    if testament:
        t = testament.upper().strip()
        results = [a for a in results if a.get("testament") == t]

    return {
        "count": len(results),
        "authors": results,
    }


@router.get("/authors/{author_id}")
def get_author(author_id: str) -> dict:
    """Get a single author by ID with computed vocabulary stats."""
    author = next((a for a in _AUTHORS if a["author_id"] == author_id), None)
    if not author:
        raise HTTPException(status_code=404, detail=f"Author '{author_id}' not found")

    # Compute vocabulary stats from interlinear data
    books = author.get("books", [])
    stats: dict = {}
    if books:
        placeholders = ", ".join(["?" for _ in books])
        conn = get_db()
        try:
            # Total unique Strong's IDs used across the author's books
            row = conn.execute(
                f"""
                SELECT
                    COUNT(DISTINCT i.strongs_id) AS unique_strongs,
                    COUNT(*) AS total_words,
                    COUNT(DISTINCT i.verse_id) AS total_verses
                FROM interlinear i
                WHERE SPLIT_PART(i.verse_id, '.', 1) IN ({placeholders})
                  AND i.strongs_id IS NOT NULL
                """,
                books,
            ).fetchone()
            if row:
                stats["unique_strongs"] = row[0]
                stats["total_words"] = row[1]
                stats["total_verses"] = row[2]

            # Top 10 Strong's IDs mais usados.
            # JOIN com strongs_lexicon — limpeza de short_definition fica em Python
            # porque as defs têm parênteses aninhados, aspas e padrões que regex
            # SQL não lida bem (STEPBible TSV leaks: '[Obj.]', 'X»Y@ref', etc.).
            top_rows = conn.execute(
                f"""
                WITH counts AS (
                    SELECT i.strongs_id, COUNT(*) AS occurrences
                    FROM interlinear i
                    WHERE SPLIT_PART(i.verse_id, '.', 1) IN ({placeholders})
                      AND i.strongs_id IS NOT NULL
                    GROUP BY i.strongs_id
                    ORDER BY occurrences DESC
                    LIMIT 10
                )
                SELECT c.strongs_id, sl.transliteration, sl.short_definition,
                       c.occurrences
                FROM counts c
                LEFT JOIN strongs_lexicon sl ON sl.strongs_id = c.strongs_id
                ORDER BY c.occurrences DESC
                """,
                books,
            ).fetchall()
            stats["top_words"] = [
                {
                    "strongs_id": sid,
                    "transliteration": translit or "",
                    "gloss": _clean_gloss(sid, short_def),
                    "occurrences": occ,
                }
                for sid, translit, short_def, occ in top_rows
            ]

        except Exception as e:
            logger.warning("Could not compute vocab stats for %s: %s", author_id, e)
        finally:
            conn.close()

    return {
        **author,
        "stats": stats,
    }


@router.get("/authors/{author_id}/books")
def get_author_books(author_id: str) -> dict:
    """Get book-level stats for an author's books."""
    author = next((a for a in _AUTHORS if a["author_id"] == author_id), None)
    if not author:
        raise HTTPException(status_code=404, detail=f"Author '{author_id}' not found")

    books = author.get("books", [])
    if not books:
        return {"author_id": author_id, "books": []}

    placeholders = ", ".join(["?" for _ in books])
    conn = get_db()
    try:
        df = conn.execute(
            f"""
            SELECT
                book_id, book_name, testament, category,
                total_chapters, total_verses, total_words,
                avg_words_per_verse, avg_sentiment
            FROM book_stats
            WHERE book_id IN ({placeholders})
              AND translation_id = 'kjv'
            ORDER BY book_position
            """,
            books,
        ).fetchdf()
        return {
            "author_id": author_id,
            "books": df.to_dict(orient="records"),
        }
    finally:
        conn.close()
