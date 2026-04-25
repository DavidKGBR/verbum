"""
🔗 Transform — Cross-Reference Mapper
Normalizes cross-references, calculates arc distances, and classifies reference types.
"""

from __future__ import annotations

import logging

import pandas as pd

from src.models.schemas import (
    BOOK_CATALOG,
    CrossReference,
    CrossRefStats,
    RawCrossReference,
)

logger = logging.getLogger(__name__)

# Build lookups from BOOK_CATALOG
_BOOK_ID_TO_POSITION: dict[str, int] = {b["id"]: b["pos"] for b in BOOK_CATALOG}
_BOOK_ID_TO_TESTAMENT: dict[str, str] = {b["id"]: b["testament"] for b in BOOK_CATALOG}


def classify_reference_type(
    source_position: int,
    target_position: int,
    arc_distance: int,
) -> str:
    """Classify a cross-reference type based on distance and testament crossing.

    - direct: within same testament, nearby books (distance <= 5)
    - thematic: moderate distance or same testament (distance 6-30)
    - prophetic: large jumps, typically OT→NT (distance > 30)
    """
    if arc_distance <= 5:
        return "direct"
    if arc_distance <= 30:
        return "thematic"
    return "prophetic"


def transform_crossrefs(
    raw_refs: list[RawCrossReference],
) -> tuple[list[CrossReference], CrossRefStats]:
    """Transform raw cross-references into enriched CrossReference objects.

    Args:
        raw_refs: List of raw cross-reference pairs.

    Returns:
        Tuple of (enriched references, aggregated statistics).
    """
    logger.info(f"🔗 Transforming {len(raw_refs)} cross-references...")

    enriched: list[CrossReference] = []
    skipped = 0

    for raw in raw_refs:
        # Extract book_id from verse_id (e.g., "GEN.1.1" → "GEN")
        source_parts = raw.source_verse_id.split(".")
        target_parts = raw.target_verse_id.split(".")

        if len(source_parts) != 3 or len(target_parts) != 3:
            skipped += 1
            continue

        source_book_id = source_parts[0]
        target_book_id = target_parts[0]

        source_pos = _BOOK_ID_TO_POSITION.get(source_book_id)
        target_pos = _BOOK_ID_TO_POSITION.get(target_book_id)

        if not source_pos or not target_pos:
            skipped += 1
            continue

        # Skip self-references
        if raw.source_verse_id == raw.target_verse_id:
            skipped += 1
            continue

        arc_distance = abs(target_pos - source_pos)
        ref_type = classify_reference_type(source_pos, target_pos, arc_distance)

        enriched.append(
            CrossReference(
                source_verse_id=raw.source_verse_id,
                target_verse_id=raw.target_verse_id,
                source_book_id=source_book_id,
                target_book_id=target_book_id,
                source_book_position=source_pos,
                target_book_position=target_pos,
                votes=raw.votes,
                reference_type=ref_type,
            )
        )

    if skipped > 0:
        logger.warning(f"⚠️  Skipped {skipped} invalid cross-references")

    # Compute stats
    stats = _compute_stats(enriched)

    logger.info(
        f"✅ Transformed {len(enriched)} cross-references "
        f"({stats.unique_book_pairs} unique book pairs, "
        f"avg distance: {stats.avg_arc_distance:.1f})"
    )
    return enriched, stats


def _compute_stats(refs: list[CrossReference]) -> CrossRefStats:
    """Compute aggregated statistics from enriched cross-references."""
    if not refs:
        return CrossRefStats()

    book_pairs: set[tuple[str, str]] = set()
    distances: list[int] = []
    old_to_new = 0
    within_old = 0
    within_new = 0

    for ref in refs:
        book_pairs.add((ref.source_book_id, ref.target_book_id))
        distances.append(ref.arc_distance)

        source_testament = _BOOK_ID_TO_TESTAMENT.get(ref.source_book_id, "")
        target_testament = _BOOK_ID_TO_TESTAMENT.get(ref.target_book_id, "")

        if source_testament == "Old Testament" and target_testament == "New Testament":
            old_to_new += 1
        elif source_testament == "Old Testament" and target_testament == "Old Testament":
            within_old += 1
        elif source_testament == "New Testament" and target_testament == "New Testament":
            within_new += 1

    return CrossRefStats(
        total_refs=len(refs),
        unique_book_pairs=len(book_pairs),
        avg_arc_distance=round(sum(distances) / len(distances), 2),
        max_arc_distance=max(distances),
        refs_old_to_new=old_to_new,
        refs_within_old=within_old,
        refs_within_new=within_new,
    )


def crossrefs_to_dataframe(refs: list[CrossReference]) -> pd.DataFrame:
    """Convert cross-references to a DataFrame for DuckDB loading."""
    if not refs:
        return pd.DataFrame()

    records = [r.model_dump() for r in refs]
    return pd.DataFrame(records)
