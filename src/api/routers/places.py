"""
📍 Places Router
Serves biblical places from the Theographic + OpenBible Geocoding datasets
with search, filtering, and GeoJSON export for map consumption.
"""

from __future__ import annotations

import contextlib
import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from src.api.dependencies import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

# Load static routes data once at import time
_ROUTES_PATH = Path(__file__).resolve().parents[3] / "data" / "static" / "routes" / "routes.json"
_ROUTES: list[dict] = []
if _ROUTES_PATH.exists():
    _ROUTES = json.loads(_ROUTES_PATH.read_text(encoding="utf-8"))


@router.get("/places")
def list_places(
    q: str | None = Query(None, min_length=2, description="Search by name"),
    place_type: str | None = Query(None, description="Filter: city, region, mountain, river, etc."),
    has_coords: bool | None = Query(None, description="Filter: only places with coordinates"),
    limit: int = Query(50, ge=1, le=500, description="Max results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
) -> dict:
    """List biblical places with optional search and filters."""
    conn = get_db()
    try:
        conditions: list[str] = []
        params: list[object] = []

        if q:
            conditions.append("(LOWER(name) LIKE ? OR LOWER(also_called) LIKE ?)")
            like = f"%{q.lower()}%"
            params.extend([like, like])
        if place_type:
            conditions.append("LOWER(place_type) = ?")
            params.append(place_type.lower().strip())
        if has_coords is True:
            conditions.append("latitude IS NOT NULL")
        elif has_coords is False:
            conditions.append("latitude IS NULL")

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        count_row = conn.execute(f"SELECT COUNT(*) FROM biblical_places {where}", params).fetchone()
        total = count_row[0] if count_row else 0

        params_page = [*params, limit, offset]
        df = conn.execute(
            f"""
            SELECT place_id, slug, name, latitude, longitude,
                   geo_confidence, place_type, description,
                   also_called, verse_count
            FROM biblical_places
            {where}
            ORDER BY verse_count DESC, name
            LIMIT ? OFFSET ?
            """,
            params_page,
        ).fetchdf()

        results = df.to_dict(orient="records")
        for r in results:
            if r.get("also_called"):
                with contextlib.suppress(json.JSONDecodeError, TypeError):
                    r["also_called"] = json.loads(r["also_called"])

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "results": results,
        }
    finally:
        conn.close()


@router.get("/places/types")
def list_place_types() -> dict:
    """List all distinct place types with counts."""
    conn = get_db()
    try:
        df = conn.execute("""
            SELECT
                COALESCE(place_type, 'Unknown') AS place_type,
                COUNT(*) AS count
            FROM biblical_places
            GROUP BY place_type
            ORDER BY count DESC
        """).fetchdf()
        return {"types": df.to_dict(orient="records")}
    finally:
        conn.close()


@router.get("/places/geo")
def get_places_geojson(
    place_type: str | None = Query(None, description="Filter by place type"),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0, description="Min geocoding confidence"),
) -> dict:
    """Get all places with coordinates as GeoJSON FeatureCollection for map rendering."""
    conn = get_db()
    try:
        conditions = ["latitude IS NOT NULL"]
        params: list[object] = []

        if place_type:
            conditions.append("LOWER(place_type) = ?")
            params.append(place_type.lower().strip())
        if min_confidence > 0:
            conditions.append("COALESCE(geo_confidence, 0) >= ?")
            params.append(min_confidence)

        where = f"WHERE {' AND '.join(conditions)}"

        df = conn.execute(
            f"""
            SELECT slug, name, latitude, longitude, geo_confidence,
                   place_type, verse_count
            FROM biblical_places
            {where}
            ORDER BY name
            """,
            params,
        ).fetchdf()

        features = []
        for _, row in df.iterrows():
            features.append(
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [row["longitude"], row["latitude"]],
                    },
                    "properties": {
                        "slug": row["slug"],
                        "name": row["name"],
                        "place_type": row["place_type"],
                        "verse_count": int(row["verse_count"]),
                        "geo_confidence": (
                            round(float(row["geo_confidence"]), 3)
                            if row["geo_confidence"] is not None
                            else None
                        ),
                    },
                }
            )

        return {
            "type": "FeatureCollection",
            "features": features,
        }
    finally:
        conn.close()


@router.get("/places/routes")
def get_routes(
    era: str | None = Query(None, description="Filter by era"),
) -> dict:
    """Get predefined biblical journey routes (Exodus, Paul's journeys, etc.)."""
    routes = _ROUTES
    if era:
        routes = [r for r in routes if r.get("era", "").lower() == era.lower()]
    return {"routes": routes}


@router.get("/places/search")
def search_places(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    """Quick search for places by name or alias."""
    conn = get_db()
    try:
        like = f"%{q.lower()}%"
        df = conn.execute(
            """
            SELECT slug, name, place_type, latitude, longitude, verse_count
            FROM biblical_places
            WHERE LOWER(name) LIKE ? OR LOWER(also_called) LIKE ?
            ORDER BY verse_count DESC
            LIMIT ?
            """,
            [like, like, limit],
        ).fetchdf()
        return {"query": q, "results": df.to_dict(orient="records")}
    finally:
        conn.close()


@router.get("/places/{slug}")
def get_place(slug: str) -> dict:
    """Get a single place by slug with full detail and related events."""
    conn = get_db()
    try:
        row = conn.execute(
            """
            SELECT place_id, slug, name, latitude, longitude,
                   geo_confidence, place_type, description,
                   also_called, verse_count
            FROM biblical_places
            WHERE slug = ?
            """,
            [slug],
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail=f"Place '{slug}' not found")

        columns = [
            "place_id",
            "slug",
            "name",
            "latitude",
            "longitude",
            "geo_confidence",
            "place_type",
            "description",
            "also_called",
            "verse_count",
        ]
        place = dict(zip(columns, row))

        if place.get("also_called"):
            with contextlib.suppress(json.JSONDecodeError, TypeError):
                place["also_called"] = json.loads(place["also_called"])

        # Get events at this place
        events_df = conn.execute(
            """
            SELECT event_id, title, start_year, era
            FROM biblical_events
            WHERE locations LIKE ?
            ORDER BY sort_key, start_year
            """,
            [f'%"{slug}"%'],
        ).fetchdf()
        place["events"] = events_df.to_dict(orient="records")

        return place
    finally:
        conn.close()
