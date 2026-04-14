"""Tests for Community Notes API endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient

from src.api.main import app

client = TestClient(app)


class TestCommunityNotes:
    """Tests for GET /api/v1/community/notes."""

    def test_notes_for_known_verse(self) -> None:
        r = client.get("/api/v1/community/notes", params={"verse_id": "JHN.3.16"})
        assert r.status_code == 200
        data = r.json()
        assert "verse_id" in data
        assert data["verse_id"] == "JHN.3.16"
        assert "notes" in data
        assert isinstance(data["notes"], list)
        # We know JHN.3.16 is in community_notes.json
        assert data["count"] >= 1

    def test_notes_for_unknown_verse(self) -> None:
        r = client.get("/api/v1/community/notes", params={"verse_id": "ZZZ.99.99"})
        assert r.status_code == 200
        data = r.json()
        assert data["count"] == 0
        assert data["notes"] == []

    def test_notes_requires_verse_id(self) -> None:
        r = client.get("/api/v1/community/notes")
        assert r.status_code == 422

    def test_notes_uppercases_verse_id(self) -> None:
        r = client.get("/api/v1/community/notes", params={"verse_id": "jhn.3.16"})
        assert r.status_code == 200
        data = r.json()
        assert data["verse_id"] == "JHN.3.16"

    def test_note_has_expected_fields(self) -> None:
        r = client.get("/api/v1/community/notes", params={"verse_id": "JHN.3.16"})
        assert r.status_code == 200
        data = r.json()
        if data["notes"]:
            note = data["notes"][0]
            assert "id" in note
            assert "title" in note
            assert "content" in note
            assert "category" in note


class TestRecentNotes:
    """Tests for GET /api/v1/community/recent."""

    def test_recent_returns_notes(self) -> None:
        r = client.get("/api/v1/community/recent")
        assert r.status_code == 200
        data = r.json()
        assert "notes" in data
        assert "count" in data
        assert isinstance(data["notes"], list)

    def test_recent_respects_limit(self) -> None:
        r = client.get("/api/v1/community/recent", params={"limit": 3})
        assert r.status_code == 200
        data = r.json()
        assert len(data["notes"]) <= 3


class TestCommunityStats:
    """Tests for GET /api/v1/community/stats."""

    def test_stats_returns_expected_keys(self) -> None:
        r = client.get("/api/v1/community/stats")
        assert r.status_code == 200
        data = r.json()
        assert "total_notes" in data
        assert "unique_verses" in data
        assert "categories" in data
        assert isinstance(data["categories"], dict)
        assert data["total_notes"] > 0
