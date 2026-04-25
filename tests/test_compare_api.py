"""Tests for the Compare API endpoints."""

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
    db_dir = tmp_path_factory.mktemp("compare_api_db")
    db_path = str(db_dir / "test.duckdb")

    loader = DuckDBLoader(LoadConfig(duckdb_path=db_path))
    loader.create_schema()

    # Seed some verses for comparison
    verses = []
    for ch in range(1, 3):
        for vs in range(1, 4):
            verses.append(
                {
                    "verse_id": f"MAT.{ch}.{vs}",
                    "book_id": "MAT",
                    "book_name": "Matthew",
                    "chapter": ch,
                    "verse": vs,
                    "text": f"Matthew chapter {ch} verse {vs} text.",
                    "reference": f"Matthew {ch}:{vs}",
                    "translation_id": "kjv",
                    "language": "en",
                    "testament": "New Testament",
                    "category": "Gospels",
                    "book_position": 40,
                    "word_count": 6,
                    "char_count": 35,
                    "avg_word_length": 5.0,
                    "sentiment_polarity": 0.0,
                    "sentiment_subjectivity": 0.0,
                    "sentiment_label": "neutral",
                }
            )
            verses.append(
                {
                    "verse_id": f"MRK.{ch}.{vs}",
                    "book_id": "MRK",
                    "book_name": "Mark",
                    "chapter": ch,
                    "verse": vs,
                    "text": f"Mark chapter {ch} verse {vs} text.",
                    "reference": f"Mark {ch}:{vs}",
                    "translation_id": "kjv",
                    "language": "en",
                    "testament": "New Testament",
                    "category": "Gospels",
                    "book_position": 41,
                    "word_count": 6,
                    "char_count": 30,
                    "avg_word_length": 5.0,
                    "sentiment_polarity": 0.0,
                    "sentiment_subjectivity": 0.0,
                    "sentiment_label": "neutral",
                }
            )

    df = pd.DataFrame(verses)
    loader.load_verses(df, translation_ids=["kjv"])
    loader.close()
    return db_path


@pytest.fixture(scope="module")
def client(seeded_db: str) -> TestClient:
    set_db_path(seeded_db)
    return TestClient(app)


class TestPresets:
    def test_list_presets(self, client: TestClient) -> None:
        r = client.get("/api/v1/compare/presets")
        assert r.status_code == 200
        data = r.json()
        assert data["count"] >= 12
        p = data["presets"][0]
        assert "id" in p
        assert "title" in p
        assert "labels" in p

    def test_get_preset(self, client: TestClient) -> None:
        r = client.get("/api/v1/compare/presets/creation")
        assert r.status_code == 200
        data = r.json()
        assert data["title"] == "Creation Accounts"
        assert len(data["columns"]) == 2
        assert data["columns"][0]["label"] == "Genesis 1"

    def test_preset_not_found(self, client: TestClient) -> None:
        r = client.get("/api/v1/compare/presets/nonexistent")
        assert r.status_code == 404


class TestCustomCompare:
    def test_custom_two_passages(self, client: TestClient) -> None:
        r = client.get("/api/v1/compare/custom?passages=MAT.1.1-MAT.1.3,MRK.1.1-MRK.1.3")
        assert r.status_code == 200
        data = r.json()
        assert len(data["columns"]) == 2
        assert data["columns"][0]["verse_count"] == 3
        assert data["columns"][1]["verse_count"] == 3

    def test_custom_needs_two_passages(self, client: TestClient) -> None:
        r = client.get("/api/v1/compare/custom?passages=MAT.1.1-MAT.1.3")
        assert r.status_code == 400

    def test_custom_invalid_range(self, client: TestClient) -> None:
        r = client.get("/api/v1/compare/custom?passages=INVALID,MAT.1.1-MAT.1.3")
        assert r.status_code == 400
