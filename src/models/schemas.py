"""
📦 Data Models & Schemas
Pydantic models for data validation across the pipeline.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, computed_field, field_validator


class Testament(str, Enum):
    OLD = "Old Testament"
    NEW = "New Testament"


class BookCategory(str, Enum):
    LAW = "Law"
    HISTORY = "History"
    POETRY = "Poetry"
    MAJOR_PROPHETS = "Major Prophets"
    MINOR_PROPHETS = "Minor Prophets"
    GOSPELS = "Gospels"
    ACTS = "Acts"
    PAULINE_EPISTLES = "Pauline Epistles"
    GENERAL_EPISTLES = "General Epistles"
    APOCALYPTIC = "Apocalyptic"


class RawVerse(BaseModel):
    """Raw verse as extracted from the API source."""

    book_id: str = Field(..., description="Short book identifier (e.g., 'GEN', 'REV')")
    book_name: str = Field(..., description="Full book name (e.g., 'Genesis')")
    chapter: int = Field(..., ge=1)
    verse: int = Field(..., ge=1)
    text: str = Field(..., min_length=1)
    translation_id: str = Field("kjv", description="Translation identifier (e.g., 'kjv', 'nvi')")
    language: str = Field("en", description="Language code (e.g., 'en', 'pt-br', 'es')")

    @computed_field
    @property
    def verse_id(self) -> str:
        return f"{self.book_id}.{self.chapter}.{self.verse}"

    @computed_field
    @property
    def reference(self) -> str:
        return f"{self.book_name} {self.chapter}:{self.verse}"


class BookMetadata(BaseModel):
    """Metadata for a Biblical book."""

    book_id: str
    book_name: str
    testament: Testament
    category: BookCategory
    position: int = Field(..., ge=1, le=66)
    chapters: int = Field(..., ge=1)
    verses_count: int = Field(..., ge=0)


class Translation(BaseModel):
    """A Bible translation/version."""

    translation_id: str = Field(..., description="Short identifier (e.g., 'kjv', 'nvi')")
    language: str = Field(..., description="Language code (e.g., 'en', 'pt-br')")
    name: str = Field(..., description="Short name (e.g., 'King James Version')")
    full_name: str | None = None
    year: int | None = None
    license: str | None = None
    source_api: str = Field(..., description="API source (e.g., 'bible-api.com')")


class EnrichedVerse(BaseModel):
    """Verse enriched with analytical features."""

    book_id: str
    book_name: str
    chapter: int
    verse: int
    text: str
    reference: str
    translation_id: str = "kjv"
    language: str = "en"
    verse_id: str = ""

    # Structural
    testament: str
    category: str
    book_position: int

    # Text metrics
    word_count: int = Field(..., ge=0)
    char_count: int = Field(..., ge=0)
    avg_word_length: float = Field(..., ge=0)

    # NLP features
    sentiment_polarity: float = Field(..., ge=-1.0, le=1.0)
    sentiment_subjectivity: float = Field(..., ge=0.0, le=1.0)
    sentiment_label: str


class PipelineMetrics(BaseModel):
    """Metrics collected during a pipeline run."""

    run_id: str
    started_at: datetime
    completed_at: datetime | None = None
    status: str = "running"

    total_books: int = 0
    total_chapters: int = 0
    total_verses_extracted: int = 0
    total_verses_transformed: int = 0
    total_verses_loaded: int = 0
    total_crossrefs_loaded: int = 0
    translations_processed: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)

    @computed_field
    @property
    def duration_seconds(self) -> float | None:
        if self.completed_at and self.started_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None

    @computed_field
    @property
    def success_rate(self) -> float:
        if self.total_verses_extracted == 0:
            return 0.0
        return self.total_verses_loaded / self.total_verses_extracted


# ─── Cross-References ────────────────────────────────────────────────────────


class RawCrossReference(BaseModel):
    """Raw cross-reference pair as extracted from OpenBible data."""

    source_verse_id: str = Field(..., description="Source verse (e.g., 'GEN.1.1')")
    target_verse_id: str = Field(..., description="Target verse (e.g., 'JHN.1.1')")
    votes: int = Field(1, description="Confidence votes from OpenBible (can be negative)")


class CrossReference(BaseModel):
    """Enriched cross-reference with book metadata for arc diagram."""

    source_verse_id: str
    target_verse_id: str
    source_book_id: str
    target_book_id: str
    source_book_position: int = Field(..., ge=1, le=66)
    target_book_position: int = Field(..., ge=1, le=66)
    votes: int = Field(1)
    reference_type: str = Field("general", description="direct, thematic, or prophetic")

    @computed_field
    @property
    def arc_distance(self) -> int:
        return abs(self.target_book_position - self.source_book_position)


class CrossRefStats(BaseModel):
    """Aggregated statistics for cross-references."""

    total_refs: int = 0
    unique_book_pairs: int = 0
    avg_arc_distance: float = 0.0
    max_arc_distance: int = 0
    refs_old_to_new: int = 0
    refs_within_old: int = 0
    refs_within_new: int = 0


# ─── Strong's lexicon ────────────────────────────────────────────────────────


class StrongsLanguage(str, Enum):
    HEBREW = "hebrew"
    GREEK = "greek"


class StrongsEntry(BaseModel):
    """A single Strong's lexicon entry — Hebrew or Greek.

    Normalised across sources so downstream code only sees the canonical form:
    - `strongs_id` always starts with `H` or `G`, followed by the number with
      NO zero-padding (e.g. "H25", not "H0025").
    - `language` matches the prefix letter (`H` → hebrew, `G` → greek).
    """

    strongs_id: str
    language: StrongsLanguage
    original: str  # "חֶסֶד" / "ἀγαπάω"
    transliteration: str  # "chesed", "agapao"
    pronunciation: str | None = None
    short_definition: str
    long_definition: str | None = None
    part_of_speech: str | None = None

    @field_validator("strongs_id")
    @classmethod
    def validate_strongs_id(cls, v: str) -> str:
        if not v or len(v) < 2:
            raise ValueError(f"Invalid Strong's ID: {v!r}")
        prefix, number = v[0], v[1:]
        if prefix not in ("H", "G"):
            raise ValueError(f"Strong's ID must start with H or G, got {v!r}")
        if not number.isdigit():
            raise ValueError(f"Strong's ID body must be digits, got {v!r}")
        # Normalise zero-padding: H0025 -> H25
        return f"{prefix}{int(number)}"


# ─── Book catalog (canonical order) ───────────────────────────────────────────

BOOK_CATALOG: list[dict] = [
    # Old Testament — Law (Torah/Pentateuch)
    {"id": "GEN", "name": "Genesis", "testament": "Old Testament", "category": "Law", "pos": 1},
    {"id": "EXO", "name": "Exodus", "testament": "Old Testament", "category": "Law", "pos": 2},
    {"id": "LEV", "name": "Leviticus", "testament": "Old Testament", "category": "Law", "pos": 3},
    {"id": "NUM", "name": "Numbers", "testament": "Old Testament", "category": "Law", "pos": 4},
    {"id": "DEU", "name": "Deuteronomy", "testament": "Old Testament", "category": "Law", "pos": 5},
    # Old Testament — History
    {"id": "JOS", "name": "Joshua", "testament": "Old Testament", "category": "History", "pos": 6},
    {"id": "JDG", "name": "Judges", "testament": "Old Testament", "category": "History", "pos": 7},
    {"id": "RUT", "name": "Ruth", "testament": "Old Testament", "category": "History", "pos": 8},
    {
        "id": "1SA",
        "name": "1 Samuel",
        "testament": "Old Testament",
        "category": "History",
        "pos": 9,
    },
    {
        "id": "2SA",
        "name": "2 Samuel",
        "testament": "Old Testament",
        "category": "History",
        "pos": 10,
    },
    {
        "id": "1KI",
        "name": "1 Kings",
        "testament": "Old Testament",
        "category": "History",
        "pos": 11,
    },
    {
        "id": "2KI",
        "name": "2 Kings",
        "testament": "Old Testament",
        "category": "History",
        "pos": 12,
    },
    {
        "id": "1CH",
        "name": "1 Chronicles",
        "testament": "Old Testament",
        "category": "History",
        "pos": 13,
    },
    {
        "id": "2CH",
        "name": "2 Chronicles",
        "testament": "Old Testament",
        "category": "History",
        "pos": 14,
    },
    {"id": "EZR", "name": "Ezra", "testament": "Old Testament", "category": "History", "pos": 15},
    {
        "id": "NEH",
        "name": "Nehemiah",
        "testament": "Old Testament",
        "category": "History",
        "pos": 16,
    },
    {"id": "EST", "name": "Esther", "testament": "Old Testament", "category": "History", "pos": 17},
    # Old Testament — Poetry/Wisdom
    {"id": "JOB", "name": "Job", "testament": "Old Testament", "category": "Poetry", "pos": 18},
    {"id": "PSA", "name": "Psalms", "testament": "Old Testament", "category": "Poetry", "pos": 19},
    {
        "id": "PRO",
        "name": "Proverbs",
        "testament": "Old Testament",
        "category": "Poetry",
        "pos": 20,
    },
    {
        "id": "ECC",
        "name": "Ecclesiastes",
        "testament": "Old Testament",
        "category": "Poetry",
        "pos": 21,
    },
    {
        "id": "SNG",
        "name": "Song of Solomon",
        "testament": "Old Testament",
        "category": "Poetry",
        "pos": 22,
    },
    # Old Testament — Major Prophets
    {
        "id": "ISA",
        "name": "Isaiah",
        "testament": "Old Testament",
        "category": "Major Prophets",
        "pos": 23,
    },
    {
        "id": "JER",
        "name": "Jeremiah",
        "testament": "Old Testament",
        "category": "Major Prophets",
        "pos": 24,
    },
    {
        "id": "LAM",
        "name": "Lamentations",
        "testament": "Old Testament",
        "category": "Major Prophets",
        "pos": 25,
    },
    {
        "id": "EZK",
        "name": "Ezekiel",
        "testament": "Old Testament",
        "category": "Major Prophets",
        "pos": 26,
    },
    {
        "id": "DAN",
        "name": "Daniel",
        "testament": "Old Testament",
        "category": "Major Prophets",
        "pos": 27,
    },
    # Old Testament — Minor Prophets
    {
        "id": "HOS",
        "name": "Hosea",
        "testament": "Old Testament",
        "category": "Minor Prophets",
        "pos": 28,
    },
    {
        "id": "JOL",
        "name": "Joel",
        "testament": "Old Testament",
        "category": "Minor Prophets",
        "pos": 29,
    },
    {
        "id": "AMO",
        "name": "Amos",
        "testament": "Old Testament",
        "category": "Minor Prophets",
        "pos": 30,
    },
    {
        "id": "OBA",
        "name": "Obadiah",
        "testament": "Old Testament",
        "category": "Minor Prophets",
        "pos": 31,
    },
    {
        "id": "JON",
        "name": "Jonah",
        "testament": "Old Testament",
        "category": "Minor Prophets",
        "pos": 32,
    },
    {
        "id": "MIC",
        "name": "Micah",
        "testament": "Old Testament",
        "category": "Minor Prophets",
        "pos": 33,
    },
    {
        "id": "NAM",
        "name": "Nahum",
        "testament": "Old Testament",
        "category": "Minor Prophets",
        "pos": 34,
    },
    {
        "id": "HAB",
        "name": "Habakkuk",
        "testament": "Old Testament",
        "category": "Minor Prophets",
        "pos": 35,
    },
    {
        "id": "ZEP",
        "name": "Zephaniah",
        "testament": "Old Testament",
        "category": "Minor Prophets",
        "pos": 36,
    },
    {
        "id": "HAG",
        "name": "Haggai",
        "testament": "Old Testament",
        "category": "Minor Prophets",
        "pos": 37,
    },
    {
        "id": "ZEC",
        "name": "Zechariah",
        "testament": "Old Testament",
        "category": "Minor Prophets",
        "pos": 38,
    },
    {
        "id": "MAL",
        "name": "Malachi",
        "testament": "Old Testament",
        "category": "Minor Prophets",
        "pos": 39,
    },
    # New Testament — Gospels
    {
        "id": "MAT",
        "name": "Matthew",
        "testament": "New Testament",
        "category": "Gospels",
        "pos": 40,
    },
    {"id": "MRK", "name": "Mark", "testament": "New Testament", "category": "Gospels", "pos": 41},
    {"id": "LUK", "name": "Luke", "testament": "New Testament", "category": "Gospels", "pos": 42},
    {"id": "JHN", "name": "John", "testament": "New Testament", "category": "Gospels", "pos": 43},
    # New Testament — Acts
    {"id": "ACT", "name": "Acts", "testament": "New Testament", "category": "Acts", "pos": 44},
    # New Testament — Pauline Epistles
    {
        "id": "ROM",
        "name": "Romans",
        "testament": "New Testament",
        "category": "Pauline Epistles",
        "pos": 45,
    },
    {
        "id": "1CO",
        "name": "1 Corinthians",
        "testament": "New Testament",
        "category": "Pauline Epistles",
        "pos": 46,
    },
    {
        "id": "2CO",
        "name": "2 Corinthians",
        "testament": "New Testament",
        "category": "Pauline Epistles",
        "pos": 47,
    },
    {
        "id": "GAL",
        "name": "Galatians",
        "testament": "New Testament",
        "category": "Pauline Epistles",
        "pos": 48,
    },
    {
        "id": "EPH",
        "name": "Ephesians",
        "testament": "New Testament",
        "category": "Pauline Epistles",
        "pos": 49,
    },
    {
        "id": "PHP",
        "name": "Philippians",
        "testament": "New Testament",
        "category": "Pauline Epistles",
        "pos": 50,
    },
    {
        "id": "COL",
        "name": "Colossians",
        "testament": "New Testament",
        "category": "Pauline Epistles",
        "pos": 51,
    },
    {
        "id": "1TH",
        "name": "1 Thessalonians",
        "testament": "New Testament",
        "category": "Pauline Epistles",
        "pos": 52,
    },
    {
        "id": "2TH",
        "name": "2 Thessalonians",
        "testament": "New Testament",
        "category": "Pauline Epistles",
        "pos": 53,
    },
    {
        "id": "1TI",
        "name": "1 Timothy",
        "testament": "New Testament",
        "category": "Pauline Epistles",
        "pos": 54,
    },
    {
        "id": "2TI",
        "name": "2 Timothy",
        "testament": "New Testament",
        "category": "Pauline Epistles",
        "pos": 55,
    },
    {
        "id": "TIT",
        "name": "Titus",
        "testament": "New Testament",
        "category": "Pauline Epistles",
        "pos": 56,
    },
    {
        "id": "PHM",
        "name": "Philemon",
        "testament": "New Testament",
        "category": "Pauline Epistles",
        "pos": 57,
    },
    # New Testament — General Epistles
    {
        "id": "HEB",
        "name": "Hebrews",
        "testament": "New Testament",
        "category": "General Epistles",
        "pos": 58,
    },
    {
        "id": "JAS",
        "name": "James",
        "testament": "New Testament",
        "category": "General Epistles",
        "pos": 59,
    },
    {
        "id": "1PE",
        "name": "1 Peter",
        "testament": "New Testament",
        "category": "General Epistles",
        "pos": 60,
    },
    {
        "id": "2PE",
        "name": "2 Peter",
        "testament": "New Testament",
        "category": "General Epistles",
        "pos": 61,
    },
    {
        "id": "1JN",
        "name": "1 John",
        "testament": "New Testament",
        "category": "General Epistles",
        "pos": 62,
    },
    {
        "id": "2JN",
        "name": "2 John",
        "testament": "New Testament",
        "category": "General Epistles",
        "pos": 63,
    },
    {
        "id": "3JN",
        "name": "3 John",
        "testament": "New Testament",
        "category": "General Epistles",
        "pos": 64,
    },
    {
        "id": "JUD",
        "name": "Jude",
        "testament": "New Testament",
        "category": "General Epistles",
        "pos": 65,
    },
    # New Testament — Apocalyptic
    {
        "id": "REV",
        "name": "Revelation",
        "testament": "New Testament",
        "category": "Apocalyptic",
        "pos": 66,
    },
]
