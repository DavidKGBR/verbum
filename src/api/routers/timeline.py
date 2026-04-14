"""
📅 Timeline Router
Serves biblical events, secular context events, and era definitions
for the interactive timeline visualization.
"""

from __future__ import annotations

import contextlib
import json
import logging
from pathlib import Path

from fastapi import APIRouter, Query

from src.api.dependencies import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

# Load static secular events once at import time
_SECULAR_PATH = Path(__file__).resolve().parents[3] / "data" / "static" / "secular_events.json"
_SECULAR_EVENTS: list[dict] = []
if _SECULAR_PATH.exists():
    _SECULAR_EVENTS = json.loads(_SECULAR_PATH.read_text(encoding="utf-8"))

# Era definitions with approximate year ranges
ERAS = [
    {"id": "patriarchs", "name": "Patriarchs", "start": -2100, "end": -1400, "color": "#92400e"},
    {"id": "exodus", "name": "Exodus & Conquest", "start": -1400, "end": -1050, "color": "#dc2626"},
    {"id": "monarchy", "name": "Monarchy", "start": -1050, "end": -586, "color": "#7c3aed"},
    {"id": "exile", "name": "Exile & Return", "start": -586, "end": -400, "color": "#2563eb"},
    {
        "id": "intertestamental",
        "name": "Intertestamental",
        "start": -400,
        "end": -5,
        "color": "#6b7280",
    },
    {"id": "nt", "name": "New Testament", "start": -5, "end": 100, "color": "#059669"},
]


@router.get("/timeline/eras")
def list_eras() -> dict:
    """List all biblical eras with year ranges and colors."""
    return {"eras": ERAS}


@router.get("/timeline/events")
def list_events(
    era: str | None = Query(None, description="Filter by era name"),
    person: str | None = Query(None, description="Filter by person slug in participants"),
    place: str | None = Query(None, description="Filter by place slug in locations"),
    year_min: int | None = Query(None, description="Min year (e.g., -1500)"),
    year_max: int | None = Query(None, description="Max year (e.g., 100)"),
    limit: int = Query(200, ge=1, le=1000, description="Max results"),
) -> dict:
    """List biblical events with optional filters."""
    conn = get_db()
    try:
        conditions: list[str] = []
        params: list[object] = []

        if era:
            conditions.append("LOWER(era) = ?")
            params.append(era.lower().strip())
        if person:
            conditions.append("participants LIKE ?")
            params.append(f'%"{person}"%')
        if place:
            conditions.append("locations LIKE ?")
            params.append(f'%"{place}"%')
        if year_min is not None:
            conditions.append("start_year >= ?")
            params.append(year_min)
        if year_max is not None:
            conditions.append("start_year <= ?")
            params.append(year_max)

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        params.append(limit)

        df = conn.execute(
            f"""
            SELECT event_id, title, description, start_year, sort_key,
                   duration, era, participants, locations, verse_refs
            FROM biblical_events
            {where}
            ORDER BY sort_key, start_year
            LIMIT ?
            """,
            params,
        ).fetchdf()

        results = df.to_dict(orient="records")
        for r in results:
            for field in ("participants", "locations", "verse_refs"):
                if r.get(field):
                    with contextlib.suppress(json.JSONDecodeError, TypeError):
                        r[field] = json.loads(r[field])

        return {
            "count": len(results),
            "events": results,
        }
    finally:
        conn.close()


@router.get("/timeline/secular")
def list_secular_events(
    year_min: int | None = Query(None, description="Min year"),
    year_max: int | None = Query(None, description="Max year"),
    category: str | None = Query(None, description="Filter by category (Egypt, Rome, etc.)"),
) -> dict:
    """List secular historical context events."""
    events = _SECULAR_EVENTS
    if year_min is not None:
        events = [e for e in events if e["year"] >= year_min]
    if year_max is not None:
        events = [e for e in events if e["year"] <= year_max]
    if category:
        cat = category.lower().strip()
        events = [e for e in events if e.get("category", "").lower() == cat]

    return {"count": len(events), "events": events}


@router.get("/timeline/combined")
def combined_timeline(
    year_min: int = Query(-2200, description="Min year"),
    year_max: int = Query(100, description="Max year"),
) -> dict:
    """Get both biblical and secular events in one response for the timeline view."""
    conn = get_db()
    try:
        # Biblical events
        df = conn.execute(
            """
            SELECT event_id, title, start_year, era, participants, locations
            FROM biblical_events
            WHERE start_year IS NOT NULL
              AND start_year >= ? AND start_year <= ?
            ORDER BY sort_key, start_year
            """,
            [year_min, year_max],
        ).fetchdf()

        biblical = []
        for _, row in df.iterrows():
            evt: dict = {
                "id": row["event_id"],
                "title": row["title"],
                "year": int(row["start_year"]),
                "era": row["era"],
                "type": "biblical",
            }
            if row.get("participants"):
                with contextlib.suppress(json.JSONDecodeError, TypeError):
                    evt["participants"] = json.loads(row["participants"])
            if row.get("locations"):
                with contextlib.suppress(json.JSONDecodeError, TypeError):
                    evt["locations"] = json.loads(row["locations"])
            biblical.append(evt)

        # Secular events
        secular = [
            {
                "id": f"secular_{i}",
                "title": e["title"],
                "year": e["year"],
                "category": e.get("category"),
                "description": e.get("description"),
                "type": "secular",
            }
            for i, e in enumerate(_SECULAR_EVENTS)
            if year_min <= e["year"] <= year_max
        ]

        return {
            "year_min": year_min,
            "year_max": year_max,
            "biblical": biblical,
            "secular": secular,
            "eras": ERAS,
        }
    finally:
        conn.close()
