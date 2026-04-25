"""
load_strongs_batch.py — R3.6 batch loader

Loads translated Strong's definitions from a JSONL file into
strongs_lexicon_multilang. Each JSONL line must have:

    {
        "strongs_id": "H2617",
        "lang": "pt",
        "short_definition": "misericórdia, benignidade",
        "long_definition": "...",        // optional
        "confidence": 0.9,              // optional, default 0.9
        "notes": "..."                  // optional
    }

Idempotent: uses INSERT OR REPLACE (UPSERT on PK).
Validates with Pydantic before insert.

Usage:
    python scripts/load_strongs_batch.py --input batch_01_pt.jsonl
    python scripts/load_strongs_batch.py --input batch_01_pt.jsonl --dry-run
    python scripts/load_strongs_batch.py --input batch_01_pt.jsonl --db data/analytics/bible.duckdb
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

import duckdb

try:
    from pydantic import BaseModel, Field, field_validator
    HAS_PYDANTIC = True
except ImportError:
    HAS_PYDANTIC = False

DB_DEFAULT = Path(__file__).parent.parent / "data" / "analytics" / "bible.duckdb"


if HAS_PYDANTIC:
    class StrongsEntry(BaseModel):
        strongs_id: str
        lang: str
        short_definition: Optional[str] = None
        long_definition: Optional[str] = None
        confidence: float = Field(default=0.9, ge=0.0, le=1.0)
        notes: Optional[str] = None

        @field_validator("strongs_id")
        @classmethod
        def uppercase_id(cls, v: str) -> str:
            return v.strip().upper()

        @field_validator("lang")
        @classmethod
        def valid_lang(cls, v: str) -> str:
            v = v.strip().lower()
            if v not in ("pt", "es"):
                raise ValueError(f"lang must be 'pt' or 'es', got {v!r}")
            return v


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
            entry = StrongsEntry(**obj)
            return entry.model_dump()
        except Exception as e:
            print(f"  ⚠️  Line {lineno}: validation error — {e}", file=sys.stderr)
            return None
    else:
        # Minimal validation without Pydantic
        for required in ("strongs_id", "lang"):
            if required not in obj:
                print(f"  ⚠️  Line {lineno}: missing field '{required}'", file=sys.stderr)
                return None
        obj["strongs_id"] = obj["strongs_id"].strip().upper()
        obj["lang"] = obj["lang"].strip().lower()
        obj.setdefault("confidence", 0.9)
        return obj


UPSERT = """
INSERT INTO strongs_lexicon_multilang
    (strongs_id, lang, short_definition, long_definition, confidence, notes)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT (strongs_id, lang) DO UPDATE SET
    short_definition = excluded.short_definition,
    long_definition  = excluded.long_definition,
    confidence       = excluded.confidence,
    notes            = excluded.notes
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Load translated Strong's batch into DB")
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
                entry["strongs_id"],
                entry["lang"],
                entry.get("short_definition"),
                entry.get("long_definition"),
                entry.get("confidence", 0.9),
                entry.get("notes"),
            ])
            inserted += 1
        print(f"OK  Inserted/updated {inserted} rows into strongs_lexicon_multilang")
    except Exception as e:
        print(f"ERROR during DB write: {e}", file=sys.stderr)
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
