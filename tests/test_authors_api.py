"""Tests for the Authors API endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from src.api.main import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    """FastAPI test client — authors endpoints use static JSON, not DuckDB."""
    return TestClient(app)


class TestAuthorsEndpoints:
    def test_list_all_authors(self, client: TestClient) -> None:
        r = client.get("/api/v1/authors")
        assert r.status_code == 200
        data = r.json()
        assert "authors" in data
        assert "count" in data
        assert data["count"] >= 30  # we have ~33 authors

    def test_filter_by_testament_ot(self, client: TestClient) -> None:
        r = client.get("/api/v1/authors?testament=OT")
        assert r.status_code == 200
        data = r.json()
        for author in data["authors"]:
            assert author["testament"] == "OT"

    def test_filter_by_testament_nt(self, client: TestClient) -> None:
        r = client.get("/api/v1/authors?testament=NT")
        assert r.status_code == 200
        data = r.json()
        for author in data["authors"]:
            assert author["testament"] == "NT"
        # Paul, Matthew, Mark, Luke, John, Peter, James, Jude, Hebrews = 9
        assert data["count"] >= 9

    def test_get_single_author(self, client: TestClient) -> None:
        r = client.get("/api/v1/authors/paul")
        assert r.status_code == 200
        data = r.json()
        assert data["author_id"] == "paul"
        assert data["name"] == "Paul (Saul of Tarsus)"
        assert "ROM" in data["books"]
        assert "stats" in data

    def test_get_author_not_found(self, client: TestClient) -> None:
        r = client.get("/api/v1/authors/nonexistent")
        assert r.status_code == 404

    def test_author_has_required_fields(self, client: TestClient) -> None:
        r = client.get("/api/v1/authors")
        assert r.status_code == 200
        for author in r.json()["authors"]:
            assert "author_id" in author
            assert "name" in author
            assert "period" in author
            assert "testament" in author
            assert "books" in author
            assert "literary_style" in author
            assert "description" in author
            assert isinstance(author["books"], list)
