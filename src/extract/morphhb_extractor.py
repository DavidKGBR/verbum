"""
📜 Extract — Hebrew Bible (Westminster Leningrad Codex)

Downloads and parses the OSIS XML files from the openscriptures/morphhb
repository (a.k.a. MorphHB / OSHB). One file per biblical book, 39 books
covering the Hebrew OT.

Each file is a single-namespace OSIS document. We extract verse-level
Hebrew text only — the per-word morphology (`lemma`, `morph`, word IDs)
is preserved in the XML but consumed by the interlinear extractor in
task #3d, not here.
"""

from __future__ import annotations

import logging
from collections.abc import Iterable
from pathlib import Path
from xml.etree import ElementTree as ET

import defusedxml.ElementTree as DefusedET
import httpx

from src.models.schemas import OriginalText, OriginalTextLanguage

logger = logging.getLogger(__name__)

MORPHHB_BASE_URL = "https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc"
SOURCE_ID = "wlc"  # source marker persisted on every row
OSIS_NAMESPACE = "http://www.bibletechnologies.net/2003/OSIS/namespace"
NS = {"osis": OSIS_NAMESPACE}

# Elements whose textual content must NOT leak into the verse body.
_SKIP_TAGS = frozenset({"note", "reference", "milestone"})

# openscriptures/morphhb OSIS book abbreviations → our canonical 3-letter IDs.
# Mirrors 39 of the 66 entries from crossref_extractor._OPENBIBLE_TO_BOOK_ID
# (OT only). When a third consumer shows up we'll promote this to a shared
# helper module.
_OSIS_TO_BOOK_ID: dict[str, str] = {
    "Gen": "GEN",
    "Exod": "EXO",
    "Lev": "LEV",
    "Num": "NUM",
    "Deut": "DEU",
    "Josh": "JOS",
    "Judg": "JDG",
    "Ruth": "RUT",
    "1Sam": "1SA",
    "2Sam": "2SA",
    "1Kgs": "1KI",
    "2Kgs": "2KI",
    "1Chr": "1CH",
    "2Chr": "2CH",
    "Ezra": "EZR",
    "Neh": "NEH",
    "Esth": "EST",
    "Job": "JOB",
    "Ps": "PSA",
    "Prov": "PRO",
    "Eccl": "ECC",
    "Song": "SNG",
    "Isa": "ISA",
    "Jer": "JER",
    "Lam": "LAM",
    "Ezek": "EZK",
    "Dan": "DAN",
    "Hos": "HOS",
    "Joel": "JOL",
    "Amos": "AMO",
    "Obad": "OBA",
    "Jonah": "JON",
    "Mic": "MIC",
    "Nah": "NAM",
    "Hab": "HAB",
    "Zeph": "ZEP",
    "Hag": "HAG",
    "Zech": "ZEC",
    "Mal": "MAL",
}

# Reverse mapping for the --book flag: allow users to pass "GEN" and resolve
# the source filename.
_BOOK_ID_TO_OSIS: dict[str, str] = {v: k for k, v in _OSIS_TO_BOOK_ID.items()}

ALL_OSIS_BOOKS: tuple[str, ...] = tuple(_OSIS_TO_BOOK_ID.keys())


