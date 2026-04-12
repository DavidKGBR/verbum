"""
📥 Extract Module
Fetches Bible text data from the bible-api.com REST API.
Includes retry logic, rate limiting, and local caching.
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path

import httpx
from rich.progress import BarColumn, Progress, SpinnerColumn, TaskProgressColumn, TextColumn

from src.config import ExtractConfig
from src.models.schemas import BOOK_CATALOG, RawVerse

logger = logging.getLogger(__name__)


class BibleExtractor:
    """Extracts Bible verses from the bible-api.com API."""

    # Number of chapters per book (KJV)
    CHAPTERS_PER_BOOK: dict[str, int] = {
        "Genesis": 50,
        "Exodus": 40,
        "Leviticus": 27,
        "Numbers": 36,
        "Deuteronomy": 34,
        "Joshua": 24,
        "Judges": 21,
        "Ruth": 4,
        "1 Samuel": 31,
        "2 Samuel": 24,
        "1 Kings": 22,
        "2 Kings": 25,
        "1 Chronicles": 29,
        "2 Chronicles": 36,
        "Ezra": 10,
        "Nehemiah": 13,
        "Esther": 10,
        "Job": 42,
        "Psalms": 150,
        "Proverbs": 31,
        "Ecclesiastes": 12,
        "Song of Solomon": 8,
        "Isaiah": 66,
        "Jeremiah": 52,
        "Lamentations": 5,
        "Ezekiel": 48,
        "Daniel": 12,
        "Hosea": 14,
        "Joel": 3,
        "Amos": 9,
        "Obadiah": 1,
        "Jonah": 4,
        "Micah": 7,
        "Nahum": 3,
        "Habakkuk": 3,
        "Zephaniah": 3,
        "Haggai": 2,
        "Zechariah": 14,
        "Malachi": 4,
        "Matthew": 28,
        "Mark": 16,
        "Luke": 24,
        "John": 21,
        "Acts": 28,
        "Romans": 16,
        "1 Corinthians": 16,
        "2 Corinthians": 13,
        "Galatians": 6,
        "Ephesians": 6,
        "Philippians": 4,
        "Colossians": 4,
        "1 Thessalonians": 5,
        "2 Thessalonians": 3,
        "1 Timothy": 6,
        "2 Timothy": 4,
        "Titus": 3,
        "Philemon": 1,
        "Hebrews": 13,
        "James": 5,
        "1 Peter": 5,
        "2 Peter": 3,
        "1 John": 5,
        "2 John": 1,
        "3 John": 1,
        "Jude": 1,
        "Revelation": 22,
    }

    def __init__(self, config: ExtractConfig | None = None) -> None:
        self.config = config or ExtractConfig()
        self.client = httpx.Client(
            base_url=self.config.api_base_url,
            timeout=self.config.request_timeout,
        )
        self._request_count = 0

    def close(self) -> None:
        self.client.close()

    def __enter__(self) -> BibleExtractor:
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    def _fetch_chapter(self, book_name: str, chapter: int) -> list[dict]:
        """Fetch a single chapter with retry logic."""
        reference = f"{book_name} {chapter}"
        url = f"/{reference}"
        params = {"translation": self.config.translation}

        for attempt in range(1, self.config.max_retries + 1):
            try:
                # Rate limiting
                if self._request_count > 0:
                    time.sleep(self.config.rate_limit_delay)

                response = self.client.get(url, params=params)
                self._request_count += 1

                if response.status_code == 200:
                    data = response.json()
                    return data.get("verses", [])
                if response.status_code == 404:
                    logger.warning(f"Chapter not found: {reference}")
                    return []
                if response.status_code == 429:
                    wait = self.config.retry_delay * attempt * 2
                    logger.warning(f"Rate limited. Waiting {wait}s...")
                    time.sleep(wait)
                else:
                    response.raise_for_status()

            except httpx.TimeoutException:
                logger.warning(
                    f"Timeout fetching {reference} (attempt {attempt}/{self.config.max_retries})"
                )
                time.sleep(self.config.retry_delay * attempt)
            except httpx.HTTPError as e:
                logger.error(f"HTTP error fetching {reference}: {e}")
                if attempt == self.config.max_retries:
                    raise

        return []

    def extract_book(self, book_id: str, book_name: str) -> list[RawVerse]:
        """Extract all verses from a single book."""
        chapters = self.CHAPTERS_PER_BOOK.get(book_name, 0)
        if chapters == 0:
            logger.error(f"Unknown book: {book_name}")
            return []

        verses: list[RawVerse] = []

        for ch in range(1, chapters + 1):
            raw_verses = self._fetch_chapter(book_name, ch)
            for v in raw_verses:
                try:
                    verse = RawVerse(
                        book_id=book_id,
                        book_name=book_name,
                        chapter=v.get("chapter", ch),
                        verse=v.get("verse", 0),
                        text=v.get("text", "").strip(),
                    )
                    verses.append(verse)
                except Exception as e:
                    logger.warning(f"Skipping invalid verse in {book_name} {ch}: {e}")

        return verses

    def extract_all(
        self,
        output_dir: Path | None = None,
        books: list[str] | None = None,
    ) -> list[RawVerse]:
        """
        Extract all books (or a subset) and optionally save raw data to disk.

        Args:
            output_dir: Directory to save raw JSON files per book.
            books: Optional list of book IDs to extract. None = all 66 books.

        Returns:
            List of all extracted RawVerse objects.
        """
        catalog = BOOK_CATALOG
        if books:
            catalog = [b for b in catalog if b["id"] in books]

        all_verses: list[RawVerse] = []
        total_chapters = sum(self.CHAPTERS_PER_BOOK.get(b["name"], 0) for b in catalog)

        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            TextColumn("[green]{task.fields[verses_count]} verses"),
        ) as progress:
            task = progress.add_task(
                "Extracting Bible data...",
                total=len(catalog),
                verses_count=0,
            )

            for book in catalog:
                book_id, book_name = book["id"], book["name"]
                progress.update(task, description=f"📖 {book_name}")

                verses = self.extract_book(book_id, book_name)
                all_verses.extend(verses)

                # Save raw JSON per book
                if output_dir:
                    output_dir.mkdir(parents=True, exist_ok=True)
                    book_file = output_dir / f"{book_id.lower()}.json"
                    book_file.write_text(
                        json.dumps(
                            [v.model_dump() for v in verses],
                            indent=2,
                            ensure_ascii=False,
                        ),
                        encoding="utf-8",
                    )

                progress.update(task, advance=1, verses_count=len(all_verses))

        logger.info(f"✅ Extracted {len(all_verses)} verses from {len(catalog)} books")
        return all_verses

    def load_from_cache(self, cache_dir: Path) -> list[RawVerse]:
        """Load previously extracted data from local JSON files."""
        verses: list[RawVerse] = []

        if not cache_dir.exists():
            return verses

        for json_file in sorted(cache_dir.glob("*.json")):
            try:
                data = json.loads(json_file.read_text(encoding="utf-8"))
                for item in data:
                    verses.append(RawVerse(**item))
            except Exception as e:
                logger.warning(f"Error loading {json_file}: {e}")

        logger.info(f"📂 Loaded {len(verses)} verses from cache ({cache_dir})")
        return verses
