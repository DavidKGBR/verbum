"""
📚 Extract — Nave's Topical Bible

Downloads the Nave's Topical Bible data from JustVerses.com (public domain).
Parses ~4,700 topics and ~215K verse cross-references from tab-separated files.

The ZIP contains:
  - topics.txt:    topic_key \\t topic_name \\t source_topic_key
  - topicxref.txt: topic_key \\t cat_key \\t sub_key \\t book_num \\t chapter \\t verse \\t ref_text

We produce two structures:
  - Topics: id, name, slug, verse_count
  - TopicVerses: topic_id, verse_id, sort_order
"""

from __future__ import annotations

import logging
import re
import zipfile
from pathlib import Path

import httpx

from src.models.schemas import BOOK_CATALOG

logger = logging.getLogger(__name__)

NAVE_ZIP_URL = "http://www.justverses.com/downloads/zips/nave.zip"

# Build book_number (1-66) → book_id mapping from BOOK_CATALOG
_BOOK_NUM_TO_ID: dict[int, str] = {b["pos"]: b["id"] for b in BOOK_CATALOG}


def _slugify(name: str) -> str:
    """Convert topic name to a URL-safe slug."""
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"[\s-]+", "-", s)
    return s.strip("-")[:80]


class NaveTopic:
    """A single Nave's topic."""

    __slots__ = ("topic_key", "name", "slug", "verse_count")

    def __init__(self, topic_key: str, name: str, slug: str, verse_count: int = 0) -> None:
        self.topic_key = topic_key
        self.name = name
        self.slug = slug
        self.verse_count = verse_count


class NaveTopicVerse:
    """A single topic → verse link."""

    __slots__ = ("topic_key", "verse_id", "sort_order")

    def __init__(self, topic_key: str, verse_id: str, sort_order: int) -> None:
        self.topic_key = topic_key
        self.verse_id = verse_id
        self.sort_order = sort_order


class NavesExtractor:
    """Download + parse the Nave's Topical Bible ZIP from JustVerses.com."""

    def __init__(
        self,
        cache_dir: Path | None = None,
        timeout: float = 120.0,
    ) -> None:
        self.cache_dir = cache_dir or Path("data/raw/naves")
        self.timeout = timeout

    def extract(self, use_cache: bool = True) -> tuple[list[NaveTopic], list[NaveTopicVerse]]:
        """Return (topics, topic_verses)."""
        self._ensure_extracted(use_cache)

        topics = self._parse_topics()
        topic_verses = self._parse_topicxref()

        # Compute verse_count per topic
        counts: dict[str, int] = {}
        for tv in topic_verses:
            counts[tv.topic_key] = counts.get(tv.topic_key, 0) + 1
        for t in topics:
            t.verse_count = counts.get(t.topic_key, 0)

        logger.info(
            "Extracted %d topics and %d topic-verse links",
            len(topics),
            len(topic_verses),
        )
        return topics, topic_verses

    def _parse_topics(self) -> list[NaveTopic]:
        """Parse topics.txt → list of NaveTopic."""
        path = self.cache_dir / "topics.txt"
        topics: list[NaveTopic] = []
        seen_keys: set[str] = set()

        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            parts = line.strip().split("\t")
            if len(parts) < 2:
                continue
            topic_key = parts[0].strip()
            name = parts[1].strip()
            if not topic_key or not name:
                continue
            if topic_key in seen_keys:
                continue
            seen_keys.add(topic_key)

            slug = _slugify(name)
            if not slug:
                continue

            topics.append(NaveTopic(topic_key=topic_key, name=name, slug=slug))

        logger.info("Parsed %d topics from topics.txt", len(topics))
        return topics

    def _parse_topicxref(self) -> list[NaveTopicVerse]:
        """Parse topicxref.txt → list of NaveTopicVerse."""
        path = self.cache_dir / "topicxref.txt"
        verses: list[NaveTopicVerse] = []
        seen: set[tuple[str, str]] = set()
        sort_counter: dict[str, int] = {}

        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            parts = line.strip().split("\t")
            if len(parts) < 6:
                continue

            topic_key = parts[0].strip()
            try:
                book_num = int(parts[3])
                chapter = int(parts[4])
                verse = int(parts[5])
            except (ValueError, IndexError):
                continue

            book_id = _BOOK_NUM_TO_ID.get(book_num)
            if not book_id:
                continue

            verse_id = f"{book_id}.{chapter}.{verse}"
            key = (topic_key, verse_id)
            if key in seen:
                continue
            seen.add(key)

            sort_counter[topic_key] = sort_counter.get(topic_key, 0) + 1
            verses.append(
                NaveTopicVerse(
                    topic_key=topic_key,
                    verse_id=verse_id,
                    sort_order=sort_counter[topic_key],
                )
            )

        logger.info("Parsed %d topic-verse links from topicxref.txt", len(verses))
        return verses

    def _ensure_extracted(self, use_cache: bool) -> None:
        """Download and extract the ZIP if not already cached."""
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        topics_path = self.cache_dir / "topics.txt"
        xref_path = self.cache_dir / "topicxref.txt"

        if use_cache and topics_path.exists() and xref_path.exists():
            logger.debug("Using cached Nave's files in %s", self.cache_dir)
            return

        zip_path = self.cache_dir / "nave.zip"
        if not zip_path.exists() or not use_cache:
            logger.info("Downloading %s", NAVE_ZIP_URL)
            with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
                resp = client.get(NAVE_ZIP_URL)
                resp.raise_for_status()
                zip_path.write_bytes(resp.content)

        logger.info("Extracting %s", zip_path)
        with zipfile.ZipFile(zip_path, "r") as zf:
            for name in zf.namelist():
                if name in ("topics.txt", "categories.txt", "subtopics.txt", "topicxref.txt"):
                    zf.extract(name, self.cache_dir)

        logger.info("Nave's files extracted to %s", self.cache_dir)
