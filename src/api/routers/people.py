"""
👥 People Router
Serves biblical people from the Theographic dataset with search,
filtering, family trees, and event timelines.
"""

from __future__ import annotations

import contextlib
import json
import logging

from fastapi import APIRouter, HTTPException, Query

from src.api.dependencies import get_db

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/people")
def list_people(
    q: str | None = Query(None, min_length=2, description="Search by name"),
    gender: str | None = Query(None, description="Filter: Male or Female"),
    tribe: str | None = Query(None, description="Filter by tribe/group"),
    book: str | None = Query(None, description="Filter by book_id mentioned in"),
    limit: int = Query(50, ge=1, le=500, description="Max results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
) -> dict:
    """List biblical people with optional search and filters."""
    conn = get_db()
    try:
        conditions: list[str] = []
        params: list[object] = []

        if q:
            conditions.append("(LOWER(name) LIKE ? OR LOWER(also_called) LIKE ?)")
            like = f"%{q.lower()}%"
            params.extend([like, like])
        if gender:
            conditions.append("LOWER(gender) = ?")
            params.append(gender.lower().strip())
        if tribe:
            conditions.append("LOWER(tribe) LIKE ?")
            params.append(f"%{tribe.lower().strip()}%")
        if book:
            conditions.append("books_mentioned LIKE ?")
            params.append(f'%"{book.upper().strip()}"%')

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        # Count total
        count_row = conn.execute(f"SELECT COUNT(*) FROM biblical_people {where}", params).fetchone()
        total = count_row[0] if count_row else 0

        # Fetch page
        params_page = [*params, limit, offset]
        df = conn.execute(
            f"""
            SELECT person_id, slug, name, gender, birth_year, death_year,
                   tribe, occupation, books_mentioned, verse_count,
                   min_year, max_year
            FROM biblical_people
            {where}
            ORDER BY verse_count DESC, name
            LIMIT ? OFFSET ?
            """,
            params_page,
        ).fetchdf()

        results = df.to_dict(orient="records")
        # Parse JSON array fields for the response
        for r in results:
            if r.get("books_mentioned"):
                with contextlib.suppress(json.JSONDecodeError, TypeError):
                    r["books_mentioned"] = json.loads(r["books_mentioned"])

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "results": results,
        }
    finally:
        conn.close()


@router.get("/people/search")
def search_people(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    """Quick search for people by name or alias."""
    conn = get_db()
    try:
        like = f"%{q.lower()}%"
        df = conn.execute(
            """
            SELECT person_id, slug, name, gender, verse_count, tribe
            FROM biblical_people
            WHERE LOWER(name) LIKE ? OR LOWER(also_called) LIKE ?
            ORDER BY verse_count DESC
            LIMIT ?
            """,
            [like, like, limit],
        ).fetchdf()
        return {"query": q, "results": df.to_dict(orient="records")}
    finally:
        conn.close()


@router.get("/people/{slug}")
def get_person(slug: str) -> dict:
    """Get a single person by slug with full detail."""
    conn = get_db()
    try:
        row = conn.execute(
            """
            SELECT person_id, slug, name, gender, birth_year, death_year,
                   description, also_called, tribe, occupation,
                   books_mentioned, verse_count, min_year, max_year
            FROM biblical_people
            WHERE slug = ?
            """,
            [slug],
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail=f"Person '{slug}' not found")

        columns = [
            "person_id",
            "slug",
            "name",
            "gender",
            "birth_year",
            "death_year",
            "description",
            "also_called",
            "tribe",
            "occupation",
            "books_mentioned",
            "verse_count",
            "min_year",
            "max_year",
        ]
        person = dict(zip(columns, row))

        # Parse JSON fields
        for field in ("also_called", "books_mentioned"):
            if person.get(field):
                with contextlib.suppress(json.JSONDecodeError, TypeError):
                    person[field] = json.loads(person[field])

        return person
    finally:
        conn.close()


@router.get("/people/{slug}/family")
def get_person_family(slug: str) -> dict:
    """Get family relations for a person (parents, children, spouses, siblings)."""
    conn = get_db()
    try:
        # Get all relations where this person is involved
        df = conn.execute(
            """
            SELECT
                fr.relation_type,
                fr.related_person_id AS related_slug,
                bp.name AS related_name,
                bp.gender AS related_gender
            FROM family_relations fr
            LEFT JOIN biblical_people bp ON bp.slug = fr.related_person_id
            WHERE fr.person_id = ?
            ORDER BY fr.relation_type, bp.name
            """,
            [slug],
        ).fetchdf()

        # Group by relation type
        family: dict[str, list[dict]] = {}
        for _, row in df.iterrows():
            rel_type = row["relation_type"]
            if rel_type not in family:
                family[rel_type] = []
            family[rel_type].append(
                {
                    "slug": row["related_slug"],
                    "name": row["related_name"],
                    "gender": row["related_gender"],
                }
            )

        return {"person": slug, "relations": family}
    finally:
        conn.close()


@router.get("/people/{slug}/events")
def get_person_events(slug: str) -> dict:
    """Get events involving a specific person."""
    conn = get_db()
    try:
        df = conn.execute(
            """
            SELECT event_id, title, start_year, era, duration,
                   participants, locations, verse_refs
            FROM biblical_events
            WHERE participants LIKE ?
            ORDER BY sort_key, start_year
            """,
            [f'%"{slug}"%'],
        ).fetchdf()

        results = df.to_dict(orient="records")
        for r in results:
            for field in ("participants", "locations", "verse_refs"):
                if r.get(field):
                    with contextlib.suppress(json.JSONDecodeError, TypeError):
                        r[field] = json.loads(r[field])

        return {"person": slug, "events": results}
    finally:
        conn.close()
