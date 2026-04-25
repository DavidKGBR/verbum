"""
🔤 Extract — STEPBible Interlinear (TAGNT Greek NT + TAHOT Hebrew OT)

Downloads and parses the Translators' Amalgamated Greek and Hebrew files
from STEPBible/STEPBible-Data. These are the crown jewel of Phase 2:
per-word Strong's tagging, morphology, and — crucially — **semantic tags**
that disambiguate individuals and concepts (the differentiator vs. every
other open-source Bible dataset).

    Data created by www.STEPBible.org based on work at Tyndale House
    Cambridge. Licensed CC BY 4.0. Attribution required.
    See https://github.com/STEPBible/STEPBible-Data

Format (both TAGNT and TAHOT):
- Long header (~60-80 lines) with licence + field descriptions. Skipped.
- Per verse: `# Book.Ch.Vs` comment block, column header line, then one
  data row per word. Repeated to EOF.
- Data rows are tab-separated. First column is always
  `Book.Ch.Vs#NN=Source` (e.g. `Mat.1.1#01=NKO`).
- TAGNT columns differ from TAHOT — we use small per-format row parsers
  but share the outer state machine.
"""

from __future__ import annotations

import logging
import re
from collections.abc import Iterable
from pathlib import Path
from typing import Any
from urllib.parse import quote

import httpx

from src.models.schemas import InterlinearLanguage, InterlinearWord

logger = logging.getLogger(__name__)

_BASE_URL = (
    "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/"
    "Translators Amalgamated OT+NT"
)

# TAGNT (Greek NT) — 2 files
TAGNT_FILES: tuple[str, ...] = (
    "TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt",
    "TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt",
)

# TAHOT (Hebrew OT) — 4 files
TAHOT_FILES: tuple[str, ...] = (
    "TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
    "TAHOT Jos-Est - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
    "TAHOT Job-Sng - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
    "TAHOT Isa-Mal - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
)

# STEPBible book abbreviation → our canonical 3-letter ID.
_STEP_TO_BOOK_ID: dict[str, str] = {
    # OT
    "Gen": "GEN",
    "Exo": "EXO",
    "Lev": "LEV",
    "Num": "NUM",
    "Deu": "DEU",
    "Jos": "JOS",
    "Jdg": "JDG",
    "Rut": "RUT",
    "1Sa": "1SA",
    "2Sa": "2SA",
    "1Ki": "1KI",
    "2Ki": "2KI",
    "1Ch": "1CH",
    "2Ch": "2CH",
    "Ezr": "EZR",
    "Neh": "NEH",
    "Est": "EST",
    "Job": "JOB",
    "Psa": "PSA",
    "Pro": "PRO",
    "Ecc": "ECC",
    "Sng": "SNG",
    "Isa": "ISA",
    "Jer": "JER",
    "Lam": "LAM",
    "Eze": "EZK",
    "Dan": "DAN",
    "Hos": "HOS",
    "Jol": "JOL",
    "Amo": "AMO",
    "Oba": "OBA",
    "Jon": "JON",
    "Mic": "MIC",
    "Nah": "NAM",
    "Hab": "HAB",
    "Zep": "ZEP",
    "Hag": "HAG",
    "Zec": "ZEC",
    "Mal": "MAL",
    # NT
    "Mat": "MAT",
    "Mrk": "MRK",
    "Luk": "LUK",
    "Jhn": "JHN",
    "Act": "ACT",
    "Rom": "ROM",
    "1Co": "1CO",
    "2Co": "2CO",
    "Gal": "GAL",
    "Eph": "EPH",
    "Php": "PHP",
    "Col": "COL",
    "1Th": "1TH",
    "2Th": "2TH",
    "1Ti": "1TI",
    "2Ti": "2TI",
    "Tit": "TIT",
    "Phm": "PHM",
    "Heb": "HEB",
    "Jas": "JAS",
    "1Pe": "1PE",
    "2Pe": "2PE",
    "1Jn": "1JN",
    "2Jn": "2JN",
    "3Jn": "3JN",
    "Jud": "JUD",
    "Rev": "REV",
}

