"""Tests for Home Stats API endpoint."""

from __future__ import annotations

from fastapi.testclient import TestClient

from src.api.main import app

client = TestClient(app)


class TestHomeStats:
    """Tests for GET /api/v1/home/stats."""

    def test_returns_expected_keys(self) -> None:
        r = client.get("/api/v1/home/stats")
        assert r.status_code == 200
        data = r.json()
        assert "people_count" in data
        assert "places_count" in data
        assert "topics_count" in data
        assert "structures_count" in data
        assert "questions_count" in data
        assert "community_notes_count" in data
        assert "recent_notes" in data
        assert "recent_questions" in data

    def test_counts_are_non_negative(self) -> None:
        r = client.get("/api/v1/home/stats")
        assert r.status_code == 200
        data = r.json()
        assert data["people_count"] >= 0
        assert data["places_count"] >= 0
        assert data["topics_count"] >= 0
        assert data["structures_count"] >= 0
        assert data["questions_count"] >= 0
        assert data["community_notes_count"] >= 0

    def test_recent_notes_is_list(self) -> None:
        r = client.get("/api/v1/home/stats")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data["recent_notes"], list)
        assert len(data["recent_notes"]) <= 3
        if data["recent_notes"]:
            note = data["recent_notes"][0]
            assert "id" in note
            assert "title" in note
            assert "category" in note

    def test_recent_questions_is_list(self) -> None:
        r = client.get("/api/v1/home/stats")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data["recent_questions"], list)
        assert len(data["recent_questions"]) <= 3
        if data["recent_questions"]:
            q = data["recent_questions"][0]
            assert "id" in q
            assert "title" in q
            assert "category" in q

    def test_static_json_counts_match(self) -> None:
        """Structures and questions come from static JSON; verify they're loaded."""
        r = client.get("/api/v1/home/stats")
        assert r.status_code == 200
        data = r.json()
        # We know literary_structures.json has 14 entries (Fase 6 added 4 new structures)
        assert data["structures_count"] == 14
        # We know open_questions.json has 15 entries
        assert data["questions_count"] == 15
        # We know community_notes.json has entries
        assert data["community_notes_count"] > 0


class TestRandomVerseTextClean:
    """Tests for text_clean field in GET /api/v1/verses/random."""

    def test_kjv_random_has_text_clean(self) -> None:
        r = client.get("/api/v1/verses/random", params={"translation": "kjv"})
        if r.status_code == 200:
            data = r.json()
            assert "text_clean" in data
            # text_clean should not contain { or } (annotation markers)
            assert "{" not in data["text_clean"]

    def test_non_kjv_random_no_text_clean(self) -> None:
        r = client.get("/api/v1/verses/random", params={"translation": "nvi"})
        if r.status_code == 200:
            data = r.json()
            # non-KJV translations should NOT have text_clean
            assert "text_clean" not in data
