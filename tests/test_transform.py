"""
🧪 Tests — Transform Phase
"""

import pandas as pd
import pytest

from src.models.schemas import RawVerse
from src.transform.cleaning import (
    clean_verses,
    normalize_text,
    remove_duplicates,
    validate_verses,
    verses_to_dataframe,
)
from src.transform.enrichment import (
    compute_book_stats,
    compute_sentiment,
    compute_text_metrics,
    enrich_dataframe,
)

# ─── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def sample_verses() -> list[RawVerse]:
    return [
        RawVerse(
            book_id="GEN",
            book_name="Genesis",
            chapter=1,
            verse=1,
            text="In the beginning God created the heaven and the earth.",
        ),
        RawVerse(
            book_id="GEN",
            book_name="Genesis",
            chapter=1,
            verse=2,
            text="And the earth was without form, and void.",
        ),
        RawVerse(
            book_id="PSA",
            book_name="Psalms",
            chapter=23,
            verse=1,
            text="The LORD is my shepherd; I shall not want.",
        ),
        RawVerse(
            book_id="JHN",
            book_name="John",
            chapter=3,
            verse=16,
            text="For God so loved the world, that he gave his only begotten Son.",
        ),
    ]


@pytest.fixture
def sample_dataframe(sample_verses: list[RawVerse]) -> pd.DataFrame:
    return verses_to_dataframe(sample_verses)


# ─── Cleaning tests ──────────────────────────────────────────────────────────


class TestNormalizeText:
    def test_collapses_whitespace(self):
        assert normalize_text("hello   world") == "hello world"

    def test_strips_leading_trailing(self):
        assert normalize_text("  hello  ") == "hello"

    def test_fixes_smart_quotes(self):
        result = normalize_text("\u201chello\u201d")
        assert result == '"hello"'

    def test_handles_empty_string(self):
        assert normalize_text("") == ""

    def test_preserves_normal_text(self):
        text = "The LORD is my shepherd."
        assert normalize_text(text) == text


class TestRemoveDuplicates:
    def test_removes_exact_duplicates(self):
        verses = [
            RawVerse(book_id="GEN", book_name="Genesis", chapter=1, verse=1, text="First"),
            RawVerse(book_id="GEN", book_name="Genesis", chapter=1, verse=1, text="Duplicate"),
        ]
        result = remove_duplicates(verses)
        assert len(result) == 1
        assert result[0].text == "First"

    def test_keeps_unique(self, sample_verses):
        result = remove_duplicates(sample_verses)
        assert len(result) == len(sample_verses)


class TestValidateVerses:
    def test_valid_verses_pass(self, sample_verses):
        valid, errors = validate_verses(sample_verses)
        assert len(valid) == len(sample_verses)
        assert len(errors) == 0

    def test_empty_text_rejected(self):
        verses = [
            RawVerse(book_id="GEN", book_name="Genesis", chapter=1, verse=1, text="Valid"),
            RawVerse(book_id="GEN", book_name="Genesis", chapter=1, verse=2, text=" "),
        ]
        # After normalization, " " becomes "", which should fail
        for v in verses:
            v.text = v.text.strip()
        valid, errors = validate_verses(verses)
        assert len(valid) == 1
        assert len(errors) == 1


class TestCleanVerses:
    def test_full_cleaning_pipeline(self, sample_verses):
        result = clean_verses(sample_verses)
        assert len(result) == len(sample_verses)

    def test_handles_empty_input(self):
        result = clean_verses([])
        assert result == []


class TestVersesToDataframe:
    def test_returns_dataframe(self, sample_verses):
        df = verses_to_dataframe(sample_verses)
        assert isinstance(df, pd.DataFrame)
        assert len(df) == len(sample_verses)

    def test_has_required_columns(self, sample_verses):
        df = verses_to_dataframe(sample_verses)
        required = {"book_id", "book_name", "chapter", "verse", "text", "reference"}
        assert required.issubset(set(df.columns))


# ─── Enrichment tests ────────────────────────────────────────────────────────


class TestComputeTextMetrics:
    def test_basic_metrics(self):
        metrics = compute_text_metrics("Hello world test")
        assert metrics["word_count"] == 3
        assert metrics["char_count"] == 16
        assert metrics["avg_word_length"] > 0

    def test_empty_text(self):
        metrics = compute_text_metrics("")
        assert metrics["word_count"] == 0
        assert metrics["avg_word_length"] == 0.0

    def test_single_word(self):
        metrics = compute_text_metrics("God")
        assert metrics["word_count"] == 1
        assert metrics["avg_word_length"] == 3.0


class TestComputeSentiment:
    def test_returns_required_keys(self):
        result = compute_sentiment("This is wonderful and great!")
        assert "sentiment_polarity" in result
        assert "sentiment_subjectivity" in result
        assert "sentiment_label" in result

    def test_positive_text(self):
        result = compute_sentiment("This is wonderful and amazing and great!")
        assert result["sentiment_polarity"] > 0
        assert result["sentiment_label"] == "positive"

    def test_negative_text(self):
        result = compute_sentiment("This is terrible and awful and horrible!")
        assert result["sentiment_polarity"] < 0
        assert result["sentiment_label"] == "negative"

    def test_polarity_bounds(self):
        result = compute_sentiment("Some neutral text here.")
        assert -1.0 <= result["sentiment_polarity"] <= 1.0
        assert 0.0 <= result["sentiment_subjectivity"] <= 1.0


class TestEnrichDataframe:
    def test_adds_enrichment_columns(self, sample_dataframe):
        enriched = enrich_dataframe(sample_dataframe)
        expected_cols = {
            "testament",
            "category",
            "book_position",
            "word_count",
            "char_count",
            "avg_word_length",
            "sentiment_polarity",
            "sentiment_subjectivity",
            "sentiment_label",
        }
        assert expected_cols.issubset(set(enriched.columns))

    def test_preserves_row_count(self, sample_dataframe):
        enriched = enrich_dataframe(sample_dataframe)
        assert len(enriched) == len(sample_dataframe)

    def test_testament_values(self, sample_dataframe):
        enriched = enrich_dataframe(sample_dataframe)
        valid_testaments = {"Old Testament", "New Testament"}
        assert set(enriched["testament"].unique()).issubset(valid_testaments)


class TestComputeBookStats:
    def test_returns_aggregated_data(self, sample_dataframe):
        enriched = enrich_dataframe(sample_dataframe)
        stats = compute_book_stats(enriched)
        assert isinstance(stats, pd.DataFrame)
        assert len(stats) > 0
        assert "total_verses" in stats.columns
        assert "avg_sentiment" in stats.columns
