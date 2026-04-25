"""
📖 Extract — Bible Dictionary (Easton's + Smith's)

Downloads parsed JSON files from the neuu-org/bible-dictionary-dataset
repository. 26 alphabetical files (a.json … z.json) containing ~5,998
entries from Easton's Bible Dictionary (1897) and Smith's Bible
Dictionary (1863). Both are public domain.
"""

from __future__ import annotations

import json
import logging
import string
from pathlib import Path

import httpx

from src.models.schemas import DictionaryEntry

logger = logging.getLogger(__name__)

BASE_URL = "https://raw.githubusercontent.com/neuu-org/bible-dictionary-dataset/main/data/01_parsed"
LETTERS = list(string.ascii_lowercase)


class DictionaryExtractor:
    """Download + parse the Bible dictionary dataset into `DictionaryEntry`s."""

    def __init__(self, cache_dir: Path | None = None, timeout: float = 60.0) -> None:
        self.cache_dir = cache_dir or Path("data/raw/dictionary")
        self.timeout = timeout

    def extract(self, use_cache: bool = True) -> list[DictionaryEntry]:
        """Return all dictionary entries (Easton + Smith, deduplicated by slug)."""
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        entries: dict[str, DictionaryEntry] = {}
        for letter in LETTERS:
            raw = self._fetch(letter, use_cache)
            if not raw:
                continue
            try:
                data = json.loads(raw)
            except json.JSONDecodeError as e:
                logger.warning("Failed to parse %s.json: %s", letter, e)
                continue

            for _key, item in data.items():
                if not isinstance(item, dict):
                    continue
                slug = item.get("slug", "").strip()
                name = item.get("name", "").strip()
                if not slug or not name:
                    continue

                defs = item.get("definitions", [])
                text_eas: str | None = None
                text_smi: str | None = None
                sources: list[str] = []

                for d in defs:
                    src = d.get("source", "")
                    text = d.get("text", "").strip()
                    if not text:
                        continue
                    if src == "EAS":
                        text_eas = text
                        sources.append("EAS")
                    elif src == "SMI":
                        text_smi = text
                        sources.append("SMI")

                if not text_eas and not text_smi:
                    continue

                # Dedup by slug — keep first occurrence per letter file
                if slug not in entries:
                    entries[slug] = DictionaryEntry(
                        slug=slug,
                        name=name,
                        source=",".join(sorted(set(sources))),
                        text_easton=text_eas,
                        text_smith=text_smi,
                    )

        result = list(entries.values())
        logger.info("Extracted %d dictionary entries", len(result))
        return result

    def _fetch(self, letter: str, use_cache: bool) -> str:
        cache_path = self.cache_dir / f"{letter}.json"
        if use_cache and cache_path.exists():
            return cache_path.read_text(encoding="utf-8")

        url = f"{BASE_URL}/{letter}.json"
        logger.info("Downloading %s", url)
        with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
            resp = client.get(url)
            if resp.status_code == 404:
                logger.debug("No file for letter %s", letter)
                return ""
            resp.raise_for_status()
            content = resp.text

        cache_path.write_text(content, encoding="utf-8")
        return content
