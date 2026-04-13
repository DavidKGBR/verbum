"""
🧪 Tests — FastAPI REST API (Sprint 3)
"""

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from src.api.dependencies import set_db_path
from src.api.main import app
from src.config import LoadConfig
from src.load.duckdb_loader import DuckDBLoader


@pytest.fixture(scope="module")
def seeded_db(tmp_path_factory):
    """Create and seed a temporary DuckDB for API testing."""
    db_dir = tmp_path_factory.mktemp("api_db")
    db_path = str(db_dir / "test_api.duckdb")

    config = LoadConfig(duckdb_path=db_path)
    loader = DuckDBLoader(config)
    loader.create_schema()

    # Seed verses
    verses_df = pd.DataFrame(
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
                "text": "For God so loved the world that he gave his only begotten Son.",
                "reference": "John 3:16",
                "translation_id": "kjv",
                "language": "en",
                "testament": "New Testament",
                "category": "Gospels",
                "book_position": 43,
                "word_count": 12,
                "char_count": 62,
                "avg_word_length": 4.2,
                "sentiment_polarity": 0.5,
                "sentiment_subjectivity": 0.6,
                "sentiment_label": "positive",
            },
        ]
    )
    loader.load_verses(verses_df)

    # Seed book stats
    book_stats_df = pd.DataFrame(
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
            {
                "translation_id": "kjv",
                "language": "en",
                "book_id": "JHN",
                "book_name": "John",
                "testament": "New Testament",
                "category": "Gospels",
                "book_position": 43,
                "total_chapters": 1,
                "total_verses": 1,
                "total_words": 12,
                "avg_words_per_verse": 12.0,
                "avg_sentiment": 0.5,
                "min_sentiment": 0.5,
                "max_sentiment": 0.5,
                "positive_verses": 1,
                "negative_verses": 0,
                "neutral_verses": 0,
            },
        ]
    )
    loader.load_book_stats(book_stats_df)

    # Seed cross-references
    crossref_df = pd.DataFrame(
        [
            {
                "source_verse_id": "GEN.1.1",
                "target_verse_id": "JHN.1.1",
                "source_book_id": "GEN",
                "target_book_id": "JHN",
                "source_book_position": 1,
                "target_book_position": 43,
                "votes": 5,
                "reference_type": "prophetic",
                "arc_distance": 42,
            },
        ]
    )
    loader.load_cross_references(crossref_df)

    # Seed translations
    loader.load_translations(
        [
            {
                "translation_id": "kjv",
                "language": "en",
                "name": "King James Version",
                "full_name": "KJV",
                "year": 1611,
                "license": "Public Domain",
                "source_api": "bible-api.com",
            },
        ]
    )

    loader.close()
    return db_path


@pytest.fixture(scope="module")
def client(seeded_db):
    """FastAPI test client with seeded database."""
    set_db_path(seeded_db)
    with TestClient(app) as c:
        yield c


# ─── Health ───────────────────────────────────────────────────────────────────


