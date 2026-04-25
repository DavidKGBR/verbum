"""Tests for the Literary Structure API endpoints."""

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
    """Create a temp DuckDB with a PSA verse for chapter-structure query."""
    db_dir = tmp_path_factory.mktemp("structure_db")
    db_path = str(db_dir / "structure.duckdb")

    config = LoadConfig(duckdb_path=db_path)
    loader = DuckDBLoader(config)
    loader.create_schema()

    loader.load_verses(
        pd.DataFrame(
            [
                {
                    "verse_id": "PSA.1.1",
                    "book_id": "PSA",
                    "book_name": "Psalms",
                    "chapter": 1,
                    "verse": 1,
                    "text": "Blessed is the man that walketh not in the counsel of the ungodly.",
                    "reference": "Psalms 1:1",
                    "translation_id": "kjv",
                    "language": "en",
                    "testament": "Old Testament",
                    "category": "Poetry",
                    "book_position": 19,
                    "word_count": 13,
                    "char_count": 66,
                    "avg_word_length": 4.3,
                    "sentiment_polarity": 0.0,
                    "sentiment_subjectivity": 0.0,
                    "sentiment_label": "neutral",
                },
            ]
        ),
    )

    loader.close()
    return db_path


@pytest.fixture(scope="module")
def client(seeded_db: str) -> TestClient:
    set_db_path(seeded_db)
    return TestClient(app)


class TestAllStructures:
    def test_list_all(self, client: TestClient) -> None:
        r = client.get("/api/v1/structure/all")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 8
        assert "structures" in data
        s = data["structures"][0]
        assert "structure_id" in s
        assert "book_id" in s
        assert "type" in s
        assert "title" in s

    def test_filter_by_type(self, client: TestClient) -> None:
        r = client.get("/api/v1/structure/all?structure_type=chiasm")
        assert r.status_code == 200
        data = r.json()
        for s in data["structures"]:
            assert s["type"] == "chiasm"


class TestBookStructures:
    def test_get_by_book(self, client: TestClient) -> None:
        r = client.get("/api/v1/structure/PSA")
        assert r.status_code == 200
        data = r.json()
        assert data["book_id"] == "PSA"
        assert data["total"] >= 1
        for s in data["structures"]:
            assert s["book_id"] == "PSA"

    def test_empty_book(self, client: TestClient) -> None:
        r = client.get("/api/v1/structure/EZR")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 0


class TestChapterStructures:
    def test_chapter_with_structure(self, client: TestClient) -> None:
        r = client.get("/api/v1/structure/PSA/1?translation=kjv")
        assert r.status_code == 200
        data = r.json()
        assert data["book_id"] == "PSA"
        assert data["chapter"] == 1
        if data["total"] > 0:
            s = data["structures"][0]
            assert "elements" in s


class TestChiasms:
    def test_list_chiasms(self, client: TestClient) -> None:
        r = client.get("/api/v1/structure/chiasms")
        assert r.status_code == 200
        data = r.json()
        assert "chiasms" in data
        for c in data["chiasms"]:
            assert c["type"] == "chiasm"

    def test_chiasms_filter_book(self, client: TestClient) -> None:
        r = client.get("/api/v1/structure/chiasms?book=JHN")
        assert r.status_code == 200
        data = r.json()
        for c in data["chiasms"]:
            assert c["book_id"] == "JHN"

    def test_chiasms_min_confidence(self, client: TestClient) -> None:
        r = client.get("/api/v1/structure/chiasms?min_confidence=0.8")
        assert r.status_code == 200
        data = r.json()
        for c in data["chiasms"]:
            assert c.get("confidence", 0) >= 0.8
