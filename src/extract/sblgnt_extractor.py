"""
✝️ Extract — Greek New Testament (SBLGNT)

Downloads and parses the SBL Greek New Testament from the
`LogosBible/SBLGNT` repository. 27 custom-XML files, one per NT book.

SBLGNT is edited by Michael W. Holmes and published jointly by the
Society of Biblical Literature and Logos Bible Software. License
permits free personal / academic / open-source use with attribution;
commercial use is disallowed.

    SBL Greek New Testament (SBLGNT)
    Copyright © 2010 Society of Biblical Literature
    and Logos Bible Software. All rights reserved.
"""

from __future__ import annotations

import logging
from collections.abc import Iterable
from pathlib import Path
from xml.etree import ElementTree as ET  # noqa: F401  (for type annotations via defusedxml)

import defusedxml.ElementTree as DefusedET
import httpx

from src.models.schemas import OriginalText, OriginalTextLanguage

logger = logging.getLogger(__name__)

SBLGNT_BASE_URL = "https://raw.githubusercontent.com/LogosBible/SBLGNT/master/data/sblgnt/xml"
SOURCE_ID = "sblgnt"

# SBLGNT filename stem → our canonical 3-letter book ID. 27 NT books.
_SBLGNT_TO_BOOK_ID: dict[str, str] = {
    "Matt": "MAT",
    "Mark": "MRK",
    "Luke": "LUK",
    "John": "JHN",
    "Acts": "ACT",
    "Rom": "ROM",
    "1Cor": "1CO",
    "2Cor": "2CO",
    "Gal": "GAL",
    "Eph": "EPH",
    "Phil": "PHP",
    "Col": "COL",
    "1Thess": "1TH",
    "2Thess": "2TH",
    "1Tim": "1TI",
    "2Tim": "2TI",
    "Titus": "TIT",
    "Phlm": "PHM",
    "Heb": "HEB",
    "Jas": "JAS",
    "1Pet": "1PE",
    "2Pet": "2PE",
    "1John": "1JN",
    "2John": "2JN",
    "3John": "3JN",
    "Jude": "JUD",
    "Rev": "REV",
}

_BOOK_ID_TO_SBLGNT: dict[str, str] = {v: k for k, v in _SBLGNT_TO_BOOK_ID.items()}

ALL_SBLGNT_BOOKS: tuple[str, ...] = tuple(_SBLGNT_TO_BOOK_ID.keys())


class SblgntExtractor:
    """Download + parse SBLGNT custom-XML into `OriginalText` verses."""

    def __init__(self, cache_dir: Path | None = None, timeout: float = 60.0) -> None:
        self.cache_dir = cache_dir or Path("data/raw/sblgnt")
        self.timeout = timeout

    # ─── Public API ──────────────────────────────────────────────────────────

    def extract(
        self,
        books: Iterable[str] | None = None,
        use_cache: bool = True,
    ) -> list[OriginalText]:
        """Extract verses for the given books (default: all 27 NT books).

        `books` may contain SBLGNT stems ("Matt", "1Cor") or canonical IDs
        ("MAT", "1CO"). Unknown names raise `ValueError` early.
        """
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        resolved = self._resolve_books(books)
        results: list[OriginalText] = []

        for sblgnt_name in resolved:
            raw = self._fetch_book(sblgnt_name, use_cache)
            verses = list(self._parse_book(raw, sblgnt_name))
            logger.info("Parsed %d verses from %s", len(verses), sblgnt_name)
            results.extend(verses)

        logger.info(
            "Extracted %d Greek verses across %d books",
            len(results),
            len(resolved),
        )
        return results

    def _resolve_books(self, books: Iterable[str] | None) -> list[str]:
        if books is None:
            return list(ALL_SBLGNT_BOOKS)
        resolved: list[str] = []
        for b in books:
            if b in _SBLGNT_TO_BOOK_ID:
                resolved.append(b)
            elif b in _BOOK_ID_TO_SBLGNT:
                resolved.append(_BOOK_ID_TO_SBLGNT[b])
            else:
                raise ValueError(
                    f"Unknown book {b!r}. Use an SBLGNT name (Matt, 1Cor, ...) "
                    f"or canonical ID (MAT, 1CO, ...)."
                )
        return resolved

    # ─── Download ────────────────────────────────────────────────────────────

    def _fetch_book(self, sblgnt_name: str, use_cache: bool) -> str:
        cache_path = self.cache_dir / f"{sblgnt_name}.xml"
        if use_cache and cache_path.exists():
            logger.debug("Using cached %s", cache_path.name)
            return cache_path.read_text(encoding="utf-8")

        url = f"{SBLGNT_BASE_URL}/{sblgnt_name}.xml"
        logger.info("Downloading %s", url)
        with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
            response = client.get(url)
            response.raise_for_status()
            content = response.text

        cache_path.write_text(content, encoding="utf-8")
        return content

    # ─── Parse ───────────────────────────────────────────────────────────────

    def _parse_book(self, xml_str: str, sblgnt_name: str) -> Iterable[OriginalText]:
        if sblgnt_name not in _SBLGNT_TO_BOOK_ID:
            raise ValueError(f"Unknown SBLGNT book: {sblgnt_name!r}")
        book_id = _SBLGNT_TO_BOOK_ID[sblgnt_name]

        # defusedxml blocks XXE / billion-laughs attacks; API matches stdlib.
        root = DefusedET.fromstring(xml_str)

        chapter: int | None = None
        verse: int | None = None
        parts: list[str] = []

        def build(c: int, v: int, raw: list[str]) -> OriginalText | None:
            text = "".join(raw)
            # Collapse any weird whitespace runs
            text = " ".join(text.split())
            if not text:
                return None
            return OriginalText(
                verse_id=f"{book_id}.{c}.{v}",
                book_id=book_id,
                chapter=c,
                verse=v,
                language=OriginalTextLanguage.GREEK,
                text=text,
                source=SOURCE_ID,
            )

        for elem in root.iter():
            tag = elem.tag
            if tag == "verse-number":
                if chapter is not None and verse is not None and parts:
                    built = build(chapter, verse, parts)
                    if built:
                        yield built
                parts = []
                ref = (elem.get("id") or "").rsplit(" ", 1)[-1]
                try:
                    ch_str, vs_str = ref.split(":")
                    chapter, verse = int(ch_str), int(vs_str)
                except ValueError:
                    chapter = verse = None
            elif tag == "w":
                text = "".join(elem.itertext())
                if text:
                    parts.append(text)
            elif tag == "suffix":
                text = "".join(elem.itertext())
                # Real SBLGNT data uses empty <suffix/> elements as word
                # separators (relying on document-order whitespace in the
                # serialisation). We must substitute a single space when the
                # suffix is empty so words don't collapse into one glyph run.
                # Non-empty suffixes carry punctuation+space (", ", ". ") —
                # use verbatim. The whitespace collapse in `build()` removes
                # any incidental doubles.
                parts.append(text if text else " ")
            # <prefix>, <p>, <title>, <book>: ignored. <prefix> carries
            # critical-edition markers (⸀ ⸂ ⸃) that are unwanted for reading.

        # Flush last verse
        if chapter is not None and verse is not None and parts:
            built = build(chapter, verse, parts)
            if built:
                yield built
