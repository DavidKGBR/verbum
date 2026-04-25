"""
🧹 Transform — Cleaning
Text normalization, deduplication, and data quality checks.
"""

from __future__ import annotations

import html
import logging
import re

import pandas as pd

from src.models.schemas import RawVerse

logger = logging.getLogger(__name__)


def normalize_text(text: str) -> str:
    """Normalize verse text: fix whitespace, encoding artifacts, HTML entities."""
    # Decode HTML entities first: &#x27; → '   &amp; → &   &lt; → <
    text = html.unescape(text)
    # Collapse multiple whitespace
    text = re.sub(r"\s+", " ", text)
    # Remove leading/trailing whitespace
    text = text.strip()
    # Fix common encoding issues
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2014", "—").replace("\u2013", "–")
    return text


def remove_duplicates(verses: list[RawVerse]) -> list[RawVerse]:
    """Remove duplicate verses based on book_id + chapter + verse."""
    seen: set[str] = set()
    unique: list[RawVerse] = []

    for v in verses:
        key = f"{v.translation_id}:{v.book_id}:{v.chapter}:{v.verse}"
        if key not in seen:
            seen.add(key)
            unique.append(v)
        else:
            logger.debug(f"Duplicate removed: {key}")

    removed = len(verses) - len(unique)
    if removed > 0:
        logger.info(f"🗑️  Removed {removed} duplicate verses")

    return unique


def validate_verses(verses: list[RawVerse]) -> tuple[list[RawVerse], list[dict]]:
    """
    Validate verses and separate valid from invalid.

    Returns:
        Tuple of (valid_verses, error_records)
    """
    valid: list[RawVerse] = []
    errors: list[dict] = []

    for v in verses:
        issues = []

        if not v.text or len(v.text.strip()) == 0:
            issues.append("empty_text")
        if v.chapter < 1:
            issues.append("invalid_chapter")
        if v.verse < 1:
            issues.append("invalid_verse")

        if issues:
            errors.append(
                {
                    "reference": f"{v.book_id} {v.chapter}:{v.verse}",
                    "issues": issues,
                    "text_preview": v.text[:50] if v.text else "",
                }
            )
        else:
            valid.append(v)

    if errors:
        logger.warning(f"⚠️  {len(errors)} verses failed validation")

    return valid, errors


def clean_verses(verses: list[RawVerse]) -> list[RawVerse]:
    """Full cleaning pipeline: normalize → deduplicate → validate."""
    logger.info(f"🧹 Cleaning {len(verses)} raw verses...")

    # 1. Normalize text
    for v in verses:
        v.text = normalize_text(v.text)

    # 2. Remove duplicates
    verses = remove_duplicates(verses)

    # 3. Validate
    valid, errors = validate_verses(verses)

    logger.info(f"✅ Cleaning complete: {len(valid)} valid, {len(errors)} rejected")
    return valid


def verses_to_dataframe(verses: list[RawVerse]) -> pd.DataFrame:
    """Convert a list of RawVerse models to a Pandas DataFrame."""
    records = [v.model_dump() for v in verses]
    df = pd.DataFrame(records)
    df = df.sort_values(["translation_id", "book_id", "chapter", "verse"]).reset_index(drop=True)
    return df
