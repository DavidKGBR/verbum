"""
🔬 Transform — Enrichment
Adds metadata, text metrics, and NLP features to cleaned verses.
"""

from __future__ import annotations

import logging

import pandas as pd
from textblob import TextBlob

from src.models.schemas import BOOK_CATALOG, EnrichedVerse

logger = logging.getLogger(__name__)

# ─── Book metadata lookup ─────────────────────────────────────────────────────

_BOOK_META = {b["id"]: b for b in BOOK_CATALOG}


def _get_book_meta(book_id: str) -> dict:
    """Get book metadata from catalog."""
    return _BOOK_META.get(book_id, {})


# ─── Text metrics ─────────────────────────────────────────────────────────────


def compute_text_metrics(text: str) -> dict:
    """Compute basic text statistics for a verse."""
    words = text.split()
    word_count = len(words)
    char_count = len(text)
    avg_word_length = sum(len(w) for w in words) / word_count if word_count > 0 else 0.0

    return {
        "word_count": word_count,
        "char_count": char_count,
        "avg_word_length": round(avg_word_length, 2),
    }


# ─── Sentiment analysis ──────────────────────────────────────────────────────


def compute_sentiment(text: str) -> dict:
    """Compute sentiment polarity and subjectivity using TextBlob."""
    blob = TextBlob(text)
    polarity = round(blob.sentiment.polarity, 4)
    subjectivity = round(blob.sentiment.subjectivity, 4)

    # Classify sentiment
    if polarity > 0.1:
        label = "positive"
    elif polarity < -0.1:
        label = "negative"
    else:
        label = "neutral"

    return {
        "sentiment_polarity": polarity,
        "sentiment_subjectivity": subjectivity,
        "sentiment_label": label,
    }


# ─── Main enrichment ─────────────────────────────────────────────────────────


def enrich_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Enrich a cleaned DataFrame with metadata, text metrics, and NLP features.

    Args:
        df: DataFrame with columns: book_id, book_name, chapter, verse, text, reference

    Returns:
        Enriched DataFrame with all analytical columns.
    """
    logger.info(f"🔬 Enriching {len(df)} verses with metadata & NLP features...")

    # 1. Add book metadata
    df["testament"] = df["book_id"].map(lambda x: _get_book_meta(x).get("testament", ""))
    df["category"] = df["book_id"].map(lambda x: _get_book_meta(x).get("category", ""))
    df["book_position"] = df["book_id"].map(lambda x: _get_book_meta(x).get("pos", 0))

    # 2. Compute text metrics
    text_metrics = df["text"].apply(compute_text_metrics)
    metrics_df = pd.DataFrame(text_metrics.tolist())
    df = pd.concat([df, metrics_df], axis=1)

    # 3. Compute sentiment
    logger.info("💭 Running sentiment analysis (this may take a moment)...")
    sentiments = df["text"].apply(compute_sentiment)
    sentiment_df = pd.DataFrame(sentiments.tolist())
    df = pd.concat([df, sentiment_df], axis=1)

    # 4. Sort by canonical order
    df = df.sort_values(["book_position", "chapter", "verse"]).reset_index(drop=True)

    logger.info(f"✅ Enrichment complete: {len(df)} verses, {len(df.columns)} columns")
    return df


def dataframe_to_enriched_verses(df: pd.DataFrame) -> list[EnrichedVerse]:
    """Convert enriched DataFrame rows to validated Pydantic models."""
    verses: list[EnrichedVerse] = []
    errors = 0

    for _, row in df.iterrows():
        try:
            verse = EnrichedVerse(**row.to_dict())
            verses.append(verse)
        except Exception as e:
            errors += 1
            logger.debug(f"Validation error: {e}")

    if errors:
        logger.warning(f"⚠️  {errors} verses failed model validation")

    return verses


# ─── Aggregation helpers ──────────────────────────────────────────────────────


def compute_book_stats(df: pd.DataFrame) -> pd.DataFrame:
    """Compute aggregated statistics per book."""
    group_cols = ["book_id", "book_name", "testament", "category", "book_position"]
    if "translation_id" in df.columns:
        group_cols = ["translation_id", "language"] + group_cols
    stats = (
        df.groupby(group_cols)
        .agg(
            total_chapters=("chapter", "nunique"),
            total_verses=("verse", "count"),
            total_words=("word_count", "sum"),
            avg_words_per_verse=("word_count", "mean"),
            avg_sentiment=("sentiment_polarity", "mean"),
            min_sentiment=("sentiment_polarity", "min"),
            max_sentiment=("sentiment_polarity", "max"),
            positive_verses=("sentiment_label", lambda x: (x == "positive").sum()),
            negative_verses=("sentiment_label", lambda x: (x == "negative").sum()),
            neutral_verses=("sentiment_label", lambda x: (x == "neutral").sum()),
        )
        .reset_index()
    )

    stats = stats.sort_values("book_position").reset_index(drop=True)
    stats["avg_words_per_verse"] = stats["avg_words_per_verse"].round(2)
    stats["avg_sentiment"] = stats["avg_sentiment"].round(4)

    return stats


def compute_chapter_stats(df: pd.DataFrame) -> pd.DataFrame:
    """Compute aggregated statistics per chapter."""
    group_cols = ["book_id", "book_name", "chapter", "book_position"]
    if "translation_id" in df.columns:
        group_cols = ["translation_id", "language"] + group_cols
    stats = (
        df.groupby(group_cols)
        .agg(
            total_verses=("verse", "count"),
            total_words=("word_count", "sum"),
            avg_words_per_verse=("word_count", "mean"),
            avg_sentiment=("sentiment_polarity", "mean"),
            avg_subjectivity=("sentiment_subjectivity", "mean"),
        )
        .reset_index()
    )

    stats = stats.sort_values(["book_position", "chapter"]).reset_index(drop=True)
    stats["avg_words_per_verse"] = stats["avg_words_per_verse"].round(2)
    stats["avg_sentiment"] = stats["avg_sentiment"].round(4)
    stats["avg_subjectivity"] = stats["avg_subjectivity"].round(4)

    return stats
