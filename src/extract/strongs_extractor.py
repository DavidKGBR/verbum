"""
📖 Extract — Strong's lexicon

Downloads and parses Strong's Hebrew and Greek lexicon entries from the
openscriptures/strongs GitHub repository (public domain).

The upstream format is a JavaScript module wrapping a JSON object:

    var strongsHebrewDictionary = {"H1": {lemma, xlit, pron, strongs_def, ...}, ...}

We strip the JS wrapper, parse the JSON, then project the entries into
the canonical `StrongsEntry` Pydantic model.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

import httpx

from src.models.schemas import StrongsEntry, StrongsLanguage

logger = logging.getLogger(__name__)

# Upstream source. openscriptures/strongs is the canonical public-domain
# Strong's lexicon used by most open-source Bible projects.
HEBREW_URL = "https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js"
GREEK_URL = "https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js"

# Strip everything from the start of the file up to (and including) the
# `var X = ` assignment — this swallows the leading copyright comment block.
_JS_PREFIX_RE = re.compile(r"\A.*?var\s+\w+\s*=\s*", re.DOTALL)


class StrongsExtractor:
    """Extract Strong's lexicon entries from openscriptures/strongs.

    Raw files are cached in `cache_dir` (default: `data/raw/strongs/`). Pass
    `use_cache=False` to force a re-download.
    """

    def __init__(self, cache_dir: Path | None = None, timeout: float = 60.0) -> None:
        self.cache_dir = cache_dir or Path("data/raw/strongs")
        self.timeout = timeout

    # ─── Public API ──────────────────────────────────────────────────────────

    def extract(self, use_cache: bool = True) -> list[StrongsEntry]:
        """Return a deduplicated list of Strong's entries (Hebrew + Greek)."""
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        hebrew_raw = self._fetch(
            HEBREW_URL, self.cache_dir / "strongs-hebrew-dictionary.js", use_cache
        )
        greek_raw = self._fetch(
            GREEK_URL, self.cache_dir / "strongs-greek-dictionary.js", use_cache
        )

        entries: list[StrongsEntry] = []
        entries.extend(self._parse_openscriptures_js(hebrew_raw, StrongsLanguage.HEBREW))
        entries.extend(self._parse_openscriptures_js(greek_raw, StrongsLanguage.GREEK))

        # Dedup by strongs_id (shouldn't happen across languages since prefixes
        # differ, but cheap and future-proof).
        seen: set[str] = set()
        unique: list[StrongsEntry] = []
        for e in entries:
            if e.strongs_id in seen:
                logger.warning("Duplicate Strong's ID: %s (keeping first)", e.strongs_id)
                continue
            seen.add(e.strongs_id)
            unique.append(e)

        logger.info(
            "Extracted %d Strong's entries (%d Hebrew, %d Greek)",
            len(unique),
            sum(1 for e in unique if e.language == StrongsLanguage.HEBREW),
            sum(1 for e in unique if e.language == StrongsLanguage.GREEK),
        )
        return unique

    # ─── Download ────────────────────────────────────────────────────────────

    def _fetch(self, url: str, cache_path: Path, use_cache: bool) -> str:
        if use_cache and cache_path.exists():
            logger.info("Using cached %s", cache_path.name)
            return cache_path.read_text(encoding="utf-8")

        logger.info("Downloading %s", url)
        with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
            response = client.get(url)
            response.raise_for_status()
            content = response.text

        cache_path.write_text(content, encoding="utf-8")
        logger.info("Cached %d bytes to %s", len(content), cache_path)
        return content

    # ─── Parse ───────────────────────────────────────────────────────────────

    def _parse_openscriptures_js(self, raw: str, language: StrongsLanguage) -> list[StrongsEntry]:
        """Parse an openscriptures/strongs JS file into StrongsEntry models.

        The source is a single `var X = {...};` assignment. We strip the prefix
        and trailing semicolon, then parse as JSON.
        """
        # Strip everything up through the `var X = ` assignment.
        body = _JS_PREFIX_RE.sub("", raw, count=1).lstrip()

        # Use raw_decode so any trailing `;` or whitespace after the object is
        # ignored — the source file ends with `};` and sometimes a newline.
        try:
            data, _end = json.JSONDecoder().raw_decode(body)
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse Strong's JSON ({language}): {e}") from e

        if not isinstance(data, dict):
            raise ValueError(f"Expected dict at root of Strong's data, got {type(data)}")

        entries: list[StrongsEntry] = []
        skipped = 0
        for raw_id, fields in data.items():
            if not isinstance(fields, dict):
                skipped += 1
                continue

            strongs_id = _normalize_id(raw_id)
            if strongs_id is None:
                skipped += 1
                continue

            # openscriptures uses: lemma, xlit, pron, derivation, strongs_def, kjv_def
            # Greek entries use `translit` instead of `xlit` and omit `pron`.
            lemma = fields.get("lemma")
            xlit = fields.get("xlit") or fields.get("translit")
            strongs_def = fields.get("strongs_def")

            # Required fields. If any is missing, skip the entry with a warning
            # rather than fail the whole extract — a few lexicon entries in the
            # original data are intentionally incomplete placeholders.
            if not lemma or not xlit or not strongs_def:
                skipped += 1
                continue

            long_def_parts: list[str] = []
            if fields.get("derivation"):
                long_def_parts.append(str(fields["derivation"]).strip())
            if fields.get("kjv_def"):
                long_def_parts.append(f"KJV: {fields['kjv_def']}")

            entries.append(
                StrongsEntry(
                    strongs_id=strongs_id,
                    language=language,
                    original=str(lemma),
                    transliteration=str(xlit),
                    pronunciation=fields.get("pron"),
                    short_definition=str(strongs_def),
                    long_definition=" ".join(long_def_parts) if long_def_parts else None,
                    part_of_speech=None,  # openscriptures doesn't provide POS
                )
            )

        if skipped:
            logger.info("Skipped %d malformed %s entries", skipped, language.value)
        return entries


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _normalize_id(raw: str) -> str | None:
    """Normalise a Strong's ID to the canonical `H<int>` / `G<int>` form.

    Accepts: "H1", "H0001", "h1", "G25", "G00025". Returns None if unparseable.
    """
    if not raw or len(raw) < 2:
        return None
    prefix = raw[0].upper()
    body = raw[1:]
    if prefix not in ("H", "G"):
        return None
    # Some openscriptures keys have trailing letters ("H3023a") for homographs.
    # Keep the numeric prefix, drop the letter suffix for now — #3d interlinear
    # will address disambiguated IDs when we wire them to actual words.
    digits = ""
    for ch in body:
        if ch.isdigit():
            digits += ch
        else:
            break
    if not digits:
        return None
    return f"{prefix}{int(digits)}"
