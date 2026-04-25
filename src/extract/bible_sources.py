"""
🌐 Multi-Source Bible Extraction
Abstract interface for fetching Bible data from different API sources.
"""

from __future__ import annotations

import json
import logging
import os
import time
import xml.etree.ElementTree as ET
from abc import ABC, abstractmethod
from pathlib import Path

import httpx
from rich.progress import BarColumn, Progress, SpinnerColumn, TaskProgressColumn, TextColumn

from src.config import ExtractConfig
from src.extract.translations import (
    ABIBLIA_DIGITAL_TRANSLATIONS,
    BIBLE_API_COM_TRANSLATIONS,
    PRE_CACHED_TRANSLATIONS,
    ZEFANIA_XML_TRANSLATIONS,
    get_translation,
)
from src.models.schemas import BOOK_CATALOG, RawVerse

logger = logging.getLogger(__name__)

# Chapters per book (canonical, shared across translations)
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


class BibleSource(ABC):
    """Abstract interface for Bible data sources."""

    def __init__(self, translation_id: str, config: ExtractConfig | None = None) -> None:
        self.translation_id = translation_id
        self.translation = get_translation(translation_id)
        self.config = config or ExtractConfig()

    @abstractmethod
    def fetch_chapter(self, book_name: str, chapter: int) -> list[RawVerse]:
        """Fetch all verses from a single chapter."""

    def fetch_book(self, book_id: str, book_name: str) -> list[RawVerse]:
        """Fetch all verses from a single book."""
        chapters = CHAPTERS_PER_BOOK.get(book_name, 0)
        if chapters == 0:
            logger.error(f"Unknown book: {book_name}")
            return []

        verses: list[RawVerse] = []
        for ch in range(1, chapters + 1):
            chapter_verses = self.fetch_chapter(book_name, ch)
            verses.extend(chapter_verses)

        return verses

    def fetch_all(
        self,
        output_dir: Path | None = None,
        books: list[str] | None = None,
    ) -> list[RawVerse]:
        """Fetch all books (or a subset) and optionally cache to disk."""
        catalog = BOOK_CATALOG
        if books:
            catalog = [b for b in catalog if b["id"] in books]

        all_verses: list[RawVerse] = []

        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            TextColumn("[green]{task.fields[verses_count]} verses"),
        ) as progress:
            task = progress.add_task(
                f"Extracting ({self.translation_id.upper()})...",
                total=len(catalog),
                verses_count=0,
            )

            for book in catalog:
                book_id, book_name = book["id"], book["name"]
                progress.update(task, description=f"📖 {book_name} ({self.translation_id.upper()})")

                verses = self.fetch_book(book_id, book_name)
                all_verses.extend(verses)

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

        logger.info(
            f"✅ Extracted {len(all_verses)} verses from {len(catalog)} books "
            f"({self.translation_id.upper()})"
        )
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
                    # Ensure cached data gets the correct translation_id
                    item.setdefault("translation_id", self.translation_id)
                    item.setdefault("language", self.translation.language)
                    verses.append(RawVerse(**item))
            except Exception as e:
                logger.warning(f"Error loading {json_file}: {e}")

        logger.info(f"📂 Loaded {len(verses)} verses from cache ({cache_dir})")
        return verses

    def close(self) -> None:
        """Release resources."""

    def __enter__(self) -> BibleSource:
        return self

    def __exit__(self, *args: object) -> None:
        self.close()


# ─── bible-api.com Implementation ────────────────────────────────────────────


