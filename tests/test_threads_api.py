"""Tests for the Semantic Threads API endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from src.api.main import app


@pytest.fixture(scope="module")
def client() -> TestClient:
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
        # First get a valid thread ID
        r = client.get("/api/v1/threads?min_books=2&min_verses=2&limit=1")
        data = r.json()
        if not data["threads"]:
            pytest.skip("No threads available")

        thread_id = data["threads"][0]["id"]
        r2 = client.get(f"/api/v1/threads/{thread_id}")
        assert r2.status_code == 200
        detail = r2.json()
        assert "verses" in detail
        assert "books" in detail
        assert detail["total_verses"] >= 1


class TestDiscoverThread:
    def test_discover_by_tag(self, client: TestClient) -> None:
        r = client.get("/api/v1/threads/discover?tag=love&min_books=2")
        assert r.status_code == 200
        data = r.json()
        assert "threads" in data
        assert data["query"] == "love"
