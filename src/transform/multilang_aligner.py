"""
🌍 Transform — Multi-Language Alignment
Aligns verses across translations and computes coverage reports.
"""

from __future__ import annotations

import logging

import pandas as pd

logger = logging.getLogger(__name__)


def align_verses(verses_by_translation: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """
    Combine verse DataFrames from multiple translations into a single DataFrame.

    Args:
        verses_by_translation: Dict mapping translation_id to its enriched DataFrame.

    Returns:
        Combined DataFrame with all translations.
    """
    if not verses_by_translation:
        return pd.DataFrame()

    frames = list(verses_by_translation.values())
    combined = pd.concat(frames, ignore_index=True)
    combined = combined.sort_values(
        ["translation_id", "book_position", "chapter", "verse"]
    ).reset_index(drop=True)

    logger.info(
        f"🌍 Aligned {len(combined)} verses across {len(verses_by_translation)} translations"
    )
    return combined


def compute_coverage_report(df: pd.DataFrame, reference_translation: str = "kjv") -> pd.DataFrame:
    """
    Compute coverage per translation compared to a reference.

    Args:
        df: Combined DataFrame with verse_id and translation_id columns.
        reference_translation: The translation to compare others against.

    Returns:
        DataFrame with coverage stats per translation.
    """
    if "verse_id" not in df.columns or "translation_id" not in df.columns:
        return pd.DataFrame()

    ref_verse_ids = set(df.loc[df["translation_id"] == reference_translation, "verse_id"])
    ref_count = len(ref_verse_ids)

    rows = []
    for tid, group in df.groupby("translation_id"):
        translation_verse_ids = set(group["verse_id"])
        total = len(translation_verse_ids)
        matched = len(translation_verse_ids & ref_verse_ids)
        coverage = (matched / ref_count * 100) if ref_count > 0 else 0.0

        rows.append(
            {
                "translation_id": tid,
                "total_verses": total,
                "matched_with_reference": matched,
                "coverage_pct": round(coverage, 2),
                "missing_count": ref_count - matched,
            }
        )

    report = pd.DataFrame(rows)
    logger.info(f"📊 Coverage report computed for {len(rows)} translations")
    return report


def find_missing_verses(
    df: pd.DataFrame,
    reference_translation: str = "kjv",
) -> pd.DataFrame:
    """
    Find verses present in the reference translation but missing in others.

    Returns:
        DataFrame with translation_id and missing verse_id columns.
    """
    if "verse_id" not in df.columns or "translation_id" not in df.columns:
        return pd.DataFrame()

    ref_verse_ids = set(df.loc[df["translation_id"] == reference_translation, "verse_id"])

    rows = []
    for tid in df["translation_id"].unique():
        if tid == reference_translation:
            continue
        translation_verse_ids = set(df.loc[df["translation_id"] == tid, "verse_id"])
        missing = ref_verse_ids - translation_verse_ids
        for vid in sorted(missing):
            rows.append({"translation_id": tid, "verse_id": vid})

    return pd.DataFrame(rows)
