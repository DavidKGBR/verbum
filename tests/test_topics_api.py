"""Tests for the Topics API endpoints."""

from __future__ import annotations

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from src.api.dependencies import set_db_path
from src.api.main import app
from src.config import LoadConfig
from src.load.duckdb_loader import DuckDBLoader


@pytest.fixture(scope="module")
def seeded_db(tmp_path_factory: pytest.TempPathFactory) -> str:
    db_dir = tmp_path_factory.mktemp("topics_api_db")
    db_path = str(db_dir / "test.duckdb")

    loader = DuckDBLoader(LoadConfig(duckdb_path=db_path))
    loader.create_schema()

    # Seed topics
    topics_df = pd.DataFrame(
        [
            {"topic_id": "-100", "name": "FAITH", "slug": "faith", "verse_count": 3},
            {"topic_id": "-200", "name": "LOVE", "slug": "love", "verse_count": 5},
            {"topic_id": "-300", "name": "PRAYER", "slug": "prayer", "verse_count": 2},
        ]
    )
    loader.load_topics(topics_df)

    # Seed topic_verses
    verses_df = pd.DataFrame(
        [
            {"topic_id": "-100", "verse_id": "HEB.11.1", "sort_order": 1},
            {"topic_id": "-100", "verse_id": "ROM.10.17", "sort_order": 2},
            {"topic_id": "-100", "verse_id": "GAL.2.20", "sort_order": 3},
            {"topic_id": "-200", "verse_id": "1CO.13.4", "sort_order": 1},
            {"topic_id": "-200", "verse_id": "JHN.3.16", "sort_order": 2},
        ]
    )
    loader.load_topic_verses(verses_df)

    # Seed a few verses for join
    bible_verses = []
    for vid, ref, text in [
        ("HEB.11.1", "Hebrews 11:1", "Now faith is the substance of things hoped for."),
        ("ROM.10.17", "Romans 10:17", "So then faith cometh by hearing."),
        ("1CO.13.4", "1 Corinthians 13:4", "Charity suffereth long and is kind."),
        ("JHN.3.16", "John 3:16", "For God so loved the world."),
    ]:
        parts = vid.split(".")
        bible_verses.append(
            {
                "verse_id": vid,
                "book_id": parts[0],
                "book_name": ref.split(" ")[0],
                "chapter": int(parts[1]),
                "verse": int(parts[2]),
                "text": text,
                "reference": ref,
                "translation_id": "kjv",
                "language": "en",
                "testament": "New Testament",
                "category": "Pauline Epistles",
                "book_position": 58,
                "word_count": len(text.split()),
                "char_count": len(text),
                "avg_word_length": 5.0,
                "sentiment_polarity": 0.1,
                "sentiment_subjectivity": 0.3,
                "sentiment_label": "positive",
            }
        )
    bv_df = pd.DataFrame(bible_verses)
    loader.load_verses(bv_df, translation_ids=["kjv"])

    loader.close()
    return db_path


@pytest.fixture(scope="module")
def client(seeded_db: str) -> TestClient:
    set_db_path(seeded_db)
    return TestClient(app)


class TestTopicsList:
    def test_list_all(self, client: TestClient) -> None:
        r = client.get("/api/v1/topics")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 3

    def test_search(self, client: TestClient) -> None:
        r = client.get("/api/v1/topics?q=faith")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 1
        assert data["results"][0]["name"] == "FAITH"


class TestPopularTopics:
    def test_popular(self, client: TestClient) -> None:
        r = client.get("/api/v1/topics/popular?limit=2")
        assert r.status_code == 200
        data = r.json()
        assert len(data["results"]) == 2
        # LOVE has most verses (5), should be first
        assert data["results"][0]["name"] == "LOVE"


class TestTopicDetail:
    def test_get_topic_with_verses(self, client: TestClient) -> None:
        r = client.get("/api/v1/topics/faith")
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "FAITH"
        assert len(data["verses"]) == 3
        # First verse should have text from KJV
        v = data["verses"][0]
        assert v["verse_id"] == "HEB.11.1"
        assert "faith" in v["text"].lower()

    def test_topic_not_found(self, client: TestClient) -> None:
        r = client.get("/api/v1/topics/nonexistent")
        assert r.status_code == 404


class TestTopicsForVerse:
    def test_reverse_lookup(self, client: TestClient) -> None:
        r = client.get("/api/v1/topics/for-verse/HEB.11.1")
        assert r.status_code == 200
        data = r.json()
        assert len(data["topics"]) >= 1
        topic_names = [t["name"] for t in data["topics"]]
        assert "FAITH" in topic_names

    def test_no_topics_for_verse(self, client: TestClient) -> None:
        r = client.get("/api/v1/topics/for-verse/GEN.1.1")
        assert r.status_code == 200
        data = r.json()
        assert len(data["topics"]) == 0