# Normaliser for Strong's IDs — pulls the first numeric-prefixed ID out of
# expressions like "H9002/H9009/{H0776G}" or "G0976=N-NSF" and strips
# leading zeros + trailing letter suffixes (homograph disambiguation).
_STRONGS_INSIDE_BRACES_RE = re.compile(r"\{([HG]\d+)")
_STRONGS_BARE_RE = re.compile(r"([HG])(\d+)")


def _normalize_strongs(raw: str) -> str | None:
    """Extract and normalise the primary Strong's ID from a STEPBible cell.

    Prefers the ID inside `{}` (the "real" root word, Strong's in the
    dictionary sense) over prefix morpheme IDs. Drops leading zeros and
    any trailing alpha suffix.
    """
    if not raw:
        return None
    # Prefer a {...}-wrapped Strong's (the root lemma)
    m = _STRONGS_INSIDE_BRACES_RE.search(raw)
    if m:
        return _strip_padding(m.group(1))
    # Fall back to the first plain Strong's
    m2 = _STRONGS_BARE_RE.search(raw)
    if m2:
        return f"{m2.group(1)}{int(m2.group(2))}"
    return None


def _strip_padding(prefix_and_number: str) -> str:
    # "H0776" -> "H776"; also handles capitalised prefix already
    prefix, number = prefix_and_number[0], prefix_and_number[1:]
    return f"{prefix}{int(number)}"


def _parse_ref(cell: str) -> tuple[str, int, int, int] | None:
    """Parse the leading `Book.Ch.Vs#NN=Source` cell.

    Returns (book_id, chapter, verse, position) or None on any parse error.
    """
    if "#" not in cell or "=" not in cell:
        return None
    ref_part, _, _source = cell.partition("=")
    book_chvs, _, pos_str = ref_part.partition("#")
    pieces = book_chvs.split(".")
    if len(pieces) != 3:
        return None
    book, ch_str, vs_str = pieces
    if book not in _STEP_TO_BOOK_ID:
        return None
    try:
        return _STEP_TO_BOOK_ID[book], int(ch_str), int(vs_str), int(pos_str)
    except ValueError:
        return None