class BibleApiComSource(BibleSource):
    """Fetches Bible data from bible-api.com (supports KJV, ASV, RVA, etc.)."""

    def __init__(self, translation_id: str, config: ExtractConfig | None = None) -> None:
        super().__init__(translation_id, config)
        self.client = httpx.Client(
            base_url=self.config.api_base_url,
            timeout=self.config.request_timeout,
        )
        self._request_count = 0

    def close(self) -> None:
        self.client.close()

    def fetch_chapter(self, book_name: str, chapter: int) -> list[RawVerse]:
        """Fetch a single chapter from bible-api.com with retry logic."""
        reference = f"{book_name} {chapter}"
        url = f"/{reference}"
        params = {"translation": self.translation_id}

        # Look up book_id from catalog
        book_id = ""
        for book in BOOK_CATALOG:
            if book["name"] == book_name:
                book_id = book["id"]
                break

        for attempt in range(1, self.config.max_retries + 1):
            try:
                if self._request_count > 0:
                    time.sleep(self.config.rate_limit_delay)

                response = self.client.get(url, params=params)
                self._request_count += 1

                if response.status_code == 200:
                    data = response.json()
                    raw_verses = data.get("verses", [])
                    verses: list[RawVerse] = []
                    for v in raw_verses:
                        try:
                            verse = RawVerse(
                                book_id=book_id,
                                book_name=book_name,
                                chapter=v.get("chapter", chapter),
                                verse=v.get("verse", 0),
                                text=v.get("text", "").strip(),
                                translation_id=self.translation_id,
                                language=self.translation.language,
                            )
                            verses.append(verse)
                        except Exception as e:
                            logger.warning(f"Skipping invalid verse in {reference}: {e}")
                    return verses

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


# ─── A Bíblia Digital Implementation ─────────────────────────────────────────

# Book name → abbreviation used by abibliadigital.com.br
ABIBLIA_BOOK_ABBREVS: dict[str, str] = {
    "Genesis": "gn",
    "Exodus": "ex",
    "Leviticus": "lv",
    "Numbers": "nm",
    "Deuteronomy": "dt",
    "Joshua": "js",
    "Judges": "jz",
    "Ruth": "rt",
    "1 Samuel": "1sm",
    "2 Samuel": "2sm",
    "1 Kings": "1rs",
    "2 Kings": "2rs",
    "1 Chronicles": "1cr",
    "2 Chronicles": "2cr",
    "Ezra": "ed",
    "Nehemiah": "ne",
    "Esther": "et",
    "Job": "job",
    "Psalms": "sl",
    "Proverbs": "pv",
    "Ecclesiastes": "ec",
    "Song of Solomon": "ct",
    "Isaiah": "is",
    "Jeremiah": "jr",
    "Lamentations": "lm",
    "Ezekiel": "ez",
    "Daniel": "dn",
    "Hosea": "os",
    "Joel": "jl",
    "Amos": "am",
    "Obadiah": "ob",
    "Jonah": "jn",
    "Micah": "mq",
    "Nahum": "na",
    "Habakkuk": "hc",
    "Zephaniah": "sf",
    "Haggai": "ag",
    "Zechariah": "zc",
    "Malachi": "ml",
    "Matthew": "mt",
    "Mark": "mc",
    "Luke": "lc",
    "John": "jo",
    "Acts": "at",
    "Romans": "rm",
    "1 Corinthians": "1co",
    "2 Corinthians": "2co",
    "Galatians": "gl",
    "Ephesians": "ef",
    "Philippians": "fp",
    "Colossians": "cl",
    "1 Thessalonians": "1ts",
    "2 Thessalonians": "2ts",
    "1 Timothy": "1tm",
    "2 Timothy": "2tm",
    "Titus": "tt",
    "Philemon": "fm",
    "Hebrews": "hb",
    "James": "tg",
    "1 Peter": "1pe",
    "2 Peter": "2pe",
    "1 John": "1jo",
    "2 John": "2jo",
    "3 John": "3jo",
    "Jude": "jd",
    "Revelation": "ap",
}


