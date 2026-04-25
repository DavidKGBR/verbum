"""
🧪 Tests — Load Phase
"""

import pandas as pd
import pytest

from src.config import LoadConfig
from src.load.duckdb_loader import DuckDBLoader


@pytest.fixture
def tmp_db(tmp_path) -> DuckDBLoader:
    """Create a temporary DuckDB database for testing."""
    config = LoadConfig(duckdb_path=str(tmp_path / "test.duckdb"))
    loader = DuckDBLoader(config)
    loader.create_schema()
    yield loader
    loader.close()


@pytest.fixture
def sample_enriched_df() -> pd.DataFrame:
    """Sample enriched DataFrame for testing."""
    return pd.DataFrame(
        [
            {
                "verse_id": "GEN.1.1",
                "book_id": "GEN",
                "book_name": "Genesis",
                "chapter": 1,
                "verse": 1,
                "text": "In the beginning God created the heaven and the earth.",
                "reference": "Genesis 1:1",
                "translation_id": "kjv",
                "language": "en",
                "testament": "Old Testament",
                "category": "Law",
                "book_position": 1,
                "word_count": 10,
                "char_count": 54,
                "avg_word_length": 4.5,
                "sentiment_polarity": 0.0,
                "sentiment_subjectivity": 0.0,
                "sentiment_label": "neutral",
            },
            {
                "verse_id": "GEN.1.2",
                "book_id": "GEN",
                "book_name": "Genesis",
                "chapter": 1,
                "verse": 2,
                "text": "And the earth was without form, and void.",
                "reference": "Genesis 1:2",
                "translation_id": "kjv",
                "language": "en",
                "testament": "Old Testament",
                "category": "Law",
                "book_position": 1,
                "word_count": 9,
                "char_count": 42,
                "avg_word_length": 3.8,
                "sentiment_polarity": -0.1,
                "sentiment_subjectivity": 0.3,
                "sentiment_label": "neutral",
            },
            {
                "verse_id": "JHN.3.16",
                "book_id": "JHN",
                "book_name": "John",
                "chapter": 3,
                "verse": 16,
                "text": "For God so loved the world.",
                "reference": "John 3:16",
                "translation_id": "kjv",
                "language": "en",
                "testament": "New Testament",
                "category": "Gospels",
                "book_position": 43,
                "word_count": 6,
                "char_count": 27,
                "avg_word_length": 3.8,
                "sentiment_polarity": 0.5,
                "sentiment_subjectivity": 0.6,
                "sentiment_label": "positive",
            },
        ]
    )


@pytest.fixture
def sample_book_stats_df() -> pd.DataFrame:
    """Sample book stats DataFrame."""
    return pd.DataFrame(
        [
            {
                "translation_id": "kjv",
                "language": "en",
                "book_id": "GEN",
                "book_name": "Genesis",
                "testament": "Old Testament",
                "category": "Law",
                "book_position": 1,
                "total_chapters": 1,
                "total_verses": 2,
                "total_words": 19,
                "avg_words_per_verse": 9.5,
                "avg_sentiment": -0.05,
                "min_sentiment": -0.1,
                "max_sentiment": 0.0,
                "positive_verses": 0,
                "negative_verses": 0,
                "neutral_verses": 2,
            },
        ]
    )


@pytest.fixture
def sample_chapter_stats_df() -> pd.DataFrame:
    """Sample chapter stats DataFrame."""
    return pd.DataFrame(
        [
            {
                "translation_id": "kjv",
                "language": "en",
                "book_id": "GEN",
                "book_name": "Genesis",
                "chapter": 1,
                "book_position": 1,
                "total_verses": 2,
                "total_words": 19,
                "avg_words_per_verse": 9.5,
                "avg_sentiment": -0.05,
                "avg_subjectivity": 0.15,
            },
        ]
    )


