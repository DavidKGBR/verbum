"""
🔀 Compare Router
Serves parallel passage comparisons — side-by-side view of synoptic
passages (e.g., the 4 Gospels on the crucifixion) with preset parallels.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from src.api.dependencies import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

# Load static synoptic parallels once at import time
_PARALLELS_PATH = (
    Path(__file__).resolve().parents[3] / "data" / "static" / "synoptic_parallels.json"
)
_PARALLELS: list[dict] = []
if _PARALLELS_PATH.exists():
    _PARALLELS = json.loads(_PARALLELS_PATH.read_text(encoding="utf-8"))


def _parse_range(range_str: str) -> tuple[str, int, int, int, int] | None:
    """Parse 'MAT.26.17-MAT.26.30' → (book_id, ch_start, vs_start, ch_end, vs_end)."""
    parts = range_str.split("-")
    if len(parts) != 2:
        return None
    try:
        start_parts = parts[0].split(".")
        end_parts = parts[1].split(".")
        if len(start_parts) != 3 or len(end_parts) != 3:
            return None
        book_id = start_parts[0]
        return (
            book_id,
            int(start_parts[1]),
            int(start_parts[2]),
            int(end_parts[1]),
            int(end_parts[2]),
        )
    except (ValueError, IndexError):
        return None


def _fetch_passage(conn: object, range_str: str, translation: str) -> list[dict]:
    """Fetch verses for a range like 'MAT.26.17-MAT.26.30'.

    Handles single-chapter ranges (ch_start == ch_end) and multi-chapter
    ranges separately. The previous combined-OR query was buggy for
    single-chapter ranges: when ch_start == ch_end, the two boundary
    branches (verse >= vs_start) and (verse <= vs_end) union into the
    entire chapter — e.g. MAT.3.13-3.17 returned all 17 verses of MAT 3.
    """
    parsed = _parse_range(range_str)
    if not parsed:
        return []
    book_id, ch_start, vs_start, ch_end, vs_end = parsed

    if ch_start == ch_end:
        # Single chapter — simple AND'd bounds
        df = conn.execute(  # type: ignore[attr-defined]
            """
            SELECT verse_id, book_name, chapter, verse, text
            FROM verses
            WHERE book_id = ?
              AND translation_id = ?
              AND chapter = ?
              AND verse >= ?
              AND verse <= ?
            ORDER BY verse
            """,
            [book_id, translation, ch_start, vs_start, vs_end],
        ).fetchdf()
    else:
        # Multi-chapter — three disjoint branches
        df = conn.execute(  # type: ignore[attr-defined]
            """
            SELECT verse_id, book_name, chapter, verse, text
            FROM verses
            WHERE book_id = ?
              AND translation_id = ?
              AND (
                (chapter = ? AND verse >= ?)
                OR (chapter > ? AND chapter < ?)
                OR (chapter = ? AND verse <= ?)
              )
            ORDER BY chapter, verse
            """,
            [book_id, translation, ch_start, vs_start, ch_start, ch_end, ch_end, vs_end],
        ).fetchdf()

    return df.to_dict(orient="records")


@router.get("/compare/presets")
def list_presets() -> dict:
    """List available preset parallel passage comparisons.

    Each preset includes localized title fields (title_pt, title_es) when
    available; the frontend uses `localized()` to pick the right field
    based on the active locale, with EN fallback.
    """
    return {
        "count": len(_PARALLELS),
        "presets": [
            {
                **p,  # includes id, title, title_pt, title_es
                "passage_count": len(p["passages"]),
                "labels": [ps["label"] for ps in p["passages"]],
            }
            for p in _PARALLELS
        ],
    }


@router.get("/compare/presets/{preset_id}")
def get_preset(
    preset_id: str,
    translation: str = Query("kjv", description="Translation ID"),
) -> dict:
    """Get a preset parallel comparison with verse texts."""
    preset = next((p for p in _PARALLELS if p["id"] == preset_id), None)
    if not preset:
        raise HTTPException(status_code=404, detail=f"Preset '{preset_id}' not found")

    conn = get_db()
    try:
        columns = []
        for passage in preset["passages"]:
            verses = _fetch_passage(conn, passage["range"], translation)
            columns.append(
                {
                    "label": passage["label"],
                    "range": passage["range"],
                    "verses": verses,
                    "verse_count": len(verses),
                }
            )

        return {
            **preset,  # includes id, title, title_pt, title_es
            "translation": translation,
            "columns": columns,
        }
    finally:
        conn.close()


@router.get("/compare/custom")
def compare_custom(
    passages: str = Query(
        ...,
        description="Comma-separated passage ranges, e.g. MAT.26.17-MAT.26.30,MRK.14.12-MRK.14.26",
    ),
    translation: str = Query("kjv", description="Translation ID"),
) -> dict:
    """Compare custom passage ranges side by side."""
    ranges = [r.strip() for r in passages.split(",") if r.strip()]
    if len(ranges) < 2:
        raise HTTPException(
            status_code=400,
            detail="Provide at least 2 comma-separated passage ranges",
        )
    if len(ranges) > 6:
        raise HTTPException(status_code=400, detail="Maximum 6 passages allowed")

    conn = get_db()
    try:
        columns = []
        for range_str in ranges:
            parsed = _parse_range(range_str)
            if not parsed:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid range format: '{range_str}'. Use BOOK.CH.VS-BOOK.CH.VS",
                )
            verses = _fetch_passage(conn, range_str, translation)
            columns.append(
                {
                    "label": parsed[0],  # book_id as label
                    "range": range_str,
                    "verses": verses,
                    "verse_count": len(verses),
                }
            )

        return {
            "translation": translation,
            "columns": columns,
        }
    finally:
        conn.close()