class ABibliaDigitalSource(BibleSource):
    """Fetches Bible data from abibliadigital.com.br (supports NVI, ARA, etc.)."""

    BASE_URL = "https://www.abibliadigital.com.br/api"

    def __init__(self, translation_id: str, config: ExtractConfig | None = None) -> None:
        super().__init__(translation_id, config)
        token = os.getenv("ABIBLIA_DIGITAL_TOKEN", "").strip()
        headers: dict[str, str] = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        self.client = httpx.Client(
            base_url=self.BASE_URL,
            timeout=self.config.request_timeout,
            headers=headers,
        )
        self._request_count = 0

    def close(self) -> None:
        self.client.close()

    def fetch_chapter(self, book_name: str, chapter: int) -> list[RawVerse]:
        """Fetch a single chapter from abibliadigital.com.br."""
        abbrev = ABIBLIA_BOOK_ABBREVS.get(book_name)
        if not abbrev:
            logger.warning(f"No abbreviation mapping for: {book_name}")
            return []

        # Look up book_id from catalog
        book_id = ""
        for book in BOOK_CATALOG:
            if book["name"] == book_name:
                book_id = book["id"]
                break

        url = f"/verses/{self.translation_id}/{abbrev}/{chapter}"

        for attempt in range(1, self.config.max_retries + 1):
            try:
                if self._request_count > 0:
                    time.sleep(self.config.rate_limit_delay)

                response = self.client.get(url)
                self._request_count += 1

                if response.status_code == 200:
                    data = response.json()
                    raw_verses = data.get("verses", [])
                    verses: list[RawVerse] = []
                    for v in raw_verses:
                        try:
                            verse = RawVerse(
                                book_id=book_id,
                                book_name=book_name,
                                chapter=v.get("chapter", chapter),
                                verse=v.get("number", 0),
                                text=v.get("text", "").strip(),
                                translation_id=self.translation_id,
                                language=self.translation.language,
                            )
                            verses.append(verse)
                        except Exception as e:
                            logger.warning(f"Skipping invalid verse in {book_name} {chapter}: {e}")
                    return verses

                if response.status_code == 404:
                    logger.warning(
                        f"Chapter not found: {book_name} {chapter} ({self.translation_id})"
                    )
                    return []
                if response.status_code == 429:
                    wait = self.config.retry_delay * attempt * 2
                    logger.warning(f"Rate limited. Waiting {wait}s...")
                    time.sleep(wait)
                else:
                    response.raise_for_status()

            except httpx.TimeoutException:
                logger.warning(
                    f"Timeout fetching {book_name} {chapter} "
                    f"(attempt {attempt}/{self.config.max_retries})"
                )
                time.sleep(self.config.retry_delay * attempt)
            except httpx.HTTPError as e:
                logger.error(f"HTTP error fetching {book_name} {chapter}: {e}")
                if attempt == self.config.max_retries:
                    raise

        return []


# ─── Zefania XML Implementation ─────────────────────────────────────────────

# Maps translation_id → XML file path relative to data/raw/
ZEFANIA_XML_FILES: dict[str, str] = {
    "neue": "gerneue/SF_2025-12-07_GER_GERNEUE_(NEUE EVANGELISTISCHE ÜBERSETZUNG).xml",
}

# Map BOOK_CATALOG position (1-based) to book_id
_BOOK_NUM_TO_ID: dict[int, tuple[str, str]] = {
    i + 1: (b["id"], b["name"]) for i, b in enumerate(BOOK_CATALOG)
}


