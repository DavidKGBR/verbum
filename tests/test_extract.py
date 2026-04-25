"""
🧪 Tests — Extract Phase
"""

import json
from pathlib import Path

from src.extract.bible_api import BibleExtractor
from src.models.schemas import BOOK_CATALOG, RawVerse


class TestBibleExtractor:
    """Tests for BibleExtractor."""

    def test_chapters_per_book_has_all_books(self):
        """Ensure every book in the catalog has a chapter count."""
        extractor = BibleExtractor()
        for book in BOOK_CATALOG:
            assert book["name"] in extractor.CHAPTERS_PER_BOOK, (
                f"Missing chapter count for: {book['name']}"
            )

    def test_chapters_per_book_values_are_positive(self):
        """All chapter counts must be positive integers."""
        extractor = BibleExtractor()
        for name, count in extractor.CHAPTERS_PER_BOOK.items():
            assert isinstance(count, int) and count > 0, (
                f"Invalid chapter count for {name}: {count}"
            )

    def test_total_books_is_66(self):
        """The Bible has 66 canonical books."""
        assert len(BOOK_CATALOG) == 66

    def test_load_from_cache_empty_dir(self, tmp_path):
        """Loading from an empty cache returns an empty list."""
        extractor = BibleExtractor()
        result = extractor.load_from_cache(tmp_path)
        assert result == []

    def test_load_from_cache_with_data(self, tmp_path):
        """Loading from cache correctly parses JSON files."""
        test_data = [
            {
                "book_id": "GEN",
                "book_name": "Genesis",
                "chapter": 1,
                "verse": 1,
                "text": "In the beginning God created the heaven and the earth.",
            }
        ]
        json_file = tmp_path / "gen.json"
        json_file.write_text(json.dumps(test_data))

        extractor = BibleExtractor()
        result = extractor.load_from_cache(tmp_path)

        assert len(result) == 1
        assert isinstance(result[0], RawVerse)
        assert result[0].book_id == "GEN"
        assert result[0].chapter == 1
        assert result[0].verse == 1

    def test_load_from_cache_nonexistent_dir(self):
        """Loading from a nonexistent directory returns empty list."""
        extractor = BibleExtractor()
        result = extractor.load_from_cache(Path("/nonexistent/path"))
        assert result == []