class StepBibleExtractor:
    """Download + parse STEPBible TSV files into `InterlinearWord`s."""

    def __init__(self, cache_dir: Path | None = None, timeout: float = 120.0) -> None:
        self.cache_dir = cache_dir or Path("data/raw/stepbible")
        self.timeout = timeout

    # ─── Public API ──────────────────────────────────────────────────────────

    def extract_tagnt(self, use_cache: bool = True) -> list[InterlinearWord]:
        """Extract all Greek NT interlinear words (TAGNT)."""
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        words: list[InterlinearWord] = []
        for filename in TAGNT_FILES:
            raw = self._fetch(filename, use_cache)
            count_before = len(words)
            words.extend(
                self._parse(
                    raw,
                    language=InterlinearLanguage.GREEK,
                    source="tagnt",
                    row_parser=self._parse_row_tagnt,
                )
            )
            logger.info(
                "Parsed %d TAGNT words from %s",
                len(words) - count_before,
                filename[:20],
            )
        logger.info("TAGNT total: %d Greek words", len(words))
        return words

    def extract_tahot(self, use_cache: bool = True) -> list[InterlinearWord]:
        """Extract all Hebrew OT interlinear words (TAHOT)."""
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        words: list[InterlinearWord] = []
        for filename in TAHOT_FILES:
            raw = self._fetch(filename, use_cache)
            count_before = len(words)
            words.extend(
                self._parse(
                    raw,
                    language=InterlinearLanguage.HEBREW,
                    source="tahot",
                    row_parser=self._parse_row_tahot,
                )
            )
            logger.info(
                "Parsed %d TAHOT words from %s",
                len(words) - count_before,
                filename[:20],
            )
        logger.info("TAHOT total: %d Hebrew words", len(words))
        return words

    # ─── Download ────────────────────────────────────────────────────────────

    def _fetch(self, filename: str, use_cache: bool) -> str:
        cache_path = self.cache_dir / filename
        if use_cache and cache_path.exists():
            logger.debug("Using cached %s", filename[:40])
            return cache_path.read_text(encoding="utf-8")

        url = f"{_BASE_URL}/{quote(filename)}"
        logger.info("Downloading %s", filename[:60])
        with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
            response = client.get(url)
            response.raise_for_status()
            content = response.text

        cache_path.write_text(content, encoding="utf-8")
        logger.info("Cached %d KB to %s", len(content) // 1024, filename[:40])
        return content

    # ─── Parse ───────────────────────────────────────────────────────────────

    def _parse(
        self,
        text: str,
        language: InterlinearLanguage,
        source: str,
        row_parser: Any,
    ) -> Iterable[InterlinearWord]:
        """Outer state machine shared by TAGNT and TAHOT.

        Walks lines; anything that doesn't look like a data row (license,
        comment, column header, summary block) is skipped. Data rows are
        detected by the leading `Book.Ch.Vs#NN=Source` pattern and
        delegated to the per-format `row_parser`.

        **Deduplication:** STEPBible files include variant readings at the
        same (verse, position) — e.g. Traditional vs Ancient manuscript
        traditions. The first occurrence (typically the mainstream "NKO"
        reading) wins; subsequent duplicates are silently dropped.
        """
        seen: set[tuple[str, int]] = set()
        for raw_line in text.splitlines():
            line = raw_line.rstrip("\r\n")
            if not line.strip():
                continue
            if line.startswith("#"):
                continue
            cols = line.split("\t")
            first = cols[0] if cols else ""
            if "#" not in first or "=" not in first:
                continue
            ref = _parse_ref(first)
            if ref is None:
                continue
            book_id, chapter, verse, position = ref
            verse_id = f"{book_id}.{chapter}.{verse}"
            key = (verse_id, position)
            if key in seen:
                continue
            seen.add(key)
            try:
                word = row_parser(
                    cols=cols,
                    verse_id=verse_id,
                    position=position,
                    language=language,
                    source=source,
                )
            except Exception as exc:
                logger.debug("Skipping malformed row at %s: %s", first, exc)
                continue
            if word is not None:
                yield word

    def _parse_row_tagnt(
        self,
        cols: list[str],
        verse_id: str,
        position: int,
        language: InterlinearLanguage,
        source: str,
    ) -> InterlinearWord | None:
        """TAGNT columns:
        0 Ref, 1 Greek+translit, 2 English, 3 dStrong=Grammar, 4 lemma=gloss,
        5 editions, 6 meaning variants, 7 spelling variants, 8 Spanish,
        9 sub-meaning (semantic tag!), 10 conjoin, 11 sStrong+Instance, 12 alt
        """
        if len(cols) < 5:
            return None

        greek_translit = cols[1].strip()
        original, translit = _split_word_transliteration(greek_translit)

        english = cols[2].strip() or None
        strongs_raw = cols[3].strip() or None
        grammar = _extract_grammar_after_equals(strongs_raw)
        strongs_id = _normalize_strongs(strongs_raw) if strongs_raw else None

        lemma_gloss = cols[4].strip()
        lemma, gloss = _split_lemma_gloss(lemma_gloss)

        raw_tag = cols[9].strip() if len(cols) > 9 else ""
        semantic_tag: str | None = raw_tag or None

        return InterlinearWord(
            verse_id=verse_id,
            word_position=position,
            language=language,
            source=source,
            original_word=original,
            transliteration=translit,
            english=english,
            strongs_id=strongs_id,
            strongs_raw=strongs_raw,
            grammar=grammar,
            lemma=lemma,
            gloss=gloss,
            semantic_tag=semantic_tag,
        )

    def _parse_row_tahot(
        self,
        cols: list[str],
        verse_id: str,
        position: int,
        language: InterlinearLanguage,
        source: str,
    ) -> InterlinearWord | None:
        """TAHOT columns:
        0 Ref, 1 Hebrew, 2 Transliteration, 3 Translation, 4 dStrongs,
        5 Grammar, 6 Meaning Variants, 7 Spelling Variants,
        8 Root dStrong+Instance, 9 Alternative Strongs+Instance,
        10 Conjoin word, 11 Expanded Strong tags (semantic tag!)
        """
        if len(cols) < 6:
            return None

        original = cols[1].strip()
        translit = cols[2].strip() or None
        english = cols[3].strip() or None

        strongs_raw = cols[4].strip() or None
        grammar = cols[5].strip() or None
        strongs_id = _normalize_strongs(strongs_raw) if strongs_raw else None

        # Expanded Strong tags hold lemma+gloss+semantic info in TAHOT.
        # Format example: `H9002=ו=and/{H0776G=אֶ֫רֶץ=: country;_planet»...}`
        # We extract lemma and gloss from the primary (root) segment within
        # the `{...}` braces and treat the full expanded string as the
        # semantic_tag for now; Task #10 (semantic graph) can parse deeper.
        expanded = cols[11].strip() if len(cols) > 11 else ""
        lemma, gloss = _extract_tahot_root_lemma_gloss(expanded)
        semantic_tag = expanded or None

        return InterlinearWord(
            verse_id=verse_id,
            word_position=position,
            language=language,
            source=source,
            original_word=original,
            transliteration=translit,
            english=english,
            strongs_id=strongs_id,
            strongs_raw=strongs_raw,
            grammar=grammar,
            lemma=lemma,
            gloss=gloss,
            semantic_tag=semantic_tag,
        )


# ─── Row-level helpers ───────────────────────────────────────────────────────


_PARENS_TRANSLIT_RE = re.compile(r"^(.+?)\s*\((.+?)\)\s*$")


def _split_word_transliteration(cell: str) -> tuple[str, str | None]:
    """Split `"Βίβλος (Biblos)"` into `("Βίβλος", "Biblos")`.

    Returns (original, None) if there are no parens.
    """
    m = _PARENS_TRANSLIT_RE.match(cell)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return cell, None


def _extract_grammar_after_equals(raw: str | None) -> str | None:
    """Extract `N-NSF` from `G0976=N-NSF` (TAGNT). Returns None otherwise."""
    if not raw:
        return None
    # Only interested in a simple `SOMETHING=grammar_code` shape
    if "/" in raw or "{" in raw:
        # Complex Hebrew-style lemma — grammar goes in a different column there
        return None
    if "=" not in raw:
        return None
    _left, _, right = raw.partition("=")
    return right.strip() or None


def _split_lemma_gloss(cell: str) -> tuple[str | None, str | None]:
    """Split `"βίβλος=book"` into `("βίβλος", "book")`. Returns (None, None)
    if the cell is empty or doesn't contain a `=`."""
    if not cell:
        return None, None
    if "=" not in cell:
        return cell, None
    lemma, _, gloss = cell.partition("=")
    return (lemma.strip() or None), (gloss.strip() or None)


_TAHOT_ROOT_RE = re.compile(r"\{([HG]\d+[A-Za-z]?)=([^=]+)=([^}]+)\}")


def _extract_tahot_root_lemma_gloss(expanded: str) -> tuple[str | None, str | None]:
    """TAHOT "Expanded Strong tags" are shaped like:
        H9002=ו=and/{H0776G=אֶ֫רֶץ=: country;_planet»land:2_country;_planet}

    The `{...}` wraps the *root* morpheme (lemma + gloss of the actual word
    the translator cares about, as opposed to the prefix morphemes like
    conjunctions and articles). We pull the lemma and gloss from there.
    """
    if not expanded:
        return None, None
    m = _TAHOT_ROOT_RE.search(expanded)
    if not m:
        return None, None
    _strongs = m.group(1)
    lemma = m.group(2).strip() or None
    gloss = m.group(3).strip() or None
    return lemma, gloss
