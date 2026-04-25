"""
Intertextuality Router
OT-to-NT citation graphs, heatmaps, and citation chains.
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from src.api.dependencies import get_db

router = APIRouter()

# Canonical book lists for OT/NT
_OT_BOOKS = [
    "GEN",
    "EXO",
    "LEV",
    "NUM",
    "DEU",
    "JOS",
    "JDG",
    "RUT",
    "1SA",
    "2SA",
    "1KI",
    "2KI",
    "1CH",
    "2CH",
    "EZR",
    "NEH",
    "EST",
    "JOB",
    "PSA",
    "PRO",
    "ECC",
    "SNG",
    "ISA",
    "JER",
    "LAM",
    "EZK",
    "DAN",
    "HOS",
    "JOL",
    "AMO",
    "OBA",
    "JON",
    "MIC",
    "NAH",
    "HAB",
    "ZEP",
    "HAG",
    "ZEC",
    "MAL",
]
_NT_BOOKS = [
    "MAT",
    "MRK",
    "LUK",
    "JHN",
    "ACT",
    "ROM",
    "1CO",
    "2CO",
    "GAL",
    "EPH",
    "PHP",
    "COL",
    "1TH",
    "2TH",
    "1TI",
    "2TI",
    "TIT",
    "PHM",
    "HEB",
    "JAS",
    "1PE",
    "2PE",
    "1JN",
    "2JN",
    "3JN",
    "JUD",
    "REV",
]


@router.get("/intertextuality/quotations")
def get_ot_nt_quotations(
    min_votes: int = Query(3, ge=0, description="Minimum cross-ref confidence"),
    limit: int = Query(500, ge=1, le=2000, description="Max edges returned"),
) -> dict:
    """Get directed cross-references from OT to NT — for citation graph."""
    conn = get_db()
    try:
        df = conn.execute(
            """
            SELECT
                c.source_verse_id AS source_verse_id,
                SPLIT_PART(c.source_verse_id, '.', 1) AS source_book,
                c.target_verse_id AS target_verse_id,
                SPLIT_PART(c.target_verse_id, '.', 1) AS target_book,
                c.votes
            FROM cross_references c
            WHERE c.votes >= ?
            ORDER BY c.votes DESC
            LIMIT ?
            """,
            [min_votes, limit],
        ).fetchdf()

        # Filter to OT→NT only
        ot_set = set(_OT_BOOKS)
        nt_set = set(_NT_BOOKS)
        records = df.to_dict(orient="records")
        edges = [r for r in records if r["source_book"] in ot_set and r["target_book"] in nt_set]

        # Build node set
        nodes: dict[str, dict] = {}
        for e in edges:
            for key, testament in [
                ("source_book", "OT"),
                ("target_book", "NT"),
            ]:
                bid = e[key]
                if bid not in nodes:
                    nodes[bid] = {"id": bid, "testament": testament}

        return {
            "total_edges": len(edges),
            "nodes": list(nodes.values()),
            "edges": [
                {
                    "source": e["source_book"],
                    "target": e["target_book"],
                    "source_verse": e["source_verse_id"],
                    "target_verse": e["target_verse_id"],
                    "votes": e["votes"],
                }
                for e in edges
            ],
        }
    finally:
        conn.close()


@router.get("/intertextuality/heatmap")
def get_citation_heatmap(
    min_votes: int = Query(1, ge=0, description="Minimum cross-ref confidence"),
) -> dict:
    """Get OT×NT book-level cross-reference counts as a heatmap matrix."""
    conn = get_db()
    try:
        df = conn.execute(
            """
            SELECT
                SPLIT_PART(source_verse_id, '.', 1) AS source_book,
                SPLIT_PART(target_verse_id, '.', 1) AS target_book,
                COUNT(*) AS count
            FROM cross_references
            WHERE votes >= ?
            GROUP BY source_book, target_book
            """,
            [min_votes],
        ).fetchdf()

        ot_set = set(_OT_BOOKS)
        nt_set = set(_NT_BOOKS)
        records = df.to_dict(orient="records")

        # Build matrix: OT rows × NT columns
        matrix: list[dict] = []
        for r in records:
            src = r["source_book"]
            tgt = r["target_book"]
            if src in ot_set and tgt in nt_set:
                matrix.append({"source": src, "target": tgt, "count": int(r["count"])})

        return {
            "ot_books": [b for b in _OT_BOOKS if any(m["source"] == b for m in matrix)],
            "nt_books": [b for b in _NT_BOOKS if any(m["target"] == b for m in matrix)],
            "cells": matrix,
        }
    finally:
        conn.close()


@router.get("/intertextuality/chain/{verse_id}")
def get_citation_chain(
    verse_id: str,
    depth: int = Query(2, ge=1, le=4, description="Max traversal depth"),
) -> dict:
    """Follow the citation chain from a verse — outgoing cross-refs, then their refs."""
    conn = get_db()
    try:
        vid = verse_id.upper()
        visited: set[str] = set()
        nodes: dict[str, dict] = {}
        edges: list[dict] = []

        frontier = [vid]
        for level in range(depth):
            if not frontier:
                break
            placeholders = ", ".join("?" for _ in frontier)
            df = conn.execute(
                f"""
                SELECT
                    source_verse_id, target_verse_id, votes,
                    SPLIT_PART(source_verse_id, '.', 1) AS source_book,
                    SPLIT_PART(target_verse_id, '.', 1) AS target_book
                FROM cross_references
                WHERE source_verse_id IN ({placeholders})
                  AND votes >= 2
                ORDER BY votes DESC
                """,
                frontier,
            ).fetchdf()

            next_frontier: list[str] = []
            for _, row in df.iterrows():
                fv = row["source_verse_id"]
                tv = row["target_verse_id"]
                edge_key = f"{fv}->{tv}"
                if edge_key not in visited:
                    visited.add(edge_key)
                    edges.append(
                        {
                            "source": fv,
                            "target": tv,
                            "votes": int(row["votes"]),
                            "depth": level,
                        }
                    )
                    for v_id, book in [(fv, row["source_book"]), (tv, row["target_book"])]:
                        if v_id not in nodes:
                            nodes[v_id] = {"id": v_id, "book": book, "depth": level}
                    if tv not in {e["source"] for e in edges}:
                        next_frontier.append(tv)

            frontier = list(set(next_frontier))[:50]  # cap expansion

        return {
            "root": vid,
            "depth": depth,
            "nodes": list(nodes.values()),
            "edges": edges,
        }
    finally:
        conn.close()
