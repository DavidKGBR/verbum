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


def _img_url(tp: object, size: str = "330") -> str | None:
    """Build an image URL from a Wikimedia pattern (####-substituted).

    DataFrame columns can yield NaN (a float) for missing values, and
    `if tp` is truthy for NaN — so the naive `tp.replace(...)` blows up
    with AttributeError. Guard explicitly for the string type.
    """
    return tp.replace("####", size) if isinstance(tp, str) and tp else None

# Load static routes data once at import time
_ROUTES_PATH = Path(__file__).resolve().parents[3] / "data" / "static" / "routes" / "routes.json"
_ROUTES: list[dict] = []
if _ROUTES_PATH.exists():
    _ROUTES = json.loads(_ROUTES_PATH.read_text(encoding="utf-8"))


@router.get("/places")
def list_places(
    q: str | None = Query(None, min_length=2, description="Search by name"),
    slugs: str | None = Query(
        None,
        max_length=4000,
        description=(
            "Comma-separated slug list to filter by. Used by the frontend "
            "to forward locale-resolved matches (e.g. user types 'Belém' in "
            "PT, frontend resolves it to bethlehem_xxxx via placeNames.ts "
            "and sends the slug here)."
        ),
    ),
    place_type: str | None = Query(None, description="Filter: city, region, mountain, river, etc."),
    has_coords: bool | None = Query(None, description="Filter: only places with coordinates"),
    min_verses: int = Query(
        0,
        ge=0,
        description=(
            "Minimum verse_count. The frontend search defaults to 1 to hide "
            "duplicate geocoding entries from OpenBible that have no biblical "
            "references — they create noise (e.g. 'Bethlehem 1/2/3')."
        ),
    ),
    limit: int = Query(50, ge=1, le=500, description="Max results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
) -> dict:
    """List biblical places with optional search and filters."""
    conn = get_db()
    try:
        conditions: list[str] = []
        params: list[object] = []

        # `q` and `slugs` combine with OR — a hit on either passes. This lets
        # the frontend send both the raw query (matches English-name places)
        # and the locale-resolved slug list (matches places named in PT/ES)
        # in a single request, returning the union.
        text_conditions: list[str] = []
        if q:
            text_conditions.append("(LOWER(name) LIKE ? OR LOWER(also_called) LIKE ?)")
            like = f"%{q.lower()}%"
            params.extend([like, like])
        if slugs:
            slug_list = [s.strip() for s in slugs.split(",") if s.strip()][:200]
            if slug_list:
                placeholders = ",".join(["?"] * len(slug_list))
                text_conditions.append(f"slug IN ({placeholders})")
                params.extend(slug_list)
        if text_conditions:
            conditions.append(f"({' OR '.join(text_conditions)})")
        if min_verses > 0:
            conditions.append("verse_count >= ?")
            params.append(min_verses)
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
            SELECT bp.place_id, bp.slug, bp.name, bp.latitude, bp.longitude,
                   bp.geo_confidence, bp.place_type, bp.description,
                   bp.also_called, bp.verse_count,
                   pi.thumbnail_pattern
            FROM biblical_places bp
            LEFT JOIN (
                SELECT place_slug, MIN(thumbnail_pattern) AS thumbnail_pattern
                FROM place_images
                GROUP BY place_slug
            ) pi ON pi.place_slug = bp.slug
            {where}
            ORDER BY bp.verse_count DESC, bp.name
            LIMIT ? OFFSET ?
            """,
            params_page,
        ).fetchdf()

        results = df.to_dict(orient="records")
        for r in results:
            if r.get("also_called"):
                with contextlib.suppress(json.JSONDecodeError, TypeError):
                    r["also_called"] = json.loads(r["also_called"])
            r["thumbnail_url"] = _img_url(r.pop("thumbnail_pattern", None))

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
            SELECT bp.slug, bp.name, bp.latitude, bp.longitude,
                   bp.geo_confidence, bp.place_type, bp.verse_count,
                   pi.thumbnail_pattern
            FROM biblical_places bp
            LEFT JOIN (
                SELECT place_slug, MIN(thumbnail_pattern) AS thumbnail_pattern
                FROM place_images
                GROUP BY place_slug
            ) pi ON pi.place_slug = bp.slug
            {where}
            ORDER BY bp.name
            """,
            params,
        ).fetchdf()

        features = []
        for _, row in df.iterrows():
            thumb = _img_url(row.get("thumbnail_pattern"))
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
                        "thumbnail_url": thumb,
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
    q: str | None = Query(None, min_length=2, description="Search query"),
    slugs: str | None = Query(None, max_length=4000, description="Slugs forwarded by the frontend after locale resolution"),
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    """Quick search for places by name or alias.

    Mirrors `/places` semantics: `q` and `slugs` combine via OR so a single
    autocomplete keystroke can match both the English-named places (server
    side) and the locale-resolved slugs the frontend computed locally from
    placeNames.ts. At least one of `q` or `slugs` must be present.
    """
    if not q and not slugs:
        return {"results": []}
    conn = get_db()
    try:
        conditions: list[str] = []
        params: list[object] = []
        if q:
            conditions.append("(LOWER(name) LIKE ? OR LOWER(also_called) LIKE ?)")
            like = f"%{q.lower()}%"
            params.extend([like, like])
        if slugs:
            slug_list = [s.strip() for s in slugs.split(",") if s.strip()][:200]
            if slug_list:
                placeholders = ",".join(["?"] * len(slug_list))
                conditions.append(f"slug IN ({placeholders})")
                params.extend(slug_list)
        where = " OR ".join(conditions) if conditions else "1=0"
        df = conn.execute(
            f"""
            SELECT slug, name, place_type, latitude, longitude, verse_count
            FROM biblical_places
            WHERE {where}
            ORDER BY verse_count DESC
            LIMIT ?
            """,
            [*params, limit],
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

        # Get images for this place
        img_df = conn.execute(
            """
            SELECT image_id, file_url, thumbnail_pattern, description,
                   license, credit, credit_url, width, height
            FROM place_images
            WHERE place_slug = ?
            ORDER BY sort_order, image_id
            """,
            [slug],
        ).fetchdf()

        images = []
        for _, img in img_df.iterrows():
            images.append(
                {
                    "image_id": img["image_id"],
                    "file_url": img["file_url"],
                    "thumbnail_url": _img_url(img.get("thumbnail_pattern")),
                    "hero_url": _img_url(img.get("thumbnail_pattern"), "960"),
                    "description": img["description"],
                    "license": img["license"],
                    "credit": img["credit"],
                    "credit_url": img["credit_url"],
                    "width": int(img["width"]) if img["width"] else None,
                    "height": int(img["height"]) if img["height"] else None,
                }
            )
        place["images"] = images

        return place
    finally:
        conn.close()