class ZefaniaXMLSource(BibleSource):
    """Reads Bible data from a local Zefania XML file (no API calls)."""

    def __init__(self, translation_id: str, config: ExtractConfig | None = None) -> None:
        super().__init__(translation_id, config)
        rel_path = ZEFANIA_XML_FILES.get(translation_id, "")
        self.xml_path = Path("data/raw") / rel_path
        self._parsed: dict[str, dict[int, list[RawVerse]]] | None = None

    def close(self) -> None:
        self._parsed = None

    def _parse_xml(self) -> dict[str, dict[int, list[RawVerse]]]:
        """Parse the entire XML file into {book_name: {chapter: [verses]}}."""
        if self._parsed is not None:
            return self._parsed

        if not self.xml_path.exists():
            raise FileNotFoundError(f"Zefania XML not found: {self.xml_path}")

        tree = ET.parse(self.xml_path)  # noqa: S314
        root = tree.getroot()

        result: dict[str, dict[int, list[RawVerse]]] = {}

        for biblebook in root.findall(".//BIBLEBOOK"):
            bnumber = int(biblebook.get("bnumber", "0"))
            if bnumber not in _BOOK_NUM_TO_ID:
                continue
            book_id, book_name = _BOOK_NUM_TO_ID[bnumber]

            chapters: dict[int, list[RawVerse]] = {}
            for chapter_el in biblebook.findall("CHAPTER"):
                ch_num = int(chapter_el.get("cnumber", "0"))
                verses: list[RawVerse] = []

                for vers_el in chapter_el.findall("VERS"):
                    v_num = int(vers_el.get("vnumber", "0"))
                    # Get all text content (including nested elements)
                    text = "".join(vers_el.itertext()).strip()
                    if not text:
                        continue
                    verses.append(
                        RawVerse(
                            book_id=book_id,
                            book_name=book_name,
                            chapter=ch_num,
                            verse=v_num,
                            text=text,
                            translation_id=self.translation_id,
                            language=self.translation.language,
                        )
                    )

                chapters[ch_num] = sorted(verses, key=lambda v: v.verse)

            result[book_name] = chapters

        self._parsed = result
        total = sum(len(v) for chs in result.values() for v in chs.values())
        logger.info(f"📖 Parsed {total} verses from Zefania XML: {self.xml_path.name}")
        return result

    def fetch_chapter(self, book_name: str, chapter: int) -> list[RawVerse]:
        """Return verses for a single chapter from the parsed XML."""
        data = self._parse_xml()
        return data.get(book_name, {}).get(chapter, [])

    def fetch_all(
        self,
        output_dir: Path | None = None,
        books: list[str] | None = None,
    ) -> list[RawVerse]:
        """Override fetch_all for instant local loading (no per-chapter API calls)."""
        data = self._parse_xml()
        catalog = BOOK_CATALOG
        if books:
            catalog = [b for b in catalog if b["id"] in books]

        all_verses: list[RawVerse] = []
        for book in catalog:
            book_name = book["name"]
            book_id = book["id"]
            chapters = data.get(book_name, {})
            book_verses: list[RawVerse] = []
            for _ch_num, ch_verses in sorted(chapters.items()):
                book_verses.extend(ch_verses)

            all_verses.extend(book_verses)

            if output_dir:
                output_dir.mkdir(parents=True, exist_ok=True)
                book_file = output_dir / f"{book_id.lower()}.json"
                book_file.write_text(
                    json.dumps(
                        [v.model_dump() for v in book_verses],
                        indent=2,
                        ensure_ascii=False,
                    ),
                    encoding="utf-8",
                )

        logger.info(f"📂 Loaded {len(all_verses)} verses from Zefania XML ({self.translation_id})")
        return all_verses


# ─── Pre-cached Implementation ────────────────────────────────────────────────


class PreCachedSource(BibleSource):
    """Cache-only source for translations whose JSON files already exist.

    Used for translations originally fetched from APIs that have since been
    removed (e.g., Luther 1912 from BibleSuperSearch). No network calls —
    load_from_cache() in the base class handles everything.
    """

    def fetch_chapter(self, book_name: str, chapter: int) -> list[RawVerse]:
        """Not supported — data must come from the existing JSON cache."""
        logger.warning(
            f"PreCachedSource ({self.translation_id}) has no API to fetch "
            f"{book_name} {chapter}. Skipping."
        )
        return []

    def fetch_all(
        self,
        output_dir: Path | None = None,
        books: list[str] | None = None,
    ) -> list[RawVerse]:
        """Override: skip missing books instead of trying to fetch them."""
        if books:
            logger.warning(
                f"PreCachedSource ({self.translation_id}) cannot fetch missing "
                f"books {books} — no API available. Skipping."
            )
        return []

    def close(self) -> None:
        pass


# ─── Factory ──────────────────────────────────────────────────────────────────


def create_source(
    translation_id: str,
    config: ExtractConfig | None = None,
) -> BibleSource:
    """Create the appropriate BibleSource for a translation ID."""
    tid = translation_id.lower()

    if tid in BIBLE_API_COM_TRANSLATIONS:
        return BibleApiComSource(tid, config)
    if tid in ABIBLIA_DIGITAL_TRANSLATIONS:
        return ABibliaDigitalSource(tid, config)
    if tid in ZEFANIA_XML_TRANSLATIONS:
        return ZefaniaXMLSource(tid, config)
    if tid in PRE_CACHED_TRANSLATIONS:
        return PreCachedSource(tid, config)
    available = ", ".join(
        sorted(
            BIBLE_API_COM_TRANSLATIONS
            | ABIBLIA_DIGITAL_TRANSLATIONS
            | ZEFANIA_XML_TRANSLATIONS
            | PRE_CACHED_TRANSLATIONS
        )
    )
    raise ValueError(f"Unknown translation '{translation_id}'. Available: {available}")