class MorphHbExtractor:
    """Download + parse MorphHB OSIS XML into `OriginalText` verses."""

    def __init__(self, cache_dir: Path | None = None, timeout: float = 60.0) -> None:
        self.cache_dir = cache_dir or Path("data/raw/morphhb")
        self.timeout = timeout

    # ─── Public API ──────────────────────────────────────────────────────────

    def extract(
        self,
        books: Iterable[str] | None = None,
        use_cache: bool = True,
    ) -> list[OriginalText]:
        """Extract verses for the given OSIS books (default: all 39).

        `books` may contain either OSIS names ("Gen", "Ps") or our canonical
        book IDs ("GEN", "PSA"). Unknown book names raise `ValueError` early
        so the user gets a clear error instead of a silent skip.
        """
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        resolved = self._resolve_books(books)
        results: list[OriginalText] = []

        for osis_book in resolved:
            raw = self._fetch_book(osis_book, use_cache)
            verses = list(self._parse_book(raw, osis_book))
            logger.info("Parsed %d verses from %s", len(verses), osis_book)
            results.extend(verses)

        logger.info(
            "Extracted %d Hebrew verses across %d books",
            len(results),
            len(resolved),
        )
        return results

    def _resolve_books(self, books: Iterable[str] | None) -> list[str]:
        """Translate a user-supplied book list into OSIS names."""
        if books is None:
            return list(ALL_OSIS_BOOKS)
        resolved: list[str] = []
        for b in books:
            if b in _OSIS_TO_BOOK_ID:
                resolved.append(b)
            elif b in _BOOK_ID_TO_OSIS:
                resolved.append(_BOOK_ID_TO_OSIS[b])
            else:
                raise ValueError(
                    f"Unknown book {b!r}. Use an OSIS name (Gen, Ps, ...) "
                    f"or canonical ID (GEN, PSA, ...)."
                )
        return resolved

    # ─── Download ────────────────────────────────────────────────────────────

    def _fetch_book(self, osis_book: str, use_cache: bool) -> str:
        cache_path = self.cache_dir / f"{osis_book}.xml"
        if use_cache and cache_path.exists():
            logger.debug("Using cached %s", cache_path.name)
            return cache_path.read_text(encoding="utf-8")

        url = f"{MORPHHB_BASE_URL}/{osis_book}.xml"
        logger.info("Downloading %s", url)
        with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
            response = client.get(url)
            response.raise_for_status()
            content = response.text

        cache_path.write_text(content, encoding="utf-8")
        return content

    # ─── Parse ───────────────────────────────────────────────────────────────

    def _parse_book(self, xml_str: str, osis_book: str) -> Iterable[OriginalText]:
        if osis_book not in _OSIS_TO_BOOK_ID:
            raise ValueError(f"Unknown OSIS book: {osis_book!r}")
        book_id = _OSIS_TO_BOOK_ID[osis_book]

        # defusedxml guards against billion-laughs / XXE attacks in the
        # upstream source. The element tree we get back is API-compatible
        # with the standard library's ElementTree.
        root = DefusedET.fromstring(xml_str)
        for verse_elem in root.iter(f"{{{OSIS_NAMESPACE}}}verse"):
            osis_id = verse_elem.get("osisID")
            if not osis_id:
                # OSIS marks both start-milestones and end-milestones — skip
                # anything without osisID so we only emit real verse bodies.
                continue
            parts = osis_id.split(".")
            if len(parts) != 3:
                continue
            _book, ch_str, vs_str = parts
            try:
                chapter = int(ch_str)
                verse = int(vs_str)
            except ValueError:
                continue

            text = _verse_text(verse_elem)
            if not text:
                continue

            yield OriginalText(
                verse_id=f"{book_id}.{chapter}.{verse}",
                book_id=book_id,
                chapter=chapter,
                verse=verse,
                language=OriginalTextLanguage.HEBREW,
                text=text,
                source=SOURCE_ID,
            )


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _localname(tag: str) -> str:
    """Return the local name of a possibly-namespaced XML tag."""
    if "}" in tag:
        return tag.split("}", 1)[1]
    return tag


def _verse_text(verse_elem: ET.Element) -> str:
    """Collect the Hebrew text from a `<verse>` element.

    Rules:
      * `<w>` elements carry whole-word text; collect joined with single spaces.
      * `<seg>` elements carry punctuation (maqqef ־, sof pasuq ׃). Append
        their text to the previous word WITHOUT a space — maqqef glues the
        two words into a phrase in the traditional pointing.
      * Skip `<note>`, `<reference>`, `<milestone>` — they're editorial.
      * Strip MorphHB morpheme separators (`/`) — they're a convention inside
        the lemma/text showing where prefixes split; unwanted for reading.
    """
    parts: list[str] = []
    for child in verse_elem:
        tag = _localname(child.tag)
        if tag in _SKIP_TAGS:
            continue
        if tag == "w":
            text = "".join(child.itertext())
            if text:
                parts.append(text)
        elif tag == "seg":
            text = "".join(child.itertext())
            if not text:
                continue
            if parts:
                parts[-1] = parts[-1] + text
            else:
                parts.append(text)
        # Unknown element types are ignored to stay forward-compatible.

    joined = " ".join(parts)
    joined = joined.replace("/", "")
    # Collapse incidental double spaces from the replace above.
    return " ".join(joined.split())
