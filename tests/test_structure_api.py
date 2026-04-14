"""Tests for the Literary Structure API endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from src.api.main import app


@pytest.fixture(scope="module")
def client() -> TestClient:
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
