"""
📥 Fetch & parse Luther 1912 NT from eBible.org (USFX format)

The Luther NT is not served by bible-api.com. We fetch the public-domain
Luther 1912 USFX bundle from eBible.org and parse it into the per-book
JSON cache format expected by the pipeline (src/extract/bible_sources.py:
PreCachedSource).

Usage:
    python scripts/fetch_luther_nt.py

Writes to: data/raw/luther/{mat,mrk,luk,...,rev}.json

Source:    https://ebible.org/find/details.php?id=deu1912
License:   Public Domain (Martin Luther, 1912 edition)
"""
from __future__ import annotations

import json
import re
import sys
import zipfile
from io import BytesIO
from pathlib import Path
from urllib.request import urlopen

USFX_URL = "https://ebible.org/Scriptures/deu1912_usfx.zip"
OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "raw" / "luther"

# Canonical English NT book names — matches existing bible-api.com JSONs
NT_BOOKS: dict[str, str] = {
    "MAT": "Matthew", "MRK": "Mark", "LUK": "Luke", "JHN": "John",
    "ACT": "Acts", "ROM": "Romans",
    "1CO": "1 Corinthians", "2CO": "2 Corinthians",
    "GAL": "Galatians", "EPH": "Ephesians", "PHP": "Philippians", "COL": "Colossians",
    "1TH": "1 Thessalonians", "2TH": "2 Thessalonians",
    "1TI": "1 Timothy", "2TI": "2 Timothy", "TIT": "Titus", "PHM": "Philemon",
    "HEB": "Hebrews", "JAS": "James",
    "1PE": "1 Peter", "2PE": "2 Peter",
    "1JN": "1 John", "2JN": "2 John", "3JN": "3 John",
    "JUD": "Jude", "REV": "Revelation",
}

BOOK_RE = re.compile(
    r'<book id="([A-Z0-9]{3})"[^>]*>(.*?)(?=<book id=|</usfx>)', re.DOTALL
)
VERSE_RE = re.compile(
    r'<v id="[^"]+" bcv="([A-Z0-9]+\.\d+\.\d+)"\s*/>(.*?)'
    r'(?=<v id=|<c id=|</book>|$)',
    re.DOTALL,
)
TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def main() -> None:
    print(f"Fetching {USFX_URL} ...", flush=True)
    with urlopen(USFX_URL) as resp:
        zip_bytes = resp.read()
    print(f"  Downloaded {len(zip_bytes):,} bytes", flush=True)

    with zipfile.ZipFile(BytesIO(zip_bytes)) as zf:
        xml_bytes = zf.read("deu1912_usfx.xml")
    xml_text = xml_bytes.decode("utf-8")
    print(f"  Extracted {len(xml_text):,} chars of USFX XML", flush=True)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    total_books = 0
    total_verses = 0
    for bm in BOOK_RE.finditer(xml_text):
        bid = bm.group(1)
        if bid not in NT_BOOKS:
            continue
        book_content = bm.group(2)

        verses = []
        for vm in VERSE_RE.finditer(book_content):
            bcv = vm.group(1)
            raw = vm.group(2)
            text = WS_RE.sub(" ", TAG_RE.sub("", raw)).strip()
            if not text:
                continue
            parts = bcv.split(".")
            if len(parts) != 3:
                continue
            ch, vs = int(parts[1]), int(parts[2])
            verses.append({
                "book_id": bid,
                "book_name": NT_BOOKS[bid],
                "chapter": ch,
                "verse": vs,
                "text": text,
                "translation_id": "luther",
                "language": "de",
                "verse_id": bcv,
                "reference": f"{NT_BOOKS[bid]} {ch}:{vs}",
            })

        out_path = OUT_DIR / f"{bid.lower()}.json"
        out_path.write_text(
            json.dumps(verses, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"  {bid}: {len(verses):,} verses -> {out_path.name}", flush=True)
        total_books += 1
        total_verses += len(verses)

    print(f"\nDone: {total_books} NT books, {total_verses:,} verses", flush=True)
    print(
        "\nNext: run the pipeline (keep all 12 translations or schema re-creation"
        " will drop everything else):\n"
        "  PYTHONIOENCODING=utf-8 python -m src.cli run --translations "
        "kjv,bbe,nvi,ra,acf,rvr,apee,neue,asv,web,darby,luther",
        flush=True,
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
