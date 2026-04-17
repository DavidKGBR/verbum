"""
Home Page Stats Router
Aggregated stats for the HomePage discover grid and community preview.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter

from src.api.dependencies import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

_STATIC = Path(__file__).resolve().parents[3] / "data" / "static"

# Load static data once at import time
_COMMUNITY_NOTES: list[dict] = []
_community_path = _STATIC / "community_notes.json"
if _community_path.exists():
    _COMMUNITY_NOTES = json.loads(_community_path.read_text(encoding="utf-8"))

_OPEN_QUESTIONS: list[dict] = []
_questions_path = _STATIC / "open_questions.json"
if _questions_path.exists():
    _OPEN_QUESTIONS = json.loads(_questions_path.read_text(encoding="utf-8"))

_STRUCTURES: list[dict] = []
_structures_path = _STATIC / "literary_structures.json"
if _structures_path.exists():
    _STRUCTURES = json.loads(_structures_path.read_text(encoding="utf-8"))


@router.get("/home/stats")
def get_home_stats() -> dict:
    """Aggregated lightweight stats for the HomePage — ONE call, many counts."""
    conn = get_db()
    try:
        # DuckDB counts — each wrapped in try/except so missing tables don't break
        people_count = 0
        places_count = 0
        topics_count = 0

        try:
            row = conn.execute("SELECT COUNT(*) AS c FROM biblical_people").fetchone()
            people_count = row[0] if row else 0
        except Exception:
            logger.debug("biblical_people table not available")

        try:
            row = conn.execute("SELECT COUNT(*) AS c FROM biblical_places").fetchone()
            places_count = row[0] if row else 0
        except Exception:
            logger.debug("biblical_places table not available")

        try:
            row = conn.execute("SELECT COUNT(*) AS c FROM topics").fetchone()
            topics_count = row[0] if row else 0
        except Exception:
            logger.debug("topics table not available")

        # Static JSON counts
        structures_count = len(_STRUCTURES)
        questions_count = len(_OPEN_QUESTIONS)
        community_notes_count = len(_COMMUNITY_NOTES)

        # Recent items for community preview.
        # Frontend does the locale pick via localized() helper, so always
        # ship title_pt / title_es alongside the English title.
        recent_notes = [
            {
                "id": n.get("id", ""),
                "verse_id": n.get("verse_id", ""),
                "title": n.get("title", ""),
                "title_pt": n.get("title_pt", ""),
                "title_es": n.get("title_es", ""),
                "category": n.get("category", ""),
                "date": n.get("date", ""),
            }
            for n in _COMMUNITY_NOTES[:3]
        ]

        recent_questions = [
            {
                "id": q.get("id", ""),
                "title": q.get("title", ""),
                "title_pt": q.get("title_pt", ""),
                "title_es": q.get("title_es", ""),
                "category": q.get("category", ""),
            }
            for q in _OPEN_QUESTIONS[:3]
        ]

        return {
            "people_count": people_count,
            "places_count": places_count,
            "topics_count": topics_count,
            "structures_count": structures_count,
            "questions_count": questions_count,
            "community_notes_count": community_notes_count,
            "recent_notes": recent_notes,
            "recent_questions": recent_questions,
        }
    finally:
        conn.close()