class TestDuckDBLoader:
    def test_create_schema(self, tmp_db):
        """Schema creation should not raise."""
        tables = tmp_db.query("SHOW TABLES")
        table_names = set(tables["name"].tolist())
        assert "verses" in table_names
        assert "book_stats" in table_names
        assert "chapter_stats" in table_names
        assert "pipeline_runs" in table_names
        assert "translations" in table_names

    def test_load_verses(self, tmp_db, sample_enriched_df):
        """Loading verses should insert all rows."""
        count = tmp_db.load_verses(sample_enriched_df)
        assert count == 3

    def test_load_is_idempotent(self, tmp_db, sample_enriched_df):
        """Running load twice should not duplicate data."""
        tmp_db.load_verses(sample_enriched_df)
        count = tmp_db.load_verses(sample_enriched_df)
        assert count == 3

    def test_load_book_stats(self, tmp_db, sample_book_stats_df):
        count = tmp_db.load_book_stats(sample_book_stats_df)
        assert count == 1

    def test_load_chapter_stats(self, tmp_db, sample_chapter_stats_df):
        count = tmp_db.load_chapter_stats(sample_chapter_stats_df)
        assert count == 1

    def test_query(self, tmp_db, sample_enriched_df):
        """Arbitrary SQL queries should work."""
        tmp_db.load_verses(sample_enriched_df)
        result = tmp_db.query("SELECT COUNT(*) AS cnt FROM verses")
        assert result["cnt"].iloc[0] == 3

    def test_get_summary(self, tmp_db, sample_enriched_df):
        """Summary should return correct counts."""
        tmp_db.load_verses(sample_enriched_df)
        summary = tmp_db.get_summary()
        assert summary["total_verses"] == 3
        assert summary["total_books"] == 2
        assert summary["total_translations"] == 1
        assert summary["total_words"] == 25

    def test_analytical_views_exist(self, tmp_db, sample_enriched_df):
        """Analytical views should be queryable after data load."""
        tmp_db.load_verses(sample_enriched_df)

        views = [
            "v_testament_summary",
            "v_category_summary",
            "v_longest_verses",
            "v_sentiment_journey",
            "v_translation_summary",
            "v_parallel_verses",
        ]
        for view in views:
            result = tmp_db.query(f"SELECT * FROM {view}")
            assert isinstance(result, pd.DataFrame), f"View {view} failed"

    def test_testament_summary_view(self, tmp_db, sample_enriched_df):
        """Testament summary should aggregate correctly."""
        tmp_db.load_verses(sample_enriched_df)
        result = tmp_db.query("SELECT * FROM v_testament_summary ORDER BY testament")
        assert len(result) == 2  # Old and New Testament
        assert set(result["testament"].tolist()) == {"Old Testament", "New Testament"}

    def test_context_manager(self, tmp_path):
        """Context manager should open and close cleanly."""
        config = LoadConfig(duckdb_path=str(tmp_path / "ctx.duckdb"))
        with DuckDBLoader(config) as loader:
            loader.create_schema()
            tables = loader.query("SHOW TABLES")
            assert len(tables) > 0

    def test_log_pipeline_run(self, tmp_db):
        """Pipeline run logging should insert a record."""
        tmp_db.log_pipeline_run(
            run_id="test-123",
            started_at="2025-01-01T00:00:00",
            completed_at="2025-01-01T00:05:00",
            status="success",
            total_verses=100,
            duration_seconds=300.0,
            translations="kjv",
        )
        result = tmp_db.query("SELECT * FROM pipeline_runs WHERE run_id = 'test-123'")
        assert len(result) == 1
        assert result["status"].iloc[0] == "success"

    def test_load_translations(self, tmp_db):
        """Translation metadata should load correctly."""
        translations = [
            {
                "translation_id": "kjv",
                "language": "en",
                "name": "King James Version",
                "full_name": "King James Version",
                "year": 1611,
                "license": "Public Domain",
                "source_api": "bible-api.com",
            },
        ]
        count = tmp_db.load_translations(translations)
        assert count == 1

    def test_scoped_delete_by_translation(self, tmp_db, sample_enriched_df):
        """Deleting one translation should not affect others."""
        # Load KJV verses
        tmp_db.load_verses(sample_enriched_df)

        # Load ASV verses (same verses, different translation)
        asv_df = sample_enriched_df.copy()
        asv_df["translation_id"] = "asv"
        tmp_db.load_verses(asv_df, translation_ids=["asv"])

        # Should have 6 total (3 KJV + 3 ASV)
        total = tmp_db.query("SELECT COUNT(*) AS cnt FROM verses")["cnt"].iloc[0]
        assert total == 6

        # Delete only ASV
        tmp_db.load_verses(
            sample_enriched_df.head(0),  # empty df
            translation_ids=["asv"],
        )

        # KJV should remain
        total = tmp_db.query("SELECT COUNT(*) AS cnt FROM verses")["cnt"].iloc[0]
        assert total == 3
        tid = tmp_db.query("SELECT DISTINCT translation_id FROM verses")["translation_id"].iloc[0]
        assert tid == "kjv"