class TestHealth:
    def test_health_check(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


# ─── Books & Verses ──────────────────────────────────────────────────────────


class TestBooks:
    def test_list_books(self, client):
        r = client.get("/api/v1/books?translation=kjv")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 2  # GEN, JHN
        assert data[0]["book_id"] == "GEN"

    def test_get_chapter(self, client):
        r = client.get("/api/v1/books/GEN/chapters/1?translation=kjv")
        assert r.status_code == 200
        data = r.json()
        assert data["verse_count"] == 2
        assert len(data["verses"]) == 2

    def test_get_chapter_not_found(self, client):
        r = client.get("/api/v1/books/GEN/chapters/999?translation=kjv")
        assert r.status_code == 404

    def test_get_verse(self, client):
        r = client.get("/api/v1/verses/GEN.1.1?translations=kjv")
        assert r.status_code == 200
        data = r.json()
        assert data["verse_id"] == "GEN.1.1"
        assert len(data["translations"]) == 1

    def test_get_verse_not_found(self, client):
        r = client.get("/api/v1/verses/XXX.99.99?translations=kjv")
        assert r.status_code == 404


# ─── Search ───────────────────────────────────────────────────────────────────


class TestSearch:
    def test_search_basic(self, client):
        r = client.get("/api/v1/verses/search?q=beginning&translation=kjv")
        assert r.status_code == 200
        data = r.json()
        assert data["total_results"] >= 1
        assert "beginning" in data["results"][0]["text"].lower()

    def test_search_with_book_filter(self, client):
        r = client.get("/api/v1/verses/search?q=God&translation=kjv&book=JHN")
        assert r.status_code == 200
        data = r.json()
        for result in data["results"]:
            assert result["book_id"] == "JHN"

    def test_search_no_results(self, client):
        r = client.get("/api/v1/verses/search?q=xyznonexistent&translation=kjv")
        assert r.status_code == 200
        assert r.json()["total_results"] == 0


# ─── Analytics ────────────────────────────────────────────────────────────────


class TestAnalytics:
    def test_sentiment_by_book(self, client):
        r = client.get("/api/v1/analytics/sentiment?group_by=book&translation=kjv")
        assert r.status_code == 200
        data = r.json()
        assert data["group_by"] == "book"
        assert len(data["data"]) == 2  # GEN, JHN

    def test_sentiment_by_testament(self, client):
        r = client.get("/api/v1/analytics/sentiment?group_by=testament&translation=kjv")
        assert r.status_code == 200
        assert len(r.json()["data"]) == 2

    def test_sentiment_filter_testament(self, client):
        r = client.get(
            "/api/v1/analytics/sentiment?group_by=book&translation=kjv&testament=Old+Testament"
        )
        assert r.status_code == 200
        for item in r.json()["data"]:
            assert item["testament"] == "Old Testament"

    def test_heatmap(self, client):
        r = client.get("/api/v1/analytics/heatmap?translation=kjv")
        assert r.status_code == 200
        data = r.json()
        assert data["total_chapters"] >= 1
        assert "avg_sentiment" in data["data"][0]

    def test_translation_stats(self, client):
        r = client.get("/api/v1/analytics/translations")
        assert r.status_code == 200
        data = r.json()
        assert len(data["translations"]) >= 1
        assert data["translations"][0]["translation_id"] == "kjv"


# ─── Cross-References ────────────────────────────────────────────────────────


class TestCrossRefs:
    def test_get_arcs(self, client):
        r = client.get("/api/v1/crossrefs/arcs")
        assert r.status_code == 200
        data = r.json()
        assert len(data["arcs"]) >= 1
        assert data["metadata"]["total_crossrefs"] >= 1

    def test_get_arcs_filter_book(self, client):
        r = client.get("/api/v1/crossrefs/arcs?source_book=GEN")
        assert r.status_code == 200
        for arc in r.json()["arcs"]:
            assert arc["source_book_id"] == "GEN"

    def test_get_verse_crossrefs(self, client):
        r = client.get("/api/v1/crossrefs/GEN.1.1")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 1

    def test_get_verse_crossrefs_not_found(self, client):
        r = client.get("/api/v1/crossrefs/XXX.99.99")
        assert r.status_code == 404

    def test_network(self, client):
        r = client.get("/api/v1/crossrefs/network?min_weight=1")
        assert r.status_code == 200
        data = r.json()
        assert len(data["nodes"]) >= 1
        assert len(data["edges"]) >= 1

    def test_crossref_counts(self, client):
        r = client.get("/api/v1/crossrefs/counts?book=GEN&chapter=1")
        assert r.status_code == 200
        data = r.json()
        assert data["book"] == "GEN"
        assert data["chapter"] == 1
        # GEN.1.1 has one outgoing crossref in the seed
        assert data["counts"].get("GEN.1.1") == 1

    def test_crossref_counts_empty_chapter(self, client):
        r = client.get("/api/v1/crossrefs/counts?book=GEN&chapter=99")
        assert r.status_code == 200
        assert r.json()["counts"] == {}


# ─── Random verse & verse translations ───────────────────────────────────────


class TestExtras:
    def test_random_verse(self, client):
        r = client.get("/api/v1/verses/random?translation=kjv")
        assert r.status_code == 200
        data = r.json()
        assert "verse_id" in data
        assert "text" in data
        assert "reference" in data

    def test_verse_translations(self, client):
        r = client.get("/api/v1/verses/GEN.1.1/translations?translations=kjv")
        assert r.status_code == 200
        data = r.json()
        assert data["verse_id"] == "GEN.1.1"
        assert "kjv" in data["translations"]


# ─── AI endpoint (graceful when key missing) ─────────────────────────────────


class TestAI:
    def test_explain_without_key(self, client, monkeypatch):
        """Without GEMINI_API_KEY the endpoint must return 503, not crash."""
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        r = client.post(
            "/api/v1/ai/explain",
            json={"verse_id": "GEN.1.1", "language": "en", "translation": "kjv"},
        )
        assert r.status_code == 503
        assert "Gemini" in r.json()["detail"]
