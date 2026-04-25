"""Prepare a TSV batch for sentiment labeling.

Usage:
    python scripts/prep_sentiment_batch.py --book PSA --lang pt            # PT (NVI)
    python scripts/prep_sentiment_batch.py --book PSA --lang es            # ES (RVR)
    python scripts/prep_sentiment_batch.py --book PSA --chapters 1-30

Output: data/processed/sentiment_{lang}/{BOOK}/batch_{NNN}_input.tsv
Columns: verse_id | chapter | verse | text_en (KJV) | polarity_en | label_en | text_target
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

import duckdb

DB_PATH = "data/analytics/bible.duckdb"
BATCH_SIZE = 300

# Lang → vernacular translation_id used as source text for labeling.
LANG_TRANSLATION = {
    "pt": "nvi",
    "es": "rvr",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare sentiment labeling batch")
    parser.add_argument("--book", required=True, help="Book ID (e.g. PSA, GEN)")
    parser.add_argument("--lang", default="pt", choices=["pt", "es"], help="Target language")
    parser.add_argument("--chapters", help="Chapter range (e.g. 1-30). Omit for all.")
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    args = parser.parse_args()

    book = args.book.upper()
    lang = args.lang
    target_translation = LANG_TRANSLATION[lang]
    output_root = Path(f"data/processed/sentiment_{lang}")

    conn = duckdb.connect(DB_PATH, read_only=True)

    chapter_filter = ""
    params: list[object] = [target_translation, book]
    if args.chapters:
        lo, hi = (args.chapters.split("-") + [args.chapters])[:2]
        chapter_filter = "AND en.chapter BETWEEN ? AND ?"
        params.extend([int(lo), int(hi)])

    already = conn.execute(
        "SELECT verse_id FROM verses_sentiment_multilang WHERE lang = ?",
        [lang],
    ).fetchdf()
    done_ids = set(already["verse_id"]) if not already.empty else set()

    df = conn.execute(
        f"""
        SELECT
            en.verse_id,
            en.chapter,
            en.verse,
            en.text            AS text_en,
            ROUND(en.sentiment_polarity, 4) AS polarity_en,
            en.sentiment_label AS label_en,
            tgt.text           AS text_target
        FROM verses en
        LEFT JOIN verses tgt
            ON  tgt.book_id = en.book_id
            AND tgt.chapter = en.chapter
            AND tgt.verse   = en.verse
            AND tgt.translation_id = ?
        WHERE en.book_id = ?
          AND en.translation_id = 'kjv'
          {chapter_filter}
        ORDER BY en.chapter, en.verse
        """,
        params,
    ).fetchdf()
    conn.close()

    # Drop rows with no target-language text (versification gap).
    df = df[df["text_target"].notna()]
    df = df[~df["verse_id"].isin(done_ids)]
    if df.empty:
        print(f"All {lang.upper()} verses for {book} already labeled. Nothing to do.")
        return

    # Rename column to target-lang specific name for agent clarity.
    df = df.rename(columns={"text_target": f"text_{lang}"})

    out_dir = output_root / book
    out_dir.mkdir(parents=True, exist_ok=True)

    existing = sorted(out_dir.glob("batch_*_input.tsv"))
    next_num = len(existing) + 1

    total_batches = math.ceil(len(df) / args.batch_size)
    for i in range(total_batches):
        chunk = df.iloc[i * args.batch_size : (i + 1) * args.batch_size]
        batch_num = next_num + i
        out_path = out_dir / f"batch_{batch_num:03d}_input.tsv"
        chunk.to_csv(out_path, sep="\t", index=False)
        print(f"  {out_path}  ({len(chunk)} verses)")

    print(f"\n{len(df)} verses across {total_batches} batch(es) for {book} [{lang}].")


if __name__ == "__main__":
    main()
