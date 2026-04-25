"""
🔗 Extract — Cross-References
Downloads and parses Bible cross-references from OpenBible.info.
"""

from __future__ import annotations

import io
import json
import logging
import zipfile
from pathlib import Path

import httpx

from src.models.schemas import RawCrossReference

logger = logging.getLogger(__name__)

CROSSREF_URL = "https://a.openbible.info/data/cross-references.zip"

# OpenBible book abbreviations → our book IDs
# OpenBible uses: Gen, Exod, Lev, Num, Deut, Josh, Judg, Ruth, 1Sam, 2Sam, etc.
_OPENBIBLE_TO_BOOK_ID: dict[str, str] = {
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


def parse_openbible_ref(ref: str) -> str | None:
    """Convert OpenBible verse reference to our format.

    OpenBible format: 'Gen.1.1', 'Matt.11.25', 'Col.1.16-Col.1.17' (ranges)
    Our format: 'GEN.1.1'

    For ranges, uses the start verse only.
    """
    # Handle ranges — take the first verse
    if "-" in ref:
        ref = ref.split("-")[0]

    parts = ref.split(".")
    if len(parts) != 3:
        return None

    book_abbrev, chapter_str, verse_str = parts

    book_id = _OPENBIBLE_TO_BOOK_ID.get(book_abbrev)
    if not book_id:
        return None

    try:
        chapter = int(chapter_str)
        verse = int(verse_str)
        if chapter < 1 or verse < 1:
            return None
        return f"{book_id}.{chapter}.{verse}"
    except ValueError:
        return None


def parse_crossref_line(line: str) -> RawCrossReference | None:
    """Parse a single line from the OpenBible cross-references TSV.

    Format: "From Verse\\tTo Verse\\tVotes"
    Example: "Gen.1.1\\tMatt.11.25\\t13"
    """
    line = line.strip()
    if not line or line.startswith("#") or line.startswith("From"):
        return None

    parts = line.split("\t")
    if len(parts) < 2:
        return None

    from_ref = parts[0].strip()
    to_ref = parts[1].strip()

    source = parse_openbible_ref(from_ref)
    target = parse_openbible_ref(to_ref)

    if not source or not target:
        return None

    votes = 1
    if len(parts) >= 3:
        try:
            votes = int(parts[2].strip())
        except ValueError:
            votes = 1

    return RawCrossReference(
        source_verse_id=source,
        target_verse_id=target,
        votes=votes,
    )


class CrossRefExtractor:
    """Extracts cross-references from OpenBible.info."""

    def __init__(self, cache_dir: Path | None = None) -> None:
        self.cache_dir = cache_dir

    def fetch_all(self) -> list[RawCrossReference]:
        """Download and parse all cross-references.

        Tries cache first, then downloads from OpenBible.info.
        """
        if self.cache_dir:
            cached = self._load_from_cache()
            if cached:
                return cached

        logger.info("🌐 Downloading cross-references from OpenBible.info...")
        tsv_content = self._download()
        if not tsv_content:
            logger.error("Failed to download cross-references")
            return []

        refs = self._parse_tsv(tsv_content)

        if self.cache_dir and refs:
            self._save_to_cache(refs)

        return refs

    def _download(self) -> str | None:
        """Download the cross-references ZIP and extract TSV content."""
        try:
            response = httpx.get(CROSSREF_URL, timeout=60, follow_redirects=True)
            response.raise_for_status()

            with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
                names = zf.namelist()
                tsv_name = None
                for name in names:
                    if name.endswith(".txt") or name.endswith(".tsv"):
                        tsv_name = name
                        break

                if not tsv_name:
                    logger.error(f"No TSV/TXT file in ZIP. Contents: {names}")
                    return None

                return zf.read(tsv_name).decode("utf-8")

        except httpx.HTTPError as e:
            logger.error(f"HTTP error downloading cross-references: {e}")
            return None
        except zipfile.BadZipFile:
            logger.error("Downloaded file is not a valid ZIP")
            return None

    def _parse_tsv(self, content: str) -> list[RawCrossReference]:
        """Parse TSV content into RawCrossReference objects."""
        refs: list[RawCrossReference] = []
        skipped = 0

        for line in content.splitlines():
            ref = parse_crossref_line(line)
            if ref:
                refs.append(ref)
            elif line.strip() and not line.startswith("From") and not line.startswith("#"):
                skipped += 1

        if skipped > 0:
            logger.warning(f"⚠️  Skipped {skipped} malformed lines")

        # Deduplicate
        seen: set[tuple[str, str]] = set()
        unique: list[RawCrossReference] = []
        for ref in refs:
            key = (ref.source_verse_id, ref.target_verse_id)
            if key not in seen:
                seen.add(key)
                unique.append(ref)

        dupes = len(refs) - len(unique)
        if dupes > 0:
            logger.info(f"🗑️  Removed {dupes} duplicate cross-references")

        logger.info(f"✅ Parsed {len(unique)} cross-references")
        return unique

    def _load_from_cache(self) -> list[RawCrossReference] | None:
        """Load cross-references from cached JSON."""
        if not self.cache_dir:
            return None

        cache_file = self.cache_dir / "crossrefs.json"
        if not cache_file.exists():
            return None

        try:
            data = json.loads(cache_file.read_text(encoding="utf-8"))
            refs = [RawCrossReference(**item) for item in data]
            logger.info(f"📂 Loaded {len(refs)} cross-references from cache")
            return refs
        except Exception as e:
            logger.warning(f"Error loading cache: {e}")
            return None

    def _save_to_cache(self, refs: list[RawCrossReference]) -> None:
        """Save cross-references to cache as JSON."""
        if not self.cache_dir:
            return

        self.cache_dir.mkdir(parents=True, exist_ok=True)
        cache_file = self.cache_dir / "crossrefs.json"
        cache_file.write_text(
            json.dumps(
                [r.model_dump() for r in refs],
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        logger.info(f"💾 Cached {len(refs)} cross-references to {cache_file}")
