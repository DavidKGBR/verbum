"""Tests for the Open Questions API endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from src.api.main import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


class TestListQuestions:
    def test_list_all(self, client: TestClient) -> None:
        r = client.get("/api/v1/open-questions")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 10
        assert "categories" in data
        assert "results" in data
        q = data["results"][0]
        assert "id" in q
        assert "title" in q
        assert "category" in q
        assert "difficulty" in q
        assert "verse_refs" in q

    def test_filter_by_category(self, client: TestClient) -> None:
        r = client.get("/api/v1/open-questions?category=Identity")
        assert r.status_code == 200
        data = r.json()
        for q in data["results"]:
            assert q["category"] == "Identity"

    def test_pagination(self, client: TestClient) -> None:
        r = client.get("/api/v1/open-questions?limit=3&offset=0")
        assert r.status_code == 200
        data = r.json()
        assert len(data["results"]) <= 3


class TestGetQuestion:
    def test_get_by_id(self, client: TestClient) -> None:
        r = client.get("/api/v1/open-questions/sons-of-god-genesis-6")
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == "sons-of-god-genesis-6"
        assert "description" in data
        assert "perspectives" in data
        assert len(data["perspectives"]) >= 2

    def test_not_found(self, client: TestClient) -> None:
        r = client.get("/api/v1/open-questions/nonexistent-question")
        assert r.status_code == 404


class TestForVerse:
    def test_verse_with_questions(self, client: TestClient) -> None:
        r = client.get("/api/v1/open-questions/for-verse/GEN.6.4")
        assert r.status_code == 200
        data = r.json()
        assert data["verse_id"] == "GEN.6.4"
        assert data["count"] >= 1

    def test_verse_without_questions(self, client: TestClient) -> None:
        r = client.get("/api/v1/open-questions/for-verse/GEN.1.2")
        assert r.status_code == 200
        data = r.json()
        assert data["count"] == 0
