"""
Community / Modo Escriba Router
Read-only curated community notes per verse.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, Query

router = APIRouter()
logger = logging.getLogger(__name__)

# Load static community notes once at import time
_NOTES_PATH = Path(__file__).resolve().parents[3] / "data" / "static" / "community_notes.json"
_NOTES: list[dict] = []
if _NOTES_PATH.exists():
    _NOTES = json.loads(_NOTES_PATH.read_text(encoding="utf-8"))

# Build verse index
_VERSE_INDEX: dict[str, list[dict]] = {}
for _note in _NOTES:
    vid = _note.get("verse_id", "")
    _VERSE_INDEX.setdefault(vid, []).append(_note)


@router.get("/community/notes")
def get_community_notes(
    verse_id: str = Query(..., description="Verse ID (e.g. JHN.3.16)"),
) -> dict:
    """Get curated community notes for a specific verse."""
    vid = verse_id.upper()
    notes = _VERSE_INDEX.get(vid, [])
    return {
        "verse_id": vid,
        "count": len(notes),
        "notes": notes,
    }


@router.get("/community/recent")
def get_recent_notes(
    limit: int = Query(20, ge=1, le=100, description="Max results"),
) -> dict:
    """Get the most recently added community notes."""
    # Static notes are pre-sorted by date in the JSON
    recent = _NOTES[:limit]
    return {
        "count": len(recent),
        "notes": recent,
    }


@router.get("/community/stats")
def get_community_stats() -> dict:
    """Get overall community notes statistics."""
    unique_verses = len(_VERSE_INDEX)
    categories: dict[str, int] = {}
    for note in _NOTES:
        cat = note.get("category", "general")
        categories[cat] = categories.get(cat, 0) + 1

    return {
        "total_notes": len(_NOTES),
        "unique_verses": unique_verses,
        "categories": categories,
    }
