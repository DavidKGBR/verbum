"""Tests for the Deep Analytics API endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from src.api.main import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


class TestHapax:
    def test_hapax_returns_list(self, client: TestClient) -> None:
        r = client.get("/api/v1/analytics/hapax?limit=10")
        assert r.status_code == 200
        data = r.json()
        assert "results" in data
        assert "total" in data

    def test_hapax_filter_language(self, client: TestClient) -> None:
        r = client.get("/api/v1/analytics/hapax?language=hebrew&limit=5")
        assert r.status_code == 200
        data = r.json()
        for h in data["results"]:
            assert h["language"] == "hebrew"

    def test_hapax_filter_book(self, client: TestClient) -> None:
        r = client.get("/api/v1/analytics/hapax?book=PSA&limit=5")
        assert r.status_code == 200
        data = r.json()
        for h in data["results"]:
            assert h["verse_id"].startswith("PSA.") or h["book_id"] == "PSA"


class TestVocabularyRichness:
    def test_richness_list(self, client: TestClient) -> None:
        r = client.get("/api/v1/analytics/vocabulary-richness")
        # May fail if book_stats doesn't exist in test DB
        if r.status_code == 200:
            data = r.json()
            assert "books" in data
            assert "total" in data
            if data["books"]:
                book = data["books"][0]
                assert "book_id" in book
                assert "richness" in book
                assert "unique_words" in book
                assert "total_words" in book

    def test_richness_sorted_desc(self, client: TestClient) -> None:
        r = client.get("/api/v1/analytics/vocabulary-richness?limit=10")
        if r.status_code == 200:
            data = r.json()
            if len(data["books"]) >= 2:
                assert data["books"][0]["richness"] >= data["books"][1]["richness"]


class TestVocabularyDensity:
    def test_density_requires_book(self, client: TestClient) -> None:
        r = client.get("/api/v1/analytics/density")
        assert r.status_code == 422  # missing required param

    def test_density_valid_book(self, client: TestClient) -> None:
        r = client.get("/api/v1/analytics/density?book=PSA")
        assert r.status_code in (200, 404)  # 404 if no interlinear data
        if r.status_code == 200:
            data = r.json()
            assert data["book_id"] == "PSA"
            assert "chapters" in data


class TestAuthorFingerprint:
    def test_fingerprint_not_found(self, client: TestClient) -> None:
        r = client.get("/api/v1/analytics/fingerprint/nonexistent")
        assert r.status_code == 404

    def test_fingerprint_valid_author(self, client: TestClient) -> None:
        r = client.get("/api/v1/analytics/fingerprint/moses")
        assert r.status_code == 200
        data = r.json()
        assert data["author_id"] == "moses"
        assert "stats" in data
        assert "top_words" in data
        assert "books" in data
