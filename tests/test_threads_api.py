"""Tests for the Semantic Threads API endpoints."""

from __future__ import annotations

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from src.api.dependencies import set_db_path
from src.api.main import app
from src.config import LoadConfig
from src.load.duckdb_loader import DuckDBLoader


@pytest.fixture(scope="module")
def seeded_db(tmp_path_factory) -> str:  # type: ignore[no-untyped-def]
    """Create a temp DuckDB with interlinear data for thread queries."""
    db_dir = tmp_path_factory.mktemp("threads_db")
    db_path = str(db_dir / "threads.duckdb")

    config = LoadConfig(duckdb_path=db_path)
    loader = DuckDBLoader(config)
    loader.create_schema()

    # Seed verses (needed for get_thread JOIN)
    loader.load_verses(
        pd.DataFrame(
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
                    "verse_id": "PSA.19.1",
                    "book_id": "PSA",
                    "book_name": "Psalms",
                    "chapter": 19,
                    "verse": 1,
                    "text": "The heavens declare the glory of God.",
                    "reference": "Psalms 19:1",
                    "translation_id": "kjv",
                    "language": "en",
                    "testament": "Old Testament",
                    "category": "Poetry",
                    "book_position": 19,
                    "word_count": 7,
                    "char_count": 38,
                    "avg_word_length": 4.7,
                    "sentiment_polarity": 0.0,
                    "sentiment_subjectivity": 0.0,
                    "sentiment_label": "neutral",
                },
                {
                    "verse_id": "JHN.1.1",
                    "book_id": "JHN",
                    "book_name": "John",
                    "chapter": 1,
                    "verse": 1,
                    "text": "In the beginning was the Word.",
                    "reference": "John 1:1",
                    "translation_id": "kjv",
                    "language": "en",
                    "testament": "New Testament",
                    "category": "Gospels",
                    "book_position": 43,
                    "word_count": 7,
                    "char_count": 30,
                    "avg_word_length": 3.6,
                    "sentiment_polarity": 0.0,
                    "sentiment_subjectivity": 0.0,
                    "sentiment_label": "neutral",
                },
            ]
        ),
    )

    # Seed interlinear data — "creation" tag spans GEN + PSA + JHN (3 books)
    loader.load_interlinear(
        pd.DataFrame(
            [
                {
                    "verse_id": "GEN.1.1",
                    "word_position": 1,
                    "language": "hebrew",
                    "source": "tahot",
                    "original_word": "בָּרָא",
                    "transliteration": "bara",
                    "english": "created",
                    "strongs_id": "H1254",
                    "strongs_raw": "H1254",
                    "grammar": "V",
                    "lemma": "בָּרָא",
                    "gloss": "create",
                    "semantic_tag": "creation",
                },
                {
                    "verse_id": "PSA.19.1",
                    "word_position": 1,
                    "language": "hebrew",
                    "source": "tahot",
                    "original_word": "שָׁמַיִם",
                    "transliteration": "shamayim",
                    "english": "heavens",
                    "strongs_id": "H8064",
                    "strongs_raw": "H8064",
                    "grammar": "N",
                    "lemma": "שָׁמַיִם",
                    "gloss": "heavens",
                    "semantic_tag": "creation",
                },
                {
                    "verse_id": "JHN.1.1",
                    "word_position": 1,
                    "language": "greek",
                    "source": "tagnt",
                    "original_word": "λόγος",
                    "transliteration": "logos",
                    "english": "word",
                    "strongs_id": "G3056",
                    "strongs_raw": "G3056",
                    "grammar": "N",
                    "lemma": "λόγος",
                    "gloss": "word",
                    "semantic_tag": "creation",
                },
            ]
        ),
        "tahot",
    )

    loader.close()
    return db_path


@pytest.fixture(scope="module")
def client(seeded_db: str) -> TestClient:
    set_db_path(seeded_db)
    return TestClient(app)


class TestListThreads:
    def test_list_returns_threads(self, client: TestClient) -> None:
        r = client.get("/api/v1/threads?min_books=2&min_verses=2&limit=10")
        assert r.status_code == 200
        data = r.json()
        assert "threads" in data
        assert "total" in data

    def test_list_respects_min_books(self, client: TestClient) -> None:
        r = client.get("/api/v1/threads?min_books=5&min_verses=5&limit=10")
        assert r.status_code == 200
        data = r.json()
        for t in data["threads"]:
            assert t["book_count"] >= 5

    def test_thread_structure(self, client: TestClient) -> None:
        r = client.get("/api/v1/threads?min_books=2&min_verses=2&limit=1")
        assert r.status_code == 200
        data = r.json()
        if data["threads"]:
            t = data["threads"][0]
            assert "id" in t
            assert "semantic_tag" in t
            assert "verse_count" in t
            assert "book_count" in t
            assert "strength_score" in t


class TestGetThread:
    def test_thread_not_found(self, client: TestClient) -> None:
        r = client.get("/api/v1/threads/nonexistent-thread-xyz")
        assert r.status_code == 404

    def test_get_thread_detail(self, client: TestClient) -> None:
        # "creation" tag spans 3 books (GEN, PSA, JHN)
        r = client.get("/api/v1/threads/creation")
        assert r.status_code == 200
        detail = r.json()
        assert "verses" in detail
        assert "books" in detail
        assert detail["total_verses"] >= 1


class TestDiscoverThread:
    def test_discover_by_tag(self, client: TestClient) -> None:
        r = client.get("/api/v1/threads/discover?tag=creation&min_books=2")
        assert r.status_code == 200
        data = r.json()
        assert "threads" in data
        assert data["query"] == "creation"
