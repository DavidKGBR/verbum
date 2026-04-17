"""
load_dictionary_batch.py — R6.dictionary batch loader

Loads translated Easton + Smith entries from a JSONL file into
dictionary_entries_multilang. Each JSONL line must have:

    {
        "slug": "babylon",
        "lang": "pt",
        "text_easton": "A forma grega de BABEL ...",   // optional, but at least one
        "text_smith":  "Babilônia, antigamente ...",   // optional, but at least one
        "confidence": 0.9,                              // optional, default 0.9
        "notes": "auto: claude-opus"                    // optional
    }

Either text_easton, text_smith, or both can be present — whichever bodies the
original entry had. NULL is stored for the source a given entry doesn't carry.

Idempotent: uses INSERT OR REPLACE on PK (slug, lang).
Validates with Pydantic before insert when available.

Usage:
    python scripts/load_dictionary_batch.py --input batch_01_pt.jsonl
    python scripts/load_dictionary_batch.py --input batch_01_pt.jsonl --dry-run
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

import duckdb

try:
    from pydantic import BaseModel, Field, field_validator, model_validator
    HAS_PYDANTIC = True
except ImportError:
    HAS_PYDANTIC = False

DB_DEFAULT = Path(__file__).parent.parent / "data" / "analytics" / "bible.duckdb"


if HAS_PYDANTIC:
    class DictionaryEntry(BaseModel):
        slug: str
        lang: str
        text_easton: Optional[str] = None
        text_smith: Optional[str] = None
        confidence: float = Field(default=0.9, ge=0.0, le=1.0)
        notes: Optional[str] = None

        @field_validator("slug")
        @classmethod
        def normalize_slug(cls, v: str) -> str:
            # slugs in dictionary_entries are already lowercase kebab-ish
            return v.strip().lower()

        @field_validator("lang")
        @classmethod
        def valid_lang(cls, v: str) -> str:
            v = v.strip().lower()
            if v not in ("pt", "es"):
                raise ValueError(f"lang must be 'pt' or 'es', got {v!r}")
            return v

        @model_validator(mode="after")
        def at_least_one_body(self) -> "DictionaryEntry":
            if not (self.text_easton or self.text_smith):
                raise ValueError(
                    "entry must carry at least one of text_easton or text_smith"
                )
            return self


def parse_line(line: str, lineno: int) -> dict | None:
    """Parse a JSONL line and validate. Returns None on error."""
    line = line.strip()
    if not line or line.startswith("#"):
        return None
    try:
        obj = json.loads(line)
    except json.JSONDecodeError as e:
        print(f"  ⚠️  Line {lineno}: JSON parse error — {e}", file=sys.stderr)
        return None

    if HAS_PYDANTIC:
        try:
            entry = DictionaryEntry(**obj)
            return entry.model_dump()
        except Exception as e:
            print(f"  ⚠️  Line {lineno}: validation error — {e}", file=sys.stderr)
            return None
    else:
        for required in ("slug", "lang"):
            if required not in obj:
                print(f"  ⚠️  Line {lineno}: missing field '{required}'", file=sys.stderr)
                return None
        if not (obj.get("text_easton") or obj.get("text_smith")):
            print(f"  ⚠️  Line {lineno}: needs text_easton or text_smith", file=sys.stderr)
            return None
        obj["slug"] = obj["slug"].strip().lower()
        obj["lang"] = obj["lang"].strip().lower()
        obj.setdefault("confidence", 0.9)
        return obj


UPSERT = """
INSERT INTO dictionary_entries_multilang
    (slug, lang, text_easton, text_smith, confidence, notes)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT (slug, lang) DO UPDATE SET
    text_easton = excluded.text_easton,
    text_smith  = excluded.text_smith,
    confidence  = excluded.confidence,
    notes       = excluded.notes
"""


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Load translated dictionary batch into DB"
    )
    parser.add_argument("--input", required=True, help="Path to JSONL file")
    parser.add_argument("--dry-run", action="store_true", default=False,
                        help="Parse + validate only, do not write to DB")
    parser.add_argument("--db", default=str(DB_DEFAULT))
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"ERROR: input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    lines = input_path.read_text(encoding="utf-8").splitlines()
    entries: list[dict] = []
    errors = 0

    for i, line in enumerate(lines, start=1):
        entry = parse_line(line, i)
        if entry is None:
            if line.strip() and not line.strip().startswith("#"):
                errors += 1
        else:
            entries.append(entry)

    print(f"Parsed: {len(entries)} valid entries, {errors} errors from {len(lines)} lines")

    if args.dry_run:
        print("DRY RUN — no DB writes")
        return

    if not entries:
        print("Nothing to insert.")
        return

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"ERROR: DB not found at {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = duckdb.connect(str(db_path))
    try:
        inserted = 0
        for entry in entries:
            conn.execute(UPSERT, [
                entry["slug"],
                entry["lang"],
                entry.get("text_easton"),
                entry.get("text_smith"),
                entry.get("confidence", 0.9),
                entry.get("notes"),
            ])
            inserted += 1
        print(f"OK  Inserted/updated {inserted} rows into dictionary_entries_multilang")
    except Exception as e:
        print(f"ERROR during DB write: {e}", file=sys.stderr)
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
