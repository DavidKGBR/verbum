"""
Discover and validate Bible Brain fileset IDs for each translation.

Usage (after receiving your API key):
    python scripts/discover_bible_brain_filesets.py

Reads BIBLE_BRAIN_API_KEY from .env, queries the Bible Brain v4 API,
prints the correct fileset IDs, and patches src/api/routers/audio.py
automatically.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("BIBLE_BRAIN_API_KEY", "").strip()
BASE = "https://4.dbt.io/api"

# translation_code → search params for Bible Brain
TRANSLATIONS = {
    "kjv":  {"abbr": "KJV",  "lang": "eng"},
    "web":  {"abbr": "WEB",  "lang": "eng"},
    "asv":  {"abbr": "ASV",  "lang": "eng"},
    "nvi":  {"abbr": "NVI",  "lang": "por"},
    "ra":   {"abbr": "RA",   "lang": "por"},
    "acf":  {"abbr": "ACF",  "lang": "por"},
    "rvr":  {"abbr": "RVR",  "lang": "spa"},
}


def get_filesets(abbr: str, lang: str) -> list[dict]:
    r = httpx.get(
        f"{BASE}/bibles",
        params={"key": API_KEY, "v": "4", "abbr": abbr, "language_code": lang, "media": "audio"},
        timeout=15,
    )
    r.raise_for_status()
    data = r.json().get("data", [])
    results = []
    for bible in data:
        for ftype, flist in (bible.get("filesets") or {}).items():
            if "audio" not in ftype:
                continue
            for fs in flist:
                results.append({
                    "fileset_id": fs.get("id"),
                    "type": fs.get("type"),
                    "size": fs.get("size"),  # NT / OT / C (complete)
                    "bible_abbr": bible.get("abbr"),
                    "bible_title": bible.get("title"),
                })
    return results


def pick_best(filesets: list[dict]) -> tuple[str, str] | None:
    """Return (drama_id, plain_id) — prefer complete > NT+OT, drama > plain."""
    drama = [f for f in filesets if "drama" in (f["type"] or "").lower()]
    plain = [f for f in filesets if "drama" not in (f["type"] or "").lower()]

    def priority(fs: dict) -> int:
        size = (fs.get("size") or "").upper()
        return 0 if size == "C" else 1 if size == "NT" else 2

    drama.sort(key=priority)
    plain.sort(key=priority)

    d = drama[0]["fileset_id"] if drama else None
    p = plain[0]["fileset_id"] if plain else None
    if not d and not p:
        return None
    return (d or p, p or d)  # type: ignore[return-value]


def patch_audio_router(mapping: dict[str, tuple[str, str]]) -> None:
    path = Path("src/api/routers/audio.py")
    src = path.read_text(encoding="utf-8")

    lines = []
    for code, (drama, plain) in mapping.items():
        lines.append(f'    "{code}":   ["{drama}", "{plain}"],')

    new_block = "_FILESETS: dict[str, list[str]] = {\n" + "\n".join(lines) + "\n}"
    patched = re.sub(
        r"_FILESETS: dict\[str, list\[str\]\] = \{.*?\}",
        new_block,
        src,
        flags=re.DOTALL,
    )
    path.write_text(patched, encoding="utf-8")
    print(f"\n✓ Patched {path}")


def main() -> None:
    if not API_KEY:
        print("ERROR: BIBLE_BRAIN_API_KEY not set in .env")
        print("Register at https://4.dbt.io and add the key to .env")
        sys.exit(1)

    print(f"Using API key: {API_KEY[:8]}...\n")

    mapping: dict[str, tuple[str, str]] = {}

    for code, params in TRANSLATIONS.items():
        print(f"Querying {code.upper()} ({params['abbr']})...")
        try:
            filesets = get_filesets(params["abbr"], params["lang"])
            if not filesets:
                print(f"  ✗ No audio filesets found")
                continue
            best = pick_best(filesets)
            if not best:
                print(f"  ✗ Could not determine best fileset")
                continue
            drama_id, plain_id = best
            mapping[code] = (drama_id, plain_id)
            print(f"  ✓ drama={drama_id}  plain={plain_id}")
            # Show all options for reference
            for fs in filesets:
                print(f"    - {fs['fileset_id']} | type={fs['type']} | size={fs['size']} | {fs['bible_title']}")
        except Exception as e:
            print(f"  ✗ Error: {e}")

    if not mapping:
        print("\nNo filesets found. Check your API key and try again.")
        sys.exit(1)

    print("\n--- Recommended _FILESETS mapping ---")
    for code, (d, p) in mapping.items():
        print(f'  "{code}": ["{d}", "{p}"],')

    answer = input("\nPatch src/api/routers/audio.py with these IDs? [y/N] ").strip().lower()
    if answer == "y":
        patch_audio_router(mapping)
    else:
        print("Skipped. Copy the mapping above manually if needed.")


if __name__ == "__main__":
    main()
