"""
Literary Structure Router
Detects chiasms, parallelisms, and inclusio patterns in biblical text.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, Query

from src.api.dependencies import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

# Load pre-computed literary structures
_STRUCTURES_PATH = (
    Path(__file__).resolve().parents[3] / "data" / "static" / "literary_structures.json"
)
_STRUCTURES: list[dict] = []
if _STRUCTURES_PATH.exists():
    _STRUCTURES = json.loads(_STRUCTURES_PATH.read_text(encoding="utf-8"))


# Static paths MUST come before dynamic {book_id} to avoid FastAPI matching them


@router.get("/structure/all")
def get_all_structures(
    structure_type: str | None = Query(
        None, description="Filter by type: chiasm, parallelism, inclusio"
    ),
) -> dict:
    """List all literary structures across the Bible."""
    results = list(_STRUCTURES)
    if structure_type:
        results = [s for s in results if s.get("type") == structure_type.lower()]
    return {"total": len(results), "structures": results}


@router.get("/structure/chiasms")
def list_chiasms(
    book: str | None = Query(None, description="Filter by book ID"),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0, description="Min confidence"),
) -> dict:
    """List all detected chiasms across the Bible."""
    chiasms = [s for s in _STRUCTURES if s.get("type") == "chiasm"]

    if book:
        chiasms = [s for s in chiasms if s.get("book_id", "").upper() == book.upper()]

    if min_confidence > 0:
        chiasms = [s for s in chiasms if s.get("confidence", 0) >= min_confidence]

    return {
        "total": len(chiasms),
        "chiasms": chiasms,
    }


@router.get("/structure/{book_id}")
def get_book_structures(
    book_id: str,
    structure_type: str | None = Query(
        None, description="Filter by type: chiasm, parallelism, inclusio"
    ),
) -> dict:
    """Get literary structures detected in a book."""
    bid = book_id.upper()
    results = [s for s in _STRUCTURES if s.get("book_id", "").upper() == bid]

    if structure_type:
        results = [s for s in results if s.get("type") == structure_type.lower()]

    return {
        "book_id": bid,
        "total": len(results),
        "structures": results,
    }


@router.get("/structure/{book_id}/{chapter}")
def get_chapter_structures(
    book_id: str,
    chapter: int,
    translation: str = Query("kjv", description="Translation ID for verse texts"),
) -> dict:
    """Get literary structures for a specific chapter, with verse texts."""
    bid = book_id.upper()
    results = [
        s
        for s in _STRUCTURES
        if s.get("book_id", "").upper() == bid
        and chapter >= s.get("chapter_start", 0)
        and chapter <= s.get("chapter_end", 999)
    ]

    # Fetch verse texts for this chapter
    conn = get_db()
    try:
        df = conn.execute(
            """
            SELECT verse_id, verse, text
            FROM verses
            WHERE book_id = ? AND chapter = ? AND translation_id = ?
            ORDER BY verse
            """,
            [bid, chapter, translation],
        ).fetchdf()

        verse_texts: dict[int, str] = {}
        for _, row in df.iterrows():
            verse_texts[int(row["verse"])] = row["text"]

        # Annotate structure elements with verse texts
        annotated = []
        for s in results:
            enriched = {**s}
            if "elements" in s:
                for elem in enriched["elements"]:
                    vs = elem.get("verse_start", 0)
                    ve = elem.get("verse_end", vs)
                    elem["text_preview"] = " ".join(
                        verse_texts.get(v, "") for v in range(vs, ve + 1)
                    ).strip()[:200]
            annotated.append(enriched)

        return {
            "book_id": bid,
            "chapter": chapter,
            "translation": translation,
            "total": len(annotated),
            "structures": annotated,
        }
    finally:
        conn.close()
